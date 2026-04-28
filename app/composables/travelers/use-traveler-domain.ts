import type { Traveler, TravelerSeatChangeResult, TravelerWithChildren } from '~/types/traveler';

import { TravelerSeatChangeError } from '~/types/traveler';

export function isTravelerSeatChangeResult(data: unknown): data is TravelerSeatChangeResult {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const payload = data as Partial<TravelerSeatChangeResult>;
  return (payload.operation === 'moved' || payload.operation === 'swapped')
    && typeof payload.travelId === 'string'
    && typeof payload.sourceTravelerId === 'string'
    && (typeof payload.targetTravelerId === 'string' || payload.targetTravelerId === null)
    && typeof payload.sourceSeat === 'number'
    && typeof payload.targetSeat === 'number'
    && Array.isArray(payload.travelers);
}

export function toTravelerSeatChangeError(error: unknown): TravelerSeatChangeError {
  const message = (error as { message?: string } | null)?.message;

  if (message === 'invalid_travel_bus') {
    return new TravelerSeatChangeError('invalid-travel-bus', 'Camión inválido para realizar el cambio de asiento.', { cause: error });
  }

  if (message === 'invalid_target_seat') {
    return new TravelerSeatChangeError('invalid-target-seat', 'El asiento destino es inválido.', { cause: error });
  }

  if (message === 'traveler_not_found') {
    return new TravelerSeatChangeError('traveler-not-found', 'No se encontró al viajero para cambiar de asiento.', { cause: error });
  }

  if (message === 'same_seat_selected') {
    return new TravelerSeatChangeError('same-seat-selected', 'Debes seleccionar un asiento diferente al actual.', { cause: error });
  }

  if (message === 'seat_conflict') {
    return new TravelerSeatChangeError('seat-conflict', 'El asiento destino cambió durante la operación. Intenta de nuevo.', { cause: error });
  }

  return new TravelerSeatChangeError('unknown-error', 'No se pudo cambiar el asiento del viajero.', { cause: error });
}

export function groupTravelersByRepresentative(
  travelers: Traveler[],
  representativeId?: string,
): TravelerWithChildren[] {
  if (representativeId) {
    const representative = travelers.find(t => t.id === representativeId);
    if (!representative) {
      return [];
    }

    const children = travelers.filter(t => t.representativeId === representative.id);
    return [{ ...representative, children: children.length > 0 ? children : undefined }];
  }

  const grouped = Object.groupBy(travelers, t => t.representativeId ?? '');
  const companionIds = new Set(
    travelers.filter(t => t.representativeId).map(t => t.id),
  );

  const groupedTravelers: TravelerWithChildren[] = [];

  for (const traveler of travelers) {
    if (companionIds.has(traveler.id)) {
      continue;
    }

    const children = grouped[traveler.id];
    groupedTravelers.push({
      ...traveler,
      children: children && children.length > 0 ? children : undefined,
    });
  }

  return groupedTravelers;
}
