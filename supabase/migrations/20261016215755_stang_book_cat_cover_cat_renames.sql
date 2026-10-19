-- PR 1: stäng book_cat, book_cover, cat_renames mot ägaren
--
-- Idag har dessa tre tabeller policyer som släpper in alla inloggade (`true`).
-- Vem som helst kan läsa och ändra andras bokkategorier, egna omslag och
-- kategorinamnbyten. book_cat/book_cover kopplas till ägaren via
-- manual_books.shelf (samma mönster som manual_books egna policyer).
-- cat_renames saknar helt en koppling till en plats eller bok, så den får
-- en egen owner_id-kolumn (samma mönster som bc_names/manual_books).

-- ---------- book_cat ----------

drop policy if exists "bc read" on public.book_cat;
drop policy if exists "bc upd" on public.book_cat;
drop policy if exists "bc write" on public.book_cat;

create policy "book_cat read" on public.book_cat
  for select using (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cat.book_id
        and public.can_read_bc(split_part(mb.shelf, ':', 1))
    )
  );

create policy "book_cat insert" on public.book_cat
  for insert with check (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cat.book_id
        and public.can_admin_bc(split_part(mb.shelf, ':', 1))
    )
  );

create policy "book_cat update" on public.book_cat
  for update using (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cat.book_id
        and public.can_admin_bc(split_part(mb.shelf, ':', 1))
    )
  ) with check (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cat.book_id
        and public.can_admin_bc(split_part(mb.shelf, ':', 1))
    )
  );

-- ---------- book_cover ----------

drop policy if exists "cov read" on public.book_cover;
drop policy if exists "cov upd" on public.book_cover;
drop policy if exists "cov write" on public.book_cover;

create policy "book_cover read" on public.book_cover
  for select using (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cover.book_id
        and public.can_read_bc(split_part(mb.shelf, ':', 1))
    )
  );

create policy "book_cover insert" on public.book_cover
  for insert with check (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cover.book_id
        and public.can_admin_bc(split_part(mb.shelf, ':', 1))
    )
  );

create policy "book_cover update" on public.book_cover
  for update using (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cover.book_id
        and public.can_admin_bc(split_part(mb.shelf, ':', 1))
    )
  ) with check (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_cover.book_id
        and public.can_admin_bc(split_part(mb.shelf, ':', 1))
    )
  );

-- ---------- cat_renames ----------
-- Får en egen owner_id, satt automatiskt via samma trigger-funktion som
-- bc_names och manual_books redan använder. Befintliga rader (bara Thomas
-- idag) backfylls till den enda ägare som redan finns i bc_names.

alter table public.cat_renames add column if not exists owner_id uuid default auth.uid();

update public.cat_renames
  set owner_id = (select owner_id from public.bc_names where owner_id is not null limit 1)
  where owner_id is null;

create trigger cat_renames_set_owner
  before insert on public.cat_renames
  for each row execute function public.set_owner_id_default();

drop policy if exists "cr read" on public.cat_renames;
drop policy if exists "cr write" on public.cat_renames;
drop policy if exists "cr update" on public.cat_renames;
drop policy if exists "cr delete" on public.cat_renames;

create policy "cat_renames read" on public.cat_renames
  for select using (owner_id = auth.uid());

create policy "cat_renames insert" on public.cat_renames
  for insert with check (auth.uid() is not null);

create policy "cat_renames update" on public.cat_renames
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "cat_renames delete" on public.cat_renames
  for delete using (owner_id = auth.uid());
