-- sell_price_history saknade både 'manuellt' (infört 31/10 av den manuella
-- prisinmatningen) och 'ingen_begagnad'. Funktionen prissok flyttar ALLTID
-- den gamla källraden till historiken innan den skriver en ny - en bok med
-- någon av de statusarna hade därför fällt hela boken med ett spärrfel vid
-- nästa sökning, och felet hade sett ut som ett slumpmässigt fel i andra
-- körningen snarare än som en spärr.
alter table sell_price_history drop constraint if exists sell_price_history_status_check;
alter table sell_price_history add constraint sell_price_history_status_check
  check (status = any (array['bekraftat','automatiskt','vantar','osakert','manuellt','ingen_begagnad']));
