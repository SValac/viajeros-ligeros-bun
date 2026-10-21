<script setup lang="ts">
import type { QuotationPublicPrice } from '~/types/quotation';
import type { TravelAccommodation } from '~/types/travel';
import type { Traveler } from '~/types/traveler';

import { useTravelPayments } from '~/composables/payments/use-travel-payments';
import { roomTypeKey } from '~/composables/quotation/use-quotation-domain';
import { useTravelQuotation } from '~/composables/quotation/use-travel-quotation';
import { selectPayingTravelers } from '~/composables/travelers/use-traveler-domain';
import { useTravelRoute } from '~/composables/travels/use-travel-route';
import { useValidTab } from '~/composables/use-valid-tab';
import { useQueryLoadState } from '~/queries/load-state';
import { travelersByTravelQuery } from '~/queries/travelers';
import { formatCurrency } from '~/utils/currency';
import { pluralize } from '~/utils/pluralize';
import { formatTravelerName, getTravelerRole, TRAVELER_ROLE_ICONS } from '~/utils/traveler-labels';

definePageMeta({
  name: 'travel-rooms',
});

const toast = useToast();
const travelStore = useTravelsStore();
const travelerStore = useTravelerStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const paymentStore = usePaymentStore();
const quotationStore = useQuotationStore();

const { travelId, travel } = useTravelRoute();

const accommodations = computed(() => travel.value?.accommodations ?? []);
const travelersQuery = useQuery(() => travelersByTravelQuery(travelId.value));
const { data: travelerData, refetch: refetchTravelers } = travelersQuery;
const travelersLoad = useQueryLoadState(travelersQuery);
// The quoted hotels and room types group the rooms; the public prices say who goes where.
const { quotation, load: quotationLoad, refetch: refetchQuotation } = useTravelQuotation(travelId);
// Coordinators need a room too, so room counts and the add modal include them.
const occupantsOfTravel = computed(() => travelerData.value?.travelers ?? []);
const travelersOfTravel = computed(() => selectPayingTravelers(occupantsOfTravel.value));

// One room per hotel per traveler; occupantsByAccommodation and hasRoomInHotel read these.
const assignmentsByTraveler = computed(() =>
  Map.groupBy(travelerData.value?.roomAssignments ?? [], a => a.travelerId),
);
// Room id → its occupants, in the travelers' list order.
const occupantsByAccommodation = computed(() => {
  const map = new Map<string, Traveler[]>();
  for (const occupant of occupantsOfTravel.value) {
    for (const assignment of assignmentsByTraveler.value.get(occupant.id) ?? [])
      map.set(assignment.travelAccommodationId, [...(map.get(assignment.travelAccommodationId) ?? []), occupant]);
  }
  return map;
});

// Stats
const totalRooms = computed(() => accommodations.value.length);
const occupiedRooms = computed(() =>
  accommodations.value.filter(a => occupantsByAccommodation.value.has(a.id)).length,
);
// The quotation picks each hotel's room types; how many rooms of each the travel holds
// is set here (it changes until the trip leaves), and the hotel's cost follows it.
const quotationAccommodations = computed(() => {
  return quotation.value ? quotationStore.getAccommodationsByQuotation(quotation.value.id) : [];
});

type RoomTypeGroup = {
  key: string;
  roomTypeId?: string;
  maxOccupancy?: number;
  /** Rooms of this type the hotel's catalog has. */
  catalogRoomCount?: number;
  /** Rooms of types the quotation doesn't list (they don't count toward the hotel's cost). */
  unquoted: boolean;
  accommodations: TravelAccommodation[];
};

type HotelGroup = {
  providerId: string;
  providerName: string;
  nightCount?: number;
  totalCost?: number;
  roomTypes: RoomTypeGroup[];
};

const hotelGroups = computed((): HotelGroup[] => {
  const roomsByType = new Map<string, TravelAccommodation[]>();
  for (const acc of accommodations.value) {
    const key = roomTypeKey(acc.providerId, acc.hotelRoomTypeId);
    roomsByType.set(key, [...(roomsByType.get(key) ?? []), acc]);
  }

  const hotels = new Map<string, HotelGroup>();
  const hotelFor = (providerId: string): HotelGroup => {
    let hotel = hotels.get(providerId);
    if (!hotel) {
      hotel = {
        providerId,
        providerName: providerStore.getProviderName(providerId),
        roomTypes: [],
      };
      hotels.set(providerId, hotel);
    }
    return hotel;
  };

  for (const accommodation of quotationAccommodations.value) {
    const hotel = hotelFor(accommodation.providerId);
    hotel.nightCount = accommodation.nightCount;
    hotel.totalCost = accommodation.totalCost;
    const catalogTypes = hotelRoomStore.getRoomDataByProviderId(accommodation.providerId)?.roomTypes ?? [];
    for (const detail of accommodation.details) {
      const key = roomTypeKey(accommodation.providerId, detail.roomTypeId);
      hotel.roomTypes.push({
        key,
        roomTypeId: detail.roomTypeId,
        maxOccupancy: detail.maxOccupancy,
        catalogRoomCount: catalogTypes.find(t => t.id === detail.roomTypeId)?.roomCount,
        unquoted: false,
        accommodations: roomsByType.get(key) ?? [],
      });
      roomsByType.delete(key);
    }
  }

  // Whatever is left belongs to no quoted type; show it so those rooms aren't hidden.
  for (const rooms of roomsByType.values()) {
    const hotel = hotelFor(rooms[0]!.providerId);
    let unquoted = hotel.roomTypes.find(group => group.unquoted);
    if (!unquoted) {
      unquoted = { key: `${hotel.providerId}:unquoted`, unquoted: true, accommodations: [] };
      hotel.roomTypes.push(unquoted);
    }
    unquoted.accommodations.push(...rooms);
  }

  return Array.from(hotels.values());
});

// Companion id → representative's full name, for the group shown on each room card.
const representativeNames = computed(() => {
  const byId = new Map(travelersOfTravel.value.map(t => [t.id, t]));
  const names: Record<string, string> = {};
  for (const traveler of travelersOfTravel.value) {
    const representative = traveler.representativeId ? byId.get(traveler.representativeId) : undefined;
    if (representative)
      names[traveler.id] = formatTravelerName(representative);
  }
  return names;
});

// A traveler needs one room in every hotel of the travel.
function hasRoomInHotel(travelerId: string, providerId: string): boolean {
  return assignmentsByTraveler.value.get(travelerId)?.some(a => a.providerId === providerId) ?? false;
}

const pendingByHotel = computed(() =>
  hotelGroups.value.map(group => ({
    providerName: group.providerName,
    count: occupantsOfTravel.value.filter(t => !hasRoomInHotel(t.id, group.providerId)).length,
  })),
);

const unassignedTravelers = computed(() =>
  occupantsOfTravel.value.filter(t =>
    hotelGroups.value.some(group => !hasRoomInHotel(t.id, group.providerId)),
  ).length,
);

type RoomTypeInfo = { details?: string; beds?: string };

// Rooms of the same size can be different types (e.g. "doble estándar" vs "suite junior"),
// so each card and the add-traveler modal show the type's own description, not just beds.
const roomTypeInfoById = computed(() => {
  const map = new Map<string, RoomTypeInfo>();
  for (const data of hotelRoomStore.hotelRoomsData) {
    for (const rt of data.roomTypes) {
      map.set(rt.id, {
        details: rt.additionalDetails?.trim() || undefined,
        beds: formatBedConfiguration(rt.beds) || undefined,
      });
    }
  }
  return map;
});

function getRoomTypeInfo(hotelRoomTypeId?: string): RoomTypeInfo {
  return (hotelRoomTypeId && roomTypeInfoById.value.get(hotelRoomTypeId)) || {};
}

// Tabs — one per hotel
type HotelTab = {
  label: string;
  icon: string;
  value: string;
  slot: string;
  group: HotelGroup;
};

const tabs = computed((): HotelTab[] =>
  hotelGroups.value.map((group, index) => ({
    label: group.providerName,
    icon: 'i-lucide-hotel',
    value: `hotel-${group.providerId}-${index}`,
    slot: 'hotel',
    group,
  })),
);

const activeTabValue = useValidTab(tabs, available => available[0]?.value ?? '');

// Modal for adding traveler to a room
const addingToAccommodation = shallowRef<TravelAccommodation | null>(null);

// Shown in the modal header, to compare with each traveler's paid room below.
const addingRoomTypeLabel = computed(() => {
  const { details, beds } = getRoomTypeInfo(addingToAccommodation.value?.hotelRoomTypeId);
  return [details, beds].filter(Boolean).join(' · ') || undefined;
});
const isAddModalOpen = shallowRef(false);

// The public price each traveler paid says which room type (and hotels) they belong in.
const publicPricesById = computed(() => {
  const prices = quotation.value ? quotationStore.getPublicPricesByQuotation(quotation.value.id) : [];
  return new Map(prices.map(price => [price.id, price]));
});

/**
 * Keeps only the given hotel's lines of a public price description. Descriptions built from a
 * reference price hold one `"{hotel} - {details}"` line per hotel; those lines are filtered and
 * returned without the hotel prefix. A description with no hotel prefixes (single hotel, or typed
 * by hand) can't be split, so it's returned whole.
 */
function descriptionLinesForHotel(description: string, hotelName: string, hotelNames: string[]): string[] {
  const lines = description.split('\n').map(line => line.trim()).filter(Boolean);
  const isFromHotel = (line: string, name: string) => line.startsWith(`${name} - `);

  if (!lines.some(line => hotelNames.some(name => isFromHotel(line, name))))
    return lines;

  return lines
    .filter(line => isFromHotel(line, hotelName))
    .map(line => line.slice(`${hotelName} - `.length));
}

type AvailableTraveler = {
  traveler: Traveler;
  /** Companions only: their representative's full name, to tell which group they belong to. */
  representativeName?: string;
  price?: QuotationPublicPrice;
  descriptionLines: string[];
};

const availableTravelersForRoom = computed((): AvailableTraveler[] => {
  const accommodation = addingToAccommodation.value;
  if (!accommodation)
    return [];

  const hotelNames = hotelGroups.value.map(group => group.providerName);
  const hotelName = hotelGroups.value.find(group => group.providerId === accommodation.providerId)?.providerName ?? '';

  return occupantsOfTravel.value
    .filter(t => !hasRoomInHotel(t.id, accommodation.providerId))
    .map((traveler) => {
      const publicPriceId = paymentStore.getAccountConfig(traveler.id, travelId.value)?.publicPriceId;
      const price = publicPriceId ? publicPricesById.value.get(publicPriceId) : undefined;
      return {
        traveler,
        representativeName: representativeNames.value[traveler.id],
        price,
        descriptionLines: price ? descriptionLinesForHotel(price.description, hotelName, hotelNames) : [],
      };
    });
});

useTravelPayments(travelId);

function getTravelerIcon(traveler: Traveler): { name: string; class: string } {
  return TRAVELER_ROLE_ICONS[getTravelerRole(traveler)];
}

function openAddTravelerModal(accommodationId: string): void {
  const acc = accommodations.value.find(a => a.id === accommodationId);
  if (!acc)
    return;
  addingToAccommodation.value = acc;
  isAddModalOpen.value = true;
}

function closeAddTravelerModal(): void {
  isAddModalOpen.value = false;
}

async function assignTraveler(traveler: Traveler): Promise<void> {
  if (!addingToAccommodation.value)
    return;
  try {
    await travelerStore.assignTravelerToRoom(traveler.id, addingToAccommodation.value);
    toast.add({ title: 'Viajero asignado', color: 'success' });
    isAddModalOpen.value = false;
    addingToAccommodation.value = null;
  }
  catch {
    toast.add({ title: 'Error al asignar viajero', description: travelerStore.error ?? undefined, color: 'error' });
  }
}

async function removeTraveler(travelerId: string, providerId: string): Promise<void> {
  try {
    await travelerStore.removeTravelerFromRoom(travelerId, providerId);
    toast.add({ title: 'Viajero removido', color: 'success' });
  }
  catch {
    toast.add({ title: 'Error al remover viajero', color: 'error' });
  }
}

const addingRoomKey = shallowRef<string | null>(null);

async function addRoom(providerId: string, group: RoomTypeGroup): Promise<void> {
  if (!group.roomTypeId || !group.maxOccupancy)
    return;
  addingRoomKey.value = group.key;
  const ok = await travelStore.addTravelRooms(travelId.value, {
    providerId,
    hotelRoomTypeId: group.roomTypeId,
    maxOccupancy: group.maxOccupancy,
  });
  addingRoomKey.value = null;
  if (!ok) {
    toast.add({ title: 'Error al agregar la habitación', description: travelStore.error ?? undefined, color: 'error' });
    return;
  }
  await quotationStore.refreshAccommodationCosts(travelId.value);
  toast.add({ title: 'Habitación agregada', color: 'success' });
}

async function deleteRoom(roomId: string): Promise<void> {
  const ok = await travelStore.deleteTravelRoom(travelId.value, roomId);
  if (!ok) {
    toast.add({ title: 'No se pudo eliminar la habitación', description: travelStore.error ?? undefined, color: 'error' });
    return;
  }
  await quotationStore.refreshAccommodationCosts(travelId.value);
  toast.add({ title: 'Habitación eliminada', color: 'success' });
}

async function updateAccommodation(
  accommodation: TravelAccommodation,
  data: { roomNumber?: string | null; floor?: number | null },
): Promise<void> {
  const ok = await travelStore.updateTravelAccommodation(travelId.value, accommodation.id, data);
  if (ok) {
    toast.add({ title: 'Habitación actualizada', color: 'success' });
  }
  else {
    toast.add({ title: 'Error al actualizar habitación', color: 'error' });
  }
}
</script>

<template>
  <div>
    <!-- The header and navigation come from app/pages/travels/[id].vue -->
    <div class="space-y-6">
      <!-- Until the travelers load (or if they fail), the stats and rooms would show nobody;
           until the quotation loads, every room would look unquoted -->
      <LoadState
        v-bind="travelersLoad"
        label="los viajeros"
        @retry="refetchTravelers()"
      >
        <LoadState
          v-bind="quotationLoad"
          label="la cotización"
          @retry="refetchQuotation()"
        >
          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4">
            <StatCard
              label="Total de habitaciones"
              icon="i-lucide-bed-double"
              :value="String(totalRooms)"
            />
            <StatCard
              label="Con viajeros"
              icon="i-lucide-users"
              :value="String(occupiedRooms)"
              value-class="text-success"
            />
            <StatCard
              label="Viajeros sin habitación"
              icon="i-lucide-user"
              :value="String(unassignedTravelers)"
              :value-class="unassignedTravelers > 0 ? 'text-warning' : 'text-muted'"
            >
              <p v-if="pendingByHotel.length > 1" class="text-dimmed">
                <template v-for="(hotel, index) in pendingByHotel" :key="hotel.providerName">
                  <span v-if="index > 0"> · </span>{{ hotel.providerName }}: {{ hotel.count }}
                </template>
              </p>
            </StatCard>
          </div>

          <!-- Tabs per hotel -->
          <UCard v-if="hotelGroups.length === 0">
            <EmptyState
              section="lodging"
              :actions="[{ label: 'Ir al hospedaje de la cotización', icon: 'i-lucide-arrow-right', trailing: true, color: 'neutral', variant: 'outline', to: { name: 'quotation-accommodation', params: { id: travelId } } }]"
            />
          </UCard>

          <UTabs
            v-else
            v-model="activeTabValue"
            :items="tabs"
            variant="link"
          >
            <template #hotel="{ item }">
              <div class="space-y-6">
                <p v-if="item.group.totalCost !== undefined" class="text-sm text-muted">
                  Costo del hotel:
                  <span class="font-semibold text-highlighted">{{ formatCurrency(item.group.totalCost) }}</span>
                  · {{ pluralize(item.group.nightCount ?? 0, 'noche') }} · se calcula con las habitaciones de abajo
                </p>

                <TravelRoomTypeGroup
                  v-for="roomType in item.group.roomTypes"
                  :key="roomType.key"
                  :details="getRoomTypeInfo(roomType.roomTypeId).details"
                  :beds="getRoomTypeInfo(roomType.roomTypeId).beds"
                  :max-occupancy="roomType.maxOccupancy"
                  :room-count="roomType.accommodations.length"
                  :catalog-room-count="roomType.catalogRoomCount"
                  :unquoted="roomType.unquoted"
                  :adding="addingRoomKey === roomType.key"
                  @add-room="addRoom(item.group.providerId, roomType)"
                >
                  <TravelAccommodationCard
                    v-for="acc in roomType.accommodations"
                    :key="acc.id"
                    :accommodation="acc"
                    :occupants="occupantsByAccommodation.get(acc.id) ?? []"
                    :provider-name="item.group.providerName"
                    :room-type-details="roomType.unquoted ? getRoomTypeInfo(acc.hotelRoomTypeId).details : undefined"
                    :room-type-beds="roomType.unquoted ? getRoomTypeInfo(acc.hotelRoomTypeId).beds : undefined"
                    :representative-names="representativeNames"
                    @add-traveler="openAddTravelerModal"
                    @remove-traveler="travelerId => removeTraveler(travelerId, acc.providerId)"
                    @update="updateAccommodation"
                    @delete="deleteRoom"
                  />
                </TravelRoomTypeGroup>
              </div>
            </template>
          </UTabs>
        </LoadState>
      </LoadState>
    </div>

    <!-- Add Traveler Modal -->
    <UModal
      v-model:open="isAddModalOpen"
      title="Agregar viajero a la habitación"
      :description="addingRoomTypeLabel"
    >
      <template #body>
        <div class="space-y-2">
          <p v-if="availableTravelersForRoom.length === 0" class="text-sm text-muted text-center py-4">
            Todos los viajeros ya tienen habitación en este hotel.
          </p>
          <button
            v-for="{ traveler, representativeName, price, descriptionLines } in availableTravelersForRoom"
            :key="traveler.id"
            class="w-full flex items-start gap-3 rounded-lg border border-default px-3 py-2 hover:bg-elevated transition text-left"
            @click="assignTraveler(traveler)"
          >
            <UIcon
              :name="getTravelerIcon(traveler).name"
              class="size-4 shrink-0 mt-0.5"
              :class="getTravelerIcon(traveler).class"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">
                {{ formatTravelerName(traveler) }}
                <span
                  v-if="representativeName"
                  class="inline-flex items-center gap-1 font-normal text-muted"
                >
                  · <UIcon name="i-lucide-user-star" class="size-3.5 text-primary" />
                  {{ representativeName }}
                </span>
              </p>
              <p v-if="traveler.kind === 'coordinator'" class="text-xs text-info">
                Coordinador
              </p>
              <template v-else-if="price">
                <p class="text-xs text-muted">
                  {{ price.priceType }}
                </p>
                <p
                  v-for="(line, index) in descriptionLines"
                  :key="index"
                  class="text-xs text-dimmed truncate"
                >
                  {{ line }}
                </p>
              </template>
              <p v-else class="text-xs text-warning">
                Sin precio configurado
              </p>
            </div>
          </button>
        </div>
      </template>
      <template #footer>
        <UButton
          label="Cancelar"
          variant="ghost"
          color="neutral"
          @click="closeAddTravelerModal"
        />
      </template>
    </UModal>
  </div>
</template>
