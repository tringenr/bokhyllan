-- Ändrades redan via execute_sql (alter policy); spårar samma ändring.
alter policy "book_cover read" on public.book_cover
  using (public.can_read_book(book_id));
