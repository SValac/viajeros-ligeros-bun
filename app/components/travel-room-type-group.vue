<script setup lang="ts">
type Props = {
  /** Room type's own description (e.g. "Suite junior con jacuzzi"). */
  details?: string;
  /** Room type's beds, already formatted (e.g. "1 cama king"). */
  beds?: string;
  maxOccupancy?: number;
  roomCount: number;
  /** Rooms of this type the hotel's catalog says it has; going over only warns. */
  catalogRoomCount?: number;
  /** Rooms whose type the quotation doesn't list: shown so they aren't hidden, but no adding. */
  unquoted?: boolean;
  adding?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  details: undefined,
  beds: undefined,
  maxOccupancy: undefined,
  catalogRoomCount: undefined,
  unquoted: false,
  adding: false,
});

const emit = defineEmits<{
  addRoom: [];
}>();

const title = computed(() => {
  if (props.unquoted)
    return 'Tipo fuera de la cotización';
  return props.details || props.beds || 'Habitación';
});

const subtitle = computed(() => {
  const parts: string[] = [];
  if (props.details && props.beds)
    parts.push(props.beds);
  if (props.maxOccupancy)
    parts.push(`${props.maxOccupancy} persona${props.maxOccupancy === 1 ? '' : 's'}`);
  return parts.join(' · ');
});

const overCatalog = computed(() =>
  props.catalogRoomCount !== undefined && props.roomCount > props.catalogRoomCount,
);
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-start gap-2 min-w-0">
        <UIcon name="i-lucide-door-open" class="size-4 text-muted mt-0.5 shrink-0" />
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-semibold text-sm">
              {{ title }}
            </h3>
            <UBadge
              :label="`${roomCount} hab.`"
              variant="subtle"
              color="neutral"
            />
            <UBadge
              v-if="overCatalog"
              :label="`El catálogo del hotel tiene ${catalogRoomCount}`"
              icon="i-lucide-triangle-alert"
              variant="subtle"
              color="warning"
            />
          </div>
          <p v-if="subtitle" class="text-xs text-muted">
            {{ subtitle }}
          </p>
        </div>
      </div>
      <UButton
        v-if="!unquoted"
        icon="i-lucide-plus"
        label="Agregar habitación"
        size="sm"
        variant="outline"
        :loading="adding"
        @click="emit('addRoom')"
      />
    </div>

    <p v-if="unquoted" class="text-xs text-warning">
      Estas habitaciones no cuentan en el costo del hotel. Saca a sus viajeros y elimínalas, o vuelve a agregar el tipo en la cotización.
    </p>

    <div
      v-if="roomCount > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <slot />
    </div>
    <p v-else class="text-sm text-muted rounded-lg border border-dashed border-default px-4 py-3">
      Aún no hay habitaciones de este tipo en el viaje.
    </p>
  </section>
</template>
