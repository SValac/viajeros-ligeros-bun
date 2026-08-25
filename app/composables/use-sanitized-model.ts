export function useSanitizedModel(
  get: () => string,
  set: (value: string) => void,
  sanitize: (value: string) => string,
) {
  return computed<string>({
    get,
    set: value => set(sanitize(value)),
  });
}
