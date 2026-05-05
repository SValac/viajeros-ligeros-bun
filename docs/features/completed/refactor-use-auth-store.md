# Refactor: use-auth-store

**Objetivo:** Aplicar una variante del patrón Domain + Adapter al store de autenticación.
A diferencia de los otros stores, no hay acceso a tablas DB — solo `supabase.auth.*`.
Las funciones de mapeo de errores van al dominio; las llamadas a `supabase.auth` van
a un composable adaptador. Sin cambios en la API pública del store.

**Patrón elegido:** Domain + Auth Adapter (variante del Repository para auth)  
**Complejidad:** Baja — no es CRUD de tablas, es auth con Supabase Auth  
**Estado:** Completado

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* de cada cambio antes de que el usuario
escriba código. No realizar cambios al código a menos que el usuario lo pida
explícitamente. Responder preguntas y adaptar las explicaciones al nivel del usuario.

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
- Plan de referencia completado: `docs/features/pending/plan/refactor-use-traveler-store.md`

---

## Análisis del store actual

**Archivo:** `app/stores/use-auth-store.ts` (133 líneas)

### Diferencia fundamental con los otros stores

Este store NO accede a tablas de la base de datos. Usa `supabase.auth.*`, que es
la API de autenticación de Supabase — un sistema diferente al ORM de tablas.

Por eso el patrón se llama "Auth Adapter" en vez de "Repository":
- Un repositorio abstrae el acceso a una tabla
- Un adaptador abstrae la comunicación con un servicio externo (aquí: Supabase Auth)

### Lógica de dominio a extraer (Fase 1)

| Función a extraer | Origen en store |
|---|---|
| `getSignInErrorMessage(error): string` | función privada al tope del archivo (líneas 3-16) |
| `getSignUpErrorMessage(error): string` | función privada al tope del archivo (líneas 18-31) |

Estas funciones son 100% puras: sin estado, sin Supabase, sin efectos secundarios.
Traducen errores de Supabase Auth a mensajes en español para el usuario.

### Acciones con `supabase.auth` a mover al adaptador (Fase 2)

| Acción en store | Función en adaptador |
|---|---|
| `fetchSession` | `getSession(): Promise<{ session, user }>` |
| `signIn` | `signInWithPassword(email, password): Promise<{ session, user }>` |
| `signUp` | `signUpWithEmail(email, password, name?): Promise<{ session, user, requiresEmailVerification }>` |
| `signOut` | `signOut(): Promise<void>` |

---

## Estructura objetivo

```
app/
├── composables/
│   └── auth/
│       ├── use-auth-domain.ts   ← mapeo de errores de auth (NUEVO)
│       └── use-auth-adapter.ts  ← llamadas a supabase.auth (NUEVO)
├── stores/
│   └── use-auth-store.ts        ← estado de sesión + orquestación (MODIFICADO)
└── types/
    └── (no se necesitan tipos nuevos)
```

---

## Fase 1 — Extraer lógica de dominio pura ✅ COMPLETADO

> **Criterio de éxito:** las funciones de mapeo de errores están en el dominio,
> el store las importa en vez de definirlas localmente.

### Pasos

**1.1** Crear `app/composables/auth/use-auth-domain.ts`:

```ts
export function getSignInErrorMessage(error: unknown): string {
  // lógica extraída del archivo actual
}

export function getSignUpErrorMessage(error: unknown): string {
  // lógica extraída del archivo actual
}
```

**1.2** Actualizar `app/stores/use-auth-store.ts`:
- Importar `getSignInErrorMessage` y `getSignUpErrorMessage`.
- Eliminar las funciones privadas del tope del archivo.

**1.3** Verificación: `bun run typecheck` + `bun run lint:fix`.

---

## Fase 2 — Extraer llamadas a supabase.auth al adaptador ✅ COMPLETADO

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.auth`.

### Pasos

**2.1** Crear `app/composables/auth/use-auth-adapter.ts`:

```ts
export function useAuthAdapter() {
  const supabase = useSupabase();

  async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session, user: data.session?.user ?? null };
  }

  async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { session: data.session, user: data.user };
  }

  async function signUpWithEmail(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || undefined } },
    });
    if (error) throw error;
    return {
      session: data.session,
      user: data.user,
      requiresEmailVerification: !data.session,
    };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return { getSession, signInWithPassword, signUpWithEmail, signOut }
}
```

**2.2** Actualizar `app/stores/use-auth-store.ts`:
- Agregar `const adapter = useAuthAdapter()`.
- En `fetchSession`: reemplazar `supabase.auth.getSession()` por `adapter.getSession()`.
  Mantener el manejo del error tal cual (el store decide loguear y retornar `{ error }`).
- En `signIn`: reemplazar `supabase.auth.signInWithPassword` por `adapter.signInWithPassword`.
  El error de Supabase se convierte con `getSignInErrorMessage` — eso queda en el store.
- En `signUp`: reemplazar por `adapter.signUpWithEmail`.
- En `signOut`: reemplazar por `adapter.signOut()`.
- Eliminar `const supabase = useSupabase()`.

**Nota sobre manejo de errores en auth:**
En el store actual, `signIn` y `signUp` hacen `if (error) return { error: mensaje }`.
El adaptador lanza el error; el store lo captura con `try/catch` y lo convierte al
mensaje con las funciones del dominio. El contrato de retorno del store (`{ error: string | null }`)
no cambia.

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba manual: login, logout, registro (válido e inválido).
- Verificar que los mensajes de error en español siguen apareciendo correctamente.

---

## Fase 3 — Limpieza final ✅ COMPLETADO

**3.1** Verificar `use-auth-store.ts`: solo estado (`user`, `session`, `loading`),
getters computados y actions que llaman `adapter.*` y aplican `domain.*`.

**3.2** Verificar `use-auth-domain.ts`: solo funciones puras de mapeo de errores.

**3.3** Verificar `use-auth-adapter.ts`: solo llamadas a `supabase.auth.*`, sin estado reactivo.

**3.4** Verificación final: `bun run typecheck` + `bun run lint:fix`.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Nombre "adaptador" en vez de "repositorio" | `supabase.auth` es un servicio externo, no una tabla — el adaptador es el patrón correcto |
| Mapeo de errores en dominio | Son reglas de negocio de UX: qué mensaje mostrar para qué código de error de Supabase |
| El adaptador lanza errores | El store decide el contrato de retorno (`{ error: string \| null }`) — el adaptador no sabe eso |
| `fetchSession` mantiene su manejo especial | El error de `getSession` se logea a consola (no es un error de usuario) — esa decisión queda en el store |
