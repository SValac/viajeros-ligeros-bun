<script setup lang="ts">
import type { Traveler } from '~/types/traveler';

// Un representante con sus acompañantes (o los coordinadores): marcar el grupo completo o a
// cada uno.

export type OptionalServiceMember = {
  traveler: Traveler;
  takes: boolean;
  /** Coordinador con cortesía: no cuenta para el pago y no se marca. */
  courtesy: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  members: OptionalServiceMember[];
  busy?: boolean;
};

const { members, busy = false } = defineProps<Props>();

const emit = defineEmits<{
  change: [travelerIds: string[], toman: boolean];
}>();

const selectable = computed(() => members.filter(m => !m.courtesy));

const groupState = computed<boolean | 'indeterminate'>(() => {
  const taking = selectable.value.filter(m => m.takes).length;
  if (taking === 0)
    return false;
  return taking === selectable.value.length ? true : 'indeterminate';
});

function fullName(traveler: Traveler): string {
  return `${traveler.firstName} ${traveler.lastName}`.trim();
}

function setGroup(value: boolean | 'indeterminate') {
  emit('change', selectable.value.map(m => m.traveler.id), value === true);
}
</script>

<template>
  <section class="rounded-md border border-default">
    <header class="flex items-center gap-3 px-3 py-2 bg-elevated/50 border-b border-default rounded-t-md">
      <UCheckbox
        :model-value="groupState"
        :disabled="busy || selectable.length === 0"
        :aria-label="`Marcar a todo el grupo de ${title}`"
        @update:model-value="setGroup"
      />
      <div class="min-w-0">
        <p class="font-medium truncate">
          {{ title }}
        </p>
        <p class="text-xs text-muted">
          {{ subtitle }}
        </p>
      </div>
    </header>

    <ul class="grid gap-x-4 gap-y-1 p-3 sm:grid-cols-2">
      <li
        v-for="member in members"
        :key="member.traveler.id"
        class="flex items-center justify-between gap-2 min-h-8"
      >
        <UCheckbox
          :model-value="member.takes"
          :label="fullName(member.traveler)"
          :disabled="busy || member.courtesy"
          class="min-w-0"
          :ui="{ label: 'truncate' }"
          @update:model-value="value => emit('change', [member.traveler.id], value === true)"
        />
        <UBadge
          v-if="member.courtesy"
          label="Cortesía"
          color="info"
          variant="subtle"
          class="shrink-0"
        />
      </li>
    </ul>
  </section>
</template>
