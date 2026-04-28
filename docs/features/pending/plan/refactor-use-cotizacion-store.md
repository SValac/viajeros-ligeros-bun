# Refactor: use-cotizacion-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de cotización.
Por su tamaño y complejidad, este refactor se divide en sub-fases. Sin cambios en la
API pública del store ni en las páginas.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Muy Alta — el store más grande del proyecto (2111 líneas), 8 tablas,
~26 acciones async, fetching con `Promise.all` y nested selects  
**Estado:** Pendiente — requiere análisis previo en sesión

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* de cada cambio antes de que el usuario
escriba código. No realizar cambios al código a menos que el usuario lo pida
explícitamente. Por la complejidad, leer el store completo al inicio de la sesión
antes de proponer cambios. Responder preguntas y adaptar las explicaciones al nivel
del usuario.

**Skills a cargar al inicio de la sesión:**

```
@.claude/skills/vue
@.claude/skills/vue-best-practices
@.claude/skills/nuxt
@.claude/skills/pinia
@.claude/skills/supabase
```

**Contexto de referencia:**
- Store ya refactorizado: `app/stores/use-traveler-store.ts`
- Repositorio de referencia: `app/composables/travelers/use-traveler-repository.ts`
- Dominio de referencia: `app/composables/travelers/use-traveler-domain.ts`
- Plan de referencia completado: `docs/features/pending/plan/refactor-use-traveler-store.md`
- Plan de referencia (complejo): `docs/features/pending/plan/refactor-use-travel-store.md`

---

## Análisis preliminar (completar en sesión)

**Archivo:** `app/stores/use-cotizacion-store.ts` (~2111 líneas)  
**Tablas conocidas:** ~8 tablas relacionadas con cotización

> **Acción requerida al inicio de la sesión:** Leer el archivo completo antes
> de comenzar. El plan se irá refinando durante el análisis.

### Lo que se sabe por memoria del proyecto

- `fetchByTravel` usa `Promise.all` con nested selects — el más complejo del proyecto
- Tiene secciones: Proveedores, Hospedaje, Precio al Público
- Autobuses apartados (`CotizacionBus`) como sub-módulo

### Preguntas a responder en la sesión

Antes de proponer cambios, el asistente debe determinar:

1. ¿Qué lógica de dominio pura existe? (cálculos de costos, validaciones de cotización)
2. ¿Cuáles son las 8 tablas y sus relaciones?
3. ¿El `fetchByTravel` con `Promise.all` se puede encapsular limpiamente en el repositorio?
4. ¿Hay lógica de dominio que esté duplicada entre acciones?

---

## Estructura objetivo (tentativa)

```
app/
├── composables/
│   └── cotizacion/
│       ├── use-cotizacion-domain.ts      ← lógica pura (cálculos, validaciones)
│       └── use-cotizacion-repository.ts  ← acceso Supabase
├── stores/
│   └── use-cotizacion-store.ts           ← orquestación + cache
└── types/
    └── cotizacion.ts                     ← sin cambios
```

---

## Fases (a detallar en sesión)

Dado el tamaño del store, las fases se dividen en sub-fases. El orden a seguir en sesión:

### Fase 0 — Lectura y análisis (en sesión) ✅ PENDIENTE

El asistente lee el store completo y mapea:
- Funciones puras candidatas para el dominio
- Acciones Supabase para el repositorio
- Acciones que orquestan múltiples tablas (quedan en store)
- Riesgos o particularidades

### Fase 1 — Extraer lógica de dominio pura ✅ PENDIENTE

> **A detallar en sesión** tras el análisis de Fase 0.

Candidatos conocidos:
- Cálculos de costos (punto de equilibrio, precio por asiento, etc.)
- Validaciones de cotización

### Fase 2A — Repositorio: fetchs y queries ✅ PENDIENTE

Extraer primero las operaciones de lectura (`fetch*`) — sin efectos secundarios en el store.

### Fase 2B — Repositorio: mutaciones simples ✅ PENDIENTE

Extraer acciones de insert/update/delete de una sola tabla.

### Fase 2C — Repositorio: mutaciones complejas ✅ PENDIENTE

Extraer acciones multi-tabla o con lógica de replace (delete + insert).

### Fase 3 — Limpieza final ✅ PENDIENTE

Verificación de que cada capa tiene exactamente lo que debe tener.

---

## Decisiones de diseño conocidas

| Decisión | Justificación |
|---|---|
| Dividir en sub-fases A/B/C | El store es demasiado grande para migrar en un solo paso |
| Fase 0 de análisis requerida | Sin leer el store completo, cualquier plan es incompleto |
| Migrar fetches primero | Son read-only: menor riesgo, resultado visible en typecheck inmediatamente |
| Mantener `Promise.all` en el store o repositorio | A decidir en sesión según la complejidad del fetch |

## Advertencia

Este es el store más complejo del proyecto. Se recomienda:
1. Completar los refactors de los otros stores primero para tener experiencia
2. Dedicar una sesión exclusiva a este store
3. Hacer `bun run typecheck` después de cada acción migrada, no al final
4. Tener el store de payments como referencia (también tiene Promise.all y 2 tablas)
