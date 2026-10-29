-- Fynd C från claude/rapport-flodeskontroll-delning-v1-2026-10-29.md:
-- bc_names lästes med is_library_member, inte can_read_bc, så en
-- delningsmottagare såg böckerna men inte hyllans namn (shortName() föll
-- tillbaka på "Hylla " + bc).
--
-- Ändringen gjordes i produktion som en "alter policy" innan detta
-- migreringsnamn kunde tilldelas; filen dokumenterar och spårar samma
-- ändring, och är idempotent att köra om.

alter policy "bc_names read" on public.bc_names
  using (public.can_read_bc(library_id, bc));
