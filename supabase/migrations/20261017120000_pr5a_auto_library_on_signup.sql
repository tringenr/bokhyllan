-- PR 5a: skapa bibliotek automatiskt för varje nytt konto.
--
-- Hittills har libraries-raden bara funnits för Thomas (skapad en gång i
-- PR 3:s backfill). Nu infördes anonym provläsning (signInAnonymously) i
-- appen - varje besökare som bygger sin hylla innan de skapar ett riktigt
-- konto behöver ett eget bibliotek direkt, annars finns ingen plats att
-- koppla bc_names till. Samma trigger täcker både anonyma och vanliga nya
-- konton - auth.users-raden ser likadan ut oavsett, bara is_anonymous-
-- flaggan skiljer, och den bryr vi oss inte om här.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_library_id uuid;
begin
  insert into public.libraries (owner_id, name)
  values (new.id, 'Mitt bibliotek')
  returning id into v_library_id;

  insert into public.library_members (library_id, user_id, role)
  values (v_library_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
