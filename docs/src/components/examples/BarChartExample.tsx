import { Chart, Bars, XAxis, YAxis, Tooltip } from '@chartistry/react';

const data = [
  { name: 'Mon', value: 32 },
  { name: 'Tue', value: 58 },
  { name: 'Wed', value: 41 },
  { name: 'Thu', value: 67 },
  { name: 'Fri', value: 49 },
];

/**
 * A live, interactive bar chart rendered as a React island inside the docs.
 * This is the real `@chartistry/react` API — hover or use the arrow keys.
 */
export default function BarChartExample() {
  return (
    <Chart
      width={520}
      height={300}
      data={data}
      x={(d) => d.name}
      y={(d) => d.value}
      xScaleType="band"
      title="Weekly visits"
      description="Visits per weekday."
      xLabel="Day"
    >
      <YAxis />
      <XAxis />
      <Bars />
      <Tooltip />
    </Chart>
  );
}
