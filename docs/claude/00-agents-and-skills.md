# Agents & Skills

Referencia de agentes y skills disponibles en este proyecto.

---

## Skills

Los skills están instalados en `.claude/skills/` y `.agents/skills/`. Se invocan con la herramienta `Skill` (o el shorthand `/nombre-skill`).

| Skill | Cuándo usarlo |
| --- | --- |
| `vue` | Escribir SFCs Vue 3, `defineProps`/`defineEmits`/`defineModel`, watchers, `Transition`/`Teleport`/`Suspense`/`KeepAlive` |
| `vue-best-practices` | **Obligatorio** en cualquier tarea con archivos `.vue` — fuerza Composition API + `<script setup>` + TypeScript |
| `nuxt` | Rutas de servidor, `useFetch`, middleware, SSR, auto-imports, file-based routing |
| `nuxt-ui` | Construir UI con `@nuxt/ui` v4: componentes, temas Tailwind, formularios, layouts |
| `pinia` | Definir stores, trabajar con state/getters/actions, patrones de store |
| `vue-router-best-practices` | Navigation guards, route params, ciclo de vida de componentes con rutas |
| `vueuse-functions` | Aplicar composables de VueUse donde corresponda |
| `vitest` | Escribir tests con Vitest: mocking, coverage, fixtures, configuración |
| `vue-testing-best-practices` | Testing de componentes Vue con Vue Test Utils, Playwright E2E |
| `web-design-guidelines` | Auditar UI para accesibilidad, UX y buenas prácticas web |
| `supabase` | Cualquier tarea con Supabase: Auth, RLS, Storage, migraciones, CLI |
| `supabase-postgres-best-practices` | Escribir o revisar SQL, esquemas, índices y políticas RLS |

### Diseño

Skills de diseño instalados directamente en `.claude/skills/` (no son symlinks a `.agents/skills/`).

| Skill | Cuándo usarlo |
| --- | --- |
| `ui-ux-pro-max` | Diseñar o revisar pantallas: paletas, tipografías, guías UX, accesibilidad, layouts. El más útil para el CRM y la web |
| `design-system` | Arquitectura de tokens (primitivo → semántico → componente), escalas de espaciado y tipografía, specs de componentes |
| `ui-styling` | Patrones de Tailwind y accesibilidad. Está escrito para shadcn/ui: en este proyecto usar los componentes de Nuxt UI |
| `brand` | Voz de marca, identidad visual, guías de estilo |
| `design` | Logos, identidad corporativa, iconos, mockups, imágenes para redes |
| `banner-design` | Banners para redes, anuncios, hero de la web, impresión |
| `slides` | Presentaciones HTML con Chart.js |

> La generación de imágenes (logos, iconos, banners) usa Gemini y necesita `GEMINI_API_KEY`. `banner-design` menciona skills que no están instalados (`ai-artist`, `ai-multimodal`, `frontend-design`).

### Herramientas a nivel usuario

- **`playwright-cli`**: automatización de navegador desde la terminal para probar flujos contra `bun run dev`. Está instalado globalmente (no en el repo). Ejecutarlo fuera del repo: escribe una carpeta `.playwright-cli/` en el directorio actual, y no está en `.gitignore`.

---

## Agents

Los agentes son subprocesos especializados que se invocan con la herramienta `Agent`. Usar agentes en paralelo cuando las tareas son independientes.

| Agente | Cuándo usarlo |
| --- | --- |
| `Explore` | Exploración del codebase: buscar archivos por patrón, entender flujos, responder preguntas sobre la arquitectura |
| `Plan` | Diseñar la estrategia de implementación antes de codificar; identifica archivos críticos y trade-offs |
| `conventional-commits` | Generar mensajes de commit — invocar **siempre antes de cada `git commit`** |
| `vue-nuxt-mentor` | Guidance avanzado en Vue 3 Composition API, Nuxt 4, `defineModel`, composables, migración Nuxt 3→4 |
| `vue-tdd-mentor` | Escribir tests para componentes Vue/Nuxt, ciclo TDD red-green-refactor, debugging de tests |
| `descriptive-logger` | Agregar logging claro y estructurado a código nuevo o existente |
| `general-purpose` | Investigación compleja o búsquedas multi-paso cuando Glob/Grep no son suficientes |

### Cuándo NO usar un agente

- Leer un archivo específico → `Read`
- Buscar una clase o función concreta → `Glob` o `Grep`
- Búsqueda en 2-3 archivos → `Read` directamente

---

[← Volver al índice](../../CLAUDE.md) | [Siguiente: Project Overview →](./01-project-overview.md)
