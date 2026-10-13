import type { CalendarDate, DateValue } from '@internationalized/date';

import { isSameDay, parseDate, startOfMonth, startOfWeek } from '@internationalized/date';

import type { Travel, TravelStatus } from '~/types/travel';

import type { TravelStatusColor } from './travel-status';

// Statuses the calendar shows initially; cancelled ones are added with their own switch
export const CALENDAR_DEFAULT_STATUSES: TravelStatus[] = ['pending', 'published', 'in_progress', 'completed'];

// Same locale as UApp (app/app.vue): the week starts on Sunday
export const CALENDAR_LOCALE = 'es-MX';

// `fixed-weeks`: the month is always drawn in 6 weeks
export const GRID_DAYS = 42;

export type TravelBarShape = 'single' | 'start' | 'middle' | 'end';

// Full, static classes: Tailwind doesn't generate classes built with the color at runtime
export const TRAVEL_STATUS_BAR_CLASSES: Record<TravelStatusColor, string> = {
  primary: 'bg-primary/15 text-primary',
  info: 'bg-info/15 text-info',
  neutral: 'bg-inverted/10 text-toned',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
};

// Selected travel: solid fill so its whole span stands out
export const TRAVEL_STATUS_BAR_SELECTED_CLASSES: Record<TravelStatusColor, string> = {
  primary: 'bg-primary text-inverted',
  info: 'bg-info text-inverted',
  neutral: 'bg-inverted text-inverted',
  warning: 'bg-warning text-inverted',
  error: 'bg-error text-inverted',
};

// `-mr-px`: the bar covers the cell's right border so the span looks continuous
export const TRAVEL_BAR_SHAPE_CLASSES: Record<TravelBarShape, string> = {
  single: 'mx-1 rounded-md',
  start: 'ml-1 -mr-px rounded-l-md',
  middle: '-mr-px',
  end: 'mr-1 rounded-r-md',
};

/**
 * Travel dates are `YYYY-MM-DD` (no time): `parseDate` reads them as calendar days,
 * without the time zone shift of `new Date()`.
 * @param travel - Travel
 * @returns First and last day of the travel
 */
export function getTravelDateRange(travel: Pick<Travel, 'startDate' | 'endDate'>): { start: CalendarDate; end: CalendarDate } {
  return { start: parseDate(travel.startDate), end: parseDate(travel.endDate) };
}

/**
 * @param travel - Travel
 * @returns Days of the travel counting departure and return (27 to 30 = 4 days)
 */
export function getTravelDurationDays(travel: Pick<Travel, 'startDate' | 'endDate'>): number {
  const { start, end } = getTravelDateRange(travel);
  // In UTC: no DST changes that lengthen or shorten a day
  return Math.round((end.toDate('UTC').getTime() - start.toDate('UTC').getTime()) / 86_400_000) + 1;
}

/**
 * @param travel - Travel
 * @param day - Calendar day
 * @returns Whether the day falls between departure and return (inclusive)
 */
export function isTravelOnDay(travel: Pick<Travel, 'startDate' | 'endDate'>, day: DateValue): boolean {
  const { start, end } = getTravelDateRange(travel);
  return start.compare(day) <= 0 && end.compare(day) >= 0;
}

/**
 * @param travel - Travel
 * @param from - First day of the period
 * @param to - Last day of the period
 * @returns Whether the travel touches any day of the period
 */
export function isTravelInRange(travel: Pick<Travel, 'startDate' | 'endDate'>, from: DateValue, to: DateValue): boolean {
  const { start, end } = getTravelDateRange(travel);
  return start.compare(to) <= 0 && end.compare(from) >= 0;
}

/**
 * Shape of the travel's bar on a day: the rounded ends make consecutive days
 * read as a single span.
 * @param travel - Travel
 * @param day - Calendar day (within the travel)
 * @returns Bar shape
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
 * Assigns each travel a lane (row of bars) so a travel stays at the same height
 * on all its days even when it overlaps others. Greedy assignment by departure date.
 * @param travels - Travels sorted by departure date
 * @returns Lane (0, 1, …) by travel id
 */
export function assignTravelLanes(travels: Pick<Travel, 'id' | 'startDate' | 'endDate'>[]): Map<string, number> {
  const lanes = new Map<string, number>();
  // Last occupied day of each lane
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

/**
 * Days the calendar draws for a month: 6 full weeks, from the start of the
 * week of day 1 (includes the grey days of the neighboring months).
 * @param month - Any day of the visible month
 * @returns First and last day of the grid
 */
export function getCalendarGridRange(month: DateValue): { start: DateValue; end: DateValue } {
  const start = startOfWeek(startOfMonth(month), CALENDAR_LOCALE);
  const end = start.add({ days: GRID_DAYS - 1 });

  return { start, end };
}
