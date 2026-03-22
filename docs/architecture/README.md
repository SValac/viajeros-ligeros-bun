# Arquitectura del Sistema

Documentación técnica del sistema de gestión de viajes "Viajeros Ligeros".

## Índice

| # | Sección | Descripción |
|---|---------|-------------|
| 1 | [Tipos TypeScript](./01-types.md) | Definiciones de tipos para viajes, actividades y servicios |
| 2 | [Pinia Store](./02-store.md) | Estado centralizado con persistencia en localStorage |
| 3 | [Componentes](./03-components.md) | Dashboard, formulario y cards de estadísticas |
| 4 | [Flujo de Datos](./04-data-flow.md) | Diagrama de arquitectura y operaciones CRUD |
| 5 | [Validaciones](./05-validations.md) | Schema Zod y validaciones de negocio en el store |
| 6 | [UX/UI](./06-ux-ui.md) | Componentes Nuxt UI, feedback visual y estados de carga |
| 7 | [Fases de Implementación](./07-implementation-phases.md) | Plan progresivo de desarrollo en 4 fases |
| 8 | [Estructura de Archivos](./08-file-structure.md) | Árbol completo de archivos del proyecto |
| 9 | [Dependencias](./09-dependencies.md) | Paquetes adicionales requeridos |
| 10 | [Consideraciones Técnicas](./10-technical-notes.md) | TypeScript, Vue 3, Pinia, performance y accesibilidad |

## Contexto

- **Framework**: Nuxt 4 + Vue 3 + Pinia + Nuxt UI
- **Convenciones**: Kebab-case para archivos, `type` en vez de `interface`, 2 espacios, semicolons, single quotes
- **Estado actual**: Solo existe `/app/pages/travels/dashboard.vue` vacío
- **Layout**: Dashboard con `UDashboardGroup`, `TheSidebar`, `UDashboardPanel`
- **No existe aún**: Stores Pinia, tipos TypeScript, formularios, composables personalizados
