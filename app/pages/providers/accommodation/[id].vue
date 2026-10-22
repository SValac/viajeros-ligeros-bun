<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';
import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

definePageMeta({
  name: 'providers-accommodation-detail',
});

const router = useRouter();
</script>

<template>
  <ProviderDetailPage
    :category="PROVIDER_CATEGORY.ACCOMMODATION"
  >
    <template #aside="{ provider }">
      <HotelRoomsManager
        :provider="provider"
        @close="router.push(PROVIDER_CATEGORY_META.accommodation.route)"
      />
    </template>
  </ProviderDetailPage>
</template>
