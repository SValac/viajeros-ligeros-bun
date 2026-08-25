import { z } from 'zod';

// Letras (con acentos/ñ), espacios, apóstrofes, puntos y guiones — sin dígitos ni símbolos.
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
// Dígitos, espacios y los símbolos típicos de un teléfono: +, guiones y paréntesis.
const PHONE_REGEX = /^\+?[\d\s()-]+$/;
// Letras, números y puntuación típica de un nombre de negocio — sin < > { } ; ni otros símbolos de inyección.
const BUSINESS_NAME_REGEX = /^[\p{L}\p{N}\s'&.,/()°#-]+$/u;

// Caracteres de control (excepto salto de línea, retorno de carro y tab), típicos de contenido pegado o corrupto.
// Se construye a partir de sus códigos numéricos para no depender de escapes literales en el código fuente.
const CONTROL_CHAR_CODES = Array.from({ length: 33 }, (_, i) => i)
  .filter(code => code !== 9 && code !== 10 && code !== 13)
  .concat(127);
const CONTROL_CHARS_REGEX = new RegExp(`[${CONTROL_CHAR_CODES.map(code => String.fromCharCode(code)).join('')}]`, 'g');

export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s'.-]/gu, '');
}

export function sanitizePhone(value: string): string {
  return value.replace(/[^\d+()\s-]/g, '');
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
  min?: number;
  max?: number;
};

export function phoneSchema({ min = 0, max = 20 }: PhoneSchemaOptions = {}) {
  return z.string()
    .trim()
    .min(min, min > 0 ? `Mínimo ${min} caracteres` : 'El teléfono es requerido')
    .max(max, `Máximo ${max} caracteres`)
    .regex(PHONE_REGEX, 'Solo se permiten números, espacios, +, - y paréntesis')
    .refine(value => (value.match(/\d/g)?.length ?? 0) >= 7, 'El teléfono debe tener al menos 7 dígitos');
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
