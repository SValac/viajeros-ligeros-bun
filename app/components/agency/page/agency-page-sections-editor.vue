<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

import type { PageSection, PageSectionType } from '~/types/agency-profile';

import {
  createListKeys,
  createPageSection,
  moveListItem,
  PAGE_SECTION_LIMITS,
  PAGE_SECTION_TYPES,
} from '~/composables/agency-profile/use-page-sections-domain';

type Props = {
  /** Form path of the list inside the parent UForm state, e.g. `aboutPage.sections`. */
  name: string;
};

const { name } = defineProps<Props>();

// Sections of a public site page, in display order.
const sections = defineModel<PageSection[]>({ required: true });

const keyOf = createListKeys();

const canAdd = computed(() => sections.value.length < PAGE_SECTION_LIMITS.sections);

const addItems = computed<DropdownMenuItem[]>(() =>
  (Object.keys(PAGE_SECTION_TYPES) as PageSectionType[]).map(type => ({
    label: PAGE_SECTION_TYPES[type].label,
    description: PAGE_SECTION_TYPES[type].description,
    icon: PAGE_SECTION_TYPES[type].icon,
    onSelect: () => add(type),
  })),
);

function add(type: PageSectionType) {
  if (!canAdd.value)
    return;
  sections.value = [...sections.value, createPageSection(type)];
}

function remove(index: number) {
  sections.value = sections.value.filter((_, i) => i !== index);
}

function move(index: number, direction: -1 | 1) {
  sections.value = moveListItem(sections.value, index, direction);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Animates adding, removing and reordering sections. -->
    <div v-auto-animate class="space-y-4">
      <AgencyPageSectionCard
        v-for="(section, index) in sections"
        :key="keyOf(section)"
        v-model="sections[index]!"
        :name="`${name}.${index}`"
        :index="index"
        :is-first="index === 0"
        :is-last="index === sections.length - 1"
        @move="direction => move(index, direction)"
        @remove="remove(index)"
      />
    </div>

    <UFormField :name="name">
      <UDropdownMenu :items="addItems" :disabled="!canAdd">
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-chevron-down"
          :disabled="!canAdd"
        >
          Agregar sección ({{ sections.length }}/{{ PAGE_SECTION_LIMITS.sections }})
        </UButton>
      </UDropdownMenu>
    </UFormField>
  </div>
</template>
