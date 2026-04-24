<script setup lang="ts">
import { useHotelRoomStore } from '~/stores/use-hotel-room-store';

const props = defineProps<{
  providerId: string;
}>();

const hotelRoomStore = useHotelRoomStore();

const hasData = computed(() => hotelRoomStore.hasRoomData(props.providerId));
const roomData = computed(() => hotelRoomStore.getRoomDataByProviderId(props.providerId));
const roomTypesCount = computed(() => roomData.value?.roomTypes.length ?? 0);
</script>

<template>
  <UBadge
    v-if="hasData"
    variant="subtle"
    color="primary"
    size="sm"
  >
    {{ roomData?.totalRooms }} hab · {{ roomTypesCount }} tipos
  </UBadge>
</template>
