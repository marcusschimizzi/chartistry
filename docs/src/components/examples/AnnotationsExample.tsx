import {
  Chart,
  LineSeries,
  Points,
  XAxis,
  YAxis,
  Grid,
  ReferenceLine,
  ReferenceBand,
  Annotation,
  Tooltip,
} from '@chartistry/react';

const data = [
  { month: 0, value: 42 },
  { month: 1, value: 55 },
  { month: 2, value: 48 },
  { month: 3, value: 61 },
  { month: 4, value: 58 },
  { month: 5, value: 82 },
  { month: 6, value: 74 },
  { month: 7, value: 69 },
];

/** A line chart annotated with a target line, a healthy band, and a callout. */
export default function AnnotationsExample() {
  return (
    <Chart
      width={640}
      height={360}
      data={data}
      x={(d) => d.month}
      y={(d) => d.value}
      yDomain={[0, 100]}
      margin={{ top: 16, right: 24, bottom: 32, left: 40 }}
      title="Monthly score"
      xLabel="Month"
    >
      <Grid />
      <ReferenceBand y={[40, 60]} label="Healthy range" fill="#10b981" opacity={0.1} />
      <YAxis />
      <XAxis />
      <ReferenceLine y={75} label="Target" color="#ef4444" />
      <LineSeries stroke="#4f46e5" strokeWidth={2.5} area fill="rgba(79, 70, 229, 0.12)" />
      <Points radius={3.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
      <Annotation x={5} y={82} label="Record high" dx={-14} dy={-16} color="#1f2937" />
      <Tooltip />
    </Chart>
  );
}
