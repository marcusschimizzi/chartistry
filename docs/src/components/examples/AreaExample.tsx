import { Chart, LineSeries, Points, Grid, XAxis, YAxis, Tooltip, Crosshair } from '@chartistry/react';

const data = [
  { t: new Date('2024-01-01'), v: 42 },
  { t: new Date('2024-02-01'), v: 55 },
  { t: new Date('2024-03-01'), v: 48 },
  { t: new Date('2024-04-01'), v: 66 },
  { t: new Date('2024-05-01'), v: 61 },
  { t: new Date('2024-06-01'), v: 78 },
  { t: new Date('2024-07-01'), v: 72 },
  { t: new Date('2024-08-01'), v: 90 },
];

/** A filled line (area) chart over a time axis, with a grid, crosshair, and tooltip. */
export default function AreaExample() {
  return (
    <Chart
      width={640}
      height={320}
      data={data}
      x={(d) => d.t}
      y={(d) => d.v}
      xScaleType="time"
      utc
      margin={{ top: 16, right: 24, bottom: 32, left: 40 }}
      title="Monthly revenue"
      description="Revenue per month over 2024."
      xLabel="Month"
    >
      <Grid />
      <YAxis />
      <XAxis />
      <LineSeries stroke="#4f46e5" strokeWidth={2.5} area fill="rgba(79, 70, 229, 0.15)" />
      <Points radius={3.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
      <Crosshair />
      <Tooltip />
    </Chart>
  );
}
