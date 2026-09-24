<script setup lang="ts">
type Props = {
  logoUrl: string | null;
  uploading?: boolean;
};

const { logoUrl, uploading = false } = defineProps<Props>();

const emit = defineEmits<{
  select: [file: File];
  remove: [];
}>();

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Reset so picking the same file again still fires `change`.
  input.value = '';
  if (file)
    emit('select', file);
}
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated">
      <img
        v-if="logoUrl"
        :src="logoUrl"
        alt="Logo de la agencia"
        class="size-full object-contain"
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
        accept="image/png,image/jpeg,image/webp"
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
          {{ logoUrl ? 'Cambiar logo' : 'Subir logo' }}
        </UButton>
        <UButton
          v-if="logoUrl"
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
        PNG, JPG o WebP · máximo 2 MB
      </p>
    </div>
  </div>
</template>
