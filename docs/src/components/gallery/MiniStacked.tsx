import { Chart, StackedBars } from '@chartistry/react';

const data = [
  { name: 'Q1', a: 18, b: 12, c: 8 },
  { name: 'Q2', a: 22, b: 16, c: 10 },
  { name: 'Q3', a: 16, b: 20, c: 14 },
  { name: 'Q4', a: 26, b: 18, c: 12 },
];

/** A small decorative stacked bar chart for the gallery wall. */
export default function MiniStacked() {
  return (
    <Chart
      width={260}
      height={200}
      data={data}
      x={(d) => d.name}
      xScaleType="band"
      bandPadding={0.35}
      stackY
      series={[
        { key: 'a', y: (d) => d.a, color: '#6366f1' },
        { key: 'b', y: (d) => d.b, color: '#22d3ee' },
        { key: 'c', y: (d) => d.c, color: '#a78bfa' },
      ]}
      margin={{ top: 16, right: 12, bottom: 12, left: 12 }}
      title="Stacked"
      interactive={false}
      accessible={false}
    >
      <StackedBars radius={3} />
    </Chart>
  );
}
