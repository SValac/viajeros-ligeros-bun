// Module-level singleton state — prevents duplicate script injection when
// multiple components call loadGoogleMaps() before the first one resolves.
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

export function useGoogleMaps() {
  const config = useRuntimeConfig();

  async function loadGoogleMaps(): Promise<void> {
    if (loaded.value)
      return;

    if (loading.value)
      return;

    loading.value = true;

    try {
      if (typeof window !== 'undefined' && (window as any).google) {
        loaded.value = true;
        error.value = null;
        return;
      }

      const apiKey = config.public.googleMapsApiKey as string;

      if (!apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY no está configurada');
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Fallo al cargar Google Maps API'));
        document.head.appendChild(script);
      });

      loaded.value = true;
      error.value = null;
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar Google Maps';
      error.value = message;
      console.error('❌ useGoogleMaps:', message);
      loaded.value = false;
    }
    finally {
      loading.value = false;
    }
  }

  function isGoogleMapsLoaded(): boolean {
    return loaded.value && typeof window !== 'undefined' && !!(window as any).google;
  }

  function getGoogleMaps() {
    if (typeof window === 'undefined')
      return null;
    return (window as any).google ?? null;
  }

  function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300,
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  }

  return {
    loading: readonly(loading),
    loaded: readonly(loaded),
    error: readonly(error),
    loadGoogleMaps,
    isGoogleMapsLoaded,
    getGoogleMaps,
    debounce,
  };
}
