<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-detail',
});

const coordinatorStore = useCoordinatorStore();

const { travelId, travel } = useTravelRoute();

const coordinadores = computed(() =>
  (travel.value?.coordinatorIds ?? [])
    .map(id => coordinatorStore.getCoordinatorById(id))
    .filter(coordinator => coordinator !== undefined),
);

type Detail = { icon: string; label: string; value: string };

const details = computed<Detail[]>(() => {
  const t = travel.value;
  if (!t)
    return [];
  const start = parseDisplayDate(t.startDate);
  const end = parseDisplayDate(t.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return [
    { icon: 'i-lucide-calendar', label: 'Salida', value: formatDate(t.startDate) },
    { icon: 'i-lucide-calendar-check', label: 'Regreso', value: formatDate(t.endDate) },
    { icon: 'i-lucide-clock', label: 'Duración', value: `${days} día${days === 1 ? '' : 's'}` },
    { icon: 'i-lucide-map-pin', label: 'Sale desde', value: t.departureFrom || '—' },
    { icon: 'i-lucide-armchair', label: 'Asientos mínimos', value: t.minimumSeats ? String(t.minimumSeats) : '—' },
    { icon: 'i-lucide-star', label: 'Destacado en la web', value: t.featured ? 'Sí' : 'No' },
  ];
});
</script>

<template>
  <div v-if="travel" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <!-- Contenido público -->
    <div class="space-y-6 lg:col-span-2">
      <img
        v-if="travel.imageUrl"
        :src="travel.imageUrl"
        :alt="travel.label"
        class="aspect-[21/9] w-full rounded-lg object-cover"
      >

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Descripción
          </h2>
        </template>

        <div class="space-y-4">
          <p v-if="travel.summary" class="text-toned">
            {{ travel.summary }}
          </p>

          <ul v-if="travel.highlights.length > 0" class="grid gap-2 sm:grid-cols-2">
            <li
              v-for="highlight in travel.highlights"
              :key="highlight"
              class="flex items-start gap-2 text-sm"
            >
              <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
              {{ highlight }}
            </li>
          </ul>

          <USeparator v-if="travel.summary || travel.highlights.length > 0" />

          <RichContent :html="travel.description" />
        </div>
      </UCard>
    </div>

    <!-- Datos del viaje -->
    <div class="space-y-6">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Detalles
          </h2>
        </template>

        <dl class="space-y-3 text-sm">
          <div
            v-for="detail in details"
            :key="detail.label"
            class="flex items-center justify-between gap-3"
          >
            <dt class="flex items-center gap-2 text-muted">
              <UIcon :name="detail.icon" class="size-4 shrink-0" />
              {{ detail.label }}
            </dt>
            <dd class="text-right font-medium">
              {{ detail.value }}
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Coordinadores
          </h2>
        </template>

        <ul v-if="coordinadores.length > 0" class="space-y-2">
          <li
            v-for="coordinador in coordinadores"
            :key="coordinador.id"
            class="flex items-center gap-2 text-sm"
          >
            <UIcon name="i-lucide-user-star" class="size-4 shrink-0 text-muted" />
            {{ coordinador.name }}
          </li>
        </ul>
        <p v-else class="text-sm text-muted">
          Sin coordinadores asignados
        </p>
      </UCard>

      <UCard v-if="travel.internalNotes">
        <template #header>
          <h2 class="flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-lock" class="size-4 text-muted" />
            Notas internas
          </h2>
        </template>
        <p class="whitespace-pre-line text-sm text-toned">
          {{ travel.internalNotes }}
        </p>
      </UCard>

      <TravelAccessCodeCard
        :travel-id="travelId"
        :travel-label="travel.label"
        :travel-status="travel.status"
      />
    </div>
  </div>
</template>
