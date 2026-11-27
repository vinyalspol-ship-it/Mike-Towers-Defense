// Dibujos PROVISIONALES de los enemigos voladores (cuervo, buitre, gárgola y zombi montado en buitre).
// Se generan con canvas al arrancar: 4 fotogramas de aleteo de 64x48 cada uno, mirando a la derecha.
const FW = 64;
const FH = 48;
const FRAMES = 4;
// apertura de las alas en cada fotograma (1 = arriba, -1 = abajo)
const FLAP = [1, 0.35, -0.6, 0.35];

function wing(g, x, y, span, flap, color, edge, kind) {
  // ala vista de lado: un triángulo curvo que sube o baja según el aleteo
  const tipY = y - flap * span * 0.75;
  g.fillStyle = color;
  g.strokeStyle = edge;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 6, y);
  if (kind === 'bat') {
    // ala de murciélago (gárgola): bordes dentados
    g.lineTo(x - span * 0.3, tipY);
    g.lineTo(x - span * 0.45, tipY + (y - tipY) * 0.55);
    g.lineTo(x - span * 0.65, tipY + 2);
    g.lineTo(x - span * 0.7, tipY + (y - tipY) * 0.6);
    g.lineTo(x - span * 0.9, tipY + 6);
    g.lineTo(x - 4, y + 5);
  } else {
    // ala de pájaro: plumas largas
    g.quadraticCurveTo(x - span * 0.35, tipY - 4, x - span, tipY + 3);
    g.lineTo(x - span * 0.78, tipY + 7);
    g.lineTo(x - span * 0.86, tipY + 10);
    g.lineTo(x - span * 0.62, tipY + 11);
    g.quadraticCurveTo(x - span * 0.3, y + 4, x - 2, y + 5);
  }
  g.closePath();
  g.fill();
  g.stroke();
}

const DRAW = {
  // cuervo: negro, pico amarillo, ojo rojo
  fly_crow(g, f) {
    const cx = 34, cy = 28;
    wing(g, cx + 2, cy - 1, 24, -FLAP[f] * 0.7, '#1d1a24', '#000000'); // ala del fondo
    g.fillStyle = '#26222e';
    g.beginPath(); g.ellipse(cx, cy, 13, 8, -0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1a24';
    g.beginPath(); g.moveTo(cx - 12, cy); g.lineTo(cx - 22, cy - 3); g.lineTo(cx - 21, cy + 5); g.closePath(); g.fill(); // cola
    g.beginPath(); g.arc(cx + 12, cy - 5, 6.5, 0, Math.PI * 2); g.fill(); // cabeza
    g.fillStyle = '#f9a825';
    g.beginPath(); g.moveTo(cx + 17, cy - 7); g.lineTo(cx + 26, cy - 4); g.lineTo(cx + 17, cy - 2); g.closePath(); g.fill(); // pico
    g.fillStyle = '#ff1744';
    g.beginPath(); g.arc(cx + 13, cy - 7, 1.8, 0, Math.PI * 2); g.fill(); // ojo
    g.fillStyle = '#7cb342'; // mancha zombi
    g.fillRect(cx - 3, cy - 2, 4, 3);
    wing(g, cx, cy, 26, FLAP[f], '#2f2a38', '#000000'); // ala delantera
  },
  // buitre: marrón, cuello y cabeza rosados y pelados, collar de plumas claras
  fly_vulture(g, f) {
    const cx = 32, cy = 29;
    wing(g, cx + 2, cy - 2, 30, -FLAP[f] * 0.7, '#4e342e', '#2b1a14');
    g.fillStyle = '#5d4037';
    g.beginPath(); g.ellipse(cx, cy, 15, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3e2723';
    g.beginPath(); g.moveTo(cx - 13, cy); g.lineTo(cx - 25, cy - 2); g.lineTo(cx - 23, cy + 7); g.closePath(); g.fill();
    g.fillStyle = '#efebe9';
    g.beginPath(); g.ellipse(cx + 12, cy - 4, 6, 5, 0, 0, Math.PI * 2); g.fill(); // collar
    g.strokeStyle = '#c48b8b'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx + 13, cy - 6); g.quadraticCurveTo(cx + 18, cy - 16, cx + 22, cy - 12); g.stroke(); // cuello
    g.fillStyle = '#d4a0a0';
    g.beginPath(); g.arc(cx + 23, cy - 12, 4.5, 0, Math.PI * 2); g.fill(); // cabeza
    g.fillStyle = '#9e9e9e';
    g.beginPath(); g.moveTo(cx + 26, cy - 14); g.lineTo(cx + 32, cy - 10); g.lineTo(cx + 26, cy - 9); g.closePath(); g.fill(); // pico ganchudo
    g.fillStyle = '#c6ff00';
    g.beginPath(); g.arc(cx + 24, cy - 13, 1.4, 0, Math.PI * 2); g.fill();
    wing(g, cx, cy - 1, 32, FLAP[f], '#6d4c41', '#2b1a14');
  },
  // gárgola: piedra gris, cuernos, alas de murciélago y ojos brillantes
  fly_gargoyle(g, f) {
    const cx = 32, cy = 28;
    wing(g, cx + 3, cy - 2, 30, -FLAP[f] * 0.6, '#546e7a', '#263238', 'bat');
    g.fillStyle = '#78909c';
    g.strokeStyle = '#37474f'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, cy + 2, 12, 11, 0, 0, Math.PI * 2); g.fill(); g.stroke(); // cuerpo
    g.beginPath(); g.arc(cx + 9, cy - 9, 8, 0, Math.PI * 2); g.fill(); g.stroke(); // cabeza
    g.fillStyle = '#cfd8dc';
    g.beginPath(); g.moveTo(cx + 4, cy - 15); g.lineTo(cx + 1, cy - 25); g.lineTo(cx + 8, cy - 16); g.closePath(); g.fill(); // cuerno
    g.beginPath(); g.moveTo(cx + 11, cy - 16); g.lineTo(cx + 14, cy - 26); g.lineTo(cx + 16, cy - 14); g.closePath(); g.fill();
    g.fillStyle = '#ffea00';
    g.fillRect(cx + 10, cy - 11, 3, 2); g.fillRect(cx + 14, cy - 11, 3, 2); // ojos
    g.fillStyle = '#455a64';
    g.fillRect(cx - 6, cy + 10, 4, 6); g.fillRect(cx + 3, cy + 10, 4, 6); // patas
    g.strokeStyle = '#37474f'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 10, cy + 6); g.quadraticCurveTo(cx - 22, cy + 14, cx - 26, cy + 4); g.stroke(); // cola
    wing(g, cx, cy - 2, 32, FLAP[f], '#607d8b', '#263238', 'bat');
  },
  // zombi montado en buitre: buitre grande y un zombi verde con lanza encima
  fly_rider(g, f) {
    DRAW.fly_vulture(g, f);
    const cx = 29, cy = 19;
    g.fillStyle = '#558b2f';
    g.strokeStyle = '#1b5e20'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(cx, cy, 5, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke(); // cuerpo
    g.beginPath(); g.arc(cx + 1, cy - 9, 5, 0, Math.PI * 2); g.fill(); g.stroke(); // cabeza
    g.fillStyle = '#ff1744';
    g.fillRect(cx + 2, cy - 10, 2, 2); // ojo
    g.fillStyle = '#5d4037';
    g.fillRect(cx - 5, cy - 15, 11, 3); // casco
    g.strokeStyle = '#8d6e63'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 8, cy + 2); g.lineTo(cx + 22, cy - 10); g.stroke(); // lanza
    g.fillStyle = '#cfd8dc';
    g.beginPath(); g.moveTo(cx + 26, cy - 12); g.lineTo(cx + 19, cy - 12); g.lineTo(cx + 21, cy - 7); g.closePath(); g.fill();
  },
};

export const FLYER_KEYS = Object.keys(DRAW);

// Crea las texturas (con fotogramas) y las animaciones de aleteo. Se llama una vez al cargar.
export function makeFlyerArt(scene) {
  for (const key of FLYER_KEYS) {
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, FW * FRAMES, FH);
    const g = tex.getContext();
    g.imageSmoothingEnabled = false;
    for (let f = 0; f < FRAMES; f++) {
      g.save();
      g.translate(f * FW, 0);
      DRAW[key](g, f);
      g.restore();
      tex.add(f, 0, f * FW, 0, FW, FH);
    }
    tex.refresh();
    if (!scene.anims.exists(key)) {
      scene.anims.create({ key, frames: [0, 1, 2, 3].map((n) => ({ key, frame: n })), frameRate: 9, repeat: -1 });
    }
  }
}
