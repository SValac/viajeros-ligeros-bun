import type { TravelBus } from '~/types/travel';

/**
 * Label of a travel's bus in selects and lists: "Agencia — Marca Modelo".
 * @param bus - The travel's bus
 * @param agencyName - Name of the bus agency (provider), when it's known
 * @returns The label; "Camión" stands in for a bus without brand and model
 */
export function formatTravelBusLabel(bus: Pick<TravelBus, 'brand' | 'model'>, agencyName?: string): string {
  const busName = [bus.brand, bus.model].filter(Boolean).join(' ').trim() || 'Camión';
  return agencyName ? `${agencyName} — ${busName}` : busName;
}
