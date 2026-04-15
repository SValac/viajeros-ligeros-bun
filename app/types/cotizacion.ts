import type { PaymentType } from '~/types/payment';

export type CotizacionStatus = 'borrador' | 'confirmada';
export type EstadoPagoProveedor = 'pendiente' | 'anticipo' | 'liquidado';

export type Cotizacion = {
  id: string;
  travelId: string;
  capacidadAutobus: number;
  asientoMinimoObjetivo: number;
  precioAsiento: number;
  estado: CotizacionStatus;
  notas?: string;
  createdAt: string;
  updatedAt: string;
};

export type TipoDivisionCosto = 'minimo' | 'total';

export type CotizacionProveedor = {
  id: string;
  cotizacionId: string;
  providerId: string;
  descripcionServicio: string;
  observaciones?: string;
  costoTotal: number;
  metodoPago: PaymentType;
  tipoDivision: TipoDivisionCosto;
  confirmado: boolean;
};

export type PagoProveedor = {
  id: string;
  cotizacionProveedorId: string;
  monto: number;
  fechaPago: string;
  tipoPago: PaymentType;
  concepto?: string;
  notas?: string;
  createdAt: string;
};

export type CotizacionFormData = Omit<Cotizacion, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type CotizacionProveedorFormData = Omit<CotizacionProveedor, 'id'> & { id?: string };
export type PagoProveedorFormData = Omit<PagoProveedor, 'id' | 'createdAt'> & { id?: string };

export type CotizacionProveedorFilters = {
  estadoPago?: EstadoPagoProveedor | 'todos';
  confirmado?: boolean | 'todos';
  metodoPago?: PaymentType | 'todos';
};

// ============================================================================
// Hospedaje (Hotel) Types
// ============================================================================

export type CotizacionHospedajeDetalleHabitacion = {
  id: string;
  habitacionTipoId: string;
  cantidad: number;
  precioPorNoche: number;
  ocupacionMaxima: number;
  costoPorPersona?: number; // precioPorNoche / ocupacionMaxima (calculado)
  costoTotal?: number; // precioPorNoche * cantidad * noches (calculado en context)
};

export type EstadoPagoHospedaje = 'pendiente' | 'anticipo' | 'liquidado';

export type CotizacionHospedaje = {
  id: string;
  cotizacionId: string;
  providerId: string; // ID del proveedor (hotel)
  cantidadNoches: number;
  detalles: CotizacionHospedajeDetalleHabitacion[];
  costoTotal: number; // Suma de todos los costos de habitaciones
  metodoPago: PaymentType;
  confirmado: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PagoHospedaje = {
  id: string;
  cotizacionHospedajeId: string;
  monto: number;
  fechaPago: string;
  tipoPago: PaymentType;
  concepto?: string;
  notas?: string;
  createdAt: string;
};

export type PagoHospedajeFormData = Omit<PagoHospedaje, 'id' | 'createdAt'> & { id?: string };

export type CotizacionHospedajeFormData = Omit<CotizacionHospedaje, 'id' | 'costoTotal' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type CotizacionHospedajeDetalleFormData = Omit<CotizacionHospedajeDetalleHabitacion, 'id' | 'costoPorPersona' | 'costoTotal'> & {
  id?: string;
};

// ============================================================================
// Autobuses Apartados Types
// ============================================================================

export type CotizacionBusEstado = 'apartado' | 'confirmado' | 'pendiente';

export type CotizacionBus = {
  id: string;
  cotizacionId: string;
  proveedorId: string; // FK a Provider (agencia-autobus)
  numeroUnidad: string;
  capacidad: number;
  estado: CotizacionBusEstado;
  notas?: string;
  createdAt: string;
  updatedAt: string;
};

export type CotizacionBusFormData = Omit<CotizacionBus, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// ============================================================================
// Precio al Público Types
// ============================================================================

export type CotizacionPrecioPublico = {
  id: string;
  cotizacionId: string;
  tipo: string; // Ej: "Habitación Sencilla", "Niños 4-10 años"
  descripcion: string; // Ej: "En habitación para 1 persona"
  precioPorPersona: number; // Precio de venta
  tipoHabitacion?: string; // Ej: "Sencilla", "Doble", "Triple" (opcional, para referencia)
  grupoEdad?: string; // Ej: "Adultos", "Niños 4-10 años" (opcional)
  notas?: string; // Notas adicionales
  createdAt: string;
  updatedAt: string;
};

export type CotizacionPrecioPublicoFormData = Omit<CotizacionPrecioPublico, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};
