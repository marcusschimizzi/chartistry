import { Chart, Heatmap, XAxis } from '@chartistry/react';

interface Cell {
  month: string;
  region: string;
  sales: number;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const regions = ['North', 'South', 'East', 'West'];

const data: Cell[] = regions.flatMap((region, ri) =>
  months.map((month, mi) => ({ region, month, sales: 20 + ri * 7 + mi * 6 + ((ri + mi) % 3) * 6 })),
);

/** A heatmap: sales by region (rows) and month (columns), value as color. */
export default function HeatmapExample() {
  return (
    <Chart
      width={620}
      height={280}
      data={data}
      x={(d) => d.month}
      xScaleType="band"
      margin={{ top: 12, right: 16, bottom: 32, left: 64 }}
      title="Sales by region & month"
      xLabel="Month"
    >
      <Heatmap
        y={(d) => (d as Cell).region}
        value={(d) => (d as Cell).sales}
        showValues
        padding={2}
        radius={3}
      />
      <XAxis />
    </Chart>
  );
}
