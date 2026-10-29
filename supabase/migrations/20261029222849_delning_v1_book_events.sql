-- Delning v1, punkt 5: generell statushändelse på ett exemplar (princip P2
-- i konceptdokumentet). Bara 'onskar_lana' finns i v1; fler värden kan
-- läggas till senare utan schemaändring. Ett svarsfält (accepterad/nekad)
-- förberett men inte kopplat till något gränssnitt än.
create table public.book_events (
  id uuid primary key default gen_random_uuid(),
  book_id bigint not null references public.manual_books(id) on delete cascade,
  event_type text not null check (event_type in ('onskar_lana')),
  actor_id uuid not null references auth.users(id),
  response text check (response in ('accepterad','nekad')),
  created_at timestamptz not null default now()
);

alter table public.book_events enable row level security;

create policy "book_events select" on public.book_events
  for select
  using (
    actor_id = auth.uid()
    or exists (
      select 1 from public.manual_books mb
      where mb.id = book_events.book_id
        and public.is_library_member(mb.library_id)
    )
  );

create policy "book_events insert" on public.book_events
  for insert
  with check (
    actor_id = auth.uid()
    and public.can_read_book(book_id)
  );

create policy "book_events update" on public.book_events
  for update
  using (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_events.book_id
        and public.is_library_member(mb.library_id)
    )
  );
