# Código de Acceso al Viaje — Fase 5: UI de administración

**Objetivo:** Crear `TravelAccessCodeCard.vue` e integrarlo en la página de detalle
del viaje, para que el admin pueda generar, ver una vez, copiar, enviar por WhatsApp y
revocar el código.

**Dependencia:** [Fase 4](travel-access-fase4-store.md) — necesita el store ya
funcionando.
**Estado:** Código completo ✅ + pasada de diseño visual (`UEmpty`/`UUser`/`UBadge`).
5.4 en curso: generar/copiar/WhatsApp/recargar/revocar/regenerar ya verificados en
navegador (ver bug encontrado y corregido más abajo); falta confirmar el estado
`not-eligible` y el aspecto visual de `UEmpty`/`UUser` con el theme del proyecto.

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

**Props:** `travelId: string`, `travelLabel: string` (necesaria para el mensaje de
WhatsApp, agregada durante la implementación — no estaba en el diseño original de
este documento), `travelStatus: TravelStatus`.

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
2. ✅ Generar código → aparece en el recuadro, el botón de copiar funciona (feedback
   "Copiado").
3. ✅ Los botones de WhatsApp por viajero abren la URL `wa.me` correcta con el mensaje
   y el código.
4. ✅ Recargar la página → el código ya no se muestra en texto plano, solo metadata +
   alerta de seguridad (`active-hidden`).
5. ✅ Revocar → confirmado funcionando.
6. ✅ Regenerar sobre un viaje que ya tenía código activo → aparece el modal de
   confirmación, y tras confirmar el código anterior deja de ser válido.
7. 🔲 Pendiente: un viaje en estado no elegible (ej. `pending`) → confirmar que se ve
   el `UEmpty` de "Código no disponible todavía".
8. 🔲 Pendiente: confirmar visualmente que `UEmpty`/`UUser`/`UBadge` combinan bien con
   el theme del proyecto (primera vez que se usan en este repo).

### Bug encontrado y corregido durante 5.4: `onMounted` nunca traía el código activo

Al recargar la página después de generar un código, la tarjeta mostraba el estado
`no-code` (botón "Generar código") en vez de `active-hidden` (metadata + alerta). Causa:
el `onMounted` del componente solo llamaba a `travelerStore.fetchByTravel(...)` —
nunca a `travelAccessStore.fetchActiveCode(props.travelId)`. Como el estado de Pinia
no persiste entre recargas, `activeCodeByTravel` quedaba vacío y `cardState` caía
siempre a `'no-code'`, sin importar que el código sí existiera en la base.

**Fix:** las dos llamadas de `onMounted` se pusieron en paralelo con `Promise.all`
(son independientes entre sí, y ambas atrapan sus propios errores internamente sin
relanzar, así que `Promise.all` no corre riesgo de que una tire abajo a la otra):

```ts
onMounted(async () => {
  await Promise.all([
    travelerStore.fetchByTravel(props.travelId),
    travelAccessStore.fetchActiveCode(props.travelId),
  ]);
});
```

Ojo con este patrón al escribir `Promise.all`: poner `await` **dentro** de cada
elemento del array (`[await a(), await b()]`) anula el paralelismo — JS resuelve cada
`await` del array en orden antes de armar el array, así que para cuando
`Promise.all` lo recibe ya no hay nada que paralelizar. El `await` va solo una vez,
afuera, envolviendo el `Promise.all` entero.
