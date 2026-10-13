import { z } from 'zod';

import { parsePhone } from '~/utils/phone';

// Letters (with accents/ñ), spaces, apostrophes, periods and hyphens — no digits or symbols.
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
// Letters, numbers and the punctuation typical of a business name — no < > { } ; or other injection symbols.
const BUSINESS_NAME_REGEX = /^[\p{L}\p{N}\s'&.,/()°#-]+$/u;

// Control characters (except newline, carriage return and tab), typical of pasted or corrupted content.
// Built from their numeric codes so it doesn't depend on literal escapes in the source code.
const CONTROL_CHAR_CODES = Array.from({ length: 32 }, (_, i) => i)
  .filter(code => code !== 9 && code !== 10 && code !== 13)
  .concat(127);
const CONTROL_CHARS_REGEX = new RegExp(`[${CONTROL_CHAR_CODES.map(code => String.fromCharCode(code)).join('')}]`, 'g');

export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s'.-]/gu, '');
}

export function sanitizeBusinessName(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s'&.,/()°#-]/gu, '');
}

export function sanitizeText(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, '');
}

type NameSchemaOptions = {
  min?: number;
  max?: number;
};

export function nameSchema({ min = 2, max = 100 }: NameSchemaOptions = {}) {
  return z.string()
    .trim()
    .min(min, `Mínimo ${min} caracteres`)
    .max(max, `Máximo ${max} caracteres`)
    .regex(NAME_REGEX, 'Solo se permiten letras y espacios')
    .refine(value => /\p{L}/u.test(value), 'Debe contener al menos una letra');
}

type PhoneSchemaOptions = {
  required?: boolean;
};

// Validates the phone <PhoneInput> returns (E.164) with its country's length.
export function phoneSchema({ required = false }: PhoneSchemaOptions = {}) {
  return z.string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) {
        if (required)
          ctx.addIssue({ code: 'custom', message: 'El teléfono es requerido' });
        return;
      }
      const { country, digits } = parsePhone(value);
      if (!country)
        ctx.addIssue({ code: 'custom', message: 'Código de país no soportado' });
      else if (digits.length !== country.nationalLength)
        ctx.addIssue({ code: 'custom', message: `El teléfono debe tener ${country.nationalLength} dígitos` });
    });
}

type BusinessNameSchemaOptions = {
  min?: number;
  max?: number;
};

export function businessNameSchema({ min = 2, max = 100 }: BusinessNameSchemaOptions = {}) {
  return z.string()
    .trim()
    .min(min, `Mínimo ${min} caracteres`)
    .max(max, `Máximo ${max} caracteres`)
    .regex(BUSINESS_NAME_REGEX, 'Contiene caracteres no permitidos')
    .refine(value => /[\p{L}\p{N}]/u.test(value), 'Debe contener al menos una letra o número');
}

type TextSchemaOptions = {
  min?: number;
  max?: number;
};

export function textSchema({ min = 0, max = 500 }: TextSchemaOptions = {}) {
  return z.string()
    .trim()
    .min(min, `Mínimo ${min} caracteres`)
    .max(max, `Máximo ${max} caracteres`);
}
