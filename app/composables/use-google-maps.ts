import { readonly, ref } from 'vue';

/**
 * Composable para lazy loading de Google Maps API
 * Maneja carga del script, estados y debounce
 */
export function useGoogleMaps() {
  // Estado reactivo
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref<string | null>(null);

  /**
   * Lazy load del script de Google Maps
   * Solo carga una vez, evita múltiples cargas
   */
  async function loadGoogleMaps(): Promise<void> {
    // Si ya está cargado, retornar
    if (loaded.value)
      return;

    // Si ya está cargando, esperar (evitar múltiples intentos simultáneos)
    if (loading.value)
      return;

    loading.value = true;

    try {
      // Verificar si Google Maps ya está en window
      if (typeof window !== 'undefined' && (window as any).google) {
        loaded.value = true;
        error.value = null;
        return;
      }

      const config = useRuntimeConfig();
      const apiKey = config.public.googleMapsApiKey as string;

      if (!apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY no está configurada');
      }

      // Crear y agregar script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      // Esperar a que el script se cargue
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

  /**
   * Verifica si Google Maps está completamente cargado
   */
  function isGoogleMapsLoaded(): boolean {
    return loaded.value && typeof window !== 'undefined' && !!(window as any).google;
  }

  /**
   * Retorna la instancia de Google Maps
   */
  function getGoogleMaps() {
    if (typeof window === 'undefined')
      return null;
    return (window as any).google ?? null;
  }

  /**
   * Debounce helper para funciones (ej: búsquedas)
   * Retrasa la ejecución hasta que deje de llamarse por `delay` ms
   */
  function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300,
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>) {
      // Cancelar timeout anterior
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // Programar nueva ejecución
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
