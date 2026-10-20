-- PR 4.5: koppla gap-photos-bucketens behörighet till bibliotek.
--
-- VIKTIGT: denna migrering får INTE köras mot produktion förrän de 18
-- befintliga objekten i gap-photos är omdöpta till <library_id>/<filnamn>
-- (kräver Storage-API:ets move-anrop, inte ren SQL - se KARTA.md/PR-texten).
-- Körs den innan det, blir alla befintliga foton oläsbara direkt, eftersom
-- deras namn saknar ett bibliotek-prefix och is_library_member(NULL) alltid
-- är false.
--
-- Filnamnet har ett provisoriskt versionsnummer (99999999) just för att det
-- INTE ska råka tolkas som redan tillämpat - byts till det riktiga,
-- registrerade numret när migreringen faktiskt körs via apply_migration,
-- enligt CLAUDE.md:s regel om att filnamn och schema_migrations ska stämma.

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
