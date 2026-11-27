// Tipos de daño, resistencias y propiedades (Actualización General).
// Cada zombi tiene una resistencia (0..1) por tipo de daño en e.res; el daño de ese tipo se reduce en ese %.
export const DTYPES = {
  normal: { name: 'Normal', color: 0xbdbdbd, css: '#d7ccc8' },
  magico: { name: 'Mágico', color: 0x7e57c2, css: '#b39ddb' },
  fuego: { name: 'Fuego', color: 0xff7043, css: '#ffab91' },
  veneno: { name: 'Veneno', color: 0x8bc34a, css: '#c5e1a5' },
  electrico: { name: 'Eléctrico', color: 0x4fc3f7, css: '#81d4fa' },
  oscuridad: { name: 'Oscuridad', color: 0x4a148c, css: '#ce93d8' },
  luz: { name: 'Luz', color: 0xfff176, css: '#fff59d' },
  natural: { name: 'Natural', color: 0x2e7d32, css: '#a5d6a7' },
};
export const DTYPE_KEYS = Object.keys(DTYPES);

// Tipo de daño del ataque normal de cada héroe
export const HERO_DTYPE = {
  barbaro: 'normal',
  elfo: 'normal', // con Magia oscura pasa a oscuridad
  lancero: 'normal',
  ingeniero: 'normal',
  asedio: 'normal',
  midas: 'normal',
  mago: 'magico', // rayos: eléctrico · Supernova y Orbe arcano: luz
  alquimista: 'magico',
  monje: 'luz',
  nigromante: 'oscuridad',
  druida: 'natural',
};

// Héroes que NO pueden dañar a los voladores (tampoco sus trampas, torretas ni pociones)
export const NO_AIR = new Set(['alquimista', 'barbaro', 'asedio', 'ingeniero']);
export const isAntiAir = (type) => !NO_AIR.has(type);

// Resistencias predominantes de cada nivel (provisional: el diseño final está pendiente).
// Muchos zombis del nivel tendrán una resistencia alta a uno de estos tipos.
export const LEVEL_PREDOM = {
  2: ['normal'],
  3: ['magico'],
  4: ['veneno'],
  5: ['normal', 'fuego'],
  6: ['magico', 'oscuridad'],
  7: ['normal', 'luz'],
  8: ['fuego', 'veneno'],
  9: ['magico', 'natural'],
  10: ['normal', 'magico'],
  11: ['electrico'],
  12: ['normal', 'oscuridad'],
  13: ['magico', 'fuego'],
  14: ['luz', 'veneno'],
  15: ['normal', 'magico'],
  16: ['natural', 'electrico'],
  17: ['fuego', 'oscuridad'],
  18: ['normal', 'luz'],
  19: ['magico', 'veneno'],
  20: ['normal', 'magico'],
};
export const predomOf = (levelId) => LEVEL_PREDOM[levelId] || [];

// Lista legible de resistencias de un zombi ({tipo: valor}) -> 'Normal 30% · Mágico 15%'
export function resText(res) {
  const parts = DTYPE_KEYS.filter((k) => (res[k] || 0) > 0.001).map((k) => `${DTYPES[k].name} ${Math.round(res[k] * 100)}%`);
  return parts.length ? parts.join(' · ') : 'Ninguna';
}

// Resistencias base de un tipo de zombi (las de la ficha, sin el extra por oleada/nivel)
export function baseRes(def) {
  const r = {};
  if (def.resist) r.normal = def.resist;
  if (def.mres) r.magico = def.mres;
  for (const [k, v] of Object.entries(def.res || {})) r[k] = Math.max(r[k] || 0, v);
  return r;
}

// Propiedades de un tipo de zombi para mostrarlas (Pesado, Ágil, Volador, inmunidades...)
export function propsOf(def) {
  const p = [];
  if (def.flying) p.push('Volador');
  if (def.heavy) p.push('Pesado');
  if (def.agile) p.push('Ágil');
  if (def.noStun || def.mini || def.boss) p.push('Inmune al aturdimiento');
  if (def.noPush || def.mini || def.boss) p.push('Inmune al empuje');
  if (def.noPoison) p.push('Inmune al veneno');
  if (def.noFire) p.push('Inmune a la quemadura');
  if (def.noSlow) p.push('Inmune a ralentizar');
  return p;
}
