// Genera el resumen de torres (HTML) desde los datos reales del juego.
// Uso:  node tools/generar-resumen-torres.mjs <ruta-de-salida.html>
import { writeFileSync } from 'node:fs';
import { TOWERS, TOWER_ORDER, PATH_KEYS } from '../src/data/towers.js';

const out = process.argv[2] || 'resumen-torres.html';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parts = [];
parts.push('<h1>Zombies Must Come Down: TWD, torres de defensa</h1>');
parts.push(
  '<p>Cada torre tiene 3 caminos (A, B, C) de 4 niveles. Los costes de las mejoras están en suministros, la moneda de batalla. ' +
    'Niveles 1 y 2: se pueden comprar en los 3 caminos. Nivel 3: solo en 2 de los 3 caminos. Nivel 4: solo en uno. ' +
    'El nivel 4 del camino B es siempre la habilidad especial de la torre.</p>'
);

for (const id of TOWER_ORDER) {
  const t = TOWERS[id];
  parts.push(`<h2>${esc(t.name)}</h2>`);
  parts.push(
    `<p>Construcción: ${t.cost} suministros. Habilidad especial: ${esc(t.skill.name)} (recarga ${t.skill.cooldown} s). ${esc(t.desc)}</p>`
  );
  let html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">';
  html += '<tr>' + PATH_KEYS.map((P) => `<th style="background:#e8dcc0;text-align:left;width:33%"><b>Camino ${P}: ${esc(t.paths[P].name)}</b></th>`).join('') + '</tr>';
  for (let n = 0; n < 4; n++) {
    html +=
      '<tr>' +
      PATH_KEYS.map((P) => {
        const u = t.paths[P].tiers[n];
        return `<td style="vertical-align:top"><b>Nivel ${n + 1}: ${esc(u.name)}</b><br>${esc(u.doc || u.desc)}<br>Coste: ${u.cost} suministros</td>`;
      }).join('') +
      '</tr>';
  }
  html += '</table><p></p>';
  parts.push(html);
}

writeFileSync(out, `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Resumen de torres</title></head><body>${parts.join('\n')}</body></html>`, 'utf8');
console.log('Generado:', out);
