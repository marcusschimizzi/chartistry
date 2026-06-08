import { describe, expect, it } from 'vitest';
import { bandScale } from './band';

describe('bandScale', () => {
  it('divides the range into equal bands with no padding', () => {
    const scale = bandScale({ domain: ['a', 'b', 'c', 'd'], range: [0, 400] });
    expect(scale.bandwidth()).toBe(100);
    expect(scale('a')).toBe(0);
    expect(scale('b')).toBe(100);
    expect(scale('d')).toBe(300);
  });

  it('shrinks bandwidth as inner padding grows', () => {
    const noPad = bandScale({ domain: ['a', 'b'], range: [0, 100] });
    const padded = bandScale({ domain: ['a', 'b'], range: [0, 100], paddingInner: 0.5 });
    expect(padded.bandwidth()).toBeLessThan(noPad.bandwidth());
  });

  it('returns NaN for values outside the domain', () => {
    const scale = bandScale<string>({ domain: ['a', 'b'], range: [0, 100] });
    expect(Number.isNaN(scale('z'))).toBe(true);
  });

  it('exposes the domain as its ticks', () => {
    const scale = bandScale({ domain: ['x', 'y', 'z'], range: [0, 30] });
    expect(scale.ticks()).toEqual(['x', 'y', 'z']);
  });
});
