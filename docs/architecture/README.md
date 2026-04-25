# Arquitectura del Sistema

Documentación técnica del sistema de gestión de viajes "Viajeros Ligeros".

## Índice

| # | Sección | Descripción |
|---|---------|-------------|
| 1 | [Tipos TypeScript](./01-types.md) | Definiciones de tipos para todas las entidades del dominio |
| 2 | [Pinia Stores](./02-store.md) | 9 stores con persistencia en Supabase |
| 3 | [Componentes](./03-components.md) | Catálogo de los 54 componentes agrupados por dominio |
| 4 | [Flujo de Datos](./04-data-flow.md) | Diagrama de arquitectura y operaciones CRUD con Supabase |
| 5 | [Validaciones](./05-validations.md) | Validaciones Zod y reglas de negocio en stores |
| 6 | [UX/UI](./06-ux-ui.md) | Layout, páginas, componentes Nuxt UI y feedback visual |
| 7 | [Estado del Proyecto](./07-implementation-phases.md) | Funcionalidades implementadas y estado actual |
| 8 | [Estructura de Archivos](./08-file-structure.md) | Árbol completo de archivos del proyecto |
| 9 | [Dependencias](./09-dependencies.md) | Paquetes instalados y sus versiones |
| 10 | [Consideraciones Técnicas](./10-technical-notes.md) | Patrones, performance, autenticación y Supabase |

## Contexto

- **Framework**: Nuxt 4 + Vue 3 + Pinia + Nuxt UI v4
- **Backend**: Supabase (PostgreSQL) — sin localStorage, sin SSR
- **Auth**: Supabase Auth con middleware global
- **Maps**: Google Maps API (selector y display de ubicaciones)
- **Convenciones**: kebab-case para archivos, `type` en vez de `interface`, 2 espacios, semicolons, single quotes
- **Estado actual**: Sistema completo en producción con auth, viajes, proveedores, cotizaciones, pagos, viajeros y coordinadores
