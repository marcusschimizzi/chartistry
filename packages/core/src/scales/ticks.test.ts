import { describe, expect, it } from 'vitest';
import { niceDomain, tickStep, ticks } from './ticks';

describe('ticks', () => {
  it('produces round, evenly spaced values', () => {
    expect(ticks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('avoids floating-point dust', () => {
    expect(ticks(0, 1, 10)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  });

  it('returns a single tick for a zero-width span', () => {
    expect(ticks(5, 5, 10)).toEqual([5]);
  });

  it('returns nothing for non-positive counts', () => {
    expect(ticks(0, 10, 0)).toEqual([]);
  });
});

describe('tickStep', () => {
  it('snaps to multiples of 1, 2, 5 x 10^n', () => {
    expect(tickStep(0, 100, 10)).toBe(10);
    expect(tickStep(0, 50, 10)).toBe(5);
    expect(tickStep(0, 20, 10)).toBe(2);
  });
});

describe('niceDomain', () => {
  it('rounds the domain outward to tick boundaries', () => {
    expect(niceDomain(3, 97, 10)).toEqual([0, 100]);
  });

  it('preserves descending domains', () => {
    const [a, b] = niceDomain(97, 3, 10);
    expect(a).toBeGreaterThan(b);
  });
});
