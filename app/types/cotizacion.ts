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

export type CotizacionProveedor = {
  id: string;
  cotizacionId: string;
  providerId: string;
  descripcionServicio: string;
  observaciones?: string;
  costoTotal: number;
  metodoPago: PaymentType;
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
