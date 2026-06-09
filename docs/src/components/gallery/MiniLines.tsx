import { Chart, Lines } from '@chartistry/react';

const data = [
  { x: 0, a: 30, b: 12 },
  { x: 1, a: 26, b: 20 },
  { x: 2, a: 38, b: 18 },
  { x: 3, a: 33, b: 28 },
  { x: 4, a: 48, b: 24 },
  { x: 5, a: 44, b: 36 },
  { x: 6, a: 58, b: 33 },
];

/** A small decorative multi-line chart for the gallery wall. */
export default function MiniLines() {
  return (
    <Chart
      width={300}
      height={180}
      data={data}
      x={(d) => d.x}
      series={[
        { key: 'a', y: (d) => d.a, color: '#6366f1' },
        { key: 'b', y: (d) => d.b, color: '#ec4899' },
      ]}
      margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
      title="Lines"
      interactive={false}
      accessible={false}
    >
      <Lines strokeWidth={2.5} />
    </Chart>
  );
}
