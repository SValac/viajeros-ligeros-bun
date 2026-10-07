import type { TravelStatus } from '~/types/travel';

export type TravelStatusColor = 'primary' | 'info' | 'neutral' | 'warning' | 'error';

const TRAVEL_STATUS_COLORS: Record<TravelStatus, TravelStatusColor> = {
  pending: 'warning',
  published: 'info',
  in_progress: 'primary',
  // Gris, no verde: con el tema por defecto `success` es el mismo verde que `primary` (En Curso)
  completed: 'neutral',
  cancelled: 'error',
};

const TRAVEL_STATUS_LABELS: Record<TravelStatus, string> = {
  pending: 'Pendiente',
  published: 'Publicado',
  in_progress: 'En Curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function getTravelStatusColor(status: TravelStatus): TravelStatusColor {
  return TRAVEL_STATUS_COLORS[status];
}

export function getTravelStatusLabel(status: TravelStatus): string {
  return TRAVEL_STATUS_LABELS[status];
}
