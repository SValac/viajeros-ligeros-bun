import type { TableRow } from '@nuxt/ui';
import type { VNode } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

// resolveComponent() only works in .vue files (Nuxt rewrites it there at build time).
import { NuxtLink, UButton, UIcon } from '#components';
import { h } from 'vue';

/**
 * Travel name cell of the travel lists: a link with the tag icon.
 * @param to - Where the row leads (travel detail, its quotation, its payments)
 * @param label - The travel's label
 * @returns The cell's VNode
 */
export function travelLinkCell(to: RouteLocationRaw, label: string): VNode {
  return h(NuxtLink, {
    to,
    class: 'flex items-center gap-2 hover:text-primary transition-colors group',
  }, () => [
    h(UIcon, { name: 'i-lucide-tag', class: 'w-4 h-4 text-muted group-hover:text-primary' }),
    h('span', { class: 'font-medium' }, label),
  ]);
}

/**
 * Name cell of a table grouped by representative: group rows get the expand/collapse button,
 * nested rows are indented by their depth.
 * @param row - The table row
 * @param content - What the cell shows (the name, or a link with it)
 * @returns The cell's VNode
 */
export function groupNameCell<T>(row: TableRow<T>, content: VNode | string): VNode {
  if (row.getCanExpand()) {
    const expanded = row.getIsExpanded();
    return h('div', { class: 'flex items-center gap-1', style: `padding-left: ${row.depth * 1.5}rem` }, [
      h(UButton, {
        'icon': expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right',
        'variant': 'ghost',
        'color': 'neutral',
        'size': 'xs',
        'aria-label': expanded ? 'Ocultar acompañantes' : 'Mostrar acompañantes',
        'aria-expanded': expanded,
        'onClick': row.getToggleExpandedHandler(),
      }),
      content,
    ]);
  }

  return h('div', { class: 'flex items-center', style: `padding-left: ${row.depth * 1.5 + 0.75}rem` }, [content]);
}
