import type { CalendarDate, DateValue } from '@internationalized/date';

import { endOfWeek, getDayOfWeek, isSameDay, minDate, parseDate } from '@internationalized/date';

import type { Travel, TravelStatus } from '~/types/travel';

import type { TravelStatusColor } from './travel-status';

// Estatus que el calendario muestra de inicio; los cancelados se agregan con su propio switch
export const CALENDAR_DEFAULT_STATUSES: TravelStatus[] = ['pending', 'published', 'in_progress', 'completed'];

// Mismo locale que UApp (app/app.vue): la semana empieza en domingo
export const CALENDAR_LOCALE = 'es-MX';

export type TravelBarShape = 'single' | 'start' | 'middle' | 'end';

// Clases completas y estáticas: Tailwind no genera clases armadas con el color en runtime
export const TRAVEL_STATUS_BAR_CLASSES: Record<TravelStatusColor, string> = {
  primary: 'bg-primary/15 text-primary',
  info: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
};

// Viaje seleccionado: relleno sólido para que su tramo completo resalte
export const TRAVEL_STATUS_BAR_SELECTED_CLASSES: Record<TravelStatusColor, string> = {
  primary: 'bg-primary text-inverted',
  info: 'bg-info text-inverted',
  success: 'bg-success text-inverted',
  warning: 'bg-warning text-inverted',
  error: 'bg-error text-inverted',
};

// `-mr-px`: la barra cubre el borde derecho de la celda para que el tramo se vea continuo
export const TRAVEL_BAR_SHAPE_CLASSES: Record<TravelBarShape, string> = {
  single: 'mx-1 rounded-md',
  start: 'ml-1 -mr-px rounded-l-md',
  middle: '-mr-px',
  end: 'mr-1 rounded-r-md',
};

/**
 * Las fechas del viaje son `YYYY-MM-DD` (sin hora): `parseDate` las lee como días de calendario,
 * sin el corrimiento de zona horaria de `new Date()`.
 * @param travel - Viaje
 * @returns Primer y último día del viaje
 */
export function getTravelDateRange(travel: Pick<Travel, 'startDate' | 'endDate'>): { start: CalendarDate; end: CalendarDate } {
  return { start: parseDate(travel.startDate), end: parseDate(travel.endDate) };
}

/**
 * @param travel - Viaje
 * @returns Días del viaje contando salida y regreso (27 al 30 = 4 días)
 */
export function getTravelDurationDays(travel: Pick<Travel, 'startDate' | 'endDate'>): number {
  const { start, end } = getTravelDateRange(travel);
  // En UTC: sin cambios de horario que alarguen o acorten un día
  return Math.round((end.toDate('UTC').getTime() - start.toDate('UTC').getTime()) / 86_400_000) + 1;
}

/**
 * @param travel - Viaje
 * @param day - Día del calendario
 * @returns Si el día cae entre la salida y el regreso (inclusive)
 */
export function isTravelOnDay(travel: Pick<Travel, 'startDate' | 'endDate'>, day: DateValue): boolean {
  const { start, end } = getTravelDateRange(travel);
  return start.compare(day) <= 0 && end.compare(day) >= 0;
}

/**
 * @param travel - Viaje
 * @param from - Primer día del periodo
 * @param to - Último día del periodo
 * @returns Si el viaje toca algún día del periodo
 */
export function isTravelInRange(travel: Pick<Travel, 'startDate' | 'endDate'>, from: DateValue, to: DateValue): boolean {
  const { start, end } = getTravelDateRange(travel);
  return start.compare(to) <= 0 && end.compare(from) >= 0;
}

/**
 * Forma de la barra del viaje en un día: los extremos redondeados hacen que los días
 * seguidos se lean como un solo tramo.
 * @param travel - Viaje
 * @param day - Día del calendario (dentro del viaje)
 * @returns Forma de la barra
 */
export function getTravelBarShape(travel: Pick<Travel, 'startDate' | 'endDate'>, day: DateValue): TravelBarShape {
  const { start, end } = getTravelDateRange(travel);
  const isStart = isSameDay(start, day);
  const isEnd = isSameDay(end, day);
  if (isStart && isEnd)
    return 'single';
  if (isStart)
    return 'start';
  if (isEnd)
    return 'end';
  return 'middle';
}

/**
 * El nombre va el día de salida y al inicio de cada semana, para que un viaje que
 * cruza de fila se siga identificando.
 * @param travel - Viaje
 * @param day - Día del calendario (dentro del viaje)
 * @returns Si la barra de ese día lleva el nombre del viaje
 */
export function shouldShowTravelLabel(travel: Pick<Travel, 'startDate' | 'endDate'>, day: DateValue): boolean {
  return isSameDay(getTravelDateRange(travel).start, day) || getDayOfWeek(day, CALENDAR_LOCALE) === 0;
}

/**
 * Días que el nombre puede ocupar desde este día: hasta el regreso o el fin de la semana,
 * lo que llegue primero (el nombre no salta de fila).
 * @param travel - Viaje
 * @param day - Día del calendario (dentro del viaje)
 * @returns Número de días, mínimo 1
 */
export function getTravelLabelSpanDays(travel: Pick<Travel, 'startDate' | 'endDate'>, day: DateValue): number {
  const { end } = getTravelDateRange(travel);
  const segmentEnd = minDate(end, endOfWeek(day, CALENDAR_LOCALE)) ?? day;
  // A lo más 7 vueltas
  let days = 1;
  for (let next = day.add({ days: 1 }); next.compare(segmentEnd) <= 0; next = next.add({ days: 1 }))
    days++;
  return days;
}

/**
 * Asigna a cada viaje un carril (fila de barras) para que un viaje quede a la misma altura
 * todos sus días aunque se traslape con otros. Asignación voraz por fecha de salida.
 * @param travels - Viajes ordenados por fecha de salida
 * @returns Carril (0, 1, …) por id de viaje
 */
export function assignTravelLanes(travels: Pick<Travel, 'id' | 'startDate' | 'endDate'>[]): Map<string, number> {
  const lanes = new Map<string, number>();
  // Último día ocupado de cada carril
  const laneEnds: CalendarDate[] = [];

  for (const travel of travels) {
    const { start, end } = getTravelDateRange(travel);
    let lane = laneEnds.findIndex(laneEnd => laneEnd.compare(start) < 0);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    }
    else {
      laneEnds[lane] = end;
    }
    lanes.set(travel.id, lane);
  }

  return lanes;
}
