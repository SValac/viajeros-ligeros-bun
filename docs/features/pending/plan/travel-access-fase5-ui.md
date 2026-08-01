# Código de Acceso al Viaje — Fase 5: UI de administración

**Objetivo:** Crear `TravelAccessCodeCard.vue` e integrarlo en la página de detalle
del viaje, para que el admin pueda generar, ver una vez, copiar, enviar por WhatsApp y
revocar el código.

**Dependencia:** [Fase 4](travel-access-fase4-store.md) — necesita el store ya
funcionando.
**Estado:** Código completo ✅ — `typecheck` y `lint` sin errores. Falta 5.4 (prueba
manual en navegador, programada para el día siguiente).

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe el componente y
prueba en el navegador (`bun run dev`).

**Skills a cargar antes de escribir el componente:**
```
@.claude/skills/vue
@.claude/skills/nuxt-ui
@.claude/skills/vueuse-functions
```

**Referencia de estructura:** `app/pages/travels/[id]/index.vue` — mirar cómo están
armadas las secciones existentes (`<section>` + `TheSeparator` + `UCard`) para que la
tarjeta nueva quede consistente visualmente.

---

## Diseño de `app/components/travel-access-code-card.vue`

**Props:** `travelId: string`, `travelStatus: TravelStatus`.

**Estados de la tarjeta:**

1. **`travelStatus` no es `published`/`in_progress`** → `UAlert` (`color="neutral"`,
   icon `i-lucide-lock`) explicando que el código solo se puede generar en esos
   estados; botón deshabilitado.
2. **Sin código activo** → botón "Generar código" (`icon="i-lucide-key-round"`).
3. **Código activo, no revelado en esta sesión** (ej. tras recargar la página) →
   línea de estado "Código activo · expira el {fecha}" + `UAlert` explicando que por
   seguridad no puede volver a mostrarse + botones "Generar nuevo código" (abre
   `UModal` de confirmación: "esto invalidará el código actual") y "Revocar"
   (`color="error"`, variant outline).
4. **Código activo, revelado en esta sesión** → el código en un campo monoespaciado
   con botón de copiar usando `useClipboard` de `@vueuse/core` (ya es dependencia del
   proyecto), más los mismos botones "Generar nuevo"/"Revocar".

**Lista de envío por WhatsApp** (solo visible cuando hay un código revelado): por cada
viajero del viaje (via `useTravelerStore()`, reusar si ya está cargado por la página
padre en vez de refetchear), una fila con nombre + teléfono + botón (icon
`i-simple-icons-whatsapp`, label "Enviar") que hace
`window.open(buildWhatsAppShareUrl(traveler.phone, revealedCode, travel.label), '_blank')`;
deshabilitado con `UTooltip` explicando por qué cuando no hay código revelado.

---

## Integración en `app/pages/travels/[id]/index.vue`

Agregar, en una nueva sección siguiendo el patrón `<section id="...">` + `TheSeparator`
ya usado en el resto de la página:
```vue
<TravelAccessCodeCard :travel-id="travel.id" :travel-status="travel.status" />
```
No se necesita ruta nueva.

---

## Pasos de implementación

**5.1** Crear `app/components/travel-access-code-card.vue` con los 4 estados de
arriba.

**5.2** Editar `app/pages/travels/[id]/index.vue` para insertar el componente.

**5.3** `bun run typecheck` y `bun run lint:fix`.

**5.4** Probar en el navegador (ver checklist abajo).

---

## Verificación manual en navegador

1. `bun run dev`, entrar a un viaje con `status = 'published'` (o `in_progress`), ir a
   su página de detalle.
2. La tarjeta está deshabilitada con la alerta explicativa en estados no elegibles, y
   activa en `published`/`in_progress`.
3. Generar código → aparece en el recuadro, el botón de copiar funciona, los botones
   de WhatsApp por viajero abren la URL `wa.me` correcta con el mensaje y el código.
4. Recargar la página → el código ya no se muestra en texto plano, solo metadata +
   invitación a regenerar.
5. Revocar → el código viejo deja de funcionar (probar con el `curl` de la
   [Fase 2](travel-access-fase2-rpc.md)).
6. Regenerar sobre un viaje que ya tenía código activo → aparece el modal de
   confirmación, y tras confirmar el código anterior deja de ser válido.
