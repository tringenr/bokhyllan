-- Delning v1, punkt 2: inbjudningslänk med token, återkallningsbar via
-- revoked_at.

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.libraries(id) on delete cascade,
  scope text not null check (scope in ('library','shelf','book')),
  bc text,
  book_id bigint references public.manual_books(id) on delete cascade,
  level text not null default 'read' check (level in ('read','admin')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint share_links_scope_bc_chk check (
    (scope = 'library' and bc is null and book_id is null) or
    (scope = 'shelf' and bc is not null and book_id is null) or
    (scope = 'book' and book_id is not null)
  )
);

alter table public.shelf_shares
  add constraint shelf_shares_redeemed_from_fkey
  foreign key (redeemed_from) references public.share_links(id) on delete set null;

alter table public.share_links enable row level security;

create policy "share_links owner all" on public.share_links
  for all
  using (public.is_library_member(library_id))
  with check (public.is_library_member(library_id));
