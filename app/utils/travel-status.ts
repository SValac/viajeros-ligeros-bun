import type { TravelStatus } from '~/types/travel';

type TravelStatusColor = 'primary' | 'info' | 'success' | 'warning' | 'error';

const TRAVEL_STATUS_COLORS: Record<TravelStatus, TravelStatusColor> = {
  pending: 'warning',
  published: 'info',
  in_progress: 'primary',
  completed: 'success',
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
