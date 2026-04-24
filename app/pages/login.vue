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
const supabase = useSupabase();

function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error))
    return 'No pudimos iniciar sesión. Intenta de nuevo.';

  const message = String(error.message ?? '').toLowerCase();

  if (message.includes('invalid login credentials'))
    return 'Email o contraseña inválidos.';

  if (message.includes('email not confirmed'))
    return 'Debes confirmar tu email antes de iniciar sesión.';

  return String(error.message) || 'No pudimos iniciar sesión. Intenta de nuevo.';
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  submitError.value = '';

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: event.data.email,
      password: event.data.password,
    });

    if (error)
      throw error;

    toast.add({
      title: 'Inicio de sesión exitoso',
      description: `Bienvenido, ${event.data.email}`,
      color: 'success',
    });

    await router.push('/');
  }
  catch (error) {
    const message = getAuthErrorMessage(error);
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
          />
        </UFormField>

        <UFormField
          name="password"
          label="Contraseña"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            icon="i-lucide-lock"
            placeholder="••••••••"
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
