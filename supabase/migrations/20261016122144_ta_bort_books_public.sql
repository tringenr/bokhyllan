-- PR 2: ta bort books_public
--
-- VIKTIGARE än överlämningen beskrev: det här är inte bara en läsläcka.
-- books_public ägs av "postgres" (som har fulla rättigheter på manual_books)
-- och har security_invoker=false, så vyn körs med ägarens rättigheter.
-- anon-rollen har dessutom SELECT, INSERT, UPDATE och DELETE beviljat på
-- vyn. Eftersom det är en enkel vy över en enda tabell (ingen DISTINCT,
-- ingen JOIN) är den automatiskt skrivbar - vilket betyder att VEM SOM
-- HELST med den publika anon-nyckeln (som ligger i klartext i det publika
-- repot) kan skriva och radera i hela boksamlingen, helt utan inloggning.
-- Bekräftat i en lokal testdatabas som speglar produktionens exakta
-- rättigheter (anon kunde både läsa och skriva om en boktitel).
--
-- Appen använder bara SELECT på vyn, för det utloggade läget - och det
-- läget tas bort i samma PR (ersätts av en inloggningsskärm), så vyn
-- behövs inte längre alls.

drop view if exists public.books_public;
