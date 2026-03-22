# 10. Consideraciones Técnicas

## TypeScript

- Usar `type` en lugar de `interface` (convención del proyecto)
- Aprovechar inference de tipos donde sea posible
- Usar `satisfies` para validar tipos sin perder inference

## Vue 3 Composition API

- Usar `<script setup lang="ts">` en todos los componentes
- Aprovechar `defineProps`, `defineEmits` con tipos
- Usar `ref`, `reactive`, `computed` según corresponda

## Pinia

- Store modular, separar por dominio si crece
- Getters para lógica de filtrado y cálculos
- Actions async si se integra con API backend en futuro

## Performance

- `UTable` maneja virtualización internamente
- Usar `v-memo` en listas grandes si es necesario
- Computed properties para datos derivados

## Accesibilidad

- Labels en todos los inputs
- `aria-label` en botones de iconos
- Keyboard navigation funcional
- Anuncios de toast para screen readers

---

## Notas generales del sistema

- **Sin backend**: Todo el estado vive en Pinia + localStorage
- **Escalable**: Fácil migrar a API REST/GraphQL en futuro (solo cambiar actions del store)
- **Type-safe**: TypeScript en todo el stack
- **Convenciones**: Sigue estrictamente `CLAUDE.md` del proyecto
- **Mobile-friendly**: Nuxt UI es responsive por defecto
- **Desarrollo**: Usar `bun run dev` para testing continuo

---

[← Dependencias](./09-dependencies.md) | [Volver al índice](./README.md)
