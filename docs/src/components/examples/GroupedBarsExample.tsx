import { Chart, BarGroup, XAxis, YAxis, Grid, Legend, Tooltip } from '@chartistry/react';

const data = [
  { quarter: 'Q1', plan: 40, actual: 34 },
  { quarter: 'Q2', plan: 52, actual: 58 },
  { quarter: 'Q3', plan: 48, actual: 45 },
  { quarter: 'Q4', plan: 60, actual: 67 },
];

/** Grouped multi-series bars over a categorical axis, with a legend and tooltip.
 * Swap `<BarGroup>` for `<StackedBars>` to stack the series instead. */
export default function GroupedBarsExample() {
  return (
    <Chart
      width={620}
      height={340}
      data={data}
      x={(d) => d.quarter}
      xScaleType="band"
      series={[
        { key: 'Plan', y: (d) => d.plan, color: '#94a3b8' },
        { key: 'Actual', y: (d) => d.actual, color: '#4f46e5' },
      ]}
      margin={{ top: 16, right: 24, bottom: 32, left: 40 }}
      title="Plan vs. actual by quarter"
      description="Planned and actual figures for each quarter."
      xLabel="Quarter"
    >
      <Grid />
      <YAxis />
      <XAxis />
      <BarGroup radius={3} />
      <Tooltip />
      <Legend />
    </Chart>
  );
}
