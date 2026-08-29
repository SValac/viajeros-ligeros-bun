<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import { nameSchema, sanitizeName } from '~/utils/form-validation';

definePageMeta({
  layout: false,
});

const schema = z.object({
  name: nameSchema({ min: 2, max: 100 }).optional().or(z.literal('')),
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirma tu contraseña'),
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  },
);

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const isSubmitting = ref(false);
const submitError = ref('');
const toast = useToast();
const router = useRouter();
const { signUp } = useAuthStore();

// Proxy sanitizado: filtra caracteres inválidos mientras el usuario escribe
const nameInput = useSanitizedModel(() => state.value.name ?? '', v => state.value.name = v, sanitizeName);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  submitError.value = '';

  try {
    const { error, requiresEmailVerification } = await signUp(
      event.data.email,
      event.data.password,
      event.data.name || undefined,
    );

    if (error)
      throw new Error(error);

    toast.add({
      title: requiresEmailVerification ? 'Revisa tu correo' : 'Registro exitoso',
      description: requiresEmailVerification
        ? 'Te enviamos un correo de verificación. Confirma tu email antes de iniciar sesión.'
        : `Cuenta creada para ${event.data.email}`,
      color: 'success',
    });

    await router.push('/login');
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos crear tu cuenta. Intenta de nuevo.';
    submitError.value = message;
    toast.add({
      title: 'Error al registrarte',
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
            Crear cuenta
          </h1>
          <p class="text-sm text-muted">
            Regístrate para comenzar a usar la plataforma.
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
          name="name"
          label="Nombre (opcional)"
        >
          <UInput
            v-model="nameInput"
            icon="i-lucide-user"
            placeholder="Tu nombre"
            class="w-full"
          />
        </UFormField>

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

        <UFormField
          name="confirmPassword"
          label="Confirmar contraseña"
          required
        >
          <UInput
            v-model="state.confirmPassword"
            :type="passwordInputType"
            icon="i-lucide-lock-keyhole"
            :ui="{ trailing: 'pe-1' }"
            placeholder="••••••••"
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
          Crear cuenta
        </UButton>
      </UForm>

      <template #footer>
        <p class="text-sm text-muted text-center">
          ¿Ya tienes cuenta?
          <ULink
            to="/login"
            class="font-medium"
          >
            Inicia sesión
          </ULink>
        </p>
      </template>
    </UCard>
  </main>
</template>
