-- Fas 2.5 - Luckregister och foreign keys (del 2: FKs)
-- Kopplar gap_status och manual_books till gaps via FK.
-- gap_status.gap_id -> gaps.id ON DELETE CASCADE (status utan lucka meningslos).
-- manual_books.gap_id -> gaps.id ON DELETE SET NULL (boken finns kvar).

alter table public.gap_status
  add constraint gap_status_gap_id_fkey
  foreign key (gap_id) references public.gaps(id) on delete cascade;

alter table public.manual_books
  add constraint manual_books_gap_id_fkey
  foreign key (gap_id) references public.gaps(id) on delete set null;
