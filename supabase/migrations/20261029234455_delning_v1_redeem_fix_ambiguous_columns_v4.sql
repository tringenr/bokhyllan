-- Föregående fix (samma dag) räckte inte - ON CONFLICT-målet
-- "(library_id, scope, coalesce(bc,''), coalesce(book_id,-1), recipient_id)"
-- går inte att alias-kvalificera (Postgres kräver bara kolumnnamn där),
-- och de namnen krockar fortfarande med funktionens egna OUT-parametrar.
-- Verklig fix: slå upp en befintlig rad separat (utan ON CONFLICT) och
-- gör UPDATE eller INSERT beroende på om den finns, oavsett
-- återkallat-status (en tidigare återkallad rad ska kunna återupplivas av
-- en ny giltig inlösen, precis som innan). Döper INTE om OUT-parametrarna
-- (skulle krävt DROP FUNCTION, som blockerades av migreringsverktygets
-- säkerhetsspärr vid försök tidigare samma dag).
create or replace function public.redeem_share_link(p_token text)
returns table(outcome text, library_id uuid, scope text, bc text, book_id bigint)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_link public.share_links;
  v_existing_id uuid;
  v_existing_level text;
  v_new_level text;
begin
  if auth.uid() is null then
    raise exception 'ingen inloggad session';
  end if;

  select * into v_link from public.share_links where token = p_token;

  if v_link is null then
    return query select 'okant'::text, null::uuid, null::text, null::text, null::bigint;
    return;
  end if;

  if v_link.revoked_at is not null then
    return query select 'aterkallat'::text, null::uuid, null::text, null::text, null::bigint;
    return;
  end if;

  select ss.id, ss.level into v_existing_id, v_existing_level from public.shelf_shares ss
  where ss.library_id = v_link.library_id and ss.scope = v_link.scope
    and coalesce(ss.bc,'') = coalesce(v_link.bc,'') and coalesce(ss.book_id,-1) = coalesce(v_link.book_id,-1)
    and ss.recipient_id = auth.uid();

  v_new_level := case
    when v_existing_level = 'admin' then 'admin'
    else v_link.level
  end;

  if v_existing_id is not null then
    update public.shelf_shares
      set level = v_new_level, redeemed_from = v_link.id, revoked_at = null
      where id = v_existing_id;
  else
    insert into public.shelf_shares (library_id, scope, bc, book_id, recipient_id, level, granted_by, redeemed_from)
    values (v_link.library_id, v_link.scope, v_link.bc, v_link.book_id, auth.uid(), v_new_level, v_link.created_by, v_link.id);
  end if;

  return query select 'ok'::text, v_link.library_id, v_link.scope, v_link.bc, v_link.book_id;
end;
$$;
