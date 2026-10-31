-- Bugg: manuell prissättning (Design 31/10, skärm 3 - "Manuellt tillagt")
-- skriver price_status:"manuellt" (js/app.js, vardSparaManuellt), men
-- check-constrainten på sell_items.price_status fick aldrig det värdet
-- tillagt när funktionen byggdes. Varje försök att spara ett manuellt pris
-- stupar på "violates check constraint sell_items_price_status_check".
alter table public.sell_items
  drop constraint if exists sell_items_price_status_check;
alter table public.sell_items
  add constraint sell_items_price_status_check
    check (price_status in ('bekraftat','automatiskt','vantar','osakert','ingen_traff','manuellt'));
