import { Chart, StackedArea, XAxis, YAxis, Grid, Legend, Tooltip } from '@chartistry/react';

const data = [
  { t: new Date('2024-01-01'), Direct: 20, Social: 12, Search: 30 },
  { t: new Date('2024-02-01'), Direct: 24, Social: 18, Search: 28 },
  { t: new Date('2024-03-01'), Direct: 22, Social: 26, Search: 33 },
  { t: new Date('2024-04-01'), Direct: 30, Social: 30, Search: 36 },
  { t: new Date('2024-05-01'), Direct: 28, Social: 38, Search: 40 },
  { t: new Date('2024-06-01'), Direct: 34, Social: 44, Search: 38 },
  { t: new Date('2024-07-01'), Direct: 31, Social: 50, Search: 45 },
];

const series = [
  { key: 'Search', y: (d: (typeof data)[number]) => d.Search, color: '#6366f1' },
  { key: 'Social', y: (d: (typeof data)[number]) => d.Social, color: '#10b981' },
  { key: 'Direct', y: (d: (typeof data)[number]) => d.Direct, color: '#f59e0b' },
];

/** A stacked area chart: sessions by traffic source over time. */
export default function StackedAreaExample() {
  return (
    <Chart
      width={640}
      height={320}
      data={data}
      x={(d) => d.t}
      xScaleType="time"
      utc
      stackY
      series={series}
      margin={{ top: 16, right: 24, bottom: 32, left: 40 }}
      title="Sessions by source"
      xLabel="Month"
    >
      <Grid />
      <YAxis />
      <XAxis />
      <StackedArea fillOpacity={0.85} />
      <Legend />
      <Tooltip />
    </Chart>
  );
}
