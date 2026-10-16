-- PR 4: platskoder unika per bibliotek, inte globalt
--
-- Problemet: "bc" (platskoden, t.ex. "1") är idag primärnyckeln i bc_names
-- och därmed global - bara en enda plats i hela databasen kan heta "1". När
-- fler bibliotek finns kolliderar det direkt (två användare kan inte båda
-- ha en "plats 1").
--
-- Den riktiga lösningen (inte en patch): varje rad som idag räknar ut sitt
-- bibliotek INDIREKT - genom att slå upp bc i bc_names och följa dess
-- owner_id/library_id - får istället en egen library_id-kolumn DIREKT.
-- Två effekter:
--   1. bc blir bara unik INOM ett bibliotek (library_id, bc), inte globalt.
--   2. Behörighetskontrollen blir en enda direkt fråga ("är du medlem i
--      det bibliotek den här raden hör till?") istället för dagens kedja
--      via bc_names och sträng-delning av hyllkoder.
--
-- Delningsfunktionen (shelf_shares, dela en plats med någon utanför
-- biblioteket) finns kvar oförändrad i sin roll, bara flyttad till att
-- också kräva library_id för att fortsätta fungera korrekt när två
-- bibliotek kan ha samma bc-värde.

-- ========== 1. Lägg till library_id direkt på alla bc-tabeller ==========

alter table public.manual_books add column library_id uuid references public.libraries(id);
alter table public.gaps          add column library_id uuid references public.libraries(id);
alter table public.shelves       add column library_id uuid references public.libraries(id);
alter table public.spot_names    add column library_id uuid references public.libraries(id);
alter table public.new_shelves   add column library_id uuid references public.libraries(id);
alter table public.gap_status    add column library_id uuid references public.libraries(id);
alter table public.book_cat      add column library_id uuid references public.libraries(id);
alter table public.book_cover    add column library_id uuid references public.libraries(id);
alter table public.cat_renames   add column library_id uuid references public.libraries(id);
alter table public.shelf_shares  add column library_id uuid references public.libraries(id);

-- ========== 2. Backfilla library_id medan bc_names.bc fortfarande är
--               globalt unik (sista gången vi kan slå upp via bart bc) ==========

update public.manual_books mb
set library_id = b.library_id
from public.bc_names b
where b.bc = split_part(mb.shelf, ':', 1);

update public.gaps g
set library_id = b.library_id
from public.bc_names b
where b.bc = split_part(g.shelf, ':', 1);

update public.shelves s
set library_id = b.library_id
from public.bc_names b
where b.bc = s.bc;

update public.spot_names sp
set library_id = b.library_id
from public.bc_names b
where b.bc = split_part(sp.code, ':', 1);

update public.new_shelves ns
set library_id = b.library_id
from public.bc_names b
where ns.bc is not null and b.bc = ns.bc;

update public.gap_status gs
set library_id = g.library_id
from public.gaps g
where g.id = gs.gap_id;

update public.book_cat bc2
set library_id = mb.library_id
from public.manual_books mb
where mb.id = bc2.book_id;

update public.book_cover bcv
set library_id = mb.library_id
from public.manual_books mb
where mb.id = bcv.book_id;

-- cat_renames hade bara owner_id (satt av PR 1), inte kopplat till en
-- plats. Kategorinamnbyten är i praktiken en sak per bibliotek - utan det
-- skulle ett namnbyte i ett bibliotek bleda in i ett annat. En rad per
-- (owner_id -> nu library_id) finns redan, så det räcker att slå upp via
-- library_members.
update public.cat_renames cr
set library_id = m.library_id
from public.library_members m
where m.user_id = cr.owner_id;

update public.shelf_shares ss
set library_id = b.library_id
from public.bc_names b
where b.bc = ss.bc;

-- Alla rader ska nu ha fått ett library_id. NOT NULL sätts efter att vi
-- har bekräftat det (annars är det tydligare att låta migreringen fela
-- här än att tyst lämna en rad utan library_id).
alter table public.manual_books alter column library_id set not null;
alter table public.gaps          alter column library_id set not null;
alter table public.shelves       alter column library_id set not null;
alter table public.spot_names    alter column library_id set not null;
alter table public.gap_status    alter column library_id set not null;
alter table public.book_cat      alter column library_id set not null;
alter table public.book_cover    alter column library_id set not null;
alter table public.cat_renames   alter column library_id set not null;
alter table public.shelf_shares  alter column library_id set not null;
-- new_shelves.bc är nullable redan idag (en ny hylla kan skapas innan den
-- fått en platskod), så library_id måste tillåta null där också.

-- ========== 3. Gör bc unik per bibliotek istället för globalt ==========

alter table public.shelf_shares drop constraint if exists shelf_shares_bc_fkey;

alter table public.bc_names drop constraint bc_names_pkey;
alter table public.bc_names add column id uuid not null default gen_random_uuid();
alter table public.bc_names add constraint bc_names_id_key unique (id);
alter table public.bc_names add constraint bc_names_pkey primary key (id);
alter table public.bc_names add constraint bc_names_library_bc_key unique (library_id, bc);

alter table public.shelf_shares
  add constraint shelf_shares_library_bc_fkey
  foreign key (library_id, bc) references public.bc_names (library_id, bc);

-- ========== 4. Hjälpfunktionerna tar nu library_id + bc, inte bara bc ==========
--
-- owns_bc(bc) gick tidigare via bc_names för att räkna ut ägaren. Det
-- behövs inte längre - varje tabell vet redan sitt library_id direkt, så
-- "äger du det här" blir bara "är du medlem i det biblioteket" - en enda
-- enkel kontroll, utan någon bc_names-uppslagning alls.

-- CASCADE: alla policyer som fortfarande pekar på den gamla, ett-argument-
-- versionen av owns_bc tas bort här, men ersätts alla av nya (med de nya
-- can_read_bc/can_admin_bc-signaturerna) i steg 5 nedan - ingen av dem
-- lämnas utan en policy.
drop function if exists public.owns_bc(text) cascade;

create or replace function public.shared_bc(p_library_id uuid, p_bc text, p_level text default null)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.shelf_shares
    where library_id = p_library_id and bc = p_bc and recipient_id = auth.uid()
      and (p_level is null or p_level = 'read' or level = p_level)
  );
$$;

create or replace function public.can_read_bc(p_library_id uuid, p_bc text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select public.is_library_member(p_library_id) or public.shared_bc(p_library_id, p_bc);
$$;

create or replace function public.can_admin_bc(p_library_id uuid, p_bc text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select public.is_library_member(p_library_id) or public.shared_bc(p_library_id, p_bc, 'admin');
$$;

drop function if exists public.shared_bc(text, text) cascade;
drop function if exists public.can_read_bc(text) cascade;
drop function if exists public.can_admin_bc(text) cascade;

-- ========== 5. Policyer om, tabell för tabell ==========
-- Samma skydd som innan, men via egna library_id-kolumnen direkt istället
-- för en uppslagning i bc_names.

-- bc_names
drop policy if exists "bc_names read" on public.bc_names;
drop policy if exists "bc_names update" on public.bc_names;
drop policy if exists "bc_names delete" on public.bc_names;
create policy "bc_names read" on public.bc_names
  for select using (public.is_library_member(library_id));
create policy "bc_names update" on public.bc_names
  for update using (public.can_admin_bc(library_id, bc))
  with check (public.can_admin_bc(library_id, bc));
create policy "bc_names delete" on public.bc_names
  for delete using (public.is_library_member(library_id));

-- manual_books
drop policy if exists "manual_books read" on public.manual_books;
drop policy if exists "manual_books insert" on public.manual_books;
drop policy if exists "manual_books update" on public.manual_books;
drop policy if exists "manual_books delete" on public.manual_books;
create policy "manual_books read" on public.manual_books
  for select using (public.can_read_bc(library_id, split_part(shelf,':',1)));
create policy "manual_books insert" on public.manual_books
  for insert with check (public.can_admin_bc(library_id, split_part(shelf,':',1)));
create policy "manual_books update" on public.manual_books
  for update using (public.can_admin_bc(library_id, split_part(shelf,':',1)))
  with check (public.can_admin_bc(library_id, split_part(shelf,':',1)));
create policy "manual_books delete" on public.manual_books
  for delete using (public.can_admin_bc(library_id, split_part(shelf,':',1)));

-- gaps
drop policy if exists "gaps read" on public.gaps;
drop policy if exists "gaps insert" on public.gaps;
drop policy if exists "gaps update" on public.gaps;
drop policy if exists "gaps delete" on public.gaps;
create policy "gaps read" on public.gaps
  for select using (public.can_read_bc(library_id, split_part(shelf,':',1)));
create policy "gaps insert" on public.gaps
  for insert with check (public.can_admin_bc(library_id, split_part(shelf,':',1)));
create policy "gaps update" on public.gaps
  for update using (public.can_admin_bc(library_id, split_part(shelf,':',1)));
create policy "gaps delete" on public.gaps
  for delete using (public.is_library_member(library_id));

-- shelves
drop policy if exists "shelves read" on public.shelves;
drop policy if exists "shelves insert" on public.shelves;
drop policy if exists "shelves update" on public.shelves;
drop policy if exists "shelves delete" on public.shelves;
create policy "shelves read" on public.shelves
  for select using (public.can_read_bc(library_id, bc));
create policy "shelves insert" on public.shelves
  for insert with check (public.can_admin_bc(library_id, bc));
create policy "shelves update" on public.shelves
  for update using (public.can_admin_bc(library_id, bc));
create policy "shelves delete" on public.shelves
  for delete using (public.is_library_member(library_id));

-- spot_names
drop policy if exists "spot_names read" on public.spot_names;
drop policy if exists "spot_names insert" on public.spot_names;
drop policy if exists "spot_names update" on public.spot_names;
drop policy if exists "spot_names delete" on public.spot_names;
create policy "spot_names read" on public.spot_names
  for select using (public.can_read_bc(library_id, split_part(code,':',1)));
create policy "spot_names insert" on public.spot_names
  for insert with check (public.can_admin_bc(library_id, split_part(code,':',1)));
create policy "spot_names update" on public.spot_names
  for update using (public.can_admin_bc(library_id, split_part(code,':',1)));
create policy "spot_names delete" on public.spot_names
  for delete using (public.is_library_member(library_id));

-- new_shelves
drop policy if exists "new_shelves read" on public.new_shelves;
drop policy if exists "new_shelves insert" on public.new_shelves;
drop policy if exists "new_shelves update" on public.new_shelves;
drop policy if exists "new_shelves delete" on public.new_shelves;
create policy "new_shelves read" on public.new_shelves
  for select using (public.can_read_bc(library_id, bc));
create policy "new_shelves insert" on public.new_shelves
  for insert with check (public.can_admin_bc(library_id, bc));
create policy "new_shelves update" on public.new_shelves
  for update using (public.can_admin_bc(library_id, bc));
create policy "new_shelves delete" on public.new_shelves
  for delete using (public.is_library_member(library_id));

-- gap_status
drop policy if exists "gap_status read" on public.gap_status;
drop policy if exists "gap_status insert" on public.gap_status;
drop policy if exists "gap_status update" on public.gap_status;
create policy "gap_status read" on public.gap_status
  for select using (
    exists (select 1 from public.gaps g where g.id = gap_status.gap_id
      and public.can_read_bc(gap_status.library_id, split_part(g.shelf,':',1))));
create policy "gap_status insert" on public.gap_status
  for insert with check (
    exists (select 1 from public.gaps g where g.id = gap_status.gap_id
      and public.can_admin_bc(gap_status.library_id, split_part(g.shelf,':',1))));
create policy "gap_status update" on public.gap_status
  for update using (
    exists (select 1 from public.gaps g where g.id = gap_status.gap_id
      and public.can_admin_bc(gap_status.library_id, split_part(g.shelf,':',1))));

-- book_cat
drop policy if exists "book_cat read" on public.book_cat;
drop policy if exists "book_cat insert" on public.book_cat;
drop policy if exists "book_cat update" on public.book_cat;
create policy "book_cat read" on public.book_cat
  for select using (
    exists (select 1 from public.manual_books mb where mb.id = book_cat.book_id
      and public.can_read_bc(book_cat.library_id, split_part(mb.shelf,':',1))));
create policy "book_cat insert" on public.book_cat
  for insert with check (
    exists (select 1 from public.manual_books mb where mb.id = book_cat.book_id
      and public.can_admin_bc(book_cat.library_id, split_part(mb.shelf,':',1))));
create policy "book_cat update" on public.book_cat
  for update using (
    exists (select 1 from public.manual_books mb where mb.id = book_cat.book_id
      and public.can_admin_bc(book_cat.library_id, split_part(mb.shelf,':',1))));

-- book_cover
drop policy if exists "book_cover read" on public.book_cover;
drop policy if exists "book_cover insert" on public.book_cover;
drop policy if exists "book_cover update" on public.book_cover;
create policy "book_cover read" on public.book_cover
  for select using (
    exists (select 1 from public.manual_books mb where mb.id = book_cover.book_id
      and public.can_read_bc(book_cover.library_id, split_part(mb.shelf,':',1))));
create policy "book_cover insert" on public.book_cover
  for insert with check (
    exists (select 1 from public.manual_books mb where mb.id = book_cover.book_id
      and public.can_admin_bc(book_cover.library_id, split_part(mb.shelf,':',1))));
create policy "book_cover update" on public.book_cover
  for update using (
    exists (select 1 from public.manual_books mb where mb.id = book_cover.book_id
      and public.can_admin_bc(book_cover.library_id, split_part(mb.shelf,':',1))));

-- cat_renames: ägare-check (owner_id) byts till biblioteksmedlemskap, så
-- att alla medlemmar i samma bibliotek ser samma kategorinamn - och så att
-- ett namnbyte i ett bibliotek aldrig syns i ett annat.
drop policy if exists "cat_renames read" on public.cat_renames;
drop policy if exists "cat_renames update" on public.cat_renames;
drop policy if exists "cat_renames delete" on public.cat_renames;
create policy "cat_renames read" on public.cat_renames
  for select using (public.is_library_member(library_id));
create policy "cat_renames update" on public.cat_renames
  for update using (public.is_library_member(library_id))
  with check (public.is_library_member(library_id));
create policy "cat_renames delete" on public.cat_renames
  for delete using (public.is_library_member(library_id));

-- shelf_shares: ägarens hantering av delningar går nu via can_admin_bc
-- (biblioteksmedlemskap) istället för owns_bc.
drop policy if exists "shares owner all" on public.shelf_shares;
create policy "shares owner all" on public.shelf_shares
  for all using (public.can_admin_bc(library_id, bc))
  with check (public.can_admin_bc(library_id, bc));

-- ========== 6. Grants på de nya kolumnerna ==========
-- (inga nya grants behövs - library_id är bara en extra kolumn på
-- tabeller som redan har SELECT/INSERT/UPDATE/DELETE till authenticated.)

-- ========== 7. Sätt library_id automatiskt vid nya rader ==========
-- set_owner_id_default() utökas ytterligare: library_id sätts nu också
-- för cat_renames (som redan använder triggern för owner_id), och en ny,
-- enklare trigger sätter library_id på manual_books (som redan har en
-- egen owner-trigger sedan tidigare) utifrån den plats boken skrivs in på.

create or replace function public.set_owner_id_default()
returns trigger
language plpgsql
security definer
as $$
declare
  v_library_id uuid;
begin
  new.owner_id := auth.uid();
  if tg_table_name = 'bc_names' then
    if new.library_id is null then
      select m.library_id into v_library_id
      from public.library_members m
      where m.user_id = auth.uid()
      order by m.created_at
      limit 1;
      new.library_id := v_library_id;
    end if;
  elsif tg_table_name = 'cat_renames' then
    if new.library_id is null then
      select m.library_id into v_library_id
      from public.library_members m
      where m.user_id = auth.uid()
      order by m.created_at
      limit 1;
      new.library_id := v_library_id;
    end if;
  end if;
  return new;
end;
$$;

-- OBS, en bugg som hittades och fixades i den lokala verifieringen: det
-- går INTE längre att räkna ut library_id genom att slå upp en bar
-- bc/code/shelf-sträng i bc_names (som första versionen av den här
-- migreringen gjorde) - det var precis den globala uniciteten som PR 4
-- tar bort, så en sådan uppslagning blir nu tvetydig så fort två
-- bibliotek råkar ha samma platskod (bekräftat: Bertils bokinsättning i
-- sin egen "plats 1" fick av misstag Annas library_id, och föll på RLS).
--
-- Rätt källa för library_id vid insert är istället VEM SOM ÄR INLOGGAD,
-- inte vilken platssträng som skrivs. Det stämmer med hur appen
-- faktiskt används idag - en inloggad användare skriver alltid in saker
-- i sitt EGET bibliotek. (Den dag en användare med delad admin-rätt på
-- någon ANNANS plats ska kunna lägga böcker där, måste appen skicka
-- library_id explicit vid insert - triggern skriver aldrig över ett
-- värde som redan är satt, se "if new.library_id is null" nedan.)

create or replace function public.set_library_id_from_caller()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_library_id uuid;
begin
  if new.library_id is null then
    select m.library_id into v_library_id
    from public.library_members m
    where m.user_id = auth.uid()
    order by m.created_at
    limit 1;
    new.library_id := v_library_id;
  end if;
  return new;
end;
$$;

create trigger manual_books_set_library
  before insert on public.manual_books
  for each row execute function public.set_library_id_from_caller();

create trigger gaps_set_library
  before insert on public.gaps
  for each row execute function public.set_library_id_from_caller();

create trigger shelves_set_library
  before insert on public.shelves
  for each row execute function public.set_library_id_from_caller();

create trigger new_shelves_set_library
  before insert on public.new_shelves
  for each row execute function public.set_library_id_from_caller();

create trigger spot_names_set_library
  before insert on public.spot_names
  for each row execute function public.set_library_id_from_caller();

create trigger shelf_shares_set_library
  before insert on public.shelf_shares
  for each row execute function public.set_library_id_from_caller();

-- book_cat, book_cover och gap_status pekar på en annan rad via en riktig
-- (fortfarande globalt unik) primärnyckel - manual_books.id respektive
-- gaps.id - inte på en bar platssträng. Den uppslagningen är fortfarande
-- entydig och kan därför hämtas direkt från den raden, precis som innan.

create or replace function public.set_library_id_from_book()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.library_id is null then
    select mb.library_id into new.library_id
    from public.manual_books mb
    where mb.id = new.book_id
    limit 1;
  end if;
  return new;
end;
$$;

create trigger book_cat_set_library
  before insert on public.book_cat
  for each row execute function public.set_library_id_from_book();

create trigger book_cover_set_library
  before insert on public.book_cover
  for each row execute function public.set_library_id_from_book();

create or replace function public.set_library_id_from_gap()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.library_id is null then
    select g.library_id into new.library_id
    from public.gaps g
    where g.id = new.gap_id
    limit 1;
  end if;
  return new;
end;
$$;

create trigger gap_status_set_library
  before insert on public.gap_status
  for each row execute function public.set_library_id_from_gap();
