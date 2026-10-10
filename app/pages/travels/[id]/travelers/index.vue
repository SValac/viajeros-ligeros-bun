<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { ExpandedStateList } from '@tanstack/vue-table';

import { h } from 'vue';

import type { Traveler, TravelerFormData, TravelerSeatChangeErrorCode, TravelerWithChildren } from '~/types/traveler';

import BusSeatMap from '~/components/bus-seat-map.vue';

definePageMeta({
  name: 'travel-travelers',
});

const route = useRoute();
const router = useRouter();
const travelerStore = useTravelerStore();
const travelStore = useTravelsStore();
const providerStore = useProviderStore();
const cotizacionStore = useCotizacionStore();
const toast = useToast();

type TravelerActionItem = {
  label: string;
  icon?: string;
  color?: DropdownMenuItem['color'];
  onSelect: () => void;
};

type OccupiedSeat = {
  travelerId: string;
  seatNumber: number;
  passengerName: string;
  boardingPoint?: string;
  isRepresentative: boolean;
  isCoordinator: boolean;
  representativeName?: string;
  menuItems: TravelerActionItem[][];
};

type DatabaseError = {
  code?: string;
  constraint?: string;
};

type SeatChangeContext = {
  travelerId: string;
  travelerName: string;
  travelBusId: string;
  sourceSeat: number;
};

type SeatSelectionPayload = {
  busId: string;
  seatNumber: number;
  status: 'available' | 'occupied';
  travelerId?: string;
  passengerName?: string;
};

const travelId = computed(() => route.params.id as string);
const travel = computed(() => travelStore.getTravelById(travelId.value));

// Estado local
const isFormModalOpen = shallowRef(false);
const editingTraveler = shallowRef<Traveler | null>(null);
const createTravelerInitialValues = shallowRef<Partial<TravelerFormData> | null>(null);
const expanded = ref<ExpandedStateList>({});
const activeTabValue = shallowRef<string | number>('travelers');
const seatChangeContext = shallowRef<SeatChangeContext | null>(null);
const selectedDestinationSeat = shallowRef<number | null>(null);
const seatChangeLoading = shallowRef(false);
const seatingCoordinator = shallowRef<Traveler | null>(null);

// Datos derivados de stores
const travelers = computed(() => travelerStore.filteredGroupedTravelers);
const travelersOfTravel = computed(() => travelerStore.getTravelersByTravel(travelId.value));
const totalTravelers = computed(() => travelersOfTravel.value.length);
const totalRepresentantes = computed(() => travelersOfTravel.value.filter(t => t.isRepresentative).length);
const totalAcompañantes = computed(() => travelersOfTravel.value.filter(t => !t.isRepresentative).length);
const isSeatChangeModeActive = computed(() => seatChangeContext.value !== null);

// Coordinators travel in their own travelers rows: no payments or groups, but a seat (when
// the quotation counts them as passengers) and rooms like anyone else.
const occupantsOfTravel = computed(() => travelerStore.getOccupantsByTravel(travelId.value));
const coordinatorsOfTravel = computed(() => travelerStore.getCoordinatorsByTravel(travelId.value));
const coordinatorsTakeSeats = computed(() =>
  cotizacionStore.getCotizacionByTravel(travelId.value)?.coordinatorsTakeSeats ?? false,
);
const coordinatorRows = computed(() =>
  coordinatorsOfTravel.value.map(coordinator => ({
    coordinator,
    seatLabel: coordinator.travelBusId && coordinator.seat
      ? `${getBusLabel(coordinator.travelBusId)} — asiento ${coordinator.seat}`
      : undefined,
    roomLabels: getAccommodationLabels(coordinator.id),
  })),
);
const isCoordinatorSeatModalOpen = computed({
  get: () => seatingCoordinator.value !== null,
  set: (open) => {
    if (!open)
      seatingCoordinator.value = null;
  },
});

const allBuses = computed(() => travel.value?.buses ?? []);
const allAccommodations = computed(() => travelStore.getAccommodationsByTravel(travelId.value));
const tabs = computed(() => [
  {
    label: 'Todos los viajeros',
    icon: 'i-lucide-users',
    value: 'travelers',
    slot: 'travelers',
    bus: null,
  },
  ...allBuses.value.map((bus, index) => ({
    label: getBusLabel(bus.id),
    icon: 'i-lucide-bus',
    value: `bus-${bus.id}-${index}`,
    slot: 'bus',
    bus,
  })),
]);

const seatChangeAlertDescription = computed(() => {
  if (!seatChangeContext.value) {
    return '';
  }

  return `Selecciona el asiento destino para ${seatChangeContext.value.travelerName}.`
    + ` Puedes elegir un asiento libre para mover o uno ocupado para intercambiar.`;
});

// Setear y mantener el filtro de viaje bloqueado al travelId de la ruta
watch(travelId, async (id) => {
  travelerStore.setFilters({ travelId: id });
  clearSeatChangeState();
  await Promise.all([
    travelerStore.fetchByTravel(id),
    cotizacionStore.fetchByTravel(id),
  ]);
}, { immediate: true });

watch(tabs, (availableTabs) => {
  const hasCurrentTab = availableTabs.some(tab => tab.value === activeTabValue.value);
  if (!hasCurrentTab) {
    activeTabValue.value = 'travelers';
  }
}, { immediate: true });

watchEffect(() => {
  const newExpanded: ExpandedStateList = {};
  for (const row of travelers.value) {
    if (row.children && row.children.length > 0) {
      newExpanded[row.id] = true;
    }
  }
  expanded.value = newExpanded;
});

function getOccupiedSeatsByBus(busId: string): OccupiedSeat[] {
  const travelersByBus = travelerStore.getOccupantsByBus(busId);
  const representativeById = new Map(
    travelersByBus
      .filter(t => t.isRepresentative)
      .map(t => [t.id, `${t.firstName} ${t.lastName}`]),
  );

  return travelersByBus
    .map((t) => {
      const seatNumber = Number(t.seat);
      return {
        travelerId: t.id,
        seatNumber,
        passengerName: `${t.firstName} ${t.lastName}`,
        boardingPoint: t.boardingPoint,
        isRepresentative: t.isRepresentative,
        isCoordinator: t.kind === 'coordinator',
        representativeName: t.representativeId
          ? representativeById.get(t.representativeId)
          : undefined,
        menuItems: t.kind === 'coordinator' ? getCoordinatorSeatActions(t) : getRowActions(t),
      };
    })
    .filter(seat => Number.isFinite(seat.seatNumber) && seat.seatNumber > 0)
    .sort((a, b) => a.seatNumber - b.seatNumber);
}

function getLastRowSeats(bus: { seatCount: number; lastRowSeats?: number | null }) {
  return bus.lastRowSeats ?? (bus.seatCount % 4 || 4);
}

const representantes = computed(() =>
  travelerStore.filteredTravelers.filter(t => t.isRepresentative),
);

const filters = computed({
  get: () => travelerStore.filters,
  set: val => travelerStore.setFilters({ ...val, travelId: travelId.value }),
});

// A traveler holds one room per hotel, so on a multi-hotel travel they have several.
function getAccommodationLabels(travelerId: string): string[] {
  return travelerStore.getRoomAssignmentsByTraveler(travelerId).flatMap((assignment) => {
    const acc = allAccommodations.value.find(a => a.id === assignment.travelAccommodationId);
    if (!acc)
      return [];
    const provider = providerStore.getProviderById(acc.providerId)?.name ?? 'Hotel';
    return [acc.roomNumber ? `${provider} — Hab. ${acc.roomNumber}` : provider];
  });
}

function getBusLabel(travelBusId: string): string {
  const bus = allBuses.value.find(b => b.id === travelBusId);
  if (!bus)
    return travelBusId;
  const agencia = providerStore.getProviderById(bus.providerId)?.name;
  const busName = [bus.brand, bus.model].filter(Boolean).join(' ').trim() || 'Camión';
  return agencia ? `${agencia} — ${busName}` : busName;
}

function openCreateModal() {
  editingTraveler.value = null;
  createTravelerInitialValues.value = null;
  isFormModalOpen.value = true;
}

function openCreateModalWithInitialValues(initialValues: Partial<TravelerFormData>) {
  editingTraveler.value = null;
  createTravelerInitialValues.value = initialValues;
  isFormModalOpen.value = true;
}

function openEditModal(traveler: Traveler) {
  editingTraveler.value = traveler;
  createTravelerInitialValues.value = null;
  isFormModalOpen.value = true;
}

function closeModal() {
  isFormModalOpen.value = false;
  editingTraveler.value = null;
  createTravelerInitialValues.value = null;
}

function clearSeatChangeState() {
  seatChangeContext.value = null;
  selectedDestinationSeat.value = null;
  seatChangeLoading.value = false;
}

function cancelSeatChange(showToast = true) {
  if (!isSeatChangeModeActive.value) {
    return;
  }

  toast.clear();
  clearSeatChangeState();

  if (showToast) {
    toast.add({
      title: 'Cambio de asiento cancelado',
      description: 'No se realizó ninguna modificación de asientos.',
      color: 'neutral',
    });
  }
}

function startSeatChange(traveler: Traveler) {
  if (!traveler.travelBusId) {
    toast.clear();
    toast.add({
      title: 'Cambio no disponible',
      description: 'El viajero no tiene un camión asignado.',
      color: 'warning',
    });
    return;
  }

  if (!traveler.seat || traveler.seat <= 0) {
    toast.clear();
    toast.add({
      title: 'Cambio no disponible',
      description: 'El viajero no tiene un asiento válido asignado.',
      color: 'warning',
    });
    return;
  }

  const busTab = tabs.value.find(tab => tab.bus?.id === traveler.travelBusId);
  if (busTab) {
    activeTabValue.value = busTab.value;
  }

  toast.clear();
  seatChangeContext.value = {
    travelerId: traveler.id,
    travelerName: `${traveler.firstName} ${traveler.lastName}`,
    travelBusId: traveler.travelBusId,
    sourceSeat: traveler.seat,
  };
  selectedDestinationSeat.value = null;
  seatChangeLoading.value = false;

  toast.add({
    title: 'Modo cambiar asiento',
    description: `Selecciona el asiento destino para ${traveler.firstName} ${traveler.lastName}.`,
    color: 'info',
  });
}

function handleEmptySeatSelected(payload: { busId: string; seatNumber: number }) {
  openCreateModalWithInitialValues({
    travelId: travelId.value,
    travelBusId: payload.busId,
    seat: payload.seatNumber,
  });
}

function getSeatChangeErrorMessage(code?: TravelerSeatChangeErrorCode, fallbackMessage?: string): string {
  if (code === 'invalid-target-seat') {
    return 'El asiento destino no es válido.';
  }

  if (code === 'invalid-travel-bus') {
    return 'El camión seleccionado no es válido para este cambio.';
  }

  if (code === 'traveler-not-found') {
    return 'No se encontró al viajero. Recarga la vista e intenta nuevamente.';
  }

  if (code === 'same-seat-selected') {
    return 'Selecciona un asiento diferente al actual.';
  }

  if (code === 'seat-conflict') {
    return 'Otro cambio ocupó ese asiento. Intenta de nuevo con la información actualizada.';
  }

  return fallbackMessage ?? 'No se pudo completar el cambio de asiento.';
}

async function handleSeatDestinationSelected(payload: SeatSelectionPayload) {
  if (!seatChangeContext.value || seatChangeLoading.value) {
    return;
  }

  if (payload.busId !== seatChangeContext.value.travelBusId) {
    toast.clear();
    toast.add({
      title: 'Camión inválido',
      description: 'Selecciona un asiento del mismo camión.',
      color: 'warning',
    });
    return;
  }

  if (payload.seatNumber === seatChangeContext.value.sourceSeat) {
    toast.clear();
    toast.add({
      title: 'Asiento origen',
      description: 'Selecciona un asiento diferente al asiento origen.',
      color: 'warning',
    });
    return;
  }

  selectedDestinationSeat.value = payload.seatNumber;
  seatChangeLoading.value = true;

  const currentContext = { ...seatChangeContext.value };

  try {
    const result = await travelerStore.changeTravelerSeat({
      travelerId: currentContext.travelerId,
      travelBusId: currentContext.travelBusId,
      targetSeat: payload.seatNumber,
    });

    toast.clear();
    toast.add({
      title: result.operation === 'swapped' ? 'Asientos intercambiados' : 'Asiento actualizado',
      description: result.operation === 'swapped' && payload.passengerName
        ? `${currentContext.travelerName} intercambió asiento con ${payload.passengerName}.`
        : `${currentContext.travelerName} ahora ocupa el asiento ${payload.seatNumber}.`,
      color: 'success',
    });
    clearSeatChangeState();
  }
  catch (error) {
    toast.clear();
    toast.add({
      title: 'Error al cambiar asiento',
      description: getSeatChangeErrorMessage(
        (error as { code?: TravelerSeatChangeErrorCode } | null)?.code,
        (error as { message?: string } | null)?.message,
      ),
      color: 'error',
    });
  }
  finally {
    seatChangeLoading.value = false;
  }
}

function findTravelerBySeat(data: TravelerFormData, excludeTravelerId?: string): Traveler | undefined {
  return occupantsOfTravel.value.find((traveler) => {
    return traveler.id !== excludeTravelerId
      && traveler.travelBusId === data.travelBusId
      && traveler.seat === data.seat;
  });
}

function isSeatAlreadyTakenError(error: unknown): boolean {
  const dbError = error as DatabaseError | null;
  return dbError?.code === '23505'
    && dbError?.constraint === 'travelers_unique_travel_bus_seat';
}

async function handleFormSubmit(data: TravelerFormData) {
  const takenSeatTraveler = findTravelerBySeat(data, editingTraveler.value?.id);
  if (takenSeatTraveler) {
    toast.add({
      title: 'Asiento ocupado',
      description: `El asiento ${data.seat} ya está asignado a ${takenSeatTraveler.firstName} ${takenSeatTraveler.lastName}`,
      color: 'warning',
    });
    return;
  }

  try {
    if (editingTraveler.value) {
      await travelerStore.updateTraveler(editingTraveler.value.id, data);
      toast.add({
        title: 'Viajero actualizado',
        description: `${data.firstName} ${data.lastName} se actualizó correctamente`,
        color: 'primary',
      });
      closeModal();
    }
    else {
      await travelerStore.addTraveler(data);
      toast.add({
        title: 'Viajero creado',
        description: `${data.firstName} ${data.lastName} se registró correctamente`,
        color: 'primary',
      });
      closeModal();
    }
  }
  catch (error) {
    if (isSeatAlreadyTakenError(error)) {
      toast.add({
        title: 'Asiento ocupado',
        description: `El asiento ${data.seat} ya está asignado a otro viajero`,
        color: 'warning',
      });
      return;
    }

    toast.add({
      title: 'Error',
      description: 'Ocurrió un error al guardar el viajero',
      color: 'error',
    });
  }
}

async function handleDelete(traveler: Traveler) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar a ${traveler.firstName} ${traveler.lastName}?`)) {
    await travelerStore.deleteTraveler(traveler.id);
    if (seatChangeContext.value?.travelerId === traveler.id) {
      clearSeatChangeState();
    }
    toast.add({
      title: 'Viajero eliminado',
      description: `${traveler.firstName} ${traveler.lastName} se eliminó correctamente`,
      color: 'warning',
    });
  }
}

// Buses for the coordinator seat modal; the bus the quotation put them in comes first.
const coordinatorSeatBuses = computed(() => {
  const coordinator = seatingCoordinator.value;
  return allBuses.value.map(bus => ({
    value: bus.id,
    label: getBusLabel(bus.id),
    seatCount: bus.seatCount,
    takenSeats: travelerStore.getOccupantsByBus(bus.id)
      .filter(t => t.id !== coordinator?.id && t.seat !== null)
      .map(t => t.seat as number),
  }));
});

const coordinatorInitialBusId = computed(() => {
  const coordinatorId = seatingCoordinator.value?.coordinatorId;
  const cotizacion = cotizacionStore.getCotizacionByTravel(travelId.value);
  if (!coordinatorId || !cotizacion)
    return undefined;
  const quotationBus = cotizacionStore.getBusesByQuotation(cotizacion.id)
    .find(bus => (bus.coordinatorIds as string[] | undefined)?.includes(coordinatorId));
  return allBuses.value.find(bus => quotationBus && bus.quotationBusId === quotationBus.id)?.id;
});

function openCoordinatorSeatModal(coordinator: Traveler) {
  seatingCoordinator.value = coordinator;
}

async function assignCoordinatorSeat(seat: { travelBusId: string; seat: number }) {
  const coordinator = seatingCoordinator.value;
  if (!coordinator)
    return;
  try {
    await travelerStore.setCoordinatorSeat(coordinator.id, seat);
    toast.add({
      title: 'Asiento asignado',
      description: `${coordinator.firstName} ocupa el asiento ${seat.seat}.`,
      color: 'success',
    });
    seatingCoordinator.value = null;
  }
  catch (error) {
    toast.add({
      title: isSeatAlreadyTakenError(error) ? 'Asiento ocupado' : 'Error al asignar asiento',
      description: isSeatAlreadyTakenError(error)
        ? `El asiento ${seat.seat} ya está asignado a otra persona`
        : undefined,
      color: isSeatAlreadyTakenError(error) ? 'warning' : 'error',
    });
  }
}

async function clearCoordinatorSeat(coordinator: Traveler) {
  try {
    await travelerStore.setCoordinatorSeat(coordinator.id, null);
    if (seatChangeContext.value?.travelerId === coordinator.id)
      clearSeatChangeState();
    toast.add({ title: 'Asiento liberado', description: `${coordinator.firstName} ya no tiene asiento.`, color: 'success' });
  }
  catch {
    toast.add({ title: 'Error al quitar el asiento', color: 'error' });
  }
}

function getCoordinatorSeatActions(coordinator: Traveler): TravelerActionItem[][] {
  return [[
    { label: 'Cambiar asiento', icon: 'i-lucide-arrow-left-right', onSelect: () => startSeatChange(coordinator) },
    { label: 'Quitar asiento', icon: 'i-lucide-x', onSelect: () => clearCoordinatorSeat(coordinator) },
  ]];
}

function getRowActions(traveler: Traveler) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(traveler),
      },
      {
        label: 'Cambiar asiento',
        icon: 'i-lucide-arrow-left-right',
        onSelect: () => startSeatChange(traveler),
      },
      {
        label: 'Habitaciones',
        icon: 'i-lucide-bed-double',
        onSelect: () => router.push({ name: 'travel-habitaciones', params: { id: travelId.value } }),
      },
    ],
    [
      {
        label: 'Ver Pagos',
        icon: 'i-lucide-credit-card',
        onSelect: () => router.push({ name: 'payments-traveler', params: { id: traveler.id } }),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        onSelect: () => handleDelete(traveler),
      },
    ],
  ];
}

const columns: TableColumn<TravelerWithChildren>[] = [
  {
    id: 'nombreCompleto',
    header: 'Nombre',
    cell: ({ row }) => {
      const t = row.original;
      const depth = row.depth;
      const canExpand = row.getCanExpand();

      const nameNode = h('span', { class: 'font-medium' }, `${t.firstName} ${t.lastName}`);

      if (canExpand) {
        const isExpanded = row.getIsExpanded();
        const toggleIcon = isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right';
        const toggleBtn = h(
          resolveComponent('UButton'),
          {
            icon: toggleIcon,
            variant: 'ghost',
            color: 'neutral',
            size: 'xs',
            class: 'mr-1',
            onClick: row.getToggleExpandedHandler(),
          },
        );
        return h('div', { class: 'flex items-center', style: `padding-left: ${depth * 1.5}rem` }, [toggleBtn, nameNode]);
      }

      return h('div', { class: 'flex items-center', style: `padding-left: ${depth * 1.5 + 0.75}rem` }, [nameNode]);
    },
  },
  {
    accessorKey: 'travelBusId',
    header: 'Camión',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'text-sm text-gray-600 dark:text-gray-300' },
        getBusLabel(row.getValue('travelBusId')),
      );
    },
  },
  {
    id: 'habitaciones',
    header: 'Habitación',
    cell: ({ row }) => {
      const labels = getAccommodationLabels(row.original.id);
      if (labels.length === 0)
        return h('span', { class: 'text-sm text-gray-600 dark:text-gray-300' }, '—');
      return h(
        'div',
        { class: 'text-sm text-gray-600 dark:text-gray-300' },
        labels.map(label => h('p', label)),
      );
    },
  },
  {
    accessorKey: 'seat',
    header: 'Asiento',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'font-mono text-sm' },
        row.getValue('seat'),
      );
    },
  },
  {
    accessorKey: 'boardingPoint',
    header: 'Punto de abordaje',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'text-sm text-gray-600 dark:text-gray-300' },
        row.getValue('boardingPoint'),
      );
    },
  },
  {
    accessorKey: 'isRepresentative',
    header: 'Representante',
    cell: ({ row }) => {
      const esRep = row.getValue('isRepresentative') as boolean;
      return h(
        resolveComponent('UBadge'),
        {
          color: esRep ? 'primary' : 'neutral',
          variant: 'subtle',
        },
        () => (esRep ? 'Sí' : 'No'),
      );
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(
        resolveComponent('UDropdownMenu'),
        { items: getRowActions(row.original) },
        () =>
          h(resolveComponent('UButton'), {
            color: 'neutral',
            variant: 'ghost',
            icon: 'i-lucide-more-vertical',
          }),
      );
    },
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Acciones (el encabezado y la navegación los pone app/pages/travels/[id].vue) -->
    <div class="flex justify-end">
      <UButton
        icon="i-lucide-plus"
        label="Nuevo viajero"
        @click="openCreateModal"
      />
    </div>

    <!-- Estadísticas -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Total Viajeros
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ totalTravelers }}
            </p>
          </div>
          <UIcon name="i-lucide-users" class="w-10 h-10 text-muted" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Representantes
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ totalRepresentantes }}
            </p>
          </div>
          <UIcon name="i-lucide-user-check" class="w-10 h-10 text-muted" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Acompañantes
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ totalAcompañantes }}
            </p>
          </div>
          <UIcon name="i-lucide-user" class="w-10 h-10 text-muted" />
        </div>
      </UCard>
    </div>

    <div v-if="seatChangeContext" class="flex flex-col gap-3 md:flex-row md:items-center">
      <UAlert
        class="flex-1"
        icon="i-lucide-arrow-left-right"
        color="info"
        variant="subtle"
        title="Modo cambiar asiento activo"
        :description="seatChangeAlertDescription"
      />
      <div class="flex items-center gap-2">
        <UBadge
          v-if="seatChangeLoading"
          color="info"
          variant="soft"
        >
          Aplicando cambio...
        </UBadge>
        <UBadge color="warning" variant="soft">
          Origen: asiento {{ seatChangeContext.sourceSeat }}
        </UBadge>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-x"
          :disabled="seatChangeLoading"
          @click="cancelSeatChange()"
        >
          Cancelar
        </UButton>
      </div>
    </div>

    <TravelCoordinatorsCard
      v-if="coordinatorRows.length > 0"
      :rows="coordinatorRows"
      :takes-seats="coordinatorsTakeSeats"
      @assign-seat="openCoordinatorSeatModal"
      @change-seat="startSeatChange"
      @clear-seat="clearCoordinatorSeat"
    />

    <UTabs
      v-model="activeTabValue"
      :items="tabs"
      variant="link"
    >
      <template #travelers>
        <div class="space-y-6">
          <TravelerFilterBar
            v-model="filters"
            :available-travels="[]"
            :available-buses="allBuses"
            :representantes="representantes"
            :hide-travel-filter="true"
          />

          <UCard>
            <div v-if="travelers.length === 0" class="text-center py-12">
              <UIcon
                name="i-lucide-inbox"
                class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
              />
              <template v-if="filters.travelBusId || filters.representativeId">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Sin resultados para los filtros aplicados
                </h3>
                <p class="text-gray-500 dark:text-gray-400 mb-4">
                  Intenta con otros criterios de búsqueda
                </p>
                <UButton
                  icon="i-lucide-filter-x"
                  @click="travelerStore.setFilters({ travelId })"
                >
                  Limpiar filtros
                </UButton>
              </template>
              <template v-else>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay viajeros en este viaje
                </h3>
                <p class="text-gray-500 dark:text-gray-400 mb-4">
                  Comienza registrando el primer viajero
                </p>
                <UButton icon="i-lucide-plus" @click="openCreateModal">
                  Agregar Primer Viajero
                </UButton>
              </template>
            </div>
            <UTable
              v-else
              v-model:expanded="expanded"
              :columns="columns"
              :data="travelers"
              :get-row-id="(row) => row.id"
              :get-sub-rows="(row) => row.children"
              :ui="{
                base: 'border-separate border-spacing-0',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                tr: 'group',
                td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
              }"
            />
          </UCard>
        </div>
      </template>

      <template #bus="{ item }">
        <div v-if="item.bus" class="space-y-4">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold">
              Distribución de asientos
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
            >
              {{ getOccupiedSeatsByBus(item.bus.id).length }} / {{ item.bus.seatCount }} ocupados
            </UBadge>
          </div>

          <UAlert
            v-if="getOccupiedSeatsByBus(item.bus.id).length === 0"
            icon="i-lucide-user-round-x"
            color="warning"
            variant="subtle"
            title="Sin viajeros asignados a este camión."
          />
          <UCard>
            <BusSeatMap
              :bus-id="item.bus.id"
              :total-seats="item.bus.seatCount"
              :occupied-seats="getOccupiedSeatsByBus(item.bus.id)"
              :seats-per-row="4"
              :last-row-seats="getLastRowSeats(item.bus)"
              :bus-label="getBusLabel(item.bus.id)"
              :is-seat-selection-mode="seatChangeContext?.travelBusId === item.bus.id"
              :source-traveler-id="seatChangeContext?.travelerId ?? null"
              :source-seat-number="seatChangeContext?.sourceSeat ?? null"
              :selected-seat-number="selectedDestinationSeat"
              @empty-seat-selected="handleEmptySeatSelected"
              @destination-seat-selected="handleSeatDestinationSelected"
            />
          </UCard>
        </div>
      </template>
    </UTabs>

    <!-- Modal de formulario -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="editingTraveler ? 'Editar Viajero' : 'Nuevo Viajero'"
      :description="`Complete los campos para ${editingTraveler ? 'editar' : 'registrar'} el viajero.`"
      class="sm:max-w-2xl"
    >
      <template #body>
        <TravelerForm
          :traveler="editingTraveler"
          :initial-values="createTravelerInitialValues"
          :available-travels="[]"
          :available-buses="allBuses"
          :available-travelers="travelersOfTravel"
          :locked-travel-id="travelId"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isCoordinatorSeatModalOpen"
      title="Asignar asiento"
      :description="seatingCoordinator ? `Asiento de pasajero para ${seatingCoordinator.firstName} (coordinador).` : undefined"
    >
      <template #body>
        <CoordinatorSeatForm
          v-if="seatingCoordinator"
          :buses="coordinatorSeatBuses"
          :initial-bus-id="coordinatorInitialBusId"
          @submit="assignCoordinatorSeat"
          @cancel="seatingCoordinator = null"
        />
      </template>
    </UModal>
  </div>
</template>
