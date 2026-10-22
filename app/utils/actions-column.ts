import type { ButtonProps, DropdownMenuItem, TableColumn } from '@nuxt/ui';

// resolveComponent() only works in .vue files (Nuxt rewrites it there at build time).
import { UButton, UDropdownMenu } from '#components';
import { h } from 'vue';

type ActionsColumnOptions = {
  size?: ButtonProps['size'];
};

/**
 * The "Acciones" column of a table: a ghost ⋮ button that opens a dropdown with the row's actions.
 * @param getActions - The dropdown items for one row (groups of items, like UDropdownMenu's `items`)
 * @param options - `size` of the button ('xs' in the compact quotation tables)
 * @returns A column typed for the table's row
 */
export function actionsColumn<T>(
  getActions: (row: T) => DropdownMenuItem[][],
  options: ActionsColumnOptions = {},
): TableColumn<T> {
  return {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => h(UDropdownMenu, { items: getActions(row.original) }, () => h(UButton, {
      'color': 'neutral',
      'variant': 'ghost',
      'icon': 'i-lucide-more-vertical',
      'size': options.size,
      'aria-label': 'Abrir acciones',
    })),
  };
}
