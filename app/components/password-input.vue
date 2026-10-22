<script setup lang="ts">
// Password field with a show/hide button. Each instance keeps its own visibility.
// Other UInput attributes fall through to the root UInput and override the defaults
// below (e.g. `icon="i-lucide-lock-keyhole"`).

const model = defineModel<string>();

const inputId = useId();
const showPassword = shallowRef(false);

const inputType = computed(() => showPassword.value ? 'text' : 'password');
const toggleIcon = computed(() => showPassword.value ? 'i-lucide-eye-off' : 'i-lucide-eye');

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <UInput
    :id="inputId"
    v-model="model"
    :type="inputType"
    icon="i-lucide-lock"
    placeholder="••••••••"
    :ui="{ trailing: 'pe-1' }"
    class="w-full"
  >
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="toggleIcon"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        :aria-pressed="showPassword"
        :aria-controls="inputId"
        @click="togglePasswordVisibility"
      />
    </template>
  </UInput>
</template>
