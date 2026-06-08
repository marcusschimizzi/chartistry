import { useMemo, useState } from 'react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { createCanvasRenderer } from '@chartistry/renderer-canvas';
import {
  BarGroup,
  Chart,
  Crosshair,
  Grid,
  Highlight,
  Legend,
  Lines,
  LineSeries,
  Pie,
  Points,
  StackedBars,
  Tooltip,
  XAxis,
  YAxis,
  type ActivePoint,
} from '@chartistry/react';
import { categoryData, categorySeries, sampleSeries, sampleTimeSeries, shareData } from './data';

type RendererKind = 'svg' | 'canvas';
type ChartKind = 'area' | 'time' | 'multiline' | 'grouped' | 'stacked' | 'hbar' | 'pie';

const WIDTH = 720;
const HEIGHT = 420;
const MARGIN = { top: 16, right: 20, bottom: 32, left: 44 };
const HBAR_MARGIN = { top: 16, right: 20, bottom: 32, left: 56 };

const CHART_OPTIONS: ReadonlyArray<{ value: ChartKind; label: string }> = [
  { value: 'area', label: 'Area' },
  { value: 'time', label: 'Time series' },
  { value: 'multiline', label: 'Multi-line' },
  { value: 'grouped', label: 'Grouped bars' },
  { value: 'stacked', label: 'Stacked bars' },
  { value: 'hbar', label: 'Horizontal bars' },
  { value: 'pie', label: 'Pie / donut' },
];

const formatDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function App() {
  const [rendererKind, setRendererKind] = useState<RendererKind>('svg');
  const [chartKind, setChartKind] = useState<ChartKind>('grouped');
  const [points, setPoints] = useState(24);

  const lineData = useMemo(() => sampleSeries(points), [points]);
  const timeData = useMemo(() => sampleTimeSeries(Math.round(points * 1.5)), [points]);
  const donut = ((points - 4) / 116) * 0.75; // slider drives the donut hole
  const showSlider = chartKind === 'area' || chartKind === 'time' || chartKind === 'pie';

  // One renderer instance per kind; flipping it re-mounts the backend in place.
  const renderer = useMemo(
    () => (rendererKind === 'svg' ? createSvgRenderer() : createCanvasRenderer()),
    [rendererKind],
  );

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
        {showSlider && (
          <label className="slider">
            <span>
              {chartKind === 'time'
                ? `Days: ${Math.round(points * 1.5)}`
                : chartKind === 'pie'
                  ? `Donut: ${Math.round(donut * 100)}%`
                  : `Points: ${points}`}
            </span>
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

      <section className="stage" style={{ width: WIDTH }}>
        {/* key forces a clean re-mount of the renderer when the backend changes */}
        <ChartView
          key={`${chartKind}-${rendererKind}`}
          chartKind={chartKind}
          renderer={renderer}
          lineData={lineData}
          timeData={timeData}
          donut={donut}
        />
      </section>

      <footer className="meta">
        Rendering a <strong>{CHART_OPTIONS.find((o) => o.value === chartKind)?.label}</strong> chart
        through the <strong>{rendererKind.toUpperCase()}</strong> backend.
        {(chartKind === 'grouped' ||
          chartKind === 'stacked' ||
          chartKind === 'multiline' ||
          chartKind === 'hbar') && <> Click a legend item to toggle the series.</>}
      </footer>
    </main>
  );
}

interface ChartViewProps {
  chartKind: ChartKind;
  renderer: ReturnType<typeof createSvgRenderer>;
  lineData: ReturnType<typeof sampleSeries>;
  timeData: ReturnType<typeof sampleTimeSeries>;
  donut: number;
}

function ChartView({ chartKind, renderer, lineData, timeData, donut }: ChartViewProps) {
  if (chartKind === 'pie') {
    return (
      <Chart
        width={WIDTH}
        height={HEIGHT}
        data={shareData}
        x={(d) => d.name}
        y={(d) => d.value}
        renderer={renderer}
        title="Browser share"
        description="Share of page views by browser."
        xLabel="Browser"
      >
        <Pie innerRadius={donut} padAngle={0.015} label={(d) => (d as { name: string }).name} />
      </Chart>
    );
  }

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
        title="Area chart"
        description="A single metric across evenly spaced samples."
      >
        <Grid axis="y" />
        <YAxis />
        <XAxis />
        <LineSeries stroke="#6366f1" area />
        <Points radius={2.5} fill="#6366f1" />
        <Crosshair horizontal />
        <Highlight />
        <Tooltip />
      </Chart>
    );
  }

  if (chartKind === 'time') {
    return (
      <Chart
        width={WIDTH}
        height={HEIGHT}
        data={timeData}
        x={(d) => d.date}
        y={(d) => d.value}
        xScaleType="time"
        renderer={renderer}
        margin={MARGIN}
        title="Time series"
        description="A daily value over a date range."
        xLabel="Date"
      >
        <Grid axis="y" />
        <YAxis />
        <XAxis tickCount={6} />
        <LineSeries stroke="#6366f1" area />
        <Crosshair horizontal />
        <Highlight />
        <Tooltip>{(active) => <DateTooltip active={active} />}</Tooltip>
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
    xLabel: 'Quarter',
    description: 'Quarterly figures across desktop, mobile, and tablet.',
  };

  if (chartKind === 'grouped') {
    return (
      <Chart {...shared} bandPadding={0.25} title="Grouped bars">
        <Grid axis="y" />
        <YAxis />
        <XAxis />
        <BarGroup radius={3} groupPadding={0.15} />
        <Crosshair />
        <Tooltip />
        <Legend />
      </Chart>
    );
  }

  if (chartKind === 'stacked') {
    return (
      <Chart {...shared} stackY bandPadding={0.35} title="Stacked bars">
        <Grid axis="y" />
        <YAxis />
        <XAxis />
        <StackedBars radius={3} />
        <Crosshair />
        <Tooltip />
        <Legend />
      </Chart>
    );
  }

  if (chartKind === 'hbar') {
    return (
      <Chart
        {...shared}
        orientation="horizontal"
        bandPadding={0.25}
        margin={HBAR_MARGIN}
        title="Horizontal grouped bars"
      >
        {/* Value gridlines are vertical now; categories sit on the y axis. */}
        <Grid axis="x" />
        <YAxis />
        <XAxis />
        <BarGroup radius={3} groupPadding={0.15} />
        <Crosshair />
        <Tooltip />
        <Legend />
      </Chart>
    );
  }

  // multiline
  return (
    <Chart {...shared} bandPadding={0} title="Multi-line">
      <Grid axis="y" />
      <YAxis />
      <XAxis />
      <Lines strokeWidth={2.5} />
      <Crosshair horizontal />
      <Highlight />
      <Tooltip />
      <Legend />
    </Chart>
  );
}

function DateTooltip({ active }: { active: ActivePoint }) {
  const point = active.points[0];
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#f8fafc',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 12,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {formatDay.format(active.xValue as Date)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: point?.color,
            display: 'inline-block',
          }}
        />
        <span style={{ opacity: 0.85 }}>value</span>
        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{point?.value}</span>
      </div>
    </div>
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
