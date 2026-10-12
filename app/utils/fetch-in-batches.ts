import type { PostgrestError } from '@supabase/supabase-js';

// Must equal PostgREST `max_rows` (supabase/config.toml, same default remotely): with a bigger
// batch the server would still cap it at 1000 and the loop would take it for the last one.
const BATCH_SIZE = 1_000;

/**
 * Fetches every row of a query in batches of `max_rows`, so results aren't silently cut at 1000.
 * The query needs a stable order (add `.order('id')` as a tiebreaker), otherwise rows can repeat
 * or go missing between batches.
 * @param fetchBatch - Builds and runs the query for one batch; must end with `.range(from, to)`
 *   (a fresh builder each call: a PostgREST builder can't be reused once awaited)
 * @returns All rows, in query order
 * @throws {PostgrestError} on Supabase failure
 */
export async function fetchInBatches<T>(
  fetchBatch: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchBatch(from, from + BATCH_SIZE - 1);

    if (error)
      throw error;

    const batch = data ?? [];
    rows.push(...batch);

    // An incomplete batch is the last one
    if (batch.length < BATCH_SIZE)
      return rows;

    from += BATCH_SIZE;
  }
}
