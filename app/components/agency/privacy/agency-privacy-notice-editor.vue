<script setup lang="ts">
import type { PendingPageAction } from '~/components/agency/page/agency-page-confirm-modal.vue';
import type { PrivacyNotice } from '~/types/agency-profile';

import { createListKeys, moveListItem } from '~/composables/agency-profile/use-page-sections-domain';
import {
  createEmptyPrivacyNotice,
  createPrivacyNoticeSection,
  createPrivacyNoticeTemplate,
  PRIVACY_NOTICE_LIMITS,
} from '~/composables/agency-profile/use-privacy-notice-domain';

type Props = {
  /** Form path of the notice inside the parent UForm state. */
  name?: string;
  /** Suggested as the ARCO email of a new notice. */
  contactEmail: string;
};

const { name = 'privacyNotice', contactEmail } = defineProps<Props>();

// `null` = the agency's site has no privacy notice.
const notice = defineModel<PrivacyNotice | null>({ required: true });

const pendingAction = ref<PendingPageAction | null>(null);

const keyOf = createListKeys();

const canAddSection = computed(() => (notice.value?.sections.length ?? 0) < PRIVACY_NOTICE_LIMITS.sections);

function createNotice() {
  notice.value = createEmptyPrivacyNotice(contactEmail);
}

function applyTemplate() {
  notice.value = createPrivacyNoticeTemplate(contactEmail);
}

function requestTemplate() {
  if (!notice.value) {
    applyTemplate();
    return;
  }
  pendingAction.value = {
    title: '¿Usar la plantilla de ejemplo?',
    description: 'Se reemplazará todo el contenido actual del aviso de privacidad. El cambio se guarda hasta que presiones «Guardar aviso de privacidad».',
    confirmLabel: 'Reemplazar',
    run: applyTemplate,
  };
}

function requestRemoveNotice() {
  pendingAction.value = {
    title: '¿Quitar el aviso de privacidad?',
    description: 'Tu sitio dejará de mostrarlo. El cambio se guarda hasta que presiones «Guardar aviso de privacidad».',
    confirmLabel: 'Quitar aviso',
    run: () => {
      notice.value = null;
    },
  };
}

function addSection() {
  if (!notice.value || !canAddSection.value)
    return;
  notice.value.sections = [...notice.value.sections, createPrivacyNoticeSection()];
}

function removeSection(index: number) {
  if (notice.value)
    notice.value.sections = notice.value.sections.filter((_, i) => i !== index);
}

function moveSection(index: number, direction: -1 | 1) {
  if (notice.value)
    notice.value.sections = moveListItem(notice.value.sections, index, direction);
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="!notice" class="flex flex-col items-center gap-4 rounded-lg border border-dashed border-default p-6 text-center">
      <UIcon name="i-lucide-shield-check" class="size-8 text-muted" />
      <p class="text-sm text-muted">
        Tu sitio todavía no muestra un aviso de privacidad.
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          @click="createNotice"
        >
          Crear aviso vacío
        </UButton>
        <UButton icon="i-lucide-wand-sparkles" @click="requestTemplate">
          Usar plantilla de ejemplo
        </UButton>
      </div>
    </div>

    <template v-else>
      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          icon="i-lucide-wand-sparkles"
          color="neutral"
          variant="outline"
          size="sm"
          @click="requestTemplate"
        >
          Usar plantilla de ejemplo
        </UButton>
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          @click="requestRemoveNotice"
        >
          Quitar aviso
        </UButton>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-highlighted">
            Responsable
          </h3>
          <p class="text-sm text-muted">
            Quién responde por los datos personales. Tu sitio lo muestra al inicio del aviso.
          </p>
        </div>
        <UFormField
          label="Nombre legal"
          :name="`${name}.responsible.legalName`"
          description="Tu nombre si eres persona física, o la razón social de tu empresa."
          required
        >
          <UInput
            v-model="notice.responsible.legalName"
            :maxlength="PRIVACY_NOTICE_LIMITS.legalName"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Domicilio"
          :name="`${name}.responsible.address`"
          required
        >
          <UInput
            v-model="notice.responsible.address"
            :maxlength="PRIVACY_NOTICE_LIMITS.address"
            placeholder="Calle, número, colonia, código postal, ciudad y estado"
            class="w-full"
          />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Correo para solicitudes ARCO"
            :name="`${name}.responsible.arcoEmail`"
            description="Donde las personas piden ver, corregir o borrar sus datos."
            required
          >
            <UInput
              v-model="notice.responsible.arcoEmail"
              type="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Última actualización"
            :name="`${name}.updatedOn`"
            description="Cámbiala cada vez que modifiques el texto del aviso."
            required
          >
            <UInput
              v-model="notice.updatedOn"
              type="date"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-highlighted">
            Secciones
          </h3>
          <p class="text-sm text-muted">
            Se muestran en este orden.
          </p>
        </div>

        <!-- Animates adding, removing and reordering sections. -->
        <div v-auto-animate class="space-y-4">
          <AgencyPrivacyNoticeSectionCard
            v-for="(section, index) in notice.sections"
            :key="keyOf(section)"
            v-model="notice.sections[index]!"
            :name="`${name}.sections.${index}`"
            :index="index"
            :is-first="index === 0"
            :is-last="index === notice.sections.length - 1"
            @move="direction => moveSection(index, direction)"
            @remove="removeSection(index)"
          />
        </div>

        <UFormField :name="`${name}.sections`">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            :disabled="!canAddSection"
            @click="addSection"
          >
            Agregar sección ({{ notice.sections.length }}/{{ PRIVACY_NOTICE_LIMITS.sections }})
          </UButton>
        </UFormField>
      </div>
    </template>

    <AgencyPageConfirmModal v-model="pendingAction" />
  </div>
</template>
