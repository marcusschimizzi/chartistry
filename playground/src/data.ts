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

/** Categorical multi-series rows, e.g. quarterly figures across product lines. */
export interface CategoryRow {
  quarter: string;
  desktop: number;
  mobile: number;
  tablet: number;
}

export const categoryData: CategoryRow[] = [
  { quarter: 'Q1', desktop: 44, mobile: 30, tablet: 12 },
  { quarter: 'Q2', desktop: 52, mobile: 38, tablet: 15 },
  { quarter: 'Q3', desktop: 48, mobile: 46, tablet: 18 },
  { quarter: 'Q4', desktop: 61, mobile: 54, tablet: 22 },
];

export const categorySeries = [
  { key: 'desktop', y: (d: CategoryRow) => d.desktop },
  { key: 'mobile', y: (d: CategoryRow) => d.mobile },
  { key: 'tablet', y: (d: CategoryRow) => d.tablet },
];

/** A daily time series starting Jan 1 2024, for the time-scale demo. */
export interface TimePoint {
  date: Date;
  value: number;
}

export function sampleTimeSeries(days = 120): TimePoint[] {
  const start = new Date(2024, 0, 1);
  const out: TimePoint[] = [];
  let value = 50;
  for (let i = 0; i < days; i++) {
    const noise = Math.sin(i * 0.3) * 5 + Math.cos(i * 0.11) * 8;
    value = Math.max(10, value + noise * 0.4 + (i % 7 === 0 ? 6 : -1));
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    out.push({ date, value: Math.round(value) });
  }
  return out;
}
