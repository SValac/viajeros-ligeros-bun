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
| `supabase:supabase` | Cualquier tarea con Supabase: Auth, RLS, Storage, migraciones, CLI |
| `supabase:supabase-postgres-best-practices` | Escribir o revisar SQL, esquemas, índices y políticas RLS |

> Los dos skills de Supabase vienen del plugin oficial `supabase@claude-plugins-official`, activado solo en este proyecto desde `.claude/settings.json` (se actualiza con el plugin; no hay copia en el repo).

### Diseño

| Skill | Cuándo usarlo |
| --- | --- |
| `ui-ux-pro-max` | Diseñar o revisar pantallas: paletas, tipografías, guías UX, accesibilidad, layouts. El más útil para el CRM y la web |

> Los skills de marketing y branding (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`) ya no viven en este repo: están en `~/.claude/skill-library/design/` y se enlazan solo en el sitio público (`viajeros-ligeros-web`). Para usarlos aquí: `ln -s ~/.claude/skill-library/design/<skill> .claude/skills/`.

### Herramientas a nivel usuario

- **Plugins `supabase` y `vercel`**: activados solo en este proyecto desde `.claude/settings.json`; en tu configuración global están apagados.
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
