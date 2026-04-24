import type { BedConfiguration, BedSize, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

export function getBedSizeLabel(size: BedSize, count: number): string {
  const labels: Record<BedSize, { singular: string; plural: string }> = {
    single: { singular: 'single', plural: 'individuales' },
    double: { singular: 'double', plural: 'matrimoniales' },
    queen: { singular: 'queen', plural: 'queen' },
    king: { singular: 'king', plural: 'king' },
  };

  const label = count === 1 ? labels[size].singular : labels[size].plural;
  return count === 1 ? `1 cama ${label}` : `${count} camas ${label}`;
}

export function formatBedConfiguration(beds: BedConfiguration[]): string {
  if (beds.length === 0) {
    return '';
  }

  return beds
    .map(config => getBedSizeLabel(config.size, config.count))
    .join(' + ');
}

export function areRoomTypesIdentical(a: HotelRoomTypeFormData, b: HotelRoomType): boolean {
  if (a.maxOccupancy !== b.maxOccupancy) {
    return false;
  }

  const normalizeBeds = (beds: BedConfiguration[]) => {
    return [...beds].sort((x, y) => {
      if (x.size !== y.size) {
        return x.size.localeCompare(y.size);
      }
      return x.count - y.count;
    });
  };

  const bedsA = normalizeBeds(a.beds);
  const bedsB = normalizeBeds(b.beds);

  if (bedsA.length !== bedsB.length) {
    return false;
  }

  return bedsA.every((bedA, index) => {
    const bedB = bedsB[index];
    return bedA.size === bedB!.size && bedA.count === bedB!.count;
  });
}

export function calculateTotalRoomsUsed(roomTypes: HotelRoomType[]): number {
  return roomTypes.reduce((total, roomType) => total + roomType.roomCount, 0);
}

export function calculateCostPerPerson(pricePerNight: number, maxOccupancy: number): number {
  return pricePerNight / maxOccupancy;
}
