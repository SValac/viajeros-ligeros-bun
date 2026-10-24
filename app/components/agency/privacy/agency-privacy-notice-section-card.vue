<script setup lang="ts">
import type { PrivacyNoticeSection } from '~/types/agency-profile';

import { PRIVACY_NOTICE_LIMITS } from '~/composables/agency-profile/use-privacy-notice-domain';

type Props = {
  /** Form path of the section, e.g. `page.sections.2`. */
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

const section = defineModel<PrivacyNoticeSection>({ required: true });

const bodyCounter = computed(() => `${section.value.body.length}/${PRIVACY_NOTICE_LIMITS.sectionBody}`);
</script>

<template>
  <div class="space-y-4 rounded-lg border border-default bg-default p-4">
    <div class="flex items-center justify-between gap-2">
      <span class="font-medium text-highlighted">Sección {{ index + 1 }}</span>
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

    <UFormField
      label="Título"
      :name="`${name}.title`"
      required
    >
      <UInput
        v-model="section.title"
        :maxlength="PRIVACY_NOTICE_LIMITS.sectionTitle"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Texto"
      :name="`${name}.body`"
      description="Cada salto de línea empieza un párrafo. Empieza una línea con «- » para hacer una lista."
      :hint="bodyCounter"
      required
    >
      <UTextarea
        v-model="section.body"
        :rows="5"
        autoresize
        :maxlength="PRIVACY_NOTICE_LIMITS.sectionBody"
        class="w-full"
      />
    </UFormField>
  </div>
</template>
