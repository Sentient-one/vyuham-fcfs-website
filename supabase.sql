-- Vyuham eFootball FCFS club selection
-- Run the entire file in Supabase -> SQL Editor -> New query.

create table if not exists public.clubs (
  id text primary key,
  name text not null unique,
  sort_order integer not null unique
);

create table if not exists public.claims (
  club_id text primary key references public.clubs(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 2 and 40),
  player_name_norm text not null unique,
  claimed_at timestamptz not null default now()
);

alter table public.clubs enable row level security;
alter table public.claims enable row level security;
-- No anon policies are added. All database access goes through server routes using
-- the service-role key, which must never be sent to the browser.

insert into public.clubs (id, name, sort_order) values
('real-madrid-cf', 'Real Madrid CF', 1),
('fc-barcelona', 'FC Barcelona', 2),
('manchester-united-fc', 'Manchester United FC', 3),
('liverpool-fc', 'Liverpool FC', 4),
('manchester-city-fc', 'Manchester City FC', 5),
('arsenal-fc', 'Arsenal FC', 6),
('chelsea-fc', 'Chelsea FC', 7),
('fc-bayern-munchen', 'FC Bayern München', 8),
('paris-saint-germain-fc', 'Paris Saint-Germain FC', 9),
('juventus-fc', 'Juventus FC', 10),
('ac-milan', 'AC Milan', 11),
('inter-milan', 'Inter Milan', 12),
('borussia-dortmund', 'Borussia Dortmund', 13),
('atletico-de-madrid', 'Atlético de Madrid', 14),
('tottenham-hotspur-fc', 'Tottenham Hotspur FC', 15),
('afc-ajax', 'AFC Ajax', 16),
('as-roma', 'AS Roma', 17),
('al-hilal', 'Al Hilal', 18),
('al-nassr', 'Al Nassr', 19),
('bayer-04-leverkusen', 'Bayer 04 Leverkusen', 20),
('newcastle-united-fc', 'Newcastle United FC', 21),
('inter-miami-cf', 'Inter Miami CF', 22),
('ssc-napoli', 'SSC Napoli', 23),
('sporting-cp', 'Sporting CP', 24),
('como-1907', 'Como 1907', 25),
('fc-goa', 'FC Goa', 26),
('santos-fc', 'Santos FC', 27),
('atalanta-bc', 'Atalanta BC', 28),
('aston-villa-fc', 'Aston Villa FC', 29),
('flamengo', 'Flamengo', 30),
('fc-porto', 'FC Porto', 31),
('galatasaray-sk', 'Galatasaray SK', 32)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

-- A single database transaction handles each claim. The advisory lock serializes
-- requests for the same normalized player name; the primary key on club_id serializes
-- simultaneous attempts to claim the same club.
create or replace function public.claim_club(p_club_id text, p_player_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_player_name, '')), '\s+', ' ', 'g');
  v_norm text;
  v_claim public.claims%rowtype;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'message', 'Enter a WhatsApp name between 2 and 40 characters.');
  end if;
  v_norm := lower(v_name);
  perform pg_advisory_xact_lock(hashtext(v_norm));

  if not exists (select 1 from public.clubs where id = p_club_id) then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'That club does not exist. Refresh the page.');
  end if;
  if exists (select 1 from public.claims where player_name_norm = v_norm) then
    return jsonb_build_object('ok', false, 'code', 'player_taken', 'message', 'That WhatsApp name already has a club. Each player may claim only one club.');
  end if;

  insert into public.claims (club_id, player_name, player_name_norm)
  values (p_club_id, v_name, v_norm)
  returning * into v_claim;

  return jsonb_build_object('ok', true, 'claim', jsonb_build_object(
    'club_id', v_claim.club_id, 'player_name', v_claim.player_name, 'claimed_at', v_claim.claimed_at
  ));
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'taken', 'message', 'That club was just claimed by another player. Choose a different available club.');
end;
$$;

revoke all on function public.claim_club(text, text) from public, anon, authenticated;
grant execute on function public.claim_club(text, text) to service_role;

grant all on public.clubs to service_role;
grant all on public.claims to service_role;
