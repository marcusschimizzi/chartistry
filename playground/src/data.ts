export interface Datum {
  x: number;
  y: number;
}

/** A deterministic, gently noisy series so the demo looks like real data. */
export function sampleSeries(count = 24): Datum[] {
  const data: Datum[] = [];
  let value = 40;
  for (let i = 0; i < count; i++) {
    // Seeded pseudo-random walk — stable across reloads, no dependency needed.
    const noise = Math.sin(i * 1.7) * 6 + Math.cos(i * 0.6) * 4;
    value = Math.max(5, value + noise + (i % 5 === 0 ? 8 : -2));
    data.push({ x: i, y: Math.round(value) });
  }
  return data;
}
