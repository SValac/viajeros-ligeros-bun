# 5. Validaciones

## Schema Zod del formulario

```typescript
const schema = z.object({
  // Campos requeridos
  destino: z.string()
    .min(3, 'El destino debe tener al menos 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  cliente: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  fechaInicio: z.string()
    .min(1, 'Fecha de inicio requerida'),

  fechaFin: z.string()
    .min(1, 'Fecha de fin requerida'),

  precio: z.number()
    .min(0, 'El precio debe ser mayor o igual a 0')
    .max(999999, 'Precio máximo: 999,999'),

  descripcion: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'Máximo 1000 caracteres'),

  estado: z.enum(['pendiente', 'confirmado', 'en-curso', 'completado', 'cancelado']),

  // Campos opcionales
  imagenUrl: z.string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),

  notasInternas: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
})
  // Validación de fechas (fin debe ser después de inicio)
  .refine((data) => {
    if (data.fechaInicio && data.fechaFin) {
      return new Date(data.fechaFin) >= new Date(data.fechaInicio);
    }
    return true;
  }, {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['fechaFin'],
  });
```

---

## Validaciones de negocio en el Store

```typescript
// En actions del store
addTravel(data: TravelFormData) {
  // Validación adicional de negocio
  if (data.itinerario.length > 0) {
    // Validar que días del itinerario estén en rango de fechas
    const dias = data.itinerario.map(a => a.dia);
    const duracion = calcularDias(data.fechaInicio, data.fechaFin);
    if (Math.max(...dias) > duracion) {
      throw new Error('Itinerario tiene días fuera del rango del viaje');
    }
  }

  // Crear viaje...
}
```

---

[← Flujo de Datos](./04-data-flow.md) | [Volver al índice](./README.md) | [Siguiente: UX/UI →](./06-ux-ui.md)
