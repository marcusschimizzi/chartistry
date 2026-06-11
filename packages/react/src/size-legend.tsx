import { useMemo } from 'react';
import { group, sizeLegendMark } from '@chartistry/core';
import { useChartContext } from './context';
import { useMark } from './use-mark';
import { sizeScaleFromData } from './size-scale';

const defaultFormat = (value: number): string => String(value);

export interface SizeLegendProps {
  /** The same `size` accessor passed to <Bubbles>. */
  size: (datum: unknown, index: number) => number;
  /** The same `sizeRange` as <Bubbles>. Defaults to [3, 24]. */
  sizeRange?: [number, number];
  /** The same `sizeDomain` as <Bubbles>, if any. */
  sizeDomain?: [number, number];
  /** Representative values to show. Defaults to a few nice values across the domain. */
  values?: number[];
  /** Format a value label. */
  format?: (value: number) => string;
  title?: string;
  /** Which plot corner to anchor in. Defaults to 'bottom-right'. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Distance from the plot edge, in pixels. Defaults to 8. */
  padding?: number;
  /** Circle fill (default outline-only) and outline color. */
  fill?: string;
  stroke?: string;
}

/**
 * A bubble-size legend: nested circles at representative values, decoding what
 * bubble area means. It must be given the same `size`/`sizeRange`/`sizeDomain`
 * as the `<Bubbles>` it explains, so the two share an identical size scale.
 */
export function SizeLegend(props: SizeLegendProps): null {
  const { data, plot } = useChartContext();
  const {
    size,
    sizeRange = [3, 24],
    sizeDomain,
    values,
    format = defaultFormat,
    title,
    position = 'bottom-right',
    padding = 8,
    fill,
    stroke,
  } = props;

  const node = useMemo(() => {
    const scale = sizeScaleFromData(data, size, sizeRange, sizeDomain);
    const shown = values ?? scale.ticks(4).filter((v) => v > 0);
    if (shown.length === 0) return group([], { key: 'size-legend' });

    const entries = shown.map((v) => ({ radius: scale(v), label: format(v) }));
    const fontSize = 11;
    const maxRadius = Math.max(...entries.map((e) => e.radius));
    const titleHeight = title ? fontSize + 6 : 0;
    // Estimate the box so corner placement keeps the legend inside the plot.
    const widestLabel = Math.max(...entries.map((e) => e.label.length), title?.length ?? 0);
    const boxWidth = 2 * maxRadius + 8 + widestLabel * fontSize * 0.6;
    const boxHeight = titleHeight + 2 * maxRadius;
    const x = position.endsWith('right') ? plot.width - boxWidth - padding : padding;
    const y = position.startsWith('bottom') ? plot.height - boxHeight - padding : padding;

    return sizeLegendMark({ entries, x, y, title, fill, stroke, fontSize, key: 'size-legend' });
  }, [
    data,
    size,
    sizeRange,
    sizeDomain,
    values,
    format,
    title,
    position,
    padding,
    plot.width,
    plot.height,
    fill,
    stroke,
  ]);

  useMark(node);
  return null;
}
