<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import { toErrorMessage } from '~/utils/error-message';

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

    // Full reload, not router.push: it empties every store and the Pinia Colada query
    // cache in one go, so nothing loaded before login (or by the previous user) survives.
    // Same reasoning as the forced reload on logout in user-menu.vue.
    window.location.href = '/';
  }
  catch (error) {
    const message = toErrorMessage(error, 'No pudimos iniciar sesión. Intenta de nuevo.');
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
          <PasswordInput
            v-model="state.password"
          />
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
