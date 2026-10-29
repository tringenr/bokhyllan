-- Delning v1, punkt 4: återkallning. Markerar token OCH de rader den gett
-- upphov till, i samma funktion - annars kvarstår åtkomsten trots
-- återkallad länk. UPDATE i stället för DELETE (se föregående migrering).
create or replace function public.revoke_share_link(p_link_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_link public.share_links;
begin
  select * into v_link from public.share_links where id = p_link_id;
  if v_link is null then
    raise exception 'länken finns inte';
  end if;
  if not public.is_library_member(v_link.library_id) then
    raise exception 'saknar behörighet att återkalla den här länken';
  end if;

  update public.share_links set revoked_at = now() where id = p_link_id and revoked_at is null;
  update public.shelf_shares set revoked_at = now() where redeemed_from = p_link_id and revoked_at is null;
end;
$$;
