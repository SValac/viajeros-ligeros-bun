<script setup lang="ts">
import type { AboutPageSection } from '~/types/agency-profile';

import {
  ABOUT_PAGE_LIMITS,
  ABOUT_SECTION_TYPES,
  createFeatureItem,
  createStepItem,
} from '~/composables/agency-profile/use-about-page-domain';

type Props = {
  /** Form path of the section, e.g. `aboutPage.sections.2`. */
  name: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
};

const { name, index, isFirst, isLast } = defineProps<Props>();

const emit = defineEmits<{
  move: [direction: -1 | 1];
  remove: [];
}>();

const section = defineModel<AboutPageSection>({ required: true });

const typeInfo = computed(() => ABOUT_SECTION_TYPES[section.value.type]);

function counter(value: string, limit: number) {
  return `${value.length}/${limit}`;
}
</script>

<template>
  <div class="space-y-4 rounded-lg border border-default bg-default p-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UIcon :name="typeInfo.icon" class="size-5 text-primary" />
        <span class="font-medium text-highlighted">Sección {{ index + 1 }} · {{ typeInfo.label }}</span>
      </div>
      <div class="flex gap-1">
        <UButton
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="isFirst"
          :aria-label="`Subir sección ${index + 1}`"
          @click="emit('move', -1)"
        />
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="isLast"
          :aria-label="`Bajar sección ${index + 1}`"
          @click="emit('move', 1)"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          :aria-label="`Quitar sección ${index + 1}`"
          @click="emit('remove')"
        />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UFormField
        label="Antetítulo"
        :name="`${name}.headline`"
        description="Opcional. Texto corto sobre el título."
      >
        <UInput
          v-model="section.headline"
          :maxlength="ABOUT_PAGE_LIMITS.headline"
          placeholder="Por qué existimos"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Título"
        :name="`${name}.title`"
        required
        class="sm:col-span-2"
      >
        <UInput
          v-model="section.title"
          :maxlength="ABOUT_PAGE_LIMITS.sectionTitle"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      v-if="section.type === 'text'"
      label="Texto"
      :name="`${name}.description`"
      description="Deja una línea en blanco entre párrafos."
      :hint="counter(section.description, ABOUT_PAGE_LIMITS.textDescription)"
      required
    >
      <UTextarea
        v-model="section.description"
        :rows="4"
        autoresize
        :maxlength="ABOUT_PAGE_LIMITS.textDescription"
        class="w-full"
      />
    </UFormField>

    <template v-else-if="section.type === 'features'">
      <UFormField
        label="Descripción"
        :name="`${name}.description`"
        description="Opcional. Aparece bajo el título, antes de las tarjetas."
        :hint="counter(section.description, ABOUT_PAGE_LIMITS.featuresDescription)"
      >
        <UTextarea
          v-model="section.description"
          :rows="2"
          autoresize
          :maxlength="ABOUT_PAGE_LIMITS.featuresDescription"
          class="w-full"
        />
      </UFormField>

      <AgencyAboutItemsEditor
        v-model="section.items"
        :name="`${name}.items`"
        item-label="Tarjeta"
        :min="ABOUT_PAGE_LIMITS.featureItems.min"
        :max="ABOUT_PAGE_LIMITS.featureItems.max"
        :create="createFeatureItem"
      >
        <template #item-extra="{ item, path }">
          <UFormField label="Ícono" :name="`${path}.icon`">
            <AgencyIconPicker v-model="item.icon" />
          </UFormField>
        </template>
      </AgencyAboutItemsEditor>
    </template>

    <AgencyAboutItemsEditor
      v-else
      v-model="section.items"
      :name="`${name}.items`"
      item-label="Paso"
      :min="ABOUT_PAGE_LIMITS.stepItems.min"
      :max="ABOUT_PAGE_LIMITS.stepItems.max"
      :create="createStepItem"
    />
  </div>
</template>
