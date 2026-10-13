// Phones: stored as E.164 (`+523121273023`) and shown formatted (`(312) 127 3023`).
// To support another country, just add it to PHONE_COUNTRIES.

export type PhoneCountry = {
  // ISO 3166-1 alpha-2
  code: string;
  name: string;
  // Without the `+`
  dialCode: string;
  // Digits of the national number, without the country code
  nationalLength: number;
  // Formats the national digits, complete or partial (while typing)
  format: (digits: string) => string;
};

function formatMx(digits: string): string {
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  // No parentheses until the 4th digit: with `(312)` backspace would delete the `)` and it would come back
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
  // `null` when it has a country code that isn't in PHONE_COUNTRIES
  country: PhoneCountry | null;
  // National digits, without the country code
  digits: string;
};

/**
 * Reads a phone in any of the stored formats: E.164 (`+523121273023`),
 * with the code but no `+` (`523121273023`), Mexico's old mobile prefix (`+52 1 312…`)
 * or just the national number with spaces, hyphens or parentheses (`312-127-3023`).
 * @param value - Stored or typed phone
 * @returns Country and national digits
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
    // Mexico: `+52 1` + 10 digits was the mobile format before 2019
    if (country.code === 'MX' && digits.length === full + 1 && digits[2] === '1')
      return { country, digits: digits.slice(-country.nationalLength) };
  }

  if (international) {
    // With `+` and a known code, even if digits are missing (number being typed)
    const country = PHONE_COUNTRIES.find(c => digits.startsWith(c.dialCode));
    return country ? { country, digits: digits.slice(country.dialCode.length) } : { country: null, digits };
  }

  return { country: DEFAULT_PHONE_COUNTRY, digits };
}

/**
 * National digits of what was typed or pasted in the number field. If there are extra digits and
 * they start with the country code (`+52 312…`, `52 1 312…`), the code is removed.
 * @param country - Country picked in the selector
 * @param input - Field text
 * @returns Up to `nationalLength` digits
 */
export function extractNationalDigits(country: PhoneCountry, input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length > country.nationalLength && digits.startsWith(country.dialCode)) {
    digits = digits.slice(country.dialCode.length);
    // Mexico: `52 1` + 10 digits was the mobile format before 2019. No area code
    // starts with 1, so a 1 after the 52 is always that prefix (even when digits are missing
    // because it's being typed key by key).
    if (country.code === 'MX' && digits.startsWith('1'))
      digits = digits.slice(1);
  }
  return digits.slice(0, country.nationalLength);
}

/**
 * @param country - Picked country
 * @param digits - National digits
 * @returns Phone as E.164, or `''` when there are no digits
 */
export function toE164(country: PhoneCountry, digits: string): string {
  const clean = digits.replace(/\D/g, '');
  return clean ? `+${country.dialCode}${clean}` : '';
}

/**
 * Normalizes a phone to E.164 when it's recognized; otherwise leaves it as is.
 * @param value - Stored or typed phone
 * @returns Phone as E.164, the original value if not recognized, or `''`
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
 * @param value - Stored or typed phone
 * @returns `true` when it has the digits its country requires
 */
export function isValidPhone(value: string | null | undefined): boolean {
  const { country, digits } = parsePhone(value);
  return !!country && digits.length === country.nationalLength;
}

/**
 * Readable phone for display: `(312) 127 3023`, with `+code` in front if it's not from the default country.
 * Anything not recognized is shown as is.
 * @param value - Stored phone
 * @returns Formatted phone, or `''` when there is none
 */
export function formatPhone(value: string | null | undefined): string {
  const { country, digits } = parsePhone(value);
  if (!country || digits.length !== country.nationalLength)
    return (value ?? '').trim();
  const national = country.format(digits);
  return country === DEFAULT_PHONE_COUNTRY ? national : `+${country.dialCode} ${national}`;
}
