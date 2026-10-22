export type EmptyStateContent = {
  icon: string;
  title: string;
  description: string;
};

/**
 * One empty state per section of the CRM, shown by `EmptyState`. Every screen of a section
 * says the same thing; only the action (create, go to the quotation…) changes per screen.
 * `noResults` is for any list whose filters or search hide every row.
 */
export const EMPTY_STATES = {
  travels: {
    icon: 'i-lucide-map',
    title: 'Todavía no hay viajes',
    description: 'Crea un viaje para cotizarlo, inscribir viajeros y registrar sus pagos.',
  },
  // A travel picked by id (a link, the calendar) that no longer exists
  missingTravel: {
    icon: 'i-lucide-map-pin-off',
    title: 'Este viaje ya no existe',
    description: 'Se borró o ya no tienes acceso. Elige otro viaje.',
  },
  quotation: {
    icon: 'i-lucide-calculator',
    title: 'Este viaje no tiene cotización',
    description: 'Crea la cotización para calcular los costos y los precios del viaje.',
  },
  travelers: {
    icon: 'i-lucide-users',
    title: 'Todavía no hay viajeros',
    description: 'Inscribe viajeros en el viaje para asignarles asiento, habitación y pagos.',
  },
  payments: {
    icon: 'i-lucide-receipt',
    title: 'Sin pagos registrados',
    description: 'Los pagos aparecen aquí cuando se registran.',
  },
  // /payments lists travels, not payments: it is empty while no travel can take payments yet
  payableTravels: {
    icon: 'i-lucide-map',
    title: 'No hay viajes publicados',
    description: 'Los pagos de los viajeros se registran en los viajes publicados, en curso o completados.',
  },
  providers: {
    icon: 'i-lucide-handshake',
    title: 'Todavía no hay proveedores',
    description: 'Agrega proveedores para usarlos en las cotizaciones.',
  },
  coordinators: {
    icon: 'i-lucide-user-cog',
    title: 'Todavía no hay coordinadores',
    description: 'Agrega coordinadores para asignarlos a los viajes.',
  },
  buses: {
    icon: 'i-lucide-bus',
    title: 'Todavía no hay autobuses',
    description: 'Agrega autobuses para repartir los asientos entre los viajeros.',
  },
  // A bus agency's units in the provider catalog (the travel's buses are `buses`)
  busUnits: {
    icon: 'i-lucide-bus',
    title: 'Esta agencia no tiene unidades',
    description: 'Agrega sus unidades para apartarlas en las cotizaciones.',
  },
  lodging: {
    icon: 'i-lucide-bed-double',
    title: 'Todavía no hay hospedaje',
    description: 'Agrega hoteles y tipos de habitación para repartir a los viajeros.',
  },
  // A hotel's room types in the provider catalog (the travel's lodging is `lodging`)
  roomTypes: {
    icon: 'i-lucide-bed-double',
    title: 'Este hotel no tiene tipos de habitación',
    description: 'Agrega sus tipos de habitación para cotizar el hospedaje de los viajes.',
  },
  services: {
    icon: 'i-lucide-package',
    title: 'Todavía no hay servicios',
    description: 'Agrega los servicios del viaje para cotizarlos y mostrarlos a los viajeros.',
  },
  expenses: {
    icon: 'i-lucide-wallet',
    title: 'Sin gastos adicionales',
    description: 'Agrega los gastos extra del viaje para sumarlos a su costo.',
  },
  prices: {
    icon: 'i-lucide-tag',
    title: 'Todavía no hay precios',
    description: 'Los precios de referencia salen de los proveedores y el hospedaje; con ellos se definen los precios al público.',
  },
  salePrices: {
    icon: 'i-lucide-tag',
    title: 'Todavía no hay precios de venta',
    description: 'Agrega uno, o parte de un precio de referencia con «Usar como plantilla».',
  },
  gallery: {
    icon: 'i-lucide-images',
    title: 'La galería está vacía',
    description: 'Sube fotos y videos del viaje para mostrarlos en la web.',
  },
  activities: {
    icon: 'i-lucide-calendar-days',
    title: 'El itinerario está vacío',
    description: 'Agrega actividades para armar el día a día del viaje.',
  },
  noResults: {
    icon: 'i-lucide-search-x',
    title: 'Sin resultados',
    description: 'Prueba con otros filtros o términos de búsqueda.',
  },
} satisfies Record<string, EmptyStateContent>;

export type EmptyStateSection = keyof typeof EMPTY_STATES;

/** Description for the lists of a confirmed quotation, where "Agrega…" has no button. */
export const CONFIRMED_QUOTATION_EMPTY_DESCRIPTION = 'La cotización está confirmada: ya no se agregan elementos.';
