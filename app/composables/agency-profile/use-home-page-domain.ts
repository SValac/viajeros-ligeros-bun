import { z } from 'zod';

import type { HomePage, PageTextBlock } from '~/types/agency-profile';
import type { Json } from '~/types/database.types';

import {
  asRecord,
  asString,
  cleanLine,
  cleanText,
  optionalLine,
  optionalText,
  pageSectionsSchema,
  serializePageSections,
  toPageSections,
  withOptional,
} from '~/composables/agency-profile/use-page-sections-domain';

// Home page contract shared with the public site (viajeros-ligeros-web app/lib/home-page.ts),
// which re-validates on read. Sections follow the shared contract in
// use-page-sections-domain.ts. The structural part is also enforced by the
// agency_profiles_home_page_valid CHECK in 20260925194210_agency_home_page.sql.
export const HOME_PAGE_LIMITS = {
  heroTitle: 100,
  heroDescription: 400,
  featuredHeadline: 40,
  featuredTitle: 100,
  ctaTitle: 100,
  ctaDescription: 400,
} as const;

/**
 * Texts the public site shows for a block the agency leaves empty. Copied from
 * viajeros-ligeros-web (use-site-brand.ts `defaultAgencyHomePage`); the CRM only uses
 * them as placeholders, so keep them in sync when the site changes them.
 * @param companyName - Agency name, if already set
 * @returns The default text of each block
 */
export function getHomePageDefaults(companyName: string) {
  const name = companyName.trim();
  return {
    hero: {
      title: name ? `Viajes en grupo con ${name}` : 'Viajes en grupo',
      description: 'Conozca nuestras próximas salidas y reserve su lugar por WhatsApp.',
    },
    featured: {
      headline: 'Viajes destacados',
      title: 'Nuestras próximas salidas',
    },
    cta: {
      title: '¿Listo para su próxima aventura?',
      description: 'Escríbanos por WhatsApp y le ayudamos a elegir el viaje ideal para usted.',
    },
  };
}

const MISSING_TITLE_MESSAGE = 'Agrega un título o borra el resto del bloque';

// An empty title means "use the site's default block", which only makes sense when the
// rest of the block is empty too: otherwise those texts would be silently dropped.
function requireTitleWhenFilled<T extends { title: string }>(block: T, ctx: z.RefinementCtx) {
  const { title, ...rest } = block;
  if (!title && Object.values(rest).some(Boolean))
    ctx.addIssue({ code: 'custom', path: ['title'], message: MISSING_TITLE_MESSAGE });
}

function textBlockSchema(titleMax: number, descriptionMax: number) {
  return z.object({
    title: optionalLine(titleMax),
    description: optionalText(descriptionMax),
  }).superRefine(requireTitleWhenFilled);
}

/**
 * Validates the home page editor state (`''` = text not set, which for a block's title
 * means "use the site's default block"). Mirrors the contract the public site validates
 * on read. A full page stays well under the database's 64 KB cap.
 */
export const homePageSchema = z.object({
  hero: textBlockSchema(HOME_PAGE_LIMITS.heroTitle, HOME_PAGE_LIMITS.heroDescription),
  featured: z.object({
    headline: optionalLine(HOME_PAGE_LIMITS.featuredHeadline),
    title: optionalLine(HOME_PAGE_LIMITS.featuredTitle),
  }).superRefine(requireTitleWhenFilled),
  sections: pageSectionsSchema,
  cta: textBlockSchema(HOME_PAGE_LIMITS.ctaTitle, HOME_PAGE_LIMITS.ctaDescription),
});

// A block without a title is left out, so the site falls back to its default.
function serializeTextBlock(block: PageTextBlock): Json | undefined {
  const title = cleanLine(block.title);
  return title ? withOptional({ title }, 'description', cleanText(block.description)) : undefined;
}

/**
 * Converts the editor state into the JSON stored in `agency_profiles.home_page`: trims
 * texts, strips control characters, normalizes paragraphs, omits empty optional fields
 * and leaves out every fixed block whose title is empty. `sections` is always written.
 * @param page - Editor state, or `null` for the site's default home
 * @returns JSON for the `home_page` column, or `null`
 */
export function serializeHomePage(page: HomePage | null): Json | null {
  if (!page)
    return null;

  const hero = serializeTextBlock(page.hero);
  const featuredTitle = cleanLine(page.featured.title);
  const featured = featuredTitle
    ? withOptional({ title: featuredTitle }, 'headline', cleanLine(page.featured.headline))
    : undefined;
  const cta = serializeTextBlock(page.cta);

  return {
    ...(hero && { hero }),
    ...(featured && { featured }),
    sections: serializePageSections(page.sections),
    ...(cta && { cta }),
  };
}

function toTextBlock(value: unknown): PageTextBlock {
  const block = asRecord(value);
  return { title: asString(block.title), description: asString(block.description) };
}

/**
 * Reads the stored `home_page` JSON into editor state, filling every missing block or
 * text with `''`. Lenient on purpose, like toAboutPage.
 * @param json - Value of `agency_profiles.home_page`
 * @returns Editor state, or `null` for the site's default home
 */
export function toHomePage(json: Json | null): HomePage | null {
  if (!json || typeof json !== 'object' || Array.isArray(json))
    return null;

  const featured = asRecord(json.featured);
  return {
    hero: toTextBlock(json.hero),
    featured: { headline: asString(featured.headline), title: asString(featured.title) },
    sections: toPageSections(json.sections),
    cta: toTextBlock(json.cta),
  };
}

/**
 * Deep-copies a stored page into independent editor state, so edits don't touch the
 * store until they are saved.
 * @param page - The profile's page (may be a reactive proxy), or `null`
 * @returns A plain copy, or `null`
 */
export function cloneHomePage(page: HomePage | null): HomePage | null {
  return page ? structuredClone(toRaw(page)) : null;
}

/**
 * Creates a home page with every block empty (the site keeps showing its defaults until
 * the agency fills something in).
 * @returns A new page ready to edit
 */
export function createEmptyHomePage(): HomePage {
  return {
    hero: { title: '', description: '' },
    featured: { headline: '', title: '' },
    sections: [],
    cta: { title: '', description: '' },
  };
}

/**
 * Example page: Viajeros Ligeros' own home content (copied from the public site,
 * viajeros-ligeros-web app/lib/home-page-viajeros-ligeros.ts). The agency keeps the
 * structure and rewrites the texts.
 * @returns A complete, valid page
 */
export function createHomePageTemplate(): HomePage {
  return {
    hero: {
      title: 'Empaque ligero. Nosotros nos encargamos del resto.',
      description: 'Viajes en grupo por México con transporte, hospedaje y coordinador incluidos. Usted solo disfruta el camino.',
    },
    featured: {
      headline: 'Viajes destacados',
      title: 'Nuestras próximas salidas',
    },
    sections: [
      {
        type: 'features',
        headline: 'Por qué viajar con nosotros',
        title: 'Todo resuelto, usted solo disfruta',
        description: 'Nos encargamos de la logística para que su único trabajo sea elegir el destino.',
        items: [
          { title: 'Grupos grandes, trato cercano', description: 'Viajamos en grupos de 45 a 50 personas, con atención personalizada en cada detalle.', icon: 'users' },
          { title: 'Todo incluido', description: 'Transporte, hospedaje y actividades principales resueltos desde el inicio.', icon: 'badge-check' },
          { title: 'Coordinador en cada viaje', description: 'Alguien de nuestro equipo le acompaña durante todo el recorrido.', icon: 'shield-check' },
          { title: 'Transporte ejecutivo', description: 'Autobuses cómodos y seguros para llegar y volver sin complicaciones.', icon: 'bus' },
        ],
      },
    ],
    cta: {
      title: '¿Listo para su próxima aventura?',
      description: 'Escríbanos por WhatsApp y le ayudamos a elegir el viaje ideal para usted.',
    },
  };
}
