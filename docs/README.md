# Documentación del Proyecto

Esta carpeta contiene toda la documentación arquitectónica y de features del proyecto Viajeros Ligeros.

## Estructura

```
docs/
├── README.md                    # Este archivo
├── ARCHITECTURE_PLAN.md         # Plan arquitectónico general del sistema
├── CLAUDE.md                    # Convenciones y guías para Claude Code
└── features/                    # Documentación de features
    ├── [FEATURE-ACTUAL].md      # Feature en desarrollo (NO en subcarpetas)
    ├── completed/               # Features implementadas y completadas
    │   ├── travel-feature.md
    │   └── feature-itinerary-services.md
    └── pending/                 # Features planificadas pero no iniciadas
```

## Convención de Organización

### Feature Actual (En Desarrollo)
El archivo de la feature **que estamos trabajando actualmente** se encuentra en la raíz de `docs/features/` (NO dentro de subcarpetas).

**Ejemplo**: Si estamos trabajando en el catálogo de proveedores, el archivo estará en:
```
docs/features/provider-catalog-feature.md
```

### Features Completadas
Cuando una feature es **completada y mergeada**, su documentación se mueve a:
```
docs/features/completed/[nombre-feature].md
```

### Features Pendientes
Features **planificadas pero no iniciadas** se guardan en:
```
docs/features/pending/[nombre-feature].md
```

## Estado Actual

### 🚧 En Desarrollo
- **provider-catalog-feature.md** - Sistema de gestión de catálogo de proveedores

### ✅ Completadas
- **travel-feature.md** - Feature 1: Sistema de gestión de viajes (CRUD básico)
- **feature-itinerary-services.md** - Features 2-3: Itinerarios, servicios y página de detalles

### ⏭️ Pendientes
- Exportación de datos (PDF/CSV)
- Mejoras del dashboard (búsqueda, filtros, paginación)
- Analytics y reportes

## Archivos Principales

### ARCHITECTURE_PLAN.md
Plan arquitectónico completo del sistema con:
- Estructura de tipos TypeScript
- Arquitectura de Pinia stores
- Componentes necesarios
- Flujos de datos
- Fases de implementación

### CLAUDE.md
Guía de convenciones del proyecto para Claude Code:
- Comandos de desarrollo
- Arquitectura del proyecto
- Estilo de código (ESLint)
- Git workflow
- Módulos configurados

## Nomenclatura de Archivos

Todos los archivos de documentación siguen **kebab-case**:
- ✅ `provider-catalog-feature.md`
- ✅ `travel-feature.md`
- ❌ `ProviderCatalogFeature.md`
- ❌ `PROVIDER_CATALOG_FEATURE.md`

## Plantilla para Nuevas Features

Al crear documentación para una nueva feature, incluir:

1. **Estado y Objetivo** - ¿Qué problema resuelve?
2. **User Story** - Desde la perspectiva del usuario
3. **Arquitectura de Datos** - Tipos TypeScript
4. **Store Architecture** - Estado y lógica
5. **Componentes** - Nuevos y a modificar
6. **Fases de Implementación** - Breakdown de tareas
7. **Validaciones y Reglas** - Lógica de negocio
8. **Flujos de Datos** - Diagramas y explicaciones
9. **Extensibilidad** - Cómo extender en el futuro
10. **Testing** - Checklist de pruebas
11. **Métricas de Éxito** - Cómo medir éxito

## Actualización de Documentación

Cuando cambies el estado de una feature:

### Feature completada
```bash
git mv docs/features/[feature-name].md docs/features/completed/
```

### Feature nueva (pendiente → actual)
```bash
git mv docs/features/pending/[feature-name].md docs/features/
```

### Feature pausada (actual → pendiente)
```bash
git mv docs/features/[feature-name].md docs/features/pending/
```

---

**Última actualización**: 2026-01-11
