import type {
  AccommodationPayment,
  AccommodationPaymentFormData,
  AccommodationPaymentStatus,
  BusPayment,
  BusPaymentFormData,
  BusPaymentStatus,
  ProviderPayment,
  ProviderPaymentFormData,
  ProviderPaymentStatus,
  Quotation,
  QuotationAccommodation,
  QuotationAccommodationFormData,
  QuotationBus,
  QuotationBusFormData,
  QuotationFormData,
  QuotationProvider,
  QuotationProviderFilters,
  QuotationProviderFormData,
  QuotationPublicPrice,
  QuotationPublicPriceFormData,
} from '~/types/quotation';
import type { TravelAccommodation } from '~/types/travel';

import {
  buildDesiredRoomsMap,
  calculatePaymentStatus,
  calculateSeatPrice,
  reconcileAccommodations,

} from '~/composables/quotation/use-quotation-domain';
import { useQuotationRepository } from '~/composables/quotation/use-quotation-repository';
import { useTravelsStore } from '~/stores/use-travel-store';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';
import {
  mapTravelBusRowToDomain,
} from '~/utils/mappers';

export const useCotizacionStore = defineStore('useCotizacionStore', () => {
  const repository = useQuotationRepository();
  const travelFetchCache = new Set<string>();
  const travelFetchInFlight = new Map<string, Promise<void>>();

  // State
  const cotizaciones = ref<Quotation[]>([]);
  const proveedoresQuotation = ref<QuotationProvider[]>([]);
  const pagosProveedor = ref<ProviderPayment[]>([]);
  const hospedajesQuotation = ref<QuotationAccommodation[]>([]);
  const pagosHospedaje = ref<AccommodationPayment[]>([]);
  const preciosPublicos = ref<QuotationPublicPrice[]>([]);
  const busesApartados = ref<QuotationBus[]>([]);
  const pagosBus = ref<BusPayment[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<QuotationProviderFilters>({});

  // Getters
  const getCotizacionByTravel = computed(() => {
    return (travelId: string): Quotation | undefined => {
      return cotizaciones.value.find(c => c.travelId === travelId);
    };
  });

  const getProveedoresByQuotation = computed(() => {
    return (quotationId: string): QuotationProvider[] => {
      return proveedoresQuotation.value.filter(p => p.quotationId === quotationId);
    };
  });

  const getPagosByProveedor = computed(() => {
    return (quotationProviderId: string): ProviderPayment[] => {
      return [...pagosProveedor.value.filter(p => p.quotationProviderId === quotationProviderId)]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    };
  });

  const getCostoTotal = computed(() => {
    return (quotationId: string): number => {
      return proveedoresQuotation.value
        .filter(p => p.quotationId === quotationId)
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  const getCostoTipoMinimo = computed(() => {
    return (quotationId: string): number => {
      return proveedoresQuotation.value
        .filter(p => p.quotationId === quotationId && (p.splitType ?? 'minimum') === 'minimum')
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  const getCostoTipoTotal = computed(() => {
    return (quotationId: string): number => {
      return proveedoresQuotation.value
        .filter(p => p.quotationId === quotationId && (p.splitType ?? 'minimum') === 'total')
        .reduce((sum, p) => sum + p.totalCost, 0);
    };
  });

  const getHospedajesByQuotation = computed(() => {
    return (quotationId: string): QuotationAccommodation[] => {
      return hospedajesQuotation.value.filter(h => h.quotationId === quotationId);
    };
  });

  const getTotalCostoHospedajes = computed(() => {
    return (quotationId: string): number => {
      return hospedajesQuotation.value
        .filter(h => h.quotationId === quotationId)
        .reduce((sum, h) => sum + h.totalCost, 0);
    };
  });

  const getTotalHabitacionesPorTipo = computed(() => {
    return (quotationId: string): { [tipoId: string]: number } => {
      const resultado: { [tipoId: string]: number } = {};
      const hospedajes = getHospedajesByQuotation.value(quotationId);

      for (const hospedaje of hospedajes) {
        for (const detalle of hospedaje.details) {
          resultado[detalle.roomTypeId] = (resultado[detalle.roomTypeId] ?? 0) + detalle.quantity;
        }
      }

      return resultado;
    };
  });

  const getPreciosPublicosByQuotation = computed(() => {
    return (quotationId: string): QuotationPublicPrice[] => {
      return preciosPublicos.value.filter(p => p.quotationId === quotationId);
    };
  });

  // Matriz de precios de referencia: seatPrice + hospedaje agrupado por maxOccupancy
  const getMatrizPreciosReferencia = computed(() => {
    return (quotationId: string): Array<{
      maxOccupancy: number;
      pricePerPerson: number;
      breakdown: {
        seatPrice: number;
        accommodation: Array<{
          hotelName: string;
          roomType: string;
          costPerPerson: number;
        }>;
        totalAccommodation: number;
      };
    }> => {
      const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
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
        costPerPerson: number;
      }>> = new Map();

      for (const hospedaje of hospedajes) {
        const hotelProvider = providerStore.getProviderById(hospedaje.providerId);
        const hotelName = hotelProvider?.name ?? `Hotel ${hospedaje.providerId}`;
        const roomData = hotelRoomStore.getRoomDataByProviderId(hospedaje.providerId);

        for (const detalle of hospedaje.details) {
          const ocupacion = detalle.maxOccupancy;
          const costPerPerson = detalle.pricePerNight / detalle.maxOccupancy;

          const roomTypeRecord = roomData?.roomTypes.find(rt => rt.id === detalle.roomTypeId);
          const roomType = roomTypeRecord
            ? formatBedConfiguration(roomTypeRecord.beds)
            : `${ocupacion} persona${ocupacion > 1 ? 's' : ''}`;

          if (!porOcupacion.has(ocupacion)) {
            porOcupacion.set(ocupacion, []);
          }
          porOcupacion.get(ocupacion)!.push({ hotelName, roomType, costPerPerson });
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

  const getAsientoMinimoCalculado = computed(() => {
    return (quotationId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
      if (!cotizacion || cotizacion.seatPrice === 0)
        return 0;
      const costoTotal = getCostoTotal.value(quotationId);
      return Math.ceil(costoTotal / cotizacion.seatPrice);
    };
  });

  const getTotalCostoBuses = computed(() => {
    return (quotationId: string): number => {
      return busesApartados.value
        .filter(b => b.quotationId === quotationId)
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getCostoBusesTipoMinimo = computed(() => {
    return (quotationId: string): number => {
      return busesApartados.value
        .filter(b => b.quotationId === quotationId && (b.splitType ?? 'minimum') === 'minimum')
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  const getCostoBusesTipoTotal = computed(() => {
    return (quotationId: string): number => {
      return busesApartados.value
        .filter(b => b.quotationId === quotationId && (b.splitType ?? 'minimum') === 'total')
        .reduce((sum, b) => sum + (b.totalCost ?? 0), 0);
    };
  });

  // Precio calculado a partir del asiento mínimo objetivo: fuente de verdad para travel.price
  // Incluye costos de proveedores, hospedajes y autobuses
  const getPrecioAsientoCalculado = computed(() => {
    return (quotationId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
      if (!cotizacion)
        return 0;

      return calculateSeatPrice(
        cotizacion,
        proveedoresQuotation.value.filter(p => p.quotationId === quotationId),
        busesApartados.value.filter(b => b.quotationId === quotationId),
      );
    };
  });

  const getGananciaProyectada = computed(() => {
    return (quotationId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
      if (!cotizacion || cotizacion.busCapacity === 0)
        return 0;
      const seatPrice = getPrecioAsientoCalculado.value(quotationId);
      const costoTotal = getCostoTotal.value(quotationId)
        + getTotalCostoBuses.value(quotationId)
        + getTotalCostoHospedajes.value(quotationId);
      return (cotizacion.busCapacity * seatPrice) - costoTotal;
    };
  });

  const getAnticipadoProveedor = computed(() => {
    return (quotationProviderId: string): number => {
      return pagosProveedor.value
        .filter(p => p.quotationProviderId === quotationProviderId)
        .reduce((sum, p) => sum + p.amount, 0);
    };
  });

  const getCostoPerPersonaProveedor = computed(() => {
    return (quotationProviderId: string): number => {
      const proveedor = proveedoresQuotation.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 0;

      const cotizacion = cotizaciones.value.find(c => c.id === proveedor.quotationId);
      if (!cotizacion)
        return 0;

      const splitType = proveedor.splitType ?? 'minimum';
      const divisor = splitType === 'total'
        ? cotizacion.busCapacity
        : cotizacion.minimumSeatTarget;

      if (divisor === 0)
        return 0;
      return proveedor.totalCost / divisor;
    };
  });

  const getSaldoPendienteProveedor = computed(() => {
    return (quotationProviderId: string): number => {
      const proveedor = proveedoresQuotation.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 0;
      const anticipado = getAnticipadoProveedor.value(quotationProviderId);
      return proveedor.totalCost - anticipado;
    };
  });

  const getProviderPaymentStatus = computed(() => {
    return (quotationProviderId: string): ProviderPaymentStatus => {
      const proveedor = proveedoresQuotation.value.find(p => p.id === quotationProviderId);
      if (!proveedor)
        return 'pending';
      const anticipado = getAnticipadoProveedor.value(quotationProviderId);
      return calculatePaymentStatus(anticipado, proveedor.totalCost);
    };
  });

  const getSaldoTotalPendiente = computed(() => {
    return (quotationId: string): number => {
      return proveedoresQuotation.value
        .filter(p => p.quotationId === quotationId)
        .reduce((sum, p) => sum + getSaldoPendienteProveedor.value(p.id), 0);
    };
  });

  const getPagosByHospedaje = computed(() => {
    return (quotationAccommodationId: string): AccommodationPayment[] => {
      return [...pagosHospedaje.value.filter(p => p.quotationAccommodationId === quotationAccommodationId)]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    };
  });

  const getAnticipadoHospedaje = computed(() => {
    return (quotationAccommodationId: string): number => {
      return pagosHospedaje.value
        .filter(p => p.quotationAccommodationId === quotationAccommodationId)
        .reduce((sum, p) => sum + p.amount, 0);
    };
  });

  const getSaldoPendienteHospedaje = computed(() => {
    return (quotationAccommodationId: string): number => {
      const hospedaje = hospedajesQuotation.value.find(h => h.id === quotationAccommodationId);
      if (!hospedaje)
        return 0;
      return hospedaje.totalCost - getAnticipadoHospedaje.value(quotationAccommodationId);
    };
  });

  const getAccommodationPaymentStatus = computed(() => {
    return (quotationAccommodationId: string): AccommodationPaymentStatus => {
      const hospedaje = hospedajesQuotation.value.find(h => h.id === quotationAccommodationId);
      if (!hospedaje)
        return 'pending';
      const anticipado = getAnticipadoHospedaje.value(quotationAccommodationId);
      return calculatePaymentStatus(anticipado, hospedaje.totalCost);
    };
  });

  const getSaldoTotalPendienteHospedajes = computed(() => {
    return (quotationId: string): number => {
      return hospedajesQuotation.value
        .filter(h => h.quotationId === quotationId)
        .reduce((sum, h) => sum + getSaldoPendienteHospedaje.value(h.id), 0);
    };
  });

  const puedeConfirmar = computed(() => {
    return (quotationId: string): boolean => {
      const proveedores = proveedoresQuotation.value.filter(p => p.quotationId === quotationId);
      if (proveedores.length === 0)
        return false;
      return proveedores.every(p => p.confirmed === true);
    };
  });

  const hasQuotation = computed(() => {
    return (travelId: string): boolean => {
      return cotizaciones.value.some(c => c.travelId === travelId);
    };
  });

  const filteredProveedores = computed(() => {
    return (quotationId: string): QuotationProvider[] => {
      let result = proveedoresQuotation.value.filter(p => p.quotationId === quotationId);

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
      return busesApartados.value.filter(b => b.quotationId === quotationId);
    };
  });

  const getBusesByProveedorEnQuotation = computed(() => {
    return (quotationId: string, providerId: string): QuotationBus[] => {
      return busesApartados.value.filter(
        b => b.quotationId === quotationId && b.providerId === providerId,
      );
    };
  });

  const getPagosByBus = computed(() => {
    return (quotationBusId: string): BusPayment[] => {
      return [...pagosBus.value.filter(p => p.quotationBusId === quotationBusId)]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    };
  });

  const getAnticipadoBus = computed(() => {
    return (quotationBusId: string): number => {
      return pagosBus.value
        .filter(p => p.quotationBusId === quotationBusId)
        .reduce((sum, p) => sum + p.amount, 0);
    };
  });

  const getSaldoPendienteBus = computed(() => {
    return (quotationBusId: string): number => {
      const bus = busesApartados.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 0;
      return bus.totalCost - getAnticipadoBus.value(quotationBusId);
    };
  });

  const getSaldoTotalPendienteBuses = computed(() => {
    return (quotationId: string): number => {
      return busesApartados.value
        .filter(b => b.quotationId === quotationId)
        .reduce((sum, b) => sum + getSaldoPendienteBus.value(b.id), 0);
    };
  });

  const getBusPaymentStatus = computed(() => {
    return (quotationBusId: string): BusPaymentStatus => {
      const bus = busesApartados.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 'pending';
      const anticipado = getAnticipadoBus.value(quotationBusId);
      return calculatePaymentStatus(anticipado, bus.totalCost ?? 0);
    };
  });

  const getCostoPerPersonaBus = computed(() => {
    return (quotationBusId: string): number => {
      const bus = busesApartados.value.find(b => b.id === quotationBusId);
      if (!bus)
        return 0;
      const cotizacion = cotizaciones.value.find(c => c.id === bus.quotationId);
      if (!cotizacion)
        return 0;
      const divisor = bus.splitType === 'total'
        ? cotizacion.busCapacity
        : cotizacion.minimumSeatTarget;
      if (divisor === 0)
        return 0;
      return bus.totalCost / divisor;
    };
  });

  // Helper interno — recalcula seatPrice y lo sincroniza a travel.price
  async function _syncPrecioToTravel(quotationId: string): Promise<void> {
    const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
    if (!cotizacion || cotizacion.status === 'confirmed')
      return;
    if (cotizacion.minimumSeatTarget === 0)
      return;

    const nuevoPrecio = getPrecioAsientoCalculado.value(quotationId);
    if (nuevoPrecio === 0)
      return;

    await repository.updateSeatPrice(quotationId, nuevoPrecio);

    const index = cotizaciones.value.findIndex(c => c.id === quotationId);
    if (index !== -1 && cotizaciones.value[index]) {
      cotizaciones.value[index] = {
        ...cotizaciones.value[index]!,
        seatPrice: nuevoPrecio,
        updatedAt: new Date().toISOString(),
      };
    }

    const travelStore = useTravelsStore();
    await travelStore.updateTravel(cotizacion.travelId, { price: nuevoPrecio });
  }

  // Helper interno — sincroniza habitaciones de cotización hacia travel_accommodations
  async function _syncHospedajeToTravel(quotationId: string): Promise<{ skippedOccupied: number }> {
    const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
    if (!cotizacion || cotizacion.status === 'confirmed')
      return { skippedOccupied: 0 };

    const travelStore = useTravelsStore();
    const travelId = cotizacion.travelId;

    // Build desired state: group by providerId:hotelRoomTypeId -> list of desired room slots
    const desiredGroupMap = buildDesiredRoomsMap(hospedajesQuotation.value.filter(h => h.quotationId === quotationId));

    // Get existing rooms for this travel
    const existingAccommodations = travelStore.getAccommodationsByTravel(travelId);

    // Get occupied room IDs from DB (travelers with a room in this travel)
    const occupiedIds = await repository.getOccupiedAccommodationIds(travelId);

    const { toDeleteIds, toInsert, skippedOccupied } = reconcileAccommodations(desiredGroupMap, existingAccommodations, occupiedIds);

    // Execute DB changes
    if (toDeleteIds.length > 0) {
      await repository.deleteUnoccupiedAccommodations(toDeleteIds);
    }

    let inserted: TravelAccommodation[] = [];
    if (toInsert.length > 0) {
      inserted = await repository.insertTravelAccommodations(travelId, toInsert);
    }

    // Update local state without nuking occupied assignments
    travelStore.updateLocalAccommodations(travelId, new Set(toDeleteIds), inserted);
    return { skippedOccupied };
  }

  // Actions

  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      cotizaciones.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function fetchByTravel(travelId: string, options?: { force?: boolean }): Promise<void> {
    const force = options?.force === true;

    if (!force && travelFetchCache.has(travelId)) {
      return;
    }

    if (!force) {
      const inflight = travelFetchInFlight.get(travelId);
      if (inflight) {
        await inflight;
        return;
      }
    }

    const run = async () => {
      loading.value = true;
      error.value = null;
      try {
        const result = await repository.fetchByTravel(travelId);

        if (!result) {
          const existing = cotizaciones.value.find(c => c.travelId === travelId);
          if (existing) {
            const qId = existing.id;
            cotizaciones.value = cotizaciones.value.filter(c => c.id !== qId);
            proveedoresQuotation.value = proveedoresQuotation.value.filter(p => p.quotationId !== qId);
            pagosProveedor.value = pagosProveedor.value.filter(p =>
              !proveedoresQuotation.value.some(prov => prov.id === p.quotationProviderId && prov.quotationId === qId),
            );
            hospedajesQuotation.value = hospedajesQuotation.value.filter(h => h.quotationId !== qId);
            pagosHospedaje.value = pagosHospedaje.value.filter(p =>
              !hospedajesQuotation.value.some(h => h.id === p.quotationAccommodationId && h.quotationId === qId),
            );
            preciosPublicos.value = preciosPublicos.value.filter(p => p.quotationId !== qId);
            busesApartados.value = busesApartados.value.filter(b => b.quotationId !== qId);
            pagosBus.value = pagosBus.value.filter(p =>
              !busesApartados.value.some(b => b.id === p.quotationBusId && b.quotationId === qId),
            );
          }
          travelFetchCache.add(travelId);
          return;
        }
        const { quotation, providers, providerPayments, accommodations, accommodationPayments, publicPrices, buses, busPayments } = result;
        const quotationId = quotation.id;

        cotizaciones.value = [...cotizaciones.value.filter(c => c.travelId !== travelId), quotation];
        proveedoresQuotation.value = [...proveedoresQuotation.value.filter(p => p.quotationId !== quotationId), ...providers];
        pagosProveedor.value = [...pagosProveedor.value.filter(p => !providers.some(pr => pr.id === p.quotationProviderId)), ...providerPayments];
        hospedajesQuotation.value = [...hospedajesQuotation.value.filter(h => h.quotationId !== quotationId), ...accommodations];
        pagosHospedaje.value = [...pagosHospedaje.value.filter(p => !accommodations.some(a => a.id === p.quotationAccommodationId)), ...accommodationPayments];
        preciosPublicos.value = [...preciosPublicos.value.filter(p => p.quotationId !== quotationId), ...publicPrices];
        busesApartados.value = [...busesApartados.value.filter(b => b.quotationId !== quotationId), ...buses];
        pagosBus.value = [...pagosBus.value.filter(p => !buses.some(b => b.id === p.quotationBusId)), ...busPayments];

        travelFetchCache.add(travelId);
      }
      catch (e) {
        error.value = e instanceof Error ? e.message : 'Error desconocido';
      }
      finally {
        loading.value = false;
      }
    };

    const pending = run();
    travelFetchInFlight.set(travelId, pending);
    await pending;
    travelFetchInFlight.delete(travelId);
  }

  async function createQuotation(data: QuotationFormData): Promise<Quotation> {
    const existing = cotizaciones.value.find(c => c.travelId === data.travelId);
    if (existing)
      return existing;

    loading.value = true;
    error.value = null;
    try {
      const quotation = await repository.insertQuotation(data);
      cotizaciones.value.push(quotation);
      travelFetchCache.add(data.travelId);
      return quotation;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateQuotation(id: string, data: Partial<QuotationFormData>): Promise<Quotation | undefined> {
    const index = cotizaciones.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Cotización no encontrada';
      return undefined;
    }

    const existing = cotizaciones.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateQuotation(id, data);
      cotizaciones.value[index] = updated;

      if ('minimumSeatTarget' in data) {
        await _syncPrecioToTravel(id);
      }

      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function confirmarQuotation(
    id: string,
    travelStore: ReturnType<typeof useTravelsStore>,
  ): Promise<{ success: boolean; error?: string }> {
    const cotizacion = cotizaciones.value.find(c => c.id === id);
    if (!cotizacion)
      return { success: false, error: 'Cotización no encontrada' };

    if (!puedeConfirmar.value(id)) {
      return { success: false, error: 'Todos los proveedores deben estar confirmados' };
    }

    loading.value = true;
    error.value = null;
    try {
      const proveedores = proveedoresQuotation.value.filter(p => p.quotationId === id);
      const services = proveedores.map(p => ({
        id: `serv-cotizacion-${p.id}`,
        name: p.serviceDescription,
        description: p.remarks,
        included: true,
        providerId: p.providerId,
      }));

      const updated = await travelStore.updateTravel(cotizacion.travelId, { services });
      if (!updated)
        return { success: false, error: 'No se pudo actualizar el viaje' };

      await updateQuotation(id, { status: 'confirmed' });
      return { success: true };
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { success: false, error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function addProveedorQuotation(data: QuotationProviderFormData): Promise<QuotationProvider | { error: string }> {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const newProveedor = await repository.insertProvider(data);
      proveedoresQuotation.value.push(newProveedor);
      await _syncPrecioToTravel(data.quotationId);
      return newProveedor;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updateProveedorQuotation(
    id: string,
    data: Partial<QuotationProviderFormData>,
  ): Promise<QuotationProvider | undefined> {
    const index = proveedoresQuotation.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = proveedoresQuotation.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProvider(id, data);
      proveedoresQuotation.value[index] = updated;
      await _syncPrecioToTravel(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteProveedorQuotation(id: string): Promise<void> {
    const proveedor = proveedoresQuotation.value.find(p => p.id === id);
    if (!proveedor)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = proveedor.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteProvider(id);

      proveedoresQuotation.value = proveedoresQuotation.value.filter(p => p.id !== id);
      pagosProveedor.value = pagosProveedor.value.filter(p => p.quotationProviderId !== id);
      await _syncPrecioToTravel(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function toggleConfirmadoProveedor(id: string): Promise<void> {
    const proveedor = proveedoresQuotation.value.find(p => p.id === id);
    if (!proveedor)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.toggleProviderConfirmado(id, !proveedor.confirmed);

      const index = proveedoresQuotation.value.findIndex(p => p.id === id);
      if (index !== -1 && proveedoresQuotation.value[index]) {
        proveedoresQuotation.value[index] = { ...proveedoresQuotation.value[index]!, confirmed: !proveedor.confirmed };
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function addProviderPayment(data: ProviderPaymentFormData): Promise<ProviderPayment | { error: string }> {
    const proveedor = proveedoresQuotation.value.find(p => p.id === data.quotationProviderId);
    if (!proveedor)
      return { error: 'Proveedor no encontrado' };

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    if (data.amount <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteProveedor.value(data.quotationProviderId);
    if (data.amount > saldoPendiente) {
      return { error: `El monto no puede superar el saldo pendiente ($${saldoPendiente.toFixed(2)})` };
    }

    loading.value = true;
    error.value = null;
    try {
      const newPago = await repository.insertProviderPayment(data);
      pagosProveedor.value.push(newPago);
      return newPago;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updateProviderPayment(id: string, data: Partial<ProviderPaymentFormData>): Promise<ProviderPayment | undefined> {
    const index = pagosProveedor.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosProveedor.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateProviderPayment(id, data);
      pagosProveedor.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteProviderPayment(id: string): Promise<void> {
    const pago = pagosProveedor.value.find(p => p.id === id);
    if (!pago)
      return;

    const proveedor = proveedoresQuotation.value.find(p => p.id === pago.quotationProviderId);
    const cotizacion = cotizaciones.value.find(c => c.id === proveedor?.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.deleteProviderPayment(id);
      pagosProveedor.value = pagosProveedor.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
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

  async function addHospedajeQuotation(data: QuotationAccommodationFormData): Promise<(QuotationAccommodation & { skippedOccupied: number }) | { error: string }> {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    loading.value = true;
    error.value = null;
    try {
      const newHospedaje = await repository.insertAccommodation(data);
      hospedajesQuotation.value.push(newHospedaje);
      await _syncPrecioToTravel(data.quotationId);
      const addSyncResult = await _syncHospedajeToTravel(data.quotationId);
      return { ...newHospedaje, skippedOccupied: addSyncResult.skippedOccupied };
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updateHospedajeQuotation(
    id: string,
    data: Partial<QuotationAccommodationFormData>,
  ): Promise<(QuotationAccommodation & { skippedOccupied: number }) | undefined> {
    const index = hospedajesQuotation.value.findIndex(h => h.id === id);
    if (index === -1)
      return undefined;

    const existing = hospedajesQuotation.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateAccommodation(id, data, existing.nightCount, existing.details);
      hospedajesQuotation.value[index] = updated;
      await _syncPrecioToTravel(existing.quotationId);
      const updateSyncResult = await _syncHospedajeToTravel(existing.quotationId);
      return { ...updated, skippedOccupied: updateSyncResult.skippedOccupied };
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteHospedajeQuotation(id: string): Promise<number> {
    const hospedaje = hospedajesQuotation.value.find(h => h.id === id);
    if (!hospedaje)
      return 0;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return 0;

    const quotationId = hospedaje.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteAccommodation(id);

      hospedajesQuotation.value = hospedajesQuotation.value.filter(h => h.id !== id);
      pagosHospedaje.value = pagosHospedaje.value.filter(p => p.quotationAccommodationId !== id);
      await _syncPrecioToTravel(quotationId);
      const deleteSyncResult = await _syncHospedajeToTravel(quotationId);
      return deleteSyncResult.skippedOccupied;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return 0;
    }
    finally {
      loading.value = false;
    }
  }

  async function toggleConfirmadoHospedaje(id: string): Promise<void> {
    const hospedaje = hospedajesQuotation.value.find(h => h.id === id);
    if (!hospedaje)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.toggleConfirmAccommodation(id, !hospedaje.confirmed);

      const index = hospedajesQuotation.value.findIndex(h => h.id === id);
      if (index !== -1 && hospedajesQuotation.value[index]) {
        hospedajesQuotation.value[index] = { ...hospedajesQuotation.value[index]!, confirmed: !hospedaje.confirmed };
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function addPagoHospedaje(data: AccommodationPaymentFormData): Promise<AccommodationPayment | { error: string }> {
    const hospedaje = hospedajesQuotation.value.find(h => h.id === data.quotationAccommodationId);
    if (!hospedaje)
      return { error: 'Hospedaje no encontrado' };

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    if (data.amount <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteHospedaje.value(data.quotationAccommodationId);
    if (data.amount > saldoPendiente)
      return { error: `El monto no puede superar el saldo pendiente ($${saldoPendiente.toFixed(2)})` };

    loading.value = true;
    error.value = null;
    try {
      const newPago = await repository.insertAccommodationPayment(data);
      pagosHospedaje.value.push(newPago);
      return newPago;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updatePagoHospedaje(id: string, data: Partial<AccommodationPaymentFormData>): Promise<AccommodationPayment | undefined> {
    const index = pagosHospedaje.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosHospedaje.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateAccommodationPayment(id, data);
      pagosHospedaje.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deletePagoHospedaje(id: string): Promise<void> {
    const pago = pagosHospedaje.value.find(p => p.id === id);
    if (!pago)
      return;

    const hospedaje = hospedajesQuotation.value.find(h => h.id === pago.quotationAccommodationId);
    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje?.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    loading.value = true;
    error.value = null;
    try {
      await repository.deleteAccommodationPayment(id);
      pagosHospedaje.value = pagosHospedaje.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  // ============================================================================
  // Precio al Público Actions
  // ============================================================================

  async function addPrecioPublico(data: QuotationPublicPriceFormData): Promise<QuotationPublicPrice | { error: string }> {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };

    loading.value = true;
    error.value = null;
    try {
      const newPrecio = await repository.insertPublicPrice(data);
      preciosPublicos.value.push(newPrecio);
      return newPrecio;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updatePrecioPublico(id: string, data: Partial<QuotationPublicPriceFormData>): Promise<QuotationPublicPrice | undefined> {
    const index = preciosPublicos.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = preciosPublicos.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updatePublicPrice(id, data);
      preciosPublicos.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deletePrecioPublico(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deletePublicPrice(id);
      preciosPublicos.value = preciosPublicos.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  // ============================================================================
  // Autobuses Apartados Actions
  // ============================================================================

  async function addBusQuotation(data: QuotationBusFormData): Promise<QuotationBus | { error: string }> {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    const duplicado = busesApartados.value.find(
      b => b.quotationId === data.quotationId
        && b.providerId === data.providerId
        && b.unitNumber === data.unitNumber,
    );
    if (duplicado)
      return { error: 'Este número de unidad ya existe para este proveedor en la cotización' };

    loading.value = true;
    error.value = null;
    try {
      const { quotationBus: newBus, travelBusRow } = await repository.insertBus(data, cotizacion.travelId);
      busesApartados.value.push(newBus);
      const travelStore = useTravelsStore();
      const travelIndex = travelStore.travels.findIndex(t => t.id === cotizacion.travelId);
      if (travelIndex !== -1) {
        travelStore.travels[travelIndex] = {
          ...travelStore.travels[travelIndex]!,
          buses: [...(travelStore.travels[travelIndex]!.buses ?? []), mapTravelBusRowToDomain(travelBusRow)],
        };
      }
      await _syncPrecioToTravel(data.quotationId);
      return newBus;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updateBusQuotation(id: string, data: Partial<QuotationBusFormData>): Promise<QuotationBus | undefined> {
    const index = busesApartados.value.findIndex(b => b.id === id);
    if (index === -1)
      return undefined;

    const existing = busesApartados.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateBus(id, data);
      busesApartados.value[index] = updated;
      const travelStore = useTravelsStore();
      const travelIndex = travelStore.travels.findIndex(t => t.id === cotizacion!.travelId);
      if (travelIndex !== -1) {
        travelStore.travels[travelIndex] = {
          ...travelStore.travels[travelIndex]!,
          buses: (travelStore.travels[travelIndex]!.buses ?? []).map(b =>
            b.quotationBusId === id ? { ...b, rentalPrice: updated.totalCost } : b,
          ),
        };
      }
      await _syncPrecioToTravel(existing.quotationId);
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteBusQuotation(id: string): Promise<void> {
    const bus = busesApartados.value.find(b => b.id === id);
    if (!bus)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === bus.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = bus.quotationId;
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteBus(id);

      busesApartados.value = busesApartados.value.filter(b => b.id !== id);
      pagosBus.value = pagosBus.value.filter(p => p.quotationBusId !== id);
      // El travel_bus vinculado se elimina por CASCADE en DB (quotation_bus_id FK ON DELETE CASCADE)
      // y travelers.travel_bus_id se limpia por ON DELETE SET NULL
      // Actualizar estado local del travel
      const travelStore = useTravelsStore();
      if (cotizacion) {
        const tIdx = travelStore.travels.findIndex(t => t.id === cotizacion.travelId);
        if (tIdx !== -1) {
          travelStore.travels[tIdx] = {
            ...travelStore.travels[tIdx]!,
            buses: (travelStore.travels[tIdx]!.buses ?? []).filter(b => b.quotationBusId !== id),
          };
        }
      }
      await _syncPrecioToTravel(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function addBusPayment(data: BusPaymentFormData): Promise<BusPayment | { error: string }> {
    const bus = busesApartados.value.find(b => b.id === data.quotationBusId);
    if (!bus)
      return { error: 'Autobús no encontrado' };

    const cotizacion = cotizaciones.value.find(c => c.id === bus.quotationId);
    if (cotizacion?.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    if (data.amount <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteBus.value(data.quotationBusId);
    if (data.amount > saldoPendiente)
      return { error: `El monto no puede superar el saldo pendiente ($${saldoPendiente.toFixed(2)})` };

    loading.value = true;
    error.value = null;
    try {
      const newPago = await repository.insertBusPayment(data);
      pagosBus.value.push(newPago);
      return newPago;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return { error: error.value };
    }
    finally {
      loading.value = false;
    }
  }

  async function updateBusPayment(id: string, data: Partial<BusPaymentFormData>): Promise<BusPayment | undefined> {
    const index = pagosBus.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosBus.value[index];
    if (!existing)
      return undefined;

    loading.value = true;
    error.value = null;
    try {
      const updated = await repository.updateBusPayment(id, data);
      pagosBus.value[index] = updated;
      return updated;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteBusPayment(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteBusPayment(id);
      pagosBus.value = pagosBus.value.filter(p => p.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  return {
    // State
    cotizaciones,
    proveedoresQuotation,
    pagosProveedor,
    hospedajesQuotation,
    pagosHospedaje,
    preciosPublicos,
    busesApartados,
    pagosBus,
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
    getAsientoMinimoCalculado,
    getPrecioAsientoCalculado,
    getGananciaProyectada,
    getAnticipadoProveedor,
    getCostoPerPersonaProveedor,
    getSaldoPendienteProveedor,
    getProviderPaymentStatus,
    getSaldoTotalPendiente,
    getPagosByHospedaje,
    getAnticipadoHospedaje,
    getSaldoPendienteHospedaje,
    getAccommodationPaymentStatus,
    getSaldoTotalPendienteHospedajes,
    puedeConfirmar,
    hasQuotation,
    filteredProveedores,
    getHospedajesByQuotation,
    getTotalCostoHospedajes,
    getTotalHabitacionesPorTipo,
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
    // Actions
    fetchAll,
    fetchByTravel,
    createQuotation,
    updateQuotation,
    confirmarQuotation,
    addProveedorQuotation,
    updateProveedorQuotation,
    deleteProveedorQuotation,
    toggleConfirmadoProveedor,
    addProviderPayment,
    updateProviderPayment,
    deleteProviderPayment,
    setFilters,
    clearFilters,
    addHospedajeQuotation,
    updateHospedajeQuotation,
    deleteHospedajeQuotation,
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
  };
});
