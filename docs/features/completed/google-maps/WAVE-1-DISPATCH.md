# 🚀 WAVE 1 DISPATCH — Google Maps Integration

**Status**: Despachado  
**Fecha**: 2026-04-24  
**Ejecución**: Paralelo (3 dev-agents simultáneamente)

---

## 📌 TASK T1: Extender TravelActivity type

**Dev-Agent Instance**: `dev-agent-1`  
**Archivos**: `app/types/travel.ts`  
**Skills requeridos**: 
- `@.claude/skills/vue`
- `@.claude/skills/nuxt`

### Instrucciones

Modifica `app/types/travel.ts` para agregar propiedad `mapLocation` al tipo `TravelActivity`:

```ts
export type TravelActivity = {
  id: string;
  travelId: string;
  day: number;
  title: string;
  time: string;
  location: string;
  description: string;
  // NUEVO:
  mapLocation?: {
    lat: number;
    lng: number;
    placeId?: string;
    address?: string;
  };
}
```

**Validaciones**:
- `lat`: debe estar entre -90 y 90
- `lng`: debe estar entre -180 y 180
- `mapLocation` es opcional (retrocompatibilidad)

**Verificaciones**:
- [ ] TypeScript compila sin errores
- [ ] No rompe tipos existentes
- [ ] Actualizar también en DTOs si existen

---

## 📌 TASK T3: Crear useGoogleMaps composable

**Dev-Agent Instance**: `dev-agent-2`  
**Archivos**: `app/composables/useGoogleMaps.ts` (NUEVA)  
**Skills requeridos**:
- `@.claude/skills/vueuse-functions`
- `@.claude/skills/vue`
- `@.claude/skills/nuxt`

### Instrucciones

Crear composable para lazy loading de Google Maps API:

```ts
// app/composables/useGoogleMaps.ts
export function useGoogleMaps() {
  // Estado reactivo
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref<string | null>(null);

  // Lazy load del script
  async function loadGoogleMaps(): Promise<void> {
    // Si ya está cargado, retornar
    if (loaded.value) return;
    // Si ya está cargando, esperar
    if (loading.value) return;

    loading.value = true;
    try {
      const apiKey = useRuntimeConfig().public.googleMapsApiKey;
      if (!apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY no configurado');
      }

      // Agregar script de Google Maps
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      loaded.value = true;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error cargando Google Maps:', error.value);
    } finally {
      loading.value = false;
    }
  }

  function isGoogleMapsLoaded(): boolean {
    return loaded.value && typeof window !== 'undefined' && (window as any).google !== undefined;
  }

  function getGoogleMaps() {
    return typeof window !== 'undefined' ? (window as any).google : null;
  }

  // Debounce helper (300ms por defecto)
  function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return function (...args: Parameters<T>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
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
```

**Requisitos**:
- Lazy load solo cuando sea necesario
- Evitar múltiples cargas del script
- Manejar API Key ausente (no lanzar error, retornar estado error)
- Debounce helper integrado para búsquedas
- Usar `readonly()` para exponer estado reactivo sin que sea modificable

**Verificaciones**:
- [ ] TypeScript compila
- [ ] Maneja caso: API Key no configurada
- [ ] No carga múltiples veces
- [ ] `debounce()` funciona correctamente

---

## 📌 TASK T9: Variables de entorno & Setup docs

**Dev-Agent Instance**: `dev-agent-3`  
**Archivos**: 
- `.env.example` (MODIFICAR)
- `docs/setup/google-maps-setup.md` (NUEVA)

**Skills requeridos**: Documentación

### Instrucciones

**1. Actualizar `.env.example`:**

Agregar al final:

```bash
# Google Maps Integration
GOOGLE_MAPS_API_KEY=
```

**2. Crear `docs/setup/google-maps-setup.md`:**

Documento con pasos para obtener API Key:

```markdown
# Google Maps Setup

## Pasos en Google Cloud Console

1. Ir a https://cloud.google.com
2. Crear nuevo proyecto
3. En "APIs & Services":
   - Habilitar "Maps JavaScript API"
   - Habilitar "Places API"
4. Crear credenciales (API Key)
5. Restringir API Key:
   - Application restrictions: HTTP referrers
   - Agregar dominios de la app (ej: localhost:3000, yourdomain.com)
6. Configurar facturación en proyecto
7. Copiar API Key a `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY=AIzaSyD...
   ```

## Restricciones de seguridad

- Nunca exponer API Key sin restricciones de dominio
- Revisar cuota mensual en Google Cloud Console
- Monitorear costos si Maps se usa intensivamente
```

**Verificaciones**:
- [ ] `.env.example` contiene `GOOGLE_MAPS_API_KEY`
- [ ] Documento `docs/setup/google-maps-setup.md` existe
- [ ] Instrucciones son claras y completas

---

## 📊 Status

| T | Descripción | Dev Agent | Status |
|---|---|---|---|
| T1 | Extender TravelActivity | dev-agent-1 | ⏳ En ejecución |
| T3 | useGoogleMaps composable | dev-agent-2 | ⏳ En ejecución |
| T9 | Env vars + Setup docs | dev-agent-3 | ⏳ En ejecución |

---

## ✅ Condición de cierre de Wave 1

Todas las 3 tareas completadas Y sin errores de TypeScript.

Una vez completado, proceder a **Wave 2** (T2, T4, T5).
