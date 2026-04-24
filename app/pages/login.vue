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
const toast = useToast();
const router = useRouter();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 800));

    toast.add({
      title: 'Inicio de sesión (mock)',
      description: `Bienvenido, ${event.data.email}`,
      color: 'success',
    });

    await router.push('/');
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
