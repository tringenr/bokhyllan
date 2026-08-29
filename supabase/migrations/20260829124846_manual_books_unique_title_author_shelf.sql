-- Dubblettskydd: samma titel + forfattare pa samma hyllkod far bara finnas en gang.
-- Normaliserat pa gemener och trimmad text sa att "  Noir " och "noir" raknas som samma bok.
-- OBS: skyddar bara rader i manual_books. De 737 bockerna i data/books.json ligger
-- utanfor databasen och ar oskyddade tills Fas 2 ar klar.
create unique index if not exists manual_books_unik_bok
  on public.manual_books (
    lower(btrim(title)),
    lower(btrim(coalesce(author, ''))),
    coalesce(shelf, '')
  );
