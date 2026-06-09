import type { Scale } from './types';
import { niceDomain, ticks as linearTicks } from './ticks';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY; // nominal, for interval selection only
const YEAR = 365 * DAY; // nominal, for interval selection only

export interface TimeScaleOptions {
  domain: readonly [Date | number, Date | number];
  range: readonly [number, number];
  /** Expand the domain to round time boundaries before mapping. */
  nice?: boolean;
  /** Tick count used when `nice` rounds the domain. Defaults to 10. */
  niceCount?: number;
  /** Clamp outputs to the range so out-of-domain values stay in bounds. */
  clamp?: boolean;
  /** Snap ticks and format labels in UTC rather than local time. */
  utc?: boolean;
  /**
   * BCP-47 locale(s) for tick labels, formatted via `Intl.DateTimeFormat`.
   * Omit for the built-in compact English labels.
   */
  locale?: string | string[];
}

export interface TimeScale extends Scale<Date> {
  (value: Date | number): number;
  invert(position: number): Date;
  ticks(count?: number): Date[];
  tickFormat(count?: number): (value: Date) => string;
}

/**
 * A continuous scale over time: it maps dates to pixels linearly by epoch
 * milliseconds, but picks human, calendar-aware ticks (every 15 minutes, every
 * day, every month, every year, ...) and labels them adaptively. Mechanically
 * it's a linear scale with a time-savvy `ticks`/`tickFormat`, mirroring the
 * approach of d3-scale's `scaleTime`.
 *
 * By default it works in local time with compact English labels. Pass `utc` to
 * snap and format in UTC, and `locale` to label via `Intl.DateTimeFormat`.
 */
export function timeScale(options: TimeScaleOptions): TimeScale {
  const cal = options.utc ? utcCal : localCal;
  const start = toMs(options.domain[0]);
  const stop = toMs(options.domain[1]);
  const [lo, hi] = options.nice
    ? niceTimeWith(start, stop, options.niceCount ?? 10, cal)
    : [start, stop];
  const [r0, r1] = options.range;
  const clamp = options.clamp ?? false;

  const span = hi - lo;
  const rangeSpan = r1 - r0;

  const scale = ((value: Date | number): number => {
    if (span === 0) return r0;
    let t = (toMs(value) - lo) / span;
    if (clamp) t = Math.max(0, Math.min(1, t));
    return r0 + t * rangeSpan;
  }) as TimeScale;

  Object.defineProperties(scale, {
    domain: { value: Object.freeze([new Date(lo), new Date(hi)]), enumerable: true },
    range: { value: Object.freeze([r0, r1]), enumerable: true },
  });

  scale.invert = (position: number): Date => {
    if (rangeSpan === 0) return new Date(lo);
    let t = (position - r0) / rangeSpan;
    if (clamp) t = Math.max(0, Math.min(1, t));
    return new Date(lo + t * span);
  };

  scale.ticks = (count = 10): Date[] => timeTicksWith(lo, hi, count, cal);
  scale.tickFormat = (): ((value: Date) => string) =>
    makeFormatter(cal, options.locale, !!options.utc);
  scale.bandwidth = (): number => 0;

  return scale;
}

function toMs(value: Date | number): number {
  return typeof value === 'number' ? value : +value;
}

/* ------------------------------------------------------------------ *
 * Calendar abstraction: the same interval/format logic runs against
 * local-time or UTC field accessors, chosen once per scale.
 * ------------------------------------------------------------------ */

interface Cal {
  ms(d: Date): number;
  s(d: Date): number;
  m(d: Date): number;
  h(d: Date): number;
  date(d: Date): number;
  day(d: Date): number;
  month(d: Date): number;
  year(d: Date): number;
  setSeconds(d: Date, s: number, ms: number): void;
  setMinutes(d: Date, m: number, s: number, ms: number): void;
  setHours(d: Date, h: number, m: number, s: number, ms: number): void;
  setDate(d: Date, date: number): void;
  setMonth(d: Date, month: number): void;
  /** Construct a date at the start of the given year/month/day. */
  ymd(y: number, m: number, d: number): Date;
}

const localCal: Cal = {
  ms: (d) => d.getMilliseconds(),
  s: (d) => d.getSeconds(),
  m: (d) => d.getMinutes(),
  h: (d) => d.getHours(),
  date: (d) => d.getDate(),
  day: (d) => d.getDay(),
  month: (d) => d.getMonth(),
  year: (d) => d.getFullYear(),
  setSeconds: (d, s, ms) => void d.setSeconds(s, ms),
  setMinutes: (d, m, s, ms) => void d.setMinutes(m, s, ms),
  setHours: (d, h, m, s, ms) => void d.setHours(h, m, s, ms),
  setDate: (d, date) => void d.setDate(date),
  setMonth: (d, month) => void d.setMonth(month),
  ymd: (y, m, d) => new Date(y, m, d),
};

const utcCal: Cal = {
  ms: (d) => d.getUTCMilliseconds(),
  s: (d) => d.getUTCSeconds(),
  m: (d) => d.getUTCMinutes(),
  h: (d) => d.getUTCHours(),
  date: (d) => d.getUTCDate(),
  day: (d) => d.getUTCDay(),
  month: (d) => d.getUTCMonth(),
  year: (d) => d.getUTCFullYear(),
  setSeconds: (d, s, ms) => void d.setUTCSeconds(s, ms),
  setMinutes: (d, m, s, ms) => void d.setUTCMinutes(m, s, ms),
  setHours: (d, h, m, s, ms) => void d.setUTCHours(h, m, s, ms),
  setDate: (d, date) => void d.setUTCDate(date),
  setMonth: (d, month) => void d.setUTCMonth(month),
  ymd: (y, m, d) => new Date(Date.UTC(y, m, d)),
};

/* ------------------------------------------------------------------ *
 * Calendar intervals + tick generation.
 * ------------------------------------------------------------------ */

interface TimeInterval {
  /** Snap a date down to this interval, flooring the field to a step multiple. */
  floor(date: Date, step: number): Date;
  /** Advance a floored date by `step` intervals. */
  offset(date: Date, step: number): Date;
}

/** Build the candidate tick intervals against a calendar (local or UTC). */
function makeIntervals(cal: Cal): ReadonlyArray<readonly [TimeInterval, number, number]> {
  const second: TimeInterval = {
    floor: (d, step) => {
      const r = new Date(d);
      cal.setSeconds(r, Math.floor(cal.s(r) / step) * step, 0);
      return r;
    },
    offset: (d, step) => new Date(+d + step * SECOND),
  };
  const minute: TimeInterval = {
    floor: (d, step) => {
      const r = new Date(d);
      cal.setMinutes(r, Math.floor(cal.m(r) / step) * step, 0, 0);
      return r;
    },
    offset: (d, step) => new Date(+d + step * MINUTE),
  };
  const hour: TimeInterval = {
    floor: (d, step) => {
      const r = new Date(d);
      cal.setHours(r, Math.floor(cal.h(r) / step) * step, 0, 0, 0);
      return r;
    },
    offset: (d, step) => new Date(+d + step * HOUR),
  };
  const day: TimeInterval = {
    floor: (d) => {
      const r = new Date(d);
      cal.setHours(r, 0, 0, 0, 0);
      return r;
    },
    offset: (d, step) => {
      const r = new Date(d);
      cal.setDate(r, cal.date(r) + step);
      return r;
    },
  };
  const week: TimeInterval = {
    floor: (d) => {
      const r = new Date(d);
      cal.setHours(r, 0, 0, 0, 0);
      cal.setDate(r, cal.date(r) - cal.day(r));
      return r;
    },
    offset: (d, step) => {
      const r = new Date(d);
      cal.setDate(r, cal.date(r) + step * 7);
      return r;
    },
  };
  const month: TimeInterval = {
    floor: (d, step) => cal.ymd(cal.year(d), Math.floor(cal.month(d) / step) * step, 1),
    offset: (d, step) => {
      const r = new Date(d);
      cal.setMonth(r, cal.month(r) + step);
      return r;
    },
  };
  return [
    [second, 1, SECOND],
    [second, 5, 5 * SECOND],
    [second, 15, 15 * SECOND],
    [second, 30, 30 * SECOND],
    [minute, 1, MINUTE],
    [minute, 5, 5 * MINUTE],
    [minute, 15, 15 * MINUTE],
    [minute, 30, 30 * MINUTE],
    [hour, 1, HOUR],
    [hour, 3, 3 * HOUR],
    [hour, 6, 6 * HOUR],
    [hour, 12, 12 * HOUR],
    [day, 1, DAY],
    [week, 1, WEEK],
    [month, 1, MONTH],
    [month, 3, 3 * MONTH],
  ];
}

const LOCAL_INTERVALS = makeIntervals(localCal);
const UTC_INTERVALS = makeIntervals(utcCal);

function intervalsFor(cal: Cal): ReadonlyArray<readonly [TimeInterval, number, number]> {
  return cal === utcCal ? UTC_INTERVALS : LOCAL_INTERVALS;
}

/** Generate calendar-friendly tick dates across [start, stop] (epoch ms), local time. */
export function timeTicks(start: number, stop: number, count: number): Date[] {
  return timeTicksWith(start, stop, count, localCal);
}

function timeTicksWith(start: number, stop: number, count: number, cal: Cal): Date[] {
  if (!(stop > start) || count <= 0) return [];
  const target = (stop - start) / count;

  // Very wide ranges fall back to nice round years.
  if (target >= YEAR) {
    const y0 = cal.year(new Date(start));
    const y1 = cal.year(new Date(stop));
    return linearTicks(y0, y1, count)
      .filter((y) => Number.isInteger(y))
      .map((y) => cal.ymd(y, 0, 1))
      .filter((d) => +d >= start && +d <= stop);
  }

  const [interval, step] = selectInterval(target, intervalsFor(cal));
  const out: Date[] = [];
  let t = interval.floor(new Date(start), step);
  if (+t < start) t = interval.offset(t, step);
  for (let guard = 0; +t <= stop && guard < 10000; guard++) {
    out.push(new Date(+t));
    t = interval.offset(t, step);
  }
  return out;
}

function selectInterval(
  target: number,
  intervals: ReadonlyArray<readonly [TimeInterval, number, number]>,
): readonly [TimeInterval, number] {
  let best = intervals[0]!;
  let bestScore = Infinity;
  for (const entry of intervals) {
    const score = Math.abs(Math.log(entry[2] / target));
    if (score < bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return [best[0], best[1]];
}

/** Expand [start, stop] (epoch ms) outward to round time boundaries, local time. */
export function niceTime(start: number, stop: number, count: number): [number, number] {
  return niceTimeWith(start, stop, count, localCal);
}

function niceTimeWith(start: number, stop: number, count: number, cal: Cal): [number, number] {
  if (!(stop > start)) return [start, stop];
  const target = (stop - start) / count;

  if (target >= YEAR) {
    const [y0, y1] = niceDomain(cal.year(new Date(start)), cal.year(new Date(stop)), count);
    return [+cal.ymd(y0, 0, 1), +cal.ymd(y1, 0, 1)];
  }

  const [interval, step] = selectInterval(target, intervalsFor(cal));
  const lo = interval.floor(new Date(start), step);
  let hi = interval.floor(new Date(stop), step);
  if (+hi < stop) hi = interval.offset(hi, step);
  return [+lo, +hi];
}

/* ------------------------------------------------------------------ *
 * Adaptive multi-scale formatting.
 * ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Label a date by the largest field it isn't aligned to: a mid-minute tick
 * shows seconds, a midnight tick shows the day, the 1st of a month shows the
 * month, and Jan 1 shows the year. This keeps a time axis readable without
 * repeating redundant context on every tick. Local time, compact English.
 */
export function formatTime(date: Date): string {
  return formatCompact(date, localCal);
}

/** The compact English formatter, parameterized by calendar (local or UTC). */
function formatCompact(date: Date, cal: Cal): string {
  if (cal.ms(date)) return `.${pad(cal.ms(date), 3)}`;
  if (cal.s(date)) return `:${pad(cal.s(date), 2)}`;
  if (cal.m(date) || cal.h(date)) return `${pad(cal.h(date), 2)}:${pad(cal.m(date), 2)}`;
  if (cal.date(date) !== 1) return `${MONTHS[cal.month(date)]} ${cal.date(date)}`;
  if (cal.month(date)) return MONTHS[cal.month(date)]!;
  return String(cal.year(date));
}

/**
 * Pick the label formatter for a scale. With no `locale` it's the compact
 * English formatter (in the scale's calendar); with a `locale` it keeps the
 * same adaptive field choice but renders month/day/time via `Intl`, in UTC
 * when the scale is UTC.
 */
function makeFormatter(
  cal: Cal,
  locale: string | string[] | undefined,
  utc: boolean,
): (date: Date) => string {
  if (locale === undefined) return (date) => formatCompact(date, cal);

  const withTz = (o: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions =>
    utc ? { ...o, timeZone: 'UTC' } : o;
  const monthDay = new Intl.DateTimeFormat(locale, withTz({ month: 'short', day: 'numeric' }));
  const monthShort = new Intl.DateTimeFormat(locale, withTz({ month: 'short' }));
  const hourMinute = new Intl.DateTimeFormat(
    locale,
    withTz({ hour: '2-digit', minute: '2-digit' }),
  );

  return (date: Date): string => {
    if (cal.ms(date)) return `.${pad(cal.ms(date), 3)}`;
    if (cal.s(date)) return `:${pad(cal.s(date), 2)}`;
    if (cal.m(date) || cal.h(date)) return hourMinute.format(date);
    if (cal.date(date) !== 1) return monthDay.format(date);
    if (cal.month(date)) return monthShort.format(date);
    return String(cal.year(date));
  };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
