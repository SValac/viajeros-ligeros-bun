<script setup lang="ts">
type Props = {
  companyName: string;
  stateName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

const { companyName, stateName, logoUrl, primaryColor, secondaryColor } = defineProps<Props>();

// Mirrors the public site's fallback: without a brand color it uses its own palette.
const accentStyle = computed(() => ({
  backgroundColor: primaryColor ?? 'var(--ui-primary)',
}));

const badgeStyle = computed(() => {
  const background = secondaryColor ?? primaryColor;
  if (!background)
    return undefined;
  return { backgroundColor: background, color: readableTextColor(background) };
});

const initials = computed(() =>
  companyName.trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || '?',
);

// Black or white text depending on the background's relative luminance, so a very
// light brand color stays readable (same rule the public site should apply).
function readableTextColor(hex: string): string {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default bg-default">
    <div class="h-1.5" :style="accentStyle" />
    <div class="flex items-center gap-3 p-4">
      <UAvatar
        :src="logoUrl ?? undefined"
        :alt="companyName || 'Logo de la agencia'"
        :text="initials"
        size="lg"
      />
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-highlighted">
          {{ companyName || 'Nombre de tu agencia' }}
        </p>
        <p class="truncate text-sm text-muted">
          {{ stateName ?? 'Estado sin definir' }}
        </p>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-medium"
        :class="{ 'bg-primary text-inverted': !badgeStyle }"
        :style="badgeStyle"
      >
        Organiza
      </span>
    </div>
  </div>
</template>
