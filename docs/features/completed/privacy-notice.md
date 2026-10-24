# Agency privacy notice (aviso de privacidad)

**Status:** completed (branch `feature/agency-privacy-notice`). Migration applied to local, stage/QA and prod on 2026-10-24.

The public site loads the Meta Pixel (web PR #28), so it needs a privacy notice (LFPDPPP and Meta's terms). The agency edits it in the CRM, in a new "Aviso de privacidad" tab of the agency profile. The web renders `/aviso-de-privacidad` and the footer link.

## Contract (agreed with the web session, 2026-10-24)

- Column `agency_profiles.privacy_notice jsonb`, nullable. `NULL` = no notice: the site hides the page and the link.

  ```json
  {
    "responsible": { "legal_name": "…", "address": "…", "arco_email": "…" },
    "updated_on": "YYYY-MM-DD",
    "sections": [{ "title": "…", "body": "…" }]
  }
  ```

- Limits (CRM zod, replicated by the web's lenient parser):
  - `legal_name` 200, `address` 400 (one line each);
  - `arco_email` 254, with the same regex as `contact_email`;
  - `title` 120, one line;
  - `body` 6000;
  - 1 to 20 sections.
- `body` is plain text. The CRM stores it normalized (`normalizeParagraphs`). The web splits on `\n`, ignores empty lines, and turns consecutive `- ` lines into one list.
- `updated_on` is set by the editor, only when the legal text changes. The web formats it from the string, without `new Date()`.
- Complete = legal_name + address + arco_email + updated_on + at least 1 section. The CHECK `agency_profiles_privacy_notice_valid` enforces it, so a stored notice is always complete.
- `get_public_agency_privacy_notice(p_agency_id uuid) RETURNS jsonb`: the notice of an agency with a complete profile, or `NULL`. It is separate from the profile RPC because that one runs on every page.
- `get_public_agency_profile` gets `has_privacy_notice boolean` appended last (footer link, sitemap).

## Phases

1. Migration `20261024174806_agency_privacy_notice.sql` and types.
2. Domain `use-privacy-notice-domain.ts` (zod, serialize/parse, example template), plus mapper, repository and store.
3. UI: `pages/profile/privacy.vue` with `AgencyPageForm` + `agency-privacy-notice-editor.vue`.
4. Push to stage/QA, then to prod (the user runs it). Ping the web session after each environment; the web deploys only after that.

## Decisions

- No reuse of `PageSection` (about/home): a notice needs longer texts and more sections than the cap of 8.
- Generic sections with no fields per topic. Card payments and online bookings will be added later as more sections, without changing the contract.
- The example template is the web's draft (`viajeros-ligeros-web/docs/aviso-de-privacidad-borrador.md`). It describes the site as it works today: no forms, WhatsApp, Meta Pixel, Vercel/Supabase. It is just a starting point and the UI says so. It is not legal advice.
