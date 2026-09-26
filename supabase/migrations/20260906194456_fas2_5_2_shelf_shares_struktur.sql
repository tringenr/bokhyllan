-- Fas 2.5.2 (del 1 av 2): Struktur.
-- Delningsmodell: agarskap bor pa PLATS-niva (bc). En anvandare ager
-- platsen; andra kan bjudas in som admin (kan andra) eller read-only (kan bara se).
--
-- del 1 galler bara data och funktioner. RLS-policies byts ut i del 2.

-- 1) Flytta plats-namn 1-8 fran app-koden (DEFAULT_BC) in i bc_names sa alla
--    platser har en rad, inklusive owner_id.
insert into public.bc_names (bc, name) values
  ('1','Bokhylla 1 – vardagsrummet'),
  ('2','Bokhylla 2'),
  ('3','Bokskåpet'),
  ('4','Köket'),
  ('5','Sovrummet – vid sängen'),
  ('6','Sovrummet – gröna skåpet'),
  ('7','Sovrummet – fönsterbrädan'),
  ('8','Soffan')
on conflict (bc) do nothing;

-- 2) Agarskap pa bc_names
alter table public.bc_names add column if not exists owner_id uuid references auth.users(id);
update public.bc_names set owner_id = 'fc2141c1-c96c-40ae-b612-c4f62329208e'::uuid where owner_id is null;

-- 3) shelf_shares
create table if not exists public.shelf_shares (
  bc            text not null references public.bc_names(bc) on delete cascade,
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  level         text not null check (level in ('admin','read')),
  granted_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  primary key (bc, recipient_id)
);

alter table public.shelf_shares enable row level security;

comment on table public.shelf_shares is
  'Delningar per plats (bc). En rad = en mottagare far tillgang till en plats pa given niva.';

-- 4) Policies pa shelf_shares sjalv:
--    - agaren till bc:t far lasa, skapa, uppdatera, ta bort delningar
--    - mottagaren far bara lasa sin egen rad (for att veta att de har tillgang)
drop policy if exists "shares owner all"       on public.shelf_shares;
drop policy if exists "shares recipient read"  on public.shelf_shares;

create policy "shares owner all"
  on public.shelf_shares
  for all
  to authenticated
  using (
    exists (select 1 from public.bc_names b where b.bc = shelf_shares.bc and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.bc_names b where b.bc = shelf_shares.bc and b.owner_id = auth.uid())
  );

create policy "shares recipient read"
  on public.shelf_shares
  for select
  to authenticated
  using (recipient_id = auth.uid());

-- 5) Hjalparfunktioner - anvands av alla nya policies i del 2.

create or replace function public.owns_bc(p_bc text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bc_names
    where bc = p_bc and owner_id = auth.uid()
  );
$$;

create or replace function public.shared_bc(p_bc text, p_level text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shelf_shares
    where bc = p_bc and recipient_id = auth.uid()
      and (p_level is null or p_level = 'read' or level = p_level)
  );
$$;

create or replace function public.can_read_bc(p_bc text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.owns_bc(p_bc) or public.shared_bc(p_bc);
$$;

create or replace function public.can_admin_bc(p_bc text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.owns_bc(p_bc) or public.shared_bc(p_bc, 'admin');
$$;

grant execute on function public.owns_bc(text)         to authenticated, anon;
grant execute on function public.shared_bc(text,text)  to authenticated, anon;
grant execute on function public.can_read_bc(text)     to authenticated, anon;
grant execute on function public.can_admin_bc(text)    to authenticated, anon;
