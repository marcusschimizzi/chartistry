import type { SceneNode } from '../scene/nodes';
import type { Size } from '../types';

/**
 * A renderer is the pluggable backend that turns a {@link SceneNode} tree into
 * pixels. Concrete renderers (SVG, Canvas, ...) live in their own packages and
 * implement this single factory contract, which is the only seam the core knows
 * about. Swap the factory, keep the chart spec — that is the whole point.
 */
export interface Renderer {
  /** Human-readable id, handy for debugging and tooling. */
  readonly name: string;
  /**
   * Attach to a host element and return a handle for painting frames. The
   * renderer owns whatever it creates inside `container` and must clean it up
   * on {@link RendererHandle.destroy}.
   */
  mount(container: HTMLElement, size: Size): RendererHandle;
}

export interface RendererHandle {
  /** Paint (or repaint) the given scene. Safe to call repeatedly. */
  render(scene: SceneNode): void;
  /** Update the drawing surface size, e.g. on container resize. */
  resize(size: Size): void;
  /** Tear down everything the renderer added to the host element. */
  destroy(): void;
}
