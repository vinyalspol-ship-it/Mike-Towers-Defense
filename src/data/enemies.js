// Enemigos. Los números son ajustables.
// Arte: Tiny RPG Character Asset Pack 01 (Orco = zombis "de carne", Soldado = zombis con casco y escudo).
// Solo hay DOS resistencias. Un enemigo puede tener una, la otra o un poco de las dos:
// resist = armadura (resistencia física): absorbe un % del daño físico. La ignoran la magia (Mago, Nigromante, Druida),
//          el veneno, el fuego (cualquier daño continuo) y las habilidades que lo dicen (Lluvia de flechas, Magia oscura...).
// mres = resistencia mágica: reduce un % el daño de las fuentes mágicas (Mago, Nigromante y Druida).
// noPoison / noFire / noSlow = inmunidades.
const S = 2.7; // los fotogramas del pack son pequeños: se amplían para igualar el tamaño en pantalla
const orc = (s, tint) => ({ key: 'orc_walk', scale: s * S, tint, shadow: 0.38 * s });
// el hobgoblin (fotogramas de 16x16) es mucho más pequeño que el orco: se amplía más
const gob = (s, tint) => ({ key: 'gob_run', scale: s * 4.6, tint, shadow: 0.38 * s });
const sol = (s, tint) => ({ key: 'sol_walk', scale: s * S, tint, shadow: 0.38 * s });

export const ENEMIES = {
  normal: {
    name: 'Zombi normal',
    desc: 'El zombi de siempre: lento, torpe y muy numeroso.',
    art: orc(0.85, 0xffffff),
    size: 36,
    hp: 70,
    speed: 52,
    reward: 5,
    leak: 1,
  },
  velocista: {
    name: 'Zombi velocista',
    desc: 'Sale a la carrera durante 4,5 segundos y luego se cansa.',
    art: orc(0.8, 0xd8ff50),
    size: 32,
    hp: 45,
    speed: 58,
    sprint: 2.1, // multiplicador de velocidad durante el sprint
    sprintTime: 4.5, // segundos de sprint (antes 3: un 50% más); luego se cansa
    tired: 0.6,
    reward: 6,
    leak: 1,
  },
  gladiador: {
    name: 'Zombi gladiador',
    desc: 'Más grande y resistente. Aguanta mucho antes de caer.',
    art: gob(1.0, 0xffffff), // Hobgoblin
    size: 42,
    hp: 240,
    speed: 44,
    reward: 12,
    leak: 2,
  },
  paladin: {
    name: 'Zombi paladín',
    desc: 'Casco y escudo oxidados: absorbe parte de cada golpe.',
    art: sol(1.0, 0xa8f0dc),
    size: 46,
    hp: 420,
    speed: 38,
    resist: 0.3, // paladín: solo armadura
    reward: 18,
    leak: 2,
  },
  blindado: {
    name: 'Zombi blindado',
    desc: 'Armadura pesada. Los golpes normales apenas le hacen daño.',
    art: sol(1.1, 0xb8bcc8),
    size: 48,
    hp: 650,
    speed: 36,
    resist: 0.45, // blindado: solo armadura (la magia lo funde)
    reward: 26,
    leak: 2,
  },
  // Zombis con inmunidades (tintes raros para reconocerlos a la primera)
  toxico: {
    name: 'Zombi tóxico',
    desc: 'Su sangre es veneno puro: el veneno no le hace nada.',
    art: orc(1.05, 0xff3fd8), // rosa chicle
    size: 42,
    hp: 380,
    speed: 46,
    noPoison: true,
    reward: 16,
    leak: 2,
  },
  ignifugo: {
    name: 'Zombi ignífugo',
    desc: 'Piel curtida por el fuego: no arde y las llamas le dañan poco.',
    art: sol(1.05, 0x3fa8ff), // azul eléctrico
    size: 44,
    hp: 420,
    speed: 42,
    noFire: true,
    mres: 0.15,
    reward: 17,
    leak: 2,
  },
  rigido: {
    name: 'Zombi férreo',
    desc: 'Músculos de acero: el hielo y las pociones pegajosas no lo frenan.',
    art: orc(1.1, 0xffe040), // amarillo limón
    size: 40,
    hp: 340,
    speed: 54,
    noSlow: true,
    reward: 16,
    leak: 2,
  },
  capitan: {
    name: 'MINIJEFE Capitán zombi',
    desc: 'Grita órdenes: los zombis cercanos corren un 25% más.',
    art: orc(1.4, 0xff7a50),
    size: 62,
    hp: 3500, // muchísimo aguante (antes 1600)
    speed: 24, // mucho más lento (antes 34)
    resist: 0.15,
    mres: 0.1,
    aura: { radius: 150, speed: 1.25 }, // los zombis cercanos van un 25% más rápido
    reward: 70,
    leak: 4,
    mini: true,
  },
  coloso: {
    name: 'MINIJEFE Coloso zombi',
    desc: 'Una montaña de carne y hierro. Lento pero casi imparable.',
    art: sol(1.55, 0xff9a60),
    size: 70,
    hp: 6500, // antes 2800
    speed: 18, // antes 27
    resist: 0.3,
    mres: 0.25,
    reward: 95,
    leak: 5,
    mini: true,
  },
  rey: {
    name: 'REY ZOMBI',
    desc: 'Invoca refuerzos sin parar. Por debajo de la mitad de vida llama a los más duros.',
    art: orc(2.1, 0xff4a4a),
    size: 110,
    hp: 22000,
    speed: 22,
    resist: 0.2,
    mres: 0.3,
    reward: 500,
    leak: 15,
    boss: true,
    // invoca refuerzos cada cierto tiempo; por debajo del 50% de vida invoca más y más duros
    summon: [
      { every: 9, units: [['normal', 4], ['gladiador', 1]] },
      { every: 6, below: 0.5, units: [['velocista', 3], ['paladin', 2]] },
    ],
  },
  emperador: {
    name: 'EMPERADOR ZOMBI',
    desc: 'Señor de las Tierras Altas. Invoca legiones blindadas y, herido, llama a capitanes.',
    art: orc(2.6, 0x8e24aa),
    size: 130,
    hp: 70000,
    speed: 20,
    resist: 0.25,
    mres: 0.35,
    reward: 900,
    leak: 30,
    boss: true,
    summon: [
      { every: 8, units: [['paladin', 3], ['blindado', 2], ['toxico', 2]] },
      { every: 5, below: 0.5, units: [['capitan', 1], ['ignifugo', 3], ['rigido', 3]] },
    ],
  },
  jefe: {
    name: 'ZOMBI JEFE',
    desc: 'El señor de las praderas. Mucha vida y ninguna prisa.',
    art: orc(1.7, 0xc070ff),
    size: 90,
    hp: 4500,
    speed: 26,
    mres: 0.2,
    reward: 150,
    leak: 10,
    boss: true,
  },
};

// Resumen para la ficha del enemigo: filas [etiqueta, valor] y una lista de rasgos especiales.
export function enemyInfo(def) {
  const spd = def.speed < 32 ? 'Muy lenta' : def.speed < 45 ? 'Lenta' : def.speed < 56 ? 'Normal' : 'Rápida';
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;
  const rows = [
    ['Tipo', def.boss ? 'JEFE' : def.mini ? 'Minijefe' : 'Normal'],
    ['Vida base', String(def.hp)],
    ['Armadura (física)', pct(def.resist) + ' de daño físico'],
    ['Resist. mágica', pct(def.mres) + ' de daño mágico'],
    ['Velocidad', spd],
    ['Daño al castillo', `${def.leak} vida${def.leak > 1 ? 's' : ''}`],
    ['Recompensa', `${Math.max(1, Math.round(def.reward * 0.75))} suministros`],
  ];
  const traits = [];
  if (def.noPoison) traits.push('Inmune al veneno');
  if (def.noFire) traits.push('Inmune al fuego (recibe un 60% menos de las explosiones de fuego)');
  if (def.noSlow) traits.push('Inmune a los efectos de ralentizar');
  if (def.sprint) traits.push(`Sprint inicial de ${def.sprintTime} s y luego se cansa`);
  if (def.aura) traits.push('Aura: acelera a los zombis cercanos un 25%');
  if (def.summon) traits.push('Invoca refuerzos');
  if (def.resist) traits.push('Armadura: la ignoran la magia, el veneno, el fuego y algunas habilidades');
  if (def.mres) traits.push('Resistencia mágica: reduce el daño del Mago, el Nigromante y el Druida');
  if (def.mini) traits.push('No se puede aturdir ni inmovilizar con mejoras normales');
  if (def.boss || def.mini) traits.push('No se le puede empujar');
  return { rows, traits };
}




