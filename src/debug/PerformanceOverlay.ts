import type { ReactiveState } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class PerformanceOverlay {
  public readonly element = document.createElement('div');

  private readonly meters: Record<string, { label: string; value: number }> = {
    SUB: { label: 'SUB', value: 0 },
    BASS: { label: 'BASS', value: 0 },
    MIDS: { label: 'MIDS', value: 0 },
    HIGHS: { label: 'HIGHS', value: 0 },
    RMS: { label: 'RMS', value: 0 },
    TRANSIENT: { label: 'TRANSIENT', value: 0 },
    KICK: { label: 'KICK', value: 0 },
    SNARE: { label: 'SNARE', value: 0 },
    ENERGY: { label: 'ENERGY', value: 0 },
    DROP: { label: 'DROP', value: 0 },
    FPS: { label: 'FPS', value: 0 },
  };

  constructor() {
    this.element.className = 'debug-overlay';
    this.element.innerHTML = `
      <div class="debug-header">
        <span>APV</span>
        <span>debug</span>
      </div>
    `;

    for (const key of Object.keys(this.meters)) {
      const row = document.createElement('div');
      row.className = 'debug-row';
      row.innerHTML = `
        <span>${key}</span>
        <div class="debug-bar"><div class="debug-fill"></div></div>
        <span class="debug-value">0.00</span>
      `;
      row.dataset.metric = key;
      this.element.appendChild(row);
    }

    const note = document.createElement('div');
    note.className = 'debug-note';
    note.textContent = 'Audio > force > motion > environment';
    this.element.appendChild(note);
  }

  update(state: ReactiveState) {
    const rows = this.element.querySelectorAll('.debug-row');

    const data = {
      SUB: state.reactivity.sub,
      BASS: state.reactivity.bass,
      MIDS: state.reactivity.mid,
      HIGHS: state.reactivity.high,
      RMS: state.energy.smoothed,
      TRANSIENT: state.events.transient,
      KICK: state.events.kick,
      SNARE: state.events.snare,
      ENERGY: state.energy.smoothed,
      DROP: state.events.drop,
      FPS: state.fps / 60,
    };

    rows.forEach((row) => {
      const key = row.getAttribute('data-metric');
      if (!key) {
        return;
      }

      const value = data[key as keyof typeof data] ?? 0;
      const fill = row.querySelector('.debug-fill') as HTMLDivElement | null;
      const display = row.querySelector('.debug-value') as HTMLSpanElement | null;

      if (fill) {
        fill.style.width = `${clamp(value) * 100}%`;
      }

      if (display) {
        display.textContent = value.toFixed(2);
      }
    });
  }
}
