-- Delning v1, punkt 3 (beslutsanalys, alternativ B godkänt av Thomas
-- 29/10): triggern ska inte ge en inlösande mottagare ett eget, tomt
-- bibliotek. Appen sätter raw_user_meta_data.invited=true när en anonym
-- session skapas specifikt för att lösa in en delningslänk - det är ett
-- kontrakt för det framtida gränssnittsarbetet (ej byggt här), inte en
-- ändring av dagens "Kom igång"-flöde som inte ska påverkas.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_library_id uuid;
begin
  if coalesce(new.raw_user_meta_data->>'invited', 'false') = 'true' then
    return new;
  end if;

  insert into public.libraries (owner_id, name)
  values (new.id, 'Mitt bibliotek')
  returning id into v_library_id;

  insert into public.library_members (library_id, user_id, role)
  values (v_library_id, new.id, 'owner');

  return new;
end;
$$;
