import './styles.css';
import { APVEngine } from './APVEngine';

const app = document.getElementById('app');
if (app) {
  const engine = new APVEngine(app, { scene: 'void', palette: 'rainbow' });
  engine.start();
  window.addEventListener('beforeunload', () => { void engine.destroy(); }, { once: true });
}
