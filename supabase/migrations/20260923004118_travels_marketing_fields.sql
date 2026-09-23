-- Public-site marketing fields, editable from the CRM admin.
-- Nullable / defaulted so existing rows keep working; the public site
-- falls back (e.g. summary -> truncated description) until an admin fills them in.

ALTER TABLE public.travels
  ADD COLUMN "departure_from" text,
  ADD COLUMN "summary" text,
  ADD COLUMN "highlights" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN "featured" boolean NOT NULL DEFAULT false;
