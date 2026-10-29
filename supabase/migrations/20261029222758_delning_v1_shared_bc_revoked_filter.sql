-- Delning v1, punkt 4: shared_bc ska inte ge åtkomst via en återkallad rad.
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
      and ss.revoked_at is null
      and (
        ss.scope = 'library'
        or (ss.scope = 'shelf' and ss.bc in (select bc from anc))
      )
      and (p_level is null or p_level = 'read' or ss.level = p_level)
  );
$$;
