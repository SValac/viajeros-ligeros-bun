<script setup lang="ts">
import { DEFAULT_PHONE_COUNTRY, extractNationalDigits, getPhoneCountry, isValidPhone, parsePhone, PHONE_COUNTRIES, toE164 } from '~/utils/phone';

// Teléfono con selector de código de país. El v-model va en E.164 (`+523121273023`) o `''`;
// el campo muestra el número nacional formateado mientras se escribe (`(312) 127 3023`).

const { placeholder, ariaLabel, disabled = false } = defineProps<{
  placeholder?: string;
  // Solo cuando no está dentro de un UFormField con label
  ariaLabel?: string;
  disabled?: boolean;
}>();

const model = defineModel<string | null>({ default: '' });

const parsed = parsePhone(model.value);
const countryCode = shallowRef((parsed.country ?? DEFAULT_PHONE_COUNTRY).code);
const digits = shallowRef(parsed.digits);
const country = computed(() => getPhoneCountry(countryCode.value));

const countryItems = PHONE_COUNTRIES.map(c => ({ label: `+${c.dialCode}`, value: c.code, description: c.name }));
const display = computed(() => country.value.format(digits.value));

// Un registro viejo (`312-127-3023`) se guarda en E.164 aunque no se toque el campo
if (parsed.country && isValidPhone(model.value) && model.value !== toE164(parsed.country, parsed.digits))
  model.value = toE164(parsed.country, parsed.digits);

// Cada control con su id: el último que lo declara (el número) se queda con el <label> del UFormField
const countryId = useId();
const numberId = useId();
const input = useTemplateRef('input');

function onInput(value: string | number) {
  // Acepta que se escriba o pegue con código de país (`+52 312…`)
  digits.value = extractNationalDigits(country.value, String(value));
  model.value = toE164(country.value, digits.value);
  // Si se escribió algo que no es dígito, `display` no cambia y el campo se quedaría con ese carácter
  nextTick(() => {
    const el = input.value?.inputRef;
    if (el && el.value !== display.value)
      el.value = display.value;
  });
}

watch(countryCode, () => {
  digits.value = digits.value.slice(0, country.value.nationalLength);
  model.value = toE164(country.value, digits.value);
});

// Cambios desde fuera (registro cargado, formulario reiniciado)
watch(model, (value) => {
  if ((value ?? '') === toE164(country.value, digits.value))
    return;
  const next = parsePhone(value);
  countryCode.value = (next.country ?? DEFAULT_PHONE_COUNTRY).code;
  digits.value = next.digits;
});
</script>

<template>
  <UFieldGroup class="w-full">
    <USelect
      :id="countryId"
      v-model="countryCode"
      :items="countryItems"
      :disabled="disabled"
      aria-label="Código de país"
      class="w-20 shrink-0"
      :content="{ align: 'start' }"
    />
    <UInput
      :id="numberId"
      ref="input"
      :model-value="display"
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      :aria-label="ariaLabel"
      :placeholder="placeholder ?? country.format('0'.repeat(country.nationalLength))"
      :disabled="disabled"
      class="w-full"
      @update:model-value="onInput"
    />
  </UFieldGroup>
</template>
