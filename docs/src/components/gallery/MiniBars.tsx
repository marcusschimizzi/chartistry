import { Chart, Bars } from '@chartistry/react';

const data = [
  { name: 'A', value: 28 },
  { name: 'B', value: 56 },
  { name: 'C', value: 42 },
  { name: 'D', value: 70 },
  { name: 'E', value: 50 },
];

/** A small decorative bar chart for the gallery wall. */
export default function MiniBars() {
  return (
    <Chart
      width={280}
      height={200}
      data={data}
      x={(d) => d.name}
      y={(d) => d.value}
      xScaleType="band"
      bandPadding={0.3}
      margin={{ top: 16, right: 12, bottom: 12, left: 12 }}
      title="Bars"
      interactive={false}
      accessible={false}
    >
      <Bars fill="#6366f1" radius={4} />
    </Chart>
  );
}
