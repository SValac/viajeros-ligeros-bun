# Documentación del Proyecto

Esta carpeta contiene toda la documentación arquitectónica y de features del proyecto Viajeros Ligeros.

## Estructura

```
docs/
├── README.md                    # Este archivo (índice general)
├── ARCHITECTURE_PLAN.md         # Índice de redirección → architecture/
├── architecture/                # Documentación arquitectónica por sección
│   ├── README.md                # Índice de arquitectura
│   ├── 01-types.md              # Tipos TypeScript
│   ├── 02-store.md              # Pinia store
│   ├── 03-components.md         # Componentes
│   ├── 04-data-flow.md          # Flujo de datos y CRUD
│   ├── 05-validations.md        # Schema Zod y validaciones
│   ├── 06-ux-ui.md              # Componentes Nuxt UI y feedback
│   ├── 07-implementation-phases.md  # 4 fases de desarrollo
│   ├── 08-file-structure.md     # Árbol de archivos del proyecto
│   ├── 09-dependencies.md       # Paquetes adicionales
│   └── 10-technical-notes.md    # TypeScript, Vue, performance, a11y
└── features/                    # Documentación de features
    ├── [FEATURE-ACTUAL].md      # Feature en desarrollo (NO en subcarpetas)
    ├── completed/               # Features implementadas y completadas
    │   ├── travel-feature.md
    │   ├── feature-itinerary-services.md
    │   ├── provider-catalog-feature.md
    │   └── filter-catalogs-feature.md
    └── pending/                 # Features planificadas pero no iniciadas

CLAUDE.md                        # En RAÍZ del proyecto (requerido por Claude Code)
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
- *(ninguna feature activa actualmente)*

### ✅ Completadas
- **travel-feature.md** - Feature 1: Sistema de gestión de viajes (CRUD básico)
- **feature-itinerary-services.md** - Features 2-3: Itinerarios, servicios y página de detalles
- **provider-catalog-feature.md** - Feature 4: Catálogo de proveedores con CRUD completo
- **filter-catalogs-feature.md** - Feature 5: Filtrado de catálogos por ubicación y categoría
- **feature-traveler-module.md** - Feature 6: Módulo de viajeros con grupos y representantes
- **autobus-en-viaje-feature.md** - Feature 7: Gestión de autobuses por viaje
- **feature-pagos.md** - Feature 8: Módulo de pagos con abonos, descuentos y saldo por viajero

### ⏭️ Pendientes
- Exportación de datos (PDF/CSV)
- Analytics y reportes

## Archivos Principales

### architecture/ (documentación arquitectónica)
Plan arquitectónico dividido en secciones independientes. Ver [architecture/README.md](./architecture/README.md) para el índice completo con:
- Tipos TypeScript, Pinia store, componentes
- Flujos de datos y CRUD
- Validaciones, UX/UI, fases de implementación
- Estructura de archivos, dependencias, notas técnicas

### CLAUDE.md (en raíz del proyecto)
Guía de convenciones del proyecto para Claude Code:
- Comandos de desarrollo
- Arquitectura del proyecto
- Estilo de código (ESLint)
- Git workflow
- Módulos configurados

**Nota importante**: Este archivo debe estar en la raíz del proyecto porque Claude Code lo busca automáticamente ahí.

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

**Última actualización**: 2026-03-24
