// Mundo 1: Praderas de Evelmore (10 niveles).
// path: casillas (col,fila) por las que pasa el camino (mapa de 20x8); -1 y 20 quedan fuera de pantalla.
// routes (opcional): lista de caminos completos, para niveles con bifurcación. Todos empiezan en la misma
// entrada y terminan en el mismo castillo; cada zombi elige uno de ellos al salir.
// Las oleadas se generan con waveGroups(): cada oleada trae más zombis, más vida y más
// zombis "en paralelo" (abreast) repartidos en los carriles del camino.
//
// Campos de dificultad de los niveles 4 a 10:
//   countMul: multiplica la cantidad de zombis.   hpScale: multiplica la vida.
//   armoredFrom: oleada desde la que salen zombis blindados.
//   minis: [{ wave, n, types }] oleadas con minijefes (se reparten entre los tipos indicados).
//   boss / bossType: jefe en la última oleada.

// Piezas para construir las bifurcaciones (el tramo común + varias alternativas + el tramo final)
const join = (...parts) => parts.flat();

// Nivel 6: UNA bifurcación (el camino se abre en dos y se vuelve a unir)
const L6_A = join([[-1, 3], [3, 3]], [[3, 1], [9, 1], [9, 3]], [[15, 3], [15, 6], [20, 6]]);
const L6_B = join([[-1, 3], [3, 3]], [[3, 5], [9, 5], [9, 3]], [[15, 3], [15, 6], [20, 6]]);

// Nivel 9: DOS bifurcaciones seguidas (4 recorridos posibles)
const l9 = (a, b) =>
  join(
    [[-1, 4], [3, 4]],
    a === 'N' ? [[3, 2], [7, 2], [7, 4]] : [[3, 6], [7, 6], [7, 4]],
    [[11, 4]],
    b === 'N' ? [[11, 1], [16, 1], [16, 4]] : [[11, 7], [16, 7], [16, 4]],
    [[20, 4]]
  );


// ---- Niveles 11 a 20: mapa grande (30x12 casillas, zoom 2/3) para recorridos más largos
const ALL10 = ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio', 'midas', 'nigromante', 'druida'];
const BIG = { zoom: 2 / 3, towers: ALL10, ramp: true, allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'] };
const SPEC = [['toxico', 3], ['ignifugo', 4], ['rigido', 5]];
const SPEC2 = [['toxico', 2], ['ignifugo', 3], ['rigido', 4]];
// Minijefes en todos los niveles 4-20: el primero en la oleada 10 (solo capitanes), luego en la 13, la 16 y la 20 (a, b, c, d = cuántos)
const M = (a, b, c, d) => [
  { wave: 10, n: a, types: ['capitan'] },
  ...[[13, b], [16, c], [20, d]].map(([wave, n]) => ({ wave, n, types: ['capitan', 'coloso'] })),
];
const mini = (a, b, c) => [{ wave: a[0], n: a[1], types: ['capitan', 'coloso'] }, { wave: b[0], n: b[1], types: ['capitan', 'coloso'] }, { wave: c[0], n: c[1], types: ['capitan', 'coloso'] }];

// nivel 13: una bifurcación al principio y un tramo final largo
const l13 = (a) => join([[-1, 5], [6, 5]], a === 'N' ? [[6, 2], [14, 2], [14, 5]] : [[6, 8], [14, 8], [14, 5]], [[21, 5], [21, 10], [26, 10], [26, 6], [30, 6]]);
// nivel 16: bifurcación con grandes rodeos
const l16 = (a) => join([[-1, 6], [4, 6]], a === 'N' ? [[4, 2], [12, 2], [12, 6]] : [[4, 10], [12, 10], [12, 6]], [[18, 6], [18, 1], [24, 1], [24, 10], [30, 10]]);
// nivel 19: dos bifurcaciones seguidas (4 recorridos) y un tramo final largo
const l19 = (a, b) =>
  join(
    [[-1, 6], [4, 6]],
    a === 'N' ? [[4, 2], [10, 2], [10, 6]] : [[4, 10], [10, 10], [10, 6]],
    [[14, 6]],
    b === 'N' ? [[14, 3], [22, 3], [22, 6]] : [[14, 9], [22, 9], [22, 6]],
    [[26, 6], [26, 1], [30, 1]]
  );
export const LEVELS = [
  {
    id: 1,
    name: 'Praderas · 1',
    subtitle: 'Tutorial. Héroes: Bárbaro y Elfo',
    path: [[-1, 1], [4, 1], [4, 6], [10, 6], [10, 2], [15, 2], [15, 6], [20, 6]],
    towers: ['barbaro', 'elfo'],
    startSupplies: 195,
    hpScale: 1.0,
    tutorial: true,
    waveCount: 6,
    allow: ['normal', 'velocista', 'gladiador'],
  },
  {
    id: 2,
    name: 'Praderas · 2',
    subtitle: 'Zigzag. Alquimista y Mago (se desbloquean en el árbol)',
    path: [[-1, 1], [17, 1], [17, 3], [2, 3], [2, 5], [17, 5], [17, 7], [20, 7]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago'],
    startSupplies: 300,
    hpScale: 1.2,
    waveCount: 15,
    allow: ['normal', 'velocista', 'gladiador', 'paladin'],
  },
  {
    id: 3,
    name: 'Praderas · 3 (Jefe)',
    subtitle: 'Camino largo. Zombi Jefe al final',
    path: [[-1, 6], [3, 6], [3, 1], [8, 1], [8, 5], [13, 5], [13, 1], [18, 1], [18, 6], [20, 6]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago'],
    startSupplies: 390,
    hpScale: 1.1,
    waveCount: 15,
    boss: true,
    allow: ['normal', 'velocista', 'gladiador', 'paladin'],
  },
  {
    id: 4,
    name: 'Pantano · 4',
    subtitle: 'Blindados desde la oleada 7 y primer minijefe en la 8. 15 oleadas',
    path: [[-1, 0], [3, 0], [3, 4], [8, 4], [8, 1], [12, 1], [12, 6], [17, 6], [17, 3], [20, 3]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero'],
    startSupplies: 340,
    hpScale: 1,
    ramp: true,
    countMul: 1,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(1, 1, 2, 2),
    specials: [['toxico', 5]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  {
    id: 5,
    name: 'Cañón · 5',
    subtitle: 'Recorrido largo, 15 oleadas, blindados y varios minijefes',
    path: [[-1, 6], [2, 6], [2, 2], [6, 2], [6, 6], [10, 6], [10, 1], [14, 1], [14, 5], [18, 5], [18, 2], [20, 2]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero'],
    startSupplies: 360,
    hpScale: 1.1,
    ramp: true,
    countMul: 1.05,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(1, 2, 2, 3),
    specials: [['toxico', 4], ['ignifugo', 7]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  {
    id: 6,
    name: 'Encrucijada · 6',
    subtitle: 'BIFURCACIÓN: el camino se abre en dos y se vuelve a unir',
    routes: [L6_A, L6_B],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio'],
    startSupplies: 380,
    hpScale: 1.25,
    ramp: true,
    countMul: 1.1,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(1, 2, 3, 3),
    specials: [['toxico', 4], ['ignifugo', 6], ['rigido', 8]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  {
    id: 7,
    name: 'Colinas · 7',
    subtitle: 'Zigzag vertical, 15 oleadas y varias rondas de minijefes',
    path: [[-1, 4], [2, 4], [2, 0], [6, 0], [6, 7], [10, 7], [10, 0], [14, 0], [14, 7], [17, 7], [17, 3], [20, 3]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio', 'midas'],
    startSupplies: 400,
    hpScale: 1.4,
    ramp: true,
    countMul: 1.2,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(1, 2, 3, 4),
    specials: [['toxico', 3], ['ignifugo', 5], ['rigido', 7]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  {
    id: 8,
    name: 'Serpiente · 8',
    subtitle: 'Camino estrecho y denso, 15 oleadas',
    path: [[-1, 6], [14, 6], [14, 4], [5, 4], [5, 2], [14, 2], [14, 0], [20, 0]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio', 'midas', 'nigromante', 'druida'],
    startSupplies: 440,
    hpScale: 2.2,
    ramp: true,
    countMul: 1.8,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(2, 3, 4, 6),
    specials: [['toxico', 3], ['ignifugo', 4], ['rigido', 6]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  {
    id: 9,
    name: 'Doble encrucijada · 9',
    subtitle: 'DOS BIFURCACIONES seguidas: 4 recorridos posibles',
    routes: [l9('N', 'N'), l9('N', 'S'), l9('S', 'N'), l9('S', 'S')],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio', 'midas', 'nigromante', 'druida'],
    startSupplies: 500,
    hpScale: 1.9,
    ramp: true,
    countMul: 1.5,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(2, 3, 4, 6),
    specials: [['toxico', 3], ['ignifugo', 5], ['rigido', 7]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  {
    id: 10,
    name: 'Trono del Rey · 10 (Jefe)',
    subtitle: 'El REY ZOMBI invoca refuerzos. 15 oleadas',
    path: [[-1, 0], [6, 0], [6, 3], [2, 3], [2, 6], [12, 6], [12, 2], [17, 2], [17, 5], [20, 5]],
    towers: ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio', 'midas', 'nigromante', 'druida'],
    startSupplies: 560,
    hpScale: 2.2,
    ramp: true,
    countMul: 1.6,
    waveCount: 15,
    armoredFrom: 7,
    minis: M(2, 3, 4, 4),
    boss: true,
    bossType: 'rey',
    specials: [['toxico', 3], ['ignifugo', 5], ['rigido', 7]],
    allow: ['normal', 'velocista', 'gladiador', 'paladin', 'blindado', 'toxico', 'ignifugo', 'rigido'],
  },
  // ------------------------------------------------------------------ 11 a 20 (mapa grande)
  {
    id: 11, name: 'Cumbres · 11', subtitle: 'Mapa grande: serpiente larga, 15 oleadas',
    path: [[-1, 1], [26, 1], [26, 4], [3, 4], [3, 7], [26, 7], [26, 10], [30, 10]],
    startSupplies: 600, hpScale: 2.4, countMul: 1.7, waveCount: 15, armoredFrom: 7, specials: SPEC,
    minis: M(2, 3, 4, 6), ...BIG,
  },
  {
    id: 12, name: 'Laberinto · 12', subtitle: 'Muchas curvas y minijefes en 15 oleadas',
    path: [[-1, 5], [5, 5], [5, 1], [11, 1], [11, 9], [17, 9], [17, 2], [23, 2], [23, 10], [27, 10], [27, 5], [30, 5]],
    startSupplies: 620, hpScale: 2.6, countMul: 1.8, waveCount: 15, armoredFrom: 7, specials: SPEC,
    minis: M(2, 4, 5, 7), ...BIG,
  },
  {
    id: 13, name: 'Bifurcación · 13', subtitle: 'BIFURCACIÓN grande al principio. 15 oleadas',
    routes: [l13('N'), l13('S')],
    startSupplies: 640, hpScale: 2.8, countMul: 1.9, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(2, 4, 6, 8), ...BIG,
  },
  {
    id: 14, name: 'Tres pasillos · 14', subtitle: 'Tres tramos larguísimos y rectos. 15 oleadas',
    path: [[-1, 1], [27, 1], [27, 5], [2, 5], [2, 9], [30, 9]],
    startSupplies: 660, hpScale: 3.0, countMul: 2.0, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(3, 5, 6, 9), ...BIG,
  },
  {
    id: 15, name: 'Fortaleza · 15 (Jefe)', subtitle: 'Zombi Jefe gigante en la última de las 15 oleadas',
    path: [[-1, 6], [4, 6], [4, 2], [10, 2], [10, 9], [16, 9], [16, 2], [22, 2], [22, 9], [26, 9], [26, 6], [30, 6]],
    startSupplies: 700, hpScale: 3.2, countMul: 2.1, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(3, 5, 7, 8), boss: true, bossType: 'jefe', bossScale: 12, ...BIG,
  },
  {
    id: 16, name: 'Rodeos · 16', subtitle: 'BIFURCACIÓN con grandes rodeos. 15 oleadas',
    routes: [l16('N'), l16('S')],
    startSupplies: 720, hpScale: 3.4, countMul: 2.2, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(3, 5, 7, 9), ...BIG,
  },
  {
    id: 17, name: 'Dragón · 17', subtitle: 'Recorrido sinuoso gigantesco. 15 oleadas',
    path: [[-1, 10], [8, 10], [8, 6], [3, 6], [3, 2], [15, 2], [15, 8], [21, 8], [21, 3], [27, 3], [27, 7], [30, 7]],
    startSupplies: 740, hpScale: 3.6, countMul: 2.3, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(3, 6, 8, 10), ...BIG,
  },
  {
    id: 18, name: 'Gran muralla · 18', subtitle: 'Tres pasadas por todo el mapa. 15 oleadas',
    path: [[-1, 2], [25, 2], [25, 5], [4, 5], [4, 8], [25, 8], [25, 11], [30, 11]],
    startSupplies: 760, hpScale: 3.8, countMul: 2.4, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(4, 6, 9, 11), ...BIG,
  },
  {
    id: 19, name: 'Cuatro caminos · 19', subtitle: 'DOS BIFURCACIONES seguidas y 15 oleadas',
    routes: [l19('N', 'N'), l19('N', 'S'), l19('S', 'N'), l19('S', 'S')],
    startSupplies: 800, hpScale: 4.0, countMul: 2.5, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(4, 7, 10, 12), ...BIG,
  },
  {
    id: 20, name: 'Trono del Emperador · 20 (Jefe)', subtitle: 'El EMPERADOR ZOMBI invoca legiones. 15 oleadas',
    path: [[-1, 0], [6, 0], [6, 11], [12, 11], [12, 0], [18, 0], [18, 11], [24, 11], [24, 3], [28, 3], [28, 8], [30, 8]],
    startSupplies: 900, hpScale: 4.3, countMul: 2.6, waveCount: 15, armoredFrom: 7, specials: SPEC2,
    minis: M(4, 8, 11, 14), boss: true, bossType: 'emperador', bossScale: 1.6, ...BIG,
  },];

// Progreso dentro del nivel (0 en la primera oleada, 1 en la última). Solo en niveles con "ramp".
export function rampOf(level, w) {
  return level.ramp ? (w - 1) / Math.max(1, level.waveCount - 1) : 1;
}

// Oleadas masivas: la ronda 10 (y la 20 en el modo infernal)
export const isMassive = (level, w) => !level.tutorial && (w === 10 || (level.infernal && w === 20));

// Grupos de zombis de la oleada w (1-based). La dificultad sube con cada oleada:
// más cantidad, más zombis a la vez (hasta 3 de lado), tipos más duros y más vida (en GameScene).
// level.waveCount es 15 (25 en el modo infernal, que se pasa con level.infernal = true).
export function waveGroups(level, w) {
  const k = w - 1;
  const N = level.waveCount;
  // OLEADA MASIVA: 5 grupos grandes (8-10 zombis), uno detrás de otro y cada uno más fuerte que el anterior
  if (isMassive(level, w)) {
    const pool = ['normal', 'velocista', 'gladiador', 'paladin', 'blindado'].filter((t) => level.allow.includes(t));
    const g = [];
    for (let i = 0; i < 5; i++) {
      const type = pool[Math.min(pool.length - 1, Math.floor((i * pool.length) / 5) + (i >= 3 ? 1 : 0))] || 'normal';
      // 8-10 por grupo como mínimo; en los niveles con más zombis los grupos crecen en proporción
      const half = level.id >= 2 && level.id <= 7 ? 0.5 : 1; // niveles 2 a 7: la mitad de zombis
      const size = Math.max(4, Math.round((8 + Math.min(2, i * 0.5)) * Math.max(1, (level.countMul || 1) * (1 + 0.05 * k)) * half));
      if (i === 4) {
        // el último grupo (el más fuerte) se divide en dos: el segundo llega 10 s más tarde
        const a = Math.ceil(size / 2);
        g.push({ type, n: a, abreast: 3, gap: 0.6, hpMul: 1.15 + 0.2 * i, massive: true });
        g.push({ type, n: size - a, abreast: 3, gap: 0.6, hpMul: 1.15 + 0.2 * i, massive: true, delay: 10 });
      } else g.push({ type, n: size, abreast: 3, gap: 0.6, hpMul: 1.15 + 0.2 * i, massive: true });
      if (i === 2 || i === 4) g.push({ type: i === 4 && level.id >= 5 ? 'buitre' : 'cuervo', n: Math.max(2, Math.round((4 + i) * Math.max(1, level.countMul || 1) * (level.id >= 2 && level.id <= 7 ? 0.5 : 1))), abreast: 2, gap: 0.6, hpMul: 1 + 0.15 * i, massive: true });
    }
    return g;
  }
  // niveles 4 a 10: la cantidad extra de zombis crece a lo largo del nivel (empieza como el nivel anterior)
  const mul = 1 + ((level.countMul || 1) - 1) * rampOf(level, w);
  const abreast = Math.min(3, 1 + Math.floor(k / 2.5));
  const hard = level.id >= 7 ? 1 + 0.035 * k : 1; // a partir del nivel 7 la cantidad crece más entre rondas
  const g = [{ type: 'normal', n: Math.round((5 + Math.min(level.id, 6) * 2 + 2.6 * k) * mul * hard), abreast, gap: 1.1 }];
  const ok = (t) => level.allow.includes(t);
  if (w >= 3 && ok('velocista')) g.push({ type: 'velocista', n: Math.round((2 + 1.6 * (w - 2)) * mul), abreast: Math.min(2, abreast), gap: 0.9 });
  if (w >= 4 && ok('gladiador')) g.push({ type: 'gladiador', n: Math.round((1 + 1.3 * (w - 3)) * mul), abreast: w >= 7 ? 2 : 1, gap: 1.8 });
  if (w >= 6 && ok('paladin')) g.push({ type: 'paladin', n: Math.round((1 + 1.0 * (w - 5)) * mul), abreast: w >= 9 ? 2 : 1, gap: 2.2 });
  const af = level.armoredFrom || 99;
  if (w >= af && ok('blindado')) g.push({ type: 'blindado', n: Math.round((1 + 0.8 * (w - af)) * mul), abreast: w >= af + 5 ? 2 : 1, gap: 2.4 });
  // zombis con inmunidades: specials = [[tipo, oleada desde la que salen], ...]
  for (const [type, from] of level.specials || []) {
    if (w >= from) g.push({ type, n: Math.max(1, Math.round((1 + 0.7 * (w - from)) * mul)), abreast: w >= from + 4 ? 2 : 1, gap: 2.0 });
  }
  // minijefes: se reparten entre los tipos indicados y salen entre el resto de la oleada
  const miniWave = (m) => Math.max(2, Math.round((m.wave * N) / 20));
  for (const m of level.minis || []) {
    if (miniWave(m) !== w) continue;
    if (level.id >= 6) g.push({ type: 'jinete', n: 1, abreast: 1, gap: 3.5 }); // minijefe volador
    m.types.forEach((type, i) => {
      const n = Math.floor(m.n / m.types.length) + (i < m.n % m.types.length ? 1 : 0);
      if (n > 0) g.push({ type, n, abreast: 1, gap: 3.5 });
    });
  }
  // VOLADORES: tras el tutorial salen siempre; pocos hasta la ronda 5, luego más y más fuertes
  if (level.tutorial) {
    if (w >= 4) g.push({ type: 'cuervo', n: w - 1, abreast: 1, gap: 1.4 });
  } else {
    if (w < 5) g.push({ type: 'cuervo', n: 1 + Math.floor(w / 3), abreast: 1, gap: 2 });
    else g.push({ type: 'cuervo', n: Math.round((2 + 0.8 * (w - 4)) * mul), abreast: 2, gap: 1.1 });
    if (w >= 6 && level.id >= 3) g.push({ type: 'buitre', n: Math.max(1, Math.round((1 + 0.5 * (w - 6)) * mul)), abreast: 1, gap: 1.8 });
    if (w >= 9 && level.id >= 5) g.push({ type: 'gargola', n: Math.max(1, Math.round((1 + 0.35 * (w - 9)) * mul)), abreast: 1, gap: 2.4 });
  }
  // OLEADA FINAL: más zombis y más fuertes, con enemigos maestro (el doble de resistencia), antes del jefe
  if (!level.tutorial && w === N) {
    const out = [];
    for (const q of g) {
      const def = q.type;
      const n = Math.round(q.n * 1.3);
      const nm = ['capitan', 'coloso', 'jinete'].includes(def) ? 0 : Math.max(1, Math.round(n * 0.4));
      if (n - nm > 0) out.push({ ...q, n: n - nm, hpMul: 1.2 });
      if (nm > 0) out.push({ ...q, type: def + '_m', n: nm, abreast: Math.min(2, q.abreast), gap: q.gap * 1.2, hpMul: 1.2 });
    }
    g.length = 0;
    g.push(...out);
  }
  if (level.boss && w === N) g.push({ type: level.bossType || 'jefe', n: 1, abreast: 1, gap: 1 });
  return g;
}




