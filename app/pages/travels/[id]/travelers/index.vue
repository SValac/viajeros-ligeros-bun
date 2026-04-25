<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { ExpandedStateList } from '@tanstack/vue-table';

import { h } from 'vue';

import type { Traveler, TravelerFormData, TravelerWithChildren } from '~/types/traveler';

import BusSeatMap from '~/components/bus-seat-map.vue';

definePageMeta({
  name: 'travel-travelers',
});

const route = useRoute();
const router = useRouter();
const travelerStore = useTravelerStore();
const travelStore = useTravelsStore();
const providerStore = useProviderStore();
const toast = useToast();

const travelId = computed(() => route.params.id as string);
const travel = computed(() => travelStore.getTravelById(travelId.value));

// Estado local
const isFormModalOpen = shallowRef(false);
const editingTraveler = shallowRef<Traveler | null>(null);
const expanded = ref<ExpandedStateList>({});
const selectedBusKey = shallowRef<string | null>(null);

// Datos derivados de stores
const travelers = computed(() => travelerStore.filteredGroupedTravelers);
const travelersOfTravel = computed(() => travelerStore.getTravelersByTravel(travelId.value));
const totalTravelers = computed(() => travelersOfTravel.value.length);
const totalRepresentantes = computed(() => travelersOfTravel.value.filter(t => t.isRepresentative).length);
const totalAcompañantes = computed(() => travelersOfTravel.value.filter(t => !t.isRepresentative).length);

const allBuses = computed(() => travel.value?.buses ?? []);
const busTabs = computed(() =>
  allBuses.value.map((bus, index) => ({
    key: `${bus.id}-${index}`,
    bus,
  })),
);

// Setear y mantener el filtro de viaje bloqueado al travelId de la ruta
onMounted(async () => {
  travelerStore.setFilters({ travelId: travelId.value });
  await travelerStore.fetchByTravel(travelId.value);
});

watch(travelId, (id) => {
  travelerStore.setFilters({ travelId: id });
});

watch(
  busTabs,
  (tabs) => {
    if (tabs.length === 0) {
      selectedBusKey.value = null;
      return;
    }

    const currentSelectionExists = tabs.some(tab => tab.key === selectedBusKey.value);
    if (!currentSelectionExists) {
      selectedBusKey.value = tabs[0]!.key;
    }
  },
  { immediate: true },
);

watchEffect(() => {
  const newExpanded: ExpandedStateList = {};
  for (const row of travelers.value) {
    if (row.children && row.children.length > 0) {
      newExpanded[row.id] = true;
    }
  }
  expanded.value = newExpanded;
});

const selectedBus = computed(() =>
  busTabs.value.find(tab => tab.key === selectedBusKey.value)?.bus ?? null,
);
const selectedBusId = computed(() => selectedBus.value?.id ?? null);

const travelersBySelectedBus = computed(() =>
  selectedBusId.value
    ? travelerStore.getTravelersByBus(selectedBusId.value)
    : [],
);

const occupiedSeats = computed(() =>
  travelersBySelectedBus.value
    .filter(t => t.seat)
    .map(t => ({
      travelerId: t.id,
      seatNumber: Number.parseInt(t.seat, 10),
      passengerName: `${t.firstName} ${t.lastName}`,
    }))
    .filter(s => !Number.isNaN(s.seatNumber)),
);

const lastRowSeats = computed(() => {
  const bus = selectedBus.value;
  if (!bus)
    return 4;
  return bus.lastRowSeats ?? (bus.seatCount % 4 || 4);
});

const representantes = computed(() =>
  travelerStore.filteredTravelers.filter(t => t.isRepresentative),
);

const filters = computed({
  get: () => travelerStore.filters,
  set: val => travelerStore.setFilters({ ...val, travelId: travelId.value }),
});

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
  isFormModalOpen.value = true;
}

function openEditModal(traveler: Traveler) {
  editingTraveler.value = traveler;
  isFormModalOpen.value = true;
}

function closeModal() {
  isFormModalOpen.value = false;
  editingTraveler.value = null;
}

async function handleFormSubmit(data: TravelerFormData) {
  try {
    if (editingTraveler.value) {
      const updated = await travelerStore.updateTraveler(editingTraveler.value.id, data);
      if (updated) {
        toast.add({
          title: 'Viajero actualizado',
          description: `${data.firstName} ${data.lastName} se actualizó correctamente`,
          color: 'primary',
        });
        closeModal();
      }
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
  catch {
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
    toast.add({
      title: 'Viajero eliminado',
      description: `${traveler.firstName} ${traveler.lastName} se eliminó correctamente`,
      color: 'warning',
    });
  }
}

function getRowActions(traveler: Traveler) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(traveler),
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
    accessorKey: 'asiento',
    header: 'Asiento',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'font-mono text-sm' },
        row.getValue('asiento'),
      );
    },
  },
  {
    accessorKey: 'puntoAbordaje',
    header: 'Punto de abordaje',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'text-sm text-gray-600 dark:text-gray-300' },
        row.getValue('puntoAbordaje'),
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
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          @click="router.push({ name: 'travel-detail', params: { id: travelId } })"
        />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Viajeros
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            {{ travel?.destination ?? travelId }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openCreateModal"
      >
        Nuevo Viajero
      </UButton>
    </div>

    <!-- Estadísticas -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Total Viajeros
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ totalTravelers }}
            </p>
          </div>
          <UIcon name="i-lucide-users" class="w-10 h-10 text-gray-400" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Representantes
            </p>
            <p class="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">
              {{ totalRepresentantes }}
            </p>
          </div>
          <UIcon name="i-lucide-user-check" class="w-10 h-10 text-primary-400" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Acompañantes
            </p>
            <p class="text-2xl font-bold text-gray-600 dark:text-gray-300 mt-1">
              {{ totalAcompañantes }}
            </p>
          </div>
          <UIcon name="i-lucide-user" class="w-10 h-10 text-gray-400" />
        </div>
      </UCard>
    </div>

    <!-- Filtros y tabla de viajeros -->
    <TravelerFilterBar
      v-model="filters"
      :available-travels="[]"
      :available-buses="allBuses"
      :representantes="representantes"
      :hide-travel-filter="true"
    />

    <!-- Tabla de viajeros -->
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

    <!-- Mapa de asientos -->
    <div>
      <div class="flex items-center gap-3 mb-3">
        <h2 class="text-lg font-semibold">
          Distribución de asientos
        </h2>
        <UBadge
          v-if="selectedBus"
          color="neutral"
          variant="subtle"
        >
          {{ occupiedSeats.length }} / {{ selectedBus.seatCount }} ocupados
        </UBadge>
      </div>

      <div v-if="busTabs.length > 1" class="flex gap-2 flex-wrap mb-4">
        <UButton
          v-for="tab in busTabs"
          :key="tab.key"
          size="sm"
          :variant="selectedBusKey === tab.key ? 'solid' : 'outline'"
          @click="selectedBusKey = tab.key"
        >
          {{ getBusLabel(tab.bus.id) }}
        </UButton>
      </div>

      <UCard v-if="selectedBus">
        <BusSeatMap
          :total-seats="selectedBus.seatCount"
          :occupied-seats="occupiedSeats"
          :seats-per-row="4"
          :last-row-seats="lastRowSeats"
          @seat-selected="(travelerId) => {
            const t = travelerStore.travelers.find(t => t.id === travelerId);
            if (t) openEditModal(t);
          }"
        />
      </UCard>
      <UCard v-else-if="allBuses.length === 0">
        <p class="text-center text-gray-400 py-6">
          Sin autobuses asignados a este viaje
        </p>
      </UCard>
    </div>

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
          :available-travels="[]"
          :available-buses="allBuses"
          :available-travelers="travelerStore.travelers"
          :locked-travel-id="travelId"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>
