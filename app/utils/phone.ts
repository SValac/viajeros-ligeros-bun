// Teléfonos: se guardan en E.164 (`+523121273023`) y se muestran formateados (`(312) 127 3023`).
// Para soportar otro país basta con agregarlo a PHONE_COUNTRIES.

export type PhoneCountry = {
  // ISO 3166-1 alpha-2
  code: string;
  name: string;
  // Sin el `+`
  dialCode: string;
  // Dígitos del número nacional, sin el código de país
  nationalLength: number;
  // Formatea los dígitos nacionales, completos o parciales (mientras se escriben)
  format: (digits: string) => string;
};

function formatMx(digits: string): string {
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  // Sin paréntesis hasta el 4.º dígito: con `(312)` el retroceso borraría el `)` y volvería a aparecer
  if (digits.length <= 3)
    return digits;
  return [`(${area})`, prefix, line].filter(Boolean).join(' ');
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'MX', name: 'México', dialCode: '52', nationalLength: 10, format: formatMx },
];

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = PHONE_COUNTRIES[0]!;

export function getPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find(country => country.code === code) ?? DEFAULT_PHONE_COUNTRY;
}

export type ParsedPhone = {
  // `null` cuando trae un código de país que no está en PHONE_COUNTRIES
  country: PhoneCountry | null;
  // Dígitos nacionales, sin código de país
  digits: string;
};

/**
 * Lee un teléfono en cualquiera de los formatos que hay guardados: E.164 (`+523121273023`),
 * con código sin `+` (`523121273023`), el prefijo móvil viejo de México (`+52 1 312…`)
 * o solo el número nacional con espacios, guiones o paréntesis (`312-127-3023`).
 * @param value - Teléfono guardado o escrito
 * @returns País y dígitos nacionales
 */
export function parsePhone(value: string | null | undefined): ParsedPhone {
  const raw = (value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+');

  for (const country of PHONE_COUNTRIES) {
    const full = country.dialCode.length + country.nationalLength;
    if (!digits.startsWith(country.dialCode))
      continue;
    if (digits.length === full)
      return { country, digits: digits.slice(country.dialCode.length) };
    // México: `+52 1` + 10 dígitos era el formato para celulares antes de 2019
    if (country.code === 'MX' && digits.length === full + 1 && digits[2] === '1')
      return { country, digits: digits.slice(-country.nationalLength) };
  }

  if (international) {
    // Con `+` y un código conocido, aunque falten dígitos (número a medio escribir)
    const country = PHONE_COUNTRIES.find(c => digits.startsWith(c.dialCode));
    return country ? { country, digits: digits.slice(country.dialCode.length) } : { country: null, digits };
  }

  return { country: DEFAULT_PHONE_COUNTRY, digits };
}

/**
 * Dígitos nacionales de lo que se escribió o pegó en el campo del número. Si sobran dígitos y
 * empiezan con el código del país (`+52 312…`, `52 1 312…`), se quita el código.
 * @param country - País elegido en el selector
 * @param input - Texto del campo
 * @returns Hasta `nationalLength` dígitos
 */
export function extractNationalDigits(country: PhoneCountry, input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length > country.nationalLength && digits.startsWith(country.dialCode)) {
    digits = digits.slice(country.dialCode.length);
    // México: `52 1` + 10 dígitos era el formato para celulares antes de 2019. Ninguna lada
    // empieza con 1, así que un 1 tras el 52 siempre es ese prefijo (aunque falten dígitos
    // porque se está escribiendo tecla por tecla).
    if (country.code === 'MX' && digits.startsWith('1'))
      digits = digits.slice(1);
  }
  return digits.slice(0, country.nationalLength);
}

/**
 * @param country - País elegido
 * @param digits - Dígitos nacionales
 * @returns Teléfono en E.164, o `''` cuando no hay dígitos
 */
export function toE164(country: PhoneCountry, digits: string): string {
  const clean = digits.replace(/\D/g, '');
  return clean ? `+${country.dialCode}${clean}` : '';
}

/**
 * Normaliza un teléfono a E.164 cuando se reconoce; si no, lo deja como está.
 * @param value - Teléfono guardado o escrito
 * @returns Teléfono en E.164, el valor original si no se reconoce, o `''`
 */
export function normalizePhone(value: string | null | undefined): string {
  const { country, digits } = parsePhone(value);
  if (!digits)
    return '';
  if (!country || digits.length !== country.nationalLength)
    return (value ?? '').trim();
  return toE164(country, digits);
}

/**
 * @param value - Teléfono guardado o escrito
 * @returns `true` cuando tiene los dígitos que pide su país
 */
export function isValidPhone(value: string | null | undefined): boolean {
  const { country, digits } = parsePhone(value);
  return !!country && digits.length === country.nationalLength;
}

/**
 * Teléfono legible para mostrar: `(312) 127 3023`, con `+código` delante si no es del país por defecto.
 * Lo que no se reconoce se muestra tal cual.
 * @param value - Teléfono guardado
 * @returns Teléfono formateado, o `''` cuando no hay
 */
export function formatPhone(value: string | null | undefined): string {
  const { country, digits } = parsePhone(value);
  if (!country || digits.length !== country.nationalLength)
    return (value ?? '').trim();
  const national = country.format(digits);
  return country === DEFAULT_PHONE_COUNTRY ? national : `+${country.dialCode} ${national}`;
}
