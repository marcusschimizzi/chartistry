import { describe, expect, it } from 'vitest';
import { sqrtScale } from './sqrt';

describe('sqrtScale', () => {
  it('maps a value to a radius via its square root', () => {
    const s = sqrtScale({ domain: [0, 100], range: [0, 10] });
    expect(s(0)).toBe(0);
    expect(s(100)).toBe(10);
    expect(s(25)).toBeCloseTo(5); // √25 / √100 = 0.5
  });

  it('keeps area linear in value (the point of a size scale)', () => {
    const s = sqrtScale({ domain: [0, 100], range: [0, 10] });
    // 4× the value → 2× the radius → 4× the area.
    expect(s(100) / s(25)).toBeCloseTo(2);
  });

  it('honors a non-zero minimum radius', () => {
    const s = sqrtScale({ domain: [0, 100], range: [4, 20] });
    expect(s(0)).toBe(4);
    expect(s(100)).toBe(20);
  });

  it('inverts', () => {
    const s = sqrtScale({ domain: [0, 100], range: [0, 10] });
    expect(s.invert(5)).toBeCloseTo(25);
    expect(s.invert(10)).toBeCloseTo(100);
  });

  it('clamps out-of-domain inputs when asked', () => {
    const s = sqrtScale({ domain: [0, 100], range: [0, 10], clamp: true });
    expect(s(400)).toBe(10);
    expect(s(-10)).toBe(0);
  });

  it('handles negative domains sign-preservingly', () => {
    const s = sqrtScale({ domain: [-100, 100], range: [0, 100] });
    expect(s(-100)).toBe(0);
    expect(s(0)).toBeCloseTo(50);
    expect(s(100)).toBe(100);
  });

  it('is continuous (bandwidth 0)', () => {
    expect(sqrtScale({ domain: [0, 1], range: [0, 1] }).bandwidth()).toBe(0);
  });
});
