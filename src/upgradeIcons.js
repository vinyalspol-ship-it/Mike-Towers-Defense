// Iconos de las mejoras (pack "Raven Fantasy Icons", 32x32). Cada icono es el número del archivo fbNNN.png del pack;
// el script de copia los deja en public/assets/game/icons/ic_<nombre>.png.
// iconKeyFor() elige el icono de una mejora por su texto (palabras clave) y las habilidades activas tienen el suyo.
export const ICON_IDS = {
  damage: 727, power: 657, speed: 688, boot: 658, range: 1100, area: 767, crit: 1005, ice: 1014, fire: 997, poison: 810,
  lightning: 1025, arcane: 737, gold: 131, bag: 160, luck: 668, life: 659, shield: 664, summon: 1073, skull: 674, holy: 670,
  star: 683, trap: 127, nature: 966, beast: 1072, swarm: 1070, bomb: 764, pierce: 156, target: 684, ghost: 672, meteor: 759,
  arrows: 2155, potion: 280, crossed: 721, apoc: 863, ingot: 150,
};

// habilidades activas (nivel 4 del camino B de cada defensa)
const SKILL_ICON = {
  'Cuerno Vikingo': 'crossed',
  'Lluvia de flechas': 'arrows',
  'Pócima dorada': 'potion',
  Meteoritos: 'meteor',
  'Ataque fantasma': 'ghost',
  'Juicio divino': 'holy',
  Sobrecarga: 'lightning',
  Aluvión: 'bomb',
  'Fiebre del oro': 'bag',
  Apocalipsis: 'apoc',
  Polillas: 'swarm',
};

// [expresión, icono]: gana la primera que coincide
const RULES = [
  [/veneno|epidemia|tóxic|contagio/i, 'poison'],
  [/fuego|llama|ígneo|incend|arde|brea|volcán|calor|ardiente/i, 'fire'],
  [/hielo|gélid|congel|ralentiz|helad/i, 'ice'],
  [/rayo|relámpago|eléctr/i, 'lightning'],
  [/dorad|oro|moneda|suministro|chatarra|cofre|interés|tributo|diezmo|recaud|soborno|inversi/i, 'gold'],
  [/crític|letal|brutal/i, 'crit'],
  [/alcance|rango|águila|halcón|largo|telémetro|jabalin|telequinesis/i, 'range'],
  [/radio|zona|área|explosi|fragment|eco |giratorio|360|abanico|aluvi|munición pesada/i, 'area'],
  [/velocidad|cadencia|rápid|veloz|furia|fervor|aullido|ráfaga/i, 'speed'],
  [/vida|cura|restaura|misericordia/i, 'life'],
  [/armadura|escudo|resistencia|blind|muro|anti-/i, 'shield'],
  [/esbirro|resurrecc|horda|invoca|lobo|manada|ent |torreta|autómata|golem|gigante|polilla|señor/i, 'summon'],
  [/alma|maldici|sangre|muert|pacto/i, 'skull'],
  [/jefe|conquistador|rey/i, 'skull'],
  [/aturd|inmoviliz|ancla|raíz|raíces|espina|atrap|cepo|mina|trampa|campo minado|cadena/i, 'trap'],
  [/marca|duelo|empalamiento|castigo|punto débil/i, 'target'],
  [/luz|bendic|santuario|exorc|divino|sagrad|corona|ascensi|plaga/i, 'holy'],
  [/daño|golpe|filo|hacha|poder|afilad|punta|astilla|lanza|disparo|flecha|ataque/i, 'damage'],
];

// Clave de imagen (ic_<nombre>) del icono de una mejora
export function iconKeyFor(name, desc = '') {
  if (SKILL_ICON[name]) return 'ic_' + SKILL_ICON[name];
  const text = `${name} ${desc}`;
  for (const [re, key] of RULES) if (re.test(text)) return 'ic_' + key;
  return 'ic_star';
}
