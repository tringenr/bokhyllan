-- PR 4.5: koppla gap-photos-bucketens behörighet till bibliotek.
--
-- Körd mot produktion 2026-10-20 via SQL Editor (apply_migration/execute_sql
-- avvisades upprepade gånger i den här sessionen av okänd anledning, se
-- PR-texten). Thomas flyttade först de 18 befintliga objekten till
-- <library_id>/<filnamn> i Storage-gränssnittet, och de nio databasrader som
-- pekade på gamla publika webblänkar (kvarlevor från innan bucketen blev
-- privat 19/10) uppdaterades till samma sökvägsformat. Registrerad manuellt i
-- supabase_migrations.schema_migrations med samma versionsnummer som det här
-- filnamnet, enligt CLAUDE.md:s regel om att filnamn och historik ska stämma.

drop policy if exists "gap photo read" on storage.objects;
drop policy if exists "gap photo write" on storage.objects;

create policy "gap photo read v2" on storage.objects
  for select
  using (
    bucket_id = 'gap-photos'
    and is_library_member(((storage.foldername(name))[1])::uuid)
  );

create policy "gap photo write v2" on storage.objects
  for insert
  with check (
    bucket_id = 'gap-photos'
    and is_library_member(((storage.foldername(name))[1])::uuid)
  );
