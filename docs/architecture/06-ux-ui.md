# 6. UX/UI

## Componentes Nuxt UI utilizados

| Componente | Uso |
|-----------|-----|
| `UTable` | Tabla principal con sticky header, sorting por columnas y responsive design |
| `UModal` | Formularios de crear/editar (`max-w-2xl`, scrollable) |
| `UForm` | Formulario con `validate-on="blur"`, errores automáticos bajo cada campo |
| `UInput` | Campos de texto y fechas |
| `UTextarea` | Descripción, notas internas |
| `USelect` | Estado del viaje |
| `UButton` | Acciones primarias y secundarias |
| `UBadge` | Estado del viaje con colores semánticos |
| `UDropdownMenu` | Menú de acciones por fila |
| `UToast` | Notificaciones de éxito/error |

---

## Colores de estado (UBadge)

| Estado | Color |
|--------|-------|
| `pendiente` | `warning` (amarillo) |
| `confirmado` | `info` (azul) |
| `en-curso` | `primary` |
| `completado` | `success` (verde) |
| `cancelado` | `error` (rojo) |

---

## Feedback visual

### Toasts de notificación

```typescript
const toast = useToast();

function handleCreateSuccess() {
  toast.add({
    title: 'Viaje creado',
    description: 'El viaje se ha creado exitosamente',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
}

function handleError(error: Error) {
  toast.add({
    title: 'Error',
    description: error.message,
    color: 'error',
    icon: 'i-lucide-alert-circle',
  });
}
```

### Estado de carga en botones

```vue
<UButton
  :loading="isSubmitting"
  :disabled="isSubmitting"
  label="Guardar"
  type="submit"
/>
```

### Confirmación de eliminación

```typescript
const confirmModal = useModal();

async function deleteTravel(travel: Travel) {
  const confirmed = await confirmModal.open({
    title: '¿Eliminar viaje?',
    description: `Se eliminará el viaje a ${travel.destino}. Esta acción no se puede deshacer.`,
    confirmButton: { label: 'Eliminar', color: 'error' },
    cancelButton: { label: 'Cancelar' },
  });

  if (confirmed) {
    travelsStore.deleteTravel(travel.id);
  }
}
```

---

[← Validaciones](./05-validations.md) | [Volver al índice](./README.md) | [Siguiente: Fases de Implementación →](./07-implementation-phases.md)
