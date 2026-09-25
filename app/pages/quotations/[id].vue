<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import { z } from 'zod';

import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';
import { sanitizeText, textSchema } from '~/utils/form-validation';

// Padre de las pestañas de la cotización (app/pages/quotations/[id]/*). Muestra el
// encabezado, el estado y la navegación; las pestañas solo se renderizan cuando la
// cotización existe. Sin cotización, muestra el estado vacío para crearla.

const router = useRouter();
const toast = useToast();

const travelStore = useTravelsStore();
const cotizacionStore = useCotizacionStore();

const { travelId, quotation: cotizacion, readonly } = useQuotationRoute();

onMounted(async () => {
  await cotizacionStore.fetchByTravel(travelId.value);
});

const travel = computed(() => travelStore.getTravelById(travelId.value));

// Redirect if travel not found
watchEffect(() => {
  if (!travel.value && travelId.value) {
    toast.add({
      title: 'Viaje no encontrado',
      description: 'El viaje que buscas no existe',
      color: 'error',
    });
    router.push({ name: 'quotations-index' });
  }
});

// Para agregar una pestaña: crear app/pages/quotations/[id]/<name>.vue y agregarla aquí.
const tabs = computed<NavigationMenuItem[]>(() => {
  const quotationId = cotizacion.value?.id ?? '';
  const params = { id: travelId.value };
  const count = (n: number) => (n > 0 ? String(n) : undefined);

  return [
    { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: { name: 'quotation-detail', params }, exact: true },
    { label: 'Servicios', icon: 'i-lucide-building', to: { name: 'quotation-services', params }, badge: count(cotizacionStore.getProveedoresByQuotation(quotationId).length) },
    { label: 'Hospedaje', icon: 'i-lucide-door-open', to: { name: 'quotation-accommodation', params }, badge: count(cotizacionStore.getHospedajesByQuotation(quotationId).length) },
    { label: 'Autobuses', icon: 'i-lucide-bus', to: { name: 'quotation-buses', params }, badge: count(cotizacionStore.getBusesByQuotation(quotationId).length) },
    { label: 'Precios al público', icon: 'i-lucide-tag', to: { name: 'quotation-prices', params }, badge: count(cotizacionStore.getPreciosPublicosByQuotation(quotationId).length) },
  ];
});

// Form for creating a new cotizacion
const crearSchema = z.object({
  minimumSeatTarget: z.number().int().nonnegative().optional(),
  notes: textSchema({ max: 1000 }).optional(),
});

type CrearFormSchema = {
  minimumSeatTarget?: number;
  notes?: string;
};

const crearState = reactive<CrearFormSchema>({
  minimumSeatTarget: undefined,
  notes: '',
});

// Proxy sanitizado: filtra caracteres inválidos mientras el usuario escribe
const crearNotesInput = useSanitizedModel(() => crearState.notes ?? '', v => crearState.notes = v, sanitizeText);

const isCrearModalOpen = shallowRef(false);

function goToQuotations() {
  router.push({ name: 'quotations-index' });
}

function goToTravelDetail() {
  router.push({ name: 'travel-detail', params: { id: travelId.value } });
}

function openCrearModal() {
  isCrearModalOpen.value = true;
}

function closeCrearModal() {
  isCrearModalOpen.value = false;
}

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
            @click="goToQuotations"
          />
          <div>
            <h1 class="text-2xl font-bold">
              Cotización
            </h1>
            <p class="text-muted text-sm">
              {{ travel.label }}
            </p>
          </div>
        </div>
        <UButton
          icon="i-lucide-map"
          label="Ver viaje"
          variant="outline"
          color="neutral"
          @click="goToTravelDetail"
        />
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
            @click="openCrearModal"
          />
        </UCard>
      </div>

      <!-- Con cotización -->
      <template v-else>
        <!-- Estado + confirmar -->
        <CotizacionHeaderActions
          :quotation-id="cotizacion.id"
          :readonly="readonly"
          @cotizacion-confirmada="handleCotizacionConfirmada"
        />

        <UNavigationMenu
          :items="tabs"
          highlight
          class="border-b border-default"
        />

        <NuxtPage />
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
              v-model="crearNotesInput"
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
              @click="closeCrearModal"
            />
            <UButton
              type="submit"
              label="Crear Cotización"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
