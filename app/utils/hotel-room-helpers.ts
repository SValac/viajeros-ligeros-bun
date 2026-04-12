import type { BedConfiguration, BedSize, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

export function getBedSizeLabel(size: BedSize, cantidad: number): string {
  const labels: Record<BedSize, { singular: string; plural: string }> = {
    individual: { singular: 'individual', plural: 'individuales' },
    matrimonial: { singular: 'matrimonial', plural: 'matrimoniales' },
    queen: { singular: 'queen', plural: 'queen' },
    king: { singular: 'king', plural: 'king' },
  };

  const label = cantidad === 1 ? labels[size].singular : labels[size].plural;
  return cantidad === 1 ? `1 cama ${label}` : `${cantidad} camas ${label}`;
}

export function formatBedConfiguration(camas: BedConfiguration[]): string {
  if (camas.length === 0) {
    return '';
  }

  return camas
    .map(config => getBedSizeLabel(config.tamaño, config.cantidad))
    .join(' + ');
}

export function areRoomTypesIdentical(a: HotelRoomTypeFormData, b: HotelRoomType): boolean {
  if (a.ocupacionMaxima !== b.ocupacionMaxima) {
    return false;
  }

  const normalizeCamas = (camas: BedConfiguration[]) => {
    return [...camas].sort((x, y) => {
      if (x.tamaño !== y.tamaño) {
        return x.tamaño.localeCompare(y.tamaño);
      }
      return x.cantidad - y.cantidad;
    });
  };

  const camasA = normalizeCamas(a.camas);
  const camasB = normalizeCamas(b.camas);

  if (camasA.length !== camasB.length) {
    return false;
  }

  return camasA.every((camaA, index) => {
    const camaB = camasB[index];
    return camaA.tamaño === camaB!.tamaño && camaA.cantidad === camaB!.cantidad;
  });
}

export function calculateTotalRoomsUsed(roomTypes: HotelRoomType[]): number {
  return roomTypes.reduce((total, roomType) => total + roomType.cantidadHabitaciones, 0);
}

export function calculateCostPerPerson(precioPorNoche: number, ocupacionMaxima: number): number {
  return precioPorNoche / ocupacionMaxima;
}
