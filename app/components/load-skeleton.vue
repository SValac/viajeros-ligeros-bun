<script setup lang="ts">
export type LoadSkeletonVariant = 'table' | 'cards' | 'detail' | 'panel' | 'lines' | 'form';

/**
 * Gray shapes of what is loading, shown by `LoadState` and by screens that wait on a store. One
 * preset per kind of content, not one per screen: close enough that the page doesn't jump when
 * the data arrives.
 */
const { variant, stats, label } = defineProps<{
  variant: LoadSkeletonVariant;
  /** StatCards above the content, as many as the screen has. With a table, it goes in a card. */
  stats?: 3 | 4;
  /** What is loading, with its article ("los viajes"), for screen readers. */
  label?: string;
}>();

// Full class names so Tailwind sees them
const STATS_GRID = { 3: 'md:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4' } as const;
// Uneven widths, shifted on each row, so the rows read as text and not as bars
const COLUMN_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/4', 'w-1/3'];
const LINE_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'];
const TABLE_ROWS = 5;
const CARDS = 6;
const FORM_FIELDS = 4;

// A table under stats sits in its own card, like on the real pages; alone, its parent has one
const UCard = resolveComponent('UCard');
const tableWrapper = computed(() => (stats ? UCard : 'div'));
const statusText = computed(() => (label ? `Cargando ${label}…` : 'Cargando…'));
</script>

<template>
  <div role="status">
    <span class="sr-only">{{ statusText }}</span>
    <!-- Each USkeleton is a role="alert"; the status above is the only thing to announce -->
    <div aria-hidden="true" class="space-y-6">
      <div
        v-if="stats"
        class="grid grid-cols-1 gap-4"
        :class="STATS_GRID[stats]"
      >
        <UCard v-for="stat in stats" :key="stat">
          <div class="space-y-2">
            <USkeleton class="h-4 w-28" />
            <USkeleton class="h-8 w-24" />
          </div>
        </UCard>
      </div>

      <component :is="tableWrapper" v-if="variant === 'table'">
        <div class="space-y-4">
          <div class="grid grid-cols-4 gap-4 border-b border-default pb-3">
            <USkeleton
              v-for="width in COLUMN_WIDTHS"
              :key="width"
              class="h-4"
              :class="width"
            />
          </div>
          <div
            v-for="row in TABLE_ROWS"
            :key="row"
            class="grid grid-cols-4 gap-4"
          >
            <USkeleton
              v-for="(_, column) in COLUMN_WIDTHS"
              :key="column"
              class="h-5"
              :class="COLUMN_WIDTHS[(row + column) % COLUMN_WIDTHS.length]"
            />
          </div>
        </div>
      </component>

      <div v-else-if="variant === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="card in CARDS" :key="card">
          <div class="space-y-3">
            <USkeleton class="h-5 w-1/2" />
            <USkeleton class="h-4 w-3/4" />
            <USkeleton class="h-4 w-1/3" />
          </div>
        </UCard>
      </div>

      <template v-else-if="variant === 'detail'">
        <div class="space-y-2">
          <USkeleton class="h-8 w-64 max-w-full" />
          <USkeleton class="h-4 w-96 max-w-full" />
        </div>
        <UCard>
          <div class="space-y-3">
            <USkeleton
              v-for="width in LINE_WIDTHS"
              :key="width"
              class="h-4"
              :class="width"
            />
          </div>
        </UCard>
      </template>

      <UCard v-else-if="variant === 'form'">
        <div class="space-y-6">
          <div
            v-for="field in FORM_FIELDS"
            :key="field"
            class="space-y-2"
          >
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-9 w-full" />
          </div>
        </div>
      </UCard>

      <!-- `panel` is these lines in a card; `lines` goes bare, inside a card the screen already has -->
      <component :is="variant === 'lines' ? 'div' : UCard" v-else>
        <div class="space-y-3">
          <USkeleton class="h-5 w-1/3" />
          <USkeleton
            v-for="width in LINE_WIDTHS"
            :key="width"
            class="h-4"
            :class="width"
          />
        </div>
      </component>
    </div>
  </div>
</template>
