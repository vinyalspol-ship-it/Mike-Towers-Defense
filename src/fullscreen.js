// Pantalla completa (móvil y ordenador). En iPhone el navegador no lo permite: ahí se usa "Añadir a pantalla de inicio".
import { makeButton } from './ui.js';

export const fsSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export async function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
      return;
    }
    await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
    // en el móvil, además se fuerza la pantalla horizontal (si el navegador lo permite)
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (e) {
    /* el navegador no lo permite: no pasa nada */
  }
}

// Botón con el icono de pantalla completa (cuatro esquinas). No se crea si el navegador no soporta pantalla completa.
export function addFullscreenButton(scene, x, y, w, h, depth = 20) {
  if (!fsSupported()) return null;
  const btn = makeButton(scene, x, y, w, h, '', () => toggleFullscreen(), { fill: 0x5b4636, depth });
  const g = scene.add.graphics().setDepth(depth + 1);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h) * 0.3; // medio lado del icono
  const l = s * 0.55; // largo de cada esquina
  g.lineStyle(3, 0xfff4d6, 1);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
    g.beginPath();
    g.moveTo(cx + sx * s, cy + sy * (s - l));
    g.lineTo(cx + sx * s, cy + sy * s);
    g.lineTo(cx + sx * (s - l), cy + sy * s);
    g.strokePath();
  });
  return btn;
}
