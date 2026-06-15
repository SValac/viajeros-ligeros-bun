-- Apply NOT NULL constraint to owner_id columns.
-- Run ONLY after backfilling existing rows with the admin user's UUID:
--   UPDATE public.travels      SET owner_id = '<admin-uuid>' WHERE owner_id IS NULL;
--   UPDATE public.providers    SET owner_id = '<admin-uuid>' WHERE owner_id IS NULL;
--   UPDATE public.coordinators SET owner_id = '<admin-uuid>' WHERE owner_id IS NULL;

ALTER TABLE public.travels      ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.providers    ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.coordinators ALTER COLUMN owner_id SET NOT NULL;
