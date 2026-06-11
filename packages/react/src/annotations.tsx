import { useMemo } from 'react';
import {
  annotationMark,
  group,
  referenceBandMark,
  referenceLineMark,
  type MarkLabel,
  type Scale,
} from '@chartistry/core';
import { useChartContext, type XValue } from './context';
import { useMark } from './use-mark';

const PAD = 4;

// Map a (category value, numeric value) pair to plot pixels, honoring orientation.
function toPixel(
  categoryScale: Scale<XValue>,
  valueScale: (v: number) => number,
  horizontal: boolean,
  category: XValue,
  value: number,
): { x: number; y: number } {
  const c = categoryScale(category) + categoryScale.bandwidth() / 2;
  const v = valueScale(value);
  return horizontal ? { x: v, y: c } : { x: c, y: v };
}

export interface ReferenceLineProps {
  /** A value on the value axis — e.g. a threshold or target. */
  y?: number;
  /** A position on the category/x axis. */
  x?: XValue;
  label?: string;
  color?: string;
  strokeWidth?: number;
  strokeDash?: number[];
}

/** A straight reference line across the plot at a value or category position. */
export function ReferenceLine(props: ReferenceLineProps): null {
  const { categoryScale, valueScale, plot, orientation } = useChartContext();
  const { y, x, label, color, strokeWidth, strokeDash } = props;
  const horizontal = orientation === 'horizontal';

  const node = useMemo(() => {
    // A value line runs across the category axis; a category line across values.
    // `along` is true when the line lies along the plot's x extent (horizontal).
    let pos: number;
    let along: boolean;
    if (y !== undefined) {
      pos = valueScale(y);
      along = horizontal; // value axis is x when horizontal → the line is vertical
    } else if (x !== undefined) {
      pos = categoryScale(x) + categoryScale.bandwidth() / 2;
      along = !horizontal;
    } else {
      return group([], { key: 'reference-line' });
    }

    const coords = along
      ? { x1: pos, y1: 0, x2: pos, y2: plot.height }
      : { x1: 0, y1: pos, x2: plot.width, y2: pos };

    let markLabel: MarkLabel | undefined;
    if (label) {
      markLabel = along
        ? { text: label, x: pos + PAD, y: PAD, align: 'left', baseline: 'top', color }
        : { text: label, x: plot.width - PAD, y: pos - PAD, align: 'right', baseline: 'bottom', color };
    }
    return referenceLineMark({ ...coords, label: markLabel, color, strokeWidth, strokeDash });
  }, [y, x, label, color, strokeWidth, strokeDash, categoryScale, valueScale, plot.width, plot.height, horizontal]);

  useMark(node);
  return null;
}

export interface ReferenceBandProps {
  /** A value range [lo, hi] — e.g. a target band. */
  y?: [number, number];
  /** A category/x range [from, to]. */
  x?: [XValue, XValue];
  label?: string;
  fill?: string;
  opacity?: number;
}

/** A shaded reference band spanning a value range or a category range. */
export function ReferenceBand(props: ReferenceBandProps): null {
  const { categoryScale, valueScale, plot, orientation } = useChartContext();
  const { y, x, label, fill, opacity } = props;
  const horizontal = orientation === 'horizontal';

  const node = useMemo(() => {
    // Resolve the band's two edges to pixels along its axis.
    let lo: number;
    let hi: number;
    let along: boolean; // true when the band's extent runs along the plot's x
    if (y) {
      const a = valueScale(y[0]);
      const b = valueScale(y[1]);
      lo = Math.min(a, b);
      hi = Math.max(a, b);
      along = horizontal;
    } else if (x) {
      const a = categoryScale(x[0]) + categoryScale.bandwidth() / 2;
      const b = categoryScale(x[1]) + categoryScale.bandwidth() / 2;
      lo = Math.min(a, b);
      hi = Math.max(a, b);
      along = !horizontal;
    } else {
      return group([], { key: 'reference-band' });
    }

    const box = along
      ? { x: lo, y: 0, width: hi - lo, height: plot.height }
      : { x: 0, y: lo, width: plot.width, height: hi - lo };
    const markLabel: MarkLabel | undefined = label
      ? { text: label, x: box.x + PAD, y: box.y + PAD, align: 'left', baseline: 'top' }
      : undefined;
    return referenceBandMark({ ...box, fill, opacity, label: markLabel });
  }, [y, x, label, fill, opacity, categoryScale, valueScale, plot.width, plot.height, horizontal]);

  useMark(node);
  return null;
}

export interface AnnotationProps {
  /** The data point to annotate: category/x and value/y. */
  x: XValue;
  y: number;
  label: string;
  /** Callout offset from the point, in pixels. Defaults to (8, -20). */
  dx?: number;
  dy?: number;
  color?: string;
  /** Marker radius; 0 to omit the dot. */
  radius?: number;
}

/** A point callout: a marker, a connector, and a label at a data point. */
export function Annotation(props: AnnotationProps): null {
  const { categoryScale, valueScale, orientation } = useChartContext();
  const { x, y, label, color, radius } = props;
  const horizontal = orientation === 'horizontal';
  const dx = props.dx ?? 8;
  const dy = props.dy ?? -20;

  const node = useMemo(() => {
    const point = toPixel(categoryScale, valueScale, horizontal, x, y);
    const align = dx >= 0 ? 'left' : 'right';
    const markLabel: MarkLabel = {
      text: label,
      x: point.x + dx + (dx >= 0 ? 2 : -2),
      y: point.y + dy,
      align,
      baseline: 'middle',
      color,
    };
    return annotationMark({ x: point.x, y: point.y, dx, dy, label: markLabel, color, radius });
  }, [x, y, label, dx, dy, color, radius, categoryScale, valueScale, horizontal]);

  useMark(node);
  return null;
}
