// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createSvgRenderer } from '@chartistry/renderer-svg';
import { Chart } from './Chart';
import { Pie } from './pie';

// Flush the microtask the Chart schedules to repaint.
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

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
});
