// colada.options.ts
import type { PiniaColadaOptions } from '@pinia/colada';

export default {
  // Options here
  queryOptions: {
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

} satisfies PiniaColadaOptions;
