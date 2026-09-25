-- Fas 2.5.2 foljdfix: sat owner_id automatiskt vid INSERT om appen inte
-- skickar det. Nya INSERT-policies pa bc_names kraver owner_id = auth.uid(),
-- men app-koden skickar bara {bc, name}. Trigger fyller i tyst.

create or replace function public.set_owner_id_default()
returns trigger language plpgsql security definer as $$
begin
  new.owner_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists bc_names_set_owner on public.bc_names;
create trigger bc_names_set_owner
  before insert on public.bc_names
  for each row execute function public.set_owner_id_default();

drop trigger if exists manual_books_set_owner on public.manual_books;
create trigger manual_books_set_owner
  before insert on public.manual_books
  for each row execute function public.set_owner_id_default();

alter table public.bc_names alter column owner_id set default auth.uid();
alter table public.manual_books alter column owner_id set default auth.uid();
