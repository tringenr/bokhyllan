-- Delning v1, gränssnittsbygget: ägarens minimala "Lånönskningar"-vy
-- (bara det skissen visar, inga fulla sidor) behöver kunna visa VEM som
-- önskar låna. book_events.actor_id pekar på auth.users, som ägaren inte
-- kan läsa direkt - en liten SECURITY DEFINER-funktion, samma mönster
-- som can_read_book, släpper bara igenom e-postadressen till den som
-- redan äger/är medlem i biblioteket som boken hör till.
create or replace function public.book_event_actor_email(p_book_id bigint, p_actor_id uuid)
returns text
language sql stable security definer set search_path to 'public'
as $$
  select case when exists (
    select 1 from public.manual_books mb
    where mb.id = p_book_id and public.is_library_member(mb.library_id)
  ) then (select email from auth.users where id = p_actor_id) else null end;
$$;

grant execute on function public.book_event_actor_email(bigint,uuid) to authenticated, anon;
