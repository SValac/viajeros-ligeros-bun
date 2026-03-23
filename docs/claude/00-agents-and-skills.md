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
