// Información de niveles que comparten el selector de niveles y el Códice: etapas, equipo y enemigos de cada nivel.
import { LEVELS, waveGroups } from './data/levels.js';
import { ENEMIES } from './data/enemies.js';
import { towerUnlocked, maxSlots } from './data/tree.js';

// Cada 5 niveles se cambia de etapa (y de fondo en el selector)
export const STAGES = [
  { name: 'Praderas de Evelmore', tint: 0xffffff, shade: 0x000000, alpha: 0.25, road: 0xb08a55 },
  { name: 'Colinas y encrucijadas', tint: 0xe8d08a, shade: 0x3a2200, alpha: 0.3, road: 0x9c7445 },
  { name: 'Cumbres y laberintos', tint: 0x9fc7c0, shade: 0x0b2630, alpha: 0.38, road: 0x8a8f96 },
  { name: 'Tierras del Emperador', tint: 0xc0a3e0, shade: 0x1c0a30, alpha: 0.42, road: 0x7d6a8f },
];
export const PER_STAGE = 5;
export const stageOf = (levelIndex) => STAGES[Math.min(STAGES.length - 1, Math.floor(levelIndex / PER_STAGE))];

// Orden de los enemigos en el Códice
export const ENEMY_ORDER = Object.keys(ENEMIES);

// Equipo con el que se jugaría un nivel (misma regla que en la partida)
export function teamFor(sv, lv) {
  if (lv.tutorial) return lv.towers.slice();
  const max = maxSlots(sv);
  const ok = (id) => lv.towers.includes(id) && towerUnlocked(sv, id);
  const saved = (sv.team || []).filter((id) => towerUnlocked(sv, id)).slice(0, max);
  let team = saved.filter(ok);
  for (const id of lv.towers) if (team.length < saved.length && ok(id) && !team.includes(id)) team.push(id);
  if (!team.length) team = lv.towers.filter(ok).slice(0, max);
  if (!team.length) team = lv.towers.slice(0, max);
  return team;
}

// Tipos de enemigo que aparecen en un nivel (oleadas + refuerzos que invoca el jefe)
export function enemiesOfLevel(lv) {
  const set = new Set();
  for (let w = 1; w <= lv.waveCount; w++) for (const g of waveGroups(lv, w)) set.add(g.type);
  for (const t of [...set]) for (const s of ENEMIES[t].summon || []) for (const [u] of s.units) set.add(u);
  return ENEMY_ORDER.filter((t) => set.has(t));
}

// Enemigos ya vistos alguna vez (los demás se muestran como silueta)
export function seenEnemies() {
  try {
    return new Set(JSON.parse(localStorage.getItem('zmcd_seen') || '[]'));
  } catch (e) {
    return new Set();
  }
}

export { LEVELS };
