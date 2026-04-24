<script setup lang="ts">
import { z } from 'zod';

definePageMeta({
  name: 'travel-cotizacion',
  layout: 'default',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const travelStore = useTravelsStore();
const cotizacionStore = useCotizacionStore();
const paymentStore = usePaymentStore();

const travelId = computed(() => route.params.id as string);

onMounted(async () => {
  await cotizacionStore.fetchByTravel(travelId.value);
});

const travel = computed(() => travelStore.getTravelById(travelId.value));
const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));
const readonly = computed(() => cotizacion.value?.status === 'confirmed');
const acumuladoViajeros = computed(() =>
  paymentStore.getTravelCashSummary(travelId.value).totalCollected,
);

// Redirect if travel not found
watchEffect(() => {
  if (!travel.value && travelId.value) {
    toast.add({
      title: 'Viaje no encontrado',
      description: 'El viaje que buscas no existe',
      color: 'error',
    });
    router.push('/travels/dashboard');
  }
});

// Form for creating a new cotizacion
const crearSchema = z.object({
  minimumSeatTarget: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
});

type CrearFormSchema = {
  minimumSeatTarget?: number;
  notes?: string;
};

const crearState = reactive<CrearFormSchema>({
  minimumSeatTarget: undefined,
  notes: '',
});

const isCrearModalOpen = shallowRef(false);
const isAgregarHospedajeModalOpen = shallowRef(false);
const isAgregarBusModalOpen = shallowRef(false);

async function handleCrearCotizacion() {
  const result = crearSchema.safeParse(crearState);
  if (!result.success)
    return;

  await cotizacionStore.createQuotation({
    travelId: travelId.value,
    seatPrice: 0,
    busCapacity: 0,
    minimumSeatTarget: result.data.minimumSeatTarget ?? 0,
    status: 'draft',
    notes: result.data.notes,
  });

  toast.add({ title: 'Cotización creada', color: 'success' });
  isCrearModalOpen.value = false;
}

function handleCotizacionConfirmada() {
  toast.add({ title: 'Cotización confirmada exitosamente', color: 'success' });
}

// Editable params state (synced with store)
const editandoParametros = shallowRef(false);

const paramsState = reactive({
  busCapacity: cotizacion.value?.busCapacity ?? 0,
  minimumSeatTarget: cotizacion.value?.minimumSeatTarget ?? 0,
  notes: cotizacion.value?.notes ?? '',
});

watch(cotizacion, (c) => {
  if (c) {
    paramsState.busCapacity = c.busCapacity;
    paramsState.minimumSeatTarget = c.minimumSeatTarget;
    paramsState.notes = c.notes ?? '';
  }
}, { immediate: true });

async function guardarParametros() {
  if (!cotizacion.value)
    return;
  await cotizacionStore.updateQuotation(cotizacion.value.id, {
    busCapacity: paramsState.busCapacity,
    minimumSeatTarget: paramsState.minimumSeatTarget,
    notes: paramsState.notes,
  });
  editandoParametros.value = false;
  toast.add({ title: 'Parámetros actualizados', color: 'success' });
}

function handleHospedajeAgregado() {
  // No hace nada extra, el modal se cierra desde el componente
}
</script>

<template>
  <div v-if="travel" class="h-full overflow-auto">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            @click="router.push(`/travels/${travelId}`)"
          />
          <div>
            <h1 class="text-2xl font-bold">
              Cotización
            </h1>
            <p class="text-muted text-sm">
              {{ travel.destination }}
            </p>
          </div>
        </div>
      </div>

      <!-- Sin cotización -->
      <div v-if="!cotizacion">
        <UCard class="text-center py-12">
          <span class="i-lucide-file-plus w-16 h-16 text-muted mx-auto mb-4 block" />
          <h2 class="text-xl font-semibold mb-2">
            Sin cotización
          </h2>
          <p class="text-muted mb-6">
            Este viaje aún no tiene una cotización. Crea una para gestionar costos de proveedores.
          </p>
          <UButton
            icon="i-lucide-plus"
            label="Crear cotización"
            @click="isCrearModalOpen = true"
          />
        </UCard>
      </div>

      <!-- Con cotización -->
      <template v-else>
        <!-- Header con acciones -->
        <CotizacionHeaderActions
          :quotation-id="cotizacion.id"
          :readonly="readonly"
          @cotizacion-confirmada="handleCotizacionConfirmada"
        />

        <!-- Resumen financiero -->
        <CotizacionResumenFinanciero
          :quotation-id="cotizacion.id"
          :acumulado-viajeros="acumuladoViajeros"
        />

        <!-- Parámetros editables (solo borrador) -->
        <UCard v-if="!readonly">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold flex items-center gap-2">
                <span class="i-lucide-settings w-5 h-5 text-muted" />
                Parámetros de la Cotización
              </h2>
              <UButton
                v-if="!editandoParametros"
                icon="i-lucide-pencil"
                size="xs"
                variant="ghost"
                color="neutral"
                label="Editar"
                @click="editandoParametros = true"
              />
            </div>
          </template>

          <div v-if="!editandoParametros" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-muted mb-1">
                Capacidad del Autobús
              </p>
              <p class="font-medium">
                {{ cotizacion.busCapacity }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">
                Asiento Mínimo Objetivo
              </p>
              <p class="font-medium">
                {{ cotizacion.minimumSeatTarget }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">
                Notas
              </p>
              <p class="text-sm">
                {{ cotizacion.notes || '—' }}
              </p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Capacidad del Autobús">
                <UInput
                  v-model.number="paramsState.busCapacity"
                  type="number"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Asiento Mínimo Objetivo">
                <UInput
                  v-model.number="paramsState.minimumSeatTarget"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField label="Notas">
              <UTextarea
                v-model="paramsState.notes"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="neutral"
                label="Cancelar"
                @click="editandoParametros = false"
              />
              <UButton
                label="Guardar"
                @click="guardarParametros"
              />
            </div>
          </div>
        </UCard>

        <!-- Sección Servicios -->
        <section id="servicios">
          <CotizacionProveedoresSection
            :quotation-id="cotizacion.id"
            :readonly="readonly"
          />
        </section>

        <!-- Sección Hospedaje -->
        <section id="hospedaje">
          <CotizacionHospedajeSection
            :quotation-id="cotizacion.id"
            :readonly="readonly"
            @agregar-hospedaje="isAgregarHospedajeModalOpen = true"
          />
        </section>

        <!-- Sección Autobuses -->
        <section id="autobuses">
          <CotizacionBusesSection
            :quotation-id="cotizacion.id"
            :readonly="readonly"
            @agregar-bus="isAgregarBusModalOpen = true"
          />
        </section>

        <!-- Sección Precio al Público -->
        <section id="precio-publico">
          <CotizacionPrecioPublicoSection
            :quotation-id="cotizacion.id"
            :readonly="readonly"
          />
        </section>
      </template>
    </div>
    <!-- Modal: crear cotización -->
    <UModal
      v-model:open="isCrearModalOpen"
      title="Crear Cotización"
      description="Define los parámetros iniciales de la cotización"
      class="sm:max-w-lg"
    >
      <template #body>
        <UForm
          :schema="crearSchema"
          :state="crearState"
          class="space-y-4"
          @submit="handleCrearCotizacion"
        >
          <UFormField label="Asiento Mínimo Objetivo" name="minimumSeatTarget">
            <UInput
              v-model.number="crearState.minimumSeatTarget"
              type="number"
              placeholder="Ej. 30"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Notas" name="notas">
            <UTextarea
              v-model="crearState.notes"
              placeholder="Observaciones sobre esta cotización..."
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              type="button"
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="isCrearModalOpen = false"
            />
            <UButton
              type="submit"
              label="Crear Cotización"
            />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Modal: agregar hospedaje -->
    <CotizacionHospedajeForm
      v-if="cotizacion"
      :open="isAgregarHospedajeModalOpen"
      :quotation-id="cotizacion.id"
      @update:open="(v) => isAgregarHospedajeModalOpen = v"
      @hospedaje-agregado="handleHospedajeAgregado"
    />

    <!-- Modal: agregar autobús -->
    <CotizacionBusForm
      v-if="cotizacion"
      :open="isAgregarBusModalOpen"
      :quotation-id="cotizacion.id"
      @update:open="(v) => isAgregarBusModalOpen = v"
      @bus-agregado="isAgregarBusModalOpen = false"
    />
  </div>
</template>
