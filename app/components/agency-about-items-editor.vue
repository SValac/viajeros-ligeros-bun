<script setup lang="ts" generic="T extends AboutPageStepItem">
import type { AboutPageStepItem } from '~/types/agency-profile';

import { ABOUT_PAGE_LIMITS, createListKeys, moveListItem } from '~/composables/agency-profile/use-about-page-domain';

type Props = {
  /** Form path of the list, e.g. `aboutPage.sections.2.items`. */
  name: string;
  /** Singular label shown on each item ("Tarjeta", "Paso"). */
  itemLabel: string;
  min: number;
  max: number;
  create: () => T;
};

const { name, itemLabel, min, max, create } = defineProps<Props>();

defineSlots<{
  /** Extra fields for an item (e.g. the icon picker of a feature card). */
  'item-extra'?: (props: { item: T; index: number; path: string }) => unknown;
}>();

const items = defineModel<T[]>({ required: true });

const keyOf = createListKeys();

const canAdd = computed(() => items.value.length < max);
const canRemove = computed(() => items.value.length > min);

function add() {
  items.value = [...items.value, create()];
}

function remove(index: number) {
  items.value = items.value.filter((_, i) => i !== index);
}

function move(index: number, direction: -1 | 1) {
  items.value = moveListItem(items.value, index, direction);
}

function counter(value: string, limit: number) {
  return `${value.length}/${limit}`;
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(item, index) in items"
      :key="keyOf(item)"
      class="space-y-3 rounded-md border border-default p-3"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium text-muted">{{ itemLabel }} {{ index + 1 }}</span>
        <div class="flex gap-1">
          <UButton
            icon="i-lucide-arrow-up"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="index === 0"
            :aria-label="`Subir ${itemLabel.toLowerCase()} ${index + 1}`"
            @click="move(index, -1)"
          />
          <UButton
            icon="i-lucide-arrow-down"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="index === items.length - 1"
            :aria-label="`Bajar ${itemLabel.toLowerCase()} ${index + 1}`"
            @click="move(index, 1)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            :disabled="!canRemove"
            :aria-label="`Quitar ${itemLabel.toLowerCase()} ${index + 1}`"
            @click="remove(index)"
          />
        </div>
      </div>

      <UFormField
        label="Título"
        :name="`${name}.${index}.title`"
        required
      >
        <UInput
          v-model="item.title"
          :maxlength="ABOUT_PAGE_LIMITS.itemTitle"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Descripción"
        :name="`${name}.${index}.description`"
        :hint="counter(item.description, ABOUT_PAGE_LIMITS.itemDescription)"
        required
      >
        <UTextarea
          v-model="item.description"
          :rows="2"
          autoresize
          :maxlength="ABOUT_PAGE_LIMITS.itemDescription"
          class="w-full"
        />
      </UFormField>

      <slot
        name="item-extra"
        :item="item"
        :index="index"
        :path="`${name}.${index}`"
      />
    </div>

    <UFormField :name="name">
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="!canAdd"
        @click="add"
      >
        Agregar {{ itemLabel.toLowerCase() }} ({{ items.length }}/{{ max }})
      </UButton>
    </UFormField>
  </div>
</template>
