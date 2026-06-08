import type { Point } from '../types';

/**
 * Resample a polyline to exactly `count` points, parametrized by index fraction
 * (s in [0, 1] across the vertices). Sampling to a higher count places the extra
 * points *on* existing segments, so the shape is preserved exactly — which is
 * what lets a line morph between different point counts without distorting at
 * the endpoints. Corresponding samples in two resampled paths share the same s,
 * giving a natural stretch between them.
 */
export function resamplePoints(points: readonly Point[], count: number): Point[] {
  if (count <= 0) return [];
  if (points.length === 0) return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  if (points.length === 1) {
    const only = points[0]!;
    return Array.from({ length: count }, () => ({ ...only }));
  }
  if (count === 1) return [sampleAt(points, 0)];

  const out: Point[] = new Array(count);
  for (let j = 0; j < count; j++) out[j] = sampleAt(points, j / (count - 1));
  return out;
}

/** Point at normalized position `s` (0..1) along the polyline's vertices. */
function sampleAt(points: readonly Point[], s: number): Point {
  const k = points.length;
  const u = Math.max(0, Math.min(1, s)) * (k - 1);
  const i = Math.min(Math.floor(u), k - 2);
  const f = u - i;
  const a = points[i]!;
  const b = points[i + 1]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
