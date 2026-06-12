import { describe, expect, it } from 'vitest';
import { contrastColor, sequentialScale } from './sequential';

describe('sequentialScale', () => {
  it('returns the endpoint colors at the domain bounds', () => {
    const s = sequentialScale({ domain: [0, 100], range: ['#000000', '#ffffff'] });
    expect(s(0)).toBe('#000000');
    expect(s(100)).toBe('#ffffff');
  });

  it('interpolates in RGB at the midpoint', () => {
    const s = sequentialScale({ domain: [0, 100], range: ['#000000', '#ffffff'] });
    expect(s(50)).toBe('#808080'); // 127.5 → 128 = 0x80
  });

  it('interpolates across multiple stops', () => {
    const s = sequentialScale({ domain: [0, 2], range: ['#ff0000', '#00ff00', '#0000ff'] });
    expect(s(1)).toBe('#00ff00'); // the middle stop
    expect(s(0.5)).toBe('#808000'); // halfway from red to green
  });

  it('clamps out-of-domain inputs by default', () => {
    const s = sequentialScale({ domain: [0, 1], range: ['#000000', '#ffffff'] });
    expect(s(2)).toBe('#ffffff');
    expect(s(-1)).toBe('#000000');
  });
});

describe('contrastColor', () => {
  it('uses dark text on light backgrounds and light text on dark', () => {
    expect(contrastColor('#ffffff')).toBe('#1f2937');
    expect(contrastColor('#000000')).toBe('#ffffff');
  });
});
