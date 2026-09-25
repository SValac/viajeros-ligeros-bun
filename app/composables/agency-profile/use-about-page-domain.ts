import { z } from 'zod';

import type { AboutPage } from '~/types/agency-profile';
import type { Json } from '~/types/database.types';

import {
  asRecord,
  asString,
  cleanLine,
  cleanText,
  optionalText,
  pageSectionsSchema,
  requiredLine,
  serializePageSections,
  toPageSections,
  withOptional,
} from '~/composables/agency-profile/use-page-sections-domain';

// "Nosotros" page contract shared with the public site (viajeros-ligeros-web), which
// re-validates on read. Sections follow the shared contract in use-page-sections-domain.ts.
// The structural part is also enforced by the agency_profiles_about_page_valid CHECK in
// 20260924183111_agency_about_page.sql.
export const ABOUT_PAGE_LIMITS = {
  heroTitle: 100,
  heroDescription: 400,
} as const;

/**
 * Validates the "Nosotros" editor state (`''` = optional text not set). Mirrors the
 * contract the public site validates on read. With these limits a full page stays well
 * under the database's 64 KB cap, so size is not checked here.
 */
export const aboutPageSchema = z.object({
  hero: z.object({
    title: requiredLine(ABOUT_PAGE_LIMITS.heroTitle),
    description: optionalText(ABOUT_PAGE_LIMITS.heroDescription),
  }),
  sections: pageSectionsSchema,
});

/**
 * Converts the editor state into the JSON stored in `agency_profiles.about_page`:
 * trims texts, strips control characters, normalizes paragraphs and omits empty
 * optional fields.
 * @param page - Editor state, or `null` when the agency has no "Nosotros" page
 * @returns JSON for the `about_page` column, or `null`
 */
export function serializeAboutPage(page: AboutPage | null): Json | null {
  if (!page)
    return null;

  return {
    hero: withOptional({ title: cleanLine(page.hero.title) }, 'description', cleanText(page.hero.description)),
    sections: serializePageSections(page.sections),
  };
}

/**
 * Reads the stored `about_page` JSON into editor state, filling missing optional texts
 * with `''` so every input has a value. Lenient on purpose: whatever is stored is shown
 * for editing, and the form schema flags anything that no longer fits the contract.
 * @param json - Value of `agency_profiles.about_page`
 * @returns Editor state, or `null` when the agency has no "Nosotros" page
 */
export function toAboutPage(json: Json | null): AboutPage | null {
  if (!json || typeof json !== 'object' || Array.isArray(json))
    return null;

  const hero = asRecord(json.hero);
  return {
    hero: { title: asString(hero.title), description: asString(hero.description) },
    sections: toPageSections(json.sections),
  };
}

/**
 * Deep-copies a stored page into independent editor state, so edits don't touch the
 * store until they are saved.
 * @param page - The profile's page (may be a reactive proxy), or `null`
 * @returns A plain copy, or `null`
 */
export function cloneAboutPage(page: AboutPage | null): AboutPage | null {
  return page ? structuredClone(toRaw(page)) : null;
}

/**
 * Creates an empty "Nosotros" page (hero only).
 * @returns A new page ready to edit
 */
export function createEmptyAboutPage(): AboutPage {
  return { hero: { title: '', description: '' }, sections: [] };
}

/**
 * Example page: Viajeros Ligeros' own "Nosotros" content (copied from the public site,
 * viajeros-ligeros-web app/lib/about-page-viajeros-ligeros.ts), with the agency's name
 * in the hero. The agency keeps the structure and rewrites the texts.
 * @param companyName - Agency name, if already set
 * @returns A complete, valid page
 */
export function createAboutPageTemplate(companyName: string): AboutPage {
  const name = companyName.trim() || 'Nuestra agencia';

  return {
    hero: {
      title: 'Existimos para que México se sienta más cerca',
      description: `${name} nace del gusto por compartir la pasión de descubrir nuevos paisajes, sabores y formas de vivir — y de la necesidad de salir de la rutina y experimentarlo de forma segura, junto a otras personas.`,
    },
    sections: [
      {
        type: 'text',
        headline: 'Por qué existimos',
        title: 'Quitamos la fricción de viajar en grupo',
        description: 'Organizar un viaje en grupo es un dolor de cabeza: coordinar transporte, hospedaje, itinerario y gente que cancela. Por eso armamos viajes «llave en mano» — transporte ejecutivo, hospedaje, itinerario y coordinador incluidos. Usted solo se apunta y llega con su maleta.',
      },
      {
        type: 'features',
        headline: 'Qué nos hace diferentes',
        title: 'Un operador grande, con trato de amigo',
        description: '',
        items: [
          { title: 'Grupos grandes, trato cercano', description: 'Viajamos en grupos de 45 a 50 personas, pero cada quien recibe atención personalizada de nuestro coordinador.', icon: 'users' },
          { title: 'Rutas poco saturadas', description: 'Preferimos la Huasteca, Chiapas o el Valle de Guadalupe antes que los destinos de playa de siempre.', icon: 'map-pinned' },
          { title: 'Todo en un solo lugar', description: 'Reservación y comunicación 100% en línea, por WhatsApp, sin necesidad de oficina.', icon: 'smartphone' },
          { title: 'Precio e itinerario claros', description: 'Sabe exactamente qué incluye su viaje y cuánto cuesta desde el primer momento, sin letras chiquitas.', icon: 'file-check' },
        ],
      },
      {
        type: 'steps',
        headline: 'Cómo viajar con nosotros',
        title: 'Tres pasos, nada más',
        items: [
          { title: 'Elija su viaje', description: 'Explore el catálogo y encuentre el destino que le late, con fechas y precio claros desde el inicio.' },
          { title: 'Nosotros organizamos todo', description: 'Transporte ejecutivo, hospedaje, itinerario y coordinador, listos antes de salir.' },
          { title: 'Usted solo aparece con su maleta', description: 'Se une al grupo el día de la salida y disfruta el camino, nosotros nos encargamos del resto.' },
        ],
      },
      {
        type: 'text',
        headline: 'Para quién son estos viajes',
        title: 'Para quien quiera conocer México sin complicarse',
        description: 'Parejas, grupos de amigos y viajeros solos que buscan desconectar de la rutina sin tener coche, sin armar el grupo por su cuenta y sin gastar el fin de semana planeando.',
      },
    ],
  };
}
