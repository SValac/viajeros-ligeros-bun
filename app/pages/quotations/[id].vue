<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import { z } from 'zod';

import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';
import { useTravelQuotation } from '~/composables/quotation/use-travel-quotation';
import { useQueryLoadState } from '~/queries/load-state';
import { travelDetailQuery } from '~/queries/travels';
import { sanitizeText, textSchema } from '~/utils/form-validation';

// Parent of the quotation tabs (app/pages/quotations/[id]/*). Shows the
// header, the status and the navigation; the tabs only render when the
// quotation exists. Without a quotation, shows the empty state to create it.

const router = useRouter();
const toast = useToast();

const quotationStore = useQuotationStore();

const { travelId, quotation, readonly } = useQuotationRoute();

// The quotation is copied into the store on every request; the tabs read from the store. The query
// refetches it when returning to the browser tab and after every write, so it
// also brings what is owed to each optional service (it changes with the travelers).
const { load: quotationLoad, refetch: refetchQuotation } = useTravelQuotation(travelId);

const travelQuery = useQuery(() => travelDetailQuery(travelId.value));
const { data: travel, status, refetch: refetchTravel } = travelQuery;
const travelLoad = useQueryLoadState(travelQuery);

// Redirect if travel not found.
// `watch` with an explicit source, not `watchEffect`: toast.add() reads internal reactive state
// and the effect would retrigger in a loop (endless toast + router.push).
// Waits for the query to resolve: `undefined` = loading, `null` = doesn't exist or RLS hides it.
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

// To add a tab: create app/pages/quotations/[id]/<name>.vue and add it here.
const tabs = computed<NavigationMenuItem[]>(() => {
  const quotationId = quotation.value?.id ?? '';
  const params = { id: travelId.value };
  const count = (n: number) => (n > 0 ? String(n) : undefined);

  return [
    { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: { name: 'quotation-detail', params }, exact: true },
    { label: 'Parámetros', icon: 'i-lucide-settings', to: { name: 'quotation-parameters', params } },
    { label: 'Proveedores', icon: 'i-lucide-building', to: { name: 'quotation-services', params }, badge: count(quotationStore.getProvidersByQuotation(quotationId).length) },
    { label: 'Hospedaje', icon: 'i-lucide-door-open', to: { name: 'quotation-accommodation', params }, badge: count(quotationStore.getAccommodationsByQuotation(quotationId).length) },
    { label: 'Autobuses', icon: 'i-lucide-bus', to: { name: 'quotation-buses', params }, badge: count(quotationStore.getBusesByQuotation(quotationId).length) },
    { label: 'Gastos', icon: 'i-lucide-receipt', to: { name: 'quotation-expenses', params }, badge: count(quotationStore.getExpensesByQuotation(quotationId).length) },
    { label: 'Precios al público', icon: 'i-lucide-tag', to: { name: 'quotation-prices', params }, badge: count(quotationStore.getPublicPricesByQuotation(quotationId).length) },
  ];
});

// Form for creating a new quotation
const createSchema = z.object({
  minimumSeatTarget: z.number().int().nonnegative().optional(),
  notes: textSchema({ max: 1000 }).optional(),
});

type CreateFormSchema = {
  minimumSeatTarget?: number;
  notes?: string;
};

const createState = reactive<CreateFormSchema>({
  minimumSeatTarget: undefined,
  notes: '',
});

// Sanitized proxy: filters out invalid characters while the user types
const createNotesInput = useSanitizedModel(() => createState.notes ?? '', v => createState.notes = v, sanitizeText);

const isCreateModalOpen = shallowRef(false);

function goToQuotations() {
  router.push({ name: 'quotations-index' });
}

function goToTravelDetail() {
  router.push({ name: 'travel-detail', params: { id: travelId.value } });
}

function openCreateModal() {
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  isCreateModalOpen.value = false;
}

async function handleCreateQuotation() {
  const result = createSchema.safeParse(createState);
  if (!result.success)
    return;

  try {
    await quotationStore.createQuotation({
      travelId: travelId.value,
      seatPrice: 0,
      totalSeats: 0,
      minimumSeatTarget: result.data.minimumSeatTarget ?? 0,
      status: 'draft',
      notes: result.data.notes,
    });

    toast.add({ title: 'Cotización creada', color: 'success' });
    isCreateModalOpen.value = false;
  }
  catch (e) {
    toast.add({
      title: 'Error',
      description: e instanceof Error ? e.message : 'No se pudo crear la cotización',
      color: 'error',
    });
  }
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

        <!-- Until the quotation loads (or if the first load fails), "Sin cotización" would be a lie. If a later refetch fails, what was already there stays. -->
        <LoadState
          v-bind="quotationLoad"
          label="la cotización"
          @retry="refetchQuotation()"
        >
          <!-- No quotation -->
          <UCard v-if="!quotation">
            <EmptyState
              section="quotation"
              :actions="[{ label: 'Crear cotización', icon: 'i-lucide-plus', onClick: openCreateModal }]"
            />
          </UCard>

          <!-- With a quotation -->
          <template v-else>
            <!-- Status + confirm -->
            <QuotationHeaderActions
              :quotation-id="quotation.id"
              :readonly="readonly"
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

      <!-- Modal: create quotation -->
      <UModal
        v-model:open="isCreateModalOpen"
        title="Crear Cotización"
        description="Define los parámetros iniciales de la cotización"
        class="sm:max-w-lg"
      >
        <template #body>
          <UForm
            :schema="createSchema"
            :state="createState"
            class="space-y-4"
            @submit="handleCreateQuotation"
          >
            <UFormField label="Meta mínima de asientos" name="minimumSeatTarget">
              <UInput
                v-model.number="createState.minimumSeatTarget"
                type="number"
                placeholder="Ej. 30"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Notas" name="notes">
              <UTextarea
                v-model="createNotesInput"
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
                @click="closeCreateModal"
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
