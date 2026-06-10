import { Chart, LineSeries, Points } from '@chartistry/react';

const data = [
  { x: 0, y: 22 },
  { x: 1, y: 35 },
  { x: 2, y: 29 },
  { x: 3, y: 48 },
  { x: 4, y: 41 },
  { x: 5, y: 63 },
  { x: 6, y: 56 },
];

/** A small decorative area chart for the gallery wall. */
export default function MiniArea() {
  return (
    <Chart
      width={320}
      height={190}
      data={data}
      x={(d) => d.x}
      y={(d) => d.y}
      margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
      title="Area"
      interactive={false}
      accessible={false}
    >
      <LineSeries stroke="#0d9488" strokeWidth={2.5} area fill="rgba(13, 148, 136, 0.18)" />
      <Points radius={3} fill="#0d9488" stroke="#ffffff" strokeWidth={1.5} />
    </Chart>
  );
}
