-- Fynd under Design-uppföljningen (30/10): "libraries shared read"
-- (PR #89) skrevs innan revoked_at fanns på shelf_shares (tillkom i
-- PR #91) och filtrerade därför aldrig bort återkallade delningar.
-- En återkallad delning skulle alltså ändå kunna läsa bibliotekets namn.
alter policy "libraries shared read" on public.libraries
  using (
    exists (
      select 1 from public.shelf_shares ss
      where ss.library_id = libraries.id
        and ss.recipient_id = auth.uid()
        and ss.revoked_at is null
    )
  );
