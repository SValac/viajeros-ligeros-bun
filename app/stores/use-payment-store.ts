import type {
  DiscountType,
  Payment,
  PaymentFilters,
  PaymentFormData,
  PaymentStatus,
  PaymentUpdateData,
  TravelerAccountConfig,
  TravelerPaymentSummary,
} from '~/types/payment';

export const usePaymentStore = defineStore('usePaymentStore', () => {
  // State
  const payments = ref<Payment[]>([]);
  const accountConfigs = ref<TravelerAccountConfig[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<PaymentFilters>({});

  // Getters (computed)
  const allPayments = computed((): Payment[] => {
    return [...payments.value].sort((a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );
  });

  const getPaymentById = computed(() => {
    return (id: string): Payment | undefined => {
      return payments.value.find(p => p.id === id);
    };
  });

  const getPaymentsByTravel = computed(() => {
    return (travelId: string): Payment[] => {
      return payments.value.filter(p => p.travelId === travelId);
    };
  });

  const getPaymentsByTraveler = computed(() => {
    return (travelerId: string): Payment[] => {
      return payments.value.filter(p => p.travelerId === travelerId);
    };
  });

  const getPaymentsByTravelerAndTravel = computed(() => {
    return (travelerId: string, travelId: string): Payment[] => {
      return payments.value.filter(
        p => p.travelerId === travelerId && p.travelId === travelId,
      );
    };
  });

  const getAccountConfig = computed(() => {
    return (travelerId: string, travelId: string): TravelerAccountConfig | undefined => {
      return accountConfigs.value.find(
        c => c.travelerId === travelerId && c.travelId === travelId,
      );
    };
  });

  const getTravelerPaymentSummary = computed(() => {
    return (travelerId: string, travelId: string, travelPrice: number): TravelerPaymentSummary => {
      const config = getAccountConfig.value(travelerId, travelId);
      const travelerType = config?.travelerType ?? 'adult';
      const appliedPrice = travelerType === 'child' && config?.childPrice != null
        ? config.childPrice
        : travelPrice;

      const discount = config?.discount ?? 0;
      const discountType: DiscountType = config?.discountType ?? 'fixed';

      let finalCost: number;
      if (discount > 0) {
        finalCost = discountType === 'percentage'
          ? appliedPrice * (1 - discount / 100)
          : appliedPrice - discount;
      }
      else {
        finalCost = appliedPrice;
      }
      finalCost = Math.max(0, finalCost);

      const travelerPayments = getPaymentsByTravelerAndTravel.value(travelerId, travelId);
      const totalPaid = travelerPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, finalCost - totalPaid);

      let status: PaymentStatus;
      if (totalPaid <= 0) {
        status = 'pending';
      }
      else if (totalPaid >= finalCost) {
        status = 'paid';
      }
      else {
        status = 'partial';
      }

      return {
        travelId,
        travelerId,
        totalCost: travelPrice,
        travelerType,
        appliedPrice,
        discount,
        discountType,
        finalCost,
        totalPaid,
        balance,
        status,
      };
    };
  });

  const filteredPayments = computed((): Payment[] => {
    return payments.value.filter((p) => {
      if (filters.value.travelId && p.travelId !== filters.value.travelId)
        return false;
      if (filters.value.travelerId && p.travelerId !== filters.value.travelerId)
        return false;
      if (filters.value.paymentType && p.paymentType !== filters.value.paymentType)
        return false;
      if (filters.value.dateFrom && p.paymentDate < filters.value.dateFrom)
        return false;
      if (filters.value.dateTo && p.paymentDate > filters.value.dateTo)
        return false;
      return true;
    });
  });

  const getTravelCashSummary = computed(() => {
    return (travelId: string): { totalCollected: number } => {
      const travelPayments = getPaymentsByTravel.value(travelId);
      const totalCollected = travelPayments.reduce((sum, p) => sum + p.amount, 0);
      return { totalCollected };
    };
  });

  // Actions
  function addPayment(data: PaymentFormData): Payment | { error: string } {
    // Validate traveler has an account config (enrolled in travel)
    const config = getAccountConfig.value(data.travelerId, data.travelId);
    if (!config) {
      return { error: 'El viajero no tiene una cuenta configurada para este viaje.' };
    }

    // We need travelPrice to validate; callers should ensure the config exists first.
    // For validation we'll get the summary using appliedPrice from config.
    const existingPayments = getPaymentsByTravelerAndTravel.value(data.travelerId, data.travelId);
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    const appliedPrice = config.travelerType === 'child' && config.childPrice != null
      ? config.childPrice
      : 0; // fallback; callers should set childPrice or use travel price

    const discount = config.discount ?? 0;
    const discountType = config.discountType ?? 'fixed';
    const finalCost = discount > 0
      ? (discountType === 'percentage' ? appliedPrice * (1 - discount / 100) : appliedPrice - discount)
      : appliedPrice;

    const balance = Math.max(0, finalCost - totalPaid);

    if (appliedPrice > 0 && data.amount > balance) {
      return { error: `El monto no puede superar el saldo pendiente (${balance}).` };
    }

    const now = new Date().toISOString();
    const newPayment: Payment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    payments.value.push(newPayment);
    error.value = null;
    return newPayment;
  }

  function updatePayment(id: string, data: PaymentUpdateData): Payment | undefined {
    const index = payments.value.findIndex(p => p.id === id);
    if (index === -1) {
      error.value = 'Pago no encontrado';
      return undefined;
    }

    const existing = payments.value[index];
    if (!existing) {
      error.value = 'Pago no encontrado';
      return undefined;
    }

    const updated: Payment = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    payments.value[index] = updated;
    error.value = null;
    return updated;
  }

  function deletePayment(id: string): void {
    const index = payments.value.findIndex(p => p.id === id);
    if (index === -1) {
      error.value = 'Pago no encontrado';
      return;
    }
    payments.value.splice(index, 1);
    error.value = null;
  }

  function setAccountConfig(config: TravelerAccountConfig): void {
    const index = accountConfigs.value.findIndex(
      c => c.travelerId === config.travelerId && c.travelId === config.travelId,
    );
    if (index === -1) {
      accountConfigs.value.push(config);
    }
    else {
      accountConfigs.value[index] = config;
    }
  }

  function setFilters(newFilters: PaymentFilters): void {
    filters.value = { ...newFilters };
  }

  function clearFilters(): void {
    filters.value = {};
  }

  function loadMockData(): void {
    if (payments.value.length > 0 || accountConfigs.value.length > 0) {
      return;
    }

    const mockTravelId = 'travel-mock-001';
    const traveler1Id = 'mock-traveler-1';
    const traveler2Id = 'mock-traveler-2';
    const traveler3Id = 'mock-traveler-3';

    // Mock account configs
    const mockConfigs: TravelerAccountConfig[] = [
      {
        travelId: mockTravelId,
        travelerId: traveler1Id,
        travelerType: 'adult',
        discount: 200,
        discountType: 'fixed',
      },
      {
        travelId: mockTravelId,
        travelerId: traveler2Id,
        travelerType: 'child',
        childPrice: 900,
        discount: 0,
        discountType: 'fixed',
      },
      {
        travelId: mockTravelId,
        travelerId: traveler3Id,
        travelerType: 'adult',
        discount: 10,
        discountType: 'percentage',
      },
    ];

    mockConfigs.forEach(c => accountConfigs.value.push(c));

    const now = new Date().toISOString();
    const mockPayments: (PaymentFormData & { id: string })[] = [
      {
        id: crypto.randomUUID(),
        travelId: mockTravelId,
        travelerId: traveler1Id,
        amount: 500,
        paymentDate: '2026-02-15',
        paymentType: 'cash',
        notes: 'Anticipo inicial',
      },
      {
        id: crypto.randomUUID(),
        travelId: mockTravelId,
        travelerId: traveler1Id,
        amount: 300,
        paymentDate: '2026-03-01',
        paymentType: 'transfer',
        notes: 'Ref: TRF-001',
      },
      {
        id: crypto.randomUUID(),
        travelId: mockTravelId,
        travelerId: traveler2Id,
        amount: 900,
        paymentDate: '2026-02-20',
        paymentType: 'cash',
      },
      {
        id: crypto.randomUUID(),
        travelId: mockTravelId,
        travelerId: traveler3Id,
        amount: 400,
        paymentDate: '2026-03-05',
        paymentType: 'transfer',
        notes: 'Ref: TRF-002',
      },
    ];

    mockPayments.forEach(({ id, ...data }) => {
      payments.value.push({ ...data, id, createdAt: now, updatedAt: now });
    });
  }

  return {
    // State
    payments,
    accountConfigs,
    loading,
    error,
    filters,
    // Getters
    allPayments,
    getPaymentById,
    getPaymentsByTravel,
    getPaymentsByTraveler,
    getPaymentsByTravelerAndTravel,
    getAccountConfig,
    getTravelerPaymentSummary,
    filteredPayments,
    getTravelCashSummary,
    // Actions
    addPayment,
    updatePayment,
    deletePayment,
    setAccountConfig,
    setFilters,
    clearFilters,
    loadMockData,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-payments',
    storage: import.meta.client ? localStorage : undefined,
  },
});
