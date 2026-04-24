<script setup lang="ts">
import type { TravelBus } from '~/types/travel';

type Props = {
  travelId: string;
  editable?: boolean;
};

const { travelId, editable = false } = defineProps<Props>();

const travelsStore = useTravelsStore();
const providerStore = useProviderStore();
const toast = useToast();

const isBusModalOpen = shallowRef(false);
const editingBus = shallowRef<TravelBus | null>(null);

// Derived: buses for this travel
const buses = computed(
  () => travelsStore.getTravelById(travelId)?.buses ?? [],
);

function getProviderName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Proveedor desconocido';
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function openAddModal() {
  editingBus.value = null;
  isBusModalOpen.value = true;
}

function openEditModal(bus: TravelBus) {
  editingBus.value = bus;
  isBusModalOpen.value = true;
}

async function handleSubmit(data: Omit<TravelBus, 'id'>) {
  if (editingBus.value) {
    await travelsStore.updateTravelBus(travelId, editingBus.value.id, data);
    toast.add({ title: 'Autobús actualizado', color: 'success', icon: 'i-lucide-check-circle' });
  }
  else {
    await travelsStore.addBusToTravel(travelId, data);
    toast.add({ title: 'Autobús agregado', color: 'success', icon: 'i-lucide-check-circle' });
  }
  isBusModalOpen.value = false;
}

async function deleteBus(bus: TravelBus) {
  const label = [bus.brand, bus.model].filter(Boolean).join(' ') || 'este autobús';
  // eslint-disable-next-line no-alert
  if (confirm(`¿Eliminar ${label}?`)) {
    await travelsStore.removeBusFromTravel(travelId, bus.id);
    toast.add({ title: 'Autobús eliminado', color: 'warning', icon: 'i-lucide-trash-2' });
  }
}

function getBusActions(bus: TravelBus) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(bus),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => deleteBus(bus),
      },
    ],
  ];
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header (solo en modo editable) -->
    <div
      v-if="editable"
      class="flex items-center justify-between"
    >
      <div class="text-sm text-muted">
        {{ buses.length }} autobús{{ buses.length !== 1 ? 'es' : '' }} asignado{{ buses.length !== 1 ? 's' : '' }}
      </div>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Agregar Autobús"
        @click="openAddModal"
      />
    </div>

    <!-- Lista de autobuses -->
    <div
      v-if="buses.length > 0"
      class="space-y-3"
    >
      <UCard
        v-for="bus in buses"
        :key="bus.id"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 space-y-3">
            <!-- Proveedor y vehículo -->
            <div class="flex items-center gap-2 flex-wrap">
              <UBadge
                color="primary"
                variant="subtle"
              >
                <span class="i-lucide-bus w-3 h-3 mr-1" />
                {{ getProviderName(bus.providerId) }}
              </UBadge>
              <span class="font-medium">
                {{ [bus.brand, bus.model, bus.year].filter(Boolean).join(' ') || 'Unidad sin identificar' }}
              </span>
            </div>

            <!-- Asientos y precio -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-center gap-1.5 text-muted">
                <span class="i-lucide-users w-4 h-4" />
                <span>{{ bus.seatCount }} asientos</span>
              </div>
              <div class="flex items-center gap-1.5 text-muted">
                <span class="i-lucide-banknote w-4 h-4" />
                <span>{{ formatCurrency(bus.rentalPrice) }}</span>
              </div>
            </div>

            <!-- Operadores -->
            <div class="space-y-1">
              <div class="text-xs font-medium text-muted uppercase tracking-wide">
                Operadores
              </div>
              <div class="flex items-center gap-1.5 text-sm">
                <span class="i-lucide-user w-3 h-3 text-muted" />
                <span class="font-medium">{{ bus.operator1Name }}</span>
                <span class="i-lucide-phone w-3 h-3 text-muted ml-2" />
                <span>{{ bus.operator1Phone }}</span>
              </div>
              <div
                v-if="bus.operator2Name"
                class="flex items-center gap-1.5 text-sm"
              >
                <span class="i-lucide-user w-3 h-3 text-muted" />
                <span class="font-medium">{{ bus.operator2Name }}</span>
                <span
                  v-if="bus.operator2Phone"
                  class="i-lucide-phone w-3 h-3 text-muted ml-2"
                />
                <span v-if="bus.operator2Phone">{{ bus.operator2Phone }}</span>
              </div>
            </div>
          </div>

          <!-- Acciones (solo en modo editable) -->
          <UDropdownMenu
            v-if="editable"
            :items="getBusActions(bus)"
          >
            <UButton
              icon="i-lucide-more-vertical"
              variant="ghost"
              color="neutral"
              size="sm"
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <!-- Estado vacío -->
    <div
      v-else
      class="text-center py-8 bg-elevated rounded-lg"
    >
      <span class="i-lucide-bus w-12 h-12 text-muted mx-auto mb-3 block" />
      <p class="font-medium mb-1">
        No hay autobuses asignados
      </p>
      <p class="text-sm text-muted">
        {{ editable ? 'Haz clic en "Agregar Autobús" para comenzar' : 'No hay autobuses asignados a este viaje' }}
      </p>
    </div>

    <!-- Modal del formulario -->
    <UModal
      v-model:open="isBusModalOpen"
      :title="editingBus ? 'Editar Autobús' : 'Nuevo Autobús'"
      class="sm:max-w-2xl"
    >
      <template #body>
        <TravelBusForm
          :travel-bus="editingBus"
          @submit="handleSubmit"
          @cancel="isBusModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>
