-- Fynd A (läsdelen) från claude/rapport-flodeskontroll-delning-v1-2026-10-29.md:
-- book_status fick ingen läspolicy, bara skriv (se
-- 20261029214743_book_status_write_policy.sql). Läsning ska gå via
-- can_read_bc så att en delningsmottagare kan se om en bok är inne eller
-- utlånad, inte bara medlemmar.
--
-- Villkorad (if not exists) eftersom policyn redan skapades manuellt i
-- produktion innan detta migreringsnamn kunde tilldelas; filen dokumenterar
-- och spårar samma ändring.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'book_status' and policyname = 'book_status read'
  ) then
    create policy "book_status read" on public.book_status
      for select
      using (
        exists (
          select 1 from public.manual_books mb
          where mb.id = book_status.book_id
            and public.can_read_bc(mb.library_id, split_part(mb.shelf, ':', 1))
        )
      );
  end if;
end $$;
