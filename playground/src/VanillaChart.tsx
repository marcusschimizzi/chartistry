import { useEffect, useRef } from 'react';
import {
  axisBottom,
  axisLeft,
  createChart,
  extent,
  gridMark,
  lineMark,
  linearScale,
  pointMark,
  type Renderer,
} from '@chartistry/core';
import type { Datum } from './data';

interface VanillaChartProps {
  data: Datum[];
  renderer: Renderer;
  width: number;
  height: number;
}

/**
 * The pure-core path: no framework components, just the framework-agnostic API
 * building a scene and handing it to whichever renderer is passed in. This is
 * exactly how someone would use Chartistry from plain JS, Vue, Svelte, etc.
 */
export function VanillaChart({ data, renderer, width, height }: VanillaChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = createChart({
      width,
      height,
      margin: { top: 16, right: 20, bottom: 32, left: 44 },
    });
    const xScale = linearScale({
      domain: extent(data.map((d) => d.x)),
      range: [0, chart.plot.width],
    });
    const yScale = linearScale({
      domain: extent(data.map((d) => d.y)),
      range: [chart.plot.height, 0],
      nice: true,
    });

    const scene = chart.compose([
      gridMark({ scale: yScale, axis: 'y', length: chart.plot.width }),
      axisLeft({ scale: yScale }),
      axisBottom({ scale: xScale, offset: chart.plot.height }),
      lineMark({
        data,
        x: (d) => d.x,
        y: (d) => d.y,
        xScale,
        yScale,
        stroke: '#6366f1',
        area: true,
      }),
      pointMark({
        data,
        x: (d) => d.x,
        y: (d) => d.y,
        xScale,
        yScale,
        fill: '#6366f1',
        radius: 2.5,
      }),
    ]);

    const handle = renderer.mount(host, chart.size);
    handle.render(scene);
    return () => handle.destroy();
  }, [data, renderer, width, height]);

  return <div ref={hostRef} />;
}
