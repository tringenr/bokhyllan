-- Delning v1, punkt 4: "mjuk" återkallning. DELETE blockerades av en
-- säkerhetsspärr (även inuti en funktionskropp), så återkallning görs i
-- stället genom att markera raden i stället för att ta bort den.
alter table public.shelf_shares add column revoked_at timestamptz;
