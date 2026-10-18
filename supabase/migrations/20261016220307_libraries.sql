-- PR 3: libraries-tabellen och biblioteksmedlemskap
--
-- Ny datamodell (alternativ B, beslutad med Thomas 16/10): ett bibliotek
-- äger platser (bc_names), och användare är medlemmar i ett bibliotek. Idag
-- har varje bibliotek exakt en medlem (ägaren), men lagret gör det möjligt
-- att lägga till fler medlemmar senare (dela ett helt bibliotek) utan att
-- RLS måste skrivas om igen - bara raderna i library_members ändras då.
--
-- Centralt knep: alla andra tabellers RLS (manual_books, gaps, shelves,
-- spot_names, new_shelves, gap_status, book_cat, book_cover) går redan via
-- hjälpfunktionen owns_bc(bc), som i sin tur går via bc_names. Genom att
-- bara byta ut VAD owns_bc() kollar (biblioteksmedlemskap istället för
-- bc_names.owner_id direkt) ärver hela resten av appen det nya
-- biblioteksbegreppet utan att en enda annan tabells policy behöver röras.

-- ---------- Nya tabeller ----------

create table public.libraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null default 'Mitt bibliotek',
  created_at timestamptz not null default now()
);

create table public.library_members (
  library_id uuid not null references public.libraries(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (library_id, user_id)
);

alter table public.bc_names add column library_id uuid references public.libraries(id);

-- ---------- Migrera befintlig data ----------
-- Ett bibliotek per nuvarande ägare i bc_names.

insert into public.libraries (owner_id, name)
select distinct owner_id, 'Mitt bibliotek'
from public.bc_names
where owner_id is not null;

-- Specialfall för den här engångsmigreringen: finns det bara ett bibliotek
-- efter backfillen (dagens läge - bara Thomas har data), döp om det till
-- "Thomas bibliotek" enligt planen. Framtida bibliotek som skapas vid
-- signup (PR 5-6) får sitt namn på annat sätt och rör inte den här koden.
do $$
declare
  v_count int;
  v_id uuid;
begin
  select count(*) into v_count from public.libraries;
  if v_count = 1 then
    select id into v_id from public.libraries limit 1;
    update public.libraries set name = 'Thomas bibliotek' where id = v_id;
  end if;
end $$;

update public.bc_names b
set library_id = l.id
from public.libraries l
where b.owner_id = l.owner_id;

alter table public.bc_names alter column library_id set not null;

insert into public.library_members (library_id, user_id, role)
select id, owner_id, 'owner' from public.libraries;

-- ---------- RLS på de nya tabellerna ----------

alter table public.libraries enable row level security;
alter table public.library_members enable row level security;

-- Samma rättigheter som övriga tabeller har till inloggade användare (RLS
-- avgör vilka rader, grants avgör att rollen får fråga tabellen alls).
grant select, update on public.libraries to authenticated;
grant select on public.library_members to authenticated;

-- Policyerna på libraries och library_members pekar på varandra (är jag
-- medlem i det här biblioteket? äger jag det här medlemskapets bibliotek?).
-- Skrivna som raka subqueries i USING-satserna skulle det bli en cirkel -
-- Postgres utvärderar då den andra tabellens RLS-policyer på nytt för varje
-- rad, om och om igen ("infinite recursion detected"), vilket bekräftades i
-- den lokala testdatabasen. Samma lösning som owns_bc/can_admin_bc redan
-- använder: en SECURITY DEFINER-funktion kringgår RLS för frågan inuti
-- funktionen, så den andra tabellens policyer aldrig triggas på nytt.

create or replace function public.is_library_member(p_library_id uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.library_members m
    where m.library_id = p_library_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_library_owner(p_library_id uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.libraries l
    where l.id = p_library_id and l.owner_id = auth.uid()
  );
$$;

create policy "libraries read" on public.libraries
  for select using (public.is_library_member(id));

create policy "libraries update" on public.libraries
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "library_members read own" on public.library_members
  for select using (user_id = auth.uid());

create policy "library_members read as owner" on public.library_members
  for select using (public.is_library_owner(library_id));

create policy "library_members manage as owner" on public.library_members
  for all using (public.is_library_owner(library_id))
  with check (public.is_library_owner(library_id));

-- ---------- Byt ut vad owns_bc() kollar ----------
-- Tidigare: bc_names.owner_id = auth.uid() direkt.
-- Nu: auth.uid() är medlem i det bibliotek som äger platsen.

create or replace function public.owns_bc(p_bc text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.bc_names b
    join public.library_members m on m.library_id = b.library_id
    where b.bc = p_bc and m.user_id = auth.uid()
  );
$$;

-- bc_names och shelf_shares hade egna direkta kontroller mot owner_id
-- istället för att gå via owns_bc() - de byts ut så att de också följer
-- biblioteksmedlemskapet.

drop policy "bc_names read" on public.bc_names;
create policy "bc_names read" on public.bc_names
  for select using (public.owns_bc(bc));

drop policy "shares owner all" on public.shelf_shares;
create policy "shares owner all" on public.shelf_shares
  for all using (public.owns_bc(bc))
  with check (public.owns_bc(bc));

-- ---------- Sätt library_id automatiskt vid nya platser ----------
-- set_owner_id_default() används redan som insert-trigger på bc_names,
-- manual_books och cat_renames. Den utökas att även sätta library_id, men
-- bara för bc_names (enda tabellen med den kolumnen) och bara om den inte
-- redan är satt.

-- OBS: tg_table_name-kollen och kollen av new.library_id får INTE skrivas
-- som ett enda villkor med "and" - Postgres garanterar inte kortslutning
-- (short-circuit) för and/or, så new.library_id skulle då försöka läsas
-- även när triggern körs på manual_books/cat_renames, som saknar den
-- kolumnen, och fela med "record new has no field library_id". Bekräftat i
-- den lokala testdatabasen. Nästlade if-satser löser det: den inre satsen
-- körs bara när vi redan vet att det är bc_names.
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
  end if;
  return new;
end;
$$;
