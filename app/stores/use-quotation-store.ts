import type { Ref } from 'vue';

import type { PaymentStatus } from '~/types/payment';
import type {
  AccommodationPayment,
  BusPayment,
  CostSplitType,
  ProviderOptOut,
  ProviderPayment,
  ProviderPriceAdjustment,
  ProviderPriceAdjustmentDraft,
  Quotation,
  QuotationAccommodation,
  QuotationAccommodationFormData,
  QuotationBus,
  QuotationBusFormData,
  QuotationExpense,
  QuotationExpenseFormData,
  QuotationFetchResult,
  QuotationFormData,
  QuotationProvider,
  QuotationProviderFilters,
  QuotationProviderFormData,
  QuotationPublicPrice,
  QuotationPublicPriceFormData,
  SupplierPayment,
  SupplierPaymentFields,
  TravelerPriceAdjustment,
} from '~/types/quotation';
import type { TravelAccommodation, TravelDetail } from '~/types/travel';

import {
  calculateProviderQuotedCost,
  calculateSeatPrice,
  calculateSellableSeats,
  findRoomsOutsideQuotation,
  isPerPersonProvider,
} from '~/composables/quotation/use-quotation-domain';
import { useQuotationRepository } from '~/composables/quotation/use-quotation-repository';
import { quotationByTravelQuery, quotationKeys } from '~/queries/quotations';
import { travelDetailQuery, travelKeys } from '~/queries/travels';
import { formatCurrency } from '~/utils/currency';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';
import { getPaymentStatus } from '~/utils/payment-status';

// What a supplier payment slice needs to know about one kind of payment (provider,
// accommodation or bus): where its payments and parents live, how a payment points to its
// parent, what the parent costs, and the repository calls that write it.
type SupplierPaymentSliceOptions<P extends SupplierPayment, F extends SupplierPaymentFields, T extends { id: string; quotationId: string }> = {
  payments: Ref<P[]>;
  parents: Ref<T[]>;
  parentIdOf: (payment: P | F) => string;
  costOf: (parent: T) => number;
  notFound: string;
  insert: (data: F) => Promise<P>;
  update: (id: string, data: Partial<F>) => Promise<P>;
  remove: (id: string) => Promise<void>;
};

export const useQuotationStore = defineStore('quotation', () => {
  const queryCache = useQueryCache();
  // Every write invalidates `quotationKeys.root` in its `finally`, even when it failed halfway
  // (e.g. saved but the seat price couldn't be recomputed): the active quotation query
  // refetches and copies the server's state back into the store.
  const repository = useQuotationRepository();

  // State
  const quotations = ref<Quotation[]>([]);
  const quotationProviders = ref<QuotationProvider[]>([]);
  const providerPayments = ref<ProviderPayment[]>([]);
  const providerOptOuts = ref<ProviderOptOut[]>([]);
  const providerPriceAdjustments = ref<ProviderPriceAdjustment[]>([]);
  const travelerPriceAdjustments = ref<TravelerPriceAdjustment[]>([]);
  const quotationAccommodations = ref<QuotationAccommodation[]>([]);
  const accommodationPayments = ref<AccommodationPayment[]>([]);
  const quotationPublicPrices = ref<QuotationPublicPrice[]>([]);
  const quotationBuses = ref<QuotationBus[]>([]);
  const busPayments = ref<BusPayment[]>([]);
  const quotationExpenses = ref<QuotationExpense[]>([]);
  // Categories the agency already used in its expenses (loaded when the form opens).
  const expenseCategories = ref<string[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<QuotationProviderFilters>({});

  /**
   * Builds the getters and actions of one kind of supplier payment. Provider, accommodation
   * and bus payments work the same way; only the parent and the cost owed to it change.
   * @param options - Where the payments and their parents live and how to write them
   * @returns The getters (by parent id, or by quotation id for the total) and the actions
   */
  function createSupplierPaymentSlice<P extends SupplierPayment, F extends SupplierPaymentFields, T extends { id: string; quotationId: string }>(
    options: SupplierPaymentSliceOptions<P, F, T>,
  ) {
    const { payments, parents, parentIdOf, costOf } = options;
    const findParent = (parentId: string) => parents.value.find(p => p.id === parentId);

    // Newest first.
    const getPayments = computed(() => {
      return (parentId: string): P[] => payments.value
        .filter(p => parentIdOf(p) === parentId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    });

    const getPaid = computed(() => {
      return (parentId: string): number => payments.value
        .filter(p => parentIdOf(p) === parentId)
        .reduce((sum, p) => sum + p.amount, 0);
    });

    // Never negative: what was paid beyond the cost is in getOverpayment.
    const getPendingBalance = computed(() => {
      return (parentId: string): number => {
        const parent = findParent(parentId);
        return parent ? Math.max(0, costOf(parent) - getPaid.value(parentId)) : 0;
      };
    });

    // Paid beyond the cost, e.g. when the cost goes down after paying.
    const getOverpayment = computed(() => {
      return (parentId: string): number => {
        const parent = findParent(parentId);
        return parent ? Math.max(0, getPaid.value(parentId) - costOf(parent)) : 0;
      };
    });

    const getStatus = computed(() => {
      return (parentId: string): PaymentStatus => {
        const parent = findParent(parentId);
        return parent ? getPaymentStatus(getPaid.value(parentId), costOf(parent)) : 'pending';
      };
    });

    const getTotalPendingBalance = computed(() => {
      return (quotationId: string): number => parents.value
        .filter(p => p.quotationId === quotationId)
        .reduce((sum, p) => sum + getPendingBalance.value(p.id), 0);
    });

    async function add(data: F): Promise<P | { error: string }> {
      const parentId = parentIdOf(data);
      if (!findParent(parentId))
        return { error: options.notFound };

      if (data.amount <= 0)
        return { error: 'El monto debe ser mayor a 0' };

      const pendingBalance = getPendingBalance.value(parentId);
      if (data.amount > pendingBalance)
        return { error: `El monto no puede superar el saldo pendiente (${formatCurrency(pendingBalance)})` };

      loading.value = true;
      error.value = null;
      try {
        const newPayment = await options.insert(data);
        payments.value.push(newPayment);
        return newPayment;
      }
      catch (e) {
        error.value = e instanceof Error ? e.message : 'Error desconocido';
        return { error: error.value };
      }
      finally {
        queryCache.invalidateQueries({ key: quotationKeys.root });
        loading.value = false;
      }
    }

    async function update(id: string, data: Partial<F>): Promise<P | undefined> {
      const index = payments.value.findIndex(p => p.id === id);
      if (index === -1)
        return undefined;

      loading.value = true;
      error.value = null;
      try {
        const updated = await options.update(id, data);
        payments.value[index] = updated;
        return updated;
      }
      catch (e) {
        error.value = e instanceof Error ? e.message : 'Error desconocido';
        return undefined;
      }
      finally {
        queryCache.invalidateQueries({ key: quotationKeys.root });
        loading.value = false;
      }
    }

    async function remove(id: string): Promise<void> {
      if (!payments.value.some(p => p.id === id))
        return;

      loading.value = true;
      error.value = null;
      try {
        await options.remove(id);
        payments.value = payments.value.filter(p => p.id !== id);
      }
      catch (e) {
        error.value = e instanceof Error ? e.message : 'Error desconocido';
      }
      finally {
        queryCache.invalidateQueries({ key: quotationKeys.root });
        loading.value = false;
      }
    }

    /**
     * Drops the payments of the given parents and adds the fetched ones in their place.
     * @param parentIds - Parents whose payments are replaced
     * @param fetched - Their payments as the server has them; none = just drop them
     */
    function replaceForParents(parentIds: string[], fetched: P[] = []): void {
      const ids = new Set(parentIds);
      payments.value = [...payments.value.filter(p => !ids.has(parentIdOf(p))), ...fetched];
    }

    return { getPayments, getPaid, getPendingBalance, getOverpayment, getStatus, getTotalPendingBalance, add, update, remove, replaceForParents };
  }

  const providerPaymentSlice = createSupplierPaymentSlice({
    payments: providerPayments,
    parents: quotationProviders,
    parentIdOf: p => p.quotationProviderId,
    // What is owed is payableCost (in an optional service, only for those who take it).
    costOf: p => p.payableCost,
    notFound: 'Proveedor no encontrado',
    insert: repository.insertProviderPayment,
    update: repository.updateProviderPayment,
    remove: repository.deleteProviderPayment,
  });

  const accommodationPaymentSlice = createSupplierPaymentSlice({
    payments: accommodationPayments,
    parents: quotationAccommodations,
    parentIdOf: p => p.quotationAccommodationId,
    costOf: h => h.totalCost,
    notFound: 'Hospedaje no encontrado',
    insert: repository.insertAccommodationPayment,
    update: repository.updateAccommodationPayment,
    remove: repository.deleteAccommodationPayment,
  });

  const busPaymentSlice = createSupplierPaymentSlice({
    payments: busPayments,
    parents: quotationBuses,
    parentIdOf: p => p.quotationBusId,
    costOf: b => b.totalCost,
    notFound: 'Autobús no encontrado',
    insert: repository.insertBusPayment,
    update: repository.updateBusPayment,
    remove: repository.deleteBusPayment,
  });

  // Getters
  const getQuotationByTravel = computed(() => {
    return (travelId: string): Quotation | undefined => {
      return quotations.value.find(c => c.travelId === travelId);
    };
  });

  const getProvidersByQuotation = computed(() => {
    return (quotationId: string): QuotationProvider[] => {
      return quotationProviders.value.filter(p => p.quotationId === quotationId);
    };
  });

  // Provider payments: built by createSupplierPaymentSlice.
  const getPaymentsByProvider = providerPaymentSlice.getPayments;
  const getPaidByProvider = providerPaymentSlice.getPaid;
  const getPendingBalanceByProvider = providerPaymentSlice.getPendingBalance;
  const getProviderOverpayment = providerPaymentSlice.getOverpayment;
  const getProviderPaymentStatus = providerPaymentSlice.getStatus;
  const getTotalPendingBalanceProviders = providerPaymentSlice.getTotalPendingBalance;

  // Total-cost services split among the minimum target seats.
  const getProvidersMinimumSplitCost = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId && !isPerPersonProvider(p) && (p.splitType ?? 'minimum') === 'minimum')
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  // Total-cost services split among the sellable seats.
  const getProvidersTotalSplitCost = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId && !isPerPersonProvider(p) && (p.splitType ?? 'minimum') === 'total')
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  // What per-person services add to the price of each seat.
  const getPerPersonSeatCost = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId && isPerPersonProvider(p))
        .reduce((sum, p) => sum + (p.unitCost ?? 0), 0);
    };
  });

  const getAccommodationsByQuotation = computed(() => {
    return (quotationId: string): QuotationAccommodation[] => {
      return quotationAccommodations.value.filter(h => h.quotationId === quotationId);
    };
  });

  const getAccommodationsTotalCost = computed(() => {
    return (quotationId: string): number => {
      return quotationAccommodations.value
        .filter(h => h.quotationId === quotationId)
        .reduce((sum, h) => sum + h.totalCost, 0);
    };
  });

  const getPublicPricesByQuotation = computed(() => {
    return (quotationId: string): QuotationPublicPrice[] => {
      return quotationPublicPrices.value.filter(p => p.quotationId === quotationId);
    };
  });

  // Reference price matrix: seatPrice + accommodation grouped by maxOccupancy.
  // Reads the provider and hotel-room catalogs: the calling component must create those stores
  // in its setup, or their catalog queries start during render (Vue lifecycle warnings).
  const getReferencePriceMatrix = computed(() => {
    return (quotationId: string): Array<{
      maxOccupancy: number;
      pricePerPerson: number;
      breakdown: {
        seatPrice: number;
        accommodation: Array<{
          hotelName: string;
          roomType: string;
          nightCount: number;
          costPerPerson: number;
          additionalDetails?: string;
        }>;
        totalAccommodation: number;
      };
    }> => {
      const quotation = quotations.value.find(c => c.id === quotationId);
      if (!quotation)
        return [];

      const seatPrice = quotation.seatPrice;
      const accommodations = getAccommodationsByQuotation.value(quotationId);
      const providerStore = useProviderStore();
      const hotelRoomStore = useHotelRoomStore();

      // Group entries by maxOccupancy
      const byOccupancy: Map<number, Array<{
        hotelName: string;
        roomType: string;
        nightCount: number;
        costPerPerson: number;
        additionalDetails?: string;
      }>> = new Map();

      for (const accommodation of accommodations) {
        const hotelProvider = providerStore.getProviderById(accommodation.providerId);
        const hotelName = hotelProvider?.name ?? `Hotel ${accommodation.providerId}`;
        const roomData = hotelRoomStore.getRoomDataByProviderId(accommodation.providerId);

        for (const detail of accommodation.details) {
          const occupancy = detail.maxOccupancy;
          // Cost of the whole stay at this hotel, not a single night: the seat price covers the whole trip too.
          const costPerPerson = (detail.pricePerNight * accommodation.nightCount) / detail.maxOccupancy;

          const roomTypeRecord = roomData?.roomTypes.find(rt => rt.id === detail.roomTypeId);
          const roomType = roomTypeRecord
            ? formatBedConfiguration(roomTypeRecord.beds)
            : `${occupancy} persona${occupancy > 1 ? 's' : ''}`;

          if (!byOccupancy.has(occupancy)) {
            byOccupancy.set(occupancy, []);
          }
          byOccupancy.get(occupancy)!.push({
            hotelName,
            roomType,
            nightCount: accommodation.nightCount,
            costPerPerson,
            additionalDetails: roomTypeRecord?.additionalDetails,
          });
        }
      }

      // Build the result sorted by maxOccupancy ascending
      return [...byOccupancy.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([maxOccupancy, hotels]) => {
          const totalAccommodation = hotels.reduce((sum, h) => sum + h.costPerPerson, 0);
          return {
            maxOccupancy,
            pricePerPerson: seatPrice + totalAccommodation,
            breakdown: {
              seatPrice,
              accommodation: hotels,
              totalAccommodation,
            },
          };
        });
    };
  });

  const getBusesTotalCost = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId)
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getBusesMinimumSplitCost = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId && (b.splitType ?? 'minimum') === 'minimum')
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getBusesTotalSplitCost = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId && (b.splitType ?? 'minimum') === 'total')
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getExpensesByQuotation = computed(() => {
    return (quotationId: string): QuotationExpense[] => {
      return quotationExpenses.value.filter(g => g.quotationId === quotationId);
    };
  });

  const getExpensesTotal = computed(() => {
    return (quotationId: string): number => {
      return getExpensesByQuotation.value(quotationId).reduce((sum, g) => sum + g.totalCost, 0);
    };
  });

  const getExpensesMinimumSplit = computed(() => {
    return (quotationId: string): number => {
      return getExpensesByQuotation.value(quotationId)
        .filter(g => g.splitType === 'minimum')
        .reduce((sum, g) => sum + g.totalCost, 0);
    };
  });

  const getExpensesTotalSplit = computed(() => {
    return (quotationId: string): number => {
      return getExpensesByQuotation.value(quotationId)
        .filter(g => g.splitType === 'total')
        .reduce((sum, g) => sum + g.totalCost, 0);
    };
  });

  // Seats that can be sold: the total minus the travel's coordinators when the
  // quotation says they take a seat. It's the divisor of costs split among the
  // total and the base of the projected profit.
  // Coordinators belong to the travel, not the quotation: the caller passes how many there
  // are (`coordinatorIds.length` from travelDetailQuery). Same for the getters built on this one.
  const getSellableSeats = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const quote = quotations.value.find(c => c.id === quotationId);
      if (!quote)
        return 0;
      return calculateSellableSeats(quote, coordinatorCount);
    };
  });

  // Cost of the services with a full bus: per-person ones count their cost per
  // person × sellable seats.
  const getProvidersFullBusCost = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const sellableSeats = getSellableSeats.value(quotationId, coordinatorCount);
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId)
        .reduce((sum, p) => sum + calculateProviderQuotedCost(p, sellableSeats), 0);
    };
  });

  // First sold seat at which revenue exceeds the cost of services + buses + expenses.
  // Accommodation is left out: each traveler pays it separately according to their room.
  // Returns 0 if there's no seat price yet.
  const getBreakEvenSeat = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const quotation = quotations.value.find(c => c.id === quotationId);
      if (!quotation || quotation.seatPrice === 0)
        return 0;
      // Per-person services grow with each traveler: each seat leaves price − its per-person
      // cost to cover the fixed costs (total-cost services + buses).
      const costPerSeat = getPerPersonSeatCost.value(quotationId);
      const marginPerSeat = quotation.seatPrice - costPerSeat;
      if (marginPerSeat <= 0)
        return getSellableSeats.value(quotationId, coordinatorCount) + 1;
      const fixedCost = getProvidersMinimumSplitCost.value(quotationId) + getProvidersTotalSplitCost.value(quotationId) + getBusesTotalCost.value(quotationId) + getExpensesTotal.value(quotationId);
      return Math.floor(fixedCost / marginPerSeat) + 1;
    };
  });

  // Price calculated from the minimum target seat (the quotation's seatPrice)
  // Includes provider, bus and extra expense costs; accommodation is added separately in the reference price matrix
  const getCalculatedSeatPrice = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const quotation = quotations.value.find(c => c.id === quotationId);
      if (!quotation)
        return 0;

      return calculateSeatPrice(
        { minimumSeatTarget: quotation.minimumSeatTarget, sellableSeats: getSellableSeats.value(quotationId, coordinatorCount) },
        quotationProviders.value.filter(p => p.quotationId === quotationId),
        quotationBuses.value.filter(b => b.quotationId === quotationId),
        getExpensesByQuotation.value(quotationId),
      );
    };
  });

  // Profit with a full bus: sellable seats × seat price − (services + buses + expenses).
  // Accommodation is left out of both sides: travelers pay it separately according to their room.
  const getProjectedProfit = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const quotation = quotations.value.find(c => c.id === quotationId);
      const sellableSeats = getSellableSeats.value(quotationId, coordinatorCount);
      if (!quotation || sellableSeats === 0)
        return 0;
      const totalCost = getProvidersFullBusCost.value(quotationId, coordinatorCount) + getBusesTotalCost.value(quotationId) + getExpensesTotal.value(quotationId);
      return (sellableSeats * quotation.seatPrice) - totalCost;
    };
  });

  // How many people a cost is split among according to "Dividir entre": the minimum
  // target seats or the sellable seats. It's also the default number of people of a
  // service charged per person.
  const getCostDivisor = computed(() => {
    return (quotationId: string, splitType: CostSplitType, coordinatorCount: number): number => {
      const quotation = quotations.value.find(c => c.id === quotationId);
      if (!quotation)
        return 0;
      return splitType === 'total'
        ? getSellableSeats.value(quotationId, coordinatorCount)
        : quotation.minimumSeatTarget;
    };
  });

  const getProviderCostPerPerson = computed(() => {
    return (quotationProviderId: string, coordinatorCount: number): number => {
      const provider = quotationProviders.value.find(p => p.id === quotationProviderId);
      if (!provider)
        return 0;

      // A per-person service adds its per-person cost to each seat, with no split.
      if (isPerPersonProvider(provider))
        return provider.unitCost ?? 0;

      const divisor = getCostDivisor.value(provider.quotationId, provider.splitType ?? 'minimum', coordinatorCount);
      if (divisor === 0)
        return 0;
      return provider.totalCost / divisor;
    };
  });

  // Price adjustments (Niño -10%, Adulto mayor -$50...) of a per-person service.
  const getAdjustmentsByProvider = computed(() => {
    return (quotationProviderId: string): ProviderPriceAdjustment[] =>
      providerPriceAdjustments.value.filter(a => a.quotationProviderId === quotationProviderId);
  });

  // The adjustment a traveler pays in a service; undefined = base price.
  const getTravelerAdjustment = computed(() => {
    return (quotationProviderId: string, travelerId: string): ProviderPriceAdjustment | undefined => {
      const choice = travelerPriceAdjustments.value.find(a => a.quotationProviderId === quotationProviderId && a.travelerId === travelerId);
      return choice ? providerPriceAdjustments.value.find(a => a.id === choice.adjustmentId) : undefined;
    };
  });

  // Travelers (by id) who do NOT take an optional service. Everyone else does.
  const getOptOutsByProvider = computed(() => {
    return (quotationProviderId: string): Set<string> => {
      return new Set(
        providerOptOuts.value
          .filter(o => o.quotationProviderId === quotationProviderId)
          .map(o => o.travelerId),
      );
    };
  });

  // Accommodation payments: built by createSupplierPaymentSlice.
  const getPaymentsByAccommodation = accommodationPaymentSlice.getPayments;
  const getPaidByAccommodation = accommodationPaymentSlice.getPaid;
  const getPendingBalanceByAccommodation = accommodationPaymentSlice.getPendingBalance;
  const getAccommodationOverpayment = accommodationPaymentSlice.getOverpayment;
  const getAccommodationPaymentStatus = accommodationPaymentSlice.getStatus;
  const getTotalPendingBalanceAccommodations = accommodationPaymentSlice.getTotalPendingBalance;

  const canConfirm = computed(() => {
    return (quotationId: string): boolean => {
      const providers = quotationProviders.value.filter(p => p.quotationId === quotationId);
      if (providers.length === 0)
        return false;
      return providers.every(p => p.confirmed === true);
    };
  });

  const filteredProviders = computed(() => {
    return (quotationId: string): QuotationProvider[] => {
      let result = quotationProviders.value.filter(p => p.quotationId === quotationId);

      const f = filters.value;

      if (f.paymentStatus && f.paymentStatus !== 'all') {
        result = result.filter(p => getProviderPaymentStatus.value(p.id) === f.paymentStatus);
      }

      if (f.confirmed !== undefined && f.confirmed !== 'all') {
        result = result.filter(p => p.confirmed === f.confirmed);
      }

      if (f.paymentMethod && f.paymentMethod !== 'all') {
        result = result.filter(p => p.paymentMethod === f.paymentMethod);
      }

      return result;
    };
  });

  const getBusesByQuotation = computed(() => {
    return (quotationId: string): QuotationBus[] => {
      return quotationBuses.value.filter(b => b.quotationId === quotationId);
    };
  });

  const getBusesByProviderInQuotation = computed(() => {
    return (quotationId: string, providerId: string): QuotationBus[] => {
      return quotationBuses.value.filter(
        b => b.quotationId === quotationId && b.providerId === providerId,
      );
    };
  });

  // Bus payments: built by createSupplierPaymentSlice.
  const getPaymentsByBus = busPaymentSlice.getPayments;
  const getPaidByBus = busPaymentSlice.getPaid;
  const getPendingBalanceByBus = busPaymentSlice.getPendingBalance;
  const getBusOverpayment = busPaymentSlice.getOverpayment;
  const getTotalPendingBalanceBuses = busPaymentSlice.getTotalPendingBalance;
  const getBusPaymentStatus = busPaymentSlice.getStatus;

  const getBusCostPerPerson = computed(() => {
    return (quotationBusId: string, coordinatorCount: number): number => {
      const bus = quotationBuses.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 0;
      const quotation = quotations.value.find(c => c.id === bus.quotationId);
      if (!quotation)
        return 0;
      const divisor = bus.splitType === 'total'
        ? getSellableSeats.value(quotation.id, coordinatorCount)
        : quotation.minimumSeatTarget;
      if (divisor === 0)
        return 0;
      return bus.totalCost / divisor;
    };
  });

  // Internal helper — recalculates the quotation's seatPrice.
  // quotations.total_seats is kept by a DB trigger as the sum of the quotation's bus
  // capacities; mirror it in the cache so the seat price, profit and break-even use it.
  function _refreshTotalSeats(quotationId: string): void {
    const index = quotations.value.findIndex(c => c.id === quotationId);
    const quotation = quotations.value[index];
    if (!quotation)
      return;
    const totalSeats = quotationBuses.value
      .filter(b => b.quotationId === quotationId)
      .reduce((sum, b) => sum + b.capacity, 0);
    if (totalSeats !== quotation.totalSeats)
      quotations.value[index] = { ...quotation, totalSeats };
  }

  async function _syncSeatPrice(quotationId: string): Promise<void> {
    _refreshTotalSeats(quotationId);

    const quotation = quotations.value.find(c => c.id === quotationId);
    if (!quotation || quotation.status === 'confirmed')
      return;
    if (quotation.minimumSeatTarget === 0)
      return;

    // The price is saved to the DB, so the coordinators it subtracts come fresh from the
    // server (`fetch` ignores `staleTime`). A failed request throws and the caller's catch
    // skips the save rather than store a wrong price.
    let travel: TravelDetail | null | undefined;
    try {
      const entry = queryCache.ensure(travelDetailQuery(quotation.travelId));
      travel = (await queryCache.fetch(entry)).data;
    }
    catch (e) {
      throw new Error('No se pudo recalcular el precio por asiento porque no cargó el viaje. Intenta de nuevo.', { cause: e });
    }
    if (!travel)
      throw new Error('No se encontró el viaje de esta cotización. Recarga la página e intenta de nuevo.');

    const newSeatPrice = getCalculatedSeatPrice.value(quotationId, travel.coordinatorIds.length);

    await repository.updateSeatPrice(quotationId, newSeatPrice);

    const index = quotations.value.findIndex(c => c.id === quotationId);
    if (index !== -1 && quotations.value[index]) {
      quotations.value[index] = {
        ...quotations.value[index]!,
        seatPrice: newSeatPrice,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Rooms the travel would keep for hotel room types the quotation no longer lists once
   * `nextAccommodations` is saved. They'd cost nothing, so they're deleted after the save;
   * while any of them has someone in it the change is refused instead.
   * @param quotationId - The quotation being changed
   * @param nextAccommodations - The quotation's hotels as they'll be after the change
   * @returns The empty rooms to delete, or an error when some are occupied
   */
  async function _findRoomsToDrop(
    quotationId: string,
    nextAccommodations: Pick<QuotationAccommodation, 'providerId' | 'details'>[],
  ): Promise<TravelAccommodation[] | { error: string }> {
    const quotation = quotations.value.find(c => c.id === quotationId);
    if (!quotation)
      return [];

    // The rooms decide what gets deleted, so they come fresh from the server: `fetch`
    // ignores `staleTime` (`refresh` wouldn't). A failed request throws and the caller's
    // catch aborts the change before anything is written.
    const travelEntry = queryCache.ensure(travelDetailQuery(quotation.travelId));
    const { data } = await queryCache.fetch(travelEntry);
    if (!data) {
      return { error: 'No se encontró el viaje de esta cotización. Recarga la página e intenta de nuevo.' };
    }

    const rooms = findRoomsOutsideQuotation(
      nextAccommodations,
      data.accommodations,
    );
    if (rooms.length === 0)
      return [];

    const occupiedIds = await repository.getOccupiedAccommodationIds(quotation.travelId);
    const occupied = rooms.filter(room => occupiedIds.has(room.id)).length;
    if (occupied > 0) {
      return {
        error: `${occupied} habitación(es) de lo que quitaste tienen viajeros. Sácalos en la pestaña Habitaciones del viaje y vuelve a intentarlo.`,
      };
    }
    return rooms;
  }

  async function _deleteRooms(quotationId: string, rooms: TravelAccommodation[]): Promise<void> {
    const quotation = quotations.value.find(c => c.id === quotationId);
    if (!quotation || rooms.length === 0)
      return;
    const ids = rooms.map(room => room.id);
    await repository.deleteUnoccupiedAccommodations(ids);
    // The travel's rooms changed: its detail (room list and counts) has to be fetched again.
    queryCache.invalidateQueries({ key: travelKeys.detail(quotation.travelId), exact: true });
  }

  // Actions

  /**
   * Copies a travel's quotation into the store, replacing what it had for that travel.
   * Only quotationByTravelQuery calls it, each time it fetches.
   * @param travelId - UUID of the travel
   * @param result - The fetched quotation and its children, or `null` if it has none
   */
  function hydrateTravel(travelId: string, result: QuotationFetchResult | null): void {
    if (!result) {
      const existing = quotations.value.find(c => c.travelId === travelId);
      if (existing) {
        const qId = existing.id;
        quotations.value = quotations.value.filter(c => c.id !== qId);
        quotationProviders.value = quotationProviders.value.filter(p => p.quotationId !== qId);
        providerPaymentSlice.replaceForParents(quotationProviders.value.filter(p => p.quotationId === qId).map(p => p.id));
        quotationAccommodations.value = quotationAccommodations.value.filter(h => h.quotationId !== qId);
        accommodationPaymentSlice.replaceForParents(quotationAccommodations.value.filter(h => h.quotationId === qId).map(h => h.id));
        quotationPublicPrices.value = quotationPublicPrices.value.filter(p => p.quotationId !== qId);
        quotationBuses.value = quotationBuses.value.filter(b => b.quotationId !== qId);
        busPaymentSlice.replaceForParents(quotationBuses.value.filter(b => b.quotationId === qId).map(b => b.id));
        quotationExpenses.value = quotationExpenses.value.filter(g => g.quotationId !== qId);
      }
      return;
    }

    const {
      quotation,
      providers,
      providerPayments: fetchedProviderPayments,
      providerAdjustments,
      accommodations,
      accommodationPayments: fetchedAccommodationPayments,
      publicPrices,
      buses,
      busPayments: fetchedBusPayments,
      expenses,
    } = result;
    const quotationId = quotation.id;

    quotations.value = [...quotations.value.filter(c => c.travelId !== travelId), quotation];
    quotationProviders.value = [...quotationProviders.value.filter(p => p.quotationId !== quotationId), ...providers];
    providerPaymentSlice.replaceForParents(providers.map(p => p.id), fetchedProviderPayments);
    providerPriceAdjustments.value = [...providerPriceAdjustments.value.filter(a => !providers.some(pr => pr.id === a.quotationProviderId)), ...providerAdjustments];
    quotationAccommodations.value = [...quotationAccommodations.value.filter(h => h.quotationId !== quotationId), ...accommodations];
    accommodationPaymentSlice.replaceForParents(accommodations.map(h => h.id), fetchedAccommodationPayments);
    quotationPublicPrices.value = [...quotationPublicPrices.value.filter(p => p.quotationId !== quotationId), ...publicPrices];
    quotationBuses.value = [...quotationBuses.value.filter(b => b.quotationId !== quotationId), ...buses];
    busPaymentSlice.replaceForParents(buses.map(b => b.id), fetchedBusPayments);
    quotationExpenses.value = [...quotationExpenses.value.filter(g => g.quotationId !== quotationId), ...expenses];
  }

  /**
   * Loads a travel's quotation into the store from code that can't use `useQuery` (actions,
   * pages that load several travels). Cached and fresh = no request; `force` always asks the
   * server. Screens that show the quotation mount quotationByTravelQuery with `useQuery`.
   * @param travelId - UUID of the travel
   * @param options - Fetch options
   * @param options.force - Ignore `staleTime` and always ask the server
   */
  async function fetchByTravel(travelId: string, options?: { force?: boolean }): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const entry = queryCache.ensure(quotationByTravelQuery(travelId));
      await (options?.force ? queryCache.fetch(entry) : queryCache.refresh(entry));
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Recalculates the seat price of a travel's quotation. Call it after the travel's
   * coordinators change: when they take seats, the sellable seats change with them.
   * @param travelId - UUID of the travel
   * @returns `false` when the price couldn't be recomputed (the error is in `error`)
   */
  async function syncSeatPriceForTravel(travelId: string): Promise<boolean> {
    await fetchByTravel(travelId, { force: true });
    const quotation = quotations.value.find(c => c.travelId === travelId);
    if (!quotation?.coordinatorsTakeSeats)
      return true;

    try {
      await _syncSeatPrice(quotation.id);
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return false;
    }
  }

  async function createQuotation(data: QuotationFormData): Promise<Quotation> {
    const existing = quotations.value.find(c => c.travelId === data.travelId);
    if (existing)
      return existing;

    loading.value = true;
    error.value = null;
    try {
      const quotation = await repository.insertQuotation(data);
      quotations.value.push(quotation);
      return quotation;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateQuotation(id: string, data: Partial<QuotationFormData>): Promise<Quotation | undefined> {
    const index = quotations.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Cotización no encontrada';
      return undefined;
    }

    const existing = quotations.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateQuotation(id, data);
      quotations.value[index] = updated;

      if ('minimumSeatTarget' in data || 'coordinatorsTakeSeats' in data) {
        await _syncSeatPrice(id);
      }

      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Confirms a quotation, locking its providers, lodging and buses (payments stay open).
   * It doesn't touch the travel's services: those are the public list shown on the web,
   * edited on their own, while the quotation's providers are internal costs.
   * @param id - UUID of the quotation to confirm
   * @returns `{ success: true }`, or `{ success: false, error }` with a user-facing message
   */
  async function confirmQuotation(id: string): Promise<{ success: boolean; error?: string }> {
    const quotation = quotations.value.find(c => c.id === id);
    if (!quotation)
      return { success: false, error: 'Cotización no encontrada' };

    if (!canConfirm.value(id)) {
      return { success: false, error: 'Todos los proveedores deben estar confirmados' };
    }

    const updated = await updateQuotation(id, { status: 'confirmed' });
    if (!updated)
      return { success: false, error: error.value ?? 'No se pudo confirmar la cotización' };
    return { success: true };
  }

  /**
   * Sends a confirmed quotation back to draft so its providers, lodging and buses can be
   * edited again. Payments are unaffected (they're allowed in both states).
   * @param id - UUID of the quotation to reopen
   * @returns `{ success: true }`, or `{ success: false, error }` with a user-facing message
   */
  async function reopenQuotation(id: string): Promise<{ success: boolean; error?: string }> {
    const quotation = quotations.value.find(c => c.id === id);
    if (!quotation)
      return { success: false, error: 'Cotización no encontrada' };
    if (quotation.status !== 'confirmed')
      return { success: true };

    const updated = await updateQuotation(id, { status: 'draft' });
    if (!updated)
      return { success: false, error: error.value ?? 'No se pudo reabrir la cotización' };
    return { success: true };
  }

  async function addQuotationProvider(data: QuotationProviderFormData): Promise<QuotationProvider | { error: string }> {
    const quotation = quotations.value.find(c => c.id === data.quotationId);
    if (!quotation)
      return { error: 'Cotización no encontrada' };
    if (quotation.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const newProvider = await repository.insertProvider(data);
      quotationProviders.value.push(newProvider);
      await _syncSeatPrice(data.quotationId);
      return newProvider;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateQuotationProvider(
    id: string,
    data: Partial<QuotationProviderFormData>,
  ): Promise<QuotationProvider | undefined> {
    const index = quotationProviders.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = quotationProviders.value[index];
    if (!existing)
      return undefined;

    const quotation = quotations.value.find(c => c.id === existing.quotationId);
    if (quotation?.status === 'confirmed')
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProvider(id, data);
      quotationProviders.value[index] = updated;
      await _syncSeatPrice(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteQuotationProvider(id: string): Promise<void> {
    const provider = quotationProviders.value.find(p => p.id === id);
    if (!provider)
      return;

    const quotation = quotations.value.find(c => c.id === provider.quotationId);
    if (quotation?.status === 'confirmed')
      return;

    const quotationId = provider.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteProvider(id);

      quotationProviders.value = quotationProviders.value.filter(p => p.id !== id);
      providerPaymentSlice.replaceForParents([id]);
      providerPriceAdjustments.value = providerPriceAdjustments.value.filter(a => a.quotationProviderId !== id);
      travelerPriceAdjustments.value = travelerPriceAdjustments.value.filter(a => a.quotationProviderId !== id);
      await _syncSeatPrice(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Changes whether the provider of a per-person service gives coordinators a courtesy.
   * Allowed on a confirmed quotation because it doesn't change the seat price.
   */
  async function updateProviderCourtesy(
    id: string,
    coordinatorsCourtesy: boolean,
  ): Promise<QuotationProvider | { error: string }> {
    const index = quotationProviders.value.findIndex(p => p.id === id);
    const existing = quotationProviders.value[index];
    if (!existing)
      return { error: 'Proveedor no encontrado' };
    if (!isPerPersonProvider(existing))
      return { error: 'Solo un servicio cobrado por persona puede dar cortesía' };

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProviderCourtesy(id, coordinatorsCourtesy);
      quotationProviders.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Re-reads what is owed to each provider of the travel's quotation. The database
   * recalculates it when travelers are added, deleted or unchecked.
   * @param travelId - The travel whose travelers changed
   */
  async function refreshProviderPayableCosts(travelId: string): Promise<void> {
    const quotation = quotations.value.find(c => c.travelId === travelId);
    if (!quotation)
      return;

    try {
      const costs = new Map(
        (await repository.fetchProviderPayableCosts(quotation.id)).map(c => [c.id, c.payableCost]),
      );
      quotationProviders.value = quotationProviders.value.map(p =>
        costs.has(p.id) ? { ...p, payableCost: costs.get(p.id)! } : p,
      );
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  async function fetchProviderOptOuts(travelId: string): Promise<void> {
    try {
      const optOuts = await repository.fetchProviderOptOuts(travelId);
      providerOptOuts.value = [
        ...providerOptOuts.value.filter(o => o.travelId !== travelId),
        ...optOuts,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  /**
   * Sets whether some travelers take an optional service and refreshes what is owed.
   * Allowed on a confirmed quotation, like the rooms.
   * @returns An error message, or null if everything went well
   */
  async function setServiceTakers(
    quotationProviderId: string,
    travelId: string,
    travelerIds: string[],
    takes: boolean,
  ): Promise<string | null> {
    const optedOut = getOptOutsByProvider.value(quotationProviderId);
    const changed = travelerIds.filter(id => optedOut.has(id) === takes);
    if (changed.length === 0)
      return null;

    error.value = null;
    try {
      if (takes) {
        await repository.deleteProviderOptOuts(quotationProviderId, changed);
        providerOptOuts.value = providerOptOuts.value.filter(o =>
          !(o.quotationProviderId === quotationProviderId && changed.includes(o.travelerId)),
        );
      }
      else {
        const added = changed.map(travelerId => ({ quotationProviderId, travelerId, travelId }));
        await repository.insertProviderOptOuts(added);
        providerOptOuts.value.push(...added);
      }
      await refreshProviderPayableCosts(travelId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
  }

  /**
   * Saves the price adjustments of a per-person service and refreshes what is owed.
   * Allowed on a confirmed quotation because they don't change the seat price.
   * @returns An error message, or null if everything went well
   */
  async function saveProviderAdjustments(
    quotationProviderId: string,
    drafts: ProviderPriceAdjustmentDraft[],
  ): Promise<string | null> {
    const provider = quotationProviders.value.find(p => p.id === quotationProviderId);
    if (!provider)
      return 'Proveedor no encontrado';
    const quotation = quotations.value.find(c => c.id === provider.quotationId);

    error.value = null;
    try {
      const saved = await repository.saveProviderAdjustments(quotationProviderId, drafts);
      providerPriceAdjustments.value = [
        ...providerPriceAdjustments.value.filter(a => a.quotationProviderId !== quotationProviderId),
        ...saved,
      ];
      // A deleted adjustment puts its travelers back on the base price (in the DB by cascade).
      const savedIds = new Set(saved.map(a => a.id));
      travelerPriceAdjustments.value = travelerPriceAdjustments.value.filter(a =>
        a.quotationProviderId !== quotationProviderId || savedIds.has(a.adjustmentId),
      );
      if (quotation)
        await refreshProviderPayableCosts(quotation.travelId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
  }

  async function fetchTravelerAdjustments(travelId: string): Promise<void> {
    try {
      const choices = await repository.fetchTravelerAdjustments(travelId);
      travelerPriceAdjustments.value = [
        ...travelerPriceAdjustments.value.filter(a => a.travelId !== travelId),
        ...choices,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  /**
   * Picks the adjustment some travelers pay in a service (null = base price) and refreshes
   * what is owed to the provider.
   * @returns An error message, or null if everything went well
   */
  async function setTravelerAdjustment(
    quotationProviderId: string,
    travelId: string,
    travelerIds: string[],
    adjustmentId: string | null,
  ): Promise<string | null> {
    error.value = null;
    try {
      await repository.setTravelerAdjustment(quotationProviderId, travelId, travelerIds, adjustmentId);
      travelerPriceAdjustments.value = [
        ...travelerPriceAdjustments.value.filter(a =>
          !(a.quotationProviderId === quotationProviderId && travelerIds.includes(a.travelerId)),
        ),
        ...(adjustmentId
          ? travelerIds.map(travelerId => ({ quotationProviderId, travelerId, travelId, adjustmentId }))
          : []),
      ];
      await refreshProviderPayableCosts(travelId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
  }

  async function toggleProviderConfirmed(id: string): Promise<void> {
    const provider = quotationProviders.value.find(p => p.id === id);
    if (!provider)
      return;

    const quotation = quotations.value.find(c => c.id === provider.quotationId);
    if (quotation?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.toggleProviderConfirmed(id, !provider.confirmed);

      const index = quotationProviders.value.findIndex(p => p.id === id);
      if (index !== -1 && quotationProviders.value[index]) {
        quotationProviders.value[index] = { ...quotationProviders.value[index]!, confirmed: !provider.confirmed };
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // Provider payment actions: built by createSupplierPaymentSlice.
  const addProviderPayment = providerPaymentSlice.add;
  const updateProviderPayment = providerPaymentSlice.update;
  const deleteProviderPayment = providerPaymentSlice.remove;

  function setFilters(f: QuotationProviderFilters): void {
    filters.value = { ...f };
  }

  function clearFilters(): void {
    filters.value = {};
  }

  // ============================================================================
  // Accommodation Actions
  // ============================================================================

  async function addQuotationAccommodation(data: QuotationAccommodationFormData): Promise<QuotationAccommodation | { error: string }> {
    const quotation = quotations.value.find(c => c.id === data.quotationId);
    if (!quotation)
      return { error: 'Cotización no encontrada' };
    if (quotation.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      // No rooms are created here: they're added on the travel's rooms page.
      const newAccommodation = await repository.insertAccommodation(data);
      quotationAccommodations.value.push(newAccommodation);
      await _syncSeatPrice(data.quotationId);
      return newAccommodation;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateQuotationAccommodation(
    id: string,
    data: Partial<QuotationAccommodationFormData>,
  ): Promise<QuotationAccommodation | { error: string }> {
    const index = quotationAccommodations.value.findIndex(h => h.id === id);
    const existing = quotationAccommodations.value[index];
    if (!existing)
      return { error: 'Hospedaje no encontrado' };

    const quotation = quotations.value.find(c => c.id === existing.quotationId);
    if (quotation?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const next = getAccommodationsByQuotation.value(existing.quotationId)
        .map(h => (h.id === id ? { ...h, details: data.details ?? h.details } : h));
      const roomsToDrop = await _findRoomsToDrop(existing.quotationId, next);
      if ('error' in roomsToDrop)
        return roomsToDrop;

      const updated = await repository.updateAccommodation(id, data, existing.details);
      quotationAccommodations.value[index] = updated;
      await _deleteRooms(existing.quotationId, roomsToDrop);
      await _syncSeatPrice(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Removes a hotel from the quotation, along with its empty rooms on the travel.
   * Refused while any of its rooms has someone in it.
   * @returns An error message, or `null` when it was deleted
   */
  async function deleteQuotationAccommodation(id: string): Promise<string | null> {
    const accommodation = quotationAccommodations.value.find(h => h.id === id);
    if (!accommodation)
      return 'Hospedaje no encontrado';

    const quotation = quotations.value.find(c => c.id === accommodation.quotationId);
    if (quotation?.status === 'confirmed')
      return 'No se puede modificar una cotización confirmada';

    const quotationId = accommodation.quotationId;
    loading.value = true;
    error.value = null;
    try {
      const next = getAccommodationsByQuotation.value(quotationId).filter(h => h.id !== id);
      const roomsToDrop = await _findRoomsToDrop(quotationId, next);
      if ('error' in roomsToDrop)
        return roomsToDrop.error;

      await repository.deleteAccommodation(id);

      quotationAccommodations.value = quotationAccommodations.value.filter(h => h.id !== id);
      accommodationPaymentSlice.replaceForParents([id]);
      await _deleteRooms(quotationId, roomsToDrop);
      await _syncSeatPrice(quotationId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Re-reads what's owed to each hotel of the travel's quotation. The database recomputes
   * it whenever a room is added to or removed from the travel.
   * @param travelId - The travel whose rooms changed
   */
  async function refreshAccommodationCosts(travelId: string): Promise<void> {
    const quotation = quotations.value.find(c => c.travelId === travelId);
    if (!quotation)
      return;

    try {
      const costs = new Map(
        (await repository.fetchAccommodationCosts(quotation.id)).map(c => [c.id, c.totalCost]),
      );
      quotationAccommodations.value = quotationAccommodations.value.map(h =>
        costs.has(h.id) ? { ...h, totalCost: costs.get(h.id)! } : h,
      );
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  async function toggleAccommodationConfirmed(id: string): Promise<void> {
    const accommodation = quotationAccommodations.value.find(h => h.id === id);
    if (!accommodation)
      return;

    const quotation = quotations.value.find(c => c.id === accommodation.quotationId);
    if (quotation?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.toggleConfirmAccommodation(id, !accommodation.confirmed);

      const index = quotationAccommodations.value.findIndex(h => h.id === id);
      if (index !== -1 && quotationAccommodations.value[index]) {
        quotationAccommodations.value[index] = { ...quotationAccommodations.value[index]!, confirmed: !accommodation.confirmed };
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // Accommodation payment actions: built by createSupplierPaymentSlice.
  const addAccommodationPayment = accommodationPaymentSlice.add;
  const updateAccommodationPayment = accommodationPaymentSlice.update;
  const deleteAccommodationPayment = accommodationPaymentSlice.remove;

  // ============================================================================
  // Public Price Actions
  // ============================================================================

  async function addPublicPrice(data: QuotationPublicPriceFormData): Promise<QuotationPublicPrice | { error: string }> {
    const quotation = quotations.value.find(c => c.id === data.quotationId);
    if (!quotation)
      return { error: 'Cotización no encontrada' };

    loading.value = true;
    error.value = null;
    try {
      const newPrice = await repository.insertPublicPrice(data);
      quotationPublicPrices.value.push(newPrice);
      return newPrice;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updatePublicPrice(id: string, data: Partial<QuotationPublicPriceFormData>): Promise<QuotationPublicPrice | undefined> {
    const index = quotationPublicPrices.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = quotationPublicPrices.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updatePublicPrice(id, data);
      quotationPublicPrices.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deletePublicPrice(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deletePublicPrice(id);
      quotationPublicPrices.value = quotationPublicPrices.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // ============================================================================
  // Extra Expense Actions
  // ============================================================================

  async function fetchExpenseCategories(): Promise<void> {
    try {
      expenseCategories.value = await repository.fetchExpenseCategories();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  function _rememberCategory(category: string): void {
    if (!expenseCategories.value.includes(category))
      expenseCategories.value = [...expenseCategories.value, category];
  }

  async function addExpense(data: QuotationExpenseFormData): Promise<QuotationExpense | { error: string }> {
    const quotation = quotations.value.find(c => c.id === data.quotationId);
    if (!quotation)
      return { error: 'Cotización no encontrada' };
    if (quotation.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const expense = await repository.insertExpense(data);
      quotationExpenses.value.push(expense);
      _rememberCategory(expense.category);
      await _syncSeatPrice(data.quotationId);
      return expense;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateExpense(id: string, data: QuotationExpenseFormData): Promise<QuotationExpense | { error: string }> {
    const index = quotationExpenses.value.findIndex(g => g.id === id);
    const existing = quotationExpenses.value[index];
    if (!existing)
      return { error: 'Gasto no encontrado' };

    const quotation = quotations.value.find(c => c.id === existing.quotationId);
    if (quotation?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const expense = await repository.updateExpense(id, data);
      quotationExpenses.value[index] = expense;
      _rememberCategory(expense.category);
      await _syncSeatPrice(existing.quotationId);
      return expense;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteExpense(id: string): Promise<boolean> {
    const expense = quotationExpenses.value.find(g => g.id === id);
    if (!expense)
      return false;

    const quotation = quotations.value.find(c => c.id === expense.quotationId);
    if (quotation?.status === 'confirmed')
      return false;

    loading.value = true;
    error.value = null;
    try {
      await repository.deleteExpense(id);
      quotationExpenses.value = quotationExpenses.value.filter(g => g.id !== id);
      await _syncSeatPrice(expense.quotationId);
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return false;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // ============================================================================
  // Reserved Bus Actions
  // ============================================================================

  async function addBusQuotation(data: QuotationBusFormData): Promise<QuotationBus | { error: string }> {
    const quotation = quotations.value.find(c => c.id === data.quotationId);
    if (!quotation)
      return { error: 'Cotización no encontrada' };
    if (quotation.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    const duplicate = quotationBuses.value.find(
      b => b.quotationId === data.quotationId
        && b.providerId === data.providerId
        && b.unitNumber === data.unitNumber,
    );
    if (duplicate)
      return { error: 'Este número de unidad ya existe para este proveedor en la cotización' };

    loading.value = true;
    error.value = null;
    try {
      const { quotationBus: newBus } = await repository.insertBus(data, quotation.travelId);
      // The repository also creates the linked travel_bus; refetching the travel detail
      // brings it (and the new total_seats) to the traveler bus options and operators.
      queryCache.invalidateQueries({ key: travelKeys.detail(quotation.travelId), exact: true });
      quotationBuses.value.push(newBus);
      await _syncSeatPrice(data.quotationId);
      return newBus;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateBusQuotation(id: string, data: Partial<QuotationBusFormData>): Promise<QuotationBus | undefined> {
    const index = quotationBuses.value.findIndex(b => b.id === id);
    if (index === -1)
      return undefined;

    const existing = quotationBuses.value[index];
    if (!existing)
      return undefined;

    // Confirmed quotations lock the bus structure and costs, but coordinators are assigned
    // on the travel side at any time, so a coordinator-only change still goes through.
    const quotation = quotations.value.find(c => c.id === existing.quotationId);
    const onlyCoordinators = Object.keys(data).every(key => key === 'coordinatorIds');
    if (quotation?.status === 'confirmed' && !onlyCoordinators) {
      error.value = 'No se puede modificar una cotización confirmada';
      return undefined;
    }

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateBus(id, data);
      quotationBuses.value[index] = updated;

      // travel_buses is the operational projection coordinators see; the repository call
      // above keeps it in sync, and refetching the travel detail brings the new provider,
      // unit and capacity to the traveler bus options and operators.
      if (quotation) {
        queryCache.invalidateQueries({ key: travelKeys.detail(quotation.travelId), exact: true });
      }

      await _syncSeatPrice(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteBusQuotation(id: string): Promise<void> {
    const bus = quotationBuses.value.find(b => b.id === id);
    if (!bus)
      return;

    const quotation = quotations.value.find(c => c.id === bus.quotationId);
    if (quotation?.status === 'confirmed')
      return;

    const quotationId = bus.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteBus(id);

      quotationBuses.value = quotationBuses.value.filter(b => b.id !== id);
      busPaymentSlice.replaceForParents([id]);
      // The linked travel_bus is deleted by CASCADE in the DB (quotation_bus_id FK ON DELETE CASCADE)
      // and travelers.travel_bus_id is cleared by ON DELETE SET NULL. Refetching the travel
      // detail removes it from the travelers' bus options.
      if (quotation) {
        queryCache.invalidateQueries({ key: travelKeys.detail(quotation.travelId), exact: true });
      }
      await _syncSeatPrice(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // Bus payment actions: built by createSupplierPaymentSlice.
  const addBusPayment = busPaymentSlice.add;
  const updateBusPayment = busPaymentSlice.update;
  const deleteBusPayment = busPaymentSlice.remove;

  return {
    // State
    quotations,
    quotationProviders,
    providerPayments,
    providerOptOuts,
    providerPriceAdjustments,
    travelerPriceAdjustments,
    quotationAccommodations,
    accommodationPayments,
    quotationPublicPrices,
    quotationBuses,
    busPayments,
    quotationExpenses,
    expenseCategories,
    loading,
    error,
    filters,
    // Getters
    getQuotationByTravel,
    getProvidersByQuotation,
    getPaymentsByProvider,
    getProvidersFullBusCost,
    getProvidersMinimumSplitCost,
    getProvidersTotalSplitCost,
    getPerPersonSeatCost,
    getSellableSeats,
    getBreakEvenSeat,
    getCalculatedSeatPrice,
    getProjectedProfit,
    getPaidByProvider,
    getProviderCostPerPerson,
    getCostDivisor,
    getPendingBalanceByProvider,
    getProviderOverpayment,
    getOptOutsByProvider,
    getAdjustmentsByProvider,
    getTravelerAdjustment,
    getProviderPaymentStatus,
    getTotalPendingBalanceProviders,
    getPaymentsByAccommodation,
    getPaidByAccommodation,
    getPendingBalanceByAccommodation,
    getAccommodationOverpayment,
    getAccommodationPaymentStatus,
    getTotalPendingBalanceAccommodations,
    canConfirm,
    filteredProviders,
    getAccommodationsByQuotation,
    getAccommodationsTotalCost,
    getPublicPricesByQuotation,
    getReferencePriceMatrix,
    getBusesTotalCost,
    getBusesMinimumSplitCost,
    getBusesTotalSplitCost,
    getTotalPendingBalanceBuses,
    getBusesByQuotation,
    getBusesByProviderInQuotation,
    getPaymentsByBus,
    getPaidByBus,
    getPendingBalanceByBus,
    getBusOverpayment,
    getBusPaymentStatus,
    getBusCostPerPerson,
    getExpensesByQuotation,
    getExpensesTotal,
    getExpensesMinimumSplit,
    getExpensesTotalSplit,
    // Actions
    fetchByTravel,
    hydrateTravel,
    createQuotation,
    syncSeatPriceForTravel,
    updateQuotation,
    confirmQuotation,
    reopenQuotation,
    addQuotationProvider,
    updateQuotationProvider,
    deleteQuotationProvider,
    toggleProviderConfirmed,
    updateProviderCourtesy,
    refreshProviderPayableCosts,
    fetchProviderOptOuts,
    setServiceTakers,
    saveProviderAdjustments,
    fetchTravelerAdjustments,
    setTravelerAdjustment,
    addProviderPayment,
    updateProviderPayment,
    deleteProviderPayment,
    setFilters,
    clearFilters,
    addQuotationAccommodation,
    updateQuotationAccommodation,
    deleteQuotationAccommodation,
    refreshAccommodationCosts,
    toggleAccommodationConfirmed,
    addAccommodationPayment,
    updateAccommodationPayment,
    deleteAccommodationPayment,
    addPublicPrice,
    updatePublicPrice,
    deletePublicPrice,
    addBusQuotation,
    updateBusQuotation,
    deleteBusQuotation,
    addBusPayment,
    updateBusPayment,
    deleteBusPayment,
    fetchExpenseCategories,
    addExpense,
    updateExpense,
    deleteExpense,
  };
});
