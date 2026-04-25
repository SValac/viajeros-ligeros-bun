# 🗺️ Google Maps Setup Guide

Esta guía explica cómo obtener y configurar una API Key de Google Maps para la integración en viajeros-ligeros.

---

## 📋 Requisitos previos

- Cuenta de Google Cloud (crear en https://cloud.google.com si no tienes)
- Método de pago válido (Google requiere esto aunque sea gratis inicialmente)

---

## 🔑 Paso 1: Crear Proyecto en Google Cloud

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Hacer clic en **"Select a Project"** (arriba a la izquierda)
3. Hacer clic en **"NEW PROJECT"**
4. Ingresar nombre: `viajeros-ligeros` (o el que prefieras)
5. Hacer clic en **"CREATE"**
6. Esperar a que se cree el proyecto (tarda ~1 min)
7. En el dropdown de proyectos, seleccionar el proyecto recién creado

---

## 🎯 Paso 2: Habilitar APIs necesarias

### Habilitar Maps JavaScript API

1. En la barra de búsqueda superior, escribir: `Maps JavaScript API`
2. Seleccionar **"Maps JavaScript API"** del resultado
3. Hacer clic en **"ENABLE"**
4. Esperar a que se habilite

### Habilitar Places API

1. En la barra de búsqueda, escribir: `Places API`
2. Seleccionar **"Places API"**
3. Hacer clic en **"ENABLE"**
4. Esperar a que se habilite

---

## 🔐 Paso 3: Crear API Key

1. En el menú lateral, ir a **"Credentials"**
2. Hacer clic en **"+ CREATE CREDENTIALS"**
3. Seleccionar **"API Key"**
4. Se genera automáticamente una clave (copiar este valor)
5. Hacer clic en **"RESTRICT KEY"** para configurar restricciones

---

## 🛡️ Paso 4: Restringir API Key (IMPORTANTE)

**Sin restricciones, cualquiera puede usar tu API Key y causar cargos elevados.**

### Configurar restricciones de dominio

1. En la página de restricciones (o hacer clic en la key para editarla):
2. En **"Application restrictions"**:
   - Seleccionar **"HTTP referrers (web sites)"**
3. En **"Website restrictions"**, hacer clic en **"ADD AN ITEM"**
4. Agregar dominios:

   **Para desarrollo local:**
   ```
   http://localhost:3000/*
   http://localhost:3001/*
   http://127.0.0.1:3000/*
   ```

   **Para producción:**
   ```
   https://tudominio.com/*
   https://www.tudominio.com/*
   ```

5. En **"API restrictions"**:
   - Seleccionar **"Maps JavaScript API"**
   - Seleccionar **"Places API"**
6. Hacer clic en **"SAVE"**

---

## 💳 Paso 5: Configurar Facturación (OBLIGATORIO)

Aunque la mayoría de API keys de Google Maps tienen cuota gratuita, se requiere método de pago:

1. En el menú lateral, ir a **"Billing"**
2. Hacer clic en **"Link Billing Account"**
3. Crear cuenta de facturación o usar una existente
4. Agregar método de pago
5. Confirmar

**Nota**: Google otorga $200 USD de crédito mensual para Maps APIs. Para típico uso de desarrollo, no habrá cargos.

---

## 🔧 Paso 6: Configurar en la app

### 1. Agregar API Key a `.env.local`

Crear archivo `.env.local` (no versionado) en la raíz del proyecto:

```bash
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...
```

Reemplazar `AIzaSyD...` con tu API Key real.

### 2. Verificar `.env.example`

El archivo ya contiene la variable de plantilla:

```bash
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

---

## ✅ Verificar que funciona

1. En el proyecto, ejecutar:
   ```bash
   bun run dev
   ```

2. Navegar a una página con actividad (formulario de itinerario)

3. En la consola del navegador, no debería haber errores sobre Google Maps

4. Si aparece mensaje "Ubicación en mapa no disponible", revisar:
   - API Key está en `.env.local`
   - APIs están habilitadas
   - Restricciones de dominio incluyen `localhost:3000`

---

## 🚨 Troubleshooting

### Error: "Invalid API Key"

- Verificar que API Key está correcta en `.env.local`
- Verificar que las APIs están habilitadas
- Esperar 5 min (cambios pueden tardar en propagarse)

### Error: "Quota exceeded"

- Revisar uso en [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
- Si está cerca del límite gratuito, considerar plan de pago

### No aparece mapa ni autocomplete

- Abrir DevTools (F12)
- Verificar que no hay errores en consola
- Verificar que `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` está en `.env.local` (no en `.env.example`)

### Funciona en desarrollo pero no en producción

- Verificar restricciones de dominio incluyen tu dominio de producción
- Usar HTTPS en producción: `https://tudominio.com/*`

---

## 📚 Referencias

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [Google Places API Docs](https://developers.google.com/maps/documentation/places/web-service)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 💡 Tips de seguridad

1. **Nunca committear `.env.local`** — está en `.gitignore`
2. **Revisar restricciones** — asegurar que API Key solo funciona en tus dominios
3. **Monitorear uso** — revisar mensualmente en Google Cloud Console
4. **Rotación de keys** — cambiar API Key anualmente o si se compromete
