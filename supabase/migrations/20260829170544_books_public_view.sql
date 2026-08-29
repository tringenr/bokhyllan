-- Publik lasvy av manual_books: bara det som ar okansligt.
-- Titel, forfattare, kategori, beskrivning, kalla och osakerhetsmarkering ar
-- oppna for alla. UTELAMNADE fran vyn: shelf (hyllplats), created_by,
-- created_at, gap_id. Full lasning av manual_books kraver fortsatt inloggning
-- via befintlig RLS.
--
-- security_invoker=false betyder att vyn far tabellens rattigheter via
-- garanten som skapade vyn - annars skulle RLS forhindra anon-lasning aven
-- via vyn.

create or replace view public.books_public
with (security_invoker = false) as
  select id, title, author, cat, description, source, uncertain
  from public.manual_books;

alter view public.books_public owner to postgres;
grant select on public.books_public to anon, authenticated;

comment on view public.books_public is
  'Publik lasvy av manual_books - titel, forfattare, kategori. Utelamnar hyllplats och andra kansliga fält. Anvands av utloggade besokare via appen.';
