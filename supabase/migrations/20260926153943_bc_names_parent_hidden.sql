-- Platser kan grupperas och tas bort.
-- parent_bc: platsen visas som hyllor inuti en annan plats (sammanslagning).
--            Hyllkoderna på böckerna ändras inte, så en sammanslagning går
--            alltid att dela upp igen.
-- hidden:    platsen är borttagen. Raden raderas inte, eftersom shelf_shares
--            har en FK med ON DELETE CASCADE mot bc_names - en radering skulle
--            tyst ta med delningarna.
alter table public.bc_names
  add column if not exists parent_bc text,
  add column if not exists hidden boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bc_names_parent_not_self') then
    alter table public.bc_names add constraint bc_names_parent_not_self
      check (parent_bc is null or parent_bc <> bc);
  end if;
end $$;
