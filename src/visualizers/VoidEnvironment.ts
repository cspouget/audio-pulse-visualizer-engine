import * as THREE from 'three';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class VoidEnvironment {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
  private readonly root = new THREE.Group();
  private readonly ringGroup = new THREE.Group();

  public readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

  private geometry: THREE.IcosahedronGeometry;
  private shell: THREE.Mesh;
  private halo: THREE.Mesh;
  private particles: THREE.Points;

  constructor() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new THREE.Color('#050a12'));

    this.scene.add(this.root);
    this.root.add(this.ringGroup);

    this.camera.position.set(0, 0.5, 7);

    const ambient = new THREE.AmbientLight('#8ab0ff', 0.8);
    const keyLight = new THREE.DirectionalLight('#c7d7ff', 2.1);
    keyLight.position.set(4, 4, 6);

    this.scene.add(ambient, keyLight);

    this.geometry = new THREE.IcosahedronGeometry(1.7, 2);
    const material = new THREE.MeshStandardMaterial({
      color: '#8a7dff',
      emissive: '#1d2b5c',
      metalness: 0.5,
      roughness: 0.28,
      transparent: true,
      opacity: 0.92,
    });

    this.shell = new THREE.Mesh(this.geometry, material);
    this.root.add(this.shell);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: '#67e8f9',
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });

    this.halo = new THREE.Mesh(new THREE.TorusKnotGeometry(2.2, 0.35, 140, 24), haloMaterial);
    this.halo.rotation.x = Math.PI / 2.4;
    this.root.add(this.halo);

    const particleGeometry = new THREE.BufferGeometry();
    const particlesCount = 1200;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: '#d9e7ff',
      size: 0.045,
      transparent: true,
      opacity: 0.8,
    });
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);

    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(state: any, dt: number) {
    const { reactivity, energy, motion, events } = state;

    this.shell.rotation.x += dt * (0.4 + reactivity.mid * 2.1);
    this.shell.rotation.y += dt * (0.8 + reactivity.highMid * 1.5);
    this.shell.scale.setScalar(1 + reactivity.bass * 1.2 + reactivity.sub * 0.6);
    this.shell.position.z = -0.3 + motion.impact * 1.8;

    this.halo.scale.setScalar(1 + motion.pressure * 1.2 + energy.smoothed * 0.8);
    this.halo.rotation.z += dt * (0.3 + motion.flow * 2.2);

    this.particles.rotation.y += dt * (0.08 + motion.shimmer * 0.5);
    this.particles.rotation.x += dt * (0.04 + reactivity.high * 0.4);

    const cameraDepth = 7 - motion.impact * 1.8 - energy.smoothed * 1.3;
    this.camera.position.z += (cameraDepth - this.camera.position.z) * 0.08;

    this.camera.position.x = (motion.flow - 0.5) * 1.8;
    this.camera.position.y = (motion.pressure - 0.5) * 1.3;
    this.camera.lookAt(0, 0, 0);

    const pulse = clamp(energy.smoothed * 0.8 + events.kick * 0.8 + events.transient * 0.6);
    this.renderer.setClearAlpha(1.0);
    this.renderer.render(this.scene, this.camera);

    return pulse;
  }
}
