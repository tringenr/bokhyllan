-- Delade-fliken, aktivt läge (Design 31/10): sidan går från att lista
-- delningar till att lista PERSONER. Det kräver tre saker som inte fanns:
-- ett namn för mottagaren oavsett om hon har konto, en väg att lägga till
-- en delning direkt till en känd kontakt utan länk/token, och en väg att
-- återkalla EN specifik delning oavsett hur den skapades (revoke_share_link
-- är nyckad på ett länk-id och återkallar ALLA som löst in just den länken -
-- fel verktyg för en enskild persons enskilda delning).

-- 1) Namn för mottagaren (fråga A, del 1). Samma mönster som
--    book_event_actor_email, men nyckad på recipient_id i stället för
--    book_id - man kan bara se e-posten till någon man faktiskt haft en
--    delning med. Inget revoked_at-filter: kortet ska ha kvar namnet även
--    när allt är återkallat (uppdraget 31/10).
create or replace function public.shelf_share_recipient_email(p_recipient_id uuid)
returns text
language sql stable security definer set search_path to 'public'
as $$
  select case when exists (
    select 1 from public.shelf_shares ss
    where ss.recipient_id = p_recipient_id and public.is_library_member(ss.library_id)
  ) then (select email from auth.users where id = p_recipient_id) else null end;
$$;

grant execute on function public.shelf_share_recipient_email(uuid) to authenticated, anon;

-- 2) Manuellt namn (fråga A, del 2). Ett namn per RELATION
--    (library_id+recipient_id), inte per delning - en person med flera
--    delningar ska ha ett namn, inte ett per rad. Används bara när
--    mottagaren saknar e-post (en anonym session som löst in en länk utan
--    att skapa konto) - har hon e-post visas den, enligt uppdraget.
create table public.share_contact_labels (
  library_id uuid not null references public.libraries(id),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  updated_at timestamptz not null default now(),
  primary key (library_id, recipient_id)
);
alter table public.share_contact_labels enable row level security;
create policy "share labels owner all" on public.share_contact_labels
  for all using (public.is_library_member(library_id))
  with check (public.is_library_member(library_id));

-- 3) Dela direkt till en känd kontakt, utan länk/token (fråga B).
--    Samma upsert-logik som redeem_share_link: slår upp en EVENTUELL
--    befintlig rad för samma (library_id,scope,bc,book_id,recipient_id)
--    UTAN revoked_at-filter, så en tidigare återkallad delning
--    återaktiveras i stället för att dubbleras, och en admin-nivå skyddas
--    från att skrivas över av en lägre. p_level har inget default -
--    anropet ska alltid skicka det explicit (samma som dagens
--    share_links-rader redan gör).
create or replace function public.share_direct(
  p_library_id uuid, p_scope text, p_bc text, p_book_id bigint,
  p_recipient_id uuid, p_level text
) returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare v_existing_id uuid; v_existing_level text; v_new_level text; v_id uuid;
begin
  if not public.is_library_member(p_library_id) then
    raise exception 'saknar behörighet att dela från det här biblioteket';
  end if;

  select id, level into v_existing_id, v_existing_level from public.shelf_shares
    where library_id = p_library_id and scope = p_scope
      and coalesce(bc,'') = coalesce(p_bc,'') and coalesce(book_id,-1) = coalesce(p_book_id,-1)
      and recipient_id = p_recipient_id;

  v_new_level := case when v_existing_level = 'admin' then 'admin' else p_level end;

  if v_existing_id is not null then
    update public.shelf_shares set level = v_new_level, revoked_at = null where id = v_existing_id;
    v_id := v_existing_id;
  else
    insert into public.shelf_shares(library_id,scope,bc,book_id,recipient_id,level,granted_by)
      values (p_library_id,p_scope,p_bc,p_book_id,p_recipient_id,v_new_level,auth.uid())
      returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.share_direct(uuid,text,text,bigint,uuid,text) to authenticated, anon;

-- 4) Återkalla EN delning på sitt eget id, oavsett om den kom via länk
--    eller skrevs in direkt (share_direct). Blir huvudvägen för "Sluta
--    dela" i personvyn; revoke_share_link lever kvar bara för att dra
--    tillbaka en OINLÖST länk ("Skickade länkar").
create or replace function public.revoke_shelf_share(p_share_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare v_lib uuid;
begin
  select library_id into v_lib from public.shelf_shares where id = p_share_id;
  if v_lib is null then
    raise exception 'delningen finns inte';
  end if;
  if not public.is_library_member(v_lib) then
    raise exception 'saknar behörighet att återkalla den här delningen';
  end if;

  update public.shelf_shares set revoked_at = now()
    where id = p_share_id and revoked_at is null;
end;
$$;

grant execute on function public.revoke_shelf_share(uuid) to authenticated, anon;
