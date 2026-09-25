<script setup lang="ts">
export type PendingPageAction = {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => void;
};

// Destructive page-editor action waiting for confirmation (replace with the template,
// remove the page...). `null` = nothing pending, modal closed.
const action = defineModel<PendingPageAction | null>({ required: true });

const isOpen = computed({
  get: () => action.value !== null,
  set: (open: boolean) => {
    if (!open)
      action.value = null;
  },
});

function cancel() {
  action.value = null;
}

function confirm() {
  action.value?.run();
  action.value = null;
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="action?.title"
    :description="action?.description"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="cancel"
        >
          Cancelar
        </UButton>
        <UButton color="error" @click="confirm">
          {{ action?.confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
