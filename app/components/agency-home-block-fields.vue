<script setup lang="ts">
type BlockTexts = {
  title: string;
  headline?: string;
  description?: string;
};

type Props = {
  /** Form path of the block inside the parent UForm state, e.g. `homePage.hero`. */
  name: string;
  heading: string;
  /** What the block is and what the site adds around it. */
  help: string;
  limits: { title: number; headline?: number; description?: number };
  /** The site's default texts, shown while the field is empty. */
  placeholders: BlockTexts;
};

const { name, heading, help, limits, placeholders } = defineProps<Props>();

// A fixed block of the home page. Bind `headline` and/or `description` only for the
// blocks that have them; an unbound model hides its field.
const title = defineModel<string>('title', { required: true });
const headline = defineModel<string>('headline');
const description = defineModel<string>('description');

// With an empty title the site shows its whole default block, so every field previews
// it. Once the agency writes a title, empty optional fields are simply left out.
const usesDefault = computed(() => !title.value.trim());

function counter(value: string, limit: number) {
  return `${value.length}/${limit}`;
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-medium text-highlighted">
        {{ heading }}
      </h3>
      <p class="text-sm text-muted">
        {{ help }}
      </p>
    </div>

    <UFormField
      v-if="headline !== undefined && limits.headline"
      label="Antetítulo"
      :name="`${name}.headline`"
      description="Opcional. Texto corto sobre el título."
    >
      <UInput
        v-model="headline"
        :maxlength="limits.headline"
        :placeholder="usesDefault ? placeholders.headline : undefined"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Título"
      :name="`${name}.title`"
      description="Vacío = tu sitio muestra el bloque predeterminado (el texto en gris)."
    >
      <UInput
        v-model="title"
        :maxlength="limits.title"
        :placeholder="placeholders.title"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="description !== undefined && limits.description"
      label="Descripción"
      :name="`${name}.description`"
      description="Opcional. Deja una línea en blanco entre párrafos."
      :hint="counter(description, limits.description)"
    >
      <UTextarea
        v-model="description"
        :rows="3"
        autoresize
        :maxlength="limits.description"
        :placeholder="usesDefault ? placeholders.description : undefined"
        class="w-full"
      />
    </UFormField>
  </div>
</template>
