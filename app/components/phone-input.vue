<script setup lang="ts">
import { DEFAULT_PHONE_COUNTRY, extractNationalDigits, getPhoneCountry, isValidPhone, parsePhone, PHONE_COUNTRIES, toE164 } from '~/utils/phone';

// Phone with a country code selector. The v-model is E.164 (`+523121273023`) or `''`;
// the field shows the national number formatted while typing (`(312) 127 3023`).

const { placeholder, ariaLabel, disabled = false } = defineProps<{
  placeholder?: string;
  // Only when it's not inside a UFormField with a label
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

// An old record (`312-127-3023`) is saved as E.164 even if the field isn't touched
if (parsed.country && isValidPhone(model.value) && model.value !== toE164(parsed.country, parsed.digits))
  model.value = toE164(parsed.country, parsed.digits);

// Each control with its own id: the last one to declare it (the number) keeps the UFormField's <label>
const countryId = useId();
const numberId = useId();
const input = useTemplateRef('input');

function onInput(value: string | number) {
  // Accepts typing or pasting it with the country code (`+52 312…`)
  digits.value = extractNationalDigits(country.value, String(value));
  model.value = toE164(country.value, digits.value);
  // If something that isn't a digit was typed, `display` doesn't change and the field would keep that character
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

// Changes from outside (record loaded, form reset)
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
