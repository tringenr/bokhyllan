-- Ändrades redan via execute_sql (alter policy); spårar samma ändring.
alter policy "book_cat read" on public.book_cat
  using (public.can_read_book(book_id));
