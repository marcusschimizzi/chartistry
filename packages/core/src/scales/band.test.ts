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

  it('keys Date domains by instant, not object identity', () => {
    const d0 = new Date('2024-01-01');
    const d1 = new Date('2024-01-02');
    const scale = bandScale({ domain: [d0, d1], range: [0, 200] });
    // A distinct Date instance with the same instant must hit the same band.
    expect(scale(new Date('2024-01-01'))).toBe(scale(d0));
    expect(scale(new Date('2024-01-02'))).toBe(scale(d1));
    expect(scale(d0)).not.toBe(scale(d1));
    // An instant outside the domain still misses.
    expect(Number.isNaN(scale(new Date('2024-01-03')))).toBe(true);
  });
});
