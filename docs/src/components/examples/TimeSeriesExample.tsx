import { Chart, Lines, Highlight, XAxis, YAxis, Grid, Legend, Tooltip, Crosshair } from '@chartistry/react';

const data = [
  { t: new Date('2024-01-01'), North: 30, South: 18, West: 12 },
  { t: new Date('2024-02-01'), North: 38, South: 22, West: 16 },
  { t: new Date('2024-03-01'), North: 34, South: 28, West: 21 },
  { t: new Date('2024-04-01'), North: 50, South: 33, West: 25 },
  { t: new Date('2024-05-01'), North: 46, South: 41, West: 34 },
  { t: new Date('2024-06-01'), North: 62, South: 45, West: 39 },
];

/** Three series over a shared time axis, with a clickable legend, crosshair,
 * focus rings, and a tooltip. Click a legend item to toggle that series. */
export default function TimeSeriesExample() {
  return (
    <Chart
      width={640}
      height={340}
      data={data}
      x={(d) => d.t}
      xScaleType="time"
      utc
      series={[
        { key: 'North', y: (d) => d.North, color: '#4f46e5' },
        { key: 'South', y: (d) => d.South, color: '#10b981' },
        { key: 'West', y: (d) => d.West, color: '#f59e0b' },
      ]}
      margin={{ top: 16, right: 24, bottom: 32, left: 40 }}
      title="Regional sales over time"
      description="Monthly sales by region for 2024."
      xLabel="Month"
    >
      <Grid />
      <YAxis />
      <XAxis />
      <Lines strokeWidth={2.5} />
      <Highlight />
      <Crosshair />
      <Tooltip />
      <Legend />
    </Chart>
  );
}
