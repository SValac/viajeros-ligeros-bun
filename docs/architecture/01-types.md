# 1. Tipos TypeScript

Todos los tipos viven en `app/types/`. Cada entidad tiene su propio archivo. Los nombres siguen camelCase en inglés en el dominio, y el archivo `database.types.ts` (auto-generado por Supabase) define los tipos de BD en snake_case.

---

## 1.1 Travel (`travel.ts`)

```typescript
type TravelStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

type TravelActivity = {
  id: string;
  day: number;
  title: string;
  description: string;
  time?: string;
  location?: string;
  mapLocation?: { lat: number; lng: number; placeId?: string; address?: string };
};

type TravelService = {
  id: string;
  name: string;
  description?: string;
  included: boolean;
  providerId?: string;
};

type TravelBus = {
  id: string;
  busId?: string;
  providerId: string;
  model?: string; brand?: string; year?: number;
  operator1Name: string; operator1Phone: string;
  operator2Name?: string; operator2Phone?: string;
  seatCount: number;
  rentalPrice: number;
};

type Travel = {
  id: string;
  destination: string;
  startDate: string; endDate: string;
  price: number;
  description: string;
  imageUrl?: string;
  status: TravelStatus;
  coordinatorIds: string[];
  itinerary: TravelActivity[];
  services: TravelService[];
  buses: TravelBus[];
  internalNotes?: string;
  totalOperationCost?: number;
  minimumSeats?: number;
  projectedProfit?: number;
  accumulatedTravelers?: number;
  createdAt: string; updatedAt: string;
};
```

---

## 1.2 Provider (`provider.ts`)

```typescript
type PROVIDER_CATEGORY =
  | 'guides' | 'transportation' | 'accommodation'
  | 'bus_agencies' | 'food_services' | 'other';

type Provider = {
  id: string;
  name: string;
  category: PROVIDER_CATEGORY;
  description?: string;
  location: { city: string; state: string; country: string };
  contact: { name: string; phone: string; email?: string; notes?: string };
  active: boolean;
  createdAt: string; updatedAt: string;
};

type ProviderFilters = {
  category?: PROVIDER_CATEGORY;
  active?: boolean;
  searchTerm?: string;
  city?: string;
  state?: string;
};
```

---

## 1.3 Bus (`bus.ts`)

```typescript
type Bus = {
  id: string;
  providerId: string;
  model?: string; brand?: string; year?: number;
  seatCount: number;
  rentalPrice: number;
  active: boolean;
  createdAt: string; updatedAt: string;
};
```

---

## 1.4 Coordinator (`coordinator.ts`)

```typescript
type Coordinator = {
  id: string;
  name: string;
  age?: number;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string; updatedAt: string;
};
```

---

## 1.5 Traveler (`traveler.ts`)

```typescript
type Traveler = {
  id: string;
  firstName: string; lastName: string;
  phone?: string;
  travelId: string;
  travelBusId?: string;
  seat?: number;
  boardingPoint?: string;
  isRepresentative: boolean;
  representativeId?: string;
  createdAt: string; updatedAt: string;
};

type TravelerWithChildren = Traveler & { children?: Traveler[] };
```

---

## 1.6 Hotel Room (`hotel-room.ts`)

```typescript
type BedSize = 'single' | 'double' | 'queen' | 'king';

type BedConfiguration = { size: BedSize; count: number };

type HotelRoomType = {
  id: string;
  maxOccupancy: number;
  roomCount: number;
  beds: BedConfiguration[];
  pricePerNight: number;
  costPerPerson: number;
  additionalDetails?: string;
  createdAt: string; updatedAt: string;
};

type HotelRoomData = {
  id: string;
  providerId: string;
  totalRooms: number;
  roomTypes: HotelRoomType[];
  createdAt: string; updatedAt: string;
};
```

---

## 1.7 Payment (`payment.ts`)

```typescript
type PaymentType = 'cash' | 'transfer';
type TravelerType = 'adult' | 'child';
type PaymentStatus = 'pending' | 'partial' | 'paid';
type DiscountType = 'fixed' | 'percentage';

type Payment = {
  id: string;
  travelId: string; travelerId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  notes?: string;
  createdAt: string; updatedAt: string;
};

type AdjustmentItem = {
  amount: number;
  type: DiscountType;
  description?: string;
};

type TravelerAccountConfig = {
  travelId: string; travelerId: string;
  travelerType: TravelerType;
  childPrice?: number;
  discounts: AdjustmentItem[];
  surcharges: AdjustmentItem[];
  publicPriceId?: string;
  publicPriceAmount?: number;
};

type TravelerPaymentSummary = {
  travelId: string; travelerId: string;
  totalCost: number; travelerType: TravelerType;
  appliedPrice: number;
  discounts: AdjustmentItem[]; surcharges: AdjustmentItem[];
  totalDiscountAmount: number; totalSurchargeAmount: number;
  finalCost: number; totalPaid: number;
  balance: number; status: PaymentStatus;
};
```

---

## 1.8 Quotation (`quotation.ts`)

```typescript
type QuotationStatus = 'draft' | 'confirmed';
type ProviderPaymentStatus = 'pending' | 'partial' | 'paid';
type CostSplitType = 'minimum' | 'total';
type QuotationBusStatus = 'reserved' | 'confirmed' | 'pending';

type Quotation = {
  id: string; travelId: string;
  busCapacity: number; minimumSeatTarget: number;
  seatPrice: number; status: QuotationStatus;
  notes?: string;
  createdAt: string; updatedAt: string;
};

type QuotationProvider = {
  id: string; quotationId: string; providerId: string;
  serviceDescription: string; remarks?: string;
  totalCost: number; paymentMethod: PaymentType;
  splitType: CostSplitType; confirmed: boolean;
};

type QuotationAccommodation = {
  id: string; quotationId: string; providerId: string;
  nightCount: number;
  details: QuotationAccommodationDetail[];
  totalCost: number; paymentMethod: PaymentType;
  confirmed: boolean;
  createdAt: string; updatedAt: string;
};

type QuotationBus = {
  id: string; quotationId: string; providerId: string;
  unitNumber?: string; capacity: number;
  status: QuotationBusStatus;
  totalCost: number; splitType: CostSplitType;
  paymentMethod: PaymentType;
  coordinatorIds?: [] | [string] | [string, string];
  confirmed: boolean;
  createdAt: string; updatedAt: string;
};

type QuotationPublicPrice = {
  id: string; quotationId: string;
  priceType: string; description: string;
  pricePerPerson: number;
  roomType?: string; ageGroup?: string;
  notes?: string;
  createdAt: string; updatedAt: string;
};
```

---

## 1.9 Database Types (`database.types.ts`)

Archivo de ~1,262 líneas **auto-generado** por Supabase CLI. Define `Row`, `Insert` y `Update` para cada tabla. No editar manualmente — regenerar con:

```bash
bunx supabase gen types typescript --project-id <id> > app/types/database.types.ts
```

Los mappers en `app/utils/mappers.ts` convierten entre estos tipos de BD (snake_case) y los tipos de dominio (camelCase).

---

[← Volver al índice](./README.md) | [Siguiente: Pinia Stores →](./02-store.md)
