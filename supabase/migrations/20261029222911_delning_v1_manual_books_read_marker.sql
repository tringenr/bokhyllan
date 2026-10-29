-- Ändrades redan via execute_sql (alter policy); spårar samma ändring.
-- Punkt 1: boknivå kan inte uttryckas via can_read_bc ensam (flera böcker
-- delar hyllkod; att dela en bok ska inte öppna hela hyllan).
alter policy "manual_books read" on public.manual_books
  using (public.can_read_book(id));
