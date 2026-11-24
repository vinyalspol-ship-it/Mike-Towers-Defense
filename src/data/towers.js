// Defensas con 3 caminos (A, B, C) de 4 niveles cada uno.
// Reglas en partida (las aplica GameScene.upgradeState):
//  - Cada camino se compra en orden: nivel 1 -> 2 -> 3 -> 4.
//  - Niveles 1 y 2: se pueden comprar en los 3 caminos.
//  - Nivel 3: solo en 2 de los 3 caminos (al tener 2 caminos en nivel 3, el tercero se bloquea).
//  - Nivel 4: solo UNO en toda la defensa (al comprarlo se bloquean los demás).
//  - Además, cada nivel hay que desbloquearlo antes en el árbol de mejoras (meta).
// El nivel 4 del camino B es siempre la HABILIDAD ESPECIAL activa de la defensa.
// Las cifras reales de combate están en GameScene.stats(); aquí textos y costes.
// (Las celdas marcadas "inventada" no estaban en el documento original.)
import { EXTRA_TOWERS } from './towers2.js';

export const TOWERS = {
  barbaro: {
    id: 'barbaro',
    short: 'bar',
    name: 'Bárbaro',
    emoji: '🪓',
    color: 0xb03a2e,
    cost: 55,
    desc: 'Corta distancia. Ataque en cono.',
    skill: { name: 'Cuerno Vikingo', icon: '🎺', cooldown: 26 },
    paths: {
      A: {
        name: 'Torbellino',
        tiers: [
          { name: 'Furia', desc: 'Ataca un 30% más rápido', cost: 35 },
          { name: 'Espada larga', desc: '+15% de alcance', cost: 55 },
          { name: 'Ataque giratorio', desc: 'Golpea a todo su alrededor (360º)', cost: 110 },
          { name: 'Sed de sangre', desc: 'Cada baja cerca suya: +10% vel. ataque 3 s (máx. x5)', cost: 200 }, // inventada
        ],
      },
      B: {
        name: 'Vikingo',
        tiers: [
          { name: 'Filo afilado', desc: '+25% de daño', cost: 35 }, // inventada
          { name: 'Golpe contundente', desc: 'Empuja hacia atrás a UN zombi por golpe', cost: 55 }, // inventada
          { name: 'Hacha de guerra', desc: '+20% de zona, de daño y de velocidad de ataque', cost: 110 },
          { name: 'Cuerno Vikingo', desc: 'ACTIVA: +30% vel. ataque a todos y Bárbaros x2 daño 6 s (26 s)', cost: 190 },
        ],
      },
      C: {
        name: 'Cazador de jefes',
        tiers: [
          { name: 'Golpe brutal', desc: 'Los críticos hacen x3 (en vez de x2)', cost: 35 }, // inventada
          { name: 'Ojo letal', desc: '+20% prob. de crítico', cost: 55 },
          { name: 'Ataque múltiple', desc: 'Cada 4 ataques hace un ataque triple (tres golpes seguidos)', cost: 110 },
          { name: 'Conquistador', desc: 'x5 de daño a jefes y minijefes', cost: 200 },
        ],
      },
    },
  },

  elfo: {
    id: 'elfo',
    short: 'elf',
    name: 'Elfo',
    emoji: '🏹',
    color: 0x2e8b57,
    cost: 75,
    desc: 'Largo alcance con arco.',
    skill: { name: 'Lluvia de flechas', icon: '🌧️', cooldown: 17 },
    paths: {
      A: {
        name: 'Arquero ágil',
        tiers: [
          { name: 'Disparo rápido', desc: 'Dispara un 40% más rápido', cost: 40 },
          { name: 'Cazador', desc: '+5% daño por zombi cercano (máx. x2)', cost: 60 },
          {
            name: 'Magia oscura',
            desc: 'Ignoran la armadura. x2 de daño a jefes y minijefes',
            doc: 'Las flechas del elfo ignoran la armadura de los enemigos. X2 de daño a jefes y minijefes.',
            cost: 120,
          },
          { name: 'Ejecutor', desc: 'x3 de daño a zombis con menos del 35% de vida', cost: 210 },
        ],
      },
      B: {
        name: 'Maestro del arco',
        tiers: [
          { name: 'Ojo de águila', desc: '+20% de alcance', cost: 40 }, // inventada
          { name: 'Doble flecha', desc: 'Dispara +1 flecha', cost: 65 },
          { name: 'Ojo de halcón', desc: '+40% de alcance y +30% de probabilidad de crítico', doc: '+40% de alcance y +30% de probabilidad de crítico (x2 de daño)', cost: 115 },
          { name: 'Lluvia de flechas', desc: 'ACTIVA: cae sobre todos los zombis (17 s)', cost: 200 },
        ],
      },
      C: {
        name: 'Francotirador',
        tiers: [
          { name: 'Carcaj reforzado', desc: '+25% de daño', cost: 40 }, // inventada
          { name: 'Flechas gélidas', desc: 'Ralentizan un 25% durante 1,5 s', cost: 60 }, // inventada
          {
            name: 'Flechas afiladas',
            desc: 'Atraviesan hasta 3 zombis alineados',
            doc: '+2 de penetración (la flecha desaparece tras impactar sobre el 3r zombi si están alineados)',
            cost: 115,
          },
          {
            name: 'Telequinesis',
            desc: 'Al atravesar, la flecha se curva hacia otro enemigo',
            doc: 'Las flechas que atraviesan a un enemigo se redirigen en forma de curva hacia el siguiente enemigo.',
            cost: 210,
          },
        ],
      },
    },
  },

  alquimista: {
    id: 'alquimista',
    short: 'alq',
    name: 'Alquimista',
    emoji: '⚗️',
    color: 0x7d3c98,
    cost: 90,
    desc: 'Pociones que dejan una zona dañina.',
    skill: { name: 'Pócima dorada', icon: '🧪', cooldown: 25 },
    paths: {
      A: {
        name: 'Pócima expansiva',
        tiers: [
          { name: 'Poción grande', desc: 'Poción y zona un 30% mayores', cost: 45 },
          { name: 'Residuo duradero', desc: 'La zona dura +2 s', cost: 65 }, // inventada
          { name: 'Lanzador veloz', desc: 'Lanza un 30% más rápido', cost: 110 }, // inventada
          { name: 'Pócima volátil', desc: 'Explota al caer (x3 de daño)', cost: 200 }, // inventada
        ],
      },
      B: {
        name: 'Maestro de reactivos',
        tiers: [
          { name: 'Ácido concentrado', desc: '+30% de daño de la zona', cost: 45 }, // inventada
          {
            name: 'Viscosidad',
            desc: 'Tras 2 ataques, la 3ª poción vuelve dorados a los zombis (+30% de suministros)',
            doc: 'Tras atacar dos veces carga una poción que convierte a los zombis en dorados',
            cost: 65,
          },
          { name: 'Doble frasco', desc: 'Lanza 2 pociones a la vez', cost: 115 }, // inventada
          {
            name: 'Pócima dorada',
            desc: 'ACTIVA: pócima enorme que vuelve dorados a los zombis (25 s)',
            doc: 'ACTIVA: pócima ENORME que vuelve dorados a los zombis en un área mucho más grande (25 s)',
            cost: 210,
          },
        ],
      },
      C: {
        name: 'Toxicólogo',
        tiers: [
          { name: 'Gran alcance', desc: '+20% de alcance', cost: 45 }, // inventada
          { name: 'Corrosión', desc: 'Zombis en la zona reciben +20% de daño', cost: 65 }, // inventada
          { name: 'Veneno', desc: 'Envenena 7 s (no acumulable)', cost: 120 },
          { name: 'Epidemia', desc: 'Los envenenados contagian a los cercanos', cost: 210 }, // inventada
        ],
      },
    },
  },

  mago: {
    id: 'mago',
    short: 'mag',
    name: 'Mago',
    emoji: '🔮',
    color: 0x2874a6,
    cost: 110,
    desc: 'Daño en área.',
    skill: { name: 'Meteoritos', icon: '🌠', cooldown: 25 },
    paths: {
      A: {
        name: 'Arcanista',
        tiers: [
          { name: 'Explosión mayor', desc: '+25% de radio de explosión', cost: 50 },
          { name: 'Hechizo veloz', desc: '+20% de cadencia', cost: 70 },
          {
            name: 'Eco arcano',
            desc: 'Los hechizos se fragmentan en abanico al impactar',
            doc: 'Los hechizos se fragmentan en abanico tras impactar (hacia delante, no hacia todos los lados). Los fragmentos tienen penetración infinita.',
            cost: 160,
          },
          {
            name: 'Supernova',
            desc: 'Cada 5º hechizo: aura de luz con daño continuo',
            doc: 'Cada 5º hechizo: El hechizo gana un aura de luz que hace daño continuo a los zombis que estén cerca',
            cost: 190,
          },
        ],
      },
      B: {
        name: 'Piromante',
        tiers: [
          { name: 'Poder ígneo', desc: '+25% de daño', cost: 50 },
          {
            name: 'Piroclasto',
            desc: 'Cada 3 ataques: disparo volcánico (x2 daño, más radio, prende)',
            doc: 'Carga un disparo volcánico cada 3 ataques. El disparo volcánico hace el doble de daño, tiene un radio de explosión un poco más grande y prende a los enemigos en llamas.',
            cost: 90,
          },
          { name: 'Cadáveres ardientes', desc: 'Los que mueren ardiendo explotan', cost: 125 },
          { name: 'Meteoritos', desc: 'ACTIVA: lluvia de meteoritos (25 s)', cost: 220 },
        ],
      },
      C: {
        name: 'Tormenta',
        tiers: [
          { name: 'Orbe gélido', desc: 'Ralentiza un 25% durante 8 s (no acumulable)', doc: 'Ralentiza un 25% durante 8s. El efecto gélido no es acumulable.', cost: 45 },
          { name: 'Largo alcance', desc: '+20% de alcance', cost: 65 },
          { name: 'Orbe doble', desc: 'Lanza otro orbe gélido tras disparar', cost: 140 },
          {
            name: 'Cadena de rayos',
            desc: 'Cada pocos segundos: rayo que salta entre enemigos',
            doc: 'Cada pocos segundos dispara un ataque continuo que, tras impactar, se redirige casi instantáneamente hacia los enemigos en un rango medio alto',
            cost: 220,
          },
        ],
      },
    },
  },
};

// Los niveles 1 y 2 de cada camino cuestan un 15% menos (redondeado a múltiplos de 5).
for (const t of Object.values(TOWERS)) {
  for (const p of Object.values(t.paths)) {
    for (let i = 0; i < 2; i++) p.tiers[i].cost = Math.max(5, Math.round((p.tiers[i].cost * 0.85) / 5) * 5);
  }
}

// Las mejoras suben de precio de forma progresiva: las primeras poco, las últimas mucho.
const TIER_MULT = [1.1, 1.35, 1.4, 1.5];
for (const t of Object.values(TOWERS)) {
  for (const p of Object.values(t.paths)) {
    p.tiers.forEach((u, i) => { u.cost = Math.round((u.cost * TIER_MULT[i]) / 5) * 5; });
  }
}

// Defensas nuevas (costes tal cual el documento de diseño)
Object.assign(TOWERS, EXTRA_TOWERS);
// Las defensas nuevas (costes del documento) bajan un 12% en los niveles 3 y 4, igual que las antiguas (que tienen un multiplicador menor).
for (const t of Object.values(EXTRA_TOWERS)) {
  for (const p of Object.values(t.paths)) {
    p.tiers[2].cost = Math.round((p.tiers[2].cost * 0.8) / 5) * 5; // nivel 3: -20%
    p.tiers[3].cost = Math.round((p.tiers[3].cost * 0.74) / 5) * 5; // nivel 4: -26%
  }
}
// Mejoras de nivel 3 y 4 de menor impacto: un 8% más baratas todavía
const LOW_IMPACT = new Set([
  'Sed de sangre', 'Conquistador', 'Ataque múltiple', 'Ojo de halcón', 'Ejecutor', 'Lanzador veloz', 'Pócima volátil', 'Epidemia',
  'Cadáveres ardientes', 'Orbe doble', 'Supernova', 'Empalamiento', 'Muro de picas', 'Abanico', 'Lanza del rey', 'Santuario',
  'Misericordia', 'Plaga bendita', 'Ascensión', 'Campo minado', 'Taller móvil', 'Detonación en cadena', 'Autómata', 'Gran rebote',
  'Sobrecalentamiento', 'Golpe de gracia', 'Estatua', 'Soborno', 'Midas verdadero', 'Cofre del tirano', 'Horda', 'Pacto de sangre',
  'Rayo de almas', 'Señor de los muertos', 'Inversión armamentística', 'Interés', 'Árbol ancestral', 'Foco arcano',
]);
for (const t of Object.values(TOWERS)) {
  for (const p of Object.values(t.paths)) {
    for (const i of [2, 3]) if (LOW_IMPACT.has(p.tiers[i].name)) p.tiers[i].cost = Math.round((p.tiers[i].cost * 0.92) / 5) * 5;
  }
}
// Mejoras de gran impacto en el daño (habilidades activas y multiplicadores de cadencia): más caras.
// El número es el multiplicador del precio ya calculado (el Ataque fantasma del Lancero cuesta el doble).
const HIGH_IMPACT = {
  'Ataque fantasma': 2.0,
  'Aluvión': 1.6,
  'Meteoritos': 1.5,
  'Lluvia de flechas': 1.5,
  'Apocalipsis': 1.5,
  'Moneda lanzada': 1.5,
  'Cuerno Vikingo': 1.4,
  'Pócima dorada': 1.4,
  'Tormenta de almas': 1.4,
  'Cadena de rayos': 1.4,
  'Doble frasco': 1.35,
  'Juicio divino': 1.3,
  'Sobrecarga': 1.3,
  'Lanzador veloz': 1.3,
  'Doble flecha': 1.3,
  'Hacha de guerra': 1.2,
};
for (const t of Object.values(TOWERS)) {
  for (const p of Object.values(t.paths)) {
    for (const u of p.tiers) if (HIGH_IMPACT[u.name]) u.cost = Math.round((u.cost * HIGH_IMPACT[u.name]) / 5) * 5;
  }
}

export const TOWER_ORDER = ['barbaro', 'elfo', 'alquimista', 'mago', 'lancero', 'monje', 'ingeniero', 'asedio', 'midas', 'nigromante', 'druida'];
export const PATH_KEYS = ['A', 'B', 'C'];




