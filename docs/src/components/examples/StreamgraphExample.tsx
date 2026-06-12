import { Chart, StackedArea, XAxis, Legend, Tooltip } from '@chartistry/react';

const data = [
  { t: new Date('2024-01-01'), Pop: 12, Rock: 20, Jazz: 8, Classical: 6 },
  { t: new Date('2024-02-01'), Pop: 18, Rock: 22, Jazz: 10, Classical: 7 },
  { t: new Date('2024-03-01'), Pop: 26, Rock: 19, Jazz: 14, Classical: 9 },
  { t: new Date('2024-04-01'), Pop: 34, Rock: 16, Jazz: 18, Classical: 8 },
  { t: new Date('2024-05-01'), Pop: 30, Rock: 14, Jazz: 24, Classical: 11 },
  { t: new Date('2024-06-01'), Pop: 22, Rock: 18, Jazz: 30, Classical: 13 },
  { t: new Date('2024-07-01'), Pop: 16, Rock: 24, Jazz: 26, Classical: 15 },
];

const series = [
  { key: 'Pop', y: (d: (typeof data)[number]) => d.Pop, color: '#6366f1' },
  { key: 'Rock', y: (d: (typeof data)[number]) => d.Rock, color: '#ec4899' },
  { key: 'Jazz', y: (d: (typeof data)[number]) => d.Jazz, color: '#10b981' },
  { key: 'Classical', y: (d: (typeof data)[number]) => d.Classical, color: '#f59e0b' },
];

/** A streamgraph: the same stacked layers, centered (silhouette offset). */
export default function StreamgraphExample() {
  return (
    <Chart
      width={640}
      height={300}
      data={data}
      x={(d) => d.t}
      xScaleType="time"
      utc
      stackY="silhouette"
      series={series}
      margin={{ top: 12, right: 24, bottom: 32, left: 24 }}
      title="Listening by genre"
      xLabel="Month"
    >
      <XAxis />
      <StackedArea fillOpacity={0.9} />
      <Legend />
      <Tooltip />
    </Chart>
  );
}
