<script setup lang="ts">
type OccupiedSeat = {
  travelerId: string;
  seatNumber: number;
  passengerName: string;
  boardingPoint?: string;
  isRepresentative: boolean;
  representativeName?: string;
  menuItems: {
    label: string;
    icon?: string;
    color?: string;
    onSelect: () => void;
  }[][];
};

type SeatCell = {
  number: number;
  status: 'available' | 'occupied';
  travelerId?: string;
  passengerName?: string;
  boardingPoint?: string;
  isRepresentative?: boolean;
  representativeName?: string;
  menuItems?: OccupiedSeat['menuItems'];
};

type Props = {
  busId: string;
  totalSeats: number;
  occupiedSeats: OccupiedSeat[];
  seatsPerRow?: number;
  lastRowSeats?: number;
  busLabel?: string;
  isSeatSelectionMode?: boolean;
  sourceTravelerId?: string | null;
  sourceSeatNumber?: number | null;
  selectedSeatNumber?: number | null;
};

const props = withDefaults(defineProps<Props>(), {
  seatsPerRow: 4,
  isSeatSelectionMode: false,
  sourceTravelerId: null,
  sourceSeatNumber: null,
  selectedSeatNumber: null,
});

const emit = defineEmits<{
  emptySeatSelected: [payload: { busId: string; seatNumber: number }];
  destinationSeatSelected: [payload: {
    busId: string;
    seatNumber: number;
    status: SeatCell['status'];
    travelerId?: string;
    passengerName?: string;
  }];
}>();

const allSeats = computed((): SeatCell[] => {
  const occupied = new Map(props.occupiedSeats.map(s => [s.seatNumber, s]));

  return Array.from({ length: props.totalSeats }, (_, i) => {
    const number = i + 1;
    const occ = occupied.get(number);
    return occ
      ? {
          number,
          status: 'occupied',
          travelerId: occ.travelerId,
          passengerName: occ.passengerName,
          boardingPoint: occ.boardingPoint,
          isRepresentative: occ.isRepresentative,
          representativeName: occ.representativeName,
          menuItems: occ.menuItems,
        }
      : { number, status: 'available' };
  });
});

const effectiveLastRowSeats = computed(() =>
  props.lastRowSeats ?? (props.totalSeats % props.seatsPerRow || props.seatsPerRow),
);

const computedRows = computed(() => {
  const seats = allSeats.value;
  const rows: (SeatCell | null)[][] = [];
  let index = 0;

  while (index < seats.length) {
    const remaining = seats.length - index;
    const isLastRow = remaining <= props.seatsPerRow;
    const seatsInThisRow = isLastRow ? effectiveLastRowSeats.value : props.seatsPerRow;

    const rowData = seats.slice(index, index + seatsInThisRow);

    let rowSeats: (SeatCell | null)[];
    if (rowData.length === 4) {
      rowSeats = [rowData[0] ?? null, rowData[1] ?? null, null, rowData[2] ?? null, rowData[3] ?? null];
    }
    else if (rowData.length === 3) {
      rowSeats = [rowData[0] ?? null, rowData[1] ?? null, null, rowData[2] ?? null, null];
    }
    else if (rowData.length === 2) {
      rowSeats = [rowData[0] ?? null, rowData[1] ?? null, null, null, null];
    }
    else {
      rowSeats = [rowData[0] ?? null, null, null, null, null];
    }

    rows.push(rowSeats);
    index += seatsInThisRow;
  }

  return rows;
});

function selectEmptySeat(seatNumber: number) {
  emit('emptySeatSelected', { busId: props.busId, seatNumber });
}

function selectSeat(seat: SeatCell) {
  if (props.isSeatSelectionMode) {
    emit('destinationSeatSelected', {
      busId: props.busId,
      seatNumber: seat.number,
      status: seat.status,
      travelerId: seat.travelerId,
      passengerName: seat.passengerName,
    });
    return;
  }

  if (seat.status === 'available') {
    selectEmptySeat(seat.number);
  }
}

function isSourceSeat(seat: SeatCell): boolean {
  return props.isSeatSelectionMode
    && (
      (props.sourceTravelerId !== null && seat.travelerId === props.sourceTravelerId)
      || seat.number === props.sourceSeatNumber
    );
}

function isDestinationSeat(seat: SeatCell): boolean {
  return props.selectedSeatNumber === seat.number;
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="busLabel" class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-bus" class="size-4" />
      <span>{{ busLabel }}</span>
    </div>

    <div class="flex flex-col gap-2">
      <div
        v-for="(row, rowIndex) in computedRows"
        :key="rowIndex"
        class="grid grid-cols-5 gap-2 items-center"
      >
        <template v-for="(seat, colIndex) in row" :key="colIndex">
          <div v-if="seat === null" />

          <div v-else-if="seat.status === 'occupied' && seat.menuItems && !isSeatSelectionMode" class="w-full">
            <UDropdownMenu :items="seat.menuItems">
              <BusSeatCard
                :seat-number="seat.number"
                status="occupied"
                :passenger-name="seat.passengerName"
                :boarding-point="seat.boardingPoint"
                :is-representative="seat.isRepresentative"
                :representative-name="seat.representativeName"
                :is-source-seat="isSourceSeat(seat)"
                :is-destination-seat="isDestinationSeat(seat)"
              />
            </UDropdownMenu>
          </div>

          <button
            v-else
            type="button"
            class="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :disabled="isSourceSeat(seat)"
            @click="selectSeat(seat)"
          >
            <BusSeatCard
              :seat-number="seat.number"
              :status="seat.status"
              :passenger-name="seat.passengerName"
              :boarding-point="seat.boardingPoint"
              :is-representative="seat.isRepresentative"
              :representative-name="seat.representativeName"
              :is-source-seat="isSourceSeat(seat)"
              :is-destination-seat="isDestinationSeat(seat)"
            />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
