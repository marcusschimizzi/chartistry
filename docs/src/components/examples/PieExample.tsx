import { Chart, Pie, Tooltip } from '@chartistry/react';

const data = [
  { browser: 'Chrome', share: 63 },
  { browser: 'Safari', share: 19 },
  { browser: 'Edge', share: 9 },
  { browser: 'Firefox', share: 6 },
  { browser: 'Other', share: 3 },
];

/** A donut chart with outside labels and leader lines. */
export default function PieExample() {
  return (
    <Chart
      width={520}
      height={360}
      data={data}
      x={(d) => d.browser}
      y={(d) => d.share}
      margin={48}
      title="Browser market share"
      description="Share of page views by browser."
    >
      <Pie
        innerRadius={0.6}
        padAngle={0.015}
        label={(d) => (d as (typeof data)[number]).browser}
        labelPlacement="outside"
        colors={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#94a3b8']}
      />
      <Tooltip />
    </Chart>
  );
}
