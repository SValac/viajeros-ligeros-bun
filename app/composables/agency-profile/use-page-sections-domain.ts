import { z } from 'zod';

import type {
  PageSection,
  PageSectionFeatureItem,
  PageSectionStepItem,
  PageSectionType,
} from '~/types/agency-profile';
import type { Json } from '~/types/database.types';

import { sanitizeText } from '~/utils/form-validation';

// Sections an agency composes for its public site pages ("Nosotros" and the home page).
// Contract shared with the public site (viajeros-ligeros-web app/lib/page-sections.ts),
// which re-validates on read. The structural part is also enforced by the
// agency_profiles_about_page_valid and agency_profiles_home_page_valid CHECKs.
export const PAGE_SECTION_LIMITS = {
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
export const PAGE_SECTION_ICONS = [
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

export type PageSectionIcon = (typeof PAGE_SECTION_ICONS)[number];

// Names shown in the CRM icon picker.
export const PAGE_SECTION_ICON_LABELS: Record<PageSectionIcon, string> = {
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

const DEFAULT_ICON: PageSectionIcon = 'star';

export function isPageSectionIcon(value: string): value is PageSectionIcon {
  return (PAGE_SECTION_ICONS as readonly string[]).includes(value);
}

export const PAGE_SECTION_TYPES: Record<PageSectionType, { label: string; description: string; icon: string }> = {
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

// ============================================================================
// Validation
// ============================================================================

const LINE_BREAK_REGEX = /[\r\n]/;

export function requiredLine(max: number) {
  return z.string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .max(max, `Máximo ${max} caracteres`)
    .refine(value => !LINE_BREAK_REGEX.test(value), 'Sin saltos de línea');
}

export function optionalLine(max: number) {
  return z.string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .refine(value => !LINE_BREAK_REGEX.test(value), 'Sin saltos de línea');
}

export function requiredText(max: number) {
  return z.string()
    .trim()
    .min(1, 'Este campo es obligatorio')
    .max(max, `Máximo ${max} caracteres`);
}

export function optionalText(max: number) {
  return z.string()
    .trim()
    .max(max, `Máximo ${max} caracteres`);
}

const featureItemSchema = z.object({
  title: requiredLine(PAGE_SECTION_LIMITS.itemTitle),
  description: requiredText(PAGE_SECTION_LIMITS.itemDescription),
  // A string refine (not z.enum) so the output stays `string`, like the editor state.
  icon: z.string().refine(isPageSectionIcon, 'Elige un ícono de la lista'),
});

const stepItemSchema = z.object({
  title: requiredLine(PAGE_SECTION_LIMITS.itemTitle),
  description: requiredText(PAGE_SECTION_LIMITS.itemDescription),
});

const { featureItems, stepItems } = PAGE_SECTION_LIMITS;

const pageSectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    headline: optionalLine(PAGE_SECTION_LIMITS.headline),
    title: requiredLine(PAGE_SECTION_LIMITS.sectionTitle),
    description: requiredText(PAGE_SECTION_LIMITS.textDescription),
  }),
  z.object({
    type: z.literal('features'),
    headline: optionalLine(PAGE_SECTION_LIMITS.headline),
    title: requiredLine(PAGE_SECTION_LIMITS.sectionTitle),
    description: optionalText(PAGE_SECTION_LIMITS.featuresDescription),
    items: z.array(featureItemSchema)
      .min(featureItems.min, `Agrega al menos ${featureItems.min} tarjetas`)
      .max(featureItems.max, `Máximo ${featureItems.max} tarjetas`),
  }),
  z.object({
    type: z.literal('steps'),
    headline: optionalLine(PAGE_SECTION_LIMITS.headline),
    title: requiredLine(PAGE_SECTION_LIMITS.sectionTitle),
    items: z.array(stepItemSchema)
      .min(stepItems.min, `Agrega al menos ${stepItems.min} pasos`)
      .max(stepItems.max, `Máximo ${stepItems.max} pasos`),
  }),
]);

/** Validates a page's list of sections, as held by the editor. */
export const pageSectionsSchema = z.array(pageSectionSchema)
  .max(PAGE_SECTION_LIMITS.sections, `Máximo ${PAGE_SECTION_LIMITS.sections} secciones`);

// ============================================================================
// Serialization (editor state -> stored JSON)
// ============================================================================

/**
 * Unifies line endings and collapses any run of blank (or whitespace-only) lines into
 * one blank line, since the public site splits paragraphs on a blank line.
 * @param value - Text as typed in the form
 * @returns The normalized, trimmed text (`''` when empty)
 */
export function normalizeParagraphs(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
}

/** Single-line text: control characters stripped, trimmed. */
export function cleanLine(value: string): string {
  return sanitizeText(value).trim();
}

/** Multi-paragraph text: control characters stripped, paragraphs normalized. */
export function cleanText(value: string): string {
  return normalizeParagraphs(sanitizeText(value));
}

/**
 * Adds `key` only when the text is not empty, so optional fields are omitted instead of `""`.
 * @param target - Object being built
 * @param key - Field name
 * @param value - Already cleaned text
 * @returns `target`, or a copy with the field added
 */
export function withOptional<T extends Record<string, Json>>(target: T, key: string, value: string): T {
  return value ? { ...target, [key]: value } : target;
}

function serializePageSection(section: PageSection): Json {
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
 * Converts the editor's sections into the stored JSON: trims texts, strips control
 * characters, normalizes paragraphs and omits empty optional fields.
 * @param sections - Editor state
 * @returns JSON array for the page's `sections` key
 */
export function serializePageSections(sections: PageSection[]): Json[] {
  return sections.map(serializePageSection);
}

// ============================================================================
// Parsing (stored JSON -> editor state)
// ============================================================================

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toFeatureItem(value: unknown): PageSectionFeatureItem {
  const item = asRecord(value);
  return { title: asString(item.title), description: asString(item.description), icon: asString(item.icon) || DEFAULT_ICON };
}

function toStepItem(value: unknown): PageSectionStepItem {
  const item = asRecord(value);
  return { title: asString(item.title), description: asString(item.description) };
}

function toPageSection(value: unknown): PageSection | null {
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
 * Reads stored sections into editor state, filling missing optional texts with `''`
 * and dropping sections of an unknown type. Lenient on purpose: whatever is stored is
 * shown for editing, and the form schema flags anything that no longer fits.
 * @param value - The page's stored `sections` value
 * @returns Editor state (empty when `value` is not an array)
 */
export function toPageSections(value: unknown): PageSection[] {
  return asArray(value)
    .map(toPageSection)
    .filter((section): section is PageSection => section !== null);
}

// ============================================================================
// Editor helpers
// ============================================================================

/**
 * Creates an empty section of the given type, with the minimum number of items.
 * @param type - Section type picked by the user
 * @returns A new section ready to edit
 */
export function createPageSection(type: PageSectionType): PageSection {
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

export function createFeatureItem(): PageSectionFeatureItem {
  return { title: '', description: '', icon: DEFAULT_ICON };
}

export function createStepItem(): PageSectionStepItem {
  return { title: '', description: '' };
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
