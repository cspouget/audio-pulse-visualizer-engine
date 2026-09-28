import * as THREE from 'three';

// Verified APV midnight-spectrum stops from the current rainbow design layer.
const STOPS = [
  new THREE.Color('#ff648e'),
  new THREE.Color('#ffb35c'),
  new THREE.Color('#efe773'),
  new THREE.Color('#59dbc5'),
  new THREE.Color('#57a8ff'),
  new THREE.Color('#aa79ff'),
  new THREE.Color('#ff75ce'),
];

export function setSpectralColor(target: THREE.Color, position: number): THREE.Color {
  const wrapped = ((position % 1) + 1) % 1;
  const scaled = wrapped * (STOPS.length - 1);
  const index = Math.min(STOPS.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  return target.copy(STOPS[index]).lerp(STOPS[index + 1], mix);
}

export const APV_MIDNIGHT = {
  background: '#070713',
  surface: '#101024',
  foreground: '#f7f5ff',
} as const;
