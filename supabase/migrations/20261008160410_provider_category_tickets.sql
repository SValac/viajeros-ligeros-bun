-- New provider category for admissions (zoo, parks, museums...). Kept before 'other'
-- so the catch-all stays last. Additive: no existing row changes.
ALTER TYPE public.provider_category ADD VALUE IF NOT EXISTS 'tickets' BEFORE 'other';
