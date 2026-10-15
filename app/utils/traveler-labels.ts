import type { TravelerType } from '~/types/payment';
import type { Traveler } from '~/types/traveler';

/** What a person is on the travel, for its icon: a coordinator, a representative or anyone else. */
export type TravelerRole = 'traveler' | 'representative' | 'coordinator';

const TRAVELER_TYPE_LABELS: Record<TravelerType, string> = {
  adult: 'Adulto',
  child: 'Niño',
};

// Select items of a traveler's account type
export const TRAVELER_TYPE_OPTIONS: { label: string; value: TravelerType }[] = [
  { label: TRAVELER_TYPE_LABELS.adult, value: 'adult' },
  { label: TRAVELER_TYPE_LABELS.child, value: 'child' },
];

// One icon per role, the same in every list: `user-star` only means representative.
export const TRAVELER_ROLE_ICONS: Record<TravelerRole, { name: string; class: string }> = {
  traveler: { name: 'i-lucide-user', class: 'text-muted' },
  representative: { name: 'i-lucide-user-star', class: 'text-primary' },
  coordinator: { name: 'i-lucide-user-cog', class: 'text-info' },
};

export function getTravelerTypeLabel(type: TravelerType): string {
  return TRAVELER_TYPE_LABELS[type];
}

/**
 * @param traveler - Traveler of the travel (a coordinator is a traveler of kind `coordinator`)
 * @returns `coordinator`, `representative` or `traveler`, in that order of precedence
 */
export function getTravelerRole(traveler: Pick<Traveler, 'kind' | 'isRepresentative'>): TravelerRole {
  if (traveler.kind === 'coordinator')
    return 'coordinator';
  if (traveler.isRepresentative)
    return 'representative';
  return 'traveler';
}

export function formatTravelerName(traveler: Pick<Traveler, 'firstName' | 'lastName'>): string {
  return `${traveler.firstName} ${traveler.lastName}`.trim();
}
