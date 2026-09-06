-- Fas 2.2 - stabila UUID per bok och agarkolumn.
-- book_uid ar den kommande primara identiteten. bigint-id:t behalls sa lange
-- pa grund av att appen redan anvander det.
-- owner_id refererar till auth.users; alla befintliga rader tilldelas Thomas.

alter table public.manual_books add column if not exists book_uid uuid unique default gen_random_uuid();
alter table public.manual_books add column if not exists owner_id uuid references auth.users(id);

update public.manual_books set book_uid = gen_random_uuid() where book_uid is null;
update public.manual_books set owner_id = 'fc2141c1-c96c-40ae-b612-c4f62329208e'::uuid where owner_id is null;

-- Framtida rader far en agare via appen; NOT NULL sattas i Fas 2.5.1 nar
-- alla vagar in i skrivningar ar uppdaterade att satta agaren.

comment on column public.manual_books.book_uid is 'Stabil identitet per bok. Sjalvsatts vid insert; ligger vid sidan av bigint-id:t tills appen migreras.';
comment on column public.manual_books.owner_id is 'Kontot som ager boken. Sattas via appen framover; NOT NULL i Fas 2.5.1.';
