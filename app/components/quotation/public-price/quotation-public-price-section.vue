<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { computed, h, reactive, ref, shallowRef } from 'vue';

import type { PublicPriceWarningAction, TravelerWithPrice } from '~/components/quotation/public-price/quotation-public-price-warning-modal.vue';
import type { QuotationPublicPrice, QuotationPublicPriceFormData, QuotationPublicPriceTemplate } from '~/types/quotation';

import { travelersByTravelQuery } from '~/queries/travelers';
import { formatCurrency } from '~/utils/currency';
import { sanitizeBusinessName, sanitizeText } from '~/utils/form-validation';
import { formatTravelerName } from '~/utils/traveler-labels';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const props = defineProps<Props>();

const quotationStore = useQuotationStore();
const toast = useToast();
// getReferencePriceMatrix reads these catalogs. Creating the stores here, in setup, keeps
// their catalog queries from starting during render (Vue warns: no active component instance).
useProviderStore();
useHotelRoomStore();

// Get the reference price matrix
const referencePriceMatrix = computed(() => {
  return quotationStore.getReferencePriceMatrix(props.quotationId);
});

// Get the added public prices
const publicPrices = computed(() => {
  return quotationStore.getPublicPricesByQuotation(props.quotationId);
});

// ============================================================================
// Visibility of the room type and description on the web
// ============================================================================

const quotation = computed(() => quotationStore.quotations.find(c => c.id === props.quotationId));

type PublicVisibilityField = 'showPublicRoomType' | 'showPublicDescription';

const PUBLIC_VISIBILITY_TOASTS: Record<PublicVisibilityField, { shown: string; hidden: string }> = {
  showPublicRoomType: {
    shown: 'Tipo de habitación visible en la web',
    hidden: 'Tipo de habitación oculto en la web',
  },
  showPublicDescription: {
    shown: 'Descripción visible en la web',
    hidden: 'Descripción oculta en la web',
  },
};

const savingVisibilityField = shallowRef<PublicVisibilityField | null>(null);

// Display preferences for the public web, not part of the quotation's structure, so they
// stay editable once the quotation is confirmed. The DB hides the fields in the RPC.
async function setPublicVisibility(field: PublicVisibilityField, value: boolean) {
  savingVisibilityField.value = field;
  const updated = await quotationStore.updateQuotation(props.quotationId, { [field]: value });
  savingVisibilityField.value = null;

  if (!updated) {
    toast.add({
      title: 'No se pudo guardar',
      description: quotationStore.error ?? 'Intenta de nuevo',
      color: 'error',
    });
    return;
  }

  toast.add({
    title: value ? PUBLIC_VISIBILITY_TOASTS[field].shown : PUBLIC_VISIBILITY_TOASTS[field].hidden,
    description: 'Aplica a todos los precios de venta del viaje.',
    color: 'success',
  });
}

// Helper to format currency
// Whether there is data
const hasData = computed(() => {
  return referencePriceMatrix.value.length > 0;
});

// ============================================================================
// Room type selection per hotel
// ============================================================================

type GroupEntry = { roomType: string; nightCount: number; costPerPerson: number; additionalDetails?: string };
type ReferencePrice = (typeof referencePriceMatrix.value)[number];

// Map<`${maxOccupancy}::${hotelName}`, localIndex>
const selection = reactive(new Map<string, number>());

function selectionKey(maxOccupancy: number, hotelName: string): string {
  return `${maxOccupancy}::${hotelName}`;
}

function getSelectedLocalIndex(maxOccupancy: number, hotelName: string): number {
  return selection.get(selectionKey(maxOccupancy, hotelName)) ?? 0;
}

function selectLocalIndex(maxOccupancy: number, hotelName: string, localIndex: number): void {
  selection.set(selectionKey(maxOccupancy, hotelName), localIndex);
}

function hotelGroups(accommodation: ReferencePrice['breakdown']['accommodation']): [string, GroupEntry[]][] {
  const map = new Map<string, GroupEntry[]>();
  for (const entry of accommodation) {
    if (!map.has(entry.hotelName))
      map.set(entry.hotelName, []);
    map.get(entry.hotelName)!.push({
      roomType: entry.roomType,
      nightCount: entry.nightCount,
      costPerPerson: entry.costPerPerson,
      additionalDetails: entry.additionalDetails,
    });
  }
  return [...map.entries()];
}

function selectedAccommodation(price: ReferencePrice): Array<GroupEntry & { hotelName: string }> {
  return hotelGroups(price.breakdown.accommodation).map(([hotelName, types]) => {
    const idx = getSelectedLocalIndex(price.maxOccupancy, hotelName);
    return { hotelName, ...(types[idx] ?? types[0]!) };
  });
}

function selectedAccommodationTotal(price: ReferencePrice): number {
  return selectedAccommodation(price).reduce((sum, entry) => sum + entry.costPerPerson, 0);
}

function selectedTotalPrice(price: ReferencePrice): number {
  return price.breakdown.seatPrice + selectedAccommodationTotal(price);
}

// ============================================================================
// Sale price CRUD
// ============================================================================

// Modal state
const isFormModalOpen = shallowRef(false);
const editingPrice = ref<QuotationPublicPrice | null>(null);
const template = ref<QuotationPublicPriceTemplate | null>(null);

const modalDescription = computed(() => {
  if (editingPrice.value)
    return 'Actualiza los detalles del precio';
  if (template.value)
    return 'Revisa y ajusta los datos precargados desde el precio de referencia';
  return 'Define un nuevo precio de venta para los viajeros';
});

// Open the form to add
function openForm() {
  editingPrice.value = null;
  template.value = null;
  isFormModalOpen.value = true;
}

// Prefilled values don't go through the sanitized proxies, so they're cleaned here
// so they don't fail validation on save (e.g. the '+' of combined beds).
function toBusinessName(value: string, max: number): string {
  return sanitizeBusinessName(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function occupancyLabel(maxOccupancy: number): string {
  return `Habitación para ${maxOccupancy} persona${maxOccupancy > 1 ? 's' : ''}`;
}

function nightsLabel(nightCount: number): string {
  return `${nightCount} noche${nightCount !== 1 ? 's' : ''}`;
}

// The "Detalles adicionales" of the selected room types; with several hotels, one per line with its name
function descriptionFromRooms(accommodation: Array<GroupEntry & { hotelName: string }>): string {
  const withDetails = accommodation.filter(entry => entry.additionalDetails?.trim());
  const lines = withDetails.length === 1
    ? [withDetails[0]!.additionalDetails!.trim()]
    : withDetails.map(entry => `${entry.hotelName} - ${entry.additionalDetails!.trim()}`);
  return sanitizeText(lines.join('\n')).slice(0, 500);
}

// Open the form to add, prefilled from a reference price
function openFromTemplate(price: ReferencePrice) {
  const accommodation = selectedAccommodation(price);
  const roomTypes = [...new Set(accommodation.map(entry => entry.roomType.replaceAll(' + ', ' y ')))];

  editingPrice.value = null;
  template.value = {
    priceType: toBusinessName(occupancyLabel(price.maxOccupancy), 100),
    maxOccupancy: price.maxOccupancy,
    pricePerPerson: Math.round(selectedTotalPrice(price) * 100) / 100,
    roomType: toBusinessName(roomTypes.join(', '), 100),
    description: descriptionFromRooms(accommodation),
  };
  isFormModalOpen.value = true;
}

function closeForm() {
  isFormModalOpen.value = false;
}

// Open the form to edit
function openEdit(price: QuotationPublicPrice) {
  editingPrice.value = price;
  template.value = null;
  isFormModalOpen.value = true;
}

// Save (create or update). The form already validated the data.
// ============================================================================
// Travelers who have each price (to warn before editing or deleting it)
// ============================================================================

const paymentStore = usePaymentStore();

// Only for the travelers' names in the warning; until they load the modal says "Viajero".
const { data: travelerData } = useQuery(() => travelersByTravelQuery(quotation.value?.travelId));
const travelersById = computed(() => new Map((travelerData.value?.travelers ?? []).map(t => [t.id, t])));

// Account configs aren't loaded on the quotation pages otherwise.
watch(() => quotation.value?.travelId, (travelId) => {
  if (travelId)
    paymentStore.fetchByTravel(travelId);
}, { immediate: true });

const travelersByPrice = computed(() => {
  const map = new Map<string, TravelerWithPrice[]>();
  const travelId = quotation.value?.travelId;
  for (const config of paymentStore.accountConfigs) {
    if (config.travelId !== travelId || !config.publicPriceId)
      continue;
    const traveler = travelersById.value.get(config.travelerId);
    const withPrice: TravelerWithPrice = {
      id: config.travelerId,
      name: traveler ? formatTravelerName(traveler) : 'Viajero',
      amount: config.publicPriceAmount,
    };
    map.set(config.publicPriceId, [...(map.get(config.publicPriceId) ?? []), withPrice]);
  }
  return map;
});

const isWarningOpen = shallowRef(false);
const isWarningLoading = shallowRef(false);
const warningAction = shallowRef<PublicPriceWarningAction>('edit');
const warningPrice = shallowRef<QuotationPublicPrice | null>(null);
// Edit waiting for the user's confirmation in the warning modal
const pendingEdit = shallowRef<QuotationPublicPriceFormData | null>(null);

const warningTravelers = computed(() =>
  warningPrice.value ? travelersByPrice.value.get(warningPrice.value.id) ?? [] : [],
);

function openWarning(action: PublicPriceWarningAction, price: QuotationPublicPrice) {
  warningAction.value = action;
  warningPrice.value = price;
  isWarningOpen.value = true;
}

async function confirmWarning() {
  const price = warningPrice.value;
  if (!price)
    return;

  isWarningLoading.value = true;
  if (warningAction.value === 'edit' && pendingEdit.value) {
    const ok = await updatePrice(price.id, pendingEdit.value);
    if (ok)
      isFormModalOpen.value = false;
  }
  else if (warningAction.value === 'delete') {
    await quotationStore.deletePublicPrice(price.id);
    toast.add({ title: 'Precio eliminado', color: 'success' });
  }
  isWarningLoading.value = false;
  isWarningOpen.value = false;
  pendingEdit.value = null;
}

async function updatePrice(id: string, data: QuotationPublicPriceFormData): Promise<boolean> {
  const updated = await quotationStore.updatePublicPrice(id, data);

  if (!updated) {
    toast.add({
      title: 'Error',
      description: 'No se pudo actualizar el precio',
      color: 'error',
    });
    return false;
  }

  toast.add({
    title: 'Precio actualizado',
    color: 'success',
  });
  return true;
}

async function savePrice(data: QuotationPublicPriceFormData) {
  if (editingPrice.value) {
    // Travelers already have this price: warn before saving, they keep their stored amount
    if (travelersByPrice.value.has(editingPrice.value.id)) {
      pendingEdit.value = data;
      openWarning('edit', editingPrice.value);
      return;
    }

    if (!await updatePrice(editingPrice.value.id, data))
      return;
  }
  else {
    // Create
    const response = await quotationStore.addPublicPrice(data);

    if ('error' in response) {
      toast.add({
        title: 'Error',
        description: response.error,
        color: 'error',
      });
      return;
    }

    toast.add({
      title: 'Precio agregado',
      color: 'success',
    });
  }

  isFormModalOpen.value = false;
}

// Eliminar precio: always asks first (listing the travelers that have it, if any)
function deletePrice(price: QuotationPublicPrice) {
  openWarning('delete', price);
}

// Row actions
function getRowActions(price: QuotationPublicPrice) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(price),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => deletePrice(price),
      },
    ],
  ];
}

// Table columns
const columns = computed<TableColumn<QuotationPublicPrice>[]>(() => {
  return [
    {
      accessorKey: 'priceType',
      header: 'Tipo',
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.priceType),
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      // One row per line (the template writes one per hotel), each cut with an ellipsis
      // instead of wrapping; the full text shows on hover.
      cell: ({ row }) => h(
        'div',
        { class: 'max-w-xs text-sm', title: row.original.description },
        row.original.description.split('\n').map(line => h('p', { class: 'truncate' }, line)),
      ),
    },
    {
      accessorKey: 'pricePerPerson',
      header: 'Precio/Persona',
      cell: ({ row }) => h('span', { class: 'font-bold text-primary' }, formatCurrency(row.original.pricePerPerson)),
    },
    {
      id: 'roomType',
      header: 'Tipo Habitación',
      cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.roomType ?? '—'),
    },
    {
      id: 'ageGroup',
      header: 'Grupo Etario',
      cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.ageGroup ?? '—'),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) =>
        h(resolveComponent('UDropdownMenu'), {
          items: getRowActions(row.original),
        }, () => h(resolveComponent('UButton'), {
          color: 'neutral',
          variant: 'ghost',
          icon: 'i-lucide-more-vertical',
          size: 'xs',
        })),
    },
  ];
});
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold flex items-center gap-2">
        <UIcon name="i-lucide-tag" class="w-5 h-5 text-muted" />
        Precio al Público
      </h2>
    </template>
    <div class="space-y-6">
      <!-- Reference prices based on costs -->
      <div v-if="hasData" class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">
          Precios de Referencia (Costo base)
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UCard
            v-for="(price, index) in referencePriceMatrix"
            :key="index"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-bed-double" class="w-4 h-4 text-muted" />
                  <p class="font-semibold">
                    {{ occupancyLabel(price.maxOccupancy) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-muted">
                    Precio por Persona
                  </p>
                  <p class="text-xl font-bold text-primary">
                    {{ formatCurrency(selectedTotalPrice(price)) }}
                  </p>
                </div>
              </div>
            </template>

            <div class="space-y-3 text-sm">
              <!-- Seat price -->
              <div class="flex justify-between items-center">
                <span class="text-muted">Precio Asiento Base</span>
                <span class="font-medium">{{ formatCurrency(price.breakdown.seatPrice) }}</span>
              </div>

              <USeparator />

              <!-- Accommodation per hotel -->
              <div class="space-y-2">
                <p class="text-xs font-semibold text-muted uppercase tracking-wide">
                  Hospedaje por Hotel
                </p>
                <div
                  v-for="[hotelName, types] in hotelGroups(price.breakdown.accommodation)"
                  :key="hotelName"
                  class="space-y-1"
                >
                  <!-- A single type: no radio -->
                  <template v-if="types.length === 1">
                    <div class="flex justify-between items-center pl-2">
                      <span class="text-muted">
                        {{ hotelName }}
                        <span class="text-xs opacity-60">· {{ types[0]!.roomType }} · {{ nightsLabel(types[0]!.nightCount) }}</span>
                      </span>
                      <span class="font-medium">{{ formatCurrency(types[0]!.costPerPerson) }}</span>
                    </div>
                  </template>
                  <!-- Several types: radio to pick one -->
                  <template v-else>
                    <div
                      v-for="(type, localIdx) in types"
                      :key="localIdx"
                      class="flex items-center gap-2 pl-2 cursor-pointer select-none rounded hover:bg-muted/10 py-0.5 transition-colors"
                      @click="selectLocalIndex(price.maxOccupancy, hotelName, localIdx)"
                    >
                      <UIcon
                        :name="getSelectedLocalIndex(price.maxOccupancy, hotelName) === localIdx ? 'i-lucide-circle-dot' : 'i-lucide-circle'"
                        class="w-4 h-4 shrink-0"
                        :class="getSelectedLocalIndex(price.maxOccupancy, hotelName) === localIdx ? 'text-primary' : 'text-muted'"
                      />
                      <span class="flex-1 text-muted">
                        {{ hotelName }}
                        <span class="text-xs opacity-60">· {{ type.roomType }} · {{ nightsLabel(type.nightCount) }}</span>
                      </span>
                      <span
                        class="font-medium"
                        :class="getSelectedLocalIndex(price.maxOccupancy, hotelName) === localIdx ? 'text-foreground' : 'text-muted'"
                      >
                        {{ formatCurrency(type.costPerPerson) }}
                      </span>
                    </div>
                  </template>
                </div>
              </div>

              <USeparator />

              <!-- Accommodation total -->
              <div class="flex justify-between items-center font-semibold">
                <span>Total Hospedaje</span>
                <span class="text-primary">{{ formatCurrency(selectedAccommodationTotal(price)) }}</span>
              </div>
            </div>

            <template #footer>
              <div class="flex justify-between items-center">
                <span class="font-bold">Total por Persona</span>
                <span class="text-lg font-bold text-primary">
                  {{ formatCurrency(selectedTotalPrice(price)) }}
                </span>
              </div>
              <div v-if="!props.readonly" class="flex justify-end mt-3">
                <UButton
                  icon="i-lucide-copy-plus"
                  size="xs"
                  variant="soft"
                  label="Usar como plantilla"
                  class="w-full sm:w-auto justify-center"
                  @click="openFromTemplate(price)"
                />
              </div>
            </template>
          </UCard>
        </div>
      </div>

      <!-- No data -->
      <EmptyState
        v-else
        section="prices"
        compact
      />

      <!-- Section to add sale prices (T8) -->
      <div class="pt-6 border-t space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-muted">
            Precios de Venta Personalizados
          </h3>
          <UButton
            v-if="!props.readonly"
            icon="i-lucide-plus"
            size="xs"
            label="Agregar Precio"
            @click="openForm"
          />
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:gap-8">
          <USwitch
            :model-value="quotation?.showPublicRoomType ?? true"
            :loading="savingVisibilityField === 'showPublicRoomType'"
            :disabled="savingVisibilityField !== null"
            label="Mostrar tipo de habitación en la web"
            description="Las camas de cada precio (p. ej. 1 cama king)."
            @update:model-value="value => setPublicVisibility('showPublicRoomType', value)"
          />
          <USwitch
            :model-value="quotation?.showPublicDescription ?? true"
            :loading="savingVisibilityField === 'showPublicDescription'"
            :disabled="savingVisibilityField !== null"
            label="Mostrar descripción en la web"
            description="El detalle de las habitaciones de cada precio."
            @update:model-value="value => setPublicVisibility('showPublicDescription', value)"
          />
        </div>

        <!-- Sale prices table -->
        <div v-if="publicPrices.length > 0">
          <UTable
            :data="publicPrices"
            :columns="columns"
          />
        </div>

        <!-- No prices added -->
        <EmptyState
          v-else
          section="prices"
          compact
        />
      </div>
    </div>

    <!-- Modal: Add/Edit Price -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="editingPrice ? 'Editar Precio' : 'Agregar Precio de Venta'"
      :description="modalDescription"
      class="sm:max-w-2xl"
    >
      <template #body>
        <QuotationPublicPriceForm
          :quotation-id="quotationId"
          :price="editingPrice"
          :template="template"
          @submit="savePrice"
          @cancel="closeForm"
        />
      </template>
    </UModal>

    <QuotationPublicPriceWarningModal
      v-model:open="isWarningOpen"
      :action="warningAction"
      :price="warningPrice"
      :travelers="warningTravelers"
      :loading="isWarningLoading"
      @confirm="confirmWarning"
    />
  </UCard>
</template>
