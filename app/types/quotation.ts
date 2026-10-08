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

// Cómo capturó el usuario el costo de un servicio: el total o un precio por persona.
export type ProviderCostType = 'total' | 'per_person';

export type QuotationProvider = {
  id: string;
  quotationId: string;
  providerId: string;
  serviceDescription: string;
  remarks?: string;
  totalCost: number;
  costType: ProviderCostType;
  // Solo con costType 'per_person': precio por persona. Se suma directo al precio del
  // asiento y al proveedor se le paga por cada viajero que toma el servicio. Su totalCost
  // es solo de referencia (costo × asientos vendibles al guardar).
  unitCost?: number;
  paymentMethod: PaymentType;
  // Solo en costo total: entre qué asientos se reparte.
  splitType: CostSplitType;
  confirmed: boolean;
  // Solo por persona: los coordinadores no cuentan para el pago.
  coordinatorsCourtesy: boolean;
  // Lo que se le debe al proveedor (lo calcula la base de datos): por persona, costo ×
  // viajeros que lo toman; en costo total, totalCost.
  payableCost: number;
};

// Ajuste al costo por persona de un servicio para un tipo de persona (ej. "Niño" -10%,
// "Adulto mayor" -$50). Solo cambia lo que se le paga al proveedor, no el precio del asiento.
export type PriceAdjustmentKind = 'discount' | 'surcharge';
export type PriceAdjustmentMode = 'percent' | 'amount';

export type ProviderPriceAdjustment = {
  id: string;
  quotationProviderId: string;
  label: string;
  kind: PriceAdjustmentKind;
  mode: PriceAdjustmentMode;
  /** Porcentaje (1-100 en descuento) o cantidad en pesos. Siempre > 0. */
  value: number;
};

/** Un ajuste mientras se edita: sin id todavía si es nuevo. */
export type ProviderPriceAdjustmentDraft = Omit<ProviderPriceAdjustment, 'id' | 'quotationProviderId'> & { id?: string };

// El ajuste que paga un viajero en un servicio (sin fila = precio base).
export type TravelerPriceAdjustment = {
  quotationProviderId: string;
  travelerId: string;
  travelId: string;
  adjustmentId: string;
};

// Un viajero que no toma un servicio opcional.
export type ProviderOptOut = {
  quotationProviderId: string;
  travelerId: string;
  travelId: string;
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

// Valores con los que se precarga el formulario de precio público desde un precio de referencia
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
  publicPrices: QuotationPublicPrice[];
};
