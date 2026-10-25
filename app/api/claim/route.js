import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const clubId = typeof body.clubId === 'string' ? body.clubId : '';
    const playerName = typeof body.playerName === 'string' ? body.playerName.trim().replace(/\s+/g, ' ') : '';
    if (!clubId || playerName.length < 2 || playerName.length > 40) {
      return NextResponse.json({ error: 'Enter a valid WhatsApp name and select a club.' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('claim_club', { p_club_id: clubId, p_player_name: playerName });
    if (error) throw error;
    if (!data?.ok) {
      const status = data?.code === 'taken' || data?.code === 'player_taken' ? 409 : data?.code === 'not_found' ? 404 : 400;
      return NextResponse.json({ error: data?.message || 'Claim could not be completed.' }, { status });
    }
    return NextResponse.json({ ok: true, claim: data.claim }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('POST /api/claim:', error);
    return NextResponse.json({ error: 'The claim could not be completed. Refresh the page and try again.' }, { status: 500 });
  }
}
