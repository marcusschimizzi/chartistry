import { useMemo, useState } from 'react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { createCanvasRenderer } from '@chartistry/renderer-canvas';
import { Chart, Grid, LineSeries, Points, XAxis, YAxis } from '@chartistry/react';
import { sampleSeries } from './data';
import { VanillaChart } from './VanillaChart';

type RendererKind = 'svg' | 'canvas';
type ApiKind = 'react' | 'vanilla';

const WIDTH = 720;
const HEIGHT = 420;

export function App() {
  const [rendererKind, setRendererKind] = useState<RendererKind>('svg');
  const [api, setApi] = useState<ApiKind>('react');
  const [points, setPoints] = useState(24);

  const data = useMemo(() => sampleSeries(points), [points]);

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
          One composable chart spec. A framework-agnostic core. A pluggable renderer. Flip the
          backend and the API below &mdash; the chart stays the same.
        </p>
      </header>

      <section className="controls">
        <Toggle
          label="Renderer"
          value={rendererKind}
          options={[
            { value: 'svg', label: 'SVG' },
            { value: 'canvas', label: 'Canvas' },
          ]}
          onChange={setRendererKind}
        />
        <Toggle
          label="API"
          value={api}
          options={[
            { value: 'react', label: 'React adapter' },
            { value: 'vanilla', label: 'Vanilla core' },
          ]}
          onChange={setApi}
        />
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
      </section>

      <section className="stage" style={{ width: WIDTH, height: HEIGHT }}>
        {api === 'react' ? (
          <Chart
            key={rendererKind /* force a clean re-mount when the backend changes */}
            width={WIDTH}
            height={HEIGHT}
            data={data}
            x={(d) => d.x}
            y={(d) => d.y}
            renderer={renderer}
            margin={{ top: 16, right: 20, bottom: 32, left: 44 }}
          >
            <Grid axis="y" />
            <YAxis />
            <XAxis />
            <LineSeries stroke="#6366f1" area />
            <Points radius={2.5} fill="#6366f1" />
          </Chart>
        ) : (
          <VanillaChart
            key={rendererKind}
            data={data}
            renderer={renderer}
            width={WIDTH}
            height={HEIGHT}
          />
        )}
      </section>

      <footer className="meta">
        Rendering <strong>{rendererKind.toUpperCase()}</strong> via the{' '}
        <strong>{api === 'react' ? '@chartistry/react' : '@chartistry/core'}</strong> API.
      </footer>
    </main>
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
