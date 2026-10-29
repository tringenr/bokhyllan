-- Delning v1, punkt 4 (lucka hittad under eget bygge): om samma mottagare
-- löser in en ny giltig länk efter att en tidigare blivit återkallad,
-- måste revoked_at nollställas - annars kvarstår den gamla spärren trots
-- en ny, giltig inlösen.
create or replace function public.redeem_share_link(p_token text)
returns table(outcome text, library_id uuid, scope text, bc text, book_id bigint)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_link public.share_links;
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

  select level into v_existing_level from public.shelf_shares
  where library_id = v_link.library_id and scope = v_link.scope
    and coalesce(bc,'') = coalesce(v_link.bc,'') and coalesce(book_id,-1) = coalesce(v_link.book_id,-1)
    and recipient_id = auth.uid()
    and revoked_at is null;

  v_new_level := case
    when v_existing_level = 'admin' then 'admin'
    else v_link.level
  end;

  insert into public.shelf_shares (library_id, scope, bc, book_id, recipient_id, level, granted_by, redeemed_from)
  values (v_link.library_id, v_link.scope, v_link.bc, v_link.book_id, auth.uid(), v_new_level, v_link.created_by, v_link.id)
  on conflict (library_id, scope, coalesce(bc,''), coalesce(book_id,-1), recipient_id)
  do update set level = v_new_level, redeemed_from = v_link.id, revoked_at = null;

  return query select 'ok'::text, v_link.library_id, v_link.scope, v_link.bc, v_link.book_id;
end;
$$;
