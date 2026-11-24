// Genera el informe de rentabilidad de las defensas (HTML) a partir de los resultados de la simulación.
// Uso:  node tools/generar-rentabilidad.mjs <resultados.json> <salida.html>
// (los resultados salen de la simulación con navegador sin interfaz: un escenario de oleadas y otro contra jefe)
import { readFileSync, writeFileSync } from 'node:fs';
import { TOWERS, TOWER_ORDER, PATH_KEYS } from '../src/data/towers.js';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8').replace(/^﻿/, ''));
const out = process.argv[3] || 'rentabilidad.html';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n0 = (x) => Math.round(x).toLocaleString('es-ES');
const n1 = (x) => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const mult = (x) => 'x' + n1(x);
const sgn = (x) => (x > 0 ? '+' : '') + n0(x);

// Efectos de las mejoras que el escenario de daño no puede medir (se explican en el informe)
const NOTA = {
  'barbaro|A2': 'Alcance: solo suma tiempo de ataque',
  'barbaro|A4': 'Depende de bajas encadenadas: no aparece con zombis de mucha vida',
  'barbaro|B2': 'El empuje retrasa al zombi: mide su efecto en daño propio',
  'barbaro|C4': 'Solo sube el daño contra jefes',
  'elfo|A3': 'Ignora armadura y x2 a jefes: sin armaduras en el escenario de oleadas',
  'elfo|A4': 'Solo con zombis por debajo del 35% de vida: casi no ocurre aquí',
  'elfo|C2': 'Ralentiza: ayuda a otras defensas, no se ve en su propio daño',
  'alquimista|B2': 'Zombis dorados: da x2 suministros, no daño',
  'alquimista|B4': 'Zombis dorados en zona enorme: da x2 suministros, no daño',
  'alquimista|C2': 'Corrosión: +20% de daño de todas las defensas, no cuenta aquí',
  'mago|B3': 'Explosión de los que mueren ardiendo: pocas bajas en este escenario',
};

const sim = (id, key) => data[`${id}|${key}`];
const parts = [];
parts.push('<h1>Zombies Must Come Down: TWD, rentabilidad de las defensas</h1>');

parts.push('<h2>Cómo se ha medido</h2>');
parts.push(
  '<p>Cada configuración se ha simulado en el propio juego (nivel 2, con la defensa colocada en el mismo punto del camino y las mismas oleadas). Se usan dos escenarios y se mide el daño total que hace esa defensa:</p>'
);
parts.push(
  '<ul>' +
    '<li><b>Oleadas:</b> las 4 primeras oleadas del nivel 2 con la vida de los zombis multiplicada por 12, para que ninguna configuración pueda acabar con todos y el daño no se quede topado. Se promedian 3 repeticiones con semillas aleatorias distintas.</li>' +
    '<li><b>Jefe:</b> un único jefe con vida casi infinita que recorre todo el camino. Mide el daño sostenido contra un objetivo. Se promedian 2 repeticiones.</li>' +
    '<li>Las habilidades activas se usan cada vez que están listas. Las vidas del jugador son infinitas para que el zombi que se escapa no corte la prueba.</li>' +
    '</ul>'
);
parts.push(
  '<p>El coste es el total en suministros: construcción de la defensa más las mejoras compradas. El indicador principal es el daño por cada 100 suministros. Para decidir en qué gastar el siguiente suministro se usa el daño extra de cada mejora por cada 100 suministros que cuesta, comparada con el escalón anterior de su camino.</p>'
);

// -------- ranking global
const steps = [];
for (const id of TOWER_ORDER) {
  for (const P of PATH_KEYS) {
    for (let n = 1; n <= 4; n++) {
      const cur = sim(id, `${P}${n}`);
      const prev = n === 1 ? sim(id, 'base') : sim(id, `${P}${n - 1}`);
      const t = TOWERS[id].paths[P].tiers[n - 1];
      const dc = cur.cost - prev.cost;
      steps.push({ id, P, n, name: t.name, dc, dw: cur.wave - prev.wave, db: cur.boss - prev.boss, ew: ((cur.wave - prev.wave) / dc) * 100, eb: ((cur.boss - prev.boss) / dc) * 100 });
    }
  }
}
const rank = [...steps].sort((a, b) => b.ew - a.ew);

parts.push('<h2>Conclusiones principales</h2>');
parts.push(
  '<p>El Mago es la defensa que mejor convierte suministros en daño, y el Bárbaro es la que más rinde sin mejoras. Las mejoras más rentables de todo el juego, por daño extra por cada 100 suministros, son estas:</p>'
);
let t1 = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr>' +
  ['Puesto', 'Mejora', 'Coste de la mejora', 'Daño extra en oleadas', 'Daño extra por 100 suministros (oleadas)', 'Daño extra por 100 suministros (jefe)'].map((h) => `<th style="background:#e8dcc0;text-align:left"><b>${h}</b></th>`).join('') + '</tr>';
rank.slice(0, 10).forEach((r, i) => {
  t1 += `<tr><td>${i + 1}</td><td>${esc(TOWERS[r.id].name)}, ${r.P}${r.n}: ${esc(r.name)}</td><td>${r.dc}</td><td>${sgn(r.dw)}</td><td>${n0(r.ew)}</td><td>${n0(r.eb)}</td></tr>`;
});
t1 += '</table><p></p>';
parts.push(t1);
parts.push(
  '<p>Las mejoras con peor retorno medido son Sed de sangre del Bárbaro, Ejecutor del Elfo, Viscosidad y Pócima dorada del Alquimista y Cadáveres ardientes del Mago. No son malas: su valor no es daño directo (suministros dobles, bajas encadenadas, explosiones al morir) y esta prueba no puede verlo. Se explican en cada torre.</p>'
);
parts.push(
  '<p>Patrón general: los niveles 1 y 2 salen muy bien de precio. Los niveles 3 son los que más multiplican el daño, porque aquí se desbloquean los efectos que cambian la forma de atacar (giro del Bárbaro, fragmentos y orbe doble del Mago, veneno del Alquimista). Los niveles 4 cuestan unos 200 suministros más y suelen subir el daño menos que un nivel 3. Las excepciones son las habilidades activas del camino B (Lluvia de flechas, Meteoritos) y la Pócima volátil del Alquimista.</p>'
);

// -------- por torre
for (const id of TOWER_ORDER) {
  const T = TOWERS[id];
  const base = sim(id, 'base');
  parts.push(`<h2>${esc(T.name)}</h2>`);
  parts.push(
    `<p>Sin mejoras cuesta ${T.cost} suministros y hace ${n0(base.wave)} de daño en oleadas y ${n0(base.boss)} contra el jefe, es decir ${n0((base.wave / T.cost) * 100)} de daño por cada 100 suministros.</p>`
  );

  parts.push('<h3>Mejora por mejora, dentro de cada camino</h3>');
  let t = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr>' +
    ['Mejora', 'Coste de la mejora', 'Coste total acumulado', 'Daño en oleadas', 'Daño contra jefe', 'Extra por 100 suministros (oleadas)', 'Extra por 100 suministros (jefe)', 'Nota'].map((h) => `<th style="background:#e8dcc0;text-align:left"><b>${h}</b></th>`).join('') + '</tr>';
  t += `<tr><td>Defensa base</td><td>${T.cost}</td><td>${T.cost}</td><td>${n0(base.wave)}</td><td>${n0(base.boss)}</td><td>-</td><td>-</td><td></td></tr>`;
  for (const P of PATH_KEYS) {
    for (let n = 1; n <= 4; n++) {
      const s = steps.find((x) => x.id === id && x.P === P && x.n === n);
      const cur = sim(id, `${P}${n}`);
      const nota = NOTA[`${id}|${P}${n}`] || (Math.abs(s.dw) < 1 ? 'Sin cambio medido' : '');
      t += `<tr><td>${P}${n}: ${esc(s.name)}</td><td>${s.dc}</td><td>${cur.cost}</td><td>${n0(cur.wave)}</td><td>${n0(cur.boss)}</td><td>${n0(s.ew)}</td><td>${n0(s.eb)}</td><td>${esc(nota)}</td></tr>`;
    }
  }
  t += '</table><p></p>';
  parts.push(t);

  parts.push('<h3>Combinaciones de mejoras</h3>');
  parts.push(
    '<p>Nivel 1 y nivel 2: los tres caminos al mismo nivel. Nivel 3: se compra en dos caminos y el tercero se queda en nivel 2 (3 combinaciones). Nivel 4: un camino llega a 4, otro a 3 y el último se queda en 2 (6 combinaciones). Las columnas de extra comparan con el escalón anterior: nivel 1 con la base, nivel 2 con el nivel 1, cada nivel 3 con el nivel 2, y cada nivel 4 con la combinación de nivel 3 de los mismos dos caminos.</p>'
  );
  const combo = [
    ['L1', 'Tres caminos a nivel 1', 'base'],
    ['L2', 'Tres caminos a nivel 2', 'L1'],
    ['L3_AB', 'Nivel 3 en A y B', 'L2'],
    ['L3_AC', 'Nivel 3 en A y C', 'L2'],
    ['L3_BC', 'Nivel 3 en B y C', 'L2'],
  ];
  for (const X of PATH_KEYS) for (const Y of PATH_KEYS) {
    if (X === Y) continue;
    const set = [X, Y].sort().join('');
    combo.push([`L4_${X}${Y}`, `Nivel 4 en ${X}, nivel 3 en ${Y}`, `L3_${set}`]);
  }
  let c = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr>' +
    ['Combinación', 'Coste total', 'Daño en oleadas', 'Daño contra jefe', 'Veces el daño de la base (oleadas)', 'Daño por 100 suministros (oleadas)', 'Daño por 100 suministros (jefe)', 'Extra por 100 suministros vs escalón anterior (oleadas)'].map((h) => `<th style="background:#e8dcc0;text-align:left"><b>${h}</b></th>`).join('') + '</tr>';
  c += `<tr><td>Defensa base</td><td>${base.cost}</td><td>${n0(base.wave)}</td><td>${n0(base.boss)}</td><td>${mult(1)}</td><td>${n0((base.wave / base.cost) * 100)}</td><td>${n0((base.boss / base.cost) * 100)}</td><td>-</td></tr>`;
  for (const [key, label, from] of combo) {
    const r = sim(id, key);
    const p = sim(id, from);
    const dc = r.cost - p.cost;
    c += `<tr><td>${esc(label)}</td><td>${r.cost}</td><td>${n0(r.wave)}</td><td>${n0(r.boss)}</td><td>${mult(r.wave / base.wave)}</td><td>${n0((r.wave / r.cost) * 100)}</td><td>${n0((r.boss / r.cost) * 100)}</td><td>${n0(((r.wave - p.wave) / dc) * 100)}</td></tr>`;
  }
  c += '</table><p></p>';
  parts.push(c);

  // mejor combinación por rentabilidad
  const keys = combo.map((x) => x[0]);
  const best = keys.map((k) => sim(id, k)).sort((a, b) => b.wave / b.cost - a.wave / a.cost)[0];
  const bestAbs = keys.map((k) => sim(id, k)).sort((a, b) => b.wave - a.wave)[0];
  parts.push(
    `<p>Combinación más rentable por suministro: ${esc(combo.find((x) => x[0] === best.cfg)[1])} (${best.cost} suministros, ${n0((best.wave / best.cost) * 100)} de daño por cada 100). Combinación con más daño total: ${esc(combo.find((x) => x[0] === bestAbs.cfg)[1])} (${n0(bestAbs.wave)} de daño en oleadas, ${bestAbs.cost} suministros).</p>`
  );
}

parts.push('<h2>Lectura por torre</h2>');
const LECT = {
  barbaro:
    'El Bárbaro es el más barato de construir y el que más rinde sin mejoras. Su gran salto es el Ataque giratorio (A3), que triplica el daño al golpear en 360 grados. La mejor combinación es nivel 4 en B (Cuerno Vikingo) con nivel 3 en A: el cuerno multiplica el daño del propio Bárbaro y el giro lo reparte entre todos los zombis. Conquistador (C4) solo compensa si el nivel tiene jefe.',
  elfo:
    'El Elfo es la defensa que peor rinde por suministro al principio, porque tiene poco daño base. Mejora mucho con Doble flecha (B2) y con la Lluvia de flechas (B4), que más que duplica el daño. Los caminos A y C compensan con sus efectos de nivel 3 y 4 (armadura, jefes, penetración), que se aprecian más contra enemigos blindados y jefes que en esta medición. La mejor relación coste daño llega con nivel 4 en B o C combinado con nivel 3 en el otro camino.',
  alquimista:
    'El Alquimista escala bien porque su zona de daño crece con cada mejora. Veneno (C3) y Pócima expansiva (A) son lo más rentable. El camino B parece flojo en esta tabla porque su valor está en los zombis dorados, que dan el doble de suministros, y eso no es daño. La combinación con más daño es nivel 4 en A con nivel 3 en B.',
  mago:
    'El Mago es la defensa con más retorno. Orbe gélido (C1) es la mejora más rentable del juego: por 45 suministros multiplica por 2,5 el daño, porque los zombis frenados pasan mucho más tiempo bajo fuego. Meteoritos (B4) y Orbe doble (C3) también salen muy bien. En el reparto de niveles, la mejor opción es nivel 3 en A y C: casi alcanza el daño máximo del nivel 4 por unos 190 suministros menos.',
};
for (const id of TOWER_ORDER) parts.push(`<h3>${esc(TOWERS[id].name)}</h3><p>${LECT[id]}</p>`);

parts.push('<h2>Qué no mide este informe</h2>');
parts.push(
  '<ul>' +
    '<li>El daño de una defensa sola. Las ralentizaciones, la corrosión del Alquimista y los zombis dorados ayudan a las demás defensas o a la economía, y aquí solo se ve el efecto sobre la propia defensa.</li>' +
    '<li>Los efectos que dependen de bajas o de enemigos con armadura (Sed de sangre, Ejecutor, Magia oscura contra armaduras, Cadáveres ardientes). Con la vida multiplicada por 12 casi no ocurren.</li>' +
    '<li>La interacción entre varias defensas. En una partida real se combinan, y las defensas con efectos de apoyo valen más de lo que muestra su tabla.</li>' +
    '<li>El punto exacto donde se coloca la defensa. Todas se simulan en el mismo punto, cerca de un tramo recto del camino.</li>' +
    '</ul>'
);
parts.push('<p>Las cifras salen de las reglas actuales del juego. Si cambian los números de combate, el informe se vuelve a generar con la misma simulación.</p>');

writeFileSync(out, `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Rentabilidad de las defensas</title></head><body>${parts.join('\n')}</body></html>`, 'utf8');
console.log('Generado:', out);
