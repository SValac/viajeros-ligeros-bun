<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

defineProps<{
  collapsed?: boolean;
}>();

const colorMode = useColorMode();
const authStore = useAuthStore();
const { signOut } = authStore;

const user = computed(() => ({
  name: authStore.displayName,
  avatar: {
    src: authStore.avatarUrl,
    alt: authStore.displayName,
  },
}));

async function handleLogout() {
  await signOut();
  window.location.href = '/login';
}

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value.name,
  avatar: user.value.avatar,
}], [{
  label: 'Perfil de agencia',
  icon: 'i-lucide-building-2',
  to: { name: 'profile' },
}], [{
  label: 'Apariencia',
  icon: 'i-lucide-sun-moon',
  children: [{
    label: 'Claro',
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault();

      colorMode.preference = 'light';
    },
  }, {
    label: 'Oscuro',
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onUpdateChecked(checked: boolean) {
      if (checked) {
        colorMode.preference = 'dark';
      }
    },
    onSelect(e: Event) {
      e.preventDefault();
    },
  }],
}], [{
  label: 'Cerrar sesión',
  icon: 'i-lucide-log-out',
  onSelect: handleLogout,
}]]));
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />
  </UDropdownMenu>
</template>
