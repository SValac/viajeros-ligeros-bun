<script setup lang="ts">
type Props = {
  siteName: string;
  title: string;
  description: string;
  // Already resolved with the site's fallback (favicon → logo).
  iconUrl: string | null;
  shareImageUrl: string | null;
};

const { siteName, title, description, iconUrl, shareImageUrl } = defineProps<Props>();
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="space-y-2">
      <p class="text-xs font-medium text-muted">
        En Google
      </p>
      <div class="space-y-1 rounded-lg border border-default bg-default p-4">
        <div class="flex items-center gap-2">
          <div class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-default bg-elevated">
            <img
              v-if="iconUrl"
              :src="iconUrl"
              alt=""
              class="size-4 object-contain"
            >
            <UIcon
              v-else
              name="i-lucide-globe"
              class="size-4 text-dimmed"
            />
          </div>
          <span class="truncate text-sm text-default">{{ siteName }}</span>
        </div>
        <p class="line-clamp-1 text-lg text-info">
          {{ title }}
        </p>
        <p class="line-clamp-2 text-sm text-muted">
          {{ description }}
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-xs font-medium text-muted">
        Al compartir en WhatsApp o Facebook
      </p>
      <div class="overflow-hidden rounded-lg border border-default bg-elevated">
        <img
          v-if="shareImageUrl"
          :src="shareImageUrl"
          alt=""
          class="aspect-[1200/630] w-full object-cover"
        >
        <div class="space-y-1 p-3">
          <p class="line-clamp-1 text-sm font-semibold text-highlighted">
            {{ title }}
          </p>
          <p class="line-clamp-2 text-xs text-muted">
            {{ description }}
          </p>
        </div>
      </div>
      <p
        v-if="!shareImageUrl"
        class="text-xs text-dimmed"
      >
        Sin imagen para compartir, la página principal se comparte sin imagen; cada viaje usa su portada.
      </p>
    </div>
  </div>
</template>
