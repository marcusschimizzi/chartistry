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
 */
export function timeScale(options: TimeScaleOptions): TimeScale {
  const start = toMs(options.domain[0]);
  const stop = toMs(options.domain[1]);
  const [lo, hi] = options.nice ? niceTime(start, stop, options.niceCount ?? 10) : [start, stop];
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

  scale.ticks = (count = 10): Date[] => timeTicks(lo, hi, count);
  scale.tickFormat = (): ((value: Date) => string) => formatTime;
  scale.bandwidth = (): number => 0;

  return scale;
}

function toMs(value: Date | number): number {
  return typeof value === 'number' ? value : +value;
}

/* ------------------------------------------------------------------ *
 * Calendar intervals + tick generation.
 * ------------------------------------------------------------------ */

interface TimeInterval {
  /** Snap a date down to this interval, flooring the field to a step multiple. */
  floor(date: Date, step: number): Date;
  /** Advance a floored date by `step` intervals. */
  offset(date: Date, step: number): Date;
}

const second: TimeInterval = {
  floor: (d, step) => {
    const r = new Date(d);
    r.setMilliseconds(0);
    r.setSeconds(Math.floor(r.getSeconds() / step) * step);
    return r;
  },
  offset: (d, step) => new Date(+d + step * SECOND),
};

const minute: TimeInterval = {
  floor: (d, step) => {
    const r = new Date(d);
    r.setSeconds(0, 0);
    r.setMinutes(Math.floor(r.getMinutes() / step) * step);
    return r;
  },
  offset: (d, step) => new Date(+d + step * MINUTE),
};

const hour: TimeInterval = {
  floor: (d, step) => {
    const r = new Date(d);
    r.setMinutes(0, 0, 0);
    r.setHours(Math.floor(r.getHours() / step) * step);
    return r;
  },
  offset: (d, step) => new Date(+d + step * HOUR),
};

const day: TimeInterval = {
  floor: (d) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  },
  offset: (d, step) => {
    const r = new Date(d);
    r.setDate(r.getDate() + step);
    return r;
  },
};

const week: TimeInterval = {
  floor: (d) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    r.setDate(r.getDate() - r.getDay());
    return r;
  },
  offset: (d, step) => {
    const r = new Date(d);
    r.setDate(r.getDate() + step * 7);
    return r;
  },
};

const month: TimeInterval = {
  floor: (d, step) => {
    const r = new Date(d.getFullYear(), Math.floor(d.getMonth() / step) * step, 1);
    return r;
  },
  offset: (d, step) => {
    const r = new Date(d);
    r.setMonth(r.getMonth() + step);
    return r;
  },
};

/** Candidate tick intervals, ascending, with their nominal duration in ms. */
const INTERVALS: ReadonlyArray<readonly [TimeInterval, number, number]> = [
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

/** Generate calendar-friendly tick dates across [start, stop] (epoch ms). */
export function timeTicks(start: number, stop: number, count: number): Date[] {
  if (!(stop > start) || count <= 0) return [];
  const target = (stop - start) / count;

  // Very wide ranges fall back to nice round years.
  if (target >= YEAR) {
    const y0 = new Date(start).getFullYear();
    const y1 = new Date(stop).getFullYear();
    return linearTicks(y0, y1, count)
      .filter((y) => Number.isInteger(y))
      .map((y) => new Date(y, 0, 1))
      .filter((d) => +d >= start && +d <= stop);
  }

  const [interval, step] = selectInterval(target);
  const out: Date[] = [];
  let t = interval.floor(new Date(start), step);
  if (+t < start) t = interval.offset(t, step);
  for (let guard = 0; +t <= stop && guard < 10000; guard++) {
    out.push(new Date(+t));
    t = interval.offset(t, step);
  }
  return out;
}

function selectInterval(target: number): readonly [TimeInterval, number] {
  let best = INTERVALS[0]!;
  let bestScore = Infinity;
  for (const entry of INTERVALS) {
    const score = Math.abs(Math.log(entry[2] / target));
    if (score < bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return [best[0], best[1]];
}

/** Expand [start, stop] (epoch ms) outward to round time boundaries. */
export function niceTime(start: number, stop: number, count: number): [number, number] {
  if (!(stop > start)) return [start, stop];
  const target = (stop - start) / count;

  if (target >= YEAR) {
    const [y0, y1] = niceDomain(new Date(start).getFullYear(), new Date(stop).getFullYear(), count);
    return [+new Date(y0, 0, 1), +new Date(y1, 0, 1)];
  }

  const [interval, step] = selectInterval(target);
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
 * repeating redundant context on every tick.
 */
export function formatTime(date: Date): string {
  if (date.getMilliseconds()) return `.${pad(date.getMilliseconds(), 3)}`;
  if (date.getSeconds()) return `:${pad(date.getSeconds(), 2)}`;
  if (date.getMinutes() || date.getHours())
    return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`;
  if (date.getDate() !== 1) return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  if (date.getMonth()) return MONTHS[date.getMonth()]!;
  return String(date.getFullYear());
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
