# 🧾 Feature Request — Optimización de imágenes

**Estado:** Pendiente (anotada el 2026-10-07)

## 🎯 Contexto

Las imágenes del viaje (galería y banner) se suben y se sirven **tal cual las manda el
usuario**, sin redimensionar ni comprimir:

- `travel-gallery-upload.vue` acepta el archivo original (jpeg/png/webp/gif, mp4/webm) y
  `use-travel-media-repository.ts` lo sube directo al bucket `travel-gallery`. El bucket
  permite hasta 100 MB por archivo (`20260506230530_travel_gallery_storage.sql`).
- `uploadBanner()` (mismo repositorio) hace lo mismo con el banner del viaje.
- `travel-gallery-viewer.vue` usa `item.publicUrl` (el original) **también para las
  miniaturas** de la cuadrícula: una foto de celular de 3–5 MB se descarga completa para
  pintar un cuadro pequeño.
- El `<img>` del carrusel no tiene `loading="lazy"` y `UCarousel` (Embla) monta todas las
  slides, así que al abrirlo el navegador puede pedir **todas** las fotos originales a la vez.
- El bucket es público y el sitio web (repo `viajeros-ligeros-web`) lee las mismas URLs, así
  que los visitantes del sitio también descargan los originales.

Los datos JSON que el CRM carga al arrancar (todos los viajes con sus relaciones) pesan
unos cientos de KB; **el consumo de banda real está en las imágenes**. Ejemplo: una galería
de 20 fotos de 4 MB ≈ 80 MB por cada apertura. Con el egress del plan gratuito de Supabase
(~5 GB/mes, verificar en Settings → Usage) eso son ~60 aperturas al mes.

---

## 🚀 Objetivo

Reducir el peso de las imágenes que se almacenan y se sirven (CRM y sitio público) entre
10 y 20 veces, sin perder calidad visible, para bajar el consumo de egress y storage y
acelerar la carga de la galería.

---

## 📌 Requerimientos Funcionales

### 1. Compresión al subir (mayor impacto)
- Antes de subir una **imagen** (galería y banner), redimensionarla en el navegador a un
  máximo de ~1920 px en el lado largo y convertirla a WebP calidad ~80.
- Una foto de 4 MB debería quedar en ~200–400 KB.
- GIF y videos se suben sin cambios (no se recodifican en el navegador).
- Un solo helper compartido (ej. `utils/image-compress.ts`) usado por `upload()` y
  `uploadBanner()`; evaluar también los logos/imágenes de agencia
  (`use-agency-profile-repository.ts`).

### 2. Miniaturas reales en la cuadrícula
- La cuadrícula de la galería no debe descargar el original.
- Opciones:
  - **Supabase Image Transformations** (`getPublicUrl(path, { transform: { width: 300 } })`)
    — requiere plan Pro.
  - **Generar una miniatura al subir** (segundo archivo, ej. 400 px) y guardar su ruta en
    `travel_media` — funciona en cualquier plan, pero agrega columna + migración.

### 3. Carga diferida en el carrusel
- Agregar `loading="lazy"` al `<img>` del carrusel, o renderizar solo la slide activa y
  sus vecinas.

### 4. Sitio público
- Coordinar con la sesión del repo web para que use miniaturas / versiones reducidas en
  listados y tarjetas.

---

## 🧠 Consideraciones

- Las imágenes **ya subidas** se quedan como están. Si el storage existente pesa mucho,
  evaluar un script aparte de re-compresión (fuera del alcance inicial; prod tiene datos
  reales, cualquier reemplazo de archivos debe ser no destructivo).
- Mantener la extensión/`contentType` coherentes con el formato final (`.webp`).
- Medir antes de empezar: tamaño total del bucket `travel-gallery` y tamaño promedio por
  archivo (consulta de solo lectura sobre `storage.objects`), para priorizar.

---

## ⚠️ Restricciones

- No modificar ni borrar archivos existentes en producción como parte de esta feature.
- Si se elige la opción de miniatura generada (2b), la migración debe ser expand-only
  (columna nueva nullable) y el código debe tolerar filas sin miniatura (fallback al original).

---

## ✅ Resultado Esperado

- Las fotos nuevas pesan cientos de KB en vez de varios MB.
- Abrir la galería de un viaje descarga miniaturas ligeras; los originales solo se piden
  al verlos en el carrusel.
- El consumo de egress de Supabase deja de crecer al ritmo de las aperturas de galería.
