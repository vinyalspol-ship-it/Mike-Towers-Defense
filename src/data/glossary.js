// Glosario: explicaciones cortas de los términos del juego. Se usan en los iconos "i" (al pasar el ratón / tocar)
// y en la última página del Códice. `re` detecta cuándo un texto de mejora o defensa menciona el término.
export const GLOSSARY = [
  {
    key: 'armadura',
    title: 'Armadura',
    re: /armadur|resistencia(?! mágica)|blindad/i,
    text: 'Resistencia física: absorbe un % del daño de los golpes físicos (Bárbaro, Elfo, Lancero, Maestro de asedio...). La ignoran la magia (Mago, Nigromante, Druida), el veneno, el fuego y las habilidades que lo dicen.',
  },
  {
    key: 'magica',
    title: 'Resistencia mágica',
    re: /resistencia mágica|resist\. mágica/i,
    text: 'Reduce un % el daño de las fuentes mágicas: Mago, Nigromante y Druida. No afecta a los golpes físicos.',
  },
  {
    key: 'dorado',
    title: 'Zombi dorado',
    re: /dorad/i,
    text: 'Los zombis dorados dejan caer +30% de suministros. El efecto no se acumula.',
  },
  {
    key: 'control',
    title: 'Aturdir / inmovilizar',
    re: /aturd|inmoviliz|ancla|anclad|atrapa|congel/i,
    text: 'El zombi se queda quieto unos segundos. A los jefes les dura como mucho 1 s y los minijefes son inmunes (salvo excepciones de algunas mejoras).',
  },
  {
    key: 'marca',
    title: 'Marcado',
    re: /marca/i,
    text: 'Un zombi marcado recibe más daño de todas las defensas mientras dura la marca.',
  },
  {
    key: 'critico',
    title: 'Crítico',
    re: /crític/i,
    text: 'Golpe con el doble de daño (o el triple en algunas mejoras).',
  },
  {
    key: 'dots',
    title: 'Veneno y fuego',
    re: /venen|fuego|ardiend|incendi|prende|llama/i,
    text: 'Daño continuo que ignora la armadura. Los zombis tóxicos son inmunes al veneno y los ignífugos aguantan el fuego.',
  },
  {
    key: 'ralentiza',
    title: 'Ralentizar',
    re: /ralentiz|más lent|lentos/i,
    text: 'El zombi se mueve más despacio durante unos segundos. Los zombis férreos son inmunes.',
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
