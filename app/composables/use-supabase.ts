import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '~/types/database.types';

let _client: SupabaseClient<Database> | null = null;

export function useSupabase(): SupabaseClient<Database> {
  if (_client)
    return _client;

  const config = useRuntimeConfig();
  const url = config.public.supabaseUrl;
  const key = config.public.supabaseKey;

  if (!url || !key) {
    throw new Error('Supabase URL and key are required. Check NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY.');
  }

  _client = createClient<Database>(url, key);
  return _client;
}
