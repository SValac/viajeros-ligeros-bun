export type PaymentType = 'cash' | 'transfer';
export type TravelerType = 'adult' | 'child';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type DiscountType = 'fixed' | 'percentage';

export type AjusteItem = {
  amount: number;
  type: DiscountType;
  description?: string;
};

export type Payment = {
  id: string;
  travelId: string;
  travelerId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentFormData = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type PaymentUpdateData = Partial<PaymentFormData>;

export type TravelerAccountConfig = {
  travelId: string;
  travelerId: string;
  travelerType: TravelerType;
  childPrice?: number;
  discounts: AjusteItem[];
  surcharges: AjusteItem[];
  precioPublicoId?: string;
  precioPublicoMonto?: number;
};

export type TravelerPaymentSummary = {
  travelId: string;
  travelerId: string;
  totalCost: number;
  travelerType: TravelerType;
  appliedPrice: number;
  discounts: AjusteItem[];
  surcharges: AjusteItem[];
  totalDiscountAmount: number;
  totalSurchargeAmount: number;
  finalCost: number;
  totalPaid: number;
  balance: number;
  status: PaymentStatus;
};

export type PaymentFilters = {
  travelId?: string;
  travelerId?: string;
  status?: PaymentStatus;
  paymentType?: PaymentType;
  travelerType?: TravelerType;
  dateFrom?: string;
  dateTo?: string;
};
