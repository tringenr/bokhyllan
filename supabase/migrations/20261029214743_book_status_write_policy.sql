-- Fynd A från claude/rapport-flodeskontroll-delning-v1-2026-10-29.md:
-- book_status har RLS påslaget men saknade helt policyer, vilket gjorde
-- tabellen oåtkomlig (loadStatuses() fick alltid 0 rader, saveBook()
-- avvisades alltid). book_status har ingen egen library_id, utan kopplar
-- via book_id mot manual_books. Skrivning kräver medlemskap.

create policy "book_status write" on public.book_status
  for all
  using (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_status.book_id
        and public.is_library_member(mb.library_id)
    )
  )
  with check (
    exists (
      select 1 from public.manual_books mb
      where mb.id = book_status.book_id
        and public.is_library_member(mb.library_id)
    )
  );
