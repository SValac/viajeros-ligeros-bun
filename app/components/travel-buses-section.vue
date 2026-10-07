<script setup lang="ts">
import type { QuotationBus } from '~/types/quotation';

import { sanitizeName } from '~/utils/form-validation';

type Props = {
  travelId: string;
  editable?: boolean;
};

const { travelId, editable = false } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const coordinatorStore = useCoordinatorStore();

const travelsStore = useTravelsStore();
const toast = useToast();

type OperatorDraft = {
  operator1Name: string;
  operator1Phone: string;
  operator2Name: string;
  operator2Phone: string;
};

const operatorDraft = reactive<Record<string, OperatorDraft>>({});

const travel = computed(() => travelsStore.getTravelById(travelId));
const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId));
const buses = computed(() => {
  if (!cotizacion.value)
    return [];
  return cotizacionStore.getBusesByQuotation(cotizacion.value.id);
});

// El vínculo real es quotation_bus_id; el texto (proveedor + unidad) solo sirve para filas sin vínculo,
// porque el modelo se puede editar del lado del viaje y dos buses pueden compartir proveedor y unidad
function getTravelBusForQuotationBus(bus: QuotationBus) {
  const travelBuses = travel.value?.buses ?? [];
  return travelBuses.find(b => b.quotationBusId === bus.id)
    ?? travelBuses.find(b => !b.quotationBusId && b.providerId === bus.providerId && b.model === bus.unitNumber);
}

function getOperadores(bus: QuotationBus) {
  const travelBus = getTravelBusForQuotationBus(bus);
  if (!travelBus)
    return [];
  const ops = [{ nombre: travelBus.operator1Name, telefono: travelBus.operator1Phone }];
  if (travelBus.operator2Name)
    ops.push({ nombre: travelBus.operator2Name, telefono: travelBus.operator2Phone ?? '' });
  return ops;
}

// Espera también a los buses del viaje: al abrir el link directo la cotización puede cargar
// antes que el viaje, y el borrador quedaría vacío aunque el bus ya tenga operadores
watch(
  [buses, () => travel.value?.buses],
  ([newBuses]) => {
    newBuses.forEach((bus) => {
      const travelBus = getTravelBusForQuotationBus(bus);
      if (travelBus && !operatorDraft[bus.id]) {
        operatorDraft[bus.id] = {
          operator1Name: travelBus.operator1Name,
          operator1Phone: travelBus.operator1Phone,
          operator2Name: travelBus.operator2Name ?? '',
          operator2Phone: travelBus.operator2Phone ?? '',
        };
      }
    });
  },
  { immediate: true },
);

// Sanea los nombres de operador mientras el usuario escribe (sin dígitos); el teléfono lo controla <PhoneInput>
watch(operatorDraft, (drafts) => {
  Object.values(drafts).forEach((draft) => {
    const cleanOperator1Name = sanitizeName(draft.operator1Name);
    if (cleanOperator1Name !== draft.operator1Name)
      draft.operator1Name = cleanOperator1Name;

    const cleanOperator2Name = sanitizeName(draft.operator2Name);
    if (cleanOperator2Name !== draft.operator2Name)
      draft.operator2Name = cleanOperator2Name;
  });
}, { deep: true });

async function saveOperators(bus: QuotationBus) {
  const travelBus = getTravelBusForQuotationBus(bus);
  if (!travelBus) {
    toast.add({ title: 'No se encontró el bus del viaje', description: 'Recarga la página e inténtalo de nuevo.', color: 'error', icon: 'i-lucide-alert-circle' });
    return;
  }
  const draft = operatorDraft[bus.id];
  if (!draft)
    return;
  const invalidPhone = [draft.operator1Phone, draft.operator2Phone].some(phone => phone && !isValidPhone(phone));
  if (invalidPhone) {
    toast.add({ title: 'Teléfono incompleto', description: 'Revisa el teléfono de los operadores.', color: 'error' });
    return;
  }
  const ok = await travelsStore.updateTravelBus(travelId, travelBus.id, {
    operator1Name: draft.operator1Name,
    operator1Phone: draft.operator1Phone,
    operator2Name: draft.operator2Name || undefined,
    operator2Phone: draft.operator2Phone || undefined,
  });
  if (ok) {
    toast.add({ title: 'Operadores guardados', color: 'success', icon: 'i-lucide-check-circle' });
  }
  else {
    toast.add({ title: 'Error al guardar operadores', color: 'error', icon: 'i-lucide-alert-circle' });
  }
}

// IDs de coordinadores ya asignados a algún bus (excluyendo el bus actual)
function coordinadoresOcupados(excludeBusId: string): string[] {
  return buses.value
    .filter(b => b.id !== excludeBusId)
    .flatMap(b => b.coordinatorIds ?? []);
}

// Opciones filtradas: solo coordinadores del viaje, no ocupados en otros buses
function getCoordinadorOptions(busId: string) {
  const delViaje = travel.value?.coordinatorIds ?? [];
  const ocupados = coordinadoresOcupados(busId);
  return coordinatorStore.allCoordinators
    .filter(c => delViaje.includes(c.id) && !ocupados.includes(c.id))
    .map(c => ({ value: c.id, label: c.name }));
}

function getProviderName(proveedorId: string): string {
  return providerStore.getProviderById(proveedorId)?.name ?? 'Proveedor desconocido';
}

function getEstadoColor(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'confirmed')
    return 'success';
  if (status === 'reserved')
    return 'warning';
  return 'neutral';
}

function getEstadoLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Confirmado',
    apartado: 'Apartado',
    pendiente: 'Pendiente',
  };
  return labels[status] ?? status;
}

function getBusCoordinadorIds(busId: string): string[] {
  const bus = buses.value.find(b => b.id === busId);
  return bus?.coordinatorIds ? [...bus.coordinatorIds] : [];
}

function getCoordinadorName(id: string): string {
  return coordinatorStore.getCoordinatorById(id)?.name ?? 'Desconocido';
}

function onCoordinadoresChange(busId: string, selected: string[]) {
  const capped = selected.slice(0, 2) as [] | [string] | [string, string];
  cotizacionStore.updateBusQuotation(busId, { coordinatorIds: capped });
}
</script>

<template>
  <div>
    <template v-if="cotizacion && buses.length > 0">
      <div class="space-y-3">
        <UCard
          v-for="bus in buses"
          :key="bus.id"
        >
          <template #header>
            <div class="flex justify-between items-center gap-4">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-bus" class="w-4 h-4 text-muted" />
                <span class="font-medium">{{ getProviderName(bus.providerId) }}</span>
                <span v-if="bus.unitNumber" class="text-sm text-muted">· Unidad {{ bus.unitNumber }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center gap-1 text-sm text-muted">
                  <UIcon name="i-lucide-users" class="w-3.5 h-3.5" />
                  <span>{{ bus.capacity }}</span>
                </div>
                <UBadge
                  :label="getEstadoLabel(bus.status)"
                  :color="getEstadoColor(bus.status)"
                  variant="subtle"
                />
              </div>
            </div>
          </template>

          <!-- Coordinadores (modo editable) -->
          <div v-if="editable">
            <div class="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Coordinadores (máx. 2)
            </div>
            <USelectMenu
              :model-value="getBusCoordinadorIds(bus.id)"
              :items="getCoordinadorOptions(bus.id)"
              value-key="value"
              multiple
              placeholder="Seleccionar coordinadores"
              @update:model-value="(val) => onCoordinadoresChange(bus.id, val)"
            />
            <div v-if="getBusCoordinadorIds(bus.id).length > 0" class="flex items-center gap-3 mt-3">
              <div
                v-for="cId in getBusCoordinadorIds(bus.id)"
                :key="cId"
                class="flex items-center gap-2"
              >
                <UAvatar
                  :alt="getCoordinadorName(cId)"
                  size="sm"
                  color="primary"
                  variant="soft"
                />
                <span class="text-sm font-medium">{{ getCoordinadorName(cId) }}</span>
              </div>
            </div>

            <!-- Operadores -->
            <div v-if="operatorDraft[bus.id]" class="mt-4">
              <div class="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                Operadores
              </div>
              <div class="space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <UInput
                    v-model="operatorDraft[bus.id]!.operator1Name"
                    placeholder="Nombre operador 1"
                  />
                  <PhoneInput v-model="operatorDraft[bus.id]!.operator1Phone" aria-label="Teléfono operador 1" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <UInput
                    v-model="operatorDraft[bus.id]!.operator2Name"
                    placeholder="Nombre operador 2 (opcional)"
                  />
                  <PhoneInput v-model="operatorDraft[bus.id]!.operator2Phone" aria-label="Teléfono operador 2" />
                </div>
                <div class="flex justify-end">
                  <UButton
                    size="xs"
                    icon="i-lucide-save"
                    label="Guardar operadores"
                    @click="saveOperators(bus)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Coordinadores + Operadores (modo lectura) -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Coordinadores
              </div>
              <div class="space-y-2">
                <div
                  v-for="cId in bus.coordinatorIds"
                  :key="cId"
                  class="flex items-center gap-2"
                >
                  <UAvatar
                    :alt="getCoordinadorName(cId)"
                    size="sm"
                    color="primary"
                    variant="soft"
                  />
                  <span class="text-sm font-medium">{{ getCoordinadorName(cId) }}</span>
                </div>
                <p v-if="!bus.coordinatorIds || bus.coordinatorIds.length === 0" class="text-sm text-muted italic">
                  Sin coordinadores asignados
                </p>
              </div>
            </div>
            <div>
              <div class="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Operadores
              </div>
              <div class="space-y-1">
                <div
                  v-for="op in getOperadores(bus)"
                  :key="op.nombre"
                  class="flex items-center gap-3 text-sm"
                >
                  <UIcon name="i-lucide-user" class="w-3.5 h-3.5 text-muted shrink-0" />
                  <span class="font-medium">{{ op.nombre }}</span>
                  <UIcon name="i-lucide-phone" class="w-3.5 h-3.5 text-muted shrink-0" />
                  <span class="text-muted">{{ formatPhone(op.telefono) }}</span>
                </div>
                <p v-if="getOperadores(bus).length === 0" class="text-sm text-muted italic">
                  Sin operadores asignados
                </p>
              </div>
            </div>
          </div>

          <p v-if="bus.notes || bus.remarks" class="text-sm text-muted mt-2 italic">
            {{ bus.notes || bus.remarks }}
          </p>
        </UCard>
      </div>
    </template>

    <div v-else class="p-8 text-center bg-elevated rounded-lg">
      <UIcon name="i-lucide-bus" class="w-12 h-12 text-muted mx-auto mb-2 block opacity-50" />
      <p class="text-muted font-medium mb-1">
        Sin autobuses apartados
      </p>
      <p class="text-sm text-muted mb-3">
        Los autobuses se apartan en la cotización del viaje.
      </p>
      <UButton
        variant="outline"
        size="sm"
        label="Ir a la cotización"
        icon="i-lucide-arrow-right"
        trailing
        :to="{ name: 'quotation-buses', params: { id: travelId } }"
      />
    </div>
  </div>
</template>
