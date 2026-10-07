import { CalendarDate } from '@internationalized/date';

// Días festivos de México, calculados localmente (sin API): fechas fijas, lunes móviles de la
// Ley Federal del Trabajo (art. 74) y la Semana Santa a partir de la Pascua.
// El día de elecciones también es de descanso, pero no tiene fecha fija: no se incluye.

export type HolidayKind = 'official' | 'traditional';

export type MexicanHoliday = {
  date: CalendarDate;
  name: string;
  shortName: string;
  kind: HolidayKind;
};

export const HOLIDAY_KIND_LABELS: Record<HolidayKind, string> = {
  official: 'Festivo oficial',
  traditional: 'Tradicional',
};

// Clases completas y estáticas: Tailwind no genera clases armadas en runtime
export const HOLIDAY_KIND_TEXT_CLASSES: Record<HolidayKind, string> = {
  official: 'text-error',
  traditional: 'text-muted',
};

// Año del primer cambio de gobierno el 1 de octubre (reforma de 2014); luego cada 6 años
const FIRST_OCTOBER_TRANSITION_YEAR = 2024;

/**
 * @param year - Año
 * @param month - Mes (1-12)
 * @param weekday - Día de la semana (0 = domingo, 1 = lunes, …)
 * @param n - Ocurrencia (1 = primero)
 * @returns El n-ésimo `weekday` del mes, p. ej. el tercer lunes de marzo
 */
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): CalendarDate {
  const first = new CalendarDate(year, month, 1);
  // En UTC: el día de la semana no depende del locale ni de la zona horaria
  const firstWeekday = first.toDate('UTC').getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return first.add({ days: offset + (n - 1) * 7 });
}

/**
 * Domingo de Pascua (calendario gregoriano), algoritmo anónimo de Meeus/Jones/Butcher.
 * @param year - Año
 * @returns Fecha del domingo de Pascua
 */
export function getEasterSunday(year: number): CalendarDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new CalendarDate(year, month, day);
}

/**
 * @param year - Año
 * @returns Festivos oficiales y tradicionales del año, en orden de fecha
 */
export function getMexicanHolidays(year: number): MexicanHoliday[] {
  const easter = getEasterSunday(year);
  const holidays: MexicanHoliday[] = [
    { date: new CalendarDate(year, 1, 1), name: 'Año Nuevo', shortName: 'Año Nuevo', kind: 'official' },
    { date: getNthWeekdayOfMonth(year, 2, 1, 1), name: 'Día de la Constitución', shortName: 'Constitución', kind: 'official' },
    { date: getNthWeekdayOfMonth(year, 3, 1, 3), name: 'Natalicio de Benito Juárez', shortName: 'Benito Juárez', kind: 'official' },
    { date: easter.subtract({ days: 3 }), name: 'Jueves Santo', shortName: 'Jueves Santo', kind: 'traditional' },
    { date: easter.subtract({ days: 2 }), name: 'Viernes Santo', shortName: 'Viernes Santo', kind: 'traditional' },
    { date: new CalendarDate(year, 5, 1), name: 'Día del Trabajo', shortName: 'Día del Trabajo', kind: 'official' },
    { date: new CalendarDate(year, 9, 16), name: 'Día de la Independencia', shortName: 'Independencia', kind: 'official' },
    { date: new CalendarDate(year, 11, 2), name: 'Día de Muertos', shortName: 'Muertos', kind: 'traditional' },
    { date: getNthWeekdayOfMonth(year, 11, 1, 3), name: 'Revolución Mexicana', shortName: 'Revolución', kind: 'official' },
    { date: new CalendarDate(year, 12, 12), name: 'Virgen de Guadalupe', shortName: 'Guadalupe', kind: 'traditional' },
    { date: new CalendarDate(year, 12, 25), name: 'Navidad', shortName: 'Navidad', kind: 'official' },
  ];

  const yearsSinceTransition = year - FIRST_OCTOBER_TRANSITION_YEAR;
  if (yearsSinceTransition >= 0 && yearsSinceTransition % 6 === 0) {
    holidays.push({
      date: new CalendarDate(year, 10, 1),
      name: 'Transmisión del Poder Ejecutivo',
      shortName: 'Cambio de gobierno',
      kind: 'official',
    });
  }

  return holidays.sort((a, b) => a.date.compare(b.date));
}

/**
 * @param years - Años a incluir
 * @returns Festivos por día (`YYYY-MM-DD`)
 */
export function getMexicanHolidaysByDay(years: number[]): Map<string, MexicanHoliday> {
  const byDay = new Map<string, MexicanHoliday>();
  for (const year of years) {
    for (const holiday of getMexicanHolidays(year))
      byDay.set(holiday.date.toString(), holiday);
  }
  return byDay;
}
