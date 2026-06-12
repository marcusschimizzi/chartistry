/**
 * A sequential scale maps a numeric value onto a color, by interpolating
 * through a list of color stops in RGB. It's the encoding behind heatmaps and
 * any other value→color channel.
 */

export interface SequentialScale {
  (value: number): string;
  readonly domain: readonly [number, number];
  readonly range: readonly string[];
}

export interface SequentialScaleOptions {
  domain: readonly [number, number];
  /** Two or more color stops (hex), interpolated in RGB. */
  range: readonly string[];
  /** Clamp out-of-domain inputs to the end colors. Defaults to true. */
  clamp?: boolean;
  /** Color for non-finite (missing) values. Defaults to a neutral grey. */
  unknown?: string;
}

/** A light→deep blue sequential ramp — the default heatmap palette. */
export const blues: readonly string[] = ['#eff6ff', '#93c5fd', '#3b82f6', '#1e40af', '#172554'];

type RGB = [number, number, number];

function parseHex(color: string): RGB {
  let h = color.trim().replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  const part = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function sequentialScale(options: SequentialScaleOptions): SequentialScale {
  const [d0, d1] = options.domain;
  const stops = options.range.map(parseHex);
  const clamp = options.clamp ?? true;
  const unknown = options.unknown ?? '#e5e7eb';
  const span = d1 - d0;

  const scale = ((value: number): string => {
    if (!Number.isFinite(value)) return unknown; // missing data — never crash
    if (stops.length === 0) return '#000000';
    if (stops.length === 1) return toHex(stops[0]!);
    let t = span === 0 ? 0 : (value - d0) / span;
    if (clamp) t = Math.max(0, Math.min(1, t));
    const pos = t * (stops.length - 1);
    const i = Math.max(0, Math.min(stops.length - 2, Math.floor(pos)));
    const f = pos - i;
    const a = stops[i]!;
    const b = stops[i + 1]!;
    return toHex([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }) as SequentialScale;

  Object.defineProperties(scale, {
    domain: { value: Object.freeze([d0, d1]), enumerable: true },
    range: { value: Object.freeze([...options.range]), enumerable: true },
  });
  return scale;
}

/** Pick a legible text color (near-black or white) for a hex background. */
export function contrastColor(background: string): string {
  const [r, g, b] = parseHex(background);
  // Perceived luminance (sRGB-ish); light backgrounds get dark text.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
}
