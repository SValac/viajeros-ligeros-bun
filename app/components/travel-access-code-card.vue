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
const travelersForTravel = computed(() => travelerStore.getTravelersByTravel(props.travelId));

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
const displayCopyIcon = computed(() => copied.value ? 'i-lucide-check' : 'i-lucide-copy');

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

onMounted(async () => {
  await Promise.all([
    travelerStore.fetchByTravel(props.travelId),
    travelAccessStore.fetchActiveCode(props.travelId),
  ]);
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

      <div class="space-y-4">
        <UEmpty
          v-if="cardState === 'not-eligible'"
          icon="i-lucide-lock"
          title="Código no disponible todavía"
          description="El código de acceso se habilita cuando el viaje está publicado o en curso, para que los viajeros puedan consultar su itinerario desde la app."
        />

        <UEmpty
          v-else-if="cardState === 'no-code'"
          icon="i-lucide-key-round"
          title="Todavía no hay un código generado"
          description="Generá un código de 6 caracteres y compartilo con los viajeros para que accedan a su itinerario desde la app."
          :actions="[{
            label: 'Generar código',
            icon: 'i-lucide-key-round',
            loading: travelAccessStore.loading,
            onClick: generateCode,
          }]"
        />

        <template v-else>
          <div class="flex items-center justify-between gap-4 p-4 bg-elevated rounded-lg">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="size-5 text-success shrink-0" />
              <span class="font-medium">Código activo</span>
            </div>
            <UBadge
              color="neutral"
              variant="subtle"
              icon="i-lucide-calendar-clock"
              :label="`Expira el ${formatDate(activeCode?.expiresAt ?? '')}`"
            />
          </div>

          <UAlert
            v-if="cardState === 'active-hidden'"
            color="warning"
            variant="subtle"
            icon="i-lucide-eye-off"
            title="El código ya no se puede volver a mostrar"
            description="Por seguridad, solo se muestra en pantalla una vez, justo después de generarlo. Si el viajero lo perdió, generá uno nuevo."
          />

          <template v-if="cardState === 'active-revealed'">
            <div>
              <p class="text-sm text-muted mb-1">
                Código generado
              </p>
              <div class="flex items-center gap-3 p-4 bg-elevated rounded-lg">
                <span class="flex-1 font-mono text-xl font-semibold tracking-[0.3em]">
                  {{ revealedCode }}
                </span>
                <UButton
                  :label="copied ? 'Copiado' : 'Copiar'"
                  :icon="displayCopyIcon"
                  :color="copied ? 'success' : 'neutral'"
                  variant="subtle"
                  @click="copyCode"
                />
              </div>
              <p class="text-xs text-muted mt-1.5">
                Se muestra una sola vez — copialo o envialo ahora antes de recargar la página.
              </p>
            </div>

            <USeparator
              label="Enviar por WhatsApp"
              icon="i-simple-icons-whatsapp"
            />

            <div v-if="travelersForTravel.length > 0" class="space-y-1">
              <div
                v-for="traveler in travelersForTravel"
                :key="traveler.id"
                class="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-elevated transition-colors"
              >
                <UUser
                  :name="`${traveler.firstName} ${traveler.lastName}`"
                  :description="traveler.phone"
                  :avatar="{}"
                  size="sm"
                />
                <UButton
                  label="Enviar"
                  icon="i-simple-icons-whatsapp"
                  color="success"
                  variant="soft"
                  size="sm"
                  @click="sendCode(traveler.phone, revealedCode, travelLabel)"
                />
              </div>
            </div>
            <UEmpty
              v-else
              icon="i-lucide-users"
              title="Sin viajeros registrados"
              description="Agregá viajeros a este viaje para poder enviarles el código por WhatsApp."
            />
          </template>

          <div v-if="showRevokeAndRegenerateButtons" class="flex flex-wrap gap-2 pt-2">
            <UButton
              label="Regenerar código"
              color="secondary"
              variant="subtle"
              icon="i-lucide-rotate-ccw-key"
              @click="showModal"
            />
            <UButton
              label="Revocar código"
              color="error"
              variant="outline"
              icon="i-lucide-trash-2"
              :loading="travelAccessStore.loading"
              @click="revokeCode"
            />
          </div>
        </template>
      </div>
    </UCard>

    <UModal
      v-model:open="showRegenerateModal"
      :dismissible="false"
      title="¿Generar un nuevo código?"
      description="Los viajeros que ya recibieron el código actual no van a poder usarlo para acceder a su itinerario."
    >
      <template #footer>
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          @click="closeModal"
        />
        <UButton
          label="Sí, generar nuevo código"
          color="primary"
          icon="i-lucide-rotate-ccw-key"
          :loading="travelAccessStore.loading"
          @click="confirmRegenerate"
        />
      </template>
    </UModal>
  </div>
</template>
