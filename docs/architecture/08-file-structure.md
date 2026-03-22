# 8. Estructura de Archivos

```
app/
├── types/
│   └── travel.ts                    # Tipos TypeScript
├── stores/
│   └── travels.ts                   # Pinia store con persistencia
├── composables/
│   ├── use-travel-filters.ts        # (Opcional) Lógica de filtros
│   └── use-travel-validation.ts     # (Opcional) Validaciones custom
├── components/
│   ├── travel-form.vue              # Formulario crear/editar
│   ├── travel-stat-card.vue         # (Opcional) Card de estadísticas
│   ├── travel-activity-list.vue     # (Fase 3) Lista de actividades
│   └── travel-service-list.vue      # (Fase 3) Lista de servicios
├── pages/
│   └── travels/
│       ├── dashboard.vue            # Vista principal con tabla
│       └── [id].vue                 # (Fase 3) Vista de detalles
└── utils/
    └── travel-helpers.ts            # (Opcional) Funciones auxiliares
```

---

[← Fases de Implementación](./07-implementation-phases.md) | [Volver al índice](./README.md) | [Siguiente: Dependencias →](./09-dependencies.md)
