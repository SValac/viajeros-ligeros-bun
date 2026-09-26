<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { computed, h, reactive, ref, shallowRef } from 'vue';

import type { QuotationPublicPrice, QuotationPublicPriceFormData, QuotationPublicPriceTemplate } from '~/types/quotation';

import { sanitizeBusinessName, sanitizeText } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const props = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const toast = useToast();

// Obtener matriz de precios de referencia
const matrizPreciosReferencia = computed(() => {
  return cotizacionStore.getMatrizPreciosReferencia(props.quotationId);
});

// Obtener precios públicos agregados
const preciosPublicos = computed(() => {
  return cotizacionStore.getPreciosPublicosByQuotation(props.quotationId);
});

// Helper para formatear moneda
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

// Determinar si hay datos
const hayDatos = computed(() => {
  return matrizPreciosReferencia.value.length > 0;
});

// ============================================================================
// Selección de tipo de habitación por hotel
// ============================================================================

type EntradaGrupo = { roomType: string; costPerPerson: number; additionalDetails?: string };
type PrecioReferencia = (typeof matrizPreciosReferencia.value)[number];

// Map<`${maxOccupancy}::${hotelName}`, localIndex>
const seleccion = reactive(new Map<string, number>());

function seleccionKey(maxOccupancy: number, hotelName: string): string {
  return `${maxOccupancy}::${hotelName}`;
}

function getSelectedLocalIndex(maxOccupancy: number, hotelName: string): number {
  return seleccion.get(seleccionKey(maxOccupancy, hotelName)) ?? 0;
}

function selectLocalIndex(maxOccupancy: number, hotelName: string, localIndex: number): void {
  seleccion.set(seleccionKey(maxOccupancy, hotelName), localIndex);
}

function gruposHotel(accommodation: PrecioReferencia['breakdown']['accommodation']): [string, EntradaGrupo[]][] {
  const map = new Map<string, EntradaGrupo[]>();
  for (const entry of accommodation) {
    if (!map.has(entry.hotelName))
      map.set(entry.hotelName, []);
    map.get(entry.hotelName)!.push({
      roomType: entry.roomType,
      costPerPerson: entry.costPerPerson,
      additionalDetails: entry.additionalDetails,
    });
  }
  return [...map.entries()];
}

function hospedajeSeleccionado(price: PrecioReferencia): Array<EntradaGrupo & { hotelName: string }> {
  return gruposHotel(price.breakdown.accommodation).map(([hotelName, tipos]) => {
    const idx = getSelectedLocalIndex(price.maxOccupancy, hotelName);
    return { hotelName, ...(tipos[idx] ?? tipos[0]!) };
  });
}

function totalHospedajeSeleccionado(price: PrecioReferencia): number {
  return hospedajeSeleccionado(price).reduce((sum, entrada) => sum + entrada.costPerPerson, 0);
}

function precioTotalSeleccionado(price: PrecioReferencia): number {
  return price.breakdown.seatPrice + totalHospedajeSeleccionado(price);
}

// ============================================================================
// CRUD de Precios de Venta
// ============================================================================

// Modal state
const isFormModalOpen = shallowRef(false);
const editingPrecio = ref<QuotationPublicPrice | null>(null);
const plantilla = ref<QuotationPublicPriceTemplate | null>(null);

const modalDescription = computed(() => {
  if (editingPrecio.value)
    return 'Actualiza los detalles del precio';
  if (plantilla.value)
    return 'Revisa y ajusta los datos precargados desde el precio de referencia';
  return 'Define un nuevo precio de venta para los viajeros';
});

// Abrir formulario para agregar
function abrirFormulario() {
  editingPrecio.value = null;
  plantilla.value = null;
  isFormModalOpen.value = true;
}

// Los valores precargados no pasan por los proxies sanitizados, así que se limpian aquí
// para que no fallen la validación al guardar (p. ej. el '+' de las camas combinadas).
function toBusinessName(value: string, max: number): string {
  return sanitizeBusinessName(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function etiquetaOcupacion(maxOccupancy: number): string {
  return `Habitación para ${maxOccupancy} persona${maxOccupancy > 1 ? 's' : ''}`;
}

// "Detalles adicionales" de los tipos de habitación seleccionados; con varios hoteles, uno por línea con su nombre
function descripcionDesdeHabitaciones(hospedaje: Array<EntradaGrupo & { hotelName: string }>): string {
  const conDetalles = hospedaje.filter(entrada => entrada.additionalDetails?.trim());
  const lineas = conDetalles.length === 1
    ? [conDetalles[0]!.additionalDetails!.trim()]
    : conDetalles.map(entrada => `${entrada.hotelName} - ${entrada.additionalDetails!.trim()}`);
  return sanitizeText(lineas.join('\n')).slice(0, 500);
}

// Abrir formulario para agregar, precargado con un precio de referencia
function abrirDesdePlantilla(price: PrecioReferencia) {
  const hospedaje = hospedajeSeleccionado(price);
  const tiposHabitacion = [...new Set(hospedaje.map(entrada => entrada.roomType.replaceAll(' + ', ' y ')))];

  editingPrecio.value = null;
  plantilla.value = {
    priceType: toBusinessName(etiquetaOcupacion(price.maxOccupancy), 100),
    pricePerPerson: Math.round(precioTotalSeleccionado(price) * 100) / 100,
    roomType: toBusinessName(tiposHabitacion.join(', '), 100),
    description: descripcionDesdeHabitaciones(hospedaje),
  };
  isFormModalOpen.value = true;
}

function cerrarFormulario() {
  isFormModalOpen.value = false;
}

// Abrir formulario para editar
function abrirEdicion(price: QuotationPublicPrice) {
  editingPrecio.value = price;
  plantilla.value = null;
  isFormModalOpen.value = true;
}

// Guardar (crear o actualizar). El formulario ya validó los datos.
async function guardarPrecio(data: QuotationPublicPriceFormData) {
  if (editingPrecio.value) {
    // Actualizar
    const updated = await cotizacionStore.updatePrecioPublico(editingPrecio.value.id, data);

    if (!updated) {
      toast.add({
        title: 'Error',
        description: 'No se pudo actualizar el precio',
        color: 'error',
      });
      return;
    }

    toast.add({
      title: 'Precio actualizado',
      color: 'success',
    });
  }
  else {
    // Crear
    const response = await cotizacionStore.addPrecioPublico(data);

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

// Eliminar precio
async function eliminarPrecio(id: string) {
  await cotizacionStore.deletePrecioPublico(id);
  toast.add({
    title: 'Precio eliminado',
    color: 'success',
  });
}

// Acciones por fila
function getRowActions(price: QuotationPublicPrice) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => abrirEdicion(price),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => eliminarPrecio(price.id),
      },
    ],
  ];
}

// Columnas de la tabla
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
      cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.description),
    },
    {
      accessorKey: 'precioPorPersona',
      header: 'Precio/Persona',
      cell: ({ row }) => h('span', { class: 'font-bold text-primary' }, formatCurrency(row.original.pricePerPerson)),
    },
    {
      id: 'tipoHabitacion',
      header: 'Tipo Habitación',
      cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.roomType ?? '—'),
    },
    {
      id: 'grupoEdad',
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
        <span class="i-lucide-tag w-5 h-5 text-muted" />
        Precio al Público
      </h2>
    </template>
    <div class="space-y-6">
      <!-- Precios de referencia basados en costos -->
      <div v-if="hayDatos" class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">
          Precios de Referencia (Costo base)
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UCard
            v-for="(price, index) in matrizPreciosReferencia"
            :key="index"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="i-lucide-bed-double w-4 h-4 text-muted" />
                  <p class="font-semibold">
                    {{ etiquetaOcupacion(price.maxOccupancy) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-muted">
                    Precio por Persona
                  </p>
                  <p class="text-xl font-bold text-primary">
                    {{ formatCurrency(precioTotalSeleccionado(price)) }}
                  </p>
                </div>
              </div>
            </template>

            <div class="space-y-3 text-sm">
              <!-- Precio asiento -->
              <div class="flex justify-between items-center">
                <span class="text-muted">Precio Asiento Base</span>
                <span class="font-medium">{{ formatCurrency(price.breakdown.seatPrice) }}</span>
              </div>

              <USeparator />

              <!-- Hospedaje por hotel -->
              <div class="space-y-2">
                <p class="text-xs font-semibold text-muted uppercase tracking-wide">
                  Hospedaje por Hotel
                </p>
                <div
                  v-for="[hotelName, tipos] in gruposHotel(price.breakdown.accommodation)"
                  :key="hotelName"
                  class="space-y-1"
                >
                  <!-- Un solo tipo: sin radio -->
                  <template v-if="tipos.length === 1">
                    <div class="flex justify-between items-center pl-2">
                      <span class="text-muted">
                        {{ hotelName }}
                        <span class="text-xs opacity-60">· {{ tipos[0]!.roomType }}</span>
                      </span>
                      <span class="font-medium">{{ formatCurrency(tipos[0]!.costPerPerson) }}</span>
                    </div>
                  </template>
                  <!-- Múltiples tipos: radio para elegir -->
                  <template v-else>
                    <div
                      v-for="(tipo, localIdx) in tipos"
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
                        <span class="text-xs opacity-60">· {{ tipo.roomType }}</span>
                      </span>
                      <span
                        class="font-medium"
                        :class="getSelectedLocalIndex(price.maxOccupancy, hotelName) === localIdx ? 'text-foreground' : 'text-muted'"
                      >
                        {{ formatCurrency(tipo.costPerPerson) }}
                      </span>
                    </div>
                  </template>
                </div>
              </div>

              <USeparator />

              <!-- Total hospedaje -->
              <div class="flex justify-between items-center font-semibold">
                <span>Total Hospedaje</span>
                <span class="text-primary">{{ formatCurrency(totalHospedajeSeleccionado(price)) }}</span>
              </div>
            </div>

            <template #footer>
              <div class="flex justify-between items-center">
                <span class="font-bold">Total por Persona</span>
                <span class="text-lg font-bold text-primary">
                  {{ formatCurrency(precioTotalSeleccionado(price)) }}
                </span>
              </div>
              <div v-if="!props.readonly" class="flex justify-end mt-3">
                <UButton
                  icon="i-lucide-copy-plus"
                  size="xs"
                  variant="soft"
                  label="Usar como plantilla"
                  class="w-full sm:w-auto justify-center"
                  @click="abrirDesdePlantilla(price)"
                />
              </div>
            </template>
          </UCard>
        </div>
      </div>

      <!-- Sin datos -->
      <div v-else class="bg-muted/10 rounded-lg p-6 text-center text-muted">
        <span class="i-lucide-info w-6 h-6 mx-auto mb-2 block" />
        <p class="text-sm">
          Agregue proveedores y hospedajes para ver los precios de referencia
        </p>
      </div>

      <!-- Sección para agregar precios de venta (T8) -->
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
            @click="abrirFormulario"
          />
        </div>

        <!-- Tabla de precios de venta -->
        <div v-if="preciosPublicos.length > 0">
          <UTable
            :data="preciosPublicos"
            :columns="columns"
          />
        </div>

        <!-- Sin precios agregados -->
        <div v-else class="bg-muted/10 rounded-lg p-6 text-center text-muted">
          <span class="i-lucide-inbox w-6 h-6 mx-auto mb-2 block opacity-50" />
          <p class="text-sm">
            No hay precios de venta agregados. Use «Usar como plantilla» en un precio de referencia para empezar.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal: Agregar/Editar Precio -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="editingPrecio ? 'Editar Precio' : 'Agregar Precio de Venta'"
      :description="modalDescription"
      class="sm:max-w-2xl"
    >
      <template #body>
        <CotizacionPrecioPublicoForm
          :quotation-id="quotationId"
          :precio="editingPrecio"
          :plantilla="plantilla"
          @submit="guardarPrecio"
          @cancel="cerrarFormulario"
        />
      </template>
    </UModal>
  </UCard>
</template>
