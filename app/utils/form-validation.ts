import { z } from 'zod';

// Letras (con acentos/ñ), espacios, apóstrofes, puntos y guiones — sin dígitos ni símbolos.
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
// Dígitos, espacios y los símbolos típicos de un teléfono: +, guiones y paréntesis.
const PHONE_REGEX = /^\+?[\d\s()-]+$/;

export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s'.-]/gu, '');
}

export function sanitizePhone(value: string): string {
  return value.replace(/[^\d+()\s-]/g, '');
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
