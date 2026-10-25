import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: clubs, error: clubError }, { data: claims, error: claimError }] = await Promise.all([
      supabase.from('clubs').select('id,name').order('sort_order'),
      supabase.from('claims').select('club_id,player_name,claimed_at')
    ]);
    if (clubError) throw clubError;
    if (claimError) throw claimError;
    const claimMap = new Map((claims || []).map((claim) => [claim.club_id, claim]));
    return NextResponse.json({ clubs: (clubs || []).map((club) => ({ ...club, claim: claimMap.get(club.id) || null })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clubs:', error);
    return NextResponse.json({ error: 'Could not load clubs. Check that the database setup has been completed.' }, { status: 500 });
  }
}
