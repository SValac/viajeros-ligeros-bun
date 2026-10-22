<script setup lang="ts">
// Opened through useOverlay by useConfirmDelete: emits `true` to delete, `false` to cancel.

type Props = {
  title: string;
  description: string;
  confirmLabel?: string;
};

const { title, description, confirmLabel = 'Eliminar' } = defineProps<Props>();

const emit = defineEmits<{
  close: [confirmed: boolean];
}>();
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :close="false"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancelar"
          @click="emit('close', false)"
        />
        <UButton
          color="error"
          :label="confirmLabel"
          @click="emit('close', true)"
        />
      </div>
    </template>
  </UModal>
</template>
