import type { BedConfiguration, BedSize, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

const BED_SIZE_LABELS: Record<BedSize, { singular: string; plural: string }> = {
  single: { singular: 'single', plural: 'individuales' },
  double: { singular: 'double', plural: 'matrimoniales' },
  queen: { singular: 'queen', plural: 'queen' },
  king: { singular: 'king', plural: 'king' },
};

const BED_SIZE_ALIASES: Record<string, BedSize> = {
  single: 'single',
  individual: 'single',
  double: 'double',
  matrimonial: 'double',
  queen: 'queen',
  king: 'king',
};

type BedConfigurationInput = {
  size?: unknown;
  type?: unknown;
  count?: unknown;
  quantity?: unknown;
};

function parseBedCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.floor(parsed);
}

function normalizeBedSize(value: unknown): BedSize | null {
  if (typeof value !== 'string') {
    return null;
  }
  return BED_SIZE_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function normalizeBedConfigurations(beds: unknown): BedConfiguration[] {
  if (!Array.isArray(beds)) {
    return [];
  }

  return beds.reduce<BedConfiguration[]>((acc, current) => {
    if (!current || typeof current !== 'object') {
      return acc;
    }

    const input = current as BedConfigurationInput;
    const size = normalizeBedSize(input.size ?? input.type);
    if (!size) {
      return acc;
    }

    acc.push({
      size,
      count: parseBedCount(input.count ?? input.quantity),
    });
    return acc;
  }, []);
}

export function getBedSizeLabel(size: BedSize | string, count: number): string {
  const normalizedSize = normalizeBedSize(size);
  const normalizedCount = parseBedCount(count);
  const labels = normalizedSize ? BED_SIZE_LABELS[normalizedSize] : { singular: 'estándar', plural: 'estándar' };
  const label = normalizedCount === 1 ? labels.singular : labels.plural;
  return normalizedCount === 1 ? `1 cama ${label}` : `${normalizedCount} camas ${label}`;
}

export function formatBedConfiguration(beds: unknown): string {
  const normalizedBeds = normalizeBedConfigurations(beds);
  if (normalizedBeds.length === 0) {
    return '';
  }

  return normalizedBeds
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

  const bedsA = normalizeBeds(normalizeBedConfigurations(a.beds));
  const bedsB = normalizeBeds(normalizeBedConfigurations(b.beds));

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
