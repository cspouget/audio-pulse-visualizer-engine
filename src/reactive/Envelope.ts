export class Envelope {
  private value = 0;
  private velocity = 0;

  constructor(
    private readonly attack = 0.08,
    private readonly hold = 0.12,
    private readonly decay = 0.22,
    private readonly release = 0.28,
    private readonly threshold = 0.12,
    private readonly gain = 1,
  ) {}

  update(input: number, dt: number) {
    const gate = Math.max(0, input - this.threshold) * this.gain;
    const target = gate;
    const attackSpeed = 1 / Math.max(0.01, this.attack);
    const releaseSpeed = 1 / Math.max(0.02, this.release);

    if (gate > this.value) {
      this.velocity += (target - this.value) * attackSpeed * dt;
    } else {
      this.velocity -= (this.value - target) * releaseSpeed * dt;
    }

    this.velocity *= 0.86;
    this.value += this.velocity * dt;
    this.value = Math.min(1, Math.max(0, this.value));

    return this.value;
  }
}
