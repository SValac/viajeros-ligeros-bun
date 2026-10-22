<script setup lang="ts" generic="T">
import type { FormSubmitEvent } from '#ui/types';
import type { Ref } from 'vue';
import type { ZodType } from 'zod';

import { z } from 'zod';

import type { Json } from '~/types/database.types';

// Form of an optional site page ("Nosotros", "Página principal"): keeps a local copy of the
// page, guards unsaved changes and emits the page to save. The editor goes in the default
// slot, bound to `state.page` with `path` as its form path (`<slot>` reserves `name`).

type Props = {
  /** The saved page; `null` when the agency has none. */
  page: T | null;
  /** The page's domain schema (`aboutPageSchema`, `homePageSchema`). */
  schema: ZodType<T>;
  clone: (page: T | null) => T | null;
  serialize: (page: T | null) => Json | null;
  title: string;
  description: string;
  submitLabel: string;
  saving?: boolean;
};

const { page, schema, clone, serialize, saving = false } = defineProps<Props>();

const emit = defineEmits<{
  submit: [page: T | null];
}>();

defineSlots<{
  default: (props: { state: { page: T | null }; path: string }) => unknown;
}>();

const formSchema = computed(() => z.object({ page: schema.nullable() }));

type Schema = { page: T | null };

// Initialized once from the loaded profile (the parent page renders this only after
// loading), so edits stay local until they are saved.
const state = ref({ page: clone(page) }) as Ref<Schema>;

// Compared as the stored JSON, so only edits that would change what gets saved count.
// It resets itself after saving, when `page` updates.
const isDirty = computed(() =>
  JSON.stringify(serialize(state.value.page)) !== JSON.stringify(serialize(page)),
);
useUnsavedChangesGuard(isDirty);

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event.data.page);
}
</script>

<template>
  <UForm
    :schema="formSchema"
    :state="state"
    class="space-y-6"
    @submit="onSubmit"
  >
    <UPageCard
      :title="title"
      :description="description"
      variant="subtle"
    >
      <slot :state="state" path="page" />
    </UPageCard>

    <div class="flex justify-end">
      <UButton
        type="submit"
        icon="i-lucide-save"
        :loading="saving"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
