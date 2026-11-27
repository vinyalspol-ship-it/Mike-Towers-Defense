// Glosario: explicaciones cortas de los términos del juego. Se usan en los iconos "i" (al pasar el ratón / tocar)
// y en la última página del Códice (las que tienen page: true). `re` detecta cuándo un texto de mejora o héroe menciona el término.
export const GLOSSARY = [
  {
    key: 'armadura',
    title: 'Resistencias',
    re: /armadur|resistencia|blindad/i,
    text: 'Cada zombi resiste un % de cada tipo de daño (normal, mágico, fuego, veneno, eléctrico, oscuridad, luz y natural). Todos tienen algo de resistencia normal, que sube con las rondas y los niveles.',
  },
  {
    key: 'luzoscuridad',
    title: 'Luz y oscuridad',
    re: /\bluz\b|oscur/i,
    text: 'El daño de luz hace un 50% más a los que resisten la oscuridad, y el de oscuridad un 50% más a los que resisten la luz.',
  },
  {
    key: 'volador',
    title: 'Volador y Antiaéreo',
    page: true,
    re: /volador|antiaére|aére/i,
    text: 'Los voladores (cuervos, buitres, gárgolas...) solo reciben daño de los héroes antiaéreos. NO les hacen daño el Alquimista, el Bárbaro, el Maestro de asedio ni el Ingeniero (tampoco sus trampas y torretas).',
  },
  {
    key: 'pesado',
    title: 'Pesado y Ágil',
    page: true,
    re: /pesad|empuj|ágil/i,
    text: 'Pesado: solo se le puede empujar 3 veces (muy común desde el nivel 5). Ágil: se mueve mucho más rápido que un zombi normal.',
  },
  {
    key: 'inmunidades',
    title: 'Inmunidades',
    page: true,
    re: /inmun/i,
    text: 'Algunos zombis son inmunes al aturdimiento, al empuje, al veneno o a la quemadura. Jefes y minijefes no se empujan ni se aturden con mejoras normales.',
  },
  {
    key: 'maestro',
    title: 'Enemigos maestro',
    page: true,
    re: /maestro(?! de asedio)/i,
    text: 'Salen en la oleada final: el doble de vida y de resistencias que su versión normal (anillo dorado).',
  },
  {
    key: 'masiva',
    title: 'Oleada masiva',
    page: true,
    re: /masiva/i,
    text: 'La ronda 10 (y la 20 en el modo infernal): 5 grupos grandes, uno detrás de otro y cada vez más fuertes.',
  },
  {
    key: 'dorado',
    title: 'Zombi dorado',
    page: true,
    re: /dorad/i,
    text: 'Los zombis dorados dejan caer +30% de suministros. El efecto no se acumula.',
  },
  {
    key: 'control',
    title: 'Aturdir / inmovilizar',
    page: true,
    re: /aturd|inmoviliz|ancla|anclad|atrapa|congel/i,
    text: 'El zombi se queda quieto unos segundos. A los jefes les dura como mucho 1 s; los minijefes y los inmunes no se aturden.',
  },
  {
    key: 'marca',
    title: 'Marcado',
    re: /marca/i,
    text: 'Un zombi marcado recibe más daño de todos los héroes mientras dura la marca.',
  },
  {
    key: 'critico',
    title: 'Crítico',
    re: /crític/i,
    text: 'Golpe con el doble de daño (o el triple en algunas mejoras).',
  },
  {
    key: 'dots',
    title: 'Veneno y quemadura',
    re: /venen|fuego|ardiend|incendi|prende|llama|quemad/i,
    text: 'Daño continuo. El veneno hace daño de veneno y la quemadura, de fuego. Los zombis tóxicos son inmunes al veneno y los ignífugos a la quemadura.',
  },
  {
    key: 'ralentiza',
    title: 'Ralentizar',
    re: /ralentiz|más lent|lentos/i,
    text: 'El zombi se mueve más despacio durante unos segundos. Los zombis férreos son inmunes.',
  },
  {
    key: 'penetracion',
    title: 'Penetración',
    re: /penetraci|atraviesa/i,
    text: 'Cada punto de penetración permite a la flecha atravesar a un zombi más.',
  },
  {
    key: 'jefes',
    title: 'Jefes y minijefes',
    re: /jefe/i,
    text: 'Tienen muchísima vida. No se les puede empujar y casi no se les puede aturdir.',
  },
];

// Entradas del glosario que menciona un texto (máximo `max`)
export const glossaryFor = (str, max = 3) => GLOSSARY.filter((g) => g.re.test(str)).slice(0, max);
