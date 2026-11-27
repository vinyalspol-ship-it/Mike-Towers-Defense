// Defensas nuevas (propuesta del documento de Drive "Propuesta de 8 defensas nuevas"; faltan Criogenizador y Druida).
// Mismas reglas que las demás: 3 caminos x 4 niveles, nivel 3 en 2 de 3 caminos, nivel 4 en uno, y el 4 del camino B es la habilidad activa.
// Los costes son los del documento (no pasan por el recalculo de precios de towers.js).
// Las cifras de combate están en src/newTowers.js.
export const EXTRA_TOWERS = {
  lancero: {
    id: 'lancero',
    short: 'lan',
    name: 'Lancero',
    emoji: '🔱',
    color: 0xd4a017,
    cost: 130,
    desc: 'Ataca en línea recta y atraviesa a todos.',
    skill: { name: 'Ataque fantasma', icon: '👻', cooldown: 28 },
    paths: {
      A: {
        name: 'Pica larga',
        tiers: [
          { name: 'Asta reforzada', desc: '+20% de rango', cost: 35 },
          { name: 'Clavar lanza', desc: 'Ancla al primer zombi 3 s (jefes 1 s). Máx. 4 veces por zombi', cost: 60 },
          { name: 'Empalamiento', desc: 'Los anclados reciben +40% de daño de todos los héroes 4 s', cost: 200 },
          { name: 'Muro de picas', desc: 'Cada 10 s clava picas en el camino: -40% velocidad y daño 6 s', cost: 400 },
        ],
      },
      B: {
        name: 'Jabalinero',
        tiers: [
          { name: 'Jabalinas', desc: 'La lanza llega el doble de lejos (mismo rango)', cost: 60 },
          { name: 'Lanza recuperable', desc: 'La jabalina vuelve y golpea una segunda vez a los que atraviesa', cost: 90 },
          { name: 'Abanico', desc: 'Cada 4º lanzamiento: 5 jabalinas en abanico', cost: 200 },
          { name: 'Ataque fantasma', desc: 'ACTIVA: 6 lanzas fantasma que rebotan 5 veces en los bordes (28 s)', cost: 600 },
        ],
      },
      C: {
        name: 'Justador',
        tiers: [
          { name: 'Punta de acero', desc: '+40% de daño al zombi que va en cabeza', cost: 35 },
          { name: 'Duelo', desc: 'El zombi con más vida a tiro recibe x1,5 de su daño', cost: 60 },
          { name: 'Impulso', desc: 'Cada baja: el siguiente golpe hace x3 y llega más lejos (combo máx. x3)', cost: 200 },
          { name: 'Lanza del rey', desc: 'x3 a enemigos con armadura, jefes y minijefes', cost: 430 },
        ],
      },
    },
  },

  monje: {
    id: 'monje',
    short: 'mon',
    name: 'Monje',
    emoji: '🙏',
    color: 0xf1c40f,
    cost: 70,
    desc: 'Poco daño, pero potencia a los héroes de alrededor.',
    skill: { name: 'Ascensión', icon: '✨', cooldown: 50 },
    paths: {
      A: {
        name: 'Bendiciones',
        tiers: [
          { name: 'Aura de fervor', desc: 'Los héroes cercanos disparan un 10% más rápido', cost: 50 },
          { name: 'Corona de luz', desc: 'El aura también da +10% de daño', cost: 65 },
          { name: 'Santuario', desc: 'Zombis dentro del aura: -15% de velocidad', cost: 200 },
          { name: 'Juicio divino', desc: 'Cada 30 s: columna de luz sobre los 5 zombis con más vida y los marca (automático)', cost: 500 },
        ],
      },
      B: {
        name: 'Milagros',
        tiers: [
          { name: 'Castigo', desc: '+50% de daño a zombis ya dañados', cost: 40 },
          { name: 'Diezmo de caridad', desc: 'Al empezar cada ronda: +10 suministros por cada héroe', cost: 80 },
          { name: 'Misericordia', desc: 'Oleada superada sin fugas: +2 vidas', cost: 220 },
          { name: 'Ascensión', desc: 'ACTIVA: el héroe más cercano asciende 10 s: x2 de daño y de cadencia, un 10% más grande (50 s)', cost: 475 },
        ],
      },
      C: {
        name: 'Exorcista',
        tiers: [
          { name: 'Palabra de silencio', desc: 'Cada 4 s aturde 0,5 s al zombi más cercano', cost: 35 },
          { name: 'Rezo', desc: 'El aturdimiento dura 2 s', cost: 90 },
          { name: 'Exorcismo', desc: 'Los zombis con menos del 15% de vida en su rango se desintegran y explotan en luz', cost: 220 },
          { name: 'Plaga bendita', desc: 'Al aturdir a un enemigo, aturde también hasta 3 enemigos cercanos', cost: 700 },
        ],
      },
    },
  },

  ingeniero: {
    id: 'ingeniero',
    short: 'ing',
    name: 'Ingeniero',
    emoji: '⚙️',
    color: 0x7f8c8d,
    cost: 85,
    desc: 'Trampas, torretas y chatarra. Ataca poco por sí mismo.',
    skill: { name: 'Sobrecarga', icon: '⚙️', cooldown: 24 },
    paths: {
      A: {
        name: 'Trampero',
        tiers: [
          { name: 'Cepos', desc: 'Hasta 3 cepos en el camino: aturden 3 s (recarga 10 s)', cost: 30 },
          { name: 'Minas', desc: 'Coloca 3 minas en el camino; al explotar, las repone a los 6 s', cost: 55 },
          { name: 'Campo minado', desc: 'Hasta 6 cepos, que se recolocan solos 10 s después de activarse', cost: 180 },
          { name: 'Detonación en cadena', desc: 'Una mina al explotar lanza una detonación en cruz (x1,5)', cost: 385 },
        ],
      },
      B: {
        name: 'Maquinista',
        tiers: [
          { name: 'Torreta de ballesta', desc: 'Monta una torreta de ballesta que dispara sola', cost: 30 },
          { name: 'Batería de torretas', desc: 'El Ingeniero coloca +2 torretas (3 en total)', cost: 55 },
          { name: 'Torretas especiales', desc: 'Cada torreta gana un efecto: triple disparo, lanza-cepos y disparo de fuego', cost: 180 },
          { name: 'Sobrecarga', desc: 'ACTIVA: 8 s todos los ingenios disparan x3 (24 s)', cost: 385 },
        ],
      },
      C: {
        name: 'Inventor',
        tiers: [
          { name: 'Taller móvil', desc: 'Botón «Mover héroe»: pausa el juego y recoloca a un héroe donde quieras (un héroe, una vez por oleada)', cost: 45 },
          { name: 'Engranaje', desc: '+15% de alcance para el Ingeniero y los héroes cercanos', cost: 95 },
          { name: 'Chatarrero', desc: 'Cada baja dentro de su alcance: +1 suministro (máx. +2 con dos Ingenieros)', cost: 180 },
          { name: 'Autómata', desc: 'Un golem de chatarra nace junto al Ingeniero, persigue a los zombis y les lanza proyectiles (30 s)', cost: 385 },
        ],
      },
    },
  },

  asedio: {
    id: 'asedio',
    short: 'sie',
    name: 'Maestro de asedio',
    emoji: '🪨',
    color: 0xa04000,
    cost: 170,
    desc: 'Catapulta lenta de gran alcance. No puede golpear lo que tiene cerca.',
    skill: { name: 'Aluvión', icon: '☄️', cooldown: 30 },
    paths: {
      A: {
        name: 'Bombardeo',
        tiers: [
          { name: 'Munición pesada', desc: '+40% de daño', cost: 45 },
          { name: 'Piedras rebotadoras', desc: 'La roca rebota una vez hacia el enemigo más cercano tras impactar (si está cerca, a unos 3 héroes de distancia)', cost: 80 },
          { name: 'Fragmentación', desc: 'Cada 4 ataques: roca que al explotar lanza 8 ataques en anillo', cost: 260 },
          { name: 'Triple-cañón', desc: 'Cada disparo lanza además 2 proyectiles a enemigos aleatorios', cost: 560 },
        ],
      },
      B: {
        name: 'Fuego griego',
        tiers: [
          { name: 'Brea', desc: 'La roca prende fuego 8 s', cost: 45 },
          { name: 'Barril explosivo', desc: 'Cada 3º tiro es un barril con el doble de radio', cost: 80 },
          { name: 'Sobrecalentamiento', desc: 'Los zombis ardiendo reciben +50% de daño de piedra', cost: 260 },
          { name: 'Aluvión', desc: 'ACTIVA: 12 rocas en 5 s sobre los zombis más adelantados (30 s)', cost: 560 },
        ],
      },
      C: {
        name: 'Artillero',
        tiers: [
          { name: 'Telémetro', desc: '+25% de alcance', cost: 45 },
          { name: 'Tiro anticipado', desc: 'Apunta a donde estará el zombi (no falla contra rápidos)', cost: 80 },
          { name: 'Anti-armadura', desc: 'Ignora el 50% de la resistencia', cost: 260 },
          { name: 'Golpe de gracia', desc: 'Cada 8 s: obús con x10 de daño al zombi con más vida y lo aturde 5 s', cost: 560 },
        ],
      },
    },
  },

  midas: {
    id: 'midas',
    short: 'mid',
    name: 'Rey Midas',
    emoji: '👑',
    color: 0xf4d03f,
    cost: 100,
    desc: 'Economía: vuelve dorados a los zombis. Casi no hace daño.',
    skill: { name: 'Fiebre del oro', icon: '💰', cooldown: 40 },
    paths: {
      A: {
        name: 'Toque dorado',
        tiers: [
          { name: 'Toque', desc: 'Cada 5 s vuelve dorado a un zombi (+30% de suministros)', cost: 55 },
          { name: 'Frágil como el oro', desc: 'Los dorados pierden un 20% de su armadura', cost: 90 },
          { name: 'Estatua', desc: 'Toque también afecta a minijefes: los aturde 5 s', cost: 300 },
          { name: 'Midas verdadero', desc: 'Un zombi dorado contagia el oro a los cercanos al morir', cost: 645 },
        ],
      },
      B: {
        name: 'Tesorero',
        tiers: [
          { name: 'Tributo', desc: 'Las mejoras de los héroes cercanos cuestan un 10% menos (no acumulable)', cost: 55 },
          { name: 'Recaudador', desc: 'Guarda 1 suministro por baja en su alcance, en su inventario. Se recauda con el botón de su panel', cost: 90 },
          { name: 'Interés', desc: 'Al acabar cada oleada: +10% de lo que tiene sin recaudar (máx. +100), se suma a su inventario', cost: 370 },
          { name: 'Fiebre del oro', desc: 'ACTIVA: 8 s todos los zombis dan x2 suministros (40 s)', cost: 645 },
        ],
      },
      C: {
        name: 'Monedas',
        tiers: [
          { name: 'Moneda lanzada', desc: 'Lanza monedas que dañan y vuelven a él', cost: 55 },
          { name: 'Moneda de la suerte', desc: 'Ahora lanza dos monedas en vez de una', cost: 90 },
          { name: 'Inversión armamentística', desc: 'Por cada 100 suministros gastados en mejoras de héroes cercanos: +10% de daño (máx. +200%)', cost: 460 },
          { name: 'Cofre del tirano', desc: 'El último zombi de cada oleada suelta un cofre de 10 x nº de oleada', cost: 645 },
        ],
      },
    },
  },

  nigromante: {
    id: 'nigromante',
    short: 'nec',
    name: 'Nigromante',
    emoji: '💀',
    color: 0x6c3483,
    cost: 200,
    desc: 'Usa a los zombis contra ellos mismos.',
    skill: { name: 'Apocalipsis', icon: '☠️', cooldown: 35 },
    paths: {
      A: {
        name: 'Levantar muertos',
        tiers: [
          { name: 'Resurrección', desc: '20% de los zombis que mueren en su radio se levantan 10 s y atacan a los suyos (máx. 5 esbirros)', cost: 45 },
          { name: 'Inestables', desc: 'Los esbirros duran +5 s y al acabar explotan haciendo 300 de daño', cost: 80 },
          { name: 'Horda', desc: 'Hasta 10 esbirros a la vez', cost: 260 },
          { name: 'Señor de los muertos', desc: 'Si cae un jefe o minijefe cerca, se levanta 12 s como gigante aliado que cada 3 s golpea a un enemigo cercano (200 de daño)', cost: 560 },
        ],
      },
      B: {
        name: 'Maldiciones',
        tiers: [
          { name: 'Maldición de debilidad', desc: 'Maldice a un enemigo tras atacarlo 3 veces. El maldito recibe un 10% más de daño', cost: 45 },
          { name: 'Contagio', desc: 'Al morir el maldito, la maldición salta a otro zombi aleatorio', cost: 80 },
          { name: 'Pacto de sangre', desc: 'Los malditos pierden un 3% de su vida máxima cada vez que un nigromante los ataca', cost: 260 },
          { name: 'Apocalipsis', desc: 'ACTIVA: todos los malditos explotan: 30% de su vida máxima en área (35 s)', cost: 560 },
        ],
      },
      C: {
        name: 'Almas',
        tiers: [
          { name: 'Vínculo de almas', desc: 'Cada baja cerca le carga un alma (contador encima). Cada nigromante con esto da 1 alma global (máx. 40)', cost: 45 },
          { name: 'Poder de las almas', desc: 'Cada alma da +10% de daño a nigromantes y a sus invocaciones', cost: 80 },
          { name: 'Rayo de almas', desc: 'Con 5 almas o más ataca con un rayo de energía oscura que atraviesa a todos los de su línea de ataque (x3 de daño)', cost: 260 },
          { name: 'Tormenta de almas', desc: 'Con 20 almas, enjambre que persigue a 6 zombis (sustituye al rayo)', cost: 560 },
        ],
      },
    },
  },

  druida: {
    id: 'druida',
    short: 'dru',
    name: 'Druida',
    emoji: '🌿',
    color: 0x7cb342,
    cost: 70,
    desc: 'Naturaleza: raíces, lobos y enjambres de polillas.',
    skill: { name: 'Polillas', icon: '🦋', cooldown: 28 },
    paths: {
      A: {
        name: 'Raíces',
        tiers: [
          { name: 'Raíces', desc: 'Cada 6 s inmoviliza 2 s a los 3 zombis más adelantados', cost: 40 },
          { name: 'Espinas', desc: 'Los inmovilizados reciben daño continuo', cost: 65 },
          { name: 'Bosquecillo', desc: 'Cada raíz deja arbustos 8 s que ralentizan un 25%', cost: 220 },
          { name: 'Árbol ancestral', desc: 'Planta un ent que golpea a todos a su alrededor mientras dure la oleada', cost: 475 },
        ],
      },
      B: {
        name: 'Bestias',
        tiers: [
          { name: 'Lobo', desc: 'Un lobo recorre el camino y muerde a los zombis 8 s', cost: 30 },
          { name: 'Manada', desc: 'Dos lobos a la vez', cost: 65 },
          { name: 'Aullido', desc: 'Mientras haya lobos, los héroes cercanos disparan un 15% más rápido', cost: 220 },
          { name: 'Polillas', desc: 'ACTIVA: un enjambre de 8 polillas ataca dando vueltas, sin trayectoria recta ni estable (28 s)', cost: 475 },
        ],
      },
      C: {
        name: 'Astillas',
        tiers: [
          { name: 'Astilla afilada', desc: 'Cada 3 disparos lanza una astilla afilada (x2 de daño)', cost: 40 },
          { name: 'Punto débil', desc: '+50% de probabilidad de crítico de la astilla', cost: 110 },
          { name: 'Entrenamiento místico', desc: 'La astilla afilada pasa a ser su ataque normal', cost: 220 },
          { name: 'Foco arcano', desc: 'Cuando un minijefe entra en su alcance, su ataque gana +3 proyectiles', cost: 475 },
        ],
      },
    },
  },
};
