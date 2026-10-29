-- Delning v1, punkt 1 (claude/rapport-flodeskontroll-delning-v1-2026-10-29.md,
-- fynd B): shelf_shares byggs om in place (0 rader) till en ny primärnyckel
-- (id) och en scope-parameter för granularitet (bibliotek/hylla/bok, P1).

alter table public.shelf_shares drop constraint if exists shelf_shares_pkey;

alter table public.shelf_shares
  add column id uuid not null default gen_random_uuid(),
  add column scope text not null default 'shelf' check (scope in ('library','shelf','book')),
  add column book_id bigint references public.manual_books(id) on delete cascade,
  add column redeemed_from uuid;

alter table public.shelf_shares alter column bc drop not null;
alter table public.shelf_shares add primary key (id);

alter table public.shelf_shares add constraint shelf_shares_scope_bc_chk check (
  (scope = 'library' and bc is null and book_id is null) or
  (scope = 'shelf' and bc is not null and book_id is null) or
  (scope = 'book' and book_id is not null)
);

create unique index shelf_shares_grant_uidx on public.shelf_shares
  (library_id, scope, coalesce(bc,''), coalesce(book_id,-1), recipient_id);
