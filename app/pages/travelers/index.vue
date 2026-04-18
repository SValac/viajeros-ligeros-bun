<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { ExpandedStateList } from '@tanstack/vue-table';

import { h } from 'vue';

import type { Travel } from '~/types/travel';
import type { Traveler, TravelerFormData, TravelerWithChildren } from '~/types/traveler';

definePageMeta({
  name: 'travelers-index',
});

// Stores
const router = useRouter();
const travelerStore = useTravelerStore();
const travelStore = useTravelsStore();
const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const toast = useToast();

// Estado local
const isFormModalOpen = shallowRef(false);
const editingTraveler = shallowRef<Traveler | null>(null);
const expanded = ref<ExpandedStateList>({});

// Datos derivados de stores
const travelers = computed(() => travelerStore.filteredGroupedTravelers);

// Mantener siempre expandidos todos los grupos: recalcula y sobreescribe
// el estado completo cada vez que cambian los datos.
watchEffect(() => {
  const newExpanded: ExpandedStateList = {};
  for (const row of travelers.value) {
    if (row.children && row.children.length > 0) {
      newExpanded[row.id] = true;
    }
  }
  expanded.value = newExpanded;
});
const total = computed(() => travelerStore.travelers.length);

const allTravels = computed((): Travel[] => travelStore.allTravels);

const allBuses = computed(() => cotizacionStore.busesApartados);

// Representantes disponibles según los filtros actuales (travelId/travelBusId)
const representantes = computed((): Traveler[] =>
  travelerStore.filteredTravelers.filter(t => t.esRepresentante),
);

const filters = computed({
  get: () => travelerStore.filters,
  set: val => travelerStore.setFilters(val),
});

// Helpers de visualización
function getTravelLabel(travelId: string): string {
  const travel = allTravels.value.find(t => t.id === travelId);
  return travel ? travel.destino : travelId;
}

function getBusLabel(travelBusId: string): string {
  const bus = allBuses.value.find(b => b.id === travelBusId);
  if (!bus)
    return travelBusId;
  const agencia = providerStore.getProviderById(bus.proveedorId)?.nombre;
  return agencia ? `${agencia} — Unidad ${bus.numeroUnidad}` : `Unidad ${bus.numeroUnidad}`;
}

// Acciones del formulario
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

function handleFormSubmit(data: TravelerFormData) {
  try {
    if (editingTraveler.value) {
      const updated = travelerStore.updateTraveler(editingTraveler.value.id, data);
      if (updated) {
        toast.add({
          title: 'Viajero actualizado',
          description: `${data.nombre} ${data.apellido} se actualizó correctamente`,
          color: 'primary',
        });
        closeModal();
      }
    }
    else {
      travelerStore.addTraveler(data);
      toast.add({
        title: 'Viajero creado',
        description: `${data.nombre} ${data.apellido} se registró correctamente`,
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

function handleDelete(traveler: Traveler) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar a ${traveler.nombre} ${traveler.apellido}?`)) {
    travelerStore.deleteTraveler(traveler.id);
    toast.add({
      title: 'Viajero eliminado',
      description: `${traveler.nombre} ${traveler.apellido} se eliminó correctamente`,
      color: 'warning',
    });
  }
}

// Acciones de fila
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

// Columnas de la tabla
const columns: TableColumn<TravelerWithChildren>[] = [
  {
    id: 'nombreCompleto',
    header: 'Nombre',
    cell: ({ row }) => {
      const t = row.original;
      const depth = row.depth;
      const canExpand = row.getCanExpand();

      const nameNode = h('span', { class: 'font-medium' }, `${t.nombre} ${t.apellido}`);

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
    accessorKey: 'travelId',
    header: 'Viaje',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'text-sm text-gray-600 dark:text-gray-300' },
        getTravelLabel(row.getValue('travelId')),
      );
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
    accessorKey: 'esRepresentante',
    header: 'Representante',
    cell: ({ row }) => {
      const esRep = row.getValue('esRepresentante') as boolean;
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

// Lifecycle
onMounted(() => {
  travelerStore.clearFilters();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Viajeros
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Administra los clientes que reservan lugares en los viajes
        </p>
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
              {{ total }}
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
              {{ travelerStore.travelers.filter(t => t.esRepresentante).length }}
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
              {{ travelerStore.travelers.filter(t => !t.esRepresentante).length }}
            </p>
          </div>
          <UIcon name="i-lucide-user" class="w-10 h-10 text-gray-400" />
        </div>
      </UCard>
    </div>

    <!-- Filtros -->
    <TravelerFilterBar
      v-model="filters"
      :available-travels="allTravels"
      :available-buses="allBuses"
      :representantes="representantes"
    />

    <!-- Tabla de viajeros -->
    <UCard>
      <div v-if="travelers.length === 0" class="text-center py-12">
        <UIcon
          name="i-lucide-inbox"
          class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
        />
        <template v-if="filters.travelId || filters.travelBusId || filters.representanteId">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Sin resultados para los filtros aplicados
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            Intenta con otros criterios de búsqueda
          </p>
          <UButton icon="i-lucide-filter-x" @click="travelerStore.clearFilters()">
            Limpiar filtros
          </UButton>
        </template>
        <template v-else>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay viajeros aún
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
        :get-sub-rows="(row) => row.children"
        :ui="{
          base: 'border-separate border-spacing-0',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          tr: 'group',
          td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
        }"
      />
    </UCard>

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
          :available-travels="allTravels"
          :available-travelers="travelerStore.travelers"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>
