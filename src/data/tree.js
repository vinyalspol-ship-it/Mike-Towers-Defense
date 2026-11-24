// Árbol de mejoras permanente, dibujado como una constelación que sale del nodo central.
// - Nodo central (root): desbloquea todas las ramas.
// - Economía: Víveres (1 cerebro) -> Víveres 2 -> Mercader. De Mercader cuelga Gemas (1 cerebro) y se desbloquea el Rey Midas.
//   Las monedas ya no caen durante la partida: se dan al final, en proporción a los zombis abatidos (COINS_PER_KILL).
// - Murallas: +5 vidas del castillo cada una (se empieza con 10).
// - Personajes: Bárbaro y Elfo vienen desbloqueados; Alquimista y Mago se pagan.
//   De cada personaje salen sus 3 caminos (A, B, C), y cada camino tiene 4 nodos (nivel 1..4) que se compran EN ORDEN.
// Cada nodo: { name, desc, cost, cur, req:[ids], parent:id (para la línea), icon, x, y, kind, color }
import { TOWERS, TOWER_ORDER, PATH_KEYS } from './towers.js';

export const NODES = {};
const rad = (d) => (d * Math.PI) / 180;
const at = (from, ang, dist) => ({ x: from.x + Math.cos(rad(ang)) * dist, y: from.y + Math.sin(rad(ang)) * dist });
const zig = (p, ang, i, amount = 16) => at(p, ang + 90, i % 2 ? amount : -amount); // pequeño zigzag de constelación

function add(id, node, pos) {
  NODES[id] = { cur: 'coins', req: [], kind: 'node', ...node, x: Math.round(pos.x), y: Math.round(pos.y) };
}

// ---- Nodo central
add('root', { name: 'Cuartel de Evelmore', desc: 'Primera mejora: desbloquea todas las ramas del árbol.', cost: 5, icon: '⭐', kind: 'root', color: 0xffd23f }, { x: 0, y: 0 });

// ---- Economía (hacia la izquierda): Víveres -> Víveres 2 -> Mercader. Gemas cuelga de Mercader.
// Monedas por zombi abatido, que se dan al final de cada partida (ya no hay mejoras de botín)
export const COINS_PER_KILL = 0.6;
const RICH = [
  ['rich_1', 'Víveres', '+40 suministros al empezar cada nivel. Cuesta 1 cerebro.', 1, 'brains'],
  ['rich_2', 'Víveres 2', 'Empiezas cada nivel con +60 suministros (en total; sustituye a Víveres). Cuesta 80 monedas.', 80],
  ['rich_3', 'Mercader', 'Vender una defensa devuelve el 85%. Desbloquea el Rey Midas y las gemas.', 100],
];
RICH.forEach(([id, name, desc, cost, cur], i) => {
  const base = at({ x: 0, y: 0 }, 180, 150 + i * 115);
  add(id, { name, desc, cost, cur: cur || 'coins', icon: '🏗', req: [i ? RICH[i - 1][0] : 'root'], parent: i ? RICH[i - 1][0] : 'root', color: 0xe59866 }, zig(base, 180, i));
});

const GEMS = [
  ['br_gems', '💎 Gemas', 'Rama extra: algunos zombis cuentan como varios al repartir las monedas del final de la partida. Cuesta 1 cerebro. Cuelga de Mercader.', 1, 'brains'],
  ['gem_ruby', 'Rubí', 'Rubí: el 10% de los zombis cuentan como 2 al repartir las monedas finales.', 40],
  ['gem_emerald', 'Esmeralda', 'Esmeralda: el 5% de los zombis cuentan como 3.', 80],
  ['gem_diamond', 'Diamante', 'Diamante: el 2% de los zombis cuentan como 6.', 150],
  ['gem_double', 'Fortuna doble', 'Duplica la tasa de todas las gemas.', 250],
];
const gemStart = NODES.rich_3;
GEMS.forEach(([id, name, desc, cost, cur], i) => {
  const base = at(gemStart, 258, 125 * (i + 1));
  add(id, { name, desc, cost, cur: cur || 'coins', icon: '💎', req: [i ? GEMS[i - 1][0] : 'rich_3'], parent: i ? GEMS[i - 1][0] : 'rich_3', color: 0x5dade2 }, zig(base, 258, i));
});

// ---- Murallas: +5 vidas del castillo cada una (se empieza con 10)
const WALL_ANGLE = -130;
const WALLS = [
  ['wall_1', '🛡 Empalizada', '+5 vidas del castillo al empezar cada nivel.', 25],
  ['wall_2', 'Muralla de madera', '+5 vidas del castillo.', 55],
  ['wall_3', 'Muralla de piedra', '+5 vidas del castillo.', 100],
  ['wall_4', 'Fortaleza', '+5 vidas del castillo.', 170],
];
WALLS.forEach(([id, name, desc, cost], i) => {
  const base = at({ x: 0, y: 0 }, WALL_ANGLE, 150 + i * 115);
  add(id, { name, desc, cost, icon: '🛡', req: [i ? WALLS[i - 1][0] : 'root'], parent: i ? WALLS[i - 1][0] : 'root', color: 0x95a5a6 }, zig(base, WALL_ANGLE, i));
});
export const START_LIVES = 10;

// ---- Personajes y sus 3 caminos
const CHAR_ANGLE = { barbaro: -90, elfo: -30, alquimista: 30, mago: 90 };
// Bárbaro y Elfo gratis; el resto cuestan cerebros (1 cerebro por nivel superado por primera vez)
const CHAR_COST = { barbaro: 0, elfo: 0, alquimista: 1, mago: 1, lancero: 1, monje: 1, ingeniero: 1, asedio: 1, midas: 2, nigromante: 2, druida: 2 };
// Nodo que hay que tener antes de poder desbloquear la defensa (las que no aparecen cuelgan del nodo central)
const GATE = { ingeniero: 'bar_C4', asedio: 'bar_A4', nigromante: 'mag_C4', druida: 'mag_A4', monje: 'alq_C4', midas: 'rich_3' };
const BEND = 9; // grados que se curva cada nivel hacia dentro (evita que se solapen los últimos nodos)
const TIER_COST = [8, 20, 45, 80];
const TIER1_COST = { barbaro: 6, elfo: 8, alquimista: 8, mago: 10, lancero: 10, monje: 12, ingeniero: 9, asedio: 13, midas: 16, nigromante: 15, druida: 12 }; // nivel 1
const COST_MULT = { barbaro: 1, elfo: 1.2, alquimista: 1.4, mago: 1.6, lancero: 1.5, monje: 1.6, ingeniero: 1.4, asedio: 1.8, midas: 2.0, nigromante: 2.0, druida: 1.7 };
const RULE = { 3: ' (en partida, solo 2 de los 3 caminos llegan al nivel 3)', 4: ' (en partida, solo UNO de los 3 caminos llega al nivel 4)' };

// Posiciones de los 12 nodos de una defensa: pos[pi][n]
function layout(charPos, ang, spread, d0, step, bend) {
  return PATH_KEYS.map((P, pi) => {
    const pang = ang + (pi - 1) * spread;
    return [0, 1, 2, 3].map((n) => zig(at(charPos, pang + (1 - pi) * bend * n, d0 + step * n), pang, n, 12));
  });
}

for (const id of TOWER_ORDER) {
  const t = TOWERS[id];
  let ang = CHAR_ANGLE[id];
  let charPos;
  let pos;
  if (ang !== undefined) {
    charPos = at({ x: 0, y: 0 }, ang, 215);
    pos = layout(charPos, ang, 42, 140, 105, BEND);
  } else {
    // defensas nuevas: se busca un hueco libre donde su constelación no toque a ninguna otra.
    // Si tienen nodo de desbloqueo (GATE), se coloca lo más cerca posible de él, hacia fuera.
    const others = Object.values(NODES);
    const test = (cp, a) => {
      const ps = layout(cp, a, 40, 130, 95, 7);
      const pts = [cp, ...ps.flat()];
      const ok =
        pts.every((p) => others.every((o) => Math.hypot(p.x - o.x, p.y - o.y) >= 90)) &&
        pts.every((p, i) => pts.every((q, j) => i >= j || Math.hypot(p.x - q.x, p.y - q.y) >= 70));
      return ok ? { a, cp, ps } : null;
    };
    let best = null;
    if (GATE[id]) {
      const gp = NODES[GATE[id]];
      const out = (Math.atan2(gp.y, gp.x) * 180) / Math.PI;
      gsearch: for (let R = 110; R <= 520; R += 20) {
        for (const dl of [0, 15, -15, 30, -30, 45, -45, 60, -60, 80, -80, 100, -100, 130, -130, 160, 180]) {
          best = test(at(gp, out + dl, R), out + dl);
          if (best) break gsearch;
        }
      }
    }
    if (!best) {
      search: for (let R = 800; R <= 2200; R += 40) {
        for (let k = 0; k < 72; k++) {
          const a = -180 + k * 5;
          best = test(at({ x: 0, y: 0 }, a, R), a);
          if (best) break search;
        }
      }
    }
    ang = best.a;
    charPos = best.cp;
    pos = best.ps;
  }
  const charId = 'char_' + t.short;
  // línea de unión: con el nodo más cercano (para las defensas nuevas, que están lejos del centro)
  let parent = 'root';
  if (GATE[id]) parent = GATE[id];
  else if (CHAR_ANGLE[id] === undefined) {
    let bd = 1e9;
    for (const [nid, n] of Object.entries(NODES)) {
      const d = Math.hypot(n.x - charPos.x, n.y - charPos.y);
      if (d < bd) {
        bd = d;
        parent = nid;
      }
    }
  }
  add(charId, {
    name: t.name,
    desc: CHAR_COST[id] ? `Cuesta ${CHAR_COST[id]} cerebro${CHAR_COST[id] > 1 ? 's' : ''}.${GATE[id] ? ` Se desbloquea tras: ${NODES[GATE[id]].name}.` : ''} Desbloquea al ${t.name}: podrás construirlo en las partidas y mejorarlo con sus 3 caminos.` : `${t.name}: disponible desde el principio. Mejóralo con sus 3 caminos.`,
    cost: CHAR_COST[id],
    cur: CHAR_COST[id] ? 'brains' : 'coins',
    icon: t.emoji,
    kind: 'char',
    req: GATE[id] ? ['root', GATE[id]] : ['root'],
    parent,
    color: t.color,
    tower: id,
  }, charPos);

  PATH_KEYS.forEach((P, pi) => {
    const path = t.paths[P];
    path.tiers.forEach((upg, n) => {
      const prev = n === 0 ? charId : `${t.short}_${P}${n}`;
      add(`${t.short}_${P}${n + 1}`, {
        name: upg.name,
        desc: `${t.name} · camino ${P} (${path.name}) · nivel ${n + 1}: ${upg.name}. ${upg.desc}.${RULE[n + 1] || ''}`,
        cost: n === 0 ? TIER1_COST[id] : Math.round(TIER_COST[n] * COST_MULT[id]),
        icon: String(n + 1),
        kind: n === 3 ? 'big' : 'path',
        req: n === 0 ? [charId, 'root'] : [prev],
        parent: prev,
        color: t.color,
        tower: id,
        path: P,
        tier: n + 1,
      }, pos[pi][n]);
    });
  });
}
// ---- Lanzamiento automático (1 cerebro) y, colgando de él en línea, los espacios de equipo extra: se empieza con
// 3 defensas distintas por batalla y se pueden desbloquear 3 más (1, 2 y 3 cerebros).
// La cadena Centro -> Auto -> Espacio 4 -> 5 -> 6 sale por el rayo más despejado del árbol, con 150 px entre nodos.
export const BASE_SLOTS = 3;
function bestChainAngle(n, r0, step) {
  const others = Object.values(NODES);
  let best = null;
  for (let a = 0; a < 360; a += 3) {
    const pts = Array.from({ length: n }, (_, k) => at({ x: 0, y: 0 }, a, r0 + step * k));
    let clear = 1e9;
    for (const p of pts) for (const o of others) clear = Math.min(clear, Math.hypot(p.x - o.x, p.y - o.y));
    // los tramos de la cadena tampoco pueden rozar otros nodos, y ninguna línea existente puede cruzar los nodos o sus etiquetas
    for (let s = 0; s <= 1; s += 0.02) {
      const q = at({ x: 0, y: 0 }, a, r0 + step * (n - 1) * s);
      for (const o of others) clear = Math.min(clear, Math.hypot(q.x - o.x, q.y - o.y) + 35);
    }
    const crossed = pts.some((p) =>
      others.some((o) => {
        const q = o.parent && NODES[o.parent];
        if (!q) return false;
        for (let s = 0; s <= 1; s += 0.05) {
          const lx = o.x + (q.x - o.x) * s;
          const ly = o.y + (q.y - o.y) * s;
          if (lx > p.x - 75 && lx < p.x + 75 && ly > p.y - 36 && ly < p.y + 64) return true;
        }
        return false;
      })
    );
    if (crossed || clear < 105) continue;
    if (!best || clear > best.clear) best = { a, clear };
  }
  return best ? best.a : 0;
}
const CHAIN = [
  ['auto_skills', 'Lanzamiento automático', 'Cuesta 100 monedas. Aparece un botón AUTO en la partida: las habilidades activas se lanzan solas en cuanto están listas y hay zombis en el mapa.', 100, '⚡', 0xaf7ac5, 'coins'],
  ...[1, 2, 3].map((cost, i) => [
    'slot_' + (i + 4),
    `Equipo: espacio ${i + 4}`,
    `Cuesta ${cost} cerebro${cost > 1 ? 's' : ''}. Podrás llevar ${i + 4} defensas distintas a cada batalla (se eligen en Equipo, en el menú principal).`,
    cost,
    '🎒',
    0x80cbc4,
    'brains',
  ]),
];
const CHAIN_ANGLE = bestChainAngle(CHAIN.length, 140, 150);
CHAIN.forEach(([id, name, desc, cost, icon, color, cur], k) => {
  const prev = k ? CHAIN[k - 1][0] : 'root';
  add(id, { name, desc, cost, cur, icon, req: [prev], parent: prev, color }, at({ x: 0, y: 0 }, CHAIN_ANGLE, 140 + 150 * k));
});

export const FREE_NODES = ['char_bar', 'char_elf']; // vienen desbloqueados

export const has = (s, id) => !!s.nodes[id];

// Defensas distintas que se pueden llevar a una batalla (3 + espacios del árbol)
export const maxSlots = (s) => BASE_SLOTS + [4, 5, 6].filter((n) => has(s, 'slot_' + n)).length;

// Vidas extra por murallas compradas
export const wallLives = (s) => WALLS.reduce((n, [id]) => n + (has(s, id) ? 5 : 0), 0);

export function gemRates(s) {
  const m = has(s, 'gem_double') ? 2 : 1;
  return {
    ruby: has(s, 'gem_ruby') ? 0.1 * m : 0,
    emerald: has(s, 'gem_emerald') ? 0.05 * m : 0,
    diamond: has(s, 'gem_diamond') ? 0.02 * m : 0,
  };
}

// ¿Está desbloqueado este personaje (se puede construir)?
export function towerUnlocked(s, towerId) {
  return has(s, 'char_' + TOWERS[towerId].short);
}

// ¿Está desbloqueado en el árbol el nivel `tier` (1-4) del camino P de esta defensa?
export function pathTierUnlocked(s, towerId, P, tier) {
  return has(s, `${TOWERS[towerId].short}_${P}${tier}`);
}

// Devuelve null si se puede comprar, o el motivo si no.
export function whyNot(s, id) {
  const n = NODES[id];
  if (has(s, id)) return 'Ya comprado';
  for (const r of n.req) if (!has(s, r)) return 'Antes necesitas: ' + NODES[r].name;
  if (n.excl && has(s, n.excl)) return 'Ya elegiste la otra rama extra';
  const have = n.cur === 'brains' ? s.brains : s.coins;
  if (have < n.cost) return n.cur === 'brains' ? 'Te falta un cerebro 🧠 (1 por cada nivel superado por primera vez)' : `Te faltan ${n.cost - have} monedas`;
  return null;
}

export function buy(s, id) {
  if (whyNot(s, id)) return false;
  const n = NODES[id];
  if (n.cur === 'brains') s.brains -= n.cost;
  else s.coins -= n.cost;
  s.nodes[id] = true;
  return true;
}








