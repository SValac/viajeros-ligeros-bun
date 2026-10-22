import type {
  Payment,
  PaymentFormData,
  PaymentUpdateData,
  TravelerAccountConfig,
  TravelerPaymentSummary,
} from '~/types/payment';

import { calculatePaymentSummary, validatePaymentAmount } from '~/composables/payments/use-payments-domain';
import { usePaymentsRepository } from '~/composables/payments/use-payments-repository';
import { paymentKeys } from '~/queries/payments';
import { toErrorMessage } from '~/utils/error-message';

export const usePaymentStore = defineStore('usePaymentStore', () => {
  const repository = usePaymentsRepository();
  const queryCache = useQueryCache();

  // State
  const payments = ref<Payment[]>([]);
  const accountConfigs = ref<TravelerAccountConfig[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters (computed)
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
    return (travelerId: string, travelId: string): TravelerPaymentSummary => {
      const config = getAccountConfig.value(travelerId, travelId);
      const travelerPayments = getPaymentsByTravelerAndTravel.value(travelerId, travelId);
      const summary = calculatePaymentSummary(config, travelerPayments);

      return {
        travelId,
        travelerId,
        travelerType: config?.travelerType ?? 'adult',
        discounts: config?.discounts ?? [],
        surcharges: config?.surcharges ?? [],
        ...summary,
      };
    };
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
    await fetchByTravels([travelId]);
  }

  /**
   * Loads the payments and account configs of some travels, replacing what the store had
   * for them.
   * @throws Re-throws repository errors (the message is also in `error`)
   */
  async function fetchByTravels(travelIds: string[]): Promise<void> {
    if (travelIds.length === 0)
      return;

    loading.value = true;
    error.value = null;
    try {
      const [fetchedPayments, fetchedConfigs] = await Promise.all([
        repository.fetchPaymentsByTravels(travelIds),
        repository.fetchConfigsByTravels(travelIds),
      ]);

      const ids = new Set(travelIds);

      const otherPayments = payments.value.filter(p => !ids.has(p.travelId));
      payments.value = [...otherPayments, ...fetchedPayments];

      const otherConfigs = accountConfigs.value.filter(c => !ids.has(c.travelId));
      accountConfigs.value = [...otherConfigs, ...fetchedConfigs];
    }
    catch (e) {
      error.value = toErrorMessage(e);
      throw e;
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
      error.value = toErrorMessage(e);
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Records a traveler's payment after checking it against their balance.
   * @returns The saved payment
   * @throws {Error} With the validation message, or re-throws repository errors
   */
  async function addPayment(data: PaymentFormData): Promise<Payment> {
    // Validate traveler has an account config (enrolled in travel)
    const config = getAccountConfig.value(data.travelerId, data.travelId);
    if (!config)
      throw new Error('El viajero no tiene una cuenta configurada para este viaje.');

    const existingPayments = getPaymentsByTravelerAndTravel.value(data.travelerId, data.travelId);
    const { balance, appliedPrice } = calculatePaymentSummary(config, existingPayments);
    const validationError = validatePaymentAmount(data.amount, balance, appliedPrice);
    if (validationError)
      throw new Error(validationError);

    loading.value = true;
    error.value = null;
    try {
      const payment = await repository.insertPayment(data);
      queryCache.invalidateQueries({ key: paymentKeys.root });
      payments.value.push(payment);
      return payment;
    }
    catch (e) {
      error.value = toErrorMessage(e);
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updatePayment(id: string, data: PaymentUpdateData): Promise<Payment> {
    loading.value = true;
    error.value = null;
    try {
      const payment = await repository.updatePayment(id, data);
      queryCache.invalidateQueries({ key: paymentKeys.root });

      const index = payments.value.findIndex(p => p.id === id);
      if (index !== -1) {
        payments.value[index] = payment;
      }
      return payment;
    }
    catch (e) {
      error.value = toErrorMessage(e);
      throw e;
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
      queryCache.invalidateQueries({ key: paymentKeys.root });

      payments.value = payments.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = toErrorMessage(e);
      throw e;
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
      queryCache.invalidateQueries({ key: paymentKeys.root });

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
      error.value = toErrorMessage(e);
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  return {
    // State
    payments,
    accountConfigs,
    loading,
    error,
    // Getters
    getPaymentsByTravel,
    getPaymentsByTraveler,
    getPaymentsByTravelerAndTravel,
    getAccountConfig,
    getTravelerPaymentSummary,
    getTravelCashSummary,
    // Actions
    fetchByTravel,
    fetchByTravels,
    fetchByTraveler,
    addPayment,
    updatePayment,
    deletePayment,
    setAccountConfig,
  };
});
