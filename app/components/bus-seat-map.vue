<script setup lang="ts">
type OccupiedSeat = {
  travelerId: string;
  seatNumber: number;
  passengerName: string;
};

type SeatCell = {
  number: number;
  status: 'available' | 'occupied';
  passenger?: string;
  travelerId?: string;
};

type Props = {
  totalSeats: number;
  occupiedSeats: OccupiedSeat[];
  seatsPerRow?: number;
  lastRowSeats?: number;
};

const props = withDefaults(defineProps<Props>(), {
  seatsPerRow: 4,
});

const emit = defineEmits<{
  seatSelected: [travelerId: string];
}>();

const allSeats = computed((): SeatCell[] => {
  const occupied = new Map(props.occupiedSeats.map(s => [s.seatNumber, s]));

  return Array.from({ length: props.totalSeats }, (_, i) => {
    const number = i + 1;
    const occ = occupied.get(number);
    return occ
      ? { number, status: 'occupied', passenger: occ.passengerName, travelerId: occ.travelerId }
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

function seatClass(seat: SeatCell) {
  return {
    'bg-green-100 border border-green-300 text-green-700': seat.status === 'available',
    'bg-red-500 text-white cursor-pointer hover:bg-red-600': seat.status === 'occupied',
  };
}

function selectSeat(seat: SeatCell) {
  if (seat.status === 'occupied' && seat.travelerId) {
    emit('seatSelected', seat.travelerId);
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(row, rowIndex) in computedRows"
      :key="rowIndex"
      class="grid grid-cols-5 gap-2 items-center"
    >
      <template v-for="(seat, colIndex) in row" :key="colIndex">
        <div v-if="seat === null" />

        <div
          v-else
          class="relative h-12 flex items-center justify-center rounded-lg text-sm font-medium transition group"
          :class="seatClass(seat)"
          @click="selectSeat(seat)"
        >
          <span>{{ seat.number }}</span>

          <div
            v-if="seat.passenger"
            class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10"
          >
            {{ seat.passenger }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
