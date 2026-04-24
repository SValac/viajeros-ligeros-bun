<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { computed, h, reactive, ref, shallowRef } from 'vue';
import { z } from 'zod';

import type { QuotationPublicPrice, QuotationPublicPriceFormData } from '~/types/quotation';

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

type EntradaGrupo = { roomType: string; costPerPerson: number };

// Map<`::${hotelName}`, localIndex>
const seleccion = reactive(new Map<string, number>());

function seleccionKey(maxOccupancy: number, hotelName: string): string {
  return `::${hotelName}`;
}

function getSelectedLocalIndex(maxOccupancy: number, hotelName: string): number {
  return seleccion.get(seleccionKey(maxOccupancy, hotelName)) ?? 0;
}

function selectLocalIndex(maxOccupancy: number, hotelName: string, localIndex: number): void {
  seleccion.set(seleccionKey(maxOccupancy, hotelName), localIndex);
}

function gruposHotel(accommodation: Array<{ hotelName: string; roomType: string; costPerPerson: number }>): [string, EntradaGrupo[]][] {
  const map = new Map<string, EntradaGrupo[]>();
  for (const entry of accommodation) {
    if (!map.has(entry.hotelName))
      map.set(entry.hotelName, []);
    map.get(entry.hotelName)!.push({ roomType: entry.roomType, costPerPerson: entry.costPerPerson });
  }
  return [...map.entries()];
}

function totalHospedajeSeleccionado(price: { maxOccupancy: number; breakdown: { accommodation: Array<{ hotelName: string; roomType: string; costPerPerson: number }> } }): number {
  return gruposHotel(price.breakdown.accommodation).reduce((sum, [hotelName, tipos]) => {
    const idx = getSelectedLocalIndex(price.maxOccupancy, hotelName);
    return sum + (tipos[idx] ?? tipos[0]!).costPerPerson;
  }, 0);
}

function precioTotalSeleccionado(price: { maxOccupancy: number; breakdown: { seatPrice: number; accommodation: Array<{ hotelName: string; roomType: string; costPerPerson: number }> } }): number {
  return price.breakdown.seatPrice + totalHospedajeSeleccionado(price);
}

// ============================================================================
// CRUD de Precios de Venta
// ============================================================================

// Schema de validación
const formSchema = z.object({
  priceType: z.string({ message: 'Ingresa el tipo de precio' }).min(1, 'Campo requerido'),
  description: z.string({ message: 'Ingresa la descripción' }).min(1, 'Campo requerido'),
  pricePerPerson: z.number({ message: 'Ingresa el precio' }).positive('Debe ser mayor a 0'),
  roomType: z.string().optional(),
  ageGroup: z.string().optional(),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type FormSchema = z.infer<typeof formSchema>;

// Estado del formulario
const formState = reactive<Partial<FormSchema>>({
  priceType: '',
  description: '',
  pricePerPerson: 0,
  roomType: '',
  ageGroup: '',
  notes: '',
});

// Modal state
const isFormModalOpen = shallowRef(false);
const editingPrecio = ref<QuotationPublicPrice | null>(null);

// Reset formulario
function resetForm() {
  formState.priceType = '';
  formState.description = '';
  formState.pricePerPerson = 0;
  formState.roomType = '';
  formState.ageGroup = '';
  formState.notes = '';
  editingPrecio.value = null;
}

// Abrir formulario para agregar
function abrirFormulario() {
  resetForm();
  isFormModalOpen.value = true;
}

// Abrir formulario para editar
function abrirEdicion(price: QuotationPublicPrice) {
  editingPrecio.value = price;
  formState.priceType = price.priceType;
  formState.description = price.description;
  formState.pricePerPerson = price.pricePerPerson;
  formState.roomType = price.roomType ?? '';
  formState.ageGroup = price.ageGroup ?? '';
  formState.notes = price.notes ?? '';
  isFormModalOpen.value = true;
}

// Guardar (crear o actualizar)
function guardarPrecio() {
  const result = formSchema.safeParse(formState);
  if (!result.success) {
    toast.add({
      title: 'Error en el formulario',
      description: result.error.issues.map((e: any) => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  if (editingPrecio.value) {
    // Actualizar
    const updated = cotizacionStore.updatePrecioPublico(editingPrecio.value.id, {
      ...result.data,
    } as Partial<QuotationPublicPriceFormData>);

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
    const response = cotizacionStore.addPrecioPublico({
      quotationId: props.quotationId,
      ...result.data,
    } as QuotationPublicPriceFormData);

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

  resetForm();
  isFormModalOpen.value = false;
}

// Eliminar precio
function eliminarPrecio(id: string) {
  cotizacionStore.deletePrecioPublico(id);
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
                    Habitación para {{ price.maxOccupancy }} persona{{ price.maxOccupancy > 1 ? 's' : '' }}
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
            No hay precios de venta agregados. Use los precios de referencia anteriores como guía.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal: Agregar/Editar Precio -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="editingPrecio ? 'Editar Precio' : 'Agregar Precio de Venta'"
      :description="editingPrecio ? 'Actualiza los detalles del precio' : 'Define un nuevo precio de venta para los viajeros'"
      class="sm:max-w-xl"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="guardarPrecio">
          <!-- Tipo -->
          <UFormField label="Tipo de Precio" required>
            <UInput
              v-model="formState.priceType"
              placeholder="Ej: Habitación Sencilla, Niños 4-10 años"
            />
          </UFormField>

          <!-- Descripción -->
          <UFormField label="Descripción" required>
            <UInput
              v-model="formState.description"
              placeholder="Ej: En habitación para 1 persona"
            />
          </UFormField>

          <!-- Precio por Persona -->
          <UFormField label="Precio por Persona" required>
            <UInput
              v-model.number="formState.pricePerPerson"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 2550"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <!-- Tipo Habitación (opcional) -->
            <UFormField label="Tipo Habitación (opcional)">
              <UInput
                v-model="formState.roomType"
                placeholder="Ej: Sencilla, Doble"
              />
            </UFormField>

            <!-- Grupo Etario (opcional) -->
            <UFormField label="Grupo Etario (opcional)">
              <UInput
                v-model="formState.ageGroup"
                placeholder="Ej: Adultos, Niños"
              />
            </UFormField>
          </div>

          <!-- Notas -->
          <UFormField label="Notas (opcional)">
            <UTextarea
              v-model="formState.notes"
              placeholder="Observaciones adicionales..."
              :rows="2"
            />
          </UFormField>

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="isFormModalOpen = false"
            />
            <UButton
              type="submit"
              :label="editingPrecio ? 'Actualizar' : 'Agregar Precio'"
            />
          </div>
        </form>
      </template>
    </UModal>
  </UCard>
</template>
