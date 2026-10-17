-- Bildlagring privat: ny tabell för platsfotona (tidigare data/photos.json
-- + img/), som låg okrypterade och publikt nåbara i det publicerade repot
-- oavsett inloggning.
--
-- Miniatyr sparas som base64 direkt i raden (litet, läses vid var och en av
-- alla render av Hem-rutnätet). Själva originalfotot laddas INTE upp här -
-- det görs i ett separat steg (måste köras inloggad som Thomas, från den
-- lokala sessionen, se docs/KARTA.md) som också fyller thumb_data och
-- storage_path för varje rad.
--
-- Ingen datamigrering i den här filen - bara schemat. Tabellen är tom tills
-- det lokala steget körts.

create table public.bc_photos (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.libraries(id),
  bc text not null,
  label text,
  cap text,
  shelves text[] not null default '{}',
  thumb_data text,
  storage_path text,
  created_at timestamptz not null default now()
);

alter table public.bc_photos enable row level security;

create policy "bc_photos read" on public.bc_photos
  for select using (public.can_read_bc(library_id, bc));
create policy "bc_photos insert" on public.bc_photos
  for insert with check (public.can_admin_bc(library_id, bc));
create policy "bc_photos update" on public.bc_photos
  for update using (public.can_admin_bc(library_id, bc))
  with check (public.can_admin_bc(library_id, bc));
create policy "bc_photos delete" on public.bc_photos
  for delete using (public.can_admin_bc(library_id, bc));

-- Samma mönster som manual_books/gaps/etc: library_id sätts automatiskt
-- från den inloggades medlemskap vid insert, aldrig genom att slå upp en
-- bar bc-sträng (den är inte global sedan PR4).
create trigger bc_photos_set_library
  before insert on public.bc_photos
  for each row execute function public.set_library_id_from_caller();
