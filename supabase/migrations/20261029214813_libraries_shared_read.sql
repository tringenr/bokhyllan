-- Fynd C från claude/rapport-flodeskontroll-delning-v1-2026-10-29.md:
-- libraries lästes bara med is_library_member, så en delningsmottagare fick
-- aldrig bibliotekets namn. Additiv läsväg: den som har en delning i
-- biblioteket (shelf_shares.recipient_id) får också läsa raden.

create policy "libraries shared read" on public.libraries
  for select
  using (
    exists (
      select 1 from public.shelf_shares ss
      where ss.library_id = libraries.id
        and ss.recipient_id = auth.uid()
    )
  );
