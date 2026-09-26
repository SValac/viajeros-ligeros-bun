-- Step 2 of 2 (contract): the "desde" price is now travels.from_price, derived
-- from the quotation's public prices. Nothing reads or writes price anymore.
ALTER TABLE public.travels DROP COLUMN price;
