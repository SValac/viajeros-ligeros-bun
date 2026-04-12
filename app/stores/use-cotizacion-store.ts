import type {
  Cotizacion,
  CotizacionFormData,
  CotizacionHospedaje,
  CotizacionHospedajeFormData,
  CotizacionProveedor,
  CotizacionProveedorFilters,
  CotizacionProveedorFormData,
  EstadoPagoHospedaje,
  EstadoPagoProveedor,
  PagoHospedaje,
  PagoHospedajeFormData,
  PagoProveedor,
  PagoProveedorFormData,
} from '~/types/cotizacion';

import { useTravelsStore } from '~/stores/use-travel-store';

export const useCotizacionStore = defineStore('useCotizacionStore', () => {
  // State
  const cotizaciones = ref<Cotizacion[]>([]);
  const proveedoresCotizacion = ref<CotizacionProveedor[]>([]);
  const pagosProveedor = ref<PagoProveedor[]>([]);
  const hospedajesCotizacion = ref<CotizacionHospedaje[]>([]);
  const pagosHospedaje = ref<PagoHospedaje[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<CotizacionProveedorFilters>({});

  // Getters
  const getCotizacionByTravel = computed(() => {
    return (travelId: string): Cotizacion | undefined => {
      return cotizaciones.value.find(c => c.travelId === travelId);
    };
  });

  const getProveedoresByCotizacion = computed(() => {
    return (cotizacionId: string): CotizacionProveedor[] => {
      return proveedoresCotizacion.value.filter(p => p.cotizacionId === cotizacionId);
    };
  });

  const getPagosByProveedor = computed(() => {
    return (cotizacionProveedorId: string): PagoProveedor[] => {
      return [...pagosProveedor.value.filter(p => p.cotizacionProveedorId === cotizacionProveedorId)]
        .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
    };
  });

  const getCostoTotal = computed(() => {
    return (cotizacionId: string): number => {
      return proveedoresCotizacion.value
        .filter(p => p.cotizacionId === cotizacionId)
        .reduce((sum, p) => sum + p.costoTotal, 0);
    };
  });

  const getCostoTipoMinimo = computed(() => {
    return (cotizacionId: string): number => {
      return proveedoresCotizacion.value
        .filter(p => p.cotizacionId === cotizacionId && (p.tipoDivision ?? 'minimo') === 'minimo')
        .reduce((sum, p) => sum + p.costoTotal, 0);
    };
  });

  const getCostoTipoTotal = computed(() => {
    return (cotizacionId: string): number => {
      return proveedoresCotizacion.value
        .filter(p => p.cotizacionId === cotizacionId && (p.tipoDivision ?? 'minimo') === 'total')
        .reduce((sum, p) => sum + p.costoTotal, 0);
    };
  });

  const getHospedajesByCotizacion = computed(() => {
    return (cotizacionId: string): CotizacionHospedaje[] => {
      return hospedajesCotizacion.value.filter(h => h.cotizacionId === cotizacionId);
    };
  });

  const getTotalCostoHospedajes = computed(() => {
    return (cotizacionId: string): number => {
      return hospedajesCotizacion.value
        .filter(h => h.cotizacionId === cotizacionId)
        .reduce((sum, h) => sum + h.costoTotal, 0);
    };
  });

  const getTotalHabitacionesPorTipo = computed(() => {
    return (cotizacionId: string): { [tipoId: string]: number } => {
      const resultado: { [tipoId: string]: number } = {};
      const hospedajes = getHospedajesByCotizacion.value(cotizacionId);

      for (const hospedaje of hospedajes) {
        for (const detalle of hospedaje.detalles) {
          resultado[detalle.habitacionTipoId] = (resultado[detalle.habitacionTipoId] ?? 0) + detalle.cantidad;
        }
      }

      return resultado;
    };
  });

  const getAsientoMinimoCalculado = computed(() => {
    return (cotizacionId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === cotizacionId);
      if (!cotizacion || cotizacion.precioAsiento === 0)
        return 0;
      const costoTotal = getCostoTotal.value(cotizacionId);
      return Math.ceil(costoTotal / cotizacion.precioAsiento);
    };
  });

  // Precio calculado a partir del asiento mínimo objetivo: fuente de verdad para travel.precio
  // Incluye costos de proveedores y hospedajes
  const getPrecioAsientoCalculado = computed(() => {
    return (cotizacionId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === cotizacionId);
      if (!cotizacion)
        return 0;

      const costoMinimo = getCostoTipoMinimo.value(cotizacionId);
      const costoCapacidad = getCostoTipoTotal.value(cotizacionId);
      const costoHospedajes = getTotalCostoHospedajes.value(cotizacionId);

      const parteMinimo = cotizacion.asientoMinimoObjetivo > 0
        ? costoMinimo / cotizacion.asientoMinimoObjetivo
        : 0;
      const parteCapacidad = cotizacion.capacidadAutobus > 0
        ? costoCapacidad / cotizacion.capacidadAutobus
        : 0;
      const parteHospedaje = cotizacion.capacidadAutobus > 0
        ? costoHospedajes / cotizacion.capacidadAutobus
        : 0;

      if (parteMinimo === 0 && parteCapacidad === 0 && parteHospedaje === 0)
        return 0;
      return Math.ceil(parteMinimo + parteCapacidad + parteHospedaje);
    };
  });

  const getGananciaProyectada = computed(() => {
    return (cotizacionId: string): number => {
      const cotizacion = cotizaciones.value.find(c => c.id === cotizacionId);
      if (!cotizacion)
        return 0;
      return (cotizacion.capacidadAutobus - cotizacion.asientoMinimoObjetivo) * cotizacion.precioAsiento;
    };
  });

  const getAnticipadoProveedor = computed(() => {
    return (cotizacionProveedorId: string): number => {
      return pagosProveedor.value
        .filter(p => p.cotizacionProveedorId === cotizacionProveedorId)
        .reduce((sum, p) => sum + p.monto, 0);
    };
  });

  const getCostoPerPersonaProveedor = computed(() => {
    return (cotizacionProveedorId: string): number => {
      const proveedor = proveedoresCotizacion.value.find(p => p.id === cotizacionProveedorId);
      if (!proveedor)
        return 0;

      const cotizacion = cotizaciones.value.find(c => c.id === proveedor.cotizacionId);
      if (!cotizacion)
        return 0;

      const tipoDivision = proveedor.tipoDivision ?? 'minimo';
      const divisor = tipoDivision === 'total'
        ? cotizacion.capacidadAutobus
        : cotizacion.asientoMinimoObjetivo;

      if (divisor === 0)
        return 0;
      return proveedor.costoTotal / divisor;
    };
  });

  const getSaldoPendienteProveedor = computed(() => {
    return (cotizacionProveedorId: string): number => {
      const proveedor = proveedoresCotizacion.value.find(p => p.id === cotizacionProveedorId);
      if (!proveedor)
        return 0;
      const anticipado = getAnticipadoProveedor.value(cotizacionProveedorId);
      return proveedor.costoTotal - anticipado;
    };
  });

  const getEstadoPagoProveedor = computed(() => {
    return (cotizacionProveedorId: string): EstadoPagoProveedor => {
      const proveedor = proveedoresCotizacion.value.find(p => p.id === cotizacionProveedorId);
      if (!proveedor)
        return 'pendiente';
      const anticipado = getAnticipadoProveedor.value(cotizacionProveedorId);
      if (anticipado <= 0)
        return 'pendiente';
      if (anticipado >= proveedor.costoTotal)
        return 'liquidado';
      return 'anticipo';
    };
  });

  const getSaldoTotalPendiente = computed(() => {
    return (cotizacionId: string): number => {
      return proveedoresCotizacion.value
        .filter(p => p.cotizacionId === cotizacionId)
        .reduce((sum, p) => sum + getSaldoPendienteProveedor.value(p.id), 0);
    };
  });

  const getPagosByHospedaje = computed(() => {
    return (cotizacionHospedajeId: string): PagoHospedaje[] => {
      return [...pagosHospedaje.value.filter(p => p.cotizacionHospedajeId === cotizacionHospedajeId)]
        .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
    };
  });

  const getAnticipadoHospedaje = computed(() => {
    return (cotizacionHospedajeId: string): number => {
      return pagosHospedaje.value
        .filter(p => p.cotizacionHospedajeId === cotizacionHospedajeId)
        .reduce((sum, p) => sum + p.monto, 0);
    };
  });

  const getSaldoPendienteHospedaje = computed(() => {
    return (cotizacionHospedajeId: string): number => {
      const hospedaje = hospedajesCotizacion.value.find(h => h.id === cotizacionHospedajeId);
      if (!hospedaje)
        return 0;
      return hospedaje.costoTotal - getAnticipadoHospedaje.value(cotizacionHospedajeId);
    };
  });

  const getEstadoPagoHospedaje = computed(() => {
    return (cotizacionHospedajeId: string): EstadoPagoHospedaje => {
      const hospedaje = hospedajesCotizacion.value.find(h => h.id === cotizacionHospedajeId);
      if (!hospedaje)
        return 'pendiente';
      const anticipado = getAnticipadoHospedaje.value(cotizacionHospedajeId);
      if (anticipado <= 0)
        return 'pendiente';
      if (anticipado >= hospedaje.costoTotal)
        return 'liquidado';
      return 'anticipo';
    };
  });

  const getSaldoTotalPendienteHospedajes = computed(() => {
    return (cotizacionId: string): number => {
      return hospedajesCotizacion.value
        .filter(h => h.cotizacionId === cotizacionId)
        .reduce((sum, h) => sum + getSaldoPendienteHospedaje.value(h.id), 0);
    };
  });

  const puedeConfirmar = computed(() => {
    return (cotizacionId: string): boolean => {
      const proveedores = proveedoresCotizacion.value.filter(p => p.cotizacionId === cotizacionId);
      if (proveedores.length === 0)
        return false;
      return proveedores.every(p => p.confirmado === true);
    };
  });

  const hasCotizacion = computed(() => {
    return (travelId: string): boolean => {
      return cotizaciones.value.some(c => c.travelId === travelId);
    };
  });

  const filteredProveedores = computed(() => {
    return (cotizacionId: string): CotizacionProveedor[] => {
      let result = proveedoresCotizacion.value.filter(p => p.cotizacionId === cotizacionId);

      const f = filters.value;

      if (f.estadoPago && f.estadoPago !== 'todos') {
        result = result.filter(p => getEstadoPagoProveedor.value(p.id) === f.estadoPago);
      }

      if (f.confirmado !== undefined && f.confirmado !== 'todos') {
        result = result.filter(p => p.confirmado === f.confirmado);
      }

      if (f.metodoPago && f.metodoPago !== 'todos') {
        result = result.filter(p => p.metodoPago === f.metodoPago);
      }

      return result;
    };
  });

  // Helper interno — recalcula precioAsiento y lo sincroniza a travel.precio
  function _syncPrecioToTravel(cotizacionId: string): void {
    const cotizacion = cotizaciones.value.find(c => c.id === cotizacionId);
    if (!cotizacion || cotizacion.estado === 'confirmada')
      return;
    if (cotizacion.asientoMinimoObjetivo === 0)
      return;

    const nuevoPrecio = getPrecioAsientoCalculado.value(cotizacionId);
    if (nuevoPrecio === 0)
      return;

    // Actualizar precioAsiento en la cotización directamente (evita recursión)
    const index = cotizaciones.value.findIndex(c => c.id === cotizacionId);
    if (index !== -1 && cotizaciones.value[index]) {
      cotizaciones.value[index] = {
        ...cotizaciones.value[index]!,
        precioAsiento: nuevoPrecio,
        updatedAt: new Date().toISOString(),
      };
    }

    // Propagar a travel.precio (cotización → viaje)
    const travelStore = useTravelsStore();
    travelStore.updateTravel(cotizacion.travelId, { precio: nuevoPrecio });
  }

  // Actions
  function createCotizacion(data: CotizacionFormData): Cotizacion {
    const existing = cotizaciones.value.find(c => c.travelId === data.travelId);
    if (existing)
      return existing;

    const now = new Date().toISOString();
    const newCotizacion: Cotizacion = {
      ...data,
      id: `cotizacion-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    cotizaciones.value.push(newCotizacion);
    error.value = null;
    return newCotizacion;
  }

  function updateCotizacion(id: string, data: Partial<CotizacionFormData>): Cotizacion | undefined {
    const index = cotizaciones.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Cotización no encontrada';
      return undefined;
    }

    const existing = cotizaciones.value[index];
    if (!existing)
      return undefined;

    const updated: Cotizacion = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    cotizaciones.value[index] = updated;
    error.value = null;

    // Si cambió el asiento mínimo, recalcular precio y sincronizar al viaje
    if ('asientoMinimoObjetivo' in data) {
      _syncPrecioToTravel(id);
    }

    return updated;
  }

  function confirmarCotizacion(
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
    const proveedores = proveedoresCotizacion.value.filter(p => p.cotizacionId === id);
    const servicios = proveedores.map(p => ({
      id: `serv-cotizacion-${p.id}`,
      nombre: p.descripcionServicio,
      descripcion: p.observaciones,
      incluido: true,
      providerId: p.providerId,
    }));

    const updated = travelStore.updateTravel(cotizacion.travelId, { servicios });
    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el viaje' };
    }

    updateCotizacion(id, { estado: 'confirmada' });
    return { success: true };
  }

  function addProveedorCotizacion(data: CotizacionProveedorFormData): CotizacionProveedor | { error: string } {
    const cotizacion = cotizaciones.value.find(c => c.id === data.cotizacionId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.estado === 'confirmada')
      return { error: 'No se puede modificar una cotización confirmada' };

    const newProveedor: CotizacionProveedor = {
      ...data,
      id: `cot-prov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    proveedoresCotizacion.value.push(newProveedor);
    _syncPrecioToTravel(data.cotizacionId);
    return newProveedor;
  }

  function updateProveedorCotizacion(
    id: string,
    data: Partial<CotizacionProveedorFormData>,
  ): CotizacionProveedor | undefined {
    const index = proveedoresCotizacion.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = proveedoresCotizacion.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return undefined;

    const updated: CotizacionProveedor = {
      ...existing,
      ...data,
      id: existing.id,
      cotizacionId: existing.cotizacionId,
    };

    proveedoresCotizacion.value[index] = updated;
    _syncPrecioToTravel(existing.cotizacionId);
    return updated;
  }

  function deleteProveedorCotizacion(id: string): void {
    const proveedor = proveedoresCotizacion.value.find(p => p.id === id);
    if (!proveedor)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return;

    const cotizacionId = proveedor.cotizacionId;
    proveedoresCotizacion.value = proveedoresCotizacion.value.filter(p => p.id !== id);
    pagosProveedor.value = pagosProveedor.value.filter(p => p.cotizacionProveedorId !== id);
    _syncPrecioToTravel(cotizacionId);
  }

  function toggleConfirmadoProveedor(id: string): void {
    const index = proveedoresCotizacion.value.findIndex(p => p.id === id);
    if (index === -1)
      return;

    const proveedor = proveedoresCotizacion.value[index];
    if (!proveedor)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return;

    proveedoresCotizacion.value[index] = { ...proveedor, confirmado: !proveedor.confirmado };
  }

  function addPagoProveedor(data: PagoProveedorFormData): PagoProveedor | { error: string } {
    const proveedor = proveedoresCotizacion.value.find(p => p.id === data.cotizacionProveedorId);
    if (!proveedor)
      return { error: 'Proveedor no encontrado' };

    const cotizacion = cotizaciones.value.find(c => c.id === proveedor.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return { error: 'No se puede modificar una cotización confirmada' };

    if (data.monto <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteProveedor.value(data.cotizacionProveedorId);
    if (data.monto > saldoPendiente) {
      return { error: `El monto no puede superar el saldo pendiente ($${saldoPendiente.toFixed(2)})` };
    }

    const now = new Date().toISOString();
    const newPago: PagoProveedor = {
      ...data,
      id: `pago-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
    };

    pagosProveedor.value.push(newPago);
    return newPago;
  }

  function updatePagoProveedor(id: string, data: Partial<PagoProveedorFormData>): PagoProveedor | undefined {
    const index = pagosProveedor.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosProveedor.value[index];
    if (!existing)
      return undefined;

    const updated: PagoProveedor = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    pagosProveedor.value[index] = updated;
    return updated;
  }

  function deletePagoProveedor(id: string): void {
    const pago = pagosProveedor.value.find(p => p.id === id);
    if (!pago)
      return;

    const proveedor = proveedoresCotizacion.value.find(p => p.id === pago.cotizacionProveedorId);
    const cotizacion = cotizaciones.value.find(c => c.id === proveedor?.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return;

    pagosProveedor.value = pagosProveedor.value.filter(p => p.id !== id);
  }

  function setFilters(f: CotizacionProveedorFilters): void {
    filters.value = { ...f };
  }

  function clearFilters(): void {
    filters.value = {};
  }

  // ============================================================================
  // Hospedaje Actions
  // ============================================================================

  function addHospedajeCotizacion(data: CotizacionHospedajeFormData): CotizacionHospedaje | { error: string } {
    const cotizacion = cotizaciones.value.find(c => c.id === data.cotizacionId);
    if (!cotizacion)
      return { error: 'Cotización no encontrada' };
    if (cotizacion.estado === 'confirmada')
      return { error: 'No se puede modificar una cotización confirmada' };

    // Calcular costoTotal
    const costoTotal = data.detalles.reduce((sum, detalle) => {
      return sum + (detalle.precioPorNoche * data.cantidadNoches * detalle.cantidad);
    }, 0);

    const newHospedaje: CotizacionHospedaje = {
      metodoPago: 'cash',
      confirmado: false,
      ...data,
      id: `cot-hosp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      costoTotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    hospedajesCotizacion.value.push(newHospedaje);
    _syncPrecioToTravel(data.cotizacionId);
    return newHospedaje;
  }

  function updateHospedajeCotizacion(
    id: string,
    data: Partial<CotizacionHospedajeFormData>,
  ): CotizacionHospedaje | undefined {
    const index = hospedajesCotizacion.value.findIndex(h => h.id === id);
    if (index === -1)
      return undefined;

    const existing = hospedajesCotizacion.value[index];
    if (!existing)
      return undefined;

    const cotizacion = cotizaciones.value.find(c => c.id === existing.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return undefined;

    // Calcular costoTotal basado en detalles
    const costoTotal = (data.detalles ?? existing.detalles).reduce((sum, detalle) => {
      return sum + (detalle.precioPorNoche * (data.cantidadNoches ?? existing.cantidadNoches) * detalle.cantidad);
    }, 0);

    const updated: CotizacionHospedaje = {
      ...existing,
      ...data,
      id: existing.id,
      cotizacionId: existing.cotizacionId,
      createdAt: existing.createdAt,
      costoTotal,
      updatedAt: new Date().toISOString(),
    };

    hospedajesCotizacion.value[index] = updated;
    _syncPrecioToTravel(existing.cotizacionId);
    return updated;
  }

  function deleteHospedajeCotizacion(id: string): void {
    const hospedaje = hospedajesCotizacion.value.find(h => h.id === id);
    if (!hospedaje)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return;

    const cotizacionId = hospedaje.cotizacionId;
    hospedajesCotizacion.value = hospedajesCotizacion.value.filter(h => h.id !== id);
    pagosHospedaje.value = pagosHospedaje.value.filter(p => p.cotizacionHospedajeId !== id);
    _syncPrecioToTravel(cotizacionId);
  }

  function toggleConfirmadoHospedaje(id: string): void {
    const index = hospedajesCotizacion.value.findIndex(h => h.id === id);
    if (index === -1)
      return;

    const hospedaje = hospedajesCotizacion.value[index];
    if (!hospedaje)
      return;

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return;

    hospedajesCotizacion.value[index] = { ...hospedaje, confirmado: !hospedaje.confirmado };
  }

  function addPagoHospedaje(data: PagoHospedajeFormData): PagoHospedaje | { error: string } {
    const hospedaje = hospedajesCotizacion.value.find(h => h.id === data.cotizacionHospedajeId);
    if (!hospedaje)
      return { error: 'Hospedaje no encontrado' };

    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return { error: 'No se puede modificar una cotización confirmada' };

    if (data.monto <= 0)
      return { error: 'El monto debe ser mayor a 0' };

    const saldoPendiente = getSaldoPendienteHospedaje.value(data.cotizacionHospedajeId);
    if (data.monto > saldoPendiente)
      return { error: `El monto no puede superar el saldo pendiente ($${saldoPendiente.toFixed(2)})` };

    const newPago: PagoHospedaje = {
      ...data,
      id: `pago-hosp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    pagosHospedaje.value.push(newPago);
    return newPago;
  }

  function updatePagoHospedaje(id: string, data: Partial<PagoHospedajeFormData>): PagoHospedaje | undefined {
    const index = pagosHospedaje.value.findIndex(p => p.id === id);
    if (index === -1)
      return undefined;

    const existing = pagosHospedaje.value[index];
    if (!existing)
      return undefined;

    const updated: PagoHospedaje = {
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

    const hospedaje = hospedajesCotizacion.value.find(h => h.id === pago.cotizacionHospedajeId);
    const cotizacion = cotizaciones.value.find(c => c.id === hospedaje?.cotizacionId);
    if (cotizacion?.estado === 'confirmada')
      return;

    pagosHospedaje.value = pagosHospedaje.value.filter(p => p.id !== id);
  }

  return {
    // State
    cotizaciones,
    proveedoresCotizacion,
    pagosProveedor,
    hospedajesCotizacion,
    pagosHospedaje,
    loading,
    error,
    filters,
    // Getters
    getCotizacionByTravel,
    getProveedoresByCotizacion,
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
    getEstadoPagoProveedor,
    getSaldoTotalPendiente,
    getPagosByHospedaje,
    getAnticipadoHospedaje,
    getSaldoPendienteHospedaje,
    getEstadoPagoHospedaje,
    getSaldoTotalPendienteHospedajes,
    puedeConfirmar,
    hasCotizacion,
    filteredProveedores,
    getHospedajesByCotizacion,
    getTotalCostoHospedajes,
    getTotalHabitacionesPorTipo,
    // Actions
    createCotizacion,
    updateCotizacion,
    confirmarCotizacion,
    addProveedorCotizacion,
    updateProveedorCotizacion,
    deleteProveedorCotizacion,
    toggleConfirmadoProveedor,
    addPagoProveedor,
    updatePagoProveedor,
    deletePagoProveedor,
    setFilters,
    clearFilters,
    addHospedajeCotizacion,
    updateHospedajeCotizacion,
    deleteHospedajeCotizacion,
    toggleConfirmadoHospedaje,
    addPagoHospedaje,
    updatePagoHospedaje,
    deletePagoHospedaje,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-cotizacion',
    storage: import.meta.client ? localStorage : undefined,
  },
});
