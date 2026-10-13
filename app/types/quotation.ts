import type { PaymentType } from '~/types/payment';

export type QuotationStatus = 'draft' | 'confirmed';
export type ProviderPaymentStatus = 'pending' | 'partial' | 'paid';

export type Quotation = {
  id: string;
  travelId: string;
  totalSeats: number;
  minimumSeatTarget: number;
  seatPrice: number;
  status: QuotationStatus;
  notes?: string;
  /** Whether the public web shows each public price's room type (beds). */
  showPublicRoomType: boolean;
  /** Whether the public web shows each public price's description. */
  showPublicDescription: boolean;
  /**
   * Whether the travel's coordinators take passenger seats. If so they're subtracted from
   * the sellable seats; if not they get no seat (rooms only).
   */
  coordinatorsTakeSeats: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CostSplitType = 'minimum' | 'total';

// How the user entered a service's cost: the total or a price per person.
export type ProviderCostType = 'total' | 'per_person';

export type QuotationProvider = {
  id: string;
  quotationId: string;
  providerId: string;
  serviceDescription: string;
  remarks?: string;
  totalCost: number;
  costType: ProviderCostType;
  // Only with costType 'per_person': price per person. It's added straight to the seat
  // price, and the provider is paid for each traveler who takes the service. Its totalCost
  // is for reference only (cost × sellable seats when saved).
  unitCost?: number;
  paymentMethod: PaymentType;
  // Total cost only: which seats it's split among.
  splitType: CostSplitType;
  confirmed: boolean;
  // Per person only: coordinators don't count for the payment.
  coordinatorsCourtesy: boolean;
  // What is owed to the provider (computed by the database): per person, cost ×
  // travelers who take it; for a total cost, totalCost.
  payableCost: number;
};

// Adjustment to a service's per-person cost for a type of person (e.g. "Niño" -10%,
// "Adulto mayor" -$50). It only changes what the provider is paid, not the seat price.
export type PriceAdjustmentKind = 'discount' | 'surcharge';
export type PriceAdjustmentMode = 'percent' | 'amount';

export type ProviderPriceAdjustment = {
  id: string;
  quotationProviderId: string;
  label: string;
  kind: PriceAdjustmentKind;
  mode: PriceAdjustmentMode;
  /** Percentage (1-100 for a discount) or an amount in pesos. Always > 0. */
  value: number;
};

/** An adjustment while editing: no id yet if it's new. */
export type ProviderPriceAdjustmentDraft = Omit<ProviderPriceAdjustment, 'id' | 'quotationProviderId'> & { id?: string };

// The adjustment a traveler pays in a service (no row = base price).
export type TravelerPriceAdjustment = {
  quotationProviderId: string;
  travelerId: string;
  travelId: string;
  adjustmentId: string;
};

// A traveler who doesn't take an optional service.
export type ProviderOptOut = {
  quotationProviderId: string;
  travelerId: string;
  travelId: string;
};

// Fields of a payment to a supplier, the same for a quotation provider, accommodation or bus.
// What the payment form edits; the parent id is added by whoever saves it.
export type SupplierPaymentFields = {
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  concept?: string;
  notes?: string;
};

// A saved supplier payment, without its parent key. ProviderPayment, AccommodationPayment and
// BusPayment fit it.
export type SupplierPayment = SupplierPaymentFields & { id: string; createdAt: string };

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

// Extra quotation expense that isn't a provider service: advertising, travel allowances,
// commissions, box lunch... Always split among the seats by splitType. No payments.
export type QuotationExpense = {
  id: string;
  quotationId: string;
  // Free text: default categories plus the ones the agency already used.
  category: string;
  description?: string;
  costType: ProviderCostType;
  // Only with costType 'per_person': totalCost = unitCost × personCount.
  unitCost?: number;
  personCount?: number;
  totalCost: number;
  splitType: CostSplitType;
  createdAt: string;
};

export type QuotationExpenseFormData = Omit<QuotationExpense, 'id' | 'createdAt'> & { id?: string };

export type QuotationFormData = Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'showPublicRoomType' | 'showPublicDescription' | 'coordinatorsTakeSeats'> & {
  id?: string;
  /** Defaults to `false` (every seat is sellable) when a quotation is created. */
  coordinatorsTakeSeats?: boolean;
  /** Defaults to `true` (shown) when a quotation is created. */
  showPublicRoomType?: boolean;
  /** Defaults to `true` (shown) when a quotation is created. */
  showPublicDescription?: boolean;
};
export type QuotationProviderFormData = Omit<QuotationProvider, 'id' | 'payableCost'> & { id?: string };
export type ProviderPaymentFormData = Omit<ProviderPayment, 'id' | 'createdAt'> & { id?: string };

export type QuotationProviderFilters = {
  paymentStatus?: ProviderPaymentStatus | 'all';
  confirmed?: boolean | 'all';
  paymentMethod?: PaymentType | 'all';
};

// ============================================================================
// Accommodation Types
// ============================================================================

// A hotel room type picked for the quotation. How many rooms of it the travel holds lives
// on the travel (travel_accommodations), not here: it changes until the trip leaves.
export type QuotationAccommodationDetail = {
  id: string;
  roomTypeId: string;
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
  /**
   * Room occupancy the price is for. Set from the reference price when created from a
   * template (users can't edit it); unset for hand-written prices. The web groups by it.
   */
  maxOccupancy?: number;
  createdAt: string;
  updatedAt: string;
};

export type QuotationPublicPriceFormData = Omit<QuotationPublicPrice, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Values the public price form is prefilled with from a reference price
export type QuotationPublicPriceTemplate = Partial<Omit<QuotationPublicPriceFormData, 'id' | 'quotationId'>>;

export type QuotationFetchResult = {
  quotation: Quotation;
  providers: QuotationProvider[];
  providerPayments: ProviderPayment[];
  providerAdjustments: ProviderPriceAdjustment[];
  accommodations: QuotationAccommodation[];
  accommodationPayments: AccommodationPayment[];
  buses: QuotationBus[];
  busPayments: BusPayment[];
  expenses: QuotationExpense[];
  publicPrices: QuotationPublicPrice[];
};
