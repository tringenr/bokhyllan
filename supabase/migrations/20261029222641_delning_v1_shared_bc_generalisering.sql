-- Delning v1, punkt 1: shared_bc täcker nu bibliotek-nivå och "avdelning"
-- (en delad hylla täcker sina underhyllor, via rekursiv vandring uppåt i
-- bc_names.parent_bc - matematiskt samma mängd som appens egen membersOf()
-- som vandrar nedåt). can_read_book/can_admin_book är nya funktioner för
-- boknivå: en enskild delad bok öppnar bara den boken, inte hela hyllkoden
-- den råkar stå på.

create or replace function public.shared_bc(p_library_id uuid, p_bc text, p_level text default null)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  with recursive anc(bc) as (
    select p_bc
    union all
    select bn.parent_bc from public.bc_names bn
    join anc a on bn.bc = a.bc
    where bn.library_id = p_library_id and bn.parent_bc is not null
  )
  select exists (
    select 1 from public.shelf_shares ss
    where ss.library_id = p_library_id
      and ss.recipient_id = auth.uid()
      and (
        ss.scope = 'library'
        or (ss.scope = 'shelf' and ss.bc in (select bc from anc))
      )
      and (p_level is null or p_level = 'read' or ss.level = p_level)
  );
$$;

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
        )
      )
  );
$$;
