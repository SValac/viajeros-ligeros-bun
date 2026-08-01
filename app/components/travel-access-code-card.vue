<script setup lang="ts">
import { useClipboard } from '@vueuse/core';

import type { TravelStatus } from '~/types/travel';

import { buildWhatsAppShareUrl } from '~/composables/travel-access/use-travel-access-domain';
import { formatDate } from '~/utils/format-date';

const props = defineProps<{
  travelId: string;
  travelLabel: string;
  travelStatus: TravelStatus;
}>();

type CardState = | 'not-eligible' | 'no-code' | 'active-hidden' | 'active-revealed';

const travelAccessStore = useTravelAccessStore();
const travelerStore = useTravelerStore();
const { copy, copied } = useClipboard();
const showRegenerateModal = shallowRef(false);

const activeCode = computed(() => travelAccessStore.getActiveCode(props.travelId));
const revealedCode = computed(() => travelAccessStore.getRevealedCode(props.travelId));
const cardState = computed((): CardState => {
  if (props.travelStatus !== 'published' && props.travelStatus !== 'in_progress') {
    return 'not-eligible';
  }

  if (activeCode.value === null) {
    return 'no-code';
  }

  if (activeCode.value != null && revealedCode.value === null) {
    return 'active-hidden';
  }

  return 'active-revealed';
});

const showRevokeAndRegenerateButtons = computed(() => cardState.value === 'active-hidden' || cardState.value === 'active-revealed');

async function generateCode() {
  await travelAccessStore.generateCode(props.travelId);
}

async function revokeCode() {
  await travelAccessStore.revokeCode(props.travelId);
}

function showModal() {
  showRegenerateModal.value = true;
}
function closeModal() {
  showRegenerateModal.value = false;
}

async function confirmRegenerate() {
  await generateCode();
  closeModal();
}

function copyCode() {
  if (revealedCode.value) {
    copy(revealedCode.value);
  }
}

function sendCode(phone: string, code: string | null, travelLabel: string) {
  if (!code) {
    return;
  }
  window.open(buildWhatsAppShareUrl(phone, code, travelLabel), '_blank');
}

const displayCopyIcon = computed(() => copied.value ? 'i-lucide-check' : 'i-lucide-copy');

onMounted(async () => {
  await travelerStore.fetchByTravel(props.travelId);
});
</script>

<template>
  <div>
    <UCard>
      <TheSeparator
        size="xl"
        text="Código de acceso"
        icon="i-lucide-key-round"
      />
      <UAlert
        v-if="cardState === 'not-eligible'"
        color="neutral"
        icon="i-lucide-lock"
        title="Viaje no elegible"
        description="el código solo se puede generar cuando el viaje está publicado o en curso"
      />

      <UButton
        v-if="cardState === 'no-code'"
        label="Generar código"
        icon="i-lucide-key-round"
        :loading="travelAccessStore.loading"
        @click="generateCode"
      />

      <div
        v-if="cardState === 'active-hidden'"
      >
        <p>
          Código activo. Expira el: {{ formatDate(activeCode?.expiresAt ?? '...') }}
        </p>
        <UAlert
          color="warning"
          icon="i-lucide-eye-off"
          description="Por seguridad el código no puede ser mostrado"
        />
      </div>

      <UButton
        v-if="showRevokeAndRegenerateButtons"
        label="Revocar código"
        color="error"
        variant="outline"
        icon="i-lucide-trash-2"
        :loading="travelAccessStore.loading"
        @click="revokeCode"
      />

      <UButton
        v-if="showRevokeAndRegenerateButtons"
        label="Regenerar código"
        color="secondary"
        icon="i-lucide-rotate-ccw-key"
        @click="showModal"
      />

      <div
        v-if="cardState === 'active-revealed'"
      >
        <p class="font-mono p-4 bg-elevated rounded-lg">
          {{ revealedCode }}
        </p>
        <UButton
          :icon="displayCopyIcon"
          @click="copyCode"
        />
        <div>
          <div v-for="traveler in travelerStore.getTravelersByTravel(travelId)" :key="traveler.id">
            <p>{{ traveler.firstName }} {{ traveler.lastName }} : {{ traveler.phone }}</p>
            <UButton
              label="Enviar"
              icon="i-simple-icons-whatsapp"
              @click="sendCode(traveler.phone, revealedCode, travelLabel)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UModal
      v-model:open="showRegenerateModal"
      :dismissible="false"
    >
      <template #body>
        Generar un nuevo código invalidará el actual
      </template>

      <template #footer>
        <UButton
          label="Confirmar"
          color="primary"
          @click="confirmRegenerate"
        />
        <UButton
          label="Cancelar"
          color="neutral"
          @click="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>
