import type {
  AccommodationPayment,
  AccommodationPaymentFormData,
  AccommodationPaymentStatus,
  BusPayment,
  BusPaymentFormData,
  BusPaymentStatus,
  CostSplitType,
  ProviderOptOut,
  ProviderPayment,
  ProviderPaymentFormData,
  ProviderPaymentStatus,
  ProviderPriceAdjustment,
  ProviderPriceAdjustmentDraft,
  Quotation,
  QuotationAccommodation,
  QuotationAccommodationFormData,
  QuotationBus,
  QuotationBusFormData,
  QuotationExpense,
  QuotationExpenseFormData,
  QuotationFetchResult,
  QuotationFormData,
  QuotationProvider,
  QuotationProviderFilters,
  QuotationProviderFormData,
  QuotationPublicPrice,
  QuotationPublicPriceFormData,
  TravelerPriceAdjustment,
} from '~/types/quotation';
import type { TravelAccommodation, TravelDetail } from '~/types/travel';

import {
  calculatePaymentStatus,
  calculateProviderQuotedCost,
  calculateSeatPrice,
  calculateSellableSeats,
  findRoomsOutsideQuotation,
  isPerPersonProvider,
} from '~/composables/quotation/use-quotation-domain';
import { useQuotationRepository } from '~/composables/quotation/use-quotation-repository';
import { quotationByTravelQuery, quotationKeys } from '~/queries/quotations';
import { travelDetailQuery, travelKeys } from '~/queries/travels';
import { formatCurrency } from '~/utils/currency';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

export const useCotizacionStore = defineStore('useCotizacionStore', () => {
  const queryCache = useQueryCache();
  // Every write invalidates `quotationKeys.root` in its `finally`, even when it failed halfway
  // (e.g. saved but the seat price couldn't be recomputed): the active quotation query
  // refetches and copies the server's state back into the store.
  const repository = useQuotationRepository();

  // State
  const quotations = ref<Quotation[]>([]);
  const quotationProviders = ref<QuotationProvider[]>([]);
  const providerPayments = ref<ProviderPayment[]>([]);
  const providerOptOuts = ref<ProviderOptOut[]>([]);
  const providerPriceAdjustments = ref<ProviderPriceAdjustment[]>([]);
  const travelerPriceAdjustments = ref<TravelerPriceAdjustment[]>([]);
  const quotationAccommodations = ref<QuotationAccommodation[]>([]);
  const accommodationPayments = ref<AccommodationPayment[]>([]);
  const quotationPublicPrices = ref<QuotationPublicPrice[]>([]);
  const quotationBuses = ref<QuotationBus[]>([]);
  const busPayments = ref<BusPayment[]>([]);
  const quotationExpenses = ref<QuotationExpense[]>([]);
  // Categorías que la agencia ya usó en sus gastos (se cargan al abrir el formulario).
  const expenseCategories = ref<string[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<QuotationProviderFilters>({});

  // Getters
  const getCotizacionByTravel = computed(() => {
    return (travelId: string): Quotation | undefined => {
      return quotations.value.find(c => c.travelId === travelId);
    };
  });

  const getProveedoresByQuotation = computed(() => {
    return (quotationId: string): QuotationProvider[] => {
      return quotationProviders.value.filter(p => p.quotationId === quotationId);
    };
  });

  const getPagosByProveedor = computed(() => {
    return (quotationProviderId: string): ProviderPayment[] => {
      return [...providerPayments.value.filter(p => p.quotationProviderId === quotationProviderId)]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    };
  });

  // Servicios de costo total que se reparten entre los asientos mínimos objetivo.
  const getCostoTipoMinimo = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId && !isPerPersonProvider(p) && (p.splitType ?? 'minimum') === 'minimum')
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  // Servicios de costo total que se reparten entre los asientos vendibles.
  const getCostoTipoTotal = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId && !isPerPersonProvider(p) && (p.splitType ?? 'minimum') === 'total')
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  // Lo que suman al precio de cada asiento los servicios por persona.
  const getCostoPorPersonaAsiento = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId && isPerPersonProvider(p))
        .reduce((sum, p) => sum + (p.unitCost ?? 0), 0);
    };
  });

  const getHospedajesByQuotation = computed(() => {
    return (quotationId: string): QuotationAccommodation[] => {
      return quotationAccommodations.value.filter(h => h.quotationId === quotationId);
    };
  });

  const getTotalCostoHospedajes = computed(() => {
    return (quotationId: string): number => {
      return quotationAccommodations.value
        .filter(h => h.quotationId === quotationId)
        .reduce((sum, h) => sum + h.totalCost, 0);
    };
  });

  const getPreciosPublicosByQuotation = computed(() => {
    return (quotationId: string): QuotationPublicPrice[] => {
      return quotationPublicPrices.value.filter(p => p.quotationId === quotationId);
    };
  });

  // Matriz de precios de referencia: seatPrice + hospedaje agrupado por maxOccupancy.
  // Reads the provider and hotel-room catalogs: the calling component must create those stores
  // in its setup, or their catalog queries start during render (Vue lifecycle warnings).
  const getMatrizPreciosReferencia = computed(() => {
    return (quotationId: string): Array<{
      maxOccupancy: number;
      pricePerPerson: number;
      breakdown: {
        seatPrice: number;
        accommodation: Array<{
          hotelName: string;
          roomType: string;
          nightCount: number;
          costPerPerson: number;
          additionalDetails?: string;
        }>;
        totalAccommodation: number;
      };
    }> => {
      const cotizacion = quotations.value.find(c => c.id === quotationId);
      if (!cotizacion)
        return [];

      const seatPrice = cotizacion.seatPrice;
      const hospedajes = getHospedajesByQuotation.value(quotationId);
      const providerStore = useProviderStore();
      const hotelRoomStore = useHotelRoomStore();

      // Agrupar entradas por maxOccupancy
      const porOcupacion: Map<number, Array<{
        hotelName: string;
        roomType: string;
        nightCount: number;
        costPerPerson: number;
        additionalDetails?: string;
      }>> = new Map();

      for (const hospedaje of hospedajes) {
        const hotelProvider = providerStore.getProviderById(hospedaje.providerId);
        const hotelName = hotelProvider?.name ?? `Hotel ${hospedaje.providerId}`;
        const roomData = hotelRoomStore.getRoomDataByProviderId(hospedaje.providerId);

        for (const detalle of hospedaje.details) {
          const ocupacion = detalle.maxOccupancy;
          // Cost of the whole stay at this hotel, not a single night: the seat price covers the whole trip too.
          const costPerPerson = (detalle.pricePerNight * hospedaje.nightCount) / detalle.maxOccupancy;

          const roomTypeRecord = roomData?.roomTypes.find(rt => rt.id === detalle.roomTypeId);
          const roomType = roomTypeRecord
            ? formatBedConfiguration(roomTypeRecord.beds)
            : `${ocupacion} persona${ocupacion > 1 ? 's' : ''}`;

          if (!porOcupacion.has(ocupacion)) {
            porOcupacion.set(ocupacion, []);
          }
          porOcupacion.get(ocupacion)!.push({
            hotelName,
            roomType,
            nightCount: hospedaje.nightCount,
            costPerPerson,
            additionalDetails: roomTypeRecord?.additionalDetails,
          });
        }
      }

      // Construir resultado ordenado por maxOccupancy ascendente
      return [...porOcupacion.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([maxOccupancy, hoteles]) => {
          const totalAccommodation = hoteles.reduce((sum, h) => sum + h.costPerPerson, 0);
          return {
            maxOccupancy,
            pricePerPerson: seatPrice + totalAccommodation,
            breakdown: {
              seatPrice,
              accommodation: hoteles,
              totalAccommodation,
            },
          };
        });
    };
  });

  const getTotalCostoBuses = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId)
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getCostoBusesTipoMinimo = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId && (b.splitType ?? 'minimum') === 'minimum')
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getCostoBusesTipoTotal = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId && (b.splitType ?? 'minimum') === 'total')
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getGastosByQuotation = computed(() => {
    return (quotationId: string): QuotationExpense[] => {
      return quotationExpenses.value.filter(g => g.quotationId === quotationId);
    };
  });

  const getTotalGastos = computed(() => {
    return (quotationId: string): number => {
      return getGastosByQuotation.value(quotationId).reduce((sum, g) => sum + g.totalCost, 0);
    };
  });

  const getGastosTipoMinimo = computed(() => {
    return (quotationId: string): number => {
      return getGastosByQuotation.value(quotationId)
        .filter(g => g.splitType === 'minimum')
        .reduce((sum, g) => sum + g.totalCost, 0);
    };
  });

  const getGastosTipoTotal = computed(() => {
    return (quotationId: string): number => {
      return getGastosByQuotation.value(quotationId)
        .filter(g => g.splitType === 'total')
        .reduce((sum, g) => sum + g.totalCost, 0);
    };
  });

  // Asientos que se pueden vender: el total menos los coordinadores del viaje cuando la
  // cotización dice que ocupan asiento. Es el divisor de los costos repartidos entre el
  // total y la base de la ganancia proyectada.
  // Los coordinadores son del viaje, no de la cotización: quien llama pasa cuántos son
  // (`coordinatorIds.length` de travelDetailQuery). Lo mismo los getters que dependen de este.
  const getAsientosVendibles = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const quote = quotations.value.find(c => c.id === quotationId);
      if (!quote)
        return 0;
      return calculateSellableSeats(quote, coordinatorCount);
    };
  });

  // Costo de los servicios con el autobús lleno: los por persona cuentan su costo por
  // persona × asientos vendibles.
  const getCostoTotal = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const asientosVendibles = getAsientosVendibles.value(quotationId, coordinatorCount);
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId)
        .reduce((sum, p) => sum + calculateProviderQuotedCost(p, asientosVendibles), 0);
    };
  });

  // Primer asiento vendido con el que los ingresos superan el costo de servicios + autobuses + gastos.
  // El hospedaje queda fuera: cada viajero lo paga aparte según su habitación.
  // Devuelve 0 si aún no hay precio por asiento.
  const getAsientoConGanancia = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const cotizacion = quotations.value.find(c => c.id === quotationId);
      if (!cotizacion || cotizacion.seatPrice === 0)
        return 0;
      // Los servicios por persona crecen con cada viajero: cada asiento deja precio − su costo
      // por persona para cubrir los costos fijos (servicios de costo total + autobuses).
      const costoPorAsiento = getCostoPorPersonaAsiento.value(quotationId);
      const margenPorAsiento = cotizacion.seatPrice - costoPorAsiento;
      if (margenPorAsiento <= 0)
        return getAsientosVendibles.value(quotationId, coordinatorCount) + 1;
      const costoFijo = getCostoTipoMinimo.value(quotationId) + getCostoTipoTotal.value(quotationId) + getTotalCostoBuses.value(quotationId) + getTotalGastos.value(quotationId);
      return Math.floor(costoFijo / margenPorAsiento) + 1;
    };
  });

  // Precio calculado a partir del asiento mínimo objetivo (seatPrice de la cotización)
  // Incluye costos de proveedores, autobuses y gastos adicionales; el hospedaje se suma aparte en la matriz de precios de referencia
  const getPrecioAsientoCalculado = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const cotizacion = quotations.value.find(c => c.id === quotationId);
      if (!cotizacion)
        return 0;

      return calculateSeatPrice(
        { minimumSeatTarget: cotizacion.minimumSeatTarget, sellableSeats: getAsientosVendibles.value(quotationId, coordinatorCount) },
        quotationProviders.value.filter(p => p.quotationId === quotationId),
        quotationBuses.value.filter(b => b.quotationId === quotationId),
        getGastosByQuotation.value(quotationId),
      );
    };
  });

  // Ganancia con el autobús lleno: asientos vendibles × precio por asiento − (servicios + autobuses + gastos).
  // El hospedaje queda fuera de ambos lados: los viajeros lo pagan aparte según su habitación.
  const getGananciaProyectada = computed(() => {
    return (quotationId: string, coordinatorCount: number): number => {
      const cotizacion = quotations.value.find(c => c.id === quotationId);
      const asientosVendibles = getAsientosVendibles.value(quotationId, coordinatorCount);
      if (!cotizacion || asientosVendibles === 0)
        return 0;
      const costoTotal = getCostoTotal.value(quotationId, coordinatorCount) + getTotalCostoBuses.value(quotationId) + getTotalGastos.value(quotationId);
      return (asientosVendibles * cotizacion.seatPrice) - costoTotal;
    };
  });

  const getAnticipadoProveedor = computed(() => {
    return (quotationProviderId: string): number => {
      return providerPayments.value
        .filter(p => p.quotationProviderId === quotationProviderId)
        .reduce((sum, p) => sum + p.amount, 0);
    };
  });

  // Entre cuántas personas se reparte un costo según "Dividir entre": los asientos mínimos
  // objetivo o los asientos vendibles. También es el número de personas por defecto de un
  // servicio cobrado por persona.
  const getDivisorCosto = computed(() => {
    return (quotationId: string, splitType: CostSplitType, coordinatorCount: number): number => {
      const cotizacion = quotations.value.find(c => c.id === quotationId);
      if (!cotizacion)
        return 0;
      return splitType === 'total'
        ? getAsientosVendibles.value(quotationId, coordinatorCount)
        : cotizacion.minimumSeatTarget;
    };
  });

  const getCostoPerPersonaProveedor = computed(() => {
    return (quotationProviderId: string, coordinatorCount: number): number => {
      const proveedor = quotationProviders.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 0;

      // Un servicio por persona suma su costo por persona a cada asiento, sin reparto.
      if (isPerPersonProvider(proveedor))
        return proveedor.unitCost ?? 0;

      const divisor = getDivisorCosto.value(proveedor.quotationId, proveedor.splitType ?? 'minimum', coordinatorCount);
      if (divisor === 0)
        return 0;
      return proveedor.totalCost / divisor;
    };
  });

  const getSaldoPendienteProveedor = computed(() => {
    return (quotationProviderId: string): number => {
      const proveedor = quotationProviders.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 0;
      // Lo que se le debe es payableCost (en un servicio opcional, solo por quienes lo toman).
      const anticipado = getAnticipadoProveedor.value(quotationProviderId);
      return Math.max(0, proveedor.payableCost - anticipado);
    };
  });

  // Lo pagado de más a un proveedor opcional cuando después se desmarcan o se borran viajeros.
  const getSobrepagoProveedor = computed(() => {
    return (quotationProviderId: string): number => {
      const proveedor = quotationProviders.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 0;
      const anticipado = getAnticipadoProveedor.value(quotationProviderId);
      return Math.max(0, anticipado - proveedor.payableCost);
    };
  });

  // Ajustes de precio (Niño -10%, Adulto mayor -$50...) de un servicio por persona.
  const getAjustesByProveedor = computed(() => {
    return (quotationProviderId: string): ProviderPriceAdjustment[] =>
      providerPriceAdjustments.value.filter(a => a.quotationProviderId === quotationProviderId);
  });

  // El ajuste que paga un viajero en un servicio; undefined = precio base.
  const getAjusteDeViajero = computed(() => {
    return (quotationProviderId: string, travelerId: string): ProviderPriceAdjustment | undefined => {
      const choice = travelerPriceAdjustments.value.find(a => a.quotationProviderId === quotationProviderId && a.travelerId === travelerId);
      return choice ? providerPriceAdjustments.value.find(a => a.id === choice.adjustmentId) : undefined;
    };
  });

  // Viajeros (por id) que NO toman un servicio opcional. Todos los demás sí lo toman.
  const getOptOutsByProveedor = computed(() => {
    return (quotationProviderId: string): Set<string> => {
      return new Set(
        providerOptOuts.value
          .filter(o => o.quotationProviderId === quotationProviderId)
          .map(o => o.travelerId),
      );
    };
  });

  const getProviderPaymentStatus = computed(() => {
    return (quotationProviderId: string): ProviderPaymentStatus => {
      const proveedor = quotationProviders.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 'pending';
      const anticipado = getAnticipadoProveedor.value(quotationProviderId);
      return calculatePaymentStatus(anticipado, proveedor.payableCost);
    };
  });

  const getSaldoTotalPendiente = computed(() => {
    return (quotationId: string): number => {
      return quotationProviders.value
        .filter(p => p.quotationId === quotationId)
        .reduce((sum, p) => sum + getSaldoPendienteProveedor.value(p.id), 0);
    };
  });

  const getPagosByHospedaje = computed(() => {
    return (quotationAccommodationId: string): AccommodationPayment[] => {
      return [...accommodationPayments.value.filter(p => p.quotationAccommodationId === quotationAccommodationId)]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    };
  });

  const getAnticipadoHospedaje = computed(() => {
    return (quotationAccommodationId: string): number => {
      return accommodationPayments.value
        .filter(p => p.quotationAccommodationId === quotationAccommodationId)
        .reduce((sum, p) => sum + p.amount, 0);
    };
  });

  const getSaldoPendienteHospedaje = computed(() => {
    return (quotationAccommodationId: string): number => {
      const hospedaje = quotationAccommodations.value.find(h => h.id === quotationAccommodationId);
      if (!hospedaje)
        return 0;
      return hospedaje.totalCost - getAnticipadoHospedaje.value(quotationAccommodationId);
    };
  });

  const getAccommodationPaymentStatus = computed(() => {
    return (quotationAccommodationId: string): AccommodationPaymentStatus => {
      const hospedaje = quotationAccommodations.value.find(h => h.id === quotationAccommodationId);
      if (!hospedaje)
        return 'pending';
      const anticipado = getAnticipadoHospedaje.value(quotationAccommodationId);
      return calculatePaymentStatus(anticipado, hospedaje.totalCost);
    };
  });

  const getSaldoTotalPendienteHospedajes = computed(() => {
    return (quotationId: string): number => {
      return quotationAccommodations.value
        .filter(h => h.quotationId === quotationId)
        .reduce((sum, h) => sum + getSaldoPendienteHospedaje.value(h.id), 0);
    };
  });

  const puedeConfirmar = computed(() => {
    return (quotationId: string): boolean => {
      const proveedores = quotationProviders.value.filter(p => p.quotationId === quotationId);
      if (proveedores.length === 0)
        return false;
      return proveedores.every(p => p.confirmed === true);
    };
  });

  const filteredProveedores = computed(() => {
    return (quotationId: string): QuotationProvider[] => {
      let result = quotationProviders.value.filter(p => p.quotationId === quotationId);

      const f = filters.value;

      if (f.paymentStatus && f.paymentStatus !== 'all') {
        result = result.filter(p => getProviderPaymentStatus.value(p.id) === f.paymentStatus);
      }

      if (f.confirmed !== undefined && f.confirmed !== 'all') {
        result = result.filter(p => p.confirmed === f.confirmed);
      }

      if (f.paymentMethod && f.paymentMethod !== 'all') {
        result = result.filter(p => p.paymentMethod === f.paymentMethod);
      }

      return result;
    };
  });

  const getBusesByQuotation = computed(() => {
    return (quotationId: string): QuotationBus[] => {
      return quotationBuses.value.filter(b => b.quotationId === quotationId);
    };
  });

  const getBusesByProveedorEnQuotation = computed(() => {
    return (quotationId: string, providerId: string): QuotationBus[] => {
      return quotationBuses.value.filter(
        b => b.quotationId === quotationId && b.providerId === providerId,
      );
    };
  });

  const getPagosByBus = computed(() => {
    return (quotationBusId: string): BusPayment[] => {
      return [...busPayments.value.filter(p => p.quotationBusId === quotationBusId)]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    };
  });

  const getAnticipadoBus = computed(() => {
    return (quotationBusId: string): number => {
      return busPayments.value
        .filter(p => p.quotationBusId === quotationBusId)
        .reduce((sum, p) => sum + p.amount, 0);
    };
  });

  const getSaldoPendienteBus = computed(() => {
    return (quotationBusId: string): number => {
      const bus = quotationBuses.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 0;
      return bus.totalCost - getAnticipadoBus.value(quotationBusId);
    };
  });

  const getSaldoTotalPendienteBuses = computed(() => {
    return (quotationId: string): number => {
      return quotationBuses.value
        .filter(b => b.quotationId === quotationId)
        .reduce((sum, b) => sum + getSaldoPendienteBus.value(b.id), 0);
    };
  });

  const getBusPaymentStatus = computed(() => {
    return (quotationBusId: string): BusPaymentStatus => {
      const bus = quotationBuses.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 'pending';
      const anticipado = getAnticipadoBus.value(quotationBusId);
      return calculatePaymentStatus(anticipado, bus.totalCost ?? 0);
    };
  });

  const getCostoPerPersonaBus = computed(() => {
    return (quotationBusId: string, coordinatorCount: number): number => {
      const bus = quotationBuses.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 0;
      const cotizacion = quotations.value.find(c => c.id === bus.quotationId);
      if (!cotizacion)
        return 0;
      const divisor = bus.splitType === 'total'
        ? getAsientosVendibles.value(cotizacion.id, coordinatorCount)
        : cotizacion.minimumSeatTarget;
      if (divisor === 0)
        return 0;
      return bus.totalCost / divisor;
    };
  });

  // Helper interno — recalcula seatPrice de la cotización.
  // quotations.total_seats is kept by a DB trigger as the sum of the quotation's bus
  // capacities; mirror it in the cache so the seat price, profit and break-even use it.
  function _refreshTotalSeats(quotationId: string): void {
    const index = quotations.value.findIndex(c => c.id === quotationId);
    const cotizacion = quotations.value[index];
    if (!cotizacion)
      return;
    const totalSeats = quotationBuses.value
      .filter(b => b.quotationId === quotationId)
      .reduce((sum, b) => sum + b.capacity, 0);
    if (totalSeats !== cotizacion.totalSeats)
      quotations.value[index] = { ...cotizacion, totalSeats };
  }

  async function _syncSeatPrice(quotationId: string): Promise<void> {
    _refreshTotalSeats(quotationId);

    const cotizacion = quotations.value.find(c => c.id === quotationId);
    if (!cotizacion || cotizacion.status === 'confirmed')
      return;
    if (cotizacion.minimumSeatTarget === 0)
      return;

    // The price is saved to the DB, so the coordinators it subtracts come fresh from the
    // server (`fetch` ignores `staleTime`). A failed request throws and the caller's catch
    // skips the save rather than store a wrong price.
    let travel: TravelDetail | null | undefined;
    try {
      const entry = queryCache.ensure(travelDetailQuery(cotizacion.travelId));
      travel = (await queryCache.fetch(entry)).data;
    }
    catch (e) {
      throw new Error('No se pudo recalcular el precio por asiento porque no cargó el viaje. Intenta de nuevo.', { cause: e });
    }
    if (!travel)
      throw new Error('No se encontró el viaje de esta cotización. Recarga la página e intenta de nuevo.');

    const nuevoPrecio = getPrecioAsientoCalculado.value(quotationId, travel.coordinatorIds.length);

    await repository.updateSeatPrice(quotationId, nuevoPrecio);

    const index = quotations.value.findIndex(c => c.id === quotationId);
    if (index !== -1 && quotations.value[index]) {
      quotations.value[index] = {
        ...quotations.value[index]!,
        seatPrice: nuevoPrecio,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Rooms the travel would keep for hotel room types the quotation no longer lists once
   * `nextAccommodations` is saved. They'd cost nothing, so they're deleted after the save;
   * while any of them has someone in it the change is refused instead.
   * @param quotationId - The quotation being changed
   * @param nextAccommodations - The quotation's hotels as they'll be after the change
   * @returns The empty rooms to delete, or an error when some are occupied
   */
  async function _findRoomsToDrop(
    quotationId: string,
    nextAccommodations: Pick<QuotationAccommodation, 'providerId' | 'details'>[],
  ): Promise<TravelAccommodation[] | { error: string }> {
    const cotizacion = quotations.value.find(c => c.id === quotationId);
    if (!cotizacion)
      return [];

    // The rooms decide what gets deleted, so they come fresh from the server: `fetch`
    // ignores `staleTime` (`refresh` wouldn't). A failed request throws and the caller's
    // catch aborts the change before anything is written.
    const travelEntry = queryCache.ensure(travelDetailQuery(cotizacion.travelId));
    const { data } = await queryCache.fetch(travelEntry);
    if (!data) {
      return { error: 'No se encontró el viaje de esta cotización. Recarga la página e intenta de nuevo.' };
    }

    const rooms = findRoomsOutsideQuotation(
      nextAccommodations,
      data.accommodations,
    );
    if (rooms.length === 0)
      return [];

    const occupiedIds = await repository.getOccupiedAccommodationIds(cotizacion.travelId);
    const occupied = rooms.filter(room => occupiedIds.has(room.id)).length;
    if (occupied > 0) {
      return {
        error: `${occupied} habitación(es) de lo que quitaste tienen viajeros. Sácalos en la pestaña Habitaciones del viaje y vuelve a intentarlo.`,
      };
    }
    return rooms;
  }

  async function _deleteRooms(quotationId: string, rooms: TravelAccommodation[]): Promise<void> {
    const cotizacion = quotations.value.find(c => c.id === quotationId);
    if (!cotizacion || rooms.length === 0)
      return;
    const ids = rooms.map(room => room.id);
    await repository.deleteUnoccupiedAccommodations(ids);
    // The travel's rooms changed: its detail (room list and counts) has to be fetched again.
    queryCache.invalidateQueries({ key: travelKeys.detail(cotizacion.travelId), exact: true });
  }

  // Actions

  /**
   * Copies a travel's quotation into the store, replacing what it had for that travel.
   * Only quotationByTravelQuery calls it, each time it fetches.
   * @param travelId - UUID of the travel
   * @param result - The fetched quotation and its children, or `null` if it has none
   */
  function hydrateTravel(travelId: string, result: QuotationFetchResult | null): void {
    if (!result) {
      const existing = quotations.value.find(c => c.travelId === travelId);
      if (existing) {
        const qId = existing.id;
        quotations.value = quotations.value.filter(c => c.id !== qId);
        quotationProviders.value = quotationProviders.value.filter(p => p.quotationId !== qId);
        providerPayments.value = providerPayments.value.filter(p =>
          !quotationProviders.value.some(prov => prov.id === p.quotationProviderId && prov.quotationId === qId),
        );
        quotationAccommodations.value = quotationAccommodations.value.filter(h => h.quotationId !== qId);
        accommodationPayments.value = accommodationPayments.value.filter(p =>
          !quotationAccommodations.value.some(h => h.id === p.quotationAccommodationId && h.quotationId === qId),
        );
        quotationPublicPrices.value = quotationPublicPrices.value.filter(p => p.quotationId !== qId);
        quotationBuses.value = quotationBuses.value.filter(b => b.quotationId !== qId);
        busPayments.value = busPayments.value.filter(p =>
          !quotationBuses.value.some(b => b.id === p.quotationBusId && b.quotationId === qId),
        );
        quotationExpenses.value = quotationExpenses.value.filter(g => g.quotationId !== qId);
      }
      return;
    }

    const {
      quotation,
      providers,
      providerPayments: fetchedProviderPayments,
      providerAdjustments,
      accommodations,
      accommodationPayments: fetchedAccommodationPayments,
      publicPrices,
      buses,
      busPayments: fetchedBusPayments,
      expenses,
    } = result;
    const quotationId = quotation.id;

    quotations.value = [...quotations.value.filter(c => c.travelId !== travelId), quotation];
    quotationProviders.value = [...quotationProviders.value.filter(p => p.quotationId !== quotationId), ...providers];
    providerPayments.value = [...providerPayments.value.filter(p => !providers.some(pr => pr.id === p.quotationProviderId)), ...fetchedProviderPayments];
    providerPriceAdjustments.value = [...providerPriceAdjustments.value.filter(a => !providers.some(pr => pr.id === a.quotationProviderId)), ...providerAdjustments];
    quotationAccommodations.value = [...quotationAccommodations.value.filter(h => h.quotationId !== quotationId), ...accommodations];
    accommodationPayments.value = [...accommodationPayments.value.filter(p => !accommodations.some(a => a.id === p.quotationAccommodationId)), ...fetchedAccommodationPayments];
    quotationPublicPrices.value = [...quotationPublicPrices.value.filter(p => p.quotationId !== quotationId), ...publicPrices];
    quotationBuses.value = [...quotationBuses.value.filter(b => b.quotationId !== quotationId), ...buses];
    busPayments.value = [...busPayments.value.filter(p => !buses.some(b => b.id === p.quotationBusId)), ...fetchedBusPayments];
    quotationExpenses.value = [...quotationExpenses.value.filter(g => g.quotationId !== quotationId), ...expenses];
  }

  /**
   * Loads a travel's quotation into the store from code that can't use `useQuery` (actions,
   * pages that load several travels). Cached and fresh = no request; `force` always asks the
   * server. Screens that show the quotation mount quotationByTravelQuery with `useQuery`.
   * @param travelId - UUID of the travel
   * @param options - Fetch options
   * @param options.force - Ignore `staleTime` and always ask the server
   */
  async function fetchByTravel(travelId: string, options?: { force?: boolean }): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const entry = queryCache.ensure(quotationByTravelQuery(travelId));
      await (options?.force ? queryCache.fetch(entry) : queryCache.refresh(entry));
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Recalculates the seat price of a travel's quotation. Call it after the travel's
   * coordinators change: when they take seats, the sellable seats change with them.
   * @param travelId - UUID of the travel
   * @returns `false` when the price couldn't be recomputed (the error is in `error`)
   */
  async function syncSeatPriceForTravel(travelId: string): Promise<boolean> {
    await fetchByTravel(travelId, { force: true });
    const cotizacion = quotations.value.find(c => c.travelId === travelId);
    if (!cotizacion?.coordinatorsTakeSeats)
      return true;

    try {
      await _syncSeatPrice(cotizacion.id);
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return false;
    }
  }

  async function createQuotation(data: QuotationFormData): Promise<Quotation> {
    const existing = quotations.value.find(c => c.travelId === data.travelId);
    if (existing)
      return existing;

    loading.value = true;
    error.value = null;
    try {
      const quotation = await repository.insertQuotation(data);
      quotations.value.push(quotation);
      return quotation;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateQuotation(id: string, data: Partial<QuotationFormData>): Promise<Quotation | undefined> {
    const index = quotations.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Cotización no encontrada';
      return undefined;
    }

    const existing = quotations.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateQuotation(id, data);
      quotations.value[index] = updated;

      if ('minimumSeatTarget' in data || 'coordinatorsTakeSeats' in data) {
        await _syncSeatPrice(id);
      }

      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Confirms a quotation, locking its providers, lodging and buses (payments stay open).
   * It doesn't touch the travel's services: those are the public list shown on the web,
   * edited on their own, while the quotation's providers are internal costs.
   * @param id - UUID of the quotation to confirm
   * @returns `{ success: true }`, or `{ success: false, error }` with a user-facing message
   */
  async function confirmarQuotation(id: string): Promise<{ success: boolean; error?: string }> {
    const cotizacion = quotations.value.find(c => c.id === id);
    if (!cotizacion)
      return { success: false, error: 'Cotización no encontrada' };

    if (!puedeConfirmar.value(id)) {
      return { success: false, error: 'Todos los proveedores deben estar confirmados' };
    }

    const updated = await updateQuotation(id, { status: 'confirmed' });
    if (!updated)
      return { success: false, error: error.value ?? 'No se pudo confirmar la cotización' };
    return { success: true };
  }

  /**
   * Sends a confirmed quotation back to draft so its providers, lodging and buses can be
   * edited again. Payments are unaffected (they're allowed in both states).
   * @param id - UUID of the quotation to reopen
   * @returns `{ success: true }`, or `{ success: false, error }` with a user-facing message
   */
  async function reabrirQuotation(id: string): Promise<{ success: boolean; error?: string }> {
    const cotizacion = quotations.value.find(c => c.id === id);
    if (!cotizacion)
      return { success: false, error: 'Cotización no encontrada' };
    if (cotizacion.status !== 'confirmed')
      return { success: true };

    const updated = await updateQuotation(id, { status: 'draft' });
    if (!updated)
      return { success: false, error: error.value ?? 'No se pudo reabrir la cotización' };
    return { success: true };
  }

  async function addProveedorQuotation(data: QuotationProviderFormData): Promise<QuotationProvider | { error: string }> {
    const cotizacion = quotations.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const newProveedor = await repository.insertProvider(data);
      quotationProviders.value.push(newProveedor);
      await _syncSeatPrice(data.quotationId);
      return newProveedor;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateProveedorQuotation(
    id: string,
    data: Partial<QuotationProviderFormData>,
  ): Promise<QuotationProvider | undefined> {
    const index = quotationProviders.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = quotationProviders.value[index];
    if (!existing)
      return undefined;

    const cotizacion = quotations.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProvider(id, data);
      quotationProviders.value[index] = updated;
      await _syncSeatPrice(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteProveedorQuotation(id: string): Promise<void> {
    const proveedor = quotationProviders.value.find(p => p.id === id);
    if (!proveedor)
      return;

    const cotizacion = quotations.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = proveedor.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteProvider(id);

      quotationProviders.value = quotationProviders.value.filter(p => p.id !== id);
      providerPayments.value = providerPayments.value.filter(p => p.quotationProviderId !== id);
      providerPriceAdjustments.value = providerPriceAdjustments.value.filter(a => a.quotationProviderId !== id);
      travelerPriceAdjustments.value = travelerPriceAdjustments.value.filter(a => a.quotationProviderId !== id);
      await _syncSeatPrice(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Cambia si el proveedor de un servicio por persona les da cortesía a los coordinadores.
   * Se permite con la cotización confirmada porque no cambia el precio del asiento.
   */
  async function updateProveedorCortesia(
    id: string,
    coordinatorsCourtesy: boolean,
  ): Promise<QuotationProvider | { error: string }> {
    const index = quotationProviders.value.findIndex(p => p.id === id);
    const existing = quotationProviders.value[index];
    if (!existing)
      return { error: 'Proveedor no encontrado' };
    if (!isPerPersonProvider(existing))
      return { error: 'Solo un servicio cobrado por persona puede dar cortesía' };

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProviderCourtesy(id, coordinatorsCourtesy);
      quotationProviders.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Re-lee lo que se le debe a cada proveedor de la cotización del viaje. La base de datos
   * lo recalcula cuando se agregan, borran o desmarcan viajeros.
   * @param travelId - El viaje cuyos viajeros cambiaron
   */
  async function refreshProviderPayableCosts(travelId: string): Promise<void> {
    const cotizacion = quotations.value.find(c => c.travelId === travelId);
    if (!cotizacion)
      return;

    try {
      const costs = new Map(
        (await repository.fetchProviderPayableCosts(cotizacion.id)).map(c => [c.id, c.payableCost]),
      );
      quotationProviders.value = quotationProviders.value.map(p =>
        costs.has(p.id) ? { ...p, payableCost: costs.get(p.id)! } : p,
      );
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  async function fetchProviderOptOuts(travelId: string): Promise<void> {
    try {
      const optOuts = await repository.fetchProviderOptOuts(travelId);
      providerOptOuts.value = [
        ...providerOptOuts.value.filter(o => o.travelId !== travelId),
        ...optOuts,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  /**
   * Marca si unos viajeros toman o no un servicio opcional y refresca lo que se le debe.
   * Se permite con la cotización confirmada, igual que las habitaciones.
   * @returns Un mensaje de error, o null si todo salió bien
   */
  async function setTomanServicio(
    quotationProviderId: string,
    travelId: string,
    travelerIds: string[],
    toman: boolean,
  ): Promise<string | null> {
    const optedOut = getOptOutsByProveedor.value(quotationProviderId);
    const changed = travelerIds.filter(id => optedOut.has(id) === toman);
    if (changed.length === 0)
      return null;

    error.value = null;
    try {
      if (toman) {
        await repository.deleteProviderOptOuts(quotationProviderId, changed);
        providerOptOuts.value = providerOptOuts.value.filter(o =>
          !(o.quotationProviderId === quotationProviderId && changed.includes(o.travelerId)),
        );
      }
      else {
        const nuevos = changed.map(travelerId => ({ quotationProviderId, travelerId, travelId }));
        await repository.insertProviderOptOuts(nuevos);
        providerOptOuts.value.push(...nuevos);
      }
      await refreshProviderPayableCosts(travelId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
  }

  /**
   * Guarda los ajustes de precio de un servicio por persona y refresca lo que se le debe.
   * Se permite con la cotización confirmada porque no cambian el precio del asiento.
   * @returns Un mensaje de error, o null si todo salió bien
   */
  async function saveAjustesProveedor(
    quotationProviderId: string,
    drafts: ProviderPriceAdjustmentDraft[],
  ): Promise<string | null> {
    const proveedor = quotationProviders.value.find(p => p.id === quotationProviderId);
    if (!proveedor)
      return 'Proveedor no encontrado';
    const cotizacion = quotations.value.find(c => c.id === proveedor.quotationId);

    error.value = null;
    try {
      const saved = await repository.saveProviderAdjustments(quotationProviderId, drafts);
      providerPriceAdjustments.value = [
        ...providerPriceAdjustments.value.filter(a => a.quotationProviderId !== quotationProviderId),
        ...saved,
      ];
      // Un ajuste borrado regresa a sus viajeros al precio base (en la BD por cascada).
      const savedIds = new Set(saved.map(a => a.id));
      travelerPriceAdjustments.value = travelerPriceAdjustments.value.filter(a =>
        a.quotationProviderId !== quotationProviderId || savedIds.has(a.adjustmentId),
      );
      if (cotizacion)
        await refreshProviderPayableCosts(cotizacion.travelId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
  }

  async function fetchTravelerAdjustments(travelId: string): Promise<void> {
    try {
      const choices = await repository.fetchTravelerAdjustments(travelId);
      travelerPriceAdjustments.value = [
        ...travelerPriceAdjustments.value.filter(a => a.travelId !== travelId),
        ...choices,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  /**
   * Elige el ajuste que pagan unos viajeros en un servicio (null = precio base) y refresca
   * lo que se le debe al proveedor.
   * @returns Un mensaje de error, o null si todo salió bien
   */
  async function setAjusteViajero(
    quotationProviderId: string,
    travelId: string,
    travelerIds: string[],
    adjustmentId: string | null,
  ): Promise<string | null> {
    error.value = null;
    try {
      await repository.setTravelerAdjustment(quotationProviderId, travelId, travelerIds, adjustmentId);
      travelerPriceAdjustments.value = [
        ...travelerPriceAdjustments.value.filter(a =>
          !(a.quotationProviderId === quotationProviderId && travelerIds.includes(a.travelerId)),
        ),
        ...(adjustmentId
          ? travelerIds.map(travelerId => ({ quotationProviderId, travelerId, travelId, adjustmentId }))
          : []),
      ];
      await refreshProviderPayableCosts(travelId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
  }

  async function toggleConfirmadoProveedor(id: string): Promise<void> {
    const proveedor = quotationProviders.value.find(p => p.id === id);
    if (!proveedor)
      return;

    const cotizacion = quotations.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.toggleProviderConfirmado(id, !proveedor.confirmed);

      const index = quotationProviders.value.findIndex(p => p.id === id);
      if (index !== -1 && quotationProviders.value[index]) {
        quotationProviders.value[index] = { ...quotationProviders.value[index]!, confirmed: !proveedor.confirmed };
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function addProviderPayment(data: ProviderPaymentFormData): Promise<ProviderPayment | { error: string }> {
    const proveedor = quotationProviders.value.find(p => p.id === data.quotationProviderId);
    if (!proveedor)
      return { error: 'Proveedor no encontrado' };

    if (data.amount <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteProveedor.value(data.quotationProviderId);
    if (data.amount > saldoPendiente) {
      return { error: `El monto no puede superar el saldo pendiente (${formatCurrency(saldoPendiente)})` };
    }

    loading.value = true;
    error.value = null;
    try {
      const newPago = await repository.insertProviderPayment(data);
      providerPayments.value.push(newPago);
      return newPago;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateProviderPayment(id: string, data: Partial<ProviderPaymentFormData>): Promise<ProviderPayment | undefined> {
    const index = providerPayments.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = providerPayments.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProviderPayment(id, data);
      providerPayments.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteProviderPayment(id: string): Promise<void> {
    const pago = providerPayments.value.find(p => p.id === id);
    if (!pago)
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.deleteProviderPayment(id);
      providerPayments.value = providerPayments.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  function setFilters(f: QuotationProviderFilters): void {
    filters.value = { ...f };
  }

  function clearFilters(): void {
    filters.value = {};
  }

  // ============================================================================
  // Hospedaje Actions
  // ============================================================================

  async function addHospedajeQuotation(data: QuotationAccommodationFormData): Promise<QuotationAccommodation | { error: string }> {
    const cotizacion = quotations.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      // No rooms are created here: they're added on the travel's rooms page.
      const newHospedaje = await repository.insertAccommodation(data);
      quotationAccommodations.value.push(newHospedaje);
      await _syncSeatPrice(data.quotationId);
      return newHospedaje;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateHospedajeQuotation(
    id: string,
    data: Partial<QuotationAccommodationFormData>,
  ): Promise<QuotationAccommodation | { error: string }> {
    const index = quotationAccommodations.value.findIndex(h => h.id === id);
    const existing = quotationAccommodations.value[index];
    if (!existing)
      return { error: 'Hospedaje no encontrado' };

    const cotizacion = quotations.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const next = getHospedajesByQuotation.value(existing.quotationId)
        .map(h => (h.id === id ? { ...h, details: data.details ?? h.details } : h));
      const roomsToDrop = await _findRoomsToDrop(existing.quotationId, next);
      if ('error' in roomsToDrop)
        return roomsToDrop;

      const updated = await repository.updateAccommodation(id, data, existing.details);
      quotationAccommodations.value[index] = updated;
      await _deleteRooms(existing.quotationId, roomsToDrop);
      await _syncSeatPrice(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Removes a hotel from the quotation, along with its empty rooms on the travel.
   * Refused while any of its rooms has someone in it.
   * @returns An error message, or `null` when it was deleted
   */
  async function deleteHospedajeQuotation(id: string): Promise<string | null> {
    const hospedaje = quotationAccommodations.value.find(h => h.id === id);
    if (!hospedaje)
      return 'Hospedaje no encontrado';

    const cotizacion = quotations.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return 'No se puede modificar una cotización confirmada';

    const quotationId = hospedaje.quotationId;
    loading.value = true;
    error.value = null;
    try {
      const next = getHospedajesByQuotation.value(quotationId).filter(h => h.id !== id);
      const roomsToDrop = await _findRoomsToDrop(quotationId, next);
      if ('error' in roomsToDrop)
        return roomsToDrop.error;

      await repository.deleteAccommodation(id);

      quotationAccommodations.value = quotationAccommodations.value.filter(h => h.id !== id);
      accommodationPayments.value = accommodationPayments.value.filter(p => p.quotationAccommodationId !== id);
      await _deleteRooms(quotationId, roomsToDrop);
      await _syncSeatPrice(quotationId);
      return null;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return error.value;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  /**
   * Re-reads what's owed to each hotel of the travel's quotation. The database recomputes
   * it whenever a room is added to or removed from the travel.
   * @param travelId - The travel whose rooms changed
   */
  async function refreshHospedajeCosts(travelId: string): Promise<void> {
    const cotizacion = quotations.value.find(c => c.travelId === travelId);
    if (!cotizacion)
      return;

    try {
      const costs = new Map(
        (await repository.fetchAccommodationCosts(cotizacion.id)).map(c => [c.id, c.totalCost]),
      );
      quotationAccommodations.value = quotationAccommodations.value.map(h =>
        costs.has(h.id) ? { ...h, totalCost: costs.get(h.id)! } : h,
      );
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  async function toggleConfirmadoHospedaje(id: string): Promise<void> {
    const hospedaje = quotationAccommodations.value.find(h => h.id === id);
    if (!hospedaje)
      return;

    const cotizacion = quotations.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.toggleConfirmAccommodation(id, !hospedaje.confirmed);

      const index = quotationAccommodations.value.findIndex(h => h.id === id);
      if (index !== -1 && quotationAccommodations.value[index]) {
        quotationAccommodations.value[index] = { ...quotationAccommodations.value[index]!, confirmed: !hospedaje.confirmed };
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function addPagoHospedaje(data: AccommodationPaymentFormData): Promise<AccommodationPayment | { error: string }> {
    const hospedaje = quotationAccommodations.value.find(h => h.id === data.quotationAccommodationId);
    if (!hospedaje)
      return { error: 'Hospedaje no encontrado' };

    if (data.amount <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteHospedaje.value(data.quotationAccommodationId);
    if (data.amount > saldoPendiente)
      return { error: `El monto no puede superar el saldo pendiente (${formatCurrency(saldoPendiente)})` };

    loading.value = true;
    error.value = null;
    try {
      const newPago = await repository.insertAccommodationPayment(data);
      accommodationPayments.value.push(newPago);
      return newPago;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updatePagoHospedaje(id: string, data: Partial<AccommodationPaymentFormData>): Promise<AccommodationPayment | undefined> {
    const index = accommodationPayments.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = accommodationPayments.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateAccommodationPayment(id, data);
      accommodationPayments.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deletePagoHospedaje(id: string): Promise<void> {
    const pago = accommodationPayments.value.find(p => p.id === id);
    if (!pago)
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.deleteAccommodationPayment(id);
      accommodationPayments.value = accommodationPayments.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // ============================================================================
  // Precio al Público Actions
  // ============================================================================

  async function addPrecioPublico(data: QuotationPublicPriceFormData): Promise<QuotationPublicPrice | { error: string }> {
    const cotizacion = quotations.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };

    loading.value = true;
    error.value = null;
    try {
      const newPrecio = await repository.insertPublicPrice(data);
      quotationPublicPrices.value.push(newPrecio);
      return newPrecio;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updatePrecioPublico(id: string, data: Partial<QuotationPublicPriceFormData>): Promise<QuotationPublicPrice | undefined> {
    const index = quotationPublicPrices.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = quotationPublicPrices.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updatePublicPrice(id, data);
      quotationPublicPrices.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deletePrecioPublico(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deletePublicPrice(id);
      quotationPublicPrices.value = quotationPublicPrices.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // ============================================================================
  // Gastos Adicionales Actions
  // ============================================================================

  async function fetchCategoriasGasto(): Promise<void> {
    try {
      expenseCategories.value = await repository.fetchExpenseCategories();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
  }

  function _rememberCategoria(category: string): void {
    if (!expenseCategories.value.includes(category))
      expenseCategories.value = [...expenseCategories.value, category];
  }

  async function addGasto(data: QuotationExpenseFormData): Promise<QuotationExpense | { error: string }> {
    const cotizacion = quotations.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const gasto = await repository.insertExpense(data);
      quotationExpenses.value.push(gasto);
      _rememberCategoria(gasto.category);
      await _syncSeatPrice(data.quotationId);
      return gasto;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateGasto(id: string, data: QuotationExpenseFormData): Promise<QuotationExpense | { error: string }> {
    const index = quotationExpenses.value.findIndex(g => g.id === id);
    const existing = quotationExpenses.value[index];
    if (!existing)
      return { error: 'Gasto no encontrado' };

    const cotizacion = quotations.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const gasto = await repository.updateExpense(id, data);
      quotationExpenses.value[index] = gasto;
      _rememberCategoria(gasto.category);
      await _syncSeatPrice(existing.quotationId);
      return gasto;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteGasto(id: string): Promise<boolean> {
    const gasto = quotationExpenses.value.find(g => g.id === id);
    if (!gasto)
      return false;

    const cotizacion = quotations.value.find(c => c.id === gasto.quotationId);
    if (cotizacion?.status === 'confirmed')
      return false;

    loading.value = true;
    error.value = null;
    try {
      await repository.deleteExpense(id);
      quotationExpenses.value = quotationExpenses.value.filter(g => g.id !== id);
      await _syncSeatPrice(gasto.quotationId);
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return false;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  // ============================================================================
  // Autobuses Apartados Actions
  // ============================================================================

  async function addBusQuotation(data: QuotationBusFormData): Promise<QuotationBus | { error: string }> {
    const cotizacion = quotations.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    const duplicado = quotationBuses.value.find(
      b => b.quotationId === data.quotationId
        && b.providerId === data.providerId
        && b.unitNumber === data.unitNumber,
    );
    if (duplicado)
      return { error: 'Este número de unidad ya existe para este proveedor en la cotización' };

    loading.value = true;
    error.value = null;
    try {
      const { quotationBus: newBus } = await repository.insertBus(data, cotizacion.travelId);
      // The repository also creates the linked travel_bus; refetching the travel detail
      // brings it (and the new total_seats) to the traveler bus options and operators.
      queryCache.invalidateQueries({ key: travelKeys.detail(cotizacion.travelId), exact: true });
      quotationBuses.value.push(newBus);
      await _syncSeatPrice(data.quotationId);
      return newBus;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateBusQuotation(id: string, data: Partial<QuotationBusFormData>): Promise<QuotationBus | undefined> {
    const index = quotationBuses.value.findIndex(b => b.id === id);
    if (index === -1)
      return undefined;

    const existing = quotationBuses.value[index];
    if (!existing)
      return undefined;

    // Confirmed quotations lock the bus structure and costs, but coordinators are assigned
    // on the travel side at any time, so a coordinator-only change still goes through.
    const cotizacion = quotations.value.find(c => c.id === existing.quotationId);
    const onlyCoordinators = Object.keys(data).every(key => key === 'coordinatorIds');
    if (cotizacion?.status === 'confirmed' && !onlyCoordinators) {
      error.value = 'No se puede modificar una cotización confirmada';
      return undefined;
    }

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateBus(id, data);
      quotationBuses.value[index] = updated;

      // travel_buses is the operational projection coordinators see; the repository call
      // above keeps it in sync, and refetching the travel detail brings the new provider,
      // unit and capacity to the traveler bus options and operators.
      if (cotizacion) {
        queryCache.invalidateQueries({ key: travelKeys.detail(cotizacion.travelId), exact: true });
      }

      await _syncSeatPrice(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteBusQuotation(id: string): Promise<void> {
    const bus = quotationBuses.value.find(b => b.id === id);
    if (!bus)
      return;

    const cotizacion = quotations.value.find(c => c.id === bus.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = bus.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteBus(id);

      quotationBuses.value = quotationBuses.value.filter(b => b.id !== id);
      busPayments.value = busPayments.value.filter(p => p.quotationBusId !== id);
      // El travel_bus vinculado se elimina por CASCADE en DB (quotation_bus_id FK ON DELETE CASCADE)
      // y travelers.travel_bus_id se limpia por ON DELETE SET NULL. Volver a pedir el detalle
      // del viaje lo quita de las opciones de camión de los viajeros.
      if (cotizacion) {
        queryCache.invalidateQueries({ key: travelKeys.detail(cotizacion.travelId), exact: true });
      }
      await _syncSeatPrice(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function addBusPayment(data: BusPaymentFormData): Promise<BusPayment | { error: string }> {
    const bus = quotationBuses.value.find(b => b.id === data.quotationBusId);
    if (!bus)
      return { error: 'Autobús no encontrado' };

    if (data.amount <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteBus.value(data.quotationBusId);
    if (data.amount > saldoPendiente)
      return { error: `El monto no puede superar el saldo pendiente (${formatCurrency(saldoPendiente)})` };

    loading.value = true;
    error.value = null;
    try {
      const newPago = await repository.insertBusPayment(data);
      busPayments.value.push(newPago);
      return newPago;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function updateBusPayment(id: string, data: Partial<BusPaymentFormData>): Promise<BusPayment | undefined> {
    const index = busPayments.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = busPayments.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateBusPayment(id, data);
      busPayments.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  async function deleteBusPayment(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteBusPayment(id);
      busPayments.value = busPayments.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      queryCache.invalidateQueries({ key: quotationKeys.root });
      loading.value = false;
    }
  }

  return {
    // State
    cotizaciones: quotations,
    proveedoresQuotation: quotationProviders,
    pagosProveedor: providerPayments,
    optOutsProveedor: providerOptOuts,
    ajustesProveedor: providerPriceAdjustments,
    ajustesViajero: travelerPriceAdjustments,
    hospedajesQuotation: quotationAccommodations,
    pagosHospedaje: accommodationPayments,
    preciosPublicos: quotationPublicPrices,
    busesApartados: quotationBuses,
    pagosBus: busPayments,
    gastosAdicionales: quotationExpenses,
    categoriasGasto: expenseCategories,
    loading,
    error,
    filters,
    // Getters
    getCotizacionByTravel,
    getProveedoresByQuotation,
    getPagosByProveedor,
    getCostoTotal,
    getCostoTipoMinimo,
    getCostoTipoTotal,
    getCostoPorPersonaAsiento,
    getAsientosVendibles,
    getAsientoConGanancia,
    getPrecioAsientoCalculado,
    getGananciaProyectada,
    getAnticipadoProveedor,
    getCostoPerPersonaProveedor,
    getDivisorCosto,
    getSaldoPendienteProveedor,
    getSobrepagoProveedor,
    getOptOutsByProveedor,
    getAjustesByProveedor,
    getAjusteDeViajero,
    getProviderPaymentStatus,
    getSaldoTotalPendiente,
    getPagosByHospedaje,
    getAnticipadoHospedaje,
    getSaldoPendienteHospedaje,
    getAccommodationPaymentStatus,
    getSaldoTotalPendienteHospedajes,
    puedeConfirmar,
    filteredProveedores,
    getHospedajesByQuotation,
    getTotalCostoHospedajes,
    getPreciosPublicosByQuotation,
    getMatrizPreciosReferencia,
    getTotalCostoBuses,
    getCostoBusesTipoMinimo,
    getCostoBusesTipoTotal,
    getSaldoTotalPendienteBuses,
    getBusesByQuotation,
    getBusesByProveedorEnQuotation,
    getPagosByBus,
    getAnticipadoBus,
    getSaldoPendienteBus,
    getBusPaymentStatus,
    getCostoPerPersonaBus,
    getGastosByQuotation,
    getTotalGastos,
    getGastosTipoMinimo,
    getGastosTipoTotal,
    // Actions
    fetchByTravel,
    hydrateTravel,
    createQuotation,
    syncSeatPriceForTravel,
    updateQuotation,
    confirmarQuotation,
    reabrirQuotation,
    addProveedorQuotation,
    updateProveedorQuotation,
    deleteProveedorQuotation,
    toggleConfirmadoProveedor,
    updateProveedorCortesia,
    refreshProviderPayableCosts,
    fetchProviderOptOuts,
    setTomanServicio,
    saveAjustesProveedor,
    fetchTravelerAdjustments,
    setAjusteViajero,
    addProviderPayment,
    updateProviderPayment,
    deleteProviderPayment,
    setFilters,
    clearFilters,
    addHospedajeQuotation,
    updateHospedajeQuotation,
    deleteHospedajeQuotation,
    refreshHospedajeCosts,
    toggleConfirmadoHospedaje,
    addPagoHospedaje,
    updatePagoHospedaje,
    deletePagoHospedaje,
    addPrecioPublico,
    updatePrecioPublico,
    deletePrecioPublico,
    addBusQuotation,
    updateBusQuotation,
    deleteBusQuotation,
    addBusPayment,
    updateBusPayment,
    deleteBusPayment,
    fetchCategoriasGasto,
    addGasto,
    updateGasto,
    deleteGasto,
  };
});
