export const travelKeys = {
  root: ['travels'] as const,
  detail: (id: string) => ['travels', 'detail', id] as const,
};
