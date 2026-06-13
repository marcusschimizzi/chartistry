import { Chart, Heatmap, XAxis, YAxis } from '@chartistry/react';

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

/** A heatmap: sales by month (columns) and region (rows), value as color. */
export default function HeatmapExample() {
  return (
    <Chart
      width={620}
      height={280}
      data={data}
      x={(d) => d.month}
      xScaleType="band"
      yCategory={(d) => d.region}
      yScaleType="band"
      value={(d) => d.sales}
      margin={{ top: 12, right: 16, bottom: 32, left: 64 }}
      title="Sales by region & month"
    >
      <Heatmap showValues padding={2} radius={3} />
      <XAxis />
      <YAxis />
    </Chart>
  );
}
