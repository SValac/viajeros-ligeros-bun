<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import { z } from 'zod';

import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';
import { useQueryLoadState } from '~/queries/load-state';
import { quotationByTravelQuery } from '~/queries/quotations';
import { travelDetailQuery } from '~/queries/travels';
import { sanitizeText, textSchema } from '~/utils/form-validation';

// Padre de las pestañas de la cotización (app/pages/quotations/[id]/*). Muestra el
// encabezado, el estado y la navegación; las pestañas solo se renderizan cuando la
// cotización existe. Sin cotización, muestra el estado vacío para crearla.

const router = useRouter();
const toast = useToast();

const cotizacionStore = useCotizacionStore();

const { travelId, quotation: cotizacion, readonly } = useQuotationRoute();

// La cotización se copia al store en cada petición; las pestañas leen del store. La query
// la vuelve a pedir al regresar a la pestaña del navegador y tras cada escritura, así que
// también trae lo que se le debe a cada servicio opcional (cambia con los viajeros).
const quotationQuery = useQuery(() => quotationByTravelQuery(travelId.value));
const { refetch: refetchQuotation } = quotationQuery;
const quotationLoad = useQueryLoadState(quotationQuery);

const travelQuery = useQuery(() => travelDetailQuery(travelId.value));
const { data: travel, status, refetch: refetchTravel } = travelQuery;
const travelLoad = useQueryLoadState(travelQuery);

// Redirect if travel not found.
// `watch` con fuente explícita, no `watchEffect`: toast.add() lee estado reactivo interno
// y el efecto se volvería a disparar en bucle (toast + router.push infinitos).
// Espera a que la query resuelva: `undefined` = cargando, `null` = no existe o RLS lo oculta.
watch([status, travel], ([currentStatus, value]) => {
  if (currentStatus === 'success' && value === null && travelId.value) {
    toast.add({
      title: 'Viaje no encontrado',
      description: 'El viaje que buscas no existe',
      color: 'error',
    });
    router.push({ name: 'quotations-index' });
  }
}, { immediate: true });

// Para agregar una pestaña: crear app/pages/quotations/[id]/<name>.vue y agregarla aquí.
const tabs = computed<NavigationMenuItem[]>(() => {
  const quotationId = cotizacion.value?.id ?? '';
  const params = { id: travelId.value };
  const count = (n: number) => (n > 0 ? String(n) : undefined);

  return [
    { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: { name: 'quotation-detail', params }, exact: true },
    { label: 'Parámetros', icon: 'i-lucide-settings', to: { name: 'quotation-parameters', params } },
    { label: 'Proveedores', icon: 'i-lucide-building', to: { name: 'quotation-services', params }, badge: count(cotizacionStore.getProveedoresByQuotation(quotationId).length) },
    { label: 'Hospedaje', icon: 'i-lucide-door-open', to: { name: 'quotation-accommodation', params }, badge: count(cotizacionStore.getHospedajesByQuotation(quotationId).length) },
    { label: 'Autobuses', icon: 'i-lucide-bus', to: { name: 'quotation-buses', params }, badge: count(cotizacionStore.getBusesByQuotation(quotationId).length) },
    { label: 'Gastos', icon: 'i-lucide-receipt', to: { name: 'quotation-expenses', params }, badge: count(cotizacionStore.getGastosByQuotation(quotationId).length) },
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
    totalSeats: 0,
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
  <LoadState
    v-bind="travelLoad"
    label="el viaje"
    fill
    @retry="refetchTravel()"
  >
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

        <!-- Hasta que la cotización cargue (o si falla la primera vez), "Sin cotización" sería
           mentira. Si falla un refetch posterior, se queda lo que ya se tenía. -->
        <LoadState
          v-bind="quotationLoad"
          label="la cotización"
          @retry="refetchQuotation()"
        >
          <!-- Sin cotización -->
          <UCard v-if="!cotizacion">
            <EmptyState
              section="quotation"
              :actions="[{ label: 'Crear cotización', icon: 'i-lucide-plus', onClick: openCrearModal }]"
            />
          </UCard>

          <!-- Con cotización -->
          <template v-else>
            <!-- Estado + confirmar -->
            <QuotationHeaderActions
              :quotation-id="cotizacion.id"
              :readonly="readonly"
              @cotizacion-confirmada="handleCotizacionConfirmada"
            />

            <UNavigationMenu
              :items="tabs"
              highlight
              class="border-b border-default overflow-x-auto"
              :ui="{ root: '[&>div]:min-w-max' }"
            />

            <NuxtPage />
          </template>
        </LoadState>
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
            <UFormField label="Meta mínima de asientos" name="minimumSeatTarget">
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
  </LoadState>
</template>
