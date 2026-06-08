import { describe, expect, it } from 'vitest';
import { plotArea, resolveMargin } from './layout';
import { createChart } from './chart';

describe('resolveMargin', () => {
  it('expands a number into all four sides', () => {
    expect(resolveMargin(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  it('fills missing sides from the defaults', () => {
    const margin = resolveMargin({ left: 60 });
    expect(margin.left).toBe(60);
    expect(margin.top).toBeGreaterThan(0);
  });
});

describe('plotArea', () => {
  it('subtracts margins from the chart size', () => {
    const rect = plotArea(
      { width: 200, height: 100 },
      { top: 10, right: 10, bottom: 10, left: 20 },
    );
    expect(rect).toEqual({ x: 20, y: 10, width: 170, height: 80 });
  });

  it('never reports negative dimensions', () => {
    const rect = plotArea({ width: 10, height: 10 }, { top: 20, right: 20, bottom: 20, left: 20 });
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});

describe('createChart.compose', () => {
  it('wraps marks in a group offset into the plot area', () => {
    const chart = createChart({ width: 100, height: 100, margin: 10 });
    const scene = chart.compose([null, undefined]);
    expect(scene).toMatchObject({ type: 'group', x: 10, y: 10, children: [] });
  });
});
