import type { PaymentType } from '~/types/payment';

export type QuotationStatus = 'draft' | 'confirmed';
export type ProviderPaymentStatus = 'pending' | 'partial' | 'paid';

export type Quotation = {
  id: string;
  travelId: string;
  busCapacity: number;
  minimumSeatTarget: number;
  seatPrice: number;
  status: QuotationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CostSplitType = 'minimum' | 'total';

export type QuotationProvider = {
  id: string;
  quotationId: string;
  providerId: string;
  serviceDescription: string;
  remarks?: string;
  totalCost: number;
  paymentMethod: PaymentType;
  splitType: CostSplitType;
  confirmed: boolean;
};

export type ProviderPayment = {
  id: string;
  quotationProviderId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  concept?: string;
  notes?: string;
  createdAt: string;
};

export type QuotationFormData = Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type QuotationProviderFormData = Omit<QuotationProvider, 'id'> & { id?: string };
export type ProviderPaymentFormData = Omit<ProviderPayment, 'id' | 'createdAt'> & { id?: string };

export type QuotationProviderFilters = {
  paymentStatus?: ProviderPaymentStatus | 'all';
  confirmed?: boolean | 'all';
  paymentMethod?: PaymentType | 'all';
};

// ============================================================================
// Accommodation Types
// ============================================================================

export type QuotationAccommodationDetail = {
  id: string;
  roomTypeId: string;
  quantity: number;
  pricePerNight: number;
  maxOccupancy: number;
  costPerPerson?: number;
  totalCost?: number;
};

export type AccommodationPaymentStatus = 'pending' | 'partial' | 'paid';

export type QuotationAccommodation = {
  id: string;
  quotationId: string;
  providerId: string;
  nightCount: number;
  details: QuotationAccommodationDetail[];
  totalCost: number;
  paymentMethod: PaymentType;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccommodationPayment = {
  id: string;
  quotationAccommodationId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  concept?: string;
  notes?: string;
  createdAt: string;
};

export type AccommodationPaymentFormData = Omit<AccommodationPayment, 'id' | 'createdAt'> & { id?: string };

export type QuotationAccommodationFormData = Omit<QuotationAccommodation, 'id' | 'totalCost' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type QuotationAccommodationDetailFormData = Omit<QuotationAccommodationDetail, 'id' | 'costPerPerson' | 'totalCost'> & {
  id?: string;
};

// ============================================================================
// Bus Quotation Types
// ============================================================================

export type QuotationBusStatus = 'reserved' | 'confirmed' | 'pending';

export type QuotationBus = {
  id: string;
  quotationId: string;
  providerId: string;
  unitNumber: string;
  capacity: number;
  status: QuotationBusStatus;
  totalCost: number;
  splitType: CostSplitType;
  paymentMethod: PaymentType;
  remarks?: string;
  confirmed: boolean;
  notes?: string;
  coordinatorIds?: [] | [string] | [string, string];
  createdAt: string;
  updatedAt: string;
};

export type QuotationBusFormData = Omit<QuotationBus, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type BusPaymentStatus = 'pending' | 'partial' | 'paid';

export type BusPayment = {
  id: string;
  quotationBusId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  concept?: string;
  notes?: string;
  createdAt: string;
};

export type BusPaymentFormData = Omit<BusPayment, 'id' | 'createdAt'> & { id?: string };

// ============================================================================
// Public Price Types
// ============================================================================

export type QuotationPublicPrice = {
  id: string;
  quotationId: string;
  priceType: string;
  description: string;
  pricePerPerson: number;
  roomType?: string;
  ageGroup?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuotationPublicPriceFormData = Omit<QuotationPublicPrice, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type QuotationFetchResult = {
  quotation: Quotation;
  providers: QuotationProvider[];
  providerPayments: ProviderPayment[];
  accommodations: QuotationAccommodation[];
  accommodationPayments: AccommodationPayment[];
  buses: QuotationBus[];
  busPayments: BusPayment[];
  publicPrices: QuotationPublicPrice[];
};
