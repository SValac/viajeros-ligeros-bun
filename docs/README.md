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
    │   ├── travel-feature.md              # feature de un solo doc → archivo suelto
    │   ├── filter-catalogs-feature.md
    │   ├── data-model-cleanup/            # feature con PLAN + fases → carpeta propia
    │   │   ├── PLAN.md
    │   │   ├── fase1-travel-internals.md
    │   │   └── ...
    │   └── refactor-stores/               # serie de docs relacionados → carpeta propia
    │       ├── auth-store.md
    │       └── ...
    └── pending/                 # Features planificadas o en progreso, no cerradas
        ├── coordinator-access/
        │   ├── PLAN.md
        │   └── fase1-identidad.md ...
        └── travel-access-code/
            ├── PLAN.md
            └── fase0-rename-status.md ...

CLAUDE.md                        # En RAÍZ del proyecto (requerido por Claude Code)
```

## Convención de Organización

### Feature Actual (En Desarrollo)
El archivo de la feature **que estamos trabajando actualmente** se encuentra en la raíz de `docs/features/` (NO dentro de subcarpetas).

**Ejemplo**: Si estamos trabajando en el catálogo de proveedores, el archivo estará en:
```
docs/features/provider-catalog-feature.md
```

### Un solo doc vs. varios docs relacionados
- **Feature de un solo documento** (plan único, sin fases): archivo suelto directamente en
  `completed/` o `pending/` — ej. `docs/features/completed/multi-tenancy.md`.
- **Feature con PLAN + fases, o una serie de docs relacionados** (refactors de varios
  stores, migraciones de una misma integración, etc.): su propia **carpeta** nombrada con
  el slug de la feature, con el plan general como `PLAN.md` y cada fase como
  `faseN-nombre.md` — ej. `docs/features/pending/coordinator-access/PLAN.md` +
  `docs/features/pending/coordinator-access/fase1-identidad.md`. Esto evita mezclar las
  fases de features distintas en una sola carpeta compartida (`pending/plan/` antes tenía
  las fases de dos features distintas sin ninguna separación).
- Los links entre docs de una misma carpeta son relativos (`fase2.md`, no la ruta completa);
  entre carpetas distintas, usar `../otra-feature/PLAN.md`.

### Fases individuales: se mueven apenas cierran, no esperan a que cierre toda la feature
Una feature con varias fases puede tardar semanas en completarse por entero. **Cada fase
se mueve a `completed/` en cuanto su propio checklist queda cerrado**, aunque el resto de
la feature siga en curso — no hay que esperar a la última fase para mover todo junto. Solo
el `PLAN.md` (índice general) y la(s) fase(s) todavía abiertas se quedan en `pending/`.

Esto significa que, mientras una feature está en progreso, su carpeta vive **partida en
dos**: las fases ya cerradas en `docs/features/completed/[feature]/faseN.md`, y el
`PLAN.md` + fase(s) abiertas en `docs/features/pending/[feature]/`. El `PLAN.md` enlaza a
cada fase con su ruta real (`../../completed/[feature]/faseN.md` para las cerradas,
`faseN.md` para las que siguen en la misma carpeta). Cuando cierra la última fase, todo el
contenido de `completed/[feature]/` se junta de nuevo bajo una sola carpeta (moviendo el
`PLAN.md` ahí también) y `pending/[feature]/` desaparece.

**Ejemplo real:** `coordinator-access` tiene las Fases 1-4 en
`completed/coordinator-access/` y la Fase 5 (todavía en curso) + el `PLAN.md` en
`pending/coordinator-access/`.

### Features Completadas
Cuando una feature es **completada y mergeada**, su documentación se mueve a:
```
docs/features/completed/[nombre-feature].md              # un solo doc
docs/features/completed/[nombre-feature]/PLAN.md          # PLAN + fases
docs/features/completed/[nombre-feature]/faseN-*.md
```

### Features Pendientes
Features **planificadas o en progreso, sin cerrar todas sus fases**, se guardan en:
```
docs/features/pending/[nombre-feature].md                 # un solo doc
docs/features/pending/[nombre-feature]/PLAN.md            # PLAN + fases
docs/features/pending/[nombre-feature]/faseN-*.md
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

### Fase individual cerrada (feature con varias fases sigue en curso)
```bash
git mv docs/features/pending/[feature-name]/faseN-*.md docs/features/completed/[feature-name]/
# actualizar el link a esa fase en pending/[feature-name]/PLAN.md a la nueva ruta
```

### Feature completada (cerró su última fase)
```bash
# un solo doc
git mv docs/features/[feature-name].md docs/features/completed/
# PLAN + fases: mover el PLAN.md (y cualquier fase que quedara en pending/) a la carpeta
# de completed/ donde ya viven las fases previas
git mv docs/features/pending/[feature-name]/PLAN.md docs/features/completed/[feature-name]/
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
