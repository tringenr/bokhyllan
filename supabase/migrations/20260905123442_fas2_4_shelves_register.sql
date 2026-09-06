-- Fas 2.4 - multi-hog-modellen.
-- Register over alla giltiga hyllkoder per plats. Idag finns kunskapen bara
-- implicit i shelf-varden pa manual_books och som fri text i shelf_code pa
-- new_shelves. Denna tabell gor det explicit sa en plats kan ha flera hyllor
-- (t.ex. sangen: 5:S1, 5:S2, 5:S3) aven innan de har fatt bocker eller foto.
--
-- Ingen FK fran manual_books.shelf an - det kraver att appens skrivvagar
-- forst kan garantera att shelves-rad finns. Laggs i en senare fas.

create table if not exists public.shelves (
  bc          text not null,
  code        text not null,
  ordinal     smallint,
  section     text,
  name        text,
  created_at  timestamptz not null default now(),
  primary key (bc, code),
  constraint shelves_code_format check (code ~ '^\d+:[VHSKL]\d+$'),
  constraint shelves_bc_matches_code check (split_part(code, ':', 1) = bc)
);

alter table public.shelves enable row level security;

drop policy if exists "shelves read"   on public.shelves;
drop policy if exists "shelves insert" on public.shelves;
drop policy if exists "shelves update" on public.shelves;
drop policy if exists "shelves delete" on public.shelves;

create policy "shelves read"   on public.shelves for select to authenticated using (true);
create policy "shelves insert" on public.shelves for insert to authenticated with check (true);
create policy "shelves update" on public.shelves for update to authenticated using (true);
create policy "shelves delete" on public.shelves for delete to authenticated using (true);

comment on table public.shelves is
  'Register over giltiga hyllkoder per plats. Stodjer flera hyllor per bc (multi-hog). Fylls fran befintliga shelf-varden i Fas 2.4 seed.';

-- Seed: harled alla unika (bc, shelf) fran manual_books
insert into public.shelves (bc, code, ordinal, section)
select
  split_part(shelf, ':', 1) as bc,
  shelf as code,
  nullif(substring(shelf from '\d+$')::int, null) as ordinal,
  substring(shelf from ':(.)') as section
from public.manual_books
where shelf is not null and shelf <> ''
group by shelf
on conflict (bc, code) do nothing;

-- Sangens tva ytterligare hogar (5:S2, 5:S3) laggs in explicit
insert into public.shelves (bc, code, ordinal, section, name)
values
  ('5', '5:S2', 2, 'S', 'Hög 2 vid sängen'),
  ('5', '5:S3', 3, 'S', 'Hög 3 vid sängen')
on conflict (bc, code) do nothing;
