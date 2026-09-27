<script setup lang="ts">
import type { QuotationPublicPrice } from '~/types/quotation';
import type { TravelAccommodation } from '~/types/travel';
import type { Traveler } from '~/types/traveler';

definePageMeta({
  name: 'travel-habitaciones',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const travelStore = useTravelsStore();
const travelerStore = useTravelerStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const paymentStore = usePaymentStore();
const cotizacionStore = useCotizacionStore();

const travelId = computed(() => route.params.id as string);
const travel = computed(() => travelStore.getTravelById(travelId.value));

const accommodations = computed(() => travelStore.getAccommodationsByTravel(travelId.value));
const travelersOfTravel = computed(() => travelerStore.getTravelersByTravel(travelId.value));

// Stats
const totalRooms = computed(() => accommodations.value.length);
const occupiedRooms = computed(() =>
  accommodations.value.filter(a => travelerStore.getTravelersByAccommodation(a.id).length > 0).length,
);
// Grouped by provider
type AccommodationGroup = {
  providerId: string;
  providerName: string;
  accommodations: TravelAccommodation[];
};

const groupedAccommodations = computed((): AccommodationGroup[] => {
  const map = new Map<string, AccommodationGroup>();
  for (const acc of accommodations.value) {
    if (!map.has(acc.providerId)) {
      const provider = providerStore.getProviderById(acc.providerId);
      map.set(acc.providerId, {
        providerId: acc.providerId,
        providerName: provider?.name ?? 'Hotel desconocido',
        accommodations: [],
      });
    }
    map.get(acc.providerId)!.accommodations.push(acc);
  }
  return Array.from(map.values());
});

// A traveler needs one room in every hotel of the travel.
function hasRoomInHotel(travelerId: string, providerId: string): boolean {
  return travelerStore.getRoomAssignmentsByTraveler(travelerId).some(a => a.providerId === providerId);
}

const pendingByHotel = computed(() =>
  groupedAccommodations.value.map(group => ({
    providerName: group.providerName,
    count: travelersOfTravel.value.filter(t => !hasRoomInHotel(t.id, group.providerId)).length,
  })),
);

const unassignedTravelers = computed(() =>
  travelersOfTravel.value.filter(t =>
    groupedAccommodations.value.some(group => !hasRoomInHotel(t.id, group.providerId)),
  ).length,
);

function getRoomTypeName(hotelRoomTypeId?: string): string | undefined {
  if (!hotelRoomTypeId)
    return undefined;
  for (const data of hotelRoomStore.hotelRoomsData) {
    const rt = data.roomTypes.find(r => r.id === hotelRoomTypeId);
    if (rt) {
      const bedsDesc = rt.beds.map(b => `${b.count} ${b.size}`).join(', ');
      return bedsDesc || undefined;
    }
  }
  return undefined;
}

type OccupancyGroup = {
  maxOccupancy: number;
  accommodations: TravelAccommodation[];
};

function groupByOccupancy(accs: TravelAccommodation[]): OccupancyGroup[] {
  const map = new Map<number, TravelAccommodation[]>();
  for (const acc of accs) {
    if (!map.has(acc.maxOccupancy))
      map.set(acc.maxOccupancy, []);
    map.get(acc.maxOccupancy)!.push(acc);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([maxOccupancy, accommodations]) => ({ maxOccupancy, accommodations }));
}

// Tabs — one per hotel
type HotelTab = {
  label: string;
  icon: string;
  value: string;
  slot: string;
  group: AccommodationGroup;
};

const activeTabValue = shallowRef<string | number>('');

const tabs = computed((): HotelTab[] =>
  groupedAccommodations.value.map((group, index) => ({
    label: group.providerName,
    icon: 'i-lucide-hotel',
    value: `hotel-${group.providerId}-${index}`,
    slot: 'hotel',
    group,
  })),
);

watch(tabs, (availableTabs) => {
  const hasCurrentTab = availableTabs.some(tab => tab.value === activeTabValue.value);
  if (!hasCurrentTab) {
    activeTabValue.value = availableTabs[0]?.value ?? '';
  }
}, { immediate: true });

// Modal for adding traveler to a room
const addingToAccommodation = shallowRef<TravelAccommodation | null>(null);
const isAddModalOpen = shallowRef(false);

// The public price each traveler paid says which room type (and hotels) they belong in.
const preciosPublicosById = computed(() => {
  const cotizacion = cotizacionStore.getCotizacionByTravel(travelId.value);
  const precios = cotizacion ? cotizacionStore.getPreciosPublicosByQuotation(cotizacion.id) : [];
  return new Map(precios.map(precio => [precio.id, precio]));
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
  precio?: QuotationPublicPrice;
  descriptionLines: string[];
};

const availableTravelersForRoom = computed((): AvailableTraveler[] => {
  const accommodation = addingToAccommodation.value;
  if (!accommodation)
    return [];

  const hotelNames = groupedAccommodations.value.map(group => group.providerName);
  const hotelName = groupedAccommodations.value.find(group => group.providerId === accommodation.providerId)?.providerName ?? '';
  const travelersById = new Map(travelersOfTravel.value.map(t => [t.id, t]));

  return travelersOfTravel.value
    .filter(t => !hasRoomInHotel(t.id, accommodation.providerId))
    .map((traveler) => {
      const publicPriceId = paymentStore.getAccountConfig(traveler.id, travelId.value)?.publicPriceId;
      const precio = publicPriceId ? preciosPublicosById.value.get(publicPriceId) : undefined;
      const representative = traveler.representativeId ? travelersById.get(traveler.representativeId) : undefined;
      return {
        traveler,
        representativeName: representative ? `${representative.firstName} ${representative.lastName}` : undefined,
        precio,
        descriptionLines: precio ? descriptionLinesForHotel(precio.description, hotelName, hotelNames) : [],
      };
    });
});

watch(travelId, async (id) => {
  if (!id)
    return;
  await Promise.all([
    paymentStore.fetchByTravel(id),
    cotizacionStore.fetchByTravel(id),
  ]);
}, { immediate: true });

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

function goToTravelDetail(): void {
  router.push({ name: 'travel-detail', params: { id: travelId.value } });
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
  <div class="h-full overflow-auto">
    <div class="mx-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <UButton
          icon="i-lucide-arrow-left"
          label="Volver"
          variant="ghost"
          color="neutral"
          @click="goToTravelDetail"
        />
        <div>
          <h1 class="text-xl font-bold">
            Habitaciones
          </h1>
          <p v-if="travel?.label" class="text-sm text-muted">
            {{ travel.label }}
          </p>
        </div>
        <div />
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">
              {{ totalRooms }}
            </p>
            <p class="text-sm text-muted">
              Total habitaciones
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-success">
              {{ occupiedRooms }}
            </p>
            <p class="text-sm text-muted">
              Con viajeros
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold" :class="unassignedTravelers > 0 ? 'text-warning' : 'text-muted'">
              {{ unassignedTravelers }}
            </p>
            <p class="text-sm text-muted">
              Viajeros sin habitación
            </p>
            <p
              v-if="pendingByHotel.length > 1"
              class="text-xs text-dimmed mt-1"
            >
              <template v-for="(hotel, index) in pendingByHotel" :key="hotel.providerName">
                <span v-if="index > 0"> · </span>{{ hotel.providerName }}: {{ hotel.count }}
              </template>
            </p>
          </div>
        </UCard>
      </div>

      <!-- Tabs por hotel -->
      <UCard v-if="accommodations.length === 0">
        <div class="text-center py-8 text-muted">
          <UIcon name="i-lucide-bed-double" class="size-10 mx-auto mb-2 opacity-40" />
          <p>No hay habitaciones sincronizadas.</p>
          <p class="text-sm mt-1">
            Agrega hospedaje en la cotización para sincronizar habitaciones.
          </p>
        </div>
      </UCard>

      <UTabs
        v-else
        v-model="activeTabValue"
        :items="tabs"
        variant="link"
      >
        <template #hotel="{ item }">
          <div class="space-y-6">
            <div
              v-for="og in groupByOccupancy(item.group.accommodations)"
              :key="og.maxOccupancy"
              class="space-y-3"
            >
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-users" class="size-4 text-muted" />
                <h3 class="font-semibold text-sm">
                  Capacidad - {{ og.maxOccupancy }} persona{{ og.maxOccupancy === 1 ? '' : 's' }}
                </h3>
                <UBadge
                  :label="`${og.accommodations.length} hab.`"
                  size="xs"
                  variant="subtle"
                  color="neutral"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <TravelAccommodationCard
                  v-for="acc in og.accommodations"
                  :key="acc.id"
                  :accommodation="acc"
                  :occupants="travelerStore.getTravelersByAccommodation(acc.id)"
                  :provider-name="item.group.providerName"
                  :room-type-name="getRoomTypeName(acc.hotelRoomTypeId)"
                  @add-traveler="openAddTravelerModal"
                  @remove-traveler="travelerId => removeTraveler(travelerId, acc.providerId)"
                  @update="updateAccommodation"
                />
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>

    <!-- Add Traveler Modal -->
    <UModal v-model:open="isAddModalOpen" title="Agregar viajero a la habitación">
      <template #body>
        <div class="space-y-2">
          <p v-if="availableTravelersForRoom.length === 0" class="text-sm text-muted text-center py-4">
            Todos los viajeros ya tienen habitación en este hotel.
          </p>
          <button
            v-for="{ traveler, representativeName, precio, descriptionLines } in availableTravelersForRoom"
            :key="traveler.id"
            class="w-full flex items-start gap-3 rounded-lg border border-default px-3 py-2 hover:bg-elevated transition text-left"
            @click="assignTraveler(traveler)"
          >
            <UIcon
              :name="traveler.isRepresentative ? 'i-lucide-user-star' : 'i-lucide-user'"
              class="size-4 shrink-0 mt-0.5"
              :class="traveler.isRepresentative ? 'text-primary' : 'text-muted'"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">
                {{ traveler.firstName }} {{ traveler.lastName }}
                <span
                  v-if="representativeName"
                  class="font-normal text-muted"
                >
                  · Grupo de {{ representativeName }}
                </span>
              </p>
              <template v-if="precio">
                <p class="text-xs text-muted">
                  {{ precio.priceType }}
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
