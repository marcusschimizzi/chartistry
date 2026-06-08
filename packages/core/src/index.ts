/**
 * @chartistry/core — the framework-agnostic, renderer-pluggable core.
 *
 * Pipeline: scales map data → pixels, marks emit a scene graph, a chart
 * composes marks into one scene, and a Renderer (from a separate package)
 * paints that scene. Nothing here touches the DOM or any UI framework.
 */
export * from './types';
export * from './scene';
export * from './renderer';
export * from './scales';
export * from './data';
export * from './marks';
export * from './chart';
