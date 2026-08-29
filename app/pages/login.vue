<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

definePageMeta({
  layout: false,
});

const schema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  email: '',
  password: '',
});

const isSubmitting = ref(false);
const submitError = ref('');
const toast = useToast();
const router = useRouter();
const { signIn } = useAuthStore();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  submitError.value = '';

  try {
    const { error } = await signIn(event.data.email, event.data.password);

    if (error)
      throw new Error(error);

    toast.add({
      title: 'Inicio de sesión exitoso',
      description: `Bienvenido, ${event.data.email}`,
      color: 'success',
    });

    await router.push('/');
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos iniciar sesión. Intenta de nuevo.';
    submitError.value = message;
    toast.add({
      title: 'Error al iniciar sesión',
      description: message,
      color: 'error',
    });
  }
  finally {
    isSubmitting.value = false;
  }
}

const showPassword = shallowRef(false);
const passwordInputType = shallowRef('password');
const passwordInputTrailingIcon = shallowRef('i-lucide-eye');

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
  passwordInputType.value = showPassword.value ? 'text' : 'password';
  passwordInputTrailingIcon.value = showPassword.value ? 'i-lucide-eye-off' : 'i-lucide-eye';
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4 bg-muted/20">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold">
            Iniciar sesión
          </h1>
          <p class="text-sm text-muted">
            Accede con tu cuenta para continuar.
          </p>
        </div>
      </template>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          name="email"
          label="Email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            icon="i-lucide-mail"
            placeholder="tu@email.com"
            autofocus
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="password"
          label="Contraseña"
          required
        >
          <UInput
            v-model="state.password"
            :type="passwordInputType"
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
                :icon="passwordInputTrailingIcon"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                aria-controls="password"
                @click="togglePasswordVisibility"
              />
            </template>
          </UInput>
        </UFormField>

        <UAlert
          v-if="submitError"
          color="error"
          variant="soft"
          :description="submitError"
        />

        <UButton
          type="submit"
          block
          :loading="isSubmitting"
        >
          Entrar
        </UButton>
      </UForm>

      <template #footer>
        <p class="text-sm text-muted text-center">
          ¿No tienes cuenta?
          <ULink
            to="/register"
            class="font-medium"
          >
            Regístrate
          </ULink>
        </p>
      </template>
    </UCard>
  </main>
</template>
