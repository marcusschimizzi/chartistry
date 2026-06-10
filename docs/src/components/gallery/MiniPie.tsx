import { Chart, Pie } from '@chartistry/react';

const data = [
  { name: 'Coral', value: 34 },
  { name: 'Amber', value: 26 },
  { name: 'Violet', value: 22 },
  { name: 'Teal', value: 18 },
];

/** A small decorative donut chart for the gallery wall. */
export default function MiniPie() {
  return (
    <Chart
      width={220}
      height={220}
      data={data}
      x={(d) => d.name}
      y={(d) => d.value}
      margin={8}
      title="Donut"
      interactive={false}
      accessible={false}
    >
      <Pie innerRadius={0.58} padAngle={0.02} colors={['#f97316', '#f59e0b', '#8b5cf6', '#14b8a6']} />
    </Chart>
  );
}
