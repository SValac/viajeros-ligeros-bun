# 5. Validaciones

## Validaciones de formulario con Zod

Los formularios usan `UForm` de Nuxt UI con schemas Zod. Los errores se muestran automáticamente bajo cada campo.

### Ejemplo: formulario de viaje

```typescript
const schema = z.object({
  destination: z.string().min(3, 'Mínimo 3 caracteres'),
  startDate: z.string().min(1, 'Fecha requerida'),
  endDate: z.string().min(1, 'Fecha requerida'),
  price: z.number().min(0, 'Debe ser positivo'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  internalNotes: z.string().optional(),
});
```

### Ejemplo: actividad del itinerario con coordenadas

```typescript
const activitySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  time: z.string().optional(),
  location: z.string().optional(),
  mapLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    placeId: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
});
```

---

## Validaciones de negocio en stores

### Travel Store — validación de itinerario

```typescript
function mapItineraryForInsert(activities, travelId) {
  return activities.map(a => {
    if (!a.day || !a.title || !a.description) {
      throw new Error('Actividad inválida: faltan campos requeridos');
    }
    if (a.mapLocation && (typeof a.mapLocation.lat !== 'number' || typeof a.mapLocation.lng !== 'number')) {
      throw new Error('Coordenadas inválidas');
    }
    return { travel_id: travelId, day: a.day, title: a.title, ... };
  });
}
```

### Payment Store — validaciones de pago

```typescript
// Requiere config de cuenta antes de registrar pago
async addPayment(data) {
  const config = this.getAccountConfig(data.travelerId, data.travelId);
  if (!config) throw new Error('El viajero no tiene configuración de cuenta');

  // No permite pagos que excedan el balance pendiente
  const summary = this.getTravelerPaymentSummary(data.travelerId, data.travelId);
  if (data.amount > summary.balance) {
    throw new Error('El pago excede el balance pendiente');
  }
}
```

### Hotel Room Store — validación de capacidad

```typescript
async updateTotalRooms(providerId, newTotal) {
  const used = this.getUsedRoomsByProvider(providerId);
  if (newTotal < used) {
    throw new Error(`No se puede reducir: ${used} habitaciones en uso`);
  }
}
```

---

## Cálculo de precios (Payment Store)

`getTravelerPaymentSummary` aplica la lógica de precios en este orden:

1. **Precio base**: precio público del viaje (`travel.price`)
2. **Override de tipo**: si `travelerType === 'child'`, usa `childPrice` si está configurado
3. **Override de precio público**: si hay `publicPriceId`, usa `publicPriceAmount`
4. **Descuentos**: aplica lista de descuentos (fijo o porcentaje)
5. **Recargos**: aplica lista de recargos (fijo o porcentaje)
6. **Status final**: `paid` si balance ≤ 0, `partial` si hay pagos pero balance > 0, `pending` si no hay pagos

---

[← Flujo de Datos](./04-data-flow.md) | [Volver al índice](./README.md) | [Siguiente: UX/UI →](./06-ux-ui.md)
