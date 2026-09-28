import assert from 'node:assert/strict';
import { ReactiveBus } from '../dist/index.js';

const frame = (overrides = {}) => ({
  sub: 0.02,
  bass: 0.02,
  lowMid: 0.02,
  mid: 0.02,
  highMid: 0.02,
  high: 0.02,
  overallRms: 0.02,
  peak: 0.03,
  spectralEnergy: 0.02,
  transient: 0.02,
  kickLikelihood: 0.02,
  snareLikelihood: 0.02,
  onsetStrength: 0.02,
  ...overrides,
});

function run(bus, frames, dt = 1 / 60) {
  let state;
  for (const item of frames) state = bus.update(item, dt);
  return state;
}

const quietBus = new ReactiveBus();
const quiet = run(quietBus, Array.from({ length: 90 }, () => frame()));
assert.ok(quiet.events.quiet > 0.5, `quiet detector too weak: ${quiet.events.quiet}`);
assert.ok(quiet.motion.impact < 0.45, `quiet impact too high: ${quiet.motion.impact}`);

const bassBus = new ReactiveBus();
run(bassBus, Array.from({ length: 20 }, () => frame({ overallRms: 0.08, spectralEnergy: 0.08 })));
const bass = run(bassBus, [
  frame({
    sub: 0.92, bass: 0.82, lowMid: 0.34, mid: 0.18, highMid: 0.12, high: 0.08,
    overallRms: 0.72, peak: 0.92, spectralEnergy: 0.58, transient: 0.72,
    kickLikelihood: 0.95, snareLikelihood: 0.2, onsetStrength: 0.82,
  }),
]);
assert.ok(bass.events.kick > 0.55, `kick detector too weak: ${bass.events.kick}`);
assert.ok(bass.motion.pressure > bass.motion.shimmer, 'bass profile should create more pressure than shimmer');

const transitionBus = new ReactiveBus();
const buildupFrames = [];
for (let i = 0; i < 90; i += 1) {
  const t = i / 89;
  buildupFrames.push(frame({
    sub: 0.08 + t * 0.18,
    bass: 0.12 + t * 0.22,
    lowMid: 0.14 + t * 0.22,
    mid: 0.18 + t * 0.32,
    highMid: 0.2 + t * 0.48,
    high: 0.18 + t * 0.5,
    overallRms: 0.18 + t * 0.36,
    peak: 0.26 + t * 0.38,
    spectralEnergy: 0.2 + t * 0.42,
    transient: 0.14 + t * 0.28,
    kickLikelihood: 0.16 + t * 0.2,
    snareLikelihood: 0.18 + t * 0.34,
    onsetStrength: 0.18 + t * 0.38,
  }));
}
const buildup = run(transitionBus, buildupFrames);
assert.ok(buildup.events.buildup > 0.2, `buildup detector too weak: ${buildup.events.buildup}`);

const drop = run(transitionBus, [
  frame({
    sub: 0.98, bass: 0.94, lowMid: 0.7, mid: 0.62, highMid: 0.55, high: 0.48,
    overallRms: 0.94, peak: 1, spectralEnergy: 0.88, transient: 0.94,
    kickLikelihood: 1, snareLikelihood: 0.68, onsetStrength: 0.95,
  }),
]);
assert.ok(drop.events.drop > 0.6, `drop detector too weak: ${drop.events.drop}`);
assert.ok(drop.motion.impact > quiet.motion.impact + 0.25, 'drop should create materially more impact than quiet passage');

console.log(JSON.stringify({
  quiet: { quiet: quiet.events.quiet, impact: quiet.motion.impact },
  bass: { kick: bass.events.kick, pressure: bass.motion.pressure, shimmer: bass.motion.shimmer },
  buildup: { buildup: buildup.events.buildup },
  drop: { drop: drop.events.drop, impact: drop.motion.impact },
}, null, 2));
