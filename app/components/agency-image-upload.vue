<script setup lang="ts">
type Props = {
  imageUrl: string | null;
  // Lowercase name used in the buttons and alt text ("logo", "favicon", "imagen").
  label: string;
  accept: string;
  // Formats and limits shown under the buttons.
  hint: string;
  // `wide` previews a 1200×630 share image; `banner` the home banner as the site crops it
  // on desktop (about 4:1); `square` a logo or favicon.
  shape?: 'square' | 'wide' | 'banner';
  uploading?: boolean;
  // Non-blocking advice about the current image (e.g. wrong proportions).
  warning?: string | null;
};

const { imageUrl, label, accept, hint, shape = 'square', uploading = false, warning = null } = defineProps<Props>();

const emit = defineEmits<{
  select: [file: File];
  remove: [];
  // Natural size of the current image, once the preview has loaded it.
  measure: [width: number, height: number];
}>();

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

const PREVIEW_CLASSES = {
  square: 'size-24',
  wide: 'aspect-[1200/630] w-48',
  banner: 'aspect-[4/1] w-64',
} as const;

const previewClass = computed(() => PREVIEW_CLASSES[shape]);

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Reset so picking the same file again still fires `change`.
  input.value = '';
  if (file)
    emit('select', file);
}

function onImageLoad(event: Event) {
  const image = event.target as HTMLImageElement;
  emit('measure', image.naturalWidth, image.naturalHeight);
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-4">
      <div
        class="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated"
        :class="previewClass"
      >
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="`Vista previa: ${label}`"
          class="size-full"
          :class="shape === 'square' ? 'object-contain' : 'object-cover'"
          @load="onImageLoad"
        >
        <UIcon
          v-else
          name="i-lucide-image"
          class="size-8 text-dimmed"
        />
      </div>

      <div class="flex flex-col gap-2">
        <input
          ref="fileInputRef"
          type="file"
          :accept="accept"
          class="hidden"
          @change="onFileSelected"
        >
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-upload"
            variant="outline"
            :loading="uploading"
            @click="fileInputRef?.click()"
          >
            {{ imageUrl ? `Cambiar ${label}` : `Subir ${label}` }}
          </UButton>
          <UButton
            v-if="imageUrl"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            :disabled="uploading"
            @click="emit('remove')"
          >
            Quitar
          </UButton>
        </div>
        <p class="text-xs text-muted">
          {{ hint }}
        </p>
      </div>
    </div>

    <UAlert
      v-if="imageUrl && warning"
      :description="warning"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
    />
  </div>
</template>
