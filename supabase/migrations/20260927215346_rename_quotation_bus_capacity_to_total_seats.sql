-- quotations.bus_capacity read like the capacity of one bus, but it's the total
-- seats a quotation sells across all its buses (e.g. 50 + 45). It divides the
-- costs split among the total in the seat price, and drives projected profit
-- and break-even. Renamed so it isn't mistaken for a single bus again. It stays
-- a manual value: the CRM shows the sum of the quotation's buses as a reference,
-- since fewer seats than the physical capacity may be sold.
--
-- No function, view or policy references it, and the public web doesn't read it.
ALTER TABLE public.quotations RENAME COLUMN bus_capacity TO total_seats;
