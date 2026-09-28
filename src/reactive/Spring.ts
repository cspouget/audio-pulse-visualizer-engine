export class Spring {
  private value = 0;
  private velocity = 0;

  constructor(
    private readonly stiffness = 38,
    private readonly damping = 12,
  ) {}

  update(target: number, dt: number) {
    const force = (target - this.value) * this.stiffness;
    this.velocity += force * dt;
    this.velocity *= Math.max(0, 1 - this.damping * dt * 0.05);
    this.value += this.velocity * dt;
    return this.value;
  }

  getValue() {
    return this.value;
  }
}
