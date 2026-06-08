// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Pie } from './pie';

// Flush the microtask the Chart schedules to repaint.
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

// This jsdom lacks a PointerEvent constructor, so fireEvent.pointerMove would
// drop clientX. A MouseEvent typed as "pointermove" carries the coords and still
// triggers React's onPointerMove handler.
const movePointer = (el: HTMLElement, clientX: number, clientY: number) =>
  fireEvent(el, new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));

afterEach(cleanup);

describe('Pie', () => {
  it('renders one slice per datum even when categories repeat', async () => {
    // Two rows share the label "a"; a label-only key would collapse them.
    const data = [
      { name: 'a', v: 10 },
      { name: 'a', v: 20 },
      { name: 'b', v: 30 },
    ];

    const { container } = render(
      <Chart
        width={120}
        height={120}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        renderer={createSvgRenderer({ transition: false })}
        title="P"
      >
        <Pie />
      </Chart>,
    );
    await flush();

    // One <path> per slice — duplicate labels must not be diffed away.
    expect(container.querySelectorAll('path')).toHaveLength(3);
  });

  it('pops the slice under the pointer and resets on leave', async () => {
    // margin 0 puts the plot at the origin: a 120×120 pie centered at (60, 60).
    // Two equal slices → slice 0 is the right half [0, π].
    const data = [
      { name: 'a', v: 1 },
      { name: 'b', v: 1 },
    ];
    const { container } = render(
      <Chart
        width={120}
        height={120}
        margin={0}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        renderer={createSvgRenderer({ transition: false })}
        title="P"
      >
        <Pie activeOffset={8} />
      </Chart>,
    );
    await flush();

    const sliceA = () => container.querySelectorAll('path')[0] as SVGPathElement;
    const before = sliceA().getAttribute('d');

    // Point to the right of center, on the ring: lands in slice 0.
    const app = container.querySelector('[role="application"]') as HTMLElement;
    movePointer(app, 90, 60);
    await flush();
    // Slice 0 pops outward, so its path moves.
    expect(sliceA().getAttribute('d')).not.toBe(before);

    // Move the pointer off the plot: the pop releases.
    movePointer(app, 300, 300);
    await flush();
    expect(sliceA().getAttribute('d')).toBe(before);
  });

  it('misses the donut hole — no slice pops when the pointer is in the center', async () => {
    const data = [
      { name: 'a', v: 1 },
      { name: 'b', v: 1 },
    ];
    const { container } = render(
      <Chart
        width={120}
        height={120}
        margin={0}
        data={data}
        x={(d) => d.name}
        y={(d) => d.v}
        renderer={createSvgRenderer({ transition: false })}
        title="P"
      >
        <Pie innerRadius={0.5} activeOffset={8} />
      </Chart>,
    );
    await flush();

    const paths = () =>
      Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('d'));
    const before = paths();

    // Dead center is inside the donut hole — no slice should react.
    const app = container.querySelector('[role="application"]') as HTMLElement;
    movePointer(app, 60, 60);
    await flush();
    expect(paths()).toEqual(before);
  });
});
