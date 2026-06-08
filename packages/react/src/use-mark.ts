import { useEffect, useId } from 'react';
import type { SceneNode } from '@chartistry/core';
import { useChartContext } from './context';

/**
 * Register a scene node with the surrounding Chart and keep it in sync. Pass a
 * `null` node to contribute nothing (e.g. while data is empty). The node should
 * be memoized by the caller so registration only re-runs when it truly changes.
 */
export function useMark(node: SceneNode | null): void {
  const id = useId();
  const { store, requestPaint } = useChartContext();

  useEffect(() => {
    if (node) {
      store.set(id, node);
    } else {
      store.remove(id);
    }
    requestPaint();

    return () => {
      store.remove(id);
      requestPaint();
    };
  }, [id, node, store, requestPaint]);
}
