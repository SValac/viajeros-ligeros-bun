<script setup lang="ts">
import type { TravelMediaType } from '~/types/travel-media';

const props = defineProps<{
  travelId: string;
}>();

const emit = defineEmits<{
  uploaded: [];
}>();

const store = useTravelMediaStore();
const fileInput = useTemplateRef<HTMLInputElement>('fileInputRef');

type PendingFile = {
  file: File;
  previewUrl: string;
  mediaType: TravelMediaType;
};

const pendingFiles = ref<PendingFile[]>([]);

function getMediaType(file: File): TravelMediaType {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length)
    return;

  const newFiles: PendingFile[] = Array.from(input.files).map(file => ({
    file,
    previewUrl: URL.createObjectURL(file),
    mediaType: getMediaType(file),
  }));

  pendingFiles.value = [...pendingFiles.value, ...newFiles];
  input.value = '';
}

function removePending(index: number) {
  URL.revokeObjectURL(pendingFiles.value[index]!.previewUrl);
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index);
}

async function uploadAll() {
  for (const pending of pendingFiles.value) {
    await store.uploadMedia(props.travelId, pending.file, pending.mediaType);
    URL.revokeObjectURL(pending.previewUrl);
  }
  pendingFiles.value = [];
  emit('uploaded');
}

onUnmounted(() => {
  pendingFiles.value.forEach(p => URL.revokeObjectURL(p.previewUrl));
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        class="hidden"
        @change="onFilesSelected"
      >
      <UButton
        icon="i-lucide-plus"
        variant="outline"
        :disabled="store.uploading"
        @click="fileInput?.click()"
      >
        Agregar archivos
      </UButton>
      <UButton
        v-if="pendingFiles.length > 0"
        icon="i-lucide-upload"
        :loading="store.uploading"
        :disabled="store.uploading"
        @click="uploadAll"
      >
        Subir {{ pendingFiles.length }} {{ pendingFiles.length === 1 ? 'archivo' : 'archivos' }}
      </UButton>
    </div>

    <div
      v-if="pendingFiles.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
    >
      <div
        v-for="(pending, index) in pendingFiles"
        :key="index"
        class="relative group rounded-lg overflow-hidden bg-elevated aspect-square"
      >
        <video
          v-if="pending.mediaType === 'video'"
          :src="pending.previewUrl"
          class="w-full h-full object-cover"
          preload="metadata"
          muted
        />
        <img
          v-else
          :src="pending.previewUrl"
          :alt="pending.file.name"
          class="w-full h-full object-cover"
        >
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="solid"
            size="sm"
            :disabled="store.uploading"
            @click="removePending(index)"
          />
        </div>
        <UBadge
          class="absolute bottom-1 left-1"
          :icon="pending.mediaType === 'video' ? 'i-lucide-video' : 'i-lucide-image'"
          :label="pending.mediaType === 'video' ? 'Video' : 'Imagen'"
          color="neutral"
          variant="solid"
          size="xs"
        />
      </div>
    </div>
  </div>
</template>
