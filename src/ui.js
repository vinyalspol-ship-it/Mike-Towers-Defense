import { FONT, COL } from './config.js';

// Botón de madera/pergamino. Devuelve un objeto con métodos de ayuda.
// opts: fill (color de fondo), fontSize, depth, icon (clave de imagen arriba), iconSize, textColor
export function makeButton(scene, x, y, w, h, text, onClick, opts = {}) {
  const fill = opts.fill ?? 0x6b4a2b;
  const depth = opts.depth ?? 50;
  const bg = scene.add
    .rectangle(x, y, w, h, fill)
    .setOrigin(0, 0)
    .setStrokeStyle(3, COL.woodDark, 1)
    .setDepth(depth);
  // reborde claro superior (efecto relieve)
  const shine = scene.add.rectangle(x + 3, y + 3, w - 6, 3, 0xffffff, 0.22).setOrigin(0, 0).setDepth(depth + 0.5);
  let icon = null;
  const hasIcon = !!opts.icon;
  if (hasIcon) {
    const size = opts.iconSize ?? 56;
    icon = scene.add.image(x + w / 2, y + 8 + size / 2, opts.icon).setDepth(depth + 1);
    icon.setScale(size / icon.width);
  }
  const label = scene.add
    .text(x + w / 2, hasIcon ? y + 8 + (opts.iconSize ?? 56) + (h - 8 - (opts.iconSize ?? 56)) / 2 : y + h / 2, text, {
      fontFamily: FONT,
      fontSize: (opts.fontSize ?? 18) + 'px',
      color: opts.color ?? COL.cream,
      align: 'center',
      wordWrap: { width: w - 12 },
      stroke: '#2e1c0f',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const btn = {
    bg,
    label,
    icon,
    enabled: true,
    fill,
    setEnabled(v) {
      btn.enabled = v;
      bg.setFillStyle(v ? btn.fill : 0x3a342e);
      label.setAlpha(v ? 1 : 0.6);
      if (icon) icon.setAlpha(v ? 1 : 0.5);
    },
    setText(t) {
      if (label.text !== t) label.setText(t);
    },
    setFill(c) {
      btn.fill = c;
      if (btn.enabled) bg.setFillStyle(c);
    },
    setVisible(v) {
      bg.setVisible(v);
      shine.setVisible(v);
      label.setVisible(v);
      if (icon) icon.setVisible(v);
    },
    destroy() {
      bg.destroy();
      shine.destroy();
      label.destroy();
      if (icon) icon.destroy();
    },
  };

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => btn.enabled && bg.setStrokeStyle(3, 0xffd23f, 1));
  bg.on('pointerout', () => bg.setStrokeStyle(3, COL.woodDark, 1));
  bg.on('pointerdown', () => {
    if (btn.enabled) onClick();
    else if (opts.onDisabled) opts.onDisabled();
  });
  return btn;
}

export function title(scene, x, y, text, size = 48, color = '#ffd23f') {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: size + 'px',
      color,
      fontStyle: 'bold',
      stroke: '#2e1c0f',
      strokeThickness: Math.max(4, size / 7),
    })
    .setOrigin(0.5);
}

// ---- Elementos del pack de interfaz "Mediavel Free" (src/art.js los carga) ----

// Tablón de madera de tamaño libre (nine-slice: las esquinas con clavos no se deforman)
export function woodPanel(scene, x, y, w, h, depth = 40, margin = 14) {
  return scene.add.nineslice(x, y, 'ui_panel', undefined, w, h, margin, margin, margin, margin).setOrigin(0, 0).setDepth(depth);
}

// Botón con icono del pack. frame = fotograma "normal" de ui_btns (el siguiente es el pulsado).
// Orden de ui_btns (8 columnas): play 0, pause 2, plus 8, check 10, X 16, minus 18, ? 24, $ 26; +4 = versión marrón.
export function iconButton(scene, x, y, size, frame, onClick, depth = 42) {
  const spr = scene.add.sprite(x, y, 'ui_btns', frame).setOrigin(0, 0).setDisplaySize(size, size).setDepth(depth).setInteractive({ useHandCursor: true });
  const btn = {
    spr,
    base: frame,
    setBase(f) {
      btn.base = f;
      spr.setFrame(f);
    },
    destroy: () => spr.destroy(),
  };
  spr.on('pointerdown', () => {
    spr.setFrame(btn.base + 1);
    onClick();
  });
  spr.on('pointerup', () => spr.setFrame(btn.base));
  spr.on('pointerout', () => spr.setFrame(btn.base));
  return btn;
}
