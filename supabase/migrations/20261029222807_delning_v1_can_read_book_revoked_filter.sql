-- Delning v1, punkt 4: can_read_book/can_admin_book ska inte ge åtkomst via
-- en återkallad rad.
create or replace function public.can_read_book(p_book_id bigint)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.manual_books mb
    where mb.id = p_book_id
      and (
        public.can_read_bc(mb.library_id, split_part(mb.shelf, ':', 1))
        or exists (
          select 1 from public.shelf_shares ss
          where ss.library_id = mb.library_id
            and ss.scope = 'book'
            and ss.book_id = p_book_id
            and ss.recipient_id = auth.uid()
            and ss.revoked_at is null
        )
      )
  );
$$;

create or replace function public.can_admin_book(p_book_id bigint)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.manual_books mb
    where mb.id = p_book_id
      and (
        public.can_admin_bc(mb.library_id, split_part(mb.shelf, ':', 1))
        or exists (
          select 1 from public.shelf_shares ss
          where ss.library_id = mb.library_id
            and ss.scope = 'book'
            and ss.book_id = p_book_id
            and ss.recipient_id = auth.uid()
            and ss.level = 'admin'
            and ss.revoked_at is null
        )
      )
  );
$$;
