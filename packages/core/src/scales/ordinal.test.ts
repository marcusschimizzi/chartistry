import { describe, expect, it } from 'vitest';
import { categoricalColors, colorScale, ordinalScale } from './ordinal';

describe('ordinalScale', () => {
  it('maps domain entries to range entries by position', () => {
    const scale = ordinalScale({ domain: ['a', 'b', 'c'], range: [10, 20, 30] });
    expect(scale('a')).toBe(10);
    expect(scale('b')).toBe(20);
    expect(scale('c')).toBe(30);
  });

  it('cycles through the range when the domain is larger', () => {
    const scale = ordinalScale({ domain: ['a', 'b', 'c'], range: ['x', 'y'] });
    expect(scale('a')).toBe('x');
    expect(scale('b')).toBe('y');
    expect(scale('c')).toBe('x');
  });

  it('assigns slots to unseen values on demand', () => {
    const scale = ordinalScale<string, string>({ domain: [], range: ['x', 'y'] });
    expect(scale('first')).toBe('x');
    expect(scale('second')).toBe('y');
    expect(scale('first')).toBe('x');
  });
});

describe('colorScale', () => {
  it('maps series keys onto the default palette', () => {
    const scale = colorScale(['sales', 'profit']);
    expect(scale('sales')).toBe(categoricalColors[0]);
    expect(scale('profit')).toBe(categoricalColors[1]);
  });
});
