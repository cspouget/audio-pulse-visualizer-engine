import * as THREE from 'three';
import type { ReactiveState, VisualizerOptions } from '../types';

export interface VisualizerEnvironment {
  readonly renderer: THREE.WebGLRenderer;
  update(state: ReactiveState, dt: number): void;
  resize(width: number, height: number, pixelRatio?: number): void;
  setOptions(options: Partial<VisualizerOptions>): void;
  dispose(): void;
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material?.dispose?.();
  });
}
