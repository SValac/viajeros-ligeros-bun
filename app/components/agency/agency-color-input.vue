<script setup lang="ts">
type Props = {
  placeholder?: string;
};

const { placeholder = 'Elegir color' } = defineProps<Props>();

// `null` means "no brand color": the public site falls back to its own palette.
const model = defineModel<string | null>({ required: true });

// UColorPicker works with `string | undefined`; the profile stores `string | null`.
const pickerValue = computed({
  get: () => model.value ?? undefined,
  set: (value: string | undefined) => {
    model.value = value ?? null;
  },
});

function clear() {
  model.value = null;
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UPopover>
      <UButton
        color="neutral"
        variant="outline"
        class="font-mono"
        :label="model ?? placeholder"
      >
        <template #leading>
          <span
            class="size-4 rounded-full ring ring-default"
            :class="{ 'bg-elevated': !model }"
            :style="model ? { backgroundColor: model } : undefined"
          />
        </template>
      </UButton>

      <template #content>
        <UColorPicker
          v-model="pickerValue"
          format="hex"
          class="p-2"
        />
      </template>
    </UPopover>

    <UButton
      v-if="model"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="Quitar color"
      @click="clear"
    />
  </div>
</template>
