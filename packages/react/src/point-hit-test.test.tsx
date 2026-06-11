// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Bubbles } from './bubbles';
import { useChartContext } from './context';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
// jsdom has no PointerEvent; a MouseEvent typed as "pointermove" carries coords.
const movePointer = (el: HTMLElement, clientX: number, clientY: number) =>
  fireEvent(el, new MouseEvent('pointermove', { clientX, clientY, bubbles: true }));
afterEach(cleanup);

// Surfaces the active datum's value so a pointer move can be asserted.
function ActiveValue() {
  const { active } = useChartContext();
  return <div data-testid="active">{active ? String(active.points[0]?.value) : 'none'}</div>;
}

// Three points; B and C share an x, so x-only hit-testing can't tell them apart.
//   A → (0, 120)   B → (120, 120)   C → (120, 0)
const data = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
];

function renderScatter(hitTest: 'category' | 'point') {
  return render(
    <Chart
      width={120}
      height={120}
      margin={0}
      data={data}
      x={(d) => d.x}
      y={(d) => d.y}
      renderer={createSvgRenderer({ transition: false })}
      hitTest={hitTest}
      title="S"
    >
      <Bubbles />
      <ActiveValue />
    </Chart>,
  );
}

describe('point hit-testing', () => {
  it('resolves the nearest datum in 2D with hitTest="point"', async () => {
    const { container, getByTestId } = renderScatter('point');
    await flush();
    // Near the top-right point C, which shares its x with B at the bottom.
    movePointer(container.querySelector('[role="application"]') as HTMLElement, 115, 8);
    await flush();
    expect(getByTestId('active').textContent).toBe('10'); // C
  });

  it('resolves by the category axis only with the default hitTest', async () => {
    const { container, getByTestId } = renderScatter('category');
    await flush();
    // Same pointer: x-nearest is ambiguous between B and C, so it lands on B.
    movePointer(container.querySelector('[role="application"]') as HTMLElement, 115, 8);
    await flush();
    expect(getByTestId('active').textContent).toBe('0'); // B
  });
});
