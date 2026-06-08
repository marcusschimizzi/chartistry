import { useMemo, useState } from 'react';
import { categoricalColors } from '@chartistry/core';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { createCanvasRenderer } from '@chartistry/renderer-canvas';
import {
  BarGroup,
  Chart,
  Grid,
  Lines,
  LineSeries,
  Points,
  StackedBars,
  XAxis,
  YAxis,
} from '@chartistry/react';
import { categoryData, categorySeries, sampleSeries } from './data';

type RendererKind = 'svg' | 'canvas';
type ChartKind = 'area' | 'multiline' | 'grouped' | 'stacked';

const WIDTH = 720;
const HEIGHT = 420;
const MARGIN = { top: 16, right: 20, bottom: 32, left: 44 };

const CHART_OPTIONS: ReadonlyArray<{ value: ChartKind; label: string }> = [
  { value: 'area', label: 'Area' },
  { value: 'multiline', label: 'Multi-line' },
  { value: 'grouped', label: 'Grouped bars' },
  { value: 'stacked', label: 'Stacked bars' },
];

export function App() {
  const [rendererKind, setRendererKind] = useState<RendererKind>('svg');
  const [chartKind, setChartKind] = useState<ChartKind>('grouped');
  const [points, setPoints] = useState(24);

  const lineData = useMemo(() => sampleSeries(points), [points]);

  // One renderer instance per kind; flipping it re-mounts the backend in place.
  const renderer = useMemo(
    () => (rendererKind === 'svg' ? createSvgRenderer() : createCanvasRenderer()),
    [rendererKind],
  );

  const isMultiSeries = chartKind !== 'area';

  return (
    <main className="app">
      <header className="hero">
        <h1>
          chart<span>istry</span>
        </h1>
        <p>
          One composable chart spec. A framework-agnostic core. A pluggable renderer. Switch chart
          types and flip the backend below &mdash; every mark is built from the same scene graph.
        </p>
      </header>

      <section className="controls">
        <Toggle label="Chart" value={chartKind} options={CHART_OPTIONS} onChange={setChartKind} />
        <Toggle
          label="Renderer"
          value={rendererKind}
          options={[
            { value: 'svg', label: 'SVG' },
            { value: 'canvas', label: 'Canvas' },
          ]}
          onChange={setRendererKind}
        />
        {chartKind === 'area' && (
          <label className="slider">
            <span>Points: {points}</span>
            <input
              type="range"
              min={4}
              max={120}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </label>
        )}
      </section>

      <section className="stage" style={{ width: WIDTH, height: HEIGHT }}>
        {/* key forces a clean re-mount of the renderer when the backend changes */}
        <ChartView
          key={`${chartKind}-${rendererKind}`}
          chartKind={chartKind}
          renderer={renderer}
          lineData={lineData}
        />
      </section>

      {isMultiSeries && <Legend keys={categorySeries.map((s) => s.key)} />}

      <footer className="meta">
        Rendering a <strong>{CHART_OPTIONS.find((o) => o.value === chartKind)?.label}</strong> chart
        through the <strong>{rendererKind.toUpperCase()}</strong> backend.
      </footer>
    </main>
  );
}

interface ChartViewProps {
  chartKind: ChartKind;
  renderer: ReturnType<typeof createSvgRenderer>;
  lineData: ReturnType<typeof sampleSeries>;
}

function ChartView({ chartKind, renderer, lineData }: ChartViewProps) {
  if (chartKind === 'area') {
    return (
      <Chart
        width={WIDTH}
        height={HEIGHT}
        data={lineData}
        x={(d) => d.x}
        y={(d) => d.y}
        renderer={renderer}
        margin={MARGIN}
      >
        <Grid axis="y" />
        <YAxis />
        <XAxis />
        <LineSeries stroke="#6366f1" area />
        <Points radius={2.5} fill="#6366f1" />
      </Chart>
    );
  }

  const shared = {
    width: WIDTH,
    height: HEIGHT,
    data: categoryData,
    x: (d: (typeof categoryData)[number]) => d.quarter,
    xScaleType: 'band' as const,
    series: categorySeries,
    renderer,
    margin: MARGIN,
  };

  if (chartKind === 'grouped') {
    return (
      <Chart {...shared} bandPadding={0.25}>
        <Grid axis="y" />
        <YAxis />
        <XAxis />
        <BarGroup radius={3} groupPadding={0.15} />
      </Chart>
    );
  }

  if (chartKind === 'stacked') {
    return (
      <Chart {...shared} stackY bandPadding={0.35}>
        <Grid axis="y" />
        <YAxis />
        <XAxis />
        <StackedBars radius={3} />
      </Chart>
    );
  }

  // multiline
  return (
    <Chart {...shared} bandPadding={0}>
      <Grid axis="y" />
      <YAxis />
      <XAxis />
      <Lines strokeWidth={2.5} />
    </Chart>
  );
}

function Legend({ keys }: { keys: string[] }) {
  return (
    <ul className="legend">
      {keys.map((key, i) => (
        <li key={key}>
          <span
            className="legend__swatch"
            style={{ background: categoricalColors[i % categoricalColors.length] }}
          />
          {key}
        </li>
      ))}
    </ul>
  );
}

interface ToggleProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function Toggle<T extends string>({ label, value, options, onChange }: ToggleProps<T>) {
  return (
    <div className="toggle">
      <span className="toggle__label">{label}</span>
      <div className="toggle__buttons">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? 'is-active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
