import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/types/database.types';

type PublicTables = Database['public']['Tables'];
// Tables whose primary key is a uuid `id` column.
type TableWithId = { [K in keyof PublicTables]: PublicTables[K]['Row'] extends { id: string } ? K : never }[keyof PublicTables];

/**
 * Deletes one row by id and fails when nothing was deleted. Postgres RLS filters out a row the
 * user may not delete (or see) with no error, so without the returned id a blocked delete would
 * look like a success. The returned id needs no extra permission: the `id` filter already makes
 * Postgres apply the table's SELECT policy.
 * @param supabase - The client
 * @param table - Table with an `id` primary key
 * @param id - The row's id
 * @param notFound - Message when no row was deleted
 * @throws {PostgrestError} on Supabase failure
 * @throws {Error} With `notFound` when the row doesn't exist or RLS blocked the delete
 */
export async function deleteById(
  supabase: SupabaseClient<Database>,
  table: TableWithId,
  id: string,
  notFound = 'No se pudo eliminar: ya no existe o no tienes permiso.',
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .select('id');

  if (error)
    throw error;
  if (data.length === 0)
    throw new Error(notFound);
}
