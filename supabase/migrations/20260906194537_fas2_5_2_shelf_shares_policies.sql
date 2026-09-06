-- Fas 2.5.2 (del 2 av 2): Ratighetspolicies.
-- Byter ut "authenticated far allt"-policies mot agarskap + delning.
--
-- Mnemonik:
--   SELECT  -> can_read_bc(bc)   (agare + read/admin-mottagare)
--   INSERT  -> can_admin_bc(bc)  (agare + admin-mottagare)
--   UPDATE  -> can_admin_bc(bc)
--   DELETE  -> owns_bc(bc)       (bara agare, forutom manual_books som ocksa slapper admin)
--
-- books_public-vyn (Fas 1) ar orord - den bypassar RLS via security_invoker=false
-- och forblir oppen for anon+authenticated.

-- ============ bc_names ============
drop policy if exists "family read names"   on public.bc_names;
drop policy if exists "family update names" on public.bc_names;
drop policy if exists "family write names"  on public.bc_names;

create policy "bc_names read"   on public.bc_names for select to authenticated using (public.can_read_bc(bc));
create policy "bc_names insert" on public.bc_names for insert to authenticated with check (owner_id = auth.uid());
create policy "bc_names update" on public.bc_names for update to authenticated using (public.can_admin_bc(bc)) with check (public.can_admin_bc(bc));
create policy "bc_names delete" on public.bc_names for delete to authenticated using (public.owns_bc(bc));

-- ============ spot_names ============
drop policy if exists "spot read"   on public.spot_names;
drop policy if exists "spot insert" on public.spot_names;
drop policy if exists "spot update" on public.spot_names;
drop policy if exists "spot delete" on public.spot_names;

create policy "spot_names read"   on public.spot_names for select to authenticated using (public.can_read_bc(split_part(code,':',1)));
create policy "spot_names insert" on public.spot_names for insert to authenticated with check (public.can_admin_bc(split_part(code,':',1)));
create policy "spot_names update" on public.spot_names for update to authenticated using (public.can_admin_bc(split_part(code,':',1))) with check (public.can_admin_bc(split_part(code,':',1)));
create policy "spot_names delete" on public.spot_names for delete to authenticated using (public.owns_bc(split_part(code,':',1)));

-- ============ shelves ============
drop policy if exists "shelves read"   on public.shelves;
drop policy if exists "shelves insert" on public.shelves;
drop policy if exists "shelves update" on public.shelves;
drop policy if exists "shelves delete" on public.shelves;

create policy "shelves read"   on public.shelves for select to authenticated using (public.can_read_bc(bc));
create policy "shelves insert" on public.shelves for insert to authenticated with check (public.can_admin_bc(bc));
create policy "shelves update" on public.shelves for update to authenticated using (public.can_admin_bc(bc)) with check (public.can_admin_bc(bc));
create policy "shelves delete" on public.shelves for delete to authenticated using (public.owns_bc(bc));

-- ============ manual_books ============
drop policy if exists "mb delete" on public.manual_books;
drop policy if exists "mb insert" on public.manual_books;
drop policy if exists "mb read"   on public.manual_books;
drop policy if exists "mb update" on public.manual_books;

create policy "manual_books read"   on public.manual_books for select to authenticated using (public.can_read_bc(split_part(shelf,':',1)));
create policy "manual_books insert" on public.manual_books for insert to authenticated with check (public.can_admin_bc(split_part(shelf,':',1)));
create policy "manual_books update" on public.manual_books for update to authenticated using (public.can_admin_bc(split_part(shelf,':',1))) with check (public.can_admin_bc(split_part(shelf,':',1)));
create policy "manual_books delete" on public.manual_books for delete to authenticated using (public.owns_bc(split_part(shelf,':',1)) or public.shared_bc(split_part(shelf,':',1),'admin'));

-- ============ book_status ============
drop policy if exists "family insert" on public.book_status;
drop policy if exists "family read"   on public.book_status;
drop policy if exists "family update" on public.book_status;

create policy "book_status read"
  on public.book_status for select to authenticated
  using (exists (select 1 from public.manual_books mb where mb.id = book_status.book_id and public.can_read_bc(split_part(mb.shelf,':',1))));
create policy "book_status insert"
  on public.book_status for insert to authenticated
  with check (exists (select 1 from public.manual_books mb where mb.id = book_status.book_id and public.can_admin_bc(split_part(mb.shelf,':',1))));
create policy "book_status update"
  on public.book_status for update to authenticated
  using (exists (select 1 from public.manual_books mb where mb.id = book_status.book_id and public.can_admin_bc(split_part(mb.shelf,':',1))));

-- ============ gap_status ============
drop policy if exists "gap insert" on public.gap_status;
drop policy if exists "gap read"   on public.gap_status;
drop policy if exists "gap update" on public.gap_status;

create policy "gap_status read"
  on public.gap_status for select to authenticated
  using (exists (select 1 from public.gaps g where g.id = gap_status.gap_id and public.can_read_bc(split_part(g.shelf,':',1))));
create policy "gap_status insert"
  on public.gap_status for insert to authenticated
  with check (exists (select 1 from public.gaps g where g.id = gap_status.gap_id and public.can_admin_bc(split_part(g.shelf,':',1))));
create policy "gap_status update"
  on public.gap_status for update to authenticated
  using (exists (select 1 from public.gaps g where g.id = gap_status.gap_id and public.can_admin_bc(split_part(g.shelf,':',1))));

-- ============ gaps ============
drop policy if exists "gaps delete" on public.gaps;
drop policy if exists "gaps insert" on public.gaps;
drop policy if exists "gaps read"   on public.gaps;
drop policy if exists "gaps update" on public.gaps;

create policy "gaps read"   on public.gaps for select to authenticated using (public.can_read_bc(split_part(shelf,':',1)));
create policy "gaps insert" on public.gaps for insert to authenticated with check (public.can_admin_bc(split_part(shelf,':',1)));
create policy "gaps update" on public.gaps for update to authenticated using (public.can_admin_bc(split_part(shelf,':',1))) with check (public.can_admin_bc(split_part(shelf,':',1)));
create policy "gaps delete" on public.gaps for delete to authenticated using (public.owns_bc(split_part(shelf,':',1)));

-- ============ new_shelves ============
drop policy if exists "ns del"   on public.new_shelves;
drop policy if exists "ns read"  on public.new_shelves;
drop policy if exists "ns upd"   on public.new_shelves;
drop policy if exists "ns write" on public.new_shelves;

create policy "new_shelves read"   on public.new_shelves for select to authenticated using (public.can_read_bc(bc));
create policy "new_shelves insert" on public.new_shelves for insert to authenticated with check (public.can_admin_bc(bc));
create policy "new_shelves update" on public.new_shelves for update to authenticated using (public.can_admin_bc(bc)) with check (public.can_admin_bc(bc));
create policy "new_shelves delete" on public.new_shelves for delete to authenticated using (public.owns_bc(bc));

-- book_cat, book_cover, cat_renames — orort. Gemensam katalog-metadata.
