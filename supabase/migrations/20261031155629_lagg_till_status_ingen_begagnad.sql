-- Ny status: sidan hittad, men inget begagnat exemplar till salu just nu.
-- Skildes tidigare inte från "vantar" (väntar på kontroll), som i appen
-- betyder "Kolla själv" med en länk - men här finns inget att hitta genom
-- att klicka. Mätningen 31/10 visade att Studentapan skriver ut
-- "Begagnad N kr Ny N kr" i klartext, så skillnaden går nu att avgöra
-- automatiskt. 4 av 15 böcker i testet 29/10 hade just detta utfall.
alter table sell_items drop constraint if exists sell_items_price_status_check;
alter table sell_items add constraint sell_items_price_status_check
  check (price_status = any (array['bekraftat','automatiskt','vantar','osakert','ingen_traff','manuellt','ingen_begagnad']));

alter table sell_price_sources drop constraint if exists sell_price_sources_status_check;
alter table sell_price_sources add constraint sell_price_sources_status_check
  check (status = any (array['bekraftat','automatiskt','vantar','osakert','ingen_begagnad']));
