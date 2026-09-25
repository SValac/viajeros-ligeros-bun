<script setup lang="ts">
import type { PendingPageAction } from '~/components/agency-page-confirm-modal.vue';
import type { HomePage } from '~/types/agency-profile';

import {
  createEmptyHomePage,
  createHomePageTemplate,
  getHomePageDefaults,
  HOME_PAGE_LIMITS,
} from '~/composables/agency-profile/use-home-page-domain';

type Props = {
  /** Form path of the page inside the parent UForm state. */
  name?: string;
  /** Used in the default texts shown as placeholders. */
  companyName: string;
};

const { name = 'homePage', companyName } = defineProps<Props>();

// `null` = the site shows its default home page.
const page = defineModel<HomePage | null>({ required: true });

const pendingAction = ref<PendingPageAction | null>(null);

const defaults = computed(() => getHomePageDefaults(companyName));

function customize() {
  page.value = createEmptyHomePage();
}

function applyTemplate() {
  page.value = createHomePageTemplate();
}

function requestTemplate() {
  if (!page.value) {
    applyTemplate();
    return;
  }
  pendingAction.value = {
    title: '¿Usar la plantilla de ejemplo?',
    description: 'Se reemplazará todo el contenido actual de la página principal. El cambio se guarda hasta que presiones «Guardar página principal».',
    confirmLabel: 'Reemplazar',
    run: applyTemplate,
  };
}

function requestRestoreDefault() {
  pendingAction.value = {
    title: '¿Volver a la página principal predeterminada?',
    description: 'Se borrará todo lo que personalizaste y tu sitio mostrará los textos predeterminados. El cambio se guarda hasta que presiones «Guardar página principal».',
    confirmLabel: 'Restaurar',
    run: () => {
      page.value = null;
    },
  };
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="!page" class="flex flex-col items-center gap-4 rounded-lg border border-dashed border-default p-6 text-center">
      <UIcon name="i-lucide-house" class="size-8 text-muted" />
      <p class="text-sm text-muted">
        Tu sitio muestra la página principal predeterminada: un encabezado con el nombre de tu agencia, tus próximos viajes y un botón de WhatsApp.
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          @click="customize"
        >
          Personalizar
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
          icon="i-lucide-rotate-ccw"
          color="error"
          variant="ghost"
          size="sm"
          @click="requestRestoreDefault"
        >
          Restaurar predeterminada
        </UButton>
      </div>

      <AgencyHomeBlockFields
        v-model:title="page.hero.title"
        v-model:description="page.hero.description"
        :name="`${name}.hero`"
        heading="Encabezado"
        help="Lo primero que se ve. Tu sitio agrega debajo los botones «Ver viajes» y de WhatsApp."
        :limits="{ title: HOME_PAGE_LIMITS.heroTitle, description: HOME_PAGE_LIMITS.heroDescription }"
        :placeholders="defaults.hero"
      />

      <AgencyHomeBlockFields
        v-model:headline="page.featured.headline"
        v-model:title="page.featured.title"
        :name="`${name}.featured`"
        heading="Viajes destacados"
        help="El título sobre tus viajes publicados. Los viajes se muestran solos."
        :limits="{ title: HOME_PAGE_LIMITS.featuredTitle, headline: HOME_PAGE_LIMITS.featuredHeadline }"
        :placeholders="defaults.featured"
      />

      <div class="space-y-4">
        <div>
          <h3 class="font-medium text-highlighted">
            Secciones
          </h3>
          <p class="text-sm text-muted">
            Opcional. Van después de los viajes destacados, en este orden.
          </p>
        </div>

        <AgencyPageSectionsEditor
          v-model="page.sections"
          :name="`${name}.sections`"
        />
      </div>

      <AgencyHomeBlockFields
        v-model:title="page.cta.title"
        v-model:description="page.cta.description"
        :name="`${name}.cta`"
        heading="Llamado final"
        help="Cierra la página. Tu sitio agrega los botones de WhatsApp y del catálogo de viajes."
        :limits="{ title: HOME_PAGE_LIMITS.ctaTitle, description: HOME_PAGE_LIMITS.ctaDescription }"
        :placeholders="defaults.cta"
      />
    </template>

    <AgencyPageConfirmModal v-model="pendingAction" />
  </div>
</template>
