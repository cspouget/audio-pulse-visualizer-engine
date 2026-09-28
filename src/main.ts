import './styles.css';
import * as THREE from 'three';
import { AudioAnalyzer } from './audio/AudioAnalyzer';
import { ReactiveBus } from './reactive/ReactiveBus';
import { VoidEnvironment } from './visualizers/VoidEnvironment';
import { PerformanceOverlay } from './debug/PerformanceOverlay';

async function boot() {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const audioAnalyzer = new AudioAnalyzer();
  const reactiveBus = new ReactiveBus();
  const overlay = new PerformanceOverlay();
  const environment = new VoidEnvironment();

  app.appendChild(environment.renderer.domElement);
  app.appendChild(overlay.element);

  try {
    await audioAnalyzer.initFromMicrophone();
  } catch {
    audioAnalyzer.startDemoSource();
  }

  const clock = new THREE.Clock();

  const animate = () => {
    const dt = Math.min(clock.getDelta(), 0.032);
    const analysis = audioAnalyzer.update();
    const state = reactiveBus.update(analysis, dt);

    environment.update(state, dt);
    overlay.update(state);

    requestAnimationFrame(animate);
  };

  animate();
}

void boot();
