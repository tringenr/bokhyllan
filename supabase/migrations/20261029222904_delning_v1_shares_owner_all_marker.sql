-- Ändrades redan via ett execute_sql-anrop (alter policy); spårar samma
-- ändring. bc kan vara null nu (scope=library), så can_admin_bc(library_id,
-- bc) fungerar inte längre som ägarvillkor - is_library_member räcker.
alter policy "shares owner all" on public.shelf_shares
  using (public.is_library_member(library_id))
  with check (public.is_library_member(library_id));
