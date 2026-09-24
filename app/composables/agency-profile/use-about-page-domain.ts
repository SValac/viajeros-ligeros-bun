import { z } from 'zod';

import type {
  AboutPage,
  AboutPageFeatureItem,
  AboutPageSection,
  AboutPageSectionType,
  AboutPageStepItem,
} from '~/types/agency-profile';
import type { Json } from '~/types/database.types';

import { sanitizeText } from '~/utils/form-validation';

// Contract shared with the public site (viajeros-ligeros-web), which re-validates on read.
// The structural part is also enforced by the agency_profiles_about_page_valid CHECK in
// 20260924183111_agency_about_page.sql.
export const ABOUT_PAGE_LIMITS = {
  heroTitle: 100,
  heroDescription: 400,
  headline: 40,
  sectionTitle: 100,
  textDescription: 1000,
  featuresDescription: 400,
  itemTitle: 60,
  itemDescription: 200,
  sections: 8,
  featureItems: { min: 2, max: 8 },
  stepItems: { min: 2, max: 6 },
} as const;

// The web renders these as `i-lucide-<key>` and falls back to a default icon otherwise.
export const ABOUT_PAGE_ICONS = [
  'users',
  'map-pinned',
  'map',
  'compass',
  'mountain',
  'palmtree',
  'tent',
  'bus',
  'plane',
  'hotel',
  'bed-double',
  'utensils',
  'camera',
  'heart',
  'shield-check',
  'star',
  'smartphone',
  'file-check',
  'wallet',
  'clock',
  'calendar-check',
  'sparkles',
  'sun',
  'ticket',
  'handshake',
  'message-circle',
  'badge-check',
  'leaf',
  'route',
  'luggage',
] as const;

export type AboutPageIcon = (typeof ABOUT_PAGE_ICONS)[number];

// Names shown in the CRM icon picker.
export const ABOUT_PAGE_ICON_LABELS: Record<AboutPageIcon, string> = {
  'users': 'Personas',
  'map-pinned': 'Ubicación',
  'map': 'Mapa',
  'compass': 'Brújula',
  'mountain': 'Montaña',
  'palmtree': 'Playa',
  'tent': 'Campamento',
  'bus': 'Autobús',
  'plane': 'Avión',
  'hotel': 'Hotel',
  'bed-double': 'Cama',
  'utensils': 'Comida',
  'camera': 'Cámara',
  'heart': 'Corazón',
  'shield-check': 'Seguridad',
  'star': 'Estrella',
  'smartphone': 'Celular',
  'file-check': 'Documentos',
  'wallet': 'Cartera',
  'clock': 'Reloj',
  'calendar-check': 'Calendario',
  'sparkles': 'Destellos',
  'sun': 'Sol',
  'ticket': 'Boleto',
  'handshake': 'Acuerdo',
  'message-circle': 'Mensaje',
  'badge-check': 'Garantía',
  'leaf': 'Naturaleza',
  'route': 'Ruta',
  'luggage': 'Equipaje',
};

const DEFAULT_ICON: AboutPageIcon = 'star';

export function isAboutPageIcon(value: string): value is AboutPageIcon {
  return (ABOUT_PAGE_ICONS as readonly string[]).includes(value);
}

export const ABOUT_SECTION_TYPES: Record<AboutPageSectionType, { label: string; description: string; icon: string }> = {
  text: {
    label: 'Texto',
    description: 'Un título con uno o varios párrafos.',
    icon: 'i-lucide-align-left',
  },
  features: {
    label: 'Tarjetas con ícono',
    description: 'Una cuadrícula de 2 a 8 tarjetas, cada una con ícono.',
    icon: 'i-lucide-layout-grid',
  },
  steps: {
    label: 'Pasos',
    description: 'De 2 a 6 pasos numerados, en orden.',
    icon: 'i-lucide-list-ordered',
  },
};

const LINE_BREAK_REGEX = /[\r\n]/;

function requiredLine(max: number) {
  return z.string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .max(max, `Máximo ${max} caracteres`)
    .refine(value => !LINE_BREAK_REGEX.test(value), 'Sin saltos de línea');
}

function optionalLine(max: number) {
  return z.string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .refine(value => !LINE_BREAK_REGEX.test(value), 'Sin saltos de línea');
}

function requiredText(max: number) {
  return z.string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .max(max, `Máximo ${max} caracteres`);
}

function optionalText(max: number) {
  return z.string()
    .trim()
    .max(max, `Máximo ${max} caracteres`);
}

const featureItemSchema = z.object({
  title: requiredLine(ABOUT_PAGE_LIMITS.itemTitle),
  description: requiredText(ABOUT_PAGE_LIMITS.itemDescription),
  // A string refine (not z.enum) so the output stays `string`, like the editor state.
  icon: z.string().refine(isAboutPageIcon, 'Elige un ícono de la lista'),
});

const stepItemSchema = z.object({
  title: requiredLine(ABOUT_PAGE_LIMITS.itemTitle),
  description: requiredText(ABOUT_PAGE_LIMITS.itemDescription),
});

const { featureItems, stepItems } = ABOUT_PAGE_LIMITS;

const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    headline: optionalLine(ABOUT_PAGE_LIMITS.headline),
    title: requiredLine(ABOUT_PAGE_LIMITS.sectionTitle),
    description: requiredText(ABOUT_PAGE_LIMITS.textDescription),
  }),
  z.object({
    type: z.literal('features'),
    headline: optionalLine(ABOUT_PAGE_LIMITS.headline),
    title: requiredLine(ABOUT_PAGE_LIMITS.sectionTitle),
    description: optionalText(ABOUT_PAGE_LIMITS.featuresDescription),
    items: z.array(featureItemSchema)
      .min(featureItems.min, `Agrega al menos ${featureItems.min} tarjetas`)
      .max(featureItems.max, `Máximo ${featureItems.max} tarjetas`),
  }),
  z.object({
    type: z.literal('steps'),
    headline: optionalLine(ABOUT_PAGE_LIMITS.headline),
    title: requiredLine(ABOUT_PAGE_LIMITS.sectionTitle),
    items: z.array(stepItemSchema)
      .min(stepItems.min, `Agrega al menos ${stepItems.min} pasos`)
      .max(stepItems.max, `Máximo ${stepItems.max} pasos`),
  }),
]);

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
  sections: z.array(sectionSchema)
    .max(ABOUT_PAGE_LIMITS.sections, `Máximo ${ABOUT_PAGE_LIMITS.sections} secciones`),
});

/**
 * Unifies line endings and collapses any run of blank (or whitespace-only) lines into
 * one blank line, since the public site splits paragraphs on a blank line.
 * @param value - Text as typed in the form
 * @returns The normalized, trimmed text (`''` when empty)
 */
export function normalizeParagraphs(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
}

function cleanLine(value: string): string {
  return sanitizeText(value).trim();
}

function cleanText(value: string): string {
  return normalizeParagraphs(sanitizeText(value));
}

// Adds `key` only when the text is not empty, so optional fields are omitted instead of `""`.
function withOptional<T extends Record<string, Json>>(target: T, key: string, value: string): T {
  return value ? { ...target, [key]: value } : target;
}

function serializeSection(section: AboutPageSection): Json {
  const base = withOptional({ type: section.type }, 'headline', cleanLine(section.headline));

  switch (section.type) {
    case 'text':
      return { ...base, title: cleanLine(section.title), description: cleanText(section.description) };
    case 'features':
      return {
        ...withOptional({ ...base, title: cleanLine(section.title) }, 'description', cleanText(section.description)),
        items: section.items.map(item => ({
          title: cleanLine(item.title),
          description: cleanText(item.description),
          icon: item.icon,
        })),
      };
    case 'steps':
      return {
        ...base,
        title: cleanLine(section.title),
        items: section.items.map(item => ({
          title: cleanLine(item.title),
          description: cleanText(item.description),
        })),
      };
  }
}

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
    sections: page.sections.map(serializeSection),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toFeatureItem(value: unknown): AboutPageFeatureItem {
  const item = asRecord(value);
  return { title: asString(item.title), description: asString(item.description), icon: asString(item.icon) || DEFAULT_ICON };
}

function toStepItem(value: unknown): AboutPageStepItem {
  const item = asRecord(value);
  return { title: asString(item.title), description: asString(item.description) };
}

function toSection(value: unknown): AboutPageSection | null {
  const section = asRecord(value);
  const common = { headline: asString(section.headline), title: asString(section.title) };

  switch (section.type) {
    case 'text':
      return { type: 'text', ...common, description: asString(section.description) };
    case 'features':
      return { type: 'features', ...common, description: asString(section.description), items: asArray(section.items).map(toFeatureItem) };
    case 'steps':
      return { type: 'steps', ...common, items: asArray(section.items).map(toStepItem) };
    default:
      return null;
  }
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
    sections: asArray(json.sections)
      .map(toSection)
      .filter((section): section is AboutPageSection => section !== null),
  };
}

/**
 * Creates an empty section of the given type, with the minimum number of items.
 * @param type - Section type picked by the user
 * @returns A new section ready to edit
 */
export function createAboutSection(type: AboutPageSectionType): AboutPageSection {
  switch (type) {
    case 'text':
      return { type, headline: '', title: '', description: '' };
    case 'features':
      return {
        type,
        headline: '',
        title: '',
        description: '',
        items: Array.from({ length: featureItems.min }, createFeatureItem),
      };
    case 'steps':
      return { type, headline: '', title: '', items: Array.from({ length: stepItems.min }, createStepItem) };
  }
}

export function createFeatureItem(): AboutPageFeatureItem {
  return { title: '', description: '', icon: DEFAULT_ICON };
}

export function createStepItem(): AboutPageStepItem {
  return { title: '', description: '' };
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

/**
 * Returns a copy of the list with one element moved one position up or down.
 * Out-of-range moves return the list unchanged.
 * @param list - Current list
 * @param index - Current position of the element
 * @param direction - `-1` to move up, `1` to move down
 * @returns The reordered copy (or the same list when the move is out of range)
 */
export function moveListItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length)
    return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target] as T, copy[index] as T];
  return copy;
}

/**
 * Hands out stable keys for list elements that have no id, so `v-for` keeps each
 * input bound to its element when the list is reordered.
 * @returns A function that returns the same key for the same object
 */
export function createListKeys() {
  const keys = new WeakMap<object, number>();
  let next = 0;
  return (item: object): number => {
    const raw = toRaw(item);
    let key = keys.get(raw);
    if (key === undefined) {
      key = next++;
      keys.set(raw, key);
    }
    return key;
  };
}
