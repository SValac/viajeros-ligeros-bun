<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui';

import type { EmptyStateSection } from '~/utils/empty-states';

import { EMPTY_STATES } from '~/utils/empty-states';

/**
 * The empty state of a list or a section: icon, title and text come from `EMPTY_STATES` (one per
 * section of the CRM), the actions from each screen.
 */
const { section, compact = false } = defineProps<{
  section: EmptyStateSection;
  /** Inside a card or a small panel: smaller, without the vertical padding of a whole list. */
  compact?: boolean;
  actions?: ButtonProps[];
}>();

const content = computed(() => EMPTY_STATES[section]);
</script>

<template>
  <UEmpty
    variant="naked"
    :size="compact ? 'sm' : 'md'"
    :icon="content.icon"
    :title="content.title"
    :description="content.description"
    :actions="actions"
    :class="compact ? 'py-4' : 'py-10'"
  />
</template>
