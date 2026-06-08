import { describe, expect, it } from 'vitest';
import { formatTime, niceTime, timeScale, timeTicks } from './time';

const date = (s: string) => new Date(s);

describe('timeScale', () => {
  it('maps dates to the range linearly by time', () => {
    const scale = timeScale({
      domain: [date('2024-01-01T00:00:00'), date('2024-01-03T00:00:00')],
      range: [0, 200],
    });
    expect(scale(date('2024-01-01T00:00:00'))).toBe(0);
    expect(scale(date('2024-01-03T00:00:00'))).toBe(200);
    expect(scale(date('2024-01-02T00:00:00'))).toBe(100);
  });

  it('accepts epoch milliseconds as well as Date', () => {
    const scale = timeScale({ domain: [0, 1000], range: [0, 100] });
    expect(scale(500)).toBe(50);
  });

  it('inverts a position back to a Date', () => {
    const scale = timeScale({
      domain: [date('2024-01-01T00:00:00'), date('2024-01-03T00:00:00')],
      range: [0, 200],
    });
    const mid = scale.invert(100);
    expect(mid).toBeInstanceOf(Date);
    expect(mid.getDate()).toBe(2);
  });

  it('exposes a date formatter via tickFormat', () => {
    const scale = timeScale({ domain: [0, 1000], range: [0, 1] });
    expect(typeof scale.tickFormat()).toBe('function');
  });

  it('reports zero bandwidth', () => {
    expect(timeScale({ domain: [0, 1], range: [0, 1] }).bandwidth()).toBe(0);
  });
});

describe('timeTicks', () => {
  it('picks day ticks across a multi-day span', () => {
    const ticks = timeTicks(+date('2024-03-01T00:00:00'), +date('2024-03-08T00:00:00'), 7);
    expect(ticks.length).toBeGreaterThanOrEqual(6);
    // Every tick lands on local midnight.
    for (const t of ticks) {
      expect(t.getHours()).toBe(0);
      expect(t.getMinutes()).toBe(0);
    }
  });

  it('picks month boundaries across a multi-month span', () => {
    const ticks = timeTicks(+date('2024-01-01T00:00:00'), +date('2024-07-01T00:00:00'), 6);
    for (const t of ticks) {
      expect(t.getDate()).toBe(1);
    }
    expect(ticks.map((t) => t.getMonth())).toContain(3); // April
  });

  it('falls back to round years for very wide ranges', () => {
    const ticks = timeTicks(+date('2000-06-01T00:00:00'), +date('2050-01-01T00:00:00'), 10);
    for (const t of ticks) {
      expect(t.getMonth()).toBe(0);
      expect(t.getDate()).toBe(1);
    }
    // Nice round year steps (every 10 years here).
    expect(ticks.map((t) => t.getFullYear())).toContain(2010);
  });

  it('picks sub-hour ticks across minutes', () => {
    const ticks = timeTicks(+date('2024-01-01T09:00:00'), +date('2024-01-01T10:00:00'), 4);
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) expect(t.getSeconds()).toBe(0);
  });
});

describe('niceTime', () => {
  it('rounds the domain outward to interval boundaries', () => {
    const [lo, hi] = niceTime(+date('2024-03-03T05:30:00'), +date('2024-03-06T18:10:00'), 7);
    // Day-level rounding: lo floors to midnight, hi ceils to midnight.
    expect(new Date(lo).getHours()).toBe(0);
    expect(new Date(hi).getHours()).toBe(0);
    expect(lo).toBeLessThanOrEqual(+date('2024-03-03T05:30:00'));
    expect(hi).toBeGreaterThanOrEqual(+date('2024-03-06T18:10:00'));
  });
});

describe('formatTime', () => {
  it('labels each date by its largest unaligned field', () => {
    expect(formatTime(date('2024-01-01T00:00:00'))).toBe('2024');
    expect(formatTime(date('2024-04-01T00:00:00'))).toBe('Apr');
    expect(formatTime(date('2024-04-05T00:00:00'))).toBe('Apr 5');
    expect(formatTime(date('2024-04-05T13:30:00'))).toBe('13:30');
    expect(formatTime(date('2024-04-05T13:30:45'))).toBe(':45');
  });
});
