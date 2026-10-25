import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '../../../lib/supabase';

function authorized(request) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const supplied = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: claims, error: claimsError }, { data: clubs, error: clubsError }] = await Promise.all([
      supabase.from('claims').select('club_id,player_name,player_name_norm,claimed_at').order('claimed_at'),
      supabase.from('clubs').select('id,name')
    ]);
    if (claimsError) throw claimsError;
    if (clubsError) throw clubsError;
    const clubNames = new Map((clubs || []).map((club) => [club.id, club.name]));
    return NextResponse.json({ claims: (claims || []).map((claim) => ({ ...claim, club_name: clubNames.get(claim.club_id) || claim.club_id })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/admin:', error);
    return NextResponse.json({ error: 'Could not load admin claims.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
  try {
    const body = await request.json();
    const clubId = typeof body.clubId === 'string' ? body.clubId : '';
    const playerName = typeof body.playerName === 'string' ? body.playerName.trim().replace(/\s+/g, ' ') : '';
    if (!clubId || playerName.length > 40 || (playerName.length === 1)) {
      return NextResponse.json({ error: 'Invalid club or player name.' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    if (!playerName) {
      const { error } = await supabase.from('claims').delete().eq('club_id', clubId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    const normalized = playerName.toLocaleLowerCase('en-US');
    const { data: existing, error: lookupError } = await supabase.from('claims').select('club_id,player_name').eq('player_name_norm', normalized).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.club_id !== clubId) {
      return NextResponse.json({ error: `${existing.player_name} is already assigned to another club. Clear or correct that claim first.` }, { status: 409 });
    }
    const { data, error } = await supabase.from('claims').upsert({ club_id: clubId, player_name: playerName, player_name_norm: normalized }, { onConflict: 'club_id' }).select().single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'That player name is already assigned to another club.' }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, claim: data });
  } catch (error) {
    console.error('PATCH /api/admin:', error);
    return NextResponse.json({ error: 'Could not update the claim.' }, { status: 500 });
  }
}
