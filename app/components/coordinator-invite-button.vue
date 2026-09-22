<script setup lang="ts">
import type { Coordinator } from '~/types/coordinator';

const { coordinator } = defineProps<{
  coordinator: Coordinator;
}>();

const coordinatorStore = useCoordinatorStore();
const toast = useToast();
const isLoading = shallowRef(false);

const showInviteButton = computed(() => coordinator.userId === null);
const isInviteButtonDisabled = computed(() => coordinator.email === '');
const tooltipText = computed(() => {
  return isInviteButtonDisabled.value ? 'Se necesita un correo electrónico' : '';
});

async function handleInvite() {
  isLoading.value = true;
  try {
    await coordinatorStore.inviteCoordinator(coordinator.id);
    toast.add({
      title: 'Invitacion enviada',
      description: `Se envió un correo a ${coordinator.email}`,
      color: 'success',
    });
  }
  catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo invitar al coordinador';
    toast.add({
      title: 'Error al invitar',
      description: message,
      color: 'error',
    });
  }
  finally {
    isLoading.value = false;
  }
}

async function handleRevoke() {
  // eslint-disable-next-line no-alert
  if (!confirm(`Revocar el acceso a ${coordinator.name} a la app? Perderá acceso de inmediato.`)) {
    return;
  }

  isLoading.value = true;
  try {
    await coordinatorStore.revokeCoordinatorAccess(coordinator.id);
    toast.add({
      title: 'Acceso revocado',
      description: `${coordinator.name} ya no puede ver sus viajes asignados`,
      color: 'warning',
    });
  }
  catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo revocar el acceso';
    toast.add({
      title: 'Error al revocar',
      description: message,
      color: 'error',
    });
  }
  finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div>
    <UTooltip
      v-if="showInviteButton"
      :text="tooltipText"
      :disabled="!isInviteButtonDisabled"
    >
      <UButton
        v-if="showInviteButton"
        label="Invitar"
        color="primary"
        :loading="isLoading"
        :disabled="isInviteButtonDisabled"
        @click="handleInvite"
      />
    </UTooltip>
    <div
      v-if="!showInviteButton"
      class="flex gap-2"
    >
      <UBadge
        label="Invitado"
        variant="subtle"
      />
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash"
        :loading="isLoading"
        @click="handleRevoke"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
