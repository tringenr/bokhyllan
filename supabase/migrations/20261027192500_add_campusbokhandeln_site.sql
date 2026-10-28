-- Campusbokhandeln (på väg att byta namn till Adlibris Campus) visade sig
-- vara den enda av de testade sajterna vars priser faktiskt går att läsa
-- av strukturerat (se chatten 2026-10-27) - Studentapan går inte att nå
-- alls just nu, Tradera/Bokbörsen gav i praktiken inga användbara träffar.
-- Lägger till den som giltig sajt utan att ta bort de andra tre, ifall de
-- blir åtkomliga igen senare (t.ex. om webbläsarvägen löser sig).

alter table public.sell_price_sources drop constraint sell_price_sources_site_check;
alter table public.sell_price_sources add constraint sell_price_sources_site_check
  check (site in ('studentapan','bokborsen','tradera','campusbokhandeln'));
