-- Losa platser (skrivbord, fonsterbrada, nattduksbord ...) och ursprung for
-- bocker som kommer fran en automatisk avlasning.

-- 1. Namn pa losa platser. Koden foljer hyllkodsformatet: <bc>:L<n>
create table if not exists public.spot_names (
  code       text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.spot_names enable row level security;

drop policy if exists "spot read"   on public.spot_names;
drop policy if exists "spot insert" on public.spot_names;
drop policy if exists "spot update" on public.spot_names;
drop policy if exists "spot delete" on public.spot_names;

create policy "spot read"   on public.spot_names for select to authenticated using (true);
create policy "spot insert" on public.spot_names for insert to authenticated with check (true);
create policy "spot update" on public.spot_names for update to authenticated using (true);
create policy "spot delete" on public.spot_names for delete to authenticated using (true);

-- 2. Bocker fran avlasning: beskrivning, ursprung och osakerhetsmarkering.
alter table public.manual_books add column if not exists description text;
alter table public.manual_books add column if not exists source      text;
alter table public.manual_books add column if not exists uncertain   boolean not null default false;

comment on column public.manual_books.description is 'Kort beskrivning. Skriven ur bokkunskap, inte hamtad fran kalla - kan innehalla fel.';
comment on column public.manual_books.source      is 'null = inskriven for hand, "claude" = avlast fran foto.';
comment on column public.manual_books.uncertain   is 'true = avlasningen var osaker och bor kontrolleras.';
