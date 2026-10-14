import type { PaymentStatus } from '~/types/payment';
import type { SupplierPayment, SupplierPaymentFields } from '~/types/quotation';

export type SupplierPaymentKind = 'provider' | 'accommodation' | 'bus';

// Store getters and actions for one kind. `parentId` is the quotation bus, accommodation or
// provider; `paymentId` is the payment itself.
type SupplierPaymentApi = {
  payments: (parentId: string) => SupplierPayment[];
  paid: (parentId: string) => number;
  pendingBalance: (parentId: string) => number;
  status: (parentId: string) => PaymentStatus;
  overpayment: (parentId: string) => number;
  add: (parentId: string, data: SupplierPaymentFields) => Promise<SupplierPayment | { error: string }>;
  update: (paymentId: string, data: SupplierPaymentFields) => Promise<SupplierPayment | undefined>;
  remove: (paymentId: string) => Promise<void>;
};

/**
 * The quotation store's getters and actions for one kind of supplier payment, under the same
 * names for the three kinds, so payment components and table columns don't branch on it.
 * @param kind - Whose payments: quotation provider, accommodation or bus
 * @returns Getters by parent id (payments, paid, pending balance, overpayment, status) and the
 *   add/update/remove actions
 */
export function useSupplierPaymentApi(kind: SupplierPaymentKind): SupplierPaymentApi {
  const quotationStore = useQuotationStore();
  const byKind: Record<SupplierPaymentKind, SupplierPaymentApi> = {
    bus: {
      payments: parentId => quotationStore.getPaymentsByBus(parentId),
      paid: parentId => quotationStore.getPaidByBus(parentId),
      pendingBalance: parentId => quotationStore.getPendingBalanceByBus(parentId),
      status: parentId => quotationStore.getBusPaymentStatus(parentId),
      overpayment: parentId => quotationStore.getBusOverpayment(parentId),
      add: (parentId, data) => quotationStore.addBusPayment({ ...data, quotationBusId: parentId }),
      update: (paymentId, data) => quotationStore.updateBusPayment(paymentId, data),
      remove: paymentId => quotationStore.deleteBusPayment(paymentId),
    },
    accommodation: {
      payments: parentId => quotationStore.getPaymentsByAccommodation(parentId),
      paid: parentId => quotationStore.getPaidByAccommodation(parentId),
      pendingBalance: parentId => quotationStore.getPendingBalanceByAccommodation(parentId),
      status: parentId => quotationStore.getAccommodationPaymentStatus(parentId),
      overpayment: parentId => quotationStore.getAccommodationOverpayment(parentId),
      add: (parentId, data) => quotationStore.addAccommodationPayment({ ...data, quotationAccommodationId: parentId }),
      update: (paymentId, data) => quotationStore.updateAccommodationPayment(paymentId, data),
      remove: paymentId => quotationStore.deleteAccommodationPayment(paymentId),
    },
    provider: {
      payments: parentId => quotationStore.getPaymentsByProvider(parentId),
      paid: parentId => quotationStore.getPaidByProvider(parentId),
      pendingBalance: parentId => quotationStore.getPendingBalanceByProvider(parentId),
      status: parentId => quotationStore.getProviderPaymentStatus(parentId),
      overpayment: parentId => quotationStore.getProviderOverpayment(parentId),
      add: (parentId, data) => quotationStore.addProviderPayment({ ...data, quotationProviderId: parentId }),
      update: (paymentId, data) => quotationStore.updateProviderPayment(paymentId, data),
      remove: paymentId => quotationStore.deleteProviderPayment(paymentId),
    },
  };
  return byKind[kind];
}

/**
 * Payments of one quotation bus, accommodation or provider, with the same API for the three
 * kinds so a single component can list and edit them.
 * @param kind - What the payments belong to; it doesn't change for a mounted component
 * @param parentId - Id of the quotation bus, accommodation or provider. Pass a getter
 *   (`() => parentId` with destructured props): the computeds read it on every run, so they
 *   follow when it changes
 * @returns The sorted payments, paid total and pending balance as computeds, plus `add`
 *   (adds the parent id), `update` and `remove` (both take the payment id)
 */
export function useSupplierPayments(kind: SupplierPaymentKind, parentId: MaybeRefOrGetter<string>) {
  const api = useSupplierPaymentApi(kind);
  const payments = computed(() => api.payments(toValue(parentId)));
  const paid = computed(() => api.paid(toValue(parentId)));
  const pendingBalance = computed(() => api.pendingBalance(toValue(parentId)));

  return {
    payments,
    paid,
    pendingBalance,
    add: (data: SupplierPaymentFields) => api.add(toValue(parentId), data),
    update: api.update,
    remove: api.remove,
  };
}
