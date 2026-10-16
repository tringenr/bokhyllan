-- Städar bort testkolumnen från felsökningen av avbrutna migreringar
-- (se 20261016141057). Den har aldrig använts av appen.
alter table public.cat_renames drop column if exists test_kolumn_tillfallig;
