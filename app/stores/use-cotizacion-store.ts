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

import { useTravelsStore } from '~/stores/use-travel-store';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

export const useCotizacionStore = defineStore('useCotizacionStore', () => {
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

  // Precio calculado a partir del asiento mínimo objetivo: fuente de verdad para travel.price
  // Incluye costos de proveedores, hospedajes y autobuses
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

  const getPrecioAsientoCalculado = computed(() => {
    return (quotationId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
      if (!cotizacion)
        return 0;

      const costoMinimo = getCostoTipoMinimo.value(quotationId);
      const costoCapacidad = getCostoTipoTotal.value(quotationId);
      const costoBusesMinimo = getCostoBusesTipoMinimo.value(quotationId);
      const costoBusesTotal = getCostoBusesTipoTotal.value(quotationId);

      const parteMinimo = cotizacion.minimumSeatTarget > 0
        ? (costoMinimo + costoBusesMinimo) / cotizacion.minimumSeatTarget
        : 0;
      const parteCapacidad = cotizacion.busCapacity > 0
        ? (costoCapacidad + costoBusesTotal) / cotizacion.busCapacity
        : 0;

      if (parteMinimo === 0 && parteCapacidad === 0)
        return 0;
      return Math.ceil(parteMinimo + parteCapacidad);
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
      if (anticipado <= 0)
        return 'pending';
      if (anticipado >= proveedor.totalCost)
        return 'paid';
      return 'partial';
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
      if (anticipado <= 0)
        return 'pending';
      if (anticipado >= hospedaje.totalCost)
        return 'paid';
      return 'partial';
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
      if (anticipado <= 0)
        return 'pending';
      if (anticipado >= bus.totalCost)
        return 'paid';
      return 'partial';
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
  function _syncPrecioToTravel(quotationId: string): void {
    const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
    if (!cotizacion || cotizacion.status === 'confirmed')
      return;
    if (cotizacion.minimumSeatTarget === 0)
      return;

    const nuevoPrecio = getPrecioAsientoCalculado.value(quotationId);
    if (nuevoPrecio === 0)
      return;

    // Actualizar seatPrice en la cotización directamente (evita recursión)
    const index = cotizaciones.value.findIndex(c => c.id === quotationId);
    if (index !== -1 && cotizaciones.value[index]) {
      cotizaciones.value[index] = {
        ...cotizaciones.value[index]!,
        seatPrice: nuevoPrecio,
        updatedAt: new Date().toISOString(),
      };
    }

    // Propagar a travel.price (cotización → viaje)
    const travelStore = useTravelsStore();
    travelStore.updateTravel(cotizacion.travelId, { price: nuevoPrecio });
  }

  // Actions
  function createQuotation(data: QuotationFormData): Quotation {
    const existing = cotizaciones.value.find(c => c.travelId === data.travelId);
    if (existing)
      return existing;

    const now = new Date().toISOString();
    const newQuotation: Quotation = {
      ...data,
      id: `cotizacion-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    cotizaciones.value.push(newQuotation);
    error.value = null;
    return newQuotation;
  }

  function updateQuotation(id: string, data: Partial<QuotationFormData>): Quotation | undefined {
    const index = cotizaciones.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Cotización no encontrada';
      return undefined;
    }

    const existing = cotizaciones.value[index];
    if (!existing)
      return undefined;

    const updated: Quotation = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    cotizaciones.value[index] = updated;
    error.value = null;

    // Si cambió el asiento mínimo, recalcular precio y sincronizar al viaje
    if ('minimumSeatTarget' in data) {
      _syncPrecioToTravel(id);
    }

    return updated;
  }

  function confirmarQuotation(
    id: string,
    travelStore: ReturnType<typeof useTravelsStore>,
  ): { success: boolean; error?: string } {
    const cotizacion = cotizaciones.value.find(c => c.id === id);
    if (!cotizacion)
      return { success: false, error: 'Cotización no encontrada' };

    if (!puedeConfirmar.value(id)) {
      return { success: false, error: 'Todos los proveedores deben estar confirmados' };
    }

    // Crear TravelService[] para el viaje a partir de los proveedores
    const proveedores = proveedoresQuotation.value.filter(p => p.quotationId === id);
    const services = proveedores.map(p => ({
      id: `serv-cotizacion-${p.id}`,
      name: p.serviceDescription,
      description: p.remarks,
      included: true,
      providerId: p.providerId,
    }));

    const updated = travelStore.updateTravel(cotizacion.travelId, { services });
    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el viaje' };
    }

    updateQuotation(id, { status: 'confirmed' });
    return { success: true };
  }

  function addProveedorQuotation(data: QuotationProviderFormData): QuotationProvider | { error: string } {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    const newProveedor: QuotationProvider = {
      ...data,
      id: `cot-prov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    proveedoresQuotation.value.push(newProveedor);
    _syncPrecioToTravel(data.quotationId);
    return newProveedor;
  }

  function updateProveedorQuotation(
    id: string,
    data: Partial<QuotationProviderFormData>,
  ): QuotationProvider | undefined {
    const index = proveedoresQuotation.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = proveedoresQuotation.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    const updated: QuotationProvider = {
      ...existing,
      ...data,
      id: existing.id,
      quotationId: existing.quotationId,
    };

    proveedoresQuotation.value[index] = updated;
    _syncPrecioToTravel(existing.quotationId);
    return updated;
  }

  function deleteProveedorQuotation(id: string): void {
    const proveedor = proveedoresQuotation.value.find(p => p.id === id);
    if (!proveedor)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = proveedor.quotationId;
    proveedoresQuotation.value = proveedoresQuotation.value.filter(p => p.id !== id);
    pagosProveedor.value = pagosProveedor.value.filter(p => p.quotationProviderId !== id);
    _syncPrecioToTravel(quotationId);
  }

  function toggleConfirmadoProveedor(id: string): void {
    const index = proveedoresQuotation.value.findIndex(p => p.id === id);
    if (index === -1)
      return;

    const proveedor = proveedoresQuotation.value[index];
    if (!proveedor)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    proveedoresQuotation.value[index] = { ...proveedor, confirmed: !proveedor.confirmed };
  }

  function addProviderPayment(data: ProviderPaymentFormData): ProviderPayment | { error: string } {
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

    const now = new Date().toISOString();
    const newPago: ProviderPayment = {
      ...data,
      id: `pago-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
    };

    pagosProveedor.value.push(newPago);
    return newPago;
  }

  function updateProviderPayment(id: string, data: Partial<ProviderPaymentFormData>): ProviderPayment | undefined {
    const index = pagosProveedor.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosProveedor.value[index];
    if (!existing)
      return undefined;

    const updated: ProviderPayment = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    pagosProveedor.value[index] = updated;
    return updated;
  }

  function deleteProviderPayment(id: string): void {
    const pago = pagosProveedor.value.find(p => p.id === id);
    if (!pago)
      return;

    const proveedor = proveedoresQuotation.value.find(p => p.id === pago.quotationProviderId);
    const cotizacion = cotizaciones.value.find(c => c.id === proveedor?.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    pagosProveedor.value = pagosProveedor.value.filter(p => p.id !== id);
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

  function addHospedajeQuotation(data: QuotationAccommodationFormData): QuotationAccommodation | { error: string } {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    // Calcular totalCost y enriquecer detalles con costPerPerson
    const detallesEnriquecidos = data.details.map(d => ({
      ...d,
      id: d.id ?? crypto.randomUUID(),
      costPerPerson: d.pricePerNight / d.maxOccupancy,
    }));

    const totalCost = detallesEnriquecidos.reduce((sum, detalle) => {
      return sum + (detalle.pricePerNight * data.nightCount * detalle.quantity);
    }, 0);

    const newHospedaje: QuotationAccommodation = {
      ...data,
      details: detallesEnriquecidos,
      id: `cot-hosp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      totalCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    hospedajesQuotation.value.push(newHospedaje);
    _syncPrecioToTravel(data.quotationId);
    return newHospedaje;
  }

  function updateHospedajeQuotation(
    id: string,
    data: Partial<QuotationAccommodationFormData>,
  ): QuotationAccommodation | undefined {
    const index = hospedajesQuotation.value.findIndex(h => h.id === id);
    if (index === -1)
      return undefined;

    const existing = hospedajesQuotation.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    // Calcular totalCost y enriquecer detalles con costPerPerson
    const detallesBase = data.details ?? existing.details;
    const detallesEnriquecidos = detallesBase.map(d => ({
      ...d,
      id: d.id ?? crypto.randomUUID(),
      costPerPerson: d.pricePerNight / d.maxOccupancy,
    }));

    const totalCost = detallesEnriquecidos.reduce((sum, detalle) => {
      return sum + (detalle.pricePerNight * (data.nightCount ?? existing.nightCount) * detalle.quantity);
    }, 0);

    const updated: QuotationAccommodation = {
      ...existing,
      ...data,
      details: detallesEnriquecidos,
      id: existing.id,
      quotationId: existing.quotationId,
      createdAt: existing.createdAt,
      totalCost,
      updatedAt: new Date().toISOString(),
    };

    hospedajesQuotation.value[index] = updated;
    _syncPrecioToTravel(existing.quotationId);
    return updated;
  }

  function deleteHospedajeQuotation(id: string): void {
    const hospedaje = hospedajesQuotation.value.find(h => h.id === id);
    if (!hospedaje)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = hospedaje.quotationId;
    hospedajesQuotation.value = hospedajesQuotation.value.filter(h => h.id !== id);
    pagosHospedaje.value = pagosHospedaje.value.filter(p => p.quotationAccommodationId !== id);
    _syncPrecioToTravel(quotationId);
  }

  function toggleConfirmadoHospedaje(id: string): void {
    const index = hospedajesQuotation.value.findIndex(h => h.id === id);
    if (index === -1)
      return;

    const hospedaje = hospedajesQuotation.value[index];
    if (!hospedaje)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    hospedajesQuotation.value[index] = { ...hospedaje, confirmed: !hospedaje.confirmed };
  }

  function addPagoHospedaje(data: AccommodationPaymentFormData): AccommodationPayment | { error: string } {
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

    const newPago: AccommodationPayment = {
      ...data,
      id: `pago-hosp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    pagosHospedaje.value.push(newPago);
    return newPago;
  }

  function updatePagoHospedaje(id: string, data: Partial<AccommodationPaymentFormData>): AccommodationPayment | undefined {
    const index = pagosHospedaje.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosHospedaje.value[index];
    if (!existing)
      return undefined;

    const updated: AccommodationPayment = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    pagosHospedaje.value[index] = updated;
    return updated;
  }

  function deletePagoHospedaje(id: string): void {
    const pago = pagosHospedaje.value.find(p => p.id === id);
    if (!pago)
      return;

    const hospedaje = hospedajesQuotation.value.find(h => h.id === pago.quotationAccommodationId);
    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje?.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    pagosHospedaje.value = pagosHospedaje.value.filter(p => p.id !== id);
  }

  // ============================================================================
  // Precio al Público Actions
  // ============================================================================

  function addPrecioPublico(data: QuotationPublicPriceFormData): QuotationPublicPrice | { error: string } {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };

    const now = new Date().toISOString();
    const newPrecio: QuotationPublicPrice = {
      ...data,
      id: `precio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    preciosPublicos.value.push(newPrecio);
    error.value = null;
    return newPrecio;
  }

  function updatePrecioPublico(id: string, data: Partial<QuotationPublicPriceFormData>): QuotationPublicPrice | undefined {
    const index = preciosPublicos.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = preciosPublicos.value[index];
    if (!existing)
      return undefined;

    const updated: QuotationPublicPrice = {
      ...existing,
      ...data,
      id: existing.id,
      quotationId: existing.quotationId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    preciosPublicos.value[index] = updated;
    error.value = null;
    return updated;
  }

  function deletePrecioPublico(id: string): void {
    preciosPublicos.value = preciosPublicos.value.filter(p => p.id !== id);
  }

  // ============================================================================
  // Autobuses Apartados Actions
  // ============================================================================

  function addBusQuotation(data: QuotationBusFormData): QuotationBus | { error: string } {
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

    const now = new Date().toISOString();
    const newBus: QuotationBus = {
      ...data,
      id: `cot-bus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    busesApartados.value.push(newBus);
    _syncPrecioToTravel(data.quotationId);
    return newBus;
  }

  function updateBusQuotation(id: string, data: Partial<QuotationBusFormData>): QuotationBus | undefined {
    const index = busesApartados.value.findIndex(b => b.id === id);
    if (index === -1)
      return undefined;

    const existing = busesApartados.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    const updated: QuotationBus = {
      ...existing,
      ...data,
      id: existing.id,
      quotationId: existing.quotationId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    busesApartados.value[index] = updated;
    _syncPrecioToTravel(existing.quotationId);
    return updated;
  }

  function deleteBusQuotation(id: string): void {
    const bus = busesApartados.value.find(b => b.id === id);
    if (!bus)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === bus.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = bus.quotationId;
    busesApartados.value = busesApartados.value.filter(b => b.id !== id);
    pagosBus.value = pagosBus.value.filter(p => p.quotationBusId !== id);
    _syncPrecioToTravel(quotationId);
  }

  function addBusPayment(data: BusPaymentFormData): BusPayment | { error: string } {
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

    const newPago: BusPayment = {
      ...data,
      id: `pago-bus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    pagosBus.value.push(newPago);
    return newPago;
  }

  function updateBusPayment(id: string, data: Partial<BusPaymentFormData>): BusPayment | undefined {
    const index = pagosBus.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosBus.value[index];
    if (!existing)
      return undefined;

    const updated: BusPayment = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    pagosBus.value[index] = updated;
    return updated;
  }

  function deleteBusPayment(id: string): void {
    pagosBus.value = pagosBus.value.filter(p => p.id !== id);
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
}, {
  persist: {
    key: 'viajeros-ligeros-cotizacion',
    storage: import.meta.client ? localStorage : undefined,
  },
});
