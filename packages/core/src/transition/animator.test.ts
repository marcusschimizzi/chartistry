import { describe, expect, it } from 'vitest';
import { createAnimator } from './animator';
import { group, rect, type GroupNode, type RectNode, type SceneNode } from '../scene/nodes';

/** A manual clock + frame queue so transitions can be stepped deterministically. */
function harness() {
  let time = 0;
  let queue: Array<() => void> = [];
  return {
    now: () => time,
    requestFrame: (cb: () => void) => queue.push(cb),
    cancelFrame: () => {},
    /** Advance the clock and run the frames that were scheduled. */
    step(dt: number) {
      time += dt;
      const due = queue;
      queue = [];
      for (const cb of due) cb();
    },
  };
}

const findRect = (scene: SceneNode, key: string): RectNode => {
  const child = (scene as GroupNode).children.find((c) => c.key === key);
  if (!child || child.type !== 'rect') throw new Error(`rect ${key} not found`);
  return child;
};

const bars = (heights: number[]) =>
  group(
    heights.map((h, i) =>
      rect({ key: `b${i}`, x: i * 10, y: 100 - h, width: 8, height: h, fill: '#000' }),
    ),
    { key: 'root' },
  );

describe('createAnimator', () => {
  it('emits the final scene immediately when duration is 0', () => {
    const frames: SceneNode[] = [];
    const animator = createAnimator({ duration: 0, onFrame: (s) => frames.push(s) });

    animator.commit(bars([40]));
    expect(frames).toHaveLength(1);
    expect(findRect(frames[0]!, 'b0').height).toBe(40);
    expect(findRect(frames[0]!, 'b0').opacity).toBe(1);
  });

  it('fades a subtree in on enter without moving its geometry', () => {
    const h = harness();
    const frames: SceneNode[] = [];
    const animator = createAnimator({
      duration: 100,
      easing: (t) => t, // linear, for predictable assertions
      onFrame: (s) => frames.push(s),
      now: h.now,
      requestFrame: h.requestFrame,
      cancelFrame: h.cancelFrame,
    });

    animator.commit(bars([40]));
    // Synchronous first frame: geometry final, the root group fades from 0.
    expect((frames.at(-1) as GroupNode).opacity).toBe(0);
    expect(findRect(frames.at(-1)!, 'b0').height).toBe(40);

    h.step(50);
    expect((frames.at(-1) as GroupNode).opacity).toBeCloseTo(0.5);

    h.step(50);
    expect((frames.at(-1) as GroupNode).opacity).toBe(1);
  });

  it('tweens geometry on update', () => {
    const h = harness();
    const frames: SceneNode[] = [];
    const animator = createAnimator({
      duration: 100,
      easing: (t) => t,
      onFrame: (s) => frames.push(s),
      now: h.now,
      requestFrame: h.requestFrame,
      cancelFrame: h.cancelFrame,
    });

    animator.commit(bars([40]));
    h.step(100); // settle the enter
    animator.commit(bars([80]));

    h.step(50);
    const mid = findRect(frames.at(-1)!, 'b0').height;
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(80);
    expect(mid).toBeCloseTo(60);

    h.step(50);
    expect(findRect(frames.at(-1)!, 'b0').height).toBe(80);
  });

  it('keeps an exiting node in the scene until it has faded, then drops it', () => {
    const h = harness();
    const frames: SceneNode[] = [];
    const animator = createAnimator({
      duration: 100,
      easing: (t) => t,
      onFrame: (s) => frames.push(s),
      now: h.now,
      requestFrame: h.requestFrame,
      cancelFrame: h.cancelFrame,
    });

    animator.commit(bars([40, 60]));
    h.step(100);

    animator.commit(bars([40])); // drop b1
    // Still present mid-exit, fading.
    h.step(50);
    const exiting = findRect(frames.at(-1)!, 'b1');
    expect(exiting.opacity).toBeCloseTo(0.5);

    // Gone once the fade completes.
    h.step(60);
    expect((frames.at(-1) as GroupNode).children.some((c) => c.key === 'b1')).toBe(false);
  });

  it('honors animate:false by snapping instead of tweening', () => {
    const h = harness();
    const frames: SceneNode[] = [];
    const animator = createAnimator({
      duration: 100,
      onFrame: (s) => frames.push(s),
      now: h.now,
      requestFrame: h.requestFrame,
      cancelFrame: h.cancelFrame,
    });

    const snap = group([rect({ key: 'g', x: 0, y: 0, width: 4, height: 10, fill: '#000' })], {
      key: 'root',
      animate: false,
    });
    animator.commit(snap);
    // No fade: the group is fully opaque on the very first frame.
    expect((frames.at(-1) as GroupNode).opacity).toBe(1);
  });
});
