import { CalendarDate } from '@internationalized/date';

// Mexican public holidays, computed locally (no API): fixed dates, the movable Mondays of the
// Ley Federal del Trabajo (art. 74) and Holy Week based on Easter.
// Election day is also a day off, but it has no fixed date: it's not included.

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

// Full, static classes: Tailwind doesn't generate classes built at runtime
export const HOLIDAY_KIND_TEXT_CLASSES: Record<HolidayKind, string> = {
  official: 'text-error',
  traditional: 'text-muted',
};

// Year of the first change of government on October 1 (2014 reform); then every 6 years
const FIRST_OCTOBER_TRANSITION_YEAR = 2024;

/**
 * @param year - Year
 * @param month - Month (1-12)
 * @param weekday - Day of the week (0 = Sunday, 1 = Monday, …)
 * @param n - Occurrence (1 = first)
 * @returns The nth `weekday` of the month, e.g. the third Monday of March
 */
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): CalendarDate {
  const first = new CalendarDate(year, month, 1);
  // In UTC: the day of the week doesn't depend on the locale or the time zone
  const firstWeekday = first.toDate('UTC').getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return first.add({ days: offset + (n - 1) * 7 });
}

/**
 * Easter Sunday (Gregorian calendar), anonymous Meeus/Jones/Butcher algorithm.
 * @param year - Year
 * @returns Date of Easter Sunday
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
 * @param year - Year
 * @returns The year's official and traditional holidays, in date order
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
 * @param years - Years to include
 * @returns Holidays by day (`YYYY-MM-DD`)
 */
export function getMexicanHolidaysByDay(years: number[]): Map<string, MexicanHoliday> {
  const byDay = new Map<string, MexicanHoliday>();
  for (const year of years) {
    for (const holiday of getMexicanHolidays(year))
      byDay.set(holiday.date.toString(), holiday);
  }
  return byDay;
}
