# Feature: Montos con formato local ($4,500.00)

**Estado:** 🚧 En desarrollo. Rama `feature/money-input`. Solo frontend, sin migración.

---

## Contexto

Los campos de dinero eran `UInput type="number"`: mostraban `4500.5` mientras se escribía y
después también. Varias vistas de hospedaje mostraban los montos con `toFixed(2)`
(`$4500.00`, sin separador de miles), y había 20 copias locales de `formatCurrency`.

## Decisiones

- **`<MoneyInput>`** (sobre `UInputNumber`): se escribe libre (`4500`, `4,500.50`) y se
  formatea al salir del campo o con Enter: `$4,500.50`. El `v-model` se actualiza en ese
  momento, no con cada tecla (es como funciona el NumberField de Reka).
- Con `percent` muestra `12.5%` (`Intl` `style: 'unit', unit: 'percent'`, no multiplica por
  100). Lo usan los descuentos e incrementos de la configuración de cuenta, según el tipo
  elegido.
- **Locale `es-MX`** en `UApp` (`extendLocale(es, { code: 'es-MX' })`): con `es`, `Intl`
  formatea MXN como `4500,00 MXN`. Efecto secundario: en los calendarios la semana empieza en
  domingo, como en México.
- **Sin `min`/`max` en el NumberField:** Inicio/Fin saltan al mínimo/máximo (convención de
  spinbutton) y los valores fuera de rango se recortan sin avisar. Los límites los validan los
  schemas del formulario, que muestran el error.
- Sin botones +/− y sin cambiar el valor con la rueda del mouse.
- **Un solo `formatCurrency`** en `app/utils/currency.ts`, importado explícito en cada
  archivo.

## Código

| Archivo | Cambio |
| --- | --- |
| `app/utils/currency.ts` | `CURRENCY_FORMAT_OPTIONS`, `formatCurrency` |
| `app/components/money-input.vue` | `UInputNumber` con formato MXN o porcentaje; `aria-label` para cuando no está en un `UFormField` |
| `app/app.vue` | Locale `es-MX` |
| 10 formularios (pagos, servicios, autobuses, precios al público, tipos de habitación, configuración de cuenta) | 12 campos de dinero pasan a `<MoneyInput>` |
| Hospedaje (form, tabla, resumen), tarjeta de tipo de habitación, `use-cotizacion-store.ts` | `toFixed(2)` → `formatCurrency` |
| 20 componentes | Se borra su `formatCurrency` local |
