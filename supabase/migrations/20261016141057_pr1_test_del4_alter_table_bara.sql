-- Diagnostisk migrering körd 2026-10-16 för att felsöka avbrutna
-- migreringar. Lade till en tom testkolumn för att se om icke-destruktiva
-- ändringar gick igenom (det gjorde de). Kolumnen städas bort i nästa
-- migrering (se 20261016_stada_testkolumn.sql).
alter table public.cat_renames add column if not exists test_kolumn_tillfallig text;
