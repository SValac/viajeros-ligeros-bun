<script setup lang="ts">
// Opened through useOverlay by useUnsavedChangesGuard: emits `true` to leave, `false` to stay.
const emit = defineEmits<{
  close: [leave: boolean];
}>();
</script>

<template>
  <UModal
    title="Tienes cambios sin guardar"
    description="Si sales ahora, se perderán los cambios que no has guardado."
    :close="false"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="emit('close', false)"
        >
          Seguir editando
        </UButton>
        <UButton color="error" @click="emit('close', true)">
          Salir sin guardar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
