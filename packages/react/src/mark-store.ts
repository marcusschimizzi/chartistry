import type { SceneNode } from '@chartistry/core';

/**
 * An ordered registry of marks contributed by child components. Children write
 * their current scene node here; the Chart reads them (in registration order,
 * which mirrors JSX order and therefore z-order) to compose a frame.
 *
 * Registration is deliberately decoupled from React state: updating the store
 * does not trigger a React re-render. Instead it asks the Chart to repaint
 * imperatively, which keeps the renderer pluggable and avoids feedback loops
 * between rendering the spec and painting it.
 */
export class MarkStore {
  private readonly marks = new Map<string, SceneNode>();
  private order: string[] = [];

  set(id: string, node: SceneNode): void {
    if (!this.marks.has(id)) this.order.push(id);
    this.marks.set(id, node);
  }

  remove(id: string): void {
    if (this.marks.delete(id)) {
      this.order = this.order.filter((entry) => entry !== id);
    }
  }

  /** Marks in registration order, ready to hand to `chart.compose`. */
  nodes(): SceneNode[] {
    const result: SceneNode[] = [];
    for (const id of this.order) {
      const node = this.marks.get(id);
      if (node) result.push(node);
    }
    return result;
  }
}
