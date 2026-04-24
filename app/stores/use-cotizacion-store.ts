import type { Tables, TablesUpdate } from '~/types/database.types';
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
import {
  mapAccommodationPaymentRowToDomain,
  mapAccommodationPaymentToInsert,
  mapBusPaymentRowToDomain,
  mapBusPaymentToInsert,
  mapProviderPaymentRowToDomain,
  mapProviderPaymentToInsert,
  mapQuotationAccommodationDetailRowToDomain,
  mapQuotationAccommodationRowToDomain,
  mapQuotationBusRowToDomain,
  mapQuotationBusToInsert,
  mapQuotationProviderRowToDomain,
  mapQuotationProviderToInsert,
  mapQuotationPublicPriceRowToDomain,
  mapQuotationPublicPriceToInsert,
  mapQuotationRowToDomain,
  mapQuotationToInsert,
} from '~/utils/mappers';

export const useCotizacionStore = defineStore('useCotizacionStore', () => {
  const supabase = useSupabase();

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
  async function _syncPrecioToTravel(quotationId: string): Promise<void> {
    const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
    if (!cotizacion || cotizacion.status === 'confirmed')
      return;
    if (cotizacion.minimumSeatTarget === 0)
      return;

    const nuevoPrecio = getPrecioAsientoCalculado.value(quotationId);
    if (nuevoPrecio === 0)
      return;

    const { error: err } = await supabase
      .from('quotations')
      .update({ seat_price: nuevoPrecio })
      .eq('id', quotationId);
    if (err)
      throw err;

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

  // Actions

  async function fetchByTravel(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data: quotRow, error: quotErr } = await supabase
        .from('quotations')
        .select('*')
        .eq('travel_id', travelId)
        .maybeSingle();
      if (quotErr)
        throw quotErr;

      if (!quotRow) {
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
        return;
      }

      const quotationId = quotRow.id;

      const [
        providersResult,
        accommodationsResult,
        publicPricesResult,
        busesResult,
      ] = await Promise.all([
        supabase
          .from('quotation_providers')
          .select('*, provider_payments(*)')
          .eq('quotation_id', quotationId),
        supabase
          .from('quotation_accommodations')
          .select('*, quotation_accommodation_details(*), accommodation_payments(*)')
          .eq('quotation_id', quotationId),
        supabase
          .from('quotation_public_prices')
          .select('*')
          .eq('quotation_id', quotationId),
        supabase
          .from('quotation_buses')
          .select('*, bus_payments(*)')
          .eq('quotation_id', quotationId),
      ]);

      if (providersResult.error)
        throw providersResult.error;
      if (accommodationsResult.error)
        throw accommodationsResult.error;
      if (publicPricesResult.error)
        throw publicPricesResult.error;
      if (busesResult.error)
        throw busesResult.error;

      const providers = (providersResult.data ?? []).map((row) => {
        const { provider_payments: _pp, ...provRow } = row;
        return mapQuotationProviderRowToDomain(provRow as Tables<'quotation_providers'>);
      });
      const newPagosProveedor = (providersResult.data ?? []).flatMap(row =>
        (row.provider_payments ?? []).map(mapProviderPaymentRowToDomain),
      );

      const accommodations = (accommodationsResult.data ?? []).map((row) => {
        const { quotation_accommodation_details: detRows, accommodation_payments: _ap, ...accRow } = row;
        const details = (detRows ?? []).map(d => ({
          ...mapQuotationAccommodationDetailRowToDomain(d as Tables<'quotation_accommodation_details'>),
          costPerPerson: d.price_per_night / d.max_occupancy,
        }));
        return mapQuotationAccommodationRowToDomain(accRow as Tables<'quotation_accommodations'>, details);
      });
      const newPagosHospedaje = (accommodationsResult.data ?? []).flatMap(row =>
        (row.accommodation_payments ?? []).map(mapAccommodationPaymentRowToDomain),
      );

      const buses = (busesResult.data ?? []).map((row) => {
        const { bus_payments: _bp, ...busRow } = row;
        return mapQuotationBusRowToDomain(busRow as Tables<'quotation_buses'>);
      });
      const newPagosBus = (busesResult.data ?? []).flatMap(row =>
        (row.bus_payments ?? []).map(mapBusPaymentRowToDomain),
      );

      cotizaciones.value = [
        ...cotizaciones.value.filter(c => c.travelId !== travelId),
        mapQuotationRowToDomain(quotRow),
      ];
      proveedoresQuotation.value = [
        ...proveedoresQuotation.value.filter(p => p.quotationId !== quotationId),
        ...providers,
      ];
      pagosProveedor.value = [
        ...pagosProveedor.value.filter(p => !providers.some(pr => pr.id === p.quotationProviderId)),
        ...newPagosProveedor,
      ];
      hospedajesQuotation.value = [
        ...hospedajesQuotation.value.filter(h => h.quotationId !== quotationId),
        ...accommodations,
      ];
      pagosHospedaje.value = [
        ...pagosHospedaje.value.filter(p => !accommodations.some(a => a.id === p.quotationAccommodationId)),
        ...newPagosHospedaje,
      ];
      preciosPublicos.value = [
        ...preciosPublicos.value.filter(p => p.quotationId !== quotationId),
        ...(publicPricesResult.data ?? []).map(mapQuotationPublicPriceRowToDomain),
      ];
      busesApartados.value = [
        ...busesApartados.value.filter(b => b.quotationId !== quotationId),
        ...buses,
      ];
      pagosBus.value = [
        ...pagosBus.value.filter(p => !buses.some(b => b.id === p.quotationBusId)),
        ...newPagosBus,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function createQuotation(data: QuotationFormData): Promise<Quotation> {
    const existing = cotizaciones.value.find(c => c.travelId === data.travelId);
    if (existing)
      return existing;

    loading.value = true;
    error.value = null;
    try {
      const { data: row, error: err } = await supabase
        .from('quotations')
        .insert(mapQuotationToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const quotation = mapQuotationRowToDomain(row);
      cotizaciones.value.push(quotation);
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
      const update: TablesUpdate<'quotations'> = {};
      if (data.busCapacity !== undefined)
        update.bus_capacity = data.busCapacity;
      if (data.minimumSeatTarget !== undefined)
        update.minimum_seat_target = data.minimumSeatTarget;
      if (data.seatPrice !== undefined)
        update.seat_price = data.seatPrice;
      if (data.status !== undefined)
        update.status = data.status;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;

      const { data: row, error: err } = await supabase
        .from('quotations')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapQuotationRowToDomain(row);
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
      const { data: row, error: err } = await supabase
        .from('quotation_providers')
        .insert(mapQuotationProviderToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const newProveedor = mapQuotationProviderRowToDomain(row);
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
      const update: TablesUpdate<'quotation_providers'> = {};
      if (data.providerId !== undefined)
        update.provider_id = data.providerId;
      if (data.serviceDescription !== undefined)
        update.service_description = data.serviceDescription;
      if (data.remarks !== undefined)
        update.remarks = data.remarks ?? null;
      if (data.totalCost !== undefined)
        update.total_cost = data.totalCost;
      if (data.paymentMethod !== undefined)
        update.payment_method = data.paymentMethod;
      if (data.splitType !== undefined)
        update.split_type = data.splitType;
      if (data.confirmed !== undefined)
        update.confirmed = data.confirmed;

      const { data: row, error: err } = await supabase
        .from('quotation_providers')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapQuotationProviderRowToDomain(row);
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
      const { error: err } = await supabase
        .from('quotation_providers')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

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
      const { error: err } = await supabase
        .from('quotation_providers')
        .update({ confirmed: !proveedor.confirmed })
        .eq('id', id);
      if (err)
        throw err;

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
      const { data: row, error: err } = await supabase
        .from('provider_payments')
        .insert(mapProviderPaymentToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const newPago = mapProviderPaymentRowToDomain(row);
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
      const update: TablesUpdate<'provider_payments'> = {};
      if (data.amount !== undefined)
        update.amount = data.amount;
      if (data.paymentDate !== undefined)
        update.payment_date = data.paymentDate;
      if (data.paymentType !== undefined)
        update.payment_type = data.paymentType;
      if (data.concept !== undefined)
        update.concept = data.concept ?? null;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;

      const { data: row, error: err } = await supabase
        .from('provider_payments')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapProviderPaymentRowToDomain(row);
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
      const { error: err } = await supabase
        .from('provider_payments')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

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

  async function addHospedajeQuotation(data: QuotationAccommodationFormData): Promise<QuotationAccommodation | { error: string }> {
    const cotizacion = cotizaciones.value.find(c => c.id === data.quotationId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.status === 'confirmed')
      return { error: 'No se puede modificar una cotización confirmada' };

    const detallesEnriquecidos = data.details.map(d => ({
      ...d,
      id: d.id ?? crypto.randomUUID(),
      costPerPerson: d.pricePerNight / d.maxOccupancy,
    }));

    const totalCost = detallesEnriquecidos.reduce((sum, detalle) => {
      return sum + (detalle.pricePerNight * data.nightCount * detalle.quantity);
    }, 0);

    loading.value = true;
    error.value = null;
    try {
      const { data: accRow, error: accErr } = await supabase
        .from('quotation_accommodations')
        .insert({
          quotation_id: data.quotationId,
          provider_id: data.providerId,
          night_count: data.nightCount,
          total_cost: totalCost,
          payment_method: data.paymentMethod,
          confirmed: data.confirmed,
        })
        .select()
        .single();
      if (accErr)
        throw accErr;

      const detailInserts = detallesEnriquecidos.map(d => ({
        quotation_accommodation_id: accRow.id,
        hotel_room_type_id: d.roomTypeId,
        quantity: d.quantity,
        price_per_night: d.pricePerNight,
        max_occupancy: d.maxOccupancy,
      }));
      const { data: detailRows, error: detErr } = await supabase
        .from('quotation_accommodation_details')
        .insert(detailInserts)
        .select();
      if (detErr)
        throw detErr;

      const details = (detailRows ?? []).map(d => ({
        ...mapQuotationAccommodationDetailRowToDomain(d),
        costPerPerson: d.price_per_night / d.max_occupancy,
      }));
      const newHospedaje = mapQuotationAccommodationRowToDomain(accRow, details);
      hospedajesQuotation.value.push(newHospedaje);
      await _syncPrecioToTravel(data.quotationId);
      return newHospedaje;
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
  ): Promise<QuotationAccommodation | undefined> {
    const index = hospedajesQuotation.value.findIndex(h => h.id === id);
    if (index === -1)
      return undefined;

    const existing = hospedajesQuotation.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.quotationId);
    if (cotizacion?.status === 'confirmed')
      return undefined;

    const detallesBase = data.details ?? existing.details;
    const detallesEnriquecidos = detallesBase.map(d => ({
      ...d,
      id: d.id ?? crypto.randomUUID(),
      costPerPerson: d.pricePerNight / d.maxOccupancy,
    }));

    const totalCost = detallesEnriquecidos.reduce((sum, detalle) => {
      return sum + (detalle.pricePerNight * (data.nightCount ?? existing.nightCount) * detalle.quantity);
    }, 0);

    loading.value = true;
    error.value = null;
    try {
      const accUpdate: TablesUpdate<'quotation_accommodations'> = { total_cost: totalCost };
      if (data.providerId !== undefined)
        accUpdate.provider_id = data.providerId;
      if (data.nightCount !== undefined)
        accUpdate.night_count = data.nightCount;
      if (data.paymentMethod !== undefined)
        accUpdate.payment_method = data.paymentMethod;
      if (data.confirmed !== undefined)
        accUpdate.confirmed = data.confirmed;

      const { data: updatedRow, error: accErr } = await supabase
        .from('quotation_accommodations')
        .update(accUpdate)
        .eq('id', id)
        .select()
        .single();
      if (accErr)
        throw accErr;

      const { error: delErr } = await supabase
        .from('quotation_accommodation_details')
        .delete()
        .eq('quotation_accommodation_id', id);
      if (delErr)
        throw delErr;

      const detailInserts = detallesEnriquecidos.map(d => ({
        quotation_accommodation_id: id,
        hotel_room_type_id: d.roomTypeId,
        quantity: d.quantity,
        price_per_night: d.pricePerNight,
        max_occupancy: d.maxOccupancy,
      }));
      const { data: newDetailRows, error: detErr } = await supabase
        .from('quotation_accommodation_details')
        .insert(detailInserts)
        .select();
      if (detErr)
        throw detErr;

      const details = (newDetailRows ?? []).map(d => ({
        ...mapQuotationAccommodationDetailRowToDomain(d),
        costPerPerson: d.price_per_night / d.max_occupancy,
      }));
      const updated = mapQuotationAccommodationRowToDomain(updatedRow, details);
      hospedajesQuotation.value[index] = updated;
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

  async function deleteHospedajeQuotation(id: string): Promise<void> {
    const hospedaje = hospedajesQuotation.value.find(h => h.id === id);
    if (!hospedaje)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.quotationId);
    if (cotizacion?.status === 'confirmed')
      return;

    const quotationId = hospedaje.quotationId;
    loading.value = true;
    error.value = null;
    try {
      const { error: err } = await supabase
        .from('quotation_accommodations')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

      hospedajesQuotation.value = hospedajesQuotation.value.filter(h => h.id !== id);
      pagosHospedaje.value = pagosHospedaje.value.filter(p => p.quotationAccommodationId !== id);
      await _syncPrecioToTravel(quotationId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
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
      const { error: err } = await supabase
        .from('quotation_accommodations')
        .update({ confirmed: !hospedaje.confirmed })
        .eq('id', id);
      if (err)
        throw err;

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
      const { data: row, error: err } = await supabase
        .from('accommodation_payments')
        .insert(mapAccommodationPaymentToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const newPago = mapAccommodationPaymentRowToDomain(row);
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
      const update: TablesUpdate<'accommodation_payments'> = {};
      if (data.amount !== undefined)
        update.amount = data.amount;
      if (data.paymentDate !== undefined)
        update.payment_date = data.paymentDate;
      if (data.paymentType !== undefined)
        update.payment_type = data.paymentType;
      if (data.concept !== undefined)
        update.concept = data.concept ?? null;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;

      const { data: row, error: err } = await supabase
        .from('accommodation_payments')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapAccommodationPaymentRowToDomain(row);
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
      const { error: err } = await supabase
        .from('accommodation_payments')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

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
      const { data: row, error: err } = await supabase
        .from('quotation_public_prices')
        .insert(mapQuotationPublicPriceToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const newPrecio = mapQuotationPublicPriceRowToDomain(row);
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
      const update: TablesUpdate<'quotation_public_prices'> = {};
      if (data.priceType !== undefined)
        update.price_type = data.priceType;
      if (data.description !== undefined)
        update.description = data.description;
      if (data.pricePerPerson !== undefined)
        update.price_per_person = data.pricePerPerson;
      if (data.roomType !== undefined)
        update.room_type = data.roomType ?? null;
      if (data.ageGroup !== undefined)
        update.age_group = data.ageGroup ?? null;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;

      const { data: row, error: err } = await supabase
        .from('quotation_public_prices')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapQuotationPublicPriceRowToDomain(row);
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
      const { error: err } = await supabase
        .from('quotation_public_prices')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

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
      const { data: row, error: err } = await supabase
        .from('quotation_buses')
        .insert(mapQuotationBusToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const newBus = mapQuotationBusRowToDomain(row);
      busesApartados.value.push(newBus);
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
      const update: TablesUpdate<'quotation_buses'> = {};
      if (data.providerId !== undefined)
        update.provider_id = data.providerId;
      if (data.unitNumber !== undefined)
        update.unit_number = data.unitNumber;
      if (data.capacity !== undefined)
        update.capacity = data.capacity;
      if (data.status !== undefined)
        update.status = data.status;
      if (data.totalCost !== undefined)
        update.total_cost = data.totalCost;
      if (data.splitType !== undefined)
        update.split_type = data.splitType;
      if (data.paymentMethod !== undefined)
        update.payment_method = data.paymentMethod;
      if (data.remarks !== undefined)
        update.remarks = data.remarks ?? null;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;
      if (data.confirmed !== undefined)
        update.confirmed = data.confirmed;
      if (data.coordinatorIds !== undefined)
        update.coordinator_ids = data.coordinatorIds as unknown as import('~/types/database.types').Json;

      const { data: row, error: err } = await supabase
        .from('quotation_buses')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapQuotationBusRowToDomain(row);
      busesApartados.value[index] = updated;
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
      const { error: err } = await supabase
        .from('quotation_buses')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

      busesApartados.value = busesApartados.value.filter(b => b.id !== id);
      pagosBus.value = pagosBus.value.filter(p => p.quotationBusId !== id);
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
      const { data: row, error: err } = await supabase
        .from('bus_payments')
        .insert(mapBusPaymentToInsert(data))
        .select()
        .single();
      if (err)
        throw err;

      const newPago = mapBusPaymentRowToDomain(row);
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
      const update: TablesUpdate<'bus_payments'> = {};
      if (data.amount !== undefined)
        update.amount = data.amount;
      if (data.paymentDate !== undefined)
        update.payment_date = data.paymentDate;
      if (data.paymentType !== undefined)
        update.payment_type = data.paymentType;
      if (data.concept !== undefined)
        update.concept = data.concept ?? null;
      if (data.notes !== undefined)
        update.notes = data.notes ?? null;

      const { data: row, error: err } = await supabase
        .from('bus_payments')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (err)
        throw err;

      const updated = mapBusPaymentRowToDomain(row);
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
      const { error: err } = await supabase
        .from('bus_payments')
        .delete()
        .eq('id', id);
      if (err)
        throw err;

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
