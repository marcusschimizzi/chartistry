import { Chart, Bars, XAxis, YAxis, Grid, Tooltip } from '@chartistry/react';
import { createCanvasRenderer } from '@chartistry/renderer-canvas';

// Create the renderer once. It only touches the DOM/canvas when the chart
// mounts, so building it at module scope is safe during SSR.
const canvasRenderer = createCanvasRenderer();

const data = [
  { name: 'Mon', value: 32 },
  { name: 'Tue', value: 58 },
  { name: 'Wed', value: 41 },
  { name: 'Thu', value: 67 },
  { name: 'Fri', value: 49 },
  { name: 'Sat', value: 28 },
  { name: 'Sun', value: 24 },
];

/** The same chart API as everywhere else, but painted onto a <canvas> by passing
 * a different `renderer`. The scene graph — and the result — is identical. */
export default function CanvasRendererExample() {
  return (
    <Chart
      width={620}
      height={320}
      data={data}
      x={(d) => d.name}
      y={(d) => d.value}
      xScaleType="band"
      renderer={canvasRenderer}
      margin={{ top: 16, right: 24, bottom: 32, left: 40 }}
      title="Weekly visits (Canvas renderer)"
      description="The same bar chart, painted on an HTML canvas."
      xLabel="Day"
    >
      <Grid />
      <YAxis />
      <XAxis />
      <Bars fill="#0d9488" radius={4} />
      <Tooltip />
    </Chart>
  );
}
