-- När ett inskickat hyllfoto klarmarkerades. Appen visar klarmarkerade foton
-- hopfällda i 30 dagar (för att kunna läsas av igen eller öppnas på nytt) och
-- döljer dem sedan ur listan. Fotot och böckerna påverkas inte.
-- Rader som redan var klara saknar tidpunkt och räknas som äldre än 30 dagar.
alter table public.new_shelves
  add column if not exists done_at timestamptz;
