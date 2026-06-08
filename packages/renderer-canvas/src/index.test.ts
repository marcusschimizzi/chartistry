// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChart, lineMark, linearScale, pieMark, pointMark } from '@chartistry/core';
import { createCanvasRenderer } from './index';

/**
 * jsdom ships no real 2D context, so we stub one that records the calls the
 * renderer makes. That is enough to prove the canvas backend walks the same
 * scene graph the SVG backend does — the whole point of a pluggable renderer.
 */
interface RecordingContext {
  calls: string[];
  [key: string]: unknown;
}

function createRecordingContext(): RecordingContext {
  const ctx: RecordingContext = { calls: [] };
  const methods = [
    'save',
    'restore',
    'translate',
    'setTransform',
    'clearRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'closePath',
    'stroke',
    'fill',
    'fillRect',
    'strokeRect',
    'arc',
    'fillText',
    'setLineDash',
  ];
  for (const name of methods) {
    ctx[name] = (...args: unknown[]) => {
      ctx.calls.push(name);
      void args;
    };
  }
  return ctx;
}

let recording: RecordingContext;

beforeEach(() => {
  recording = createRecordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    recording as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => vi.restoreAllMocks());

function buildScene() {
  const data = [
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 2 },
  ];
  const chart = createChart({ width: 300, height: 200, margin: 20 });
  const xScale = linearScale({ domain: [0, 2], range: [0, chart.plot.width] });
  const yScale = linearScale({ domain: [0, 3], range: [chart.plot.height, 0] });
  return chart.compose([
    lineMark({ data, x: (d) => d.x, y: (d) => d.y, xScale, yScale }),
    pointMark({ data, x: (d) => d.x, y: (d) => d.y, xScale, yScale }),
  ]);
}

describe('createCanvasRenderer', () => {
  it('mounts a sized <canvas> into the host', () => {
    const host = document.createElement('div');
    const handle = createCanvasRenderer({ pixelRatio: 2 }).mount(host, { width: 300, height: 200 });
    const canvas = host.querySelector('canvas')!;
    expect(canvas).not.toBeNull();
    // Backing store is scaled by the device pixel ratio; CSS size is logical.
    expect(canvas.width).toBe(600);
    expect(canvas.style.width).toBe('300px');
    handle.destroy();
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('walks the scene graph, drawing the line and points', () => {
    const host = document.createElement('div');
    const handle = createCanvasRenderer({ pixelRatio: 1 }).mount(host, { width: 300, height: 200 });
    handle.render(buildScene());

    expect(recording.calls).toContain('clearRect');
    // Polyline path for the line series.
    expect(recording.calls).toContain('moveTo');
    expect(recording.calls).toContain('lineTo');
    // One arc per data point.
    expect(recording.calls.filter((c) => c === 'arc')).toHaveLength(3);
  });

  it('draws a pie slice as a filled wedge', () => {
    const host = document.createElement('div');
    const handle = createCanvasRenderer({ pixelRatio: 1 }).mount(host, { width: 100, height: 100 });
    const scene = pieMark({
      data: [{ v: 1 }, { v: 1 }],
      value: (d) => d.v,
      cx: 50,
      cy: 50,
      outerRadius: 40,
    });
    handle.render(scene);

    // Two wedges: each is an arc + lineTo(center) + fill.
    expect(recording.calls.filter((c) => c === 'arc')).toHaveLength(2);
    expect(recording.calls.filter((c) => c === 'lineTo')).toHaveLength(2);
    expect(recording.calls).toContain('fill');
  });
});
