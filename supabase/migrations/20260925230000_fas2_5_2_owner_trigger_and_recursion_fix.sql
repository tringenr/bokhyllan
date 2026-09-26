-- Fas 2.5.2 foljdfix: bryt rekursion i bc_names SELECT-policy.
--
-- Ursprunglig policy anvande can_read_bc() (SECURITY DEFINER). Detta:
-- 1) blockerade INSERT+RETURNING (Postgres kunde inte verifiera nya raden mot
--    RLS medan SECURITY DEFINER-funktioner var i callstack)
-- 2) skapade rekursion nar policyn i stallet joinade shelf_shares direkt.
--
-- Losning: bc_names SELECT-policy tittar bara pa owner_id. Mottagare kommer
-- lasa hyllnamn via en separat SECURITY DEFINER-vy i Fas 2.5.4.
--
-- Insert-policyn ar ocksa forenklad - triggern set_owner_id_default satter
-- alltid owner_id = auth.uid(), sa vi kraver bara "inloggad".

drop policy if exists "bc_names read"   on public.bc_names;
drop policy if exists "bc_names insert" on public.bc_names;

create policy "bc_names read"
  on public.bc_names for select to authenticated
  using (owner_id = auth.uid());

create policy "bc_names insert"
  on public.bc_names for insert to authenticated
  with check (auth.uid() is not null);
