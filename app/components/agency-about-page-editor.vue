<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

import type { AboutPage, AboutPageSectionType } from '~/types/agency-profile';

import {
  ABOUT_PAGE_LIMITS,
  ABOUT_SECTION_TYPES,
  createAboutPageTemplate,
  createAboutSection,
  createEmptyAboutPage,
  createListKeys,
  moveListItem,
} from '~/composables/agency-profile/use-about-page-domain';

type Props = {
  /** Form path of the page inside the parent UForm state. */
  name?: string;
  /** Used to personalize the example template. */
  companyName: string;
};

const { name = 'aboutPage', companyName } = defineProps<Props>();

// `null` = the agency has no "Nosotros" page on its site.
const page = defineModel<AboutPage | null>({ required: true });

type PendingAction = { title: string; description: string; confirmLabel: string; run: () => void };
const pendingAction = ref<PendingAction | null>(null);
const isConfirmOpen = computed({
  get: () => pendingAction.value !== null,
  set: (open: boolean) => {
    if (!open)
      pendingAction.value = null;
  },
});

const keyOf = createListKeys();

const sectionCount = computed(() => page.value?.sections.length ?? 0);
const canAddSection = computed(() => sectionCount.value < ABOUT_PAGE_LIMITS.sections);

const addSectionItems = computed<DropdownMenuItem[]>(() =>
  (Object.keys(ABOUT_SECTION_TYPES) as AboutPageSectionType[]).map(type => ({
    label: ABOUT_SECTION_TYPES[type].label,
    description: ABOUT_SECTION_TYPES[type].description,
    icon: ABOUT_SECTION_TYPES[type].icon,
    onSelect: () => addSection(type),
  })),
);

function heroCounter(value: string) {
  return `${value.length}/${ABOUT_PAGE_LIMITS.heroDescription}`;
}

function createPage() {
  page.value = createEmptyAboutPage();
}

function applyTemplate() {
  page.value = createAboutPageTemplate(companyName);
}

function requestTemplate() {
  if (!page.value) {
    applyTemplate();
    return;
  }
  pendingAction.value = {
    title: '¿Usar la plantilla de ejemplo?',
    description: 'Se reemplazará todo el contenido actual de la página Nosotros. El cambio se guarda hasta que presiones «Guardar perfil».',
    confirmLabel: 'Reemplazar',
    run: applyTemplate,
  };
}

function requestRemovePage() {
  pendingAction.value = {
    title: '¿Quitar la página Nosotros?',
    description: 'Tu sitio dejará de mostrarla. El cambio se guarda hasta que presiones «Guardar perfil».',
    confirmLabel: 'Quitar página',
    run: () => {
      page.value = null;
    },
  };
}

function cancelPending() {
  pendingAction.value = null;
}

function confirmPending() {
  pendingAction.value?.run();
  pendingAction.value = null;
}

function addSection(type: AboutPageSectionType) {
  if (!page.value || !canAddSection.value)
    return;
  page.value.sections = [...page.value.sections, createAboutSection(type)];
}

function removeSection(index: number) {
  if (!page.value)
    return;
  page.value.sections = page.value.sections.filter((_, i) => i !== index);
}

function moveSection(index: number, direction: -1 | 1) {
  if (!page.value)
    return;
  page.value.sections = moveListItem(page.value.sections, index, direction);
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="!page" class="flex flex-col items-center gap-4 rounded-lg border border-dashed border-default p-6 text-center">
      <UIcon name="i-lucide-file-text" class="size-8 text-muted" />
      <p class="text-sm text-muted">
        Tu sitio todavía no muestra una página «Nosotros».
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          @click="createPage"
        >
          Crear página vacía
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
          @click="requestRemovePage"
        >
          Quitar página
        </UButton>
      </div>

      <div class="space-y-4">
        <h3 class="font-medium text-highlighted">
          Encabezado
        </h3>
        <UFormField
          label="Título"
          :name="`${name}.hero.title`"
          required
        >
          <UInput
            v-model="page.hero.title"
            :maxlength="ABOUT_PAGE_LIMITS.heroTitle"
            placeholder="Existimos para que México se sienta más cerca"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Descripción"
          :name="`${name}.hero.description`"
          description="Opcional."
          :hint="heroCounter(page.hero.description)"
        >
          <UTextarea
            v-model="page.hero.description"
            :rows="3"
            autoresize
            :maxlength="ABOUT_PAGE_LIMITS.heroDescription"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-highlighted">
            Secciones
          </h3>
          <p class="text-sm text-muted">
            Se muestran en este orden. Al final, tu sitio siempre agrega el botón de WhatsApp.
          </p>
        </div>

        <!-- Animates adding, removing and reordering sections. -->
        <div v-auto-animate class="space-y-4">
          <AgencyAboutSectionCard
            v-for="(section, index) in page.sections"
            :key="keyOf(section)"
            v-model="page.sections[index]!"
            :name="`${name}.sections.${index}`"
            :index="index"
            :is-first="index === 0"
            :is-last="index === page.sections.length - 1"
            @move="direction => moveSection(index, direction)"
            @remove="removeSection(index)"
          />
        </div>

        <UFormField :name="`${name}.sections`">
          <UDropdownMenu :items="addSectionItems" :disabled="!canAddSection">
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
              :disabled="!canAddSection"
            >
              Agregar sección ({{ sectionCount }}/{{ ABOUT_PAGE_LIMITS.sections }})
            </UButton>
          </UDropdownMenu>
        </UFormField>
      </div>
    </template>

    <UModal
      v-model:open="isConfirmOpen"
      :title="pendingAction?.title"
      :description="pendingAction?.description"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="cancelPending"
          >
            Cancelar
          </UButton>
          <UButton color="error" @click="confirmPending">
            {{ pendingAction?.confirmLabel }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
