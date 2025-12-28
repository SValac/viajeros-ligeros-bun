<script setup lang="ts">
import type { TravelService } from '~/types/travel';

// Props
type Props = {
  modelValue: TravelService[];
};

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [services: TravelService[]];
}>();

// Estado local
const services = ref<TravelService[]>([...props.modelValue]);
const isServiceModalOpen = ref(false);
const editingService = ref<TravelService | null>(null);

// Toast para feedback
const toast = useToast();

// Servicios predefinidos comunes
const COMMON_SERVICES = [
  { nombre: 'Vuelos ida y vuelta', descripcion: '' },
  { nombre: 'Hotel', descripcion: '' },
  { nombre: 'Guía turístico', descripcion: '' },
  { nombre: 'Transporte local', descripcion: '' },
  { nombre: 'Desayuno', descripcion: '' },
  { nombre: 'Seguro de viaje', descripcion: '' },
  { nombre: 'Visas y permisos', descripcion: '' },
  { nombre: 'Actividades recreativas', descripcion: '' },
];

// Servicios agrupados
const serviciosIncluidos = computed(() => {
  return services.value.filter(s => s.incluido);
});

const serviciosNoIncluidos = computed(() => {
  return services.value.filter(s => !s.incluido);
});

// Handlers
function openServiceAddModal() {
  editingService.value = null;
  isServiceModalOpen.value = true;
}

function openEditModal(service: TravelService) {
  editingService.value = service;
  isServiceModalOpen.value = true;
}

function quickAddService(commonService: { nombre: string; descripcion: string }) {
  // Verificar si ya existe un servicio con el mismo nombre
  const exists = services.value.some(s => s.nombre.toLowerCase() === commonService.nombre.toLowerCase());

  if (exists) {
    toast.add({
      title: 'Servicio duplicado',
      description: 'Este servicio ya existe en la lista',
      color: 'warning',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }

  const newService: TravelService = {
    id: crypto.randomUUID(),
    nombre: commonService.nombre,
    descripcion: commonService.descripcion || undefined,
    incluido: true, // Los servicios quick-add se marcan como incluidos por defecto
  };

  services.value.push(newService);
  emit('update:modelValue', services.value);

  toast.add({
    title: 'Servicio agregado',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
}

function handleSubmit(serviceData: Omit<TravelService, 'id'>) {
  if (editingService.value) {
    // Editar servicio existente
    const index = services.value.findIndex(s => s.id === editingService.value!.id);
    if (index !== -1) {
      services.value[index] = {
        ...serviceData,
        id: editingService.value.id,
      };

      toast.add({
        title: 'Servicio actualizado',
        color: 'success',
        icon: 'i-lucide-check-circle',
      });
    }
  }
  else {
    // Agregar nuevo servicio
    const newService: TravelService = {
      ...serviceData,
      id: crypto.randomUUID(),
    };
    services.value.push(newService);

    toast.add({
      title: 'Servicio agregado',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  }

  emit('update:modelValue', services.value);
  isServiceModalOpen.value = false;
}

function toggleIncluido(service: TravelService) {
  const index = services.value.findIndex(s => s.id === service.id);
  if (index !== -1) {
    const currentService = services.value[index];
    if (currentService) {
      currentService.incluido = !currentService.incluido;
      emit('update:modelValue', services.value);
    }
  }
}

function deleteService(service: TravelService) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Eliminar el servicio "${service.nombre}"?`)) {
    services.value = services.value.filter(s => s.id !== service.id);
    emit('update:modelValue', services.value);

    toast.add({
      title: 'Servicio eliminado',
      color: 'success',
      icon: 'i-lucide-trash-2',
    });
  }
}

// Sincronizar con prop cuando cambia externamente
watch(() => props.modelValue, (newVal) => {
  services.value = [...newVal];
}, { deep: true });

// Acciones por servicio
function getServiceActions(service: TravelService) {
  return [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => openEditModal(service),
    },
    {
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => deleteService(service),
    },
  ];
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header con botones -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-muted">
        {{ services.length }} servicio{{ services.length !== 1 ? 's' : '' }}
        <span v-if="serviciosIncluidos.length > 0">
          ({{ serviciosIncluidos.length }} incluido{{ serviciosIncluidos.length !== 1 ? 's' : '' }})
        </span>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Servicio Personalizado"
        @click="openServiceAddModal"
      />
    </div>

    <!-- Servicios comunes (quick-add) -->
    <div>
      <div class="text-xs font-medium text-muted mb-2">
        Servicios Comunes:
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="commonService in COMMON_SERVICES"
          :key="commonService.nombre"
          size="xs"
          variant="outline"
          color="neutral"
          :label="commonService.nombre"
          icon="i-lucide-plus-circle"
          @click="quickAddService(commonService)"
        />
      </div>
    </div>

    <!-- Lista de servicios incluidos -->
    <div v-if="serviciosIncluidos.length > 0">
      <div class="text-xs font-medium text-muted mb-2">
        ✅ Servicios Incluidos
      </div>
      <div class="space-y-2">
        <UCard
          v-for="service in serviciosIncluidos"
          :key="service.id"
          class="hover:bg-elevated transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3 flex-1">
              <!-- Checkbox -->
              <UCheckbox
                :model-value="service.incluido"
                class="mt-0.5"
                @update:model-value="toggleIncluido(service)"
              />

              <div class="flex-1 space-y-1">
                <!-- Nombre -->
                <div class="font-medium text-sm">
                  {{ service.nombre }}
                </div>

                <!-- Descripción -->
                <div
                  v-if="service.descripcion"
                  class="text-xs text-muted"
                >
                  {{ service.descripcion }}
                </div>
              </div>
            </div>

            <!-- Acciones -->
            <UDropdownMenu :items="getServiceActions(service)">
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
    </div>

    <!-- Lista de servicios NO incluidos -->
    <div v-if="serviciosNoIncluidos.length > 0">
      <div class="text-xs font-medium text-muted mb-2">
        ❌ Servicios NO Incluidos
      </div>
      <div class="space-y-2">
        <UCard
          v-for="service in serviciosNoIncluidos"
          :key="service.id"
          class="hover:bg-elevated transition-colors opacity-75"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3 flex-1">
              <!-- Checkbox -->
              <UCheckbox
                :model-value="service.incluido"
                class="mt-0.5"
                @update:model-value="toggleIncluido(service)"
              />

              <div class="flex-1 space-y-1">
                <!-- Nombre -->
                <div class="font-medium text-sm">
                  {{ service.nombre }}
                </div>

                <!-- Descripción -->
                <div
                  v-if="service.descripcion"
                  class="text-xs text-muted"
                >
                  {{ service.descripcion }}
                </div>
              </div>
            </div>

            <!-- Acciones -->
            <UDropdownMenu :items="getServiceActions(service)">
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
    </div>

    <!-- Estado vacío -->
    <div
      v-if="services.length === 0"
      class="text-center py-8 text-muted"
    >
      <div class="i-lucide-package w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">
        No hay servicios agregados
      </p>
      <p class="text-xs mt-1">
        Usa los botones de "Servicios Comunes" o agrega uno personalizado
      </p>
    </div>

    <!-- Modal de formulario -->
    <UModal
      v-model:open="isServiceModalOpen"
      :title="editingService ? 'Editar Servicio' : 'Nuevo Servicio'"
    >
      <template #body>
        <TravelServiceForm
          :service="editingService"
          @submit="handleSubmit"
          @cancel="isServiceModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>
