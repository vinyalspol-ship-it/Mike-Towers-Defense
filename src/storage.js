// Guardado local (localStorage). Todo el progreso vive aquí.
const KEY = 'zmcd_save_v3';
const OLD_KEYS = ['zmcd_save_v2', 'zmcd_save_v1'];
// Nodos que se conservan al migrar desde versiones anteriores (el resto del árbol cambió)
const KEEP_NODE = /^(root|eco_|br_|gem_|rich_)/;
// Personajes gratuitos: siempre desbloqueados
const FREE = ['char_bar', 'char_elf'];

const DEFAULT = () => ({
  coins: 5, // las partidas nuevas empiezan con 5 monedas (justo para el Cuartel de Evelmore)
  brains: 0,
  ingots: 0,
  nodes: {}, // nodos del árbol comprados
  cleared: {},
  stars: {}, // mejor puntuación de estrellas (1-3) por nivel
  team: [], // equipo elegido (últimas defensas usadas)
});

let state = null;

function withFree(s) {
  FREE.forEach((id) => (s.nodes[id] = true));
  return s;
}

export function load() {
  if (state) return state;
  const d = DEFAULT();
  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!parsed) {
      for (const k of OLD_KEYS) {
        const old = JSON.parse(localStorage.getItem(k) || 'null');
        if (old) {
          const nodes = {};
          Object.keys(old.nodes || {}).forEach((id) => KEEP_NODE.test(id) && (nodes[id] = true));
          parsed = { coins: old.coins, brains: old.brains, ingots: old.ingots, cleared: old.cleared, nodes };
          break;
        }
      }
    }
  } catch (e) {
    parsed = null;
  }
  state = withFree({ ...d, ...(parsed || {}), nodes: { ...d.nodes, ...((parsed && parsed.nodes) || {}) } });
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    /* sin almacenamiento disponible */
  }
}

export function reset() {
  state = withFree(DEFAULT());
  save();
  return state;
}


