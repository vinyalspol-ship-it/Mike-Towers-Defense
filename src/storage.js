// Guardado local (localStorage). Todo el progreso vive aquí.
// Versión del guardado. Al subirla, las partidas guardadas de versiones anteriores se BORRAN y sus jugadores reciben un regalo.
const KEY = 'zmcd_save_v4';
const OLD_KEYS = ['zmcd_save_v3', 'zmcd_save_v2', 'zmcd_save_v1'];
export const GIFT_COINS = 50; // regalo por el reinicio del progreso
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
  let gift = false;
  const d = DEFAULT();
  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!parsed && OLD_KEYS.some((k) => localStorage.getItem(k) !== null)) {
      // había una partida de una versión anterior: se borra (y los enemigos descubiertos) y se da un regalo
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('zmcd_seen');
      gift = true;
    }
  } catch (e) {
    parsed = null;
  }
  state = withFree({ ...d, ...(parsed || {}), nodes: { ...d.nodes, ...((parsed && parsed.nodes) || {}) } });
  if (gift) {
    state.coins += GIFT_COINS;
    state.giftMsg = true; // el menú lo avisa una vez
    save();
  }
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


