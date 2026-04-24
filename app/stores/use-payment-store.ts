import type { TablesUpdate } from '~/types/database.types';
import type {
  AdjustmentItem,
  Payment,
  PaymentFilters,
  PaymentFormData,
  PaymentStatus,
  PaymentUpdateData,
  TravelerAccountConfig,
  TravelerPaymentSummary,
} from '~/types/payment';

import {
  mapPaymentRowToDomain,
  mapPaymentToInsert,
  mapTravelerAccountConfigRowToDomain,
  mapTravelerAccountConfigToUpsert,
} from '~/utils/mappers';

export const usePaymentStore = defineStore('usePaymentStore', () => {
  const supabase = useSupabase();

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
      const appliedPrice = config?.publicPriceAmount ?? (
        travelerType === 'child' && config?.childPrice != null
          ? config.childPrice
          : travelPrice
      );

      const discounts = config?.discounts ?? [];
      const surcharges = config?.surcharges ?? [];

      function calcAmount(item: AdjustmentItem, base: number) {
        return item.type === 'percentage' ? base * item.amount / 100 : item.amount;
      }

      const totalDiscountAmount = discounts.reduce((sum, d) => sum + calcAmount(d, appliedPrice), 0);
      const totalSurchargeAmount = surcharges.reduce((sum, s) => sum + calcAmount(s, appliedPrice), 0);
      const finalCost = Math.max(0, appliedPrice - totalDiscountAmount + totalSurchargeAmount);

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
        discounts,
        surcharges,
        totalDiscountAmount,
        totalSurchargeAmount,
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
  async function fetchByTravel(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('payments')
        .select('*')
        .eq('travel_id', travelId)
        .order('payment_date', { ascending: false });
      if (err)
        throw err;
      const otherPayments = payments.value.filter(p => p.travelId !== travelId);
      payments.value = [...otherPayments, ...data.map(mapPaymentRowToDomain)];

      const { data: configData, error: configErr } = await supabase
        .from('traveler_account_configs')
        .select('*')
        .eq('travel_id', travelId);
      if (configErr)
        throw configErr;
      const otherConfigs = accountConfigs.value.filter(c => c.travelId !== travelId);
      accountConfigs.value = [...otherConfigs, ...configData.map(mapTravelerAccountConfigRowToDomain)];
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
      const { data, error: err } = await supabase
        .from('payments')
        .select('*')
        .eq('traveler_id', travelerId)
        .order('payment_date', { ascending: false });
      if (err)
        throw err;
      const otherPayments = payments.value.filter(p => p.travelerId !== travelerId);
      payments.value = [...otherPayments, ...data.map(mapPaymentRowToDomain)];

      const { data: configData, error: configErr } = await supabase
        .from('traveler_account_configs')
        .select('*')
        .eq('traveler_id', travelerId);
      if (configErr)
        throw configErr;
      const otherConfigs = accountConfigs.value.filter(c => c.travelerId !== travelerId);
      accountConfigs.value = [...otherConfigs, ...configData.map(mapTravelerAccountConfigRowToDomain)];
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
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    const appliedPrice = config.publicPriceAmount ?? (
      config.travelerType === 'child' && config.childPrice != null
        ? config.childPrice
        : 0
    );

    const discounts = config.discounts ?? [];
    const surcharges = config.surcharges ?? [];
    const totalDiscountAmount = discounts.reduce((sum, d) => {
      return sum + (d.type === 'percentage' ? appliedPrice * d.amount / 100 : d.amount);
    }, 0);
    const totalSurchargeAmount = surcharges.reduce((sum, s) => {
      return sum + (s.type === 'percentage' ? appliedPrice * s.amount / 100 : s.amount);
    }, 0);
    const finalCost = Math.max(0, appliedPrice - totalDiscountAmount + totalSurchargeAmount);

    const balance = Math.max(0, finalCost - totalPaid);

    if (appliedPrice > 0 && data.amount > balance) {
      return { error: `El monto no puede superar el saldo pendiente (${balance}).` };
    }

    loading.value = true;
    error.value = null;
    try {
      const { data: row, error: err } = await supabase
        .from('payments')
        .insert(mapPaymentToInsert(data))
        .select()
        .single();
      if (err)
        throw err;
      const payment = mapPaymentRowToDomain(row);
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
      const update: TablesUpdate<'payments'> = {};
      if (data.amount !== undefined)
        update.amount = data.amount;
      if (data.paymentDate !== undefined)
        update.payment_date = data.paymentDate;
      if (data.paymentType !== undefined)
        update.payment_type = data.paymentType;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;

      const { data: row, error: err } = await supabase
        .from('payments')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const payment = mapPaymentRowToDomain(row);
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
      const { error: err } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      if (err)
        throw err;
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
      const { error: err } = await supabase
        .from('traveler_account_configs')
        .upsert(mapTravelerAccountConfigToUpsert(config), { onConflict: 'travel_id,traveler_id' });
      if (err)
        throw err;
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
