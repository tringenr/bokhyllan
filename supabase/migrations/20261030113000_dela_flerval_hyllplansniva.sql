-- Delade: tomt läge, visuellt urval, flerval (Design 30/10).
-- Fråga B i uppdraget: ett hyllplan har ingen egen rad i bc_names - det är
-- bara en del av en boks eget shelf-fält (t.ex. "6:S1", bc "6" + plan "S1").
-- can_read_book/can_admin_book reducerade hittills ALLTID till
-- split_part(mb.shelf,':',1) - bara "6" - innan de frågade shared_bc/
-- can_read_bc. En delning på den fulla hyllplanskoden "6:S1" (scope
-- 'shelf', bc='6:S1' i shelf_shares) matchade därför aldrig.
--
-- Fix: en extra exists-kontroll, exakt samma mönster som den redan
-- existerande scope='book'-grenen, som matchar scope='shelf' mot boken
-- EGNA fulla shelf-kod. Rör inte shared_bc()/can_read_bc()/can_admin_bc()
-- eller deras rekursion alls - den vägen (hylla/sammanslagen grupp) är
-- redan korrekt (verifierad separat, se rapporten) och ska fortsätta
-- fungera oförändrad. Det här är bara en TREDJE, additiv väg in, den kan
-- aldrig snäva in vad som redan var tillåtet.
create or replace function public.can_read_book(p_book_id bigint)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.manual_books mb
    where mb.id = p_book_id
      and (
        public.can_read_bc(mb.library_id, split_part(mb.shelf, ':', 1))
        or exists (
          select 1 from public.shelf_shares ss
          where ss.library_id = mb.library_id
            and ss.scope = 'book'
            and ss.book_id = p_book_id
            and ss.recipient_id = auth.uid()
            and ss.revoked_at is null
        )
        or exists (
          select 1 from public.shelf_shares ss
          where ss.library_id = mb.library_id
            and ss.scope = 'shelf'
            and ss.bc = mb.shelf
            and ss.recipient_id = auth.uid()
            and ss.revoked_at is null
        )
      )
  );
$$;

create or replace function public.can_admin_book(p_book_id bigint)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.manual_books mb
    where mb.id = p_book_id
      and (
        public.can_admin_bc(mb.library_id, split_part(mb.shelf, ':', 1))
        or exists (
          select 1 from public.shelf_shares ss
          where ss.library_id = mb.library_id
            and ss.scope = 'book'
            and ss.book_id = p_book_id
            and ss.recipient_id = auth.uid()
            and ss.level = 'admin'
            and ss.revoked_at is null
        )
        or exists (
          select 1 from public.shelf_shares ss
          where ss.library_id = mb.library_id
            and ss.scope = 'shelf'
            and ss.bc = mb.shelf
            and ss.recipient_id = auth.uid()
            and ss.level = 'admin'
            and ss.revoked_at is null
        )
      )
  );
$$;
