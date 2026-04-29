import type {
  Payment,
  PaymentFilters,
  PaymentFormData,
  PaymentUpdateData,
  TravelerAccountConfig,
  TravelerPaymentSummary,
} from '~/types/payment';

import { calculatePaymentSummary, validatePaymentAmount } from '~/composables/payments/use-payments-domain';
import { usePaymentsRepository } from '~/composables/payments/use-payments-repository';

export const usePaymentStore = defineStore('usePaymentStore', () => {
  const repository = usePaymentsRepository();

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
      const travelerPayments = getPaymentsByTravelerAndTravel.value(travelerId, travelId);
      const summary = calculatePaymentSummary(config, travelPrice, travelerPayments);

      return {
        travelId,
        travelerId,
        totalCost: travelPrice,
        travelerType: config?.travelerType ?? 'adult',
        discounts: config?.discounts ?? [],
        surcharges: config?.surcharges ?? [],
        ...summary,
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
  async function fetchByTravel(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [fetchedPayments, fetchedConfigs] = await Promise.all([
        repository.fetchPaymentsByTravel(travelId),
        repository.fetchConfigsByTravel(travelId),
      ]);

      const otherPayments = payments.value.filter(p => p.travelId !== travelId);
      payments.value = [...otherPayments, ...fetchedPayments];

      const otherConfigs = accountConfigs.value.filter(c => c.travelId !== travelId);
      accountConfigs.value = [...otherConfigs, ...fetchedConfigs];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function fetchByTraveler(travelerId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [fetchedPayments, fetchedConfigs] = await Promise.all([
        repository.fetchPaymentsByTraveler(travelerId),
        repository.fetchConfigsByTraveler(travelerId),
      ]);

      const otherPayments = payments.value.filter(p => p.travelerId !== travelerId);
      payments.value = [...otherPayments, ...fetchedPayments];

      const otherConfigs = accountConfigs.value.filter(c => c.travelerId !== travelerId);
      accountConfigs.value = [...otherConfigs, ...fetchedConfigs];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function addPayment(data: PaymentFormData): Promise<Payment | { error: string }> {
    // Validate traveler has an account config (enrolled in travel)
    const config = getAccountConfig.value(data.travelerId, data.travelId);
    if (!config) {
      return { error: 'El viajero no tiene una cuenta configurada para este viaje.' };
    }

    const existingPayments = getPaymentsByTravelerAndTravel.value(data.travelerId, data.travelId);
    const { balance, appliedPrice } = calculatePaymentSummary(config, 0, existingPayments);
    const validationError = validatePaymentAmount(data.amount, balance, appliedPrice);
    if (validationError) {
      return { error: validationError };
    }

    loading.value = true;
    error.value = null;
    try {
      const payment = await repository.insertPayment(data);
      payments.value.push(payment);
      return payment;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value ?? 'Error desconocido' };
    }
    finally {
      loading.value = false;
    }
  }

  async function updatePayment(id: string, data: PaymentUpdateData): Promise<Payment | undefined> {
    loading.value = true;
    error.value = null;
    try {
      const payment = await repository.updatePayment(id, data);
      const index = payments.value.findIndex(p => p.id === id);
      if (index !== -1) {
        payments.value[index] = payment;
      }
      return payment;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deletePayment(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removePayment(id);
      payments.value = payments.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function setAccountConfig(config: TravelerAccountConfig): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.upsertAccountConfig(config);
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
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: PaymentFilters): void {
    filters.value = { ...newFilters };
  }

  function clearFilters(): void {
    filters.value = {};
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
    fetchByTravel,
    fetchByTraveler,
    addPayment,
    updatePayment,
    deletePayment,
    setAccountConfig,
    setFilters,
    clearFilters,
  };
});
