<script setup lang="ts">
// Cancel + submit row at the bottom of a UForm. The submit button is type="submit",
// so the parent UForm fires its own @submit; only cancel is emitted.

type Props = {
  submitLabel: string;
  loading?: boolean;
  disabled?: boolean;
};
type Emits = {
  cancel: [];
};
const { submitLabel, loading = false, disabled = false } = defineProps<Props>();

const emit = defineEmits<Emits>();

function cancelClick() {
  emit('cancel');
}
</script>

<template>
  <div class="flex justify-end gap-3 pt-4">
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      label="Cancelar"
      @click="cancelClick"
    />
    <UButton
      type="submit"
      color="primary"
      :label="submitLabel"
      :loading="loading"
      :disabled="disabled"
    />
  </div>
</template>
