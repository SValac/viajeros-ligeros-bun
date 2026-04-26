<script setup lang="ts">
type Props = {
  seatNumber: number;
  status: 'available' | 'occupied';
  passengerName?: string;
  boardingPoint?: string;
  isRepresentative?: boolean;
  representativeName?: string;
};

const props = defineProps<Props>();

const cardClass = computed(() => {
  if (props.status === 'available') {
    return 'border-default bg-elevated text-default hover:bg-muted';
  }

  if (props.isRepresentative) {
    return 'border-2 border-primary-500 bg-primary-50 text-primary-900';
  }

  return 'border-2 border-secondary-400 bg-secondary-50 text-secondary-900';
});
</script>

<template>
  <div
    class="h-20 rounded-lg border p-2 transition flex flex-col justify-between cursor-pointer"
    :class="cardClass"
  >
    <div class="flex items-start justify-between gap-2">
      <span class="text-xs font-semibold">
        Asiento {{ seatNumber }}
      </span>
      <span
        v-if="status === 'available'"
        class="text-[10px] font-medium"
      >
        Disponible
      </span>
    </div>

    <div v-if="status === 'occupied'" class="space-y-0.5">
      <div class="flex items-center gap-1 text-xs font-semibold truncate">
        <UIcon
          v-if="isRepresentative"
          name="i-lucide-user-star"
          class="size-5 shrink-0 text-primary-600"
        />
        <span class="truncate">{{ passengerName }}</span>
      </div>
      <p
        v-if="boardingPoint"
        class="text-[10px] opacity-90 truncate"
      >
        {{ boardingPoint }}
      </p>
      <p
        v-if="representativeName"
        class="text-[10px] opacity-90 truncate"
      >
        Rep: {{ representativeName }}
      </p>
    </div>
  </div>
</template>
