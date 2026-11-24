// Genera el documento de diseño del juego (HTML) a partir de los datos reales del código.
// Uso:  node tools/generar-documento-diseno.mjs <ruta-de-salida.html>
// El HTML se sube a Google Drive, que lo convierte en un Google Doc.
import { writeFileSync } from 'node:fs';
import { TOWERS, TOWER_ORDER, PATH_KEYS } from '../src/data/towers.js';
import { ENEMIES } from '../src/data/enemies.js';
import { LEVELS, waveGroups } from '../src/data/levels.js';
import { NODES } from '../src/data/tree.js';

const out = process.argv[2] || 'documento-diseno.html';
const FECHA = '2026-11-23';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const h1 = (t) => `<h1>${esc(t)}</h1>`;
const h2 = (t) => `<h2>${esc(t)}</h2>`;
const h3 = (t) => `<h3>${esc(t)}</h3>`;
const p = (t) => `<p>${t}</p>`; // admite <b> dentro
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const ol = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
const table = (head, rows) =>
  `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%">` +
  `<tr>${head.map((h) => `<th style="background:#e8dcc0;text-align:left"><b>${esc(h)}</b></th>`).join('')}</tr>` +
  rows.map((r) => `<tr>${r.map((c) => `<td>${typeof c === 'string' && c.startsWith('<') ? c : esc(c)}</td>`).join('')}</tr>`).join('') +
  `</table><p></p>`;

const dc = (x) => String(x).replace('.', ',');  // coma decimal en español
const body = [];
const add = (...x) => body.push(...x);

// ============================================================ PORTADA
add(h1('Zombies Must Come Down: TWD'));
add(p(`<b>Documento de diseño y especificación técnica del juego.</b> Versión del prototipo a ${FECHA}. Parte del documento original del autor (economía, defensas, zombis, mundos) y añade todo lo que se ha implementado y decidido después, con las cifras exactas del código, para poder revisarlo en papel o reconstruir el juego desde cero.`));
add(ul([
  '<b>Qué es:</b> un tower defense 2D para móvil. Los zombis avanzan por un camino hacia el castillo y el jugador construye y mejora defensas junto al camino.',
  '<b>Tecnología:</b> Phaser 4 (motor 2D) con Vite, en JavaScript. Se juega en el navegador (también en el móvil) y se puede empaquetar como app más adelante.',
  '<b>Pantalla:</b> 1280 x 720 píxeles, apaisada, con escalado para ajustarse a cualquier dispositivo.',
  '<b>Arte:</b> pack Tiny Swords (versión gratuita) de Pixel Frog. No incluye zombis: los enemigos son unidades oscuras teñidas de verde.',
]));

// ============================================================ 1. ESTADO
add(h2('Estado del proyecto'));
add(h3('Implementado en el prototipo'));
add(ul([
  'Tres niveles del primer mundo (Praderas de Evelmore): tutorial, zigzag y nivel con jefe.',
  'Cuatro defensas: Bárbaro, Elfo, Alquimista y Mago, cada una con tres caminos de mejora de cuatro niveles (12 mejoras por defensa, 48 en total) y una habilidad activa.',
  'Cinco tipos de zombi: normal, velocista, gladiador, paladín y jefe.',
  'Zombis que avanzan en carriles laterales (hasta 3 de lado) y oleadas que escalan en cantidad, vida y velocidad.',
  'Economía de partida (suministros) y economía permanente (monedas, gemas, cerebros, lingotes).',
  'Árbol de mejoras permanente en forma de constelación, con arrastre.',
  'Contador de daño por defensa, animaciones, efectos, interfaz de madera y guardado local.',
]));
add(h3('Pendiente o eliminado'));
add(table(['Elemento', 'Estado', 'Detalle'], [
  ['Fusión de defensas por estrellas', 'Eliminado', 'Estaba en el documento original (dos defensas iguales daban una de nivel superior). El autor lo eliminó: ahora se compran más torres y mejoras.'],
  ['Criogenizador', 'Pendiente', 'Descrito en el original como "ralentiza". Tiene que recibir sus 3 caminos de mejora.'],
  ['Rey Midas', 'Pendiente', 'Descrito en el original: vuelve dorados a los zombis, que sueltan el doble de monedas.'],
  ['Zombis putrefacto y mago', 'Pendiente', 'Nombrados en el original; el mago invoca 5 zombis normales cada pocos segundos.'],
  ['Minijefes', 'Pendiente', 'Armadura demoníaca, gladiador supremo, faraón y chamán.'],
  ['Zombis especiales', 'Pendiente', 'Dorado, explosivo, leprechaun (tragaperras) y radioactivo, desbloqueables con lingotes.'],
  ['Mundos 2 a 13', 'Pendiente', 'Solo existe Praderas. Hay 5 colores de terreno en el pack para variar los mundos.'],
  ['Tienda de lingotes y anuncios', 'Pendiente', 'Los lingotes de oro se ganan, pero no hay tienda ni compra con dinero real.'],
  ['Nivel especial (mazmorra infinita)', 'Pendiente', 'Un nivel especial por mundo que cuesta lingotes.'],
  ['Sonido y música', 'Pendiente', 'El pack de arte no trae audio.'],
  ['Enemigos con mejor aspecto', 'Pendiente', 'El pack de enemigos de Pixel Frog (de pago) encajaría con el estilo.'],
]));

// ============================================================ 2. TECNOLOGIA
add(h2('Tecnología y estructura del proyecto'));
add(p('Carpeta del proyecto: <b>Zombies Must Come Down - TWD</b> en el escritorio. Para jugar se ejecuta <b>Jugar.bat</b> (equivale a <b>npm run dev</b>, que abre el servidor de desarrollo Vite). Dependencias: <b>phaser</b> 4.2.1 y <b>vite</b> como herramienta de desarrollo. El código usa módulos ES (<b>"type": "module"</b> en package.json).'));
add(table(['Archivo', 'Función'], [
  ['index.html', 'Página base: contenedor del juego, sin márgenes, fondo oscuro, bloquea zoom táctil.'],
  ['src/main.js', 'Configuración de Phaser: 1280x720, pixelArt activado, escalado FIT centrado, escenas Preload, Menu, Tree y Game.'],
  ['src/config.js', 'Constantes de maquetación (TILE 64, 20x8 casillas, alturas de HUD y panel) y paleta de madera.'],
  ['src/art.js', 'Lista de hojas de sprites, imágenes y animaciones; función playFx para efectos de un solo uso.'],
  ['src/storage.js', 'Guardado en localStorage (clave zmcd_save_v3), migración desde versiones anteriores.'],
  ['src/ui.js', 'Botón de madera reutilizable y título con borde.'],
  ['src/data/towers.js', 'Las 4 defensas: coste, 3 caminos x 4 niveles, habilidad activa.'],
  ['src/data/enemies.js', 'Los 5 zombis: vida, velocidad, recompensa, daño al castillo, arte y tinte.'],
  ['src/data/levels.js', 'Los 3 niveles (caminos, defensas, suministros iniciales) y el generador de oleadas waveGroups().'],
  ['src/data/tree.js', 'Todos los nodos del árbol permanente con coste, requisitos y posición; funciones de compra.'],
  ['src/scenes/PreloadScene.js', 'Pantalla de carga: carga arte, registra animaciones y salta al menú.'],
  ['src/scenes/MenuScene.js', 'Menú principal: selección de nivel, árbol, modo prueba y borrado de partida.'],
  ['src/scenes/TreeScene.js', 'Árbol de mejoras como constelación, con arrastre y compra.'],
  ['src/scenes/GameScene.js', 'La partida completa: mapa, defensas, zombis, combate, interfaz y fin de nivel (unas 1400 líneas).'],
  ['public/assets/game/', 'Los 68 archivos de arte usados, con nombres limpios (0,4 MB).'],
  ['recursos-originales/', 'Zip y pack completo original (no se publica).'],
  ['tools/generar-documento-diseno.mjs', 'Script que genera este documento a partir de los datos del código.'],
]));
add(p('<b>Principio de diseño:</b> las cifras que se ajustan jugando están separadas del código de comportamiento. Los datos de defensas, zombis, niveles y árbol viven en <b>src/data</b>. Las cifras de combate de cada mejora están en la función <b>GameScene.stats()</b>.'));

// ============================================================ 3. PANTALLAS
add(h2('Pantallas y flujo'));
add(p('Flujo: Carga, Menú principal, Partida (o Árbol de mejoras), pantalla de fin de partida (victoria o derrota) y vuelta al menú.'));
add(h3('Menú principal'));
add(ul([
  'Cartel de madera con el título y subtítulo "TWD · Praderas de Evelmore".',
  'Contador de monedas, cerebros y lingotes de oro.',
  'Tres tarjetas de nivel. El nivel 1 está siempre abierto; cada uno de los siguientes se abre al superar el anterior.',
  'Botón del árbol de mejoras, botón de modo prueba (suma 200 monedas y 1 cerebro) y botón de borrar la partida guardada.',
  'Decoración: héroes animados abajo a la izquierda, zombis que desfilan, árboles, ovejas y el castillo. Crédito del arte al pie.',
]));
add(h3('Partida: maquetación'));
add(table(['Zona', 'Posición y tamaño', 'Contenido'], [
  ['Barra superior (HUD)', 'y 0 a 48, ancho 1280', 'Escudo y vidas, martillo y suministros, espadas y oleada actual; efectos activos (cuerno); botones de oleada, velocidad (x1, x2, x3), pausa y salir.'],
  ['Mapa', 'y 48 a 560 (20 columnas x 8 filas de 64 px)', 'Terreno, camino, decoración, defensas y zombis.'],
  ['Panel inferior', 'y 560 a 720', 'Contexto: construir, mejorar, vender y habilidades. Fondo de madera.'],
]));
add(h3('Panel inferior según la selección'));
add(ul([
  '<b>Nada seleccionado:</b> texto de ayuda.',
  '<b>Casilla libre seleccionada:</b> un botón por defensa disponible en el nivel, con su avatar, nombre y coste. Las defensas no desbloqueadas aparecen con candado.',
  '<b>Defensa seleccionada:</b> a la izquierda el avatar, nombre, mejoras compradas, estadísticas y el contador de daño total; en el centro los 3 botones de camino (A, B, C) con la siguiente mejora, su coste o el motivo del bloqueo; el botón Vender; y a la derecha los botones de habilidad especial.',
]));
add(p('Se ve el alcance de la defensa seleccionada como un círculo blanco. Una casilla con decoración (árbol, arbusto, roca, oveja) no se puede seleccionar para construir.'));
add(h3('Fin de partida'));
add(p('Superposición oscura con el resultado: oleada alcanzada, zombis abatidos, monedas ganadas (con desglose de gemas) y las recompensas de primera vez. Botones: Reintentar, Árbol y Menú.'));

// ============================================================ 4. REGLAS DE PARTIDA
add(h2('Reglas de la partida'));
add(table(['Concepto', 'Valor'], [
  ['Vidas del castillo', '20. Cada zombi que llega al castillo resta su valor de daño al castillo (ver tabla de zombis). Con 0 vidas se pierde.'],
  ['Moneda de batalla', 'Suministros. Sirven para construir y mejorar defensas. Se reinician en cada partida.'],
  ['Suministros iniciales', 'Nivel 1: 130. Nivel 2: 200. Nivel 3: 260. Más 40 si se tiene el nodo Víveres del árbol.'],
  ['Suministros por baja', 'La recompensa del zombi (tabla de zombis), más 1 si se tiene el nodo Saqueo.'],
  ['Bonus al superar una oleada', '25 + 8 x número de oleada (oleada 1: 33, oleada 5: 65, oleada 10: 105).'],
  ['Venta de una defensa', 'Devuelve el 60% de lo invertido (coste de construcción más mejoras). 85% con el nodo Mercader.'],
  ['Pausa antes de la primera oleada', '10 segundos (en el tutorial la oleada 1 empieza 8 segundos después de colocar la segunda defensa).'],
  ['Pausa entre oleadas', '3 segundos desde que desaparece el último zombi de la oleada. El botón "Oleada" las adelanta.'],
  ['Velocidad de juego', 'x1, x2 y x3 con el botón del HUD. Se simula en pasos de 0,05 s como máximo.'],
  ['Victoria', 'Superar la última oleada del nivel (todos los zombis eliminados y ninguno pendiente de salir).'],
  ['Derrota', 'Vidas a 0.'],
  ['Pausa', 'Botón del HUD. Detiene toda la simulación.'],
]));
add(h3('Recompensas al terminar'));
add(ul([
  'Las monedas ganadas en la partida (ver sección de economía permanente) se guardan siempre, se gane o se pierda.',
  'Primera victoria en un nivel: +1 lingote de oro.',
  'Primera victoria en un nivel con jefe (nivel 3): +1 cerebro.',
  'Superar un nivel abre el siguiente en el menú.',
]));
add(h3('Tutorial (nivel 1)'));
add(ol([
  'Mensaje 1/2: "Toca una casilla verde y coloca un Bárbaro". Las oleadas no empiezan hasta que se colocan dos defensas.',
  'Mensaje 2/2: "Coloca otra defensa: cuantas más, mejor aguantarás".',
  'Al colocar la segunda defensa, la oleada 1 empieza en 8 segundos. Se muestra "Cada oleada será más dura: sigue comprando defensas y mejoras".',
]));

// ============================================================ 5. DEFENSAS
add(h2('Defensas'));
add(h3('Reglas generales'));
add(ul([
  'Se construyen en cualquier casilla libre que no sea camino ni tenga decoración. Una casilla admite una sola defensa.',
  '<b>Objetivo:</b> cada defensa ataca al zombi que más haya avanzado dentro de su alcance (el más cercano al castillo).',
  '<b>Daño:</b> las cifras de daño son por impacto, salvo el Alquimista, cuyo daño es por segundo dentro de la zona.',
  '<b>Alcance:</b> en píxeles del mapa (una casilla mide 64 px).',
  '<b>Animación de ataque:</b> la defensa se gira hacia el objetivo (se voltea el sprite si está a la izquierda) y reproduce su animación de ataque.',
  '<b>Contador de daño:</b> cada defensa acumula el daño que ha hecho (incluido el de veneno, quemaduras y explosiones que ella causó). No cuenta el daño sobrante de una baja. Empieza en 0 en cada partida y es individual de cada defensa construida. Se muestra como "Daño total" en el panel (formato 12,3k a partir de 10.000 y 1,23M a partir de un millón).',
  '<b>Desbloqueo:</b> Bárbaro y Elfo están siempre disponibles. Alquimista y Mago hay que comprarlos en el árbol. Cada nivel limita además qué defensas ofrece.',
]));
add(table(['Defensa', 'Coste de construcción', 'Niveles que la ofrecen', 'Rol', 'Sprite (pack Tiny Swords)'], [
  ['Bárbaro', String(TOWERS.barbaro.cost), '1, 2, 3', 'Corta distancia, ataque en cono', 'Guerrero azul'],
  ['Elfo', String(TOWERS.elfo.cost), '1, 2, 3', 'Largo alcance con arco', 'Arquero azul'],
  ['Alquimista', String(TOWERS.alquimista.cost), '2, 3', 'Pociones que dejan una zona dañina', 'Peón morado'],
  ['Mago', String(TOWERS.mago.cost), '2, 3', 'Daño en área', 'Monje morado'],
]));
add(h3('Reglas de las mejoras en partida'));
add(ul([
  'Cada defensa tiene <b>3 caminos</b> (A, B, C) de <b>4 niveles</b>. Cada camino se compra en orden: nivel 1, 2, 3, 4.',
  '<b>Niveles 1 y 2:</b> se pueden comprar en los 3 caminos.',
  '<b>Nivel 3:</b> solo en 2 de los 3 caminos. Cuando dos caminos ya tienen el nivel 3, el tercero queda bloqueado.',
  '<b>Nivel 4:</b> solo en UN camino de toda la defensa. Al comprarlo se bloquean los demás niveles 4.',
  'El nivel 4 del camino B es siempre la <b>habilidad especial activa</b> de la defensa (botón con recarga).',
  'Para poder comprar un nivel en partida, el nodo correspondiente tiene que estar desbloqueado antes en el árbol de mejoras permanente.',
  'El coste de las mejoras se paga en suministros y se suma a lo invertido (afecta al valor de venta).',
]));
add(p('Al lado de cada defensa en el mapa aparece "+N" con el total de mejoras compradas (y una estrella si tiene la habilidad activa). Un aro dorado marca a las defensas con habilidad activa, y uno plateado a las que tienen 6 o más mejoras.'));

// efectos numéricos exactos por mejora (coinciden con GameScene.stats() y el comportamiento de combate)
const EFF = {
  barbaro: {
    base: 'Daño 16 por golpe. Intervalo 1,0 s. Alcance 95 px. Crítico 5% (daño x2). Cono de 90 grados (45 a cada lado) hacia el objetivo. Golpea a todos los zombis dentro del alcance (más el 30% del tamaño del zombi) y del cono.',
    A: ['Intervalo dividido entre 1,3.', 'Alcance x1,15.', 'El golpe cubre 360 grados.', 'Cada baja del Bárbaro suma 1 acumulación (máximo 5) durante 3 s (se refresca con cada baja). Cada acumulación divide el intervalo entre (1 + 0,10 x acumulaciones).'],
    B: ['Daño x1,25.', 'El objetivo principal de cada golpe retrocede 22 px de camino. Solo afecta a UN zombi por golpe y no a los jefes. Los demás zombis del cono reciben el daño pero no se mueven.', 'Daño x1,2 y alcance x1,2.', 'Activa: durante 6 s el intervalo de TODAS las defensas se divide entre 1,3 y el daño de los Bárbaros se multiplica por 2. Recarga 26 s.'],
    C: ['El daño crítico pasa de x2 a x3.', 'Probabilidad de crítico +20 puntos (total 25%).', 'Cada 5 s de carga, el siguiente ataque cubre 360 grados con daño x1,5 (la carga solo se acumula con este nivel).', 'Daño x5 contra jefes.'],
  },
  elfo: {
    base: 'Daño 9 por flecha. Intervalo 0,8 s. Alcance 250 px. 1 flecha por salva. Velocidad de la flecha 650 px/s. Si hay varios zombis en alcance, cada flecha va a un zombi distinto (del más adelantado al más atrasado).',
    A: ['Intervalo dividido entre 1,3.', '+5% de daño por cada zombi dentro del alcance, con un máximo de x2.', 'Las flechas ignoran las resistencias (el paladín deja de reducir el 30%).', 'Daño x2 contra zombis con menos del 35% de su vida máxima.'],
    B: ['Alcance x1,2.', '+1 flecha por salva.', 'Las flechas prenden fuego: 3 s a 6 de daño por segundo.', 'Activa: lluvia de flechas sobre TODOS los zombis, daño x3 de una flecha (ignora resistencias). Recarga 17 s.'],
    C: ['Daño x1,25.', 'Las flechas ralentizan un 25% durante 1,5 s.', 'Cada 4ª salva hace daño x3.', '+2 flechas por salva.'],
  },
  alquimista: {
    base: 'Daño de zona 9 por segundo (cada 0,5 s aplica 4,5). Intervalo 2,4 s. Alcance 230 px. Radio de la zona 55 px. Duración de la zona 3 s. La poción vuela 0,6 s hasta la posición del objetivo y deja la zona.',
    A: ['Radio de la zona x1,3.', 'La zona dura +2 s (5 s en total).', 'Intervalo dividido entre 1,3.', 'Al caer, explosión de radio 70 px con daño igual a 3 veces el daño por segundo de la zona (27 con las cifras base).'],
    B: ['Daño de zona x1,3.', 'La zona ralentiza un 30% (se renueva 1,2 s en cada pulso).', 'Lanza 2 pociones a la vez (la segunda al siguiente zombi en alcance, vuelo 0,1 s más largo).', 'Activa: pócima enorme de radio 170 px durante 3 s, daño por segundo igual a la mitad del daño de zona. Los zombis que toca se vuelven dorados 10 s (sueltan doble de monedas). Se lanza donde haya más zombis agrupados (radio 150). Vuelo 0,8 s. Recarga 30 s.'],
    C: ['Alcance x1,2.', 'Los zombis en la zona reciben +20% de daño de cualquier fuente durante 3 s (se renueva en cada pulso).', 'Veneno: 4 s a 6 de daño por segundo, ignora resistencias, no acumulable (no se renueva hasta que acaba).', 'Epidemia: cada 0,5 s los zombis envenenados contagian el veneno a los zombis a menos de 60 px que no estén envenenados.'],
  },
  mago: {
    base: 'Daño 22 por hechizo. Intervalo 1,6 s. Alcance 230 px. Radio de explosión 50 px. Velocidad del orbe 420 px/s. La explosión hace el daño completo a todos los zombis dentro del radio (sin atenuación).',
    A: ['Radio de explosión x1,25.', 'Intervalo dividido entre 1,2.', 'Segunda explosión 0,35 s después en el mismo punto, con el 50% del daño.', 'Cada 8º hechizo: radio x2 y daño x3 (supernova).'],
    B: ['Daño x1,25.', 'Las explosiones queman: 3 s a 6 de daño por segundo.', 'Los zombis que mueren ardiendo (efecto de quemadura causado por el mago) explotan: radio 55 px con daño igual a 0,6 veces el daño del hechizo que los quemó.', 'Activa: 10 meteoritos, uno cada 0,4 s, sobre zombis al azar. Cada uno impacta 0,5 s después con radio 70 px y daño x3 de un hechizo. Recarga 35 s.'],
    C: ['Las explosiones ralentizan un 25% durante 1,5 s.', 'Alcance x1,2.', 'Lanza 2 orbes a la vez a zombis distintos.', 'Cada impacto salta a los 3 zombis más cercanos a menos de 170 px del impacto (y a más de la mitad del radio de explosión) con el 60% del daño.'],
  },
};
// origen: mejoras que venían en el documento original (T = original)
const ORIG = { barbaro: ['A1', 'A2', 'A3', 'B3', 'B4', 'C2', 'C3', 'C4'], elfo: ['A1', 'A2', 'A3', 'B2', 'B4', 'C4'], alquimista: ['A1', 'B4', 'C3'], mago: [] };

TOWER_ORDER.forEach((id, idx) => {
  const t = TOWERS[id];
  add(h3(t.name));
  add(p(`<b>Descripción original:</b> ${esc(t.desc)} <b>Coste de construcción:</b> ${t.cost} suministros. <b>Habilidad activa:</b> ${esc(t.skill.name)} (recarga ${t.skill.cooldown} s).`));
  add(p(`<b>Cifras base:</b> ${esc(EFF[id].base)}`));
  const rows = [];
  PATH_KEYS.forEach((P) => {
    const path = t.paths[P];
    path.tiers.forEach((u, n) => {
      const cost = NODES[`${t.short}_${P}${n + 1}`].cost;
      rows.push([
        `${P}${n + 1}`,
        P === 'A' && n === 0 ? `${path.name}` : P === 'B' && n === 0 ? `${path.name}` : P === 'C' && n === 0 ? `${path.name}` : '',
        u.name,
        String(u.cost),
        u.desc,
        EFF[id][P][n],
        ORIG[id].includes(`${P}${n + 1}`) ? 'Documento original' : 'Inventada',
        String(cost),
      ]);
    });
  });
  add(table(['Nivel', 'Camino', 'Mejora', 'Coste (suministros)', 'Texto en pantalla', 'Efecto exacto', 'Origen', 'Coste del nodo (monedas)'], rows));
});

// ============================================================ 6. ZOMBIS
add(h2('Zombis'));
add(h3('Tipos implementados'));
const zrows = Object.entries(ENEMIES).map(([id, e]) => [
  e.name,
  String(e.hp),
  String(e.speed),
  String(e.reward),
  String(e.leak),
  e.resist ? `${e.resist * 100}%` : 'Ninguna',
  `${e.art.key}, escala ${dc(e.art.scale)}, tinte 0x${e.art.tint.toString(16)}`,
  id === 'velocista' ? `Sprint x${dc(e.sprint)} durante ${e.sprintTime} s, luego x${dc(e.tired)} (se cansa)` : id === 'jefe' ? 'Jefe: inmune al empujón, siempre en el carril central, solo en oleada final del nivel con jefe' : '',
]);
add(table(['Zombi', 'Vida base', 'Velocidad (px/s)', 'Recompensa (suministros)', 'Daño al castillo', 'Resistencia', 'Arte', 'Comportamiento'], zrows));
add(p('Descripciones del documento original: <b>normal</b> "un zombi normal, de toda la vida"; <b>velocista</b> "corre como si fuese a perder el tren pero se cansa rápido"; gladiador y paladín no tenían descripción (la resistencia del paladín al daño y su nombre sugieren una armadura pesada). El <b>jefe</b> es de tamaño colosal con más aguante que todos los zombis combinados y cada zona tiene su batalla final contra uno con apariencia acorde a la temática.'));
add(h3('Movimiento'));
add(ul([
  'Los zombis avanzan por el centro del camino más un <b>desplazamiento lateral (carril)</b>. El camino mide 64 px de ancho; los carriles van de -18 a +18 px.',
  'Grupos de 1 zombi: carril al azar entre -18, 0 y +18. Grupos de 2: -12,6 y +12,6. Grupos de 3: -18, 0 y +18.',
  'En las curvas el desplazamiento se suaviza en los 40 px de cada lado de la esquina.',
  'La velocidad final = velocidad base x multiplicador de oleada x efectos (ralentización, congelación, sprint).',
  'El sprite se voltea según el sentido de avance y parpadea (transparencia 55%) 0,07 s al recibir daño directo.',
]));
add(h3('Escalado de dificultad por oleada'));
add(p('Para la oleada w (k = w - 1):'));
add(ul([
  '<b>Vida:</b> vida base x (1 + 0,15 x k + 0,011 x k al cuadrado) x escala de vida del nivel. El jefe no usa esto: su vida es 4500 x (1 + 0,15 x (nivel - 1)).',
  '<b>Velocidad:</b> velocidad base x mínimo(1,25 ; 1 + 0,02 x k). El jefe no acelera.',
  '<b>Escala de vida del nivel:</b> nivel 1 = 1,0; nivel 2 = 1,2; nivel 3 = 1,1.',
  '<b>Cantidad y composición:</b> la genera waveGroups() (tablas siguientes).',
]));
add(h3('Generador de oleadas'));
add(ul([
  '<b>Zombis normales:</b> n = redondeo(5 + 2 x nivel + 2,6 x k). Salen en grupos de "abreast" = mínimo(3 ; 1 + parte entera de k / 2,5).',
  '<b>Velocistas</b> (desde la oleada 3): n = redondeo(2 + 1,6 x (w - 2)), grupos de hasta 2.',
  '<b>Gladiadores</b> (desde la oleada 4): n = redondeo(1 + 1,3 x (w - 3)); grupos de 2 desde la oleada 7.',
  '<b>Paladines</b> (desde la oleada 6, solo niveles 2 y 3): n = redondeo(1 + 1,0 x (w - 5)); grupos de 2 desde la oleada 9.',
  '<b>Jefe:</b> en la última oleada del nivel con jefe, 1 zombi.',
  'Entre grupos de la misma oleada hay 1,5 s extra. Dentro de un grupo, el intervalo entre tandas es la "separación" de la tabla multiplicada por (1 + 0,25 x (zombis a la vez - 1)).',
]));
LEVELS.forEach((lv) => {
  add(h3(`Oleadas del nivel ${lv.id}: ${lv.name}`));
  const rows = [];
  for (let w = 1; w <= lv.waveCount; w++) {
    const g = waveGroups(lv, w);
    const k = w - 1;
    const hpMult = (1 + 0.15 * k + 0.011 * k * k) * (lv.hpScale || 1);
    const spMult = Math.min(1.25, 1 + 0.02 * k);
    const total = g.reduce((a, x) => a + x.n, 0);
    rows.push([
      String(w),
      g.map((x) => `${ENEMIES[x.type].name.replace('Zombi ', '')} ${x.n} (a la vez ${x.abreast}, sep. ${dc(x.gap)} s)`).join('; '),
      String(total),
      dc(hpMult.toFixed(2)),
      dc(spMult.toFixed(2)),
      String(25 + 8 * w),
    ]);
  }
  add(table(['Oleada', 'Composición', 'Total zombis', 'Multiplicador de vida', 'Multiplicador de velocidad', 'Bonus al superarla'], rows));
  // vida por tipo
  const types = [...new Set(Array.from({ length: lv.waveCount }, (_, i) => waveGroups(lv, i + 1).map((x) => x.type)).flat())];
  const hrows = types.map((ty) => {
    const e = ENEMIES[ty];
    const cells = [];
    for (let w = 1; w <= lv.waveCount; w++) {
      const present = waveGroups(lv, w).some((x) => x.type === ty);
      const k = w - 1;
      const hp = e.boss ? e.hp * (1 + 0.15 * (lv.id - 1)) : e.hp * (1 + 0.15 * k + 0.011 * k * k) * (lv.hpScale || 1);
      cells.push(present ? String(Math.round(hp)) : '-');
    }
    return [e.name, ...cells];
  });
  add(p(`Vida de cada zombi por oleada en el nivel ${lv.id} (un guion indica que no aparece en esa oleada):`));
  add(table(['Zombi', ...Array.from({ length: lv.waveCount }, (_, i) => 'O' + (i + 1))], hrows));
});

// ============================================================ 7. NIVELES
add(h2('Niveles y mapas'));
add(p('Mundo 1: Praderas de Evelmore. El mapa es una rejilla de 20 columnas x 8 filas (casillas de 64 px). El camino se define con puntos de paso (columna, fila); las columnas -1 y 20 están fuera de pantalla (entrada por la izquierda, castillo a la derecha). Los segmentos son siempre horizontales o verticales.'));
add(table(['Nivel', 'Nombre', 'Subtítulo', 'Camino (columna, fila)', 'Defensas', 'Suministros iniciales', 'Escala de vida', 'Oleadas', 'Jefe'], LEVELS.map((lv) => [
  String(lv.id),
  lv.name,
  lv.subtitle,
  lv.path.map((q) => `(${q[0]},${q[1]})`).join(' '),
  lv.towers.map((x) => TOWERS[x].name).join(', '),
  String(lv.startSupplies),
  dc(lv.hpScale || 1),
  String(lv.waveCount),
  lv.boss ? 'Sí' : 'No',
])));
add(h3('Terreno y decoración'));
add(ul([
  '<b>Suelo:</b> casilla de hierba lisa (color 3 del tilemap, fotograma 10) en todo el mapa. El camino usa el color 4 con un tinte de tierra (0xe9cfa0). Algunas casillas de hierba llevan un tinte claro (0xeaf5df) para romper la uniformidad.',
  '<b>Borde del camino:</b> línea oscura (color 0x4a3520, 3 px) en los lados que no tienen camino vecino.',
  '<b>Decoración animada:</b> en las casillas sin camino a menos de una casilla de distancia no se coloca nada. En el resto, con probabilidad 32% (60% en el borde del mapa) aparece árbol, arbusto, roca u oveja. Esas casillas quedan bloqueadas para construir. La colocación es determinista por nivel (misma semilla), así que cada nivel siempre se ve igual.',
  '<b>Castillo azul</b> a la derecha, a escala 0,55; <b>torre negra</b> a la izquierda como portal de entrada, a escala 0,5, con el texto ENTRADA.',
  '<b>Nubes:</b> 2 nubes translúcidas (transparencia 0,16) que cruzan el mapa despacio.',
]));
add(h3('Equilibrio medido'));
add(p('Se probaron los tres niveles con un bot sencillo que compra torres y mejoras (y con 3 torres fijas) en un navegador sin interfaz. Referencias de la última medición:'));
add(table(['Nivel', '3 torres fijas', 'Bot que compra torres y mejoras'], [
  ['1', 'Pierde en la oleada 4 de 6', 'Gana con 14 vidas'],
  ['2', 'Pierde en la oleada 5 de 8', 'Gana con 14 vidas'],
  ['3', 'Pierde en la oleada 4 de 10', 'Pierde en la oleada 8 de 10 (el nivel del jefe es el más duro)'],
]));

// ============================================================ 8. COMBATE
add(h2('Combate: reglas y efectos'));
add(h3('Cálculo de daño'));
add(ol([
  'Se parte del daño del ataque.',
  'Si el zombi tiene resistencia y el ataque no la ignora: daño x (1 - resistencia). Solo el paladín tiene resistencia (30%).',
  'Si el zombi tiene el efecto corrosión (Alquimista C2): daño x1,2.',
  'Se resta de la vida. Si llega a 0 o menos, el zombi muere.',
  'Si el ataque tiene una defensa de origen, se suma al contador de daño de esa defensa: el menor entre el daño aplicado y la vida que le quedaba al zombi.',
  'Los daños de veneno y quemadura (continuos) no producen parpadeo del zombi.',
]));
add(h3('Efectos de estado sobre los zombis'));
add(table(['Efecto', 'Origen', 'Duración', 'Reglas'], [
  ['Ralentización', 'Elfo C2, Alquimista B2, Mago C1', '1,5 s (zona: 1,2 s)', 'Reduce la velocidad en el porcentaje indicado (25% o 30%). Si hay varias, vale la mayor; la duración es la mayor de las restantes.'],
  ['Congelación', 'Ninguna defensa actual (reservado para el Criogenizador)', 'Variable', 'Velocidad 0 y animación en pausa. Aro blanco.'],
  ['Veneno', 'Alquimista C3', '4 s', '6 de daño por segundo, ignora resistencias, no acumulable: solo se aplica si el zombi no está ya envenenado. Aro verde.'],
  ['Quemadura', 'Elfo B3, Mago B2', '3 s', '6 de daño por segundo (mínimo 5). Se renueva con cada nueva quemadura. Aro naranja.'],
  ['Corrosión', 'Alquimista C2', '3 s', '+20% de daño recibido de cualquier fuente. Se renueva en cada pulso de la zona.'],
  ['Dorado', 'Alquimista B4', '10 s', 'El zombi suelta el doble de monedas al morir. Aro dorado.'],
  ['Explosión al morir', 'Mago B3', '3 s (mientras arde)', 'Si muere ardiendo, explota (radio 55 px, 0,6 x daño del hechizo).'],
  ['Contagio', 'Alquimista C4', 'Igual que el veneno', 'Los envenenados contagian a los zombis a menos de 60 px cada 0,5 s.'],
]));
add(h3('Proyectiles y efectos visuales'));
add(table(['Elemento', 'Descripción'], [
  ['Flecha del Elfo', 'Sprite de flecha del pack, escala 0,6, rotado hacia el objetivo. Tinte morado con Magia oscura (A3), naranja con fuego (B3). Persigue al objetivo; si muere, vuela hasta su última posición.'],
  ['Orbe del Mago', 'Círculo azul con núcleo blanco (más grande en la supernova). Persigue al objetivo. Al impactar reproduce la animación Explosion_01 escalada según el radio.'],
  ['Poción del Alquimista', 'Círculo morado (dorado en la pócima enorme) con arco de vuelo de 70 px. Al caer reproduce la salpicadura de agua (Water Splash) escalada según el radio de la zona.'],
  ['Golpe del Bárbaro', 'Cono blanco translúcido de 0,18 s (dorado en el golpe múltiple; círculo completo en 360 grados).'],
  ['Zonas del Alquimista', 'Círculo con relleno translúcido verde, verde brillante si hay veneno, dorado en la pócima enorme.'],
  ['Muerte de un zombi', 'Animación de polvo (Dust_01); el jefe explota (Explosion_02 a escala 1,6).'],
  ['Construir o vender', 'Nube de polvo bajo la defensa.'],
  ['Texto flotante', 'Monedas o gemas conseguidas junto al zombi; nombre de la habilidad al usarla; "Oleada superada" con su bonus; vidas perdidas en el lado del castillo.'],
]));

// ============================================================ 9. ECONOMIA PERMANENTE
add(h2('Economía permanente'));
add(h3('Monedas'));
add(ul([
  'Se obtienen al derrotar zombis, <b>se ganen o se pierdan las partidas</b>. Al empezar el juego cada zombi tiene un 20% de probabilidad de soltar una moneda.',
  'La rama Economía del árbol sube esa probabilidad: 40%, 60%, 80% y 100%.',
  'Un zombi dorado suelta el doble de valor.',
  'Las monedas se gastan en el árbol de mejoras.',
]));
add(h3('Gemas (rama extra de Economía)'));
add(ul([
  'Una gema <b>sustituye</b> a la moneda cuando esta cae. Se decide con un único número aleatorio entre 0 y 1: diamante si es menor que su tasa; esmeralda si es menor que diamante + esmeralda; rubí si es menor que diamante + esmeralda + rubí; si no, moneda normal.',
  '<b>Rubí:</b> vale 5 monedas, tasa 10%. <b>Esmeralda:</b> vale 10 monedas, tasa 5%. <b>Diamante:</b> vale 25 monedas, tasa 2%. Se desbloquean en este orden.',
  'La última mejora (Fortuna doble) duplica la tasa de todas las gemas (20%, 10% y 4%).',
]));
add(h3('Cerebros'));
add(p('Moneda especial de mejora, necesaria para desbloquear las ramificaciones extra del árbol. Se obtienen en los niveles con jefe (primera victoria: +1). La rama de Economía abre dos ramificaciones extra (Gemas e Intendencia) que cuestan 1 cerebro cada una y <b>solo se puede elegir una</b>.'));
add(h3('Lingotes de oro'));
add(p('Moneda premium, muy escasa. Se consiguen gratis en determinados puntos del juego (ahora: +1 por la primera victoria de cada nivel) o tras alcanzar alguna mejora, y en el diseño original también a cambio de dinero real en la tienda o, en muy poca cantidad, viendo un anuncio. Sirven para desbloquear algunos zombis especiales y un nivel especial dentro de cada mundo (por ejemplo, la mazmorra infinita). <b>Todavía no hay nada en lo que gastarlos.</b>'));

// ============================================================ 10. ARBOL
add(h2('Árbol de mejoras permanente'));
add(p('El árbol se dibuja como una <b>constelación</b> que sale del nodo central, y el jugador se mueve arrastrando. Cada nodo es una estrella.'));
add(h3('Reglas'));
add(ul([
  'La primera mejora es la del centro, el <b>Cuartel de Evelmore</b> (5 monedas). Al comprarla se desbloquean todas las ramas.',
  'Para comprar un nodo hay que tener comprados los anteriores de su rama (los requisitos de la tabla).',
  'Cada personaje es un nodo. Bárbaro y Elfo vienen desbloqueados (cuestan 0); Alquimista cuesta 30 monedas y Mago 50.',
  'De cada personaje salen sus 3 caminos, cada uno con 4 nodos propios (los niveles 1 a 4 de ese camino). Un nodo de camino pide el nodo anterior de su camino (el primero pide el personaje y el nodo central).',
  'Las ramas extra de Economía (Gemas e Intendencia) cuelgan del nodo Botín 40%, cuestan 1 cerebro y son excluyentes.',
  'Los nodos de camino desbloquean ese nivel de mejora para su defensa en las partidas (la mejora se sigue pagando con suministros).',
]));
add(h3('Interacción'));
add(ul([
  'Arrastrar con el ratón (o el dedo) mueve la vista; los límites dejan ver cualquier nodo. Las estrellas del fondo se mueven al 25% de la velocidad para dar profundidad. Botón "Centrar" para volver al nodo central.',
  'Un toque (sin arrastrar) sobre una estrella la selecciona y muestra su descripción, requisitos y el botón "Comprar". Radio de pulsación: 34 px más 10.',
  'Estados visuales: estrella dorada con borde claro = comprada; halo que late = comprable ahora; apagada = bloqueada por un requisito; la rama excluida se ve como bloqueada.',
  'Las líneas entre nodos se vuelven doradas cuando el tramo está desbloqueado.',
  'Cabecera con monedas, cerebros y lingotes; botones Menú y Centrar; panel inferior de madera con la descripción.',
]));
add(h3('Disposición de la constelación'));
add(ul([
  'Centro en (0, 0). Economía hacia la izquierda: nodos a 150, 265, 380 y 495 px del centro, con un pequeño zigzag perpendicular de 16 px.',
  'Gemas sale de Botín 40% hacia arriba a la izquierda (ángulo 238 grados) y Intendencia hacia abajo a la izquierda (122 grados), a 125 px por nodo.',
  'Los personajes están a 215 px del centro en los ángulos -90 (Bárbaro), -30 (Elfo), 30 (Alquimista) y 90 grados (Mago).',
  'Los tres caminos de cada personaje se abren en abanico a -42, 0 y +42 grados respecto a la dirección del personaje, con el primer nodo a 140 px y 105 px entre nodos, con zigzag de 12 px.',
  'Tamaños: nodo central radio 38, personaje 34, nivel 4 de camino 32, resto 26.',
]));
add(h3('Todos los nodos'));
const nrows = Object.entries(NODES).map(([id, n]) => [
  id,
  n.name.replace(/^[^\p{L}\p{N}]+/u, '').trim(),
  n.cost ? `${n.cost} ${n.cur === 'brains' ? 'cerebro' : 'monedas'}` : 'Gratis',
  n.req.length ? n.req.join(', ') : '-',
  n.excl ? `Excluye ${n.excl}` : '',
  n.desc,
]);
add(table(['Id', 'Nombre', 'Coste', 'Requisitos', 'Notas', 'Efecto'], nrows));
add(p('<b>Costes de los niveles de camino:</b> se calculan como base [8, 20, 45, 80] por nivel multiplicada por un factor de la defensa (Bárbaro 1,0; Elfo 1,2; Alquimista 1,4; Mago 1,6) y redondeada.'));

// ============================================================ 11. ARTE
add(h2('Arte, animaciones y estilo'));
add(p('Se usa el pack <b>Tiny Swords (Free Pack)</b> de Pixel Frog. Hay que citarlo en los créditos al publicar y revisar su licencia en su página de itch.io. Los archivos usados se copian con nombres limpios a <b>public/assets/game</b>.'));
add(h3('Hojas de sprites y animaciones'));
add(table(['Clave', 'Origen en el pack', 'Fotograma (px)', 'Fotogramas', 'Velocidad', 'Repite'], [
  ['barbaro_idle', 'Units/Blue Units/Warrior/Warrior_Idle', '192 x 192', '8', '8 fps', 'Bucle'],
  ['barbaro_atk', 'Blue Units/Warrior/Warrior_Attack1', '192 x 192', '4', '14 fps', 'Una vez'],
  ['elfo_idle', 'Blue Units/Archer/Archer_Idle', '192 x 192', '6', '8 fps', 'Bucle'],
  ['elfo_atk', 'Blue Units/Archer/Archer_Shoot', '192 x 192', '8', '18 fps', 'Una vez'],
  ['alq_idle', 'Purple Units/Pawn/Pawn_Idle', '192 x 192', '8', '8 fps', 'Bucle'],
  ['alq_atk', 'Purple Units/Pawn/Pawn_Interact Knife', '192 x 192', '4', '10 fps', 'Una vez'],
  ['mago_idle', 'Purple Units/Monk/Idle', '192 x 192', '6', '8 fps', 'Bucle'],
  ['mago_atk', 'Purple Units/Monk/Heal', '192 x 192', '11', '20 fps', 'Una vez'],
  ['zb_pawn', 'Black Units/Pawn/Pawn_Run', '192 x 192', '6', '9 fps', 'Bucle'],
  ['zb_archer', 'Black Units/Archer/Archer_Run', '192 x 192', '4', '10 fps', 'Bucle'],
  ['zb_warrior', 'Black Units/Warrior/Warrior_Run', '192 x 192', '6', '9 fps', 'Bucle'],
  ['zb_paladin', 'Purple Units/Warrior/Warrior_Run', '192 x 192', '6', '9 fps', 'Bucle'],
  ['zb_boss', 'Black Units/Lancer/Lancer_Run', '320 x 320', '6', '8 fps', 'Bucle'],
  ['menu_warrior_run', 'Blue Units/Warrior/Warrior_Run', '192 x 192', '6', '9 fps', 'Bucle'],
  ['grass, path', 'Terrain/Tileset/Tilemap_color3 y color4', '64 x 64 (hoja de 9x6)', '54 (se usa el 10)', '-', '-'],
  ['bush1 a bush4', 'Terrain/Decorations/Bushes', '128 x 128', '8', '6 fps', 'Bucle'],
  ['tree1, tree2', 'Terrain/Resources/Wood/Trees', '192 x 256', '8', '5 fps', 'Bucle'],
  ['tree3, tree4', 'Terrain/Resources/Wood/Trees', '192 x 192', '8', '5 fps', 'Bucle'],
  ['sheep_idle, sheep_grass', 'Terrain/Resources/Meat/Sheep', '128 x 128', '6 y 12', '6 y 8 fps', 'Bucle'],
  ['fx_explosion1', 'Particle FX/Explosion_01', '192 x 192', '8', '22 fps', 'Una vez'],
  ['fx_explosion2', 'Particle FX/Explosion_02', '192 x 192', '10', '22 fps', 'Una vez'],
  ['fx_fire', 'Particle FX/Fire_01', '64 x 64', '8', '14 fps', 'Una vez'],
  ['fx_dust', 'Particle FX/Dust_01', '64 x 64', '8', '16 fps', 'Una vez'],
  ['fx_splash', 'Particle FX/Water Splash', '192 x 192', '9', '18 fps', 'Una vez'],
]));
add(p('Imágenes sueltas: arrow (flecha), shadow (sombra), castle (castillo azul), tower_black (torre negra), house, rock1 a rock4, cloud1 a cloud4, icon_01 a icon_12 (iconos) y avatar_01 a avatar_12 (avatares de 256 px).'));
add(h3('Uso de los sprites en el juego'));
add(ul([
  'Las defensas se dibujan a escala 0,9 con el origen en (0,5 ; 0,62), sombra elíptica debajo (escala 0,42, transparencia 0,55) y la animación de reposo con fase aleatoria para que no se muevan todas igual.',
  'Los zombis usan la escala y el tinte de la tabla de zombis. El tinte multiplica los colores del sprite original (unidades oscuras) para darles tono verde, amarillo verdoso, turquesa o morado (jefe). Sombra a escala 0,38 x la del zombi.',
  'Profundidad: los elementos se ordenan por la coordenada vertical (los de más abajo se dibujan delante).',
  'Avatares usados en los botones del panel: Bárbaro avatar_01, Elfo avatar_03, Alquimista avatar_04, Mago avatar_09. Iconos del HUD: icon_06 (escudo, vidas), icon_01 (martillo, suministros), icon_05 (espadas, oleada), icon_03 (moneda, menú).',
  'Phaser se configura con pixelArt activado (sin suavizado) y rejilla de 64 px para que el pixel art se vea nítido.',
]));
add(h3('Interfaz'));
add(table(['Elemento', 'Valor'], [
  ['Paleta', 'Madera 0x5a3b22, madera oscura 0x2e1c0f, madera clara 0x8a6238, pergamino 0xf2e4c4, texto crema #fff4d6 con borde #2e1c0f.'],
  ['Fuentes', 'Segoe UI (o la del sistema) para texto; fuente de emojis del sistema para iconos de texto.'],
  ['Botón', 'Rectángulo de madera con borde oscuro de 3 px, reflejo claro superior, texto crema con borde; el borde se vuelve dorado al pasar el ratón; los botones desactivados se ven más oscuros y translúcidos.'],
  ['Colores de botón', 'Madera 0x6b4a2b (normal), verde 0x2f6f5a (mejora comprable), marrón 0x4a3b2e (bloqueada), rojo 0x8a2c22 (vender), morado 0x5b2c83 (habilidad).'],
  ['Tamaños en el panel', 'Botones de construir 148 x 138; botones de camino 214 x 138; botón vender 96 x 138; botones de habilidad 68 x 138.'],
]));

// ============================================================ 12. GUARDADO
add(h2('Guardado de datos'));
add(ul([
  'Almacén: localStorage del navegador, clave <b>zmcd_save_v3</b>.',
  'Datos: monedas, cerebros, lingotes, nodos del árbol comprados (mapa id a verdadero) y niveles superados (mapa número de nivel a verdadero).',
  'Los nodos char_bar y char_elf (Bárbaro y Elfo) están siempre desbloqueados.',
  '<b>Migración:</b> si no existe la v3 pero sí una anterior (v2 o v1), se conservan monedas, cerebros, lingotes y niveles superados, y solo los nodos de economía (los que empiezan por root, eco_, br_, gem_ o rich_). Los nodos de torres antiguos se descartan porque el sistema cambió.',
  'El guardado ocurre al terminar una partida (victoria o derrota) y al comprar un nodo del árbol. Las monedas de una partida abandonada con "Salir" no se guardan.',
  'Para otra plataforma se necesitará otra persistencia (por ejemplo almacenamiento de la app o la nube); la interfaz es load(), save() y reset().',
]));

// ============================================================ 13. DISEÑO ORIGINAL PENDIENTE
add(h2('Diseño original pendiente de implementar'));
add(p('Texto del documento original del autor que todavía no está en el juego. Se conserva casi literal.'));
add(h3('Defensas pendientes'));
add(ul([
  '<b>Criogenizador:</b> ralentiza.',
  '<b>Rey Midas:</b> hace que los enemigos se vuelvan dorados y suelten el doble de monedas al morir.',
]));
add(p('Ambas necesitan sus 3 caminos de 4 niveles, con nivel 4 del camino B como habilidad activa, siguiendo las reglas de la sección Defensas.'));
add(h3('Zombis pendientes'));
add(ul([
  '<b>Zombi putrefacto:</b> sin descripción en el original.',
  '<b>Zombi mago:</b> cada pocos segundos hace un conjuro peliagudo para invocar 5 zombis normales.',
  '<b>Minijefes:</b> Zombi Armadura Demoníaca (resistencia increíble pero avanza lentamente); Zombi Gladiador Supremo; Zombi Faraón (mientras esté vivo, todos los zombis reciben menos daño); Zombi Chamán (más vida y, cada pocos segundos, maldice una defensa cercana haciéndola inservible durante 10 segundos).',
  '<b>Jefe de zona:</b> cada mundo tiene una batalla final con un zombi jefe cuya apariencia se adapta a la temática de la zona.',
]));
add(h3('Zombis especiales'));
add(p('Se desbloquean en la tienda a cambio de lingotes de oro. Todos los que se desbloquean tienen un 1% de probabilidad de aparecer.'));
add(table(['Zombi', 'Efecto'], [
  ['Zombi dorado', 'Cada vez que recibe daño se activa la probabilidad de caída de monedas. Al morir deja caer entre uno y tres lingotes de oro.'],
  ['Zombi explosivo', 'Avanza un 30% más rápido que el zombi estándar pero recibe el doble de daño y explota al morir.'],
  ['Zombi leprechaun', 'Activa el efecto slot machine, como las tragaperras del casino. Resultados posibles: Rayo (durante 5 s cae un rayo por segundo sobre el zombi con más vida; el último es más fuerte y hace el 300% del daño), Bola de fuego (lluvia de meteoritos sobre el campo de batalla), Moneda (50 monedas extra), Diamante (100 monedas extra), Lingote (5 lingotes de oro).'],
  ['Zombi radioactivo', 'Sufre un 50% más de daño de las defensas. Al tocar a otros zombis durante al menos medio segundo los contagia con el mismo efecto visual. Máximo 15 contagiados: para contagiar a uno más, tiene que morir uno de los contagiados. Mientras haya radioactivos en pantalla no pueden aparecer otros nuevos.'],
]));
add(h3('Mundos'));
add(ol([
  'Praderas (implementado, con la aldea de Evelmore)',
  'Ciudadela',
  'Desierto',
  'Cueva helada',
  'Acantilados',
  'Tierras magmáticas',
  'Cumbres del volcán',
  'Interior de la tierra',
  'Ciudad de ensueños',
  'Mazmorra zombi',
  'Templo del portal',
  'Valle oscuro',
  'Castillo del Rey Zombi Demoníaco',
]));
add(p('Cada mundo tiene un nivel con jefe (que da cerebros) y un nivel especial que cuesta lingotes (por ejemplo, la mazmorra infinita).'));
add(h3('Historia'));
add(p('El mundo ha sido dominado por los zombis y solo queda un pueblo restante con personas que no se han transformado en zombi ni han muerto devoradas por uno. En las praderas de Evelmore se encuentra el punto más lejano de la tierra respecto a las Cumbres de Valnimer, el sitio desde donde empezaron a propagarse los zombis. Desde las torres de vigilancia de la aldea se escucha un aviso: los guardianes avistan una horda de zombis cruzando las praderas que dan al pueblo de Evelmore.'));
add(p('Tras defender la última oleada en las praderas, una paloma se aproxima a un bárbaro y deja en sus manos una caja negra adornada con formas como de hojas de oro. El bárbaro, sin pensarlo, abre la caja y, justo cuando su dedo hace contacto con el talismán, entra en un trance en el que se le revelan imágenes de la cumbre de Valnimer: se ve una especie de luz de donde no paran de salir zombis. Tras este dilema, en el pueblo se decide que no quieren pasarse el resto de sus vidas defendiéndose de los zombis y que los habitantes del pueblo lucharán contra ellos, aniquilando los que se encuentren en cada zona hasta poder llegar a su punto de origen y eliminar el epicentro del problema.'));

// ============================================================ 14. DECISIONES
add(h2('Decisiones tomadas durante el desarrollo'));
add(p('Puntos que el documento original no definía y se resolvieron al implementar. Conviene revisarlos.'));
add(ul([
  'Se añadió una moneda de batalla llamada <b>suministros</b> para construir y mejorar durante la partida. Las monedas del documento original quedan como moneda permanente que se gasta en el árbol.',
  'La segunda rama extra de economía (el documento dejó la frase sin terminar) se resolvió como <b>Intendencia</b>: Víveres (+40 suministros iniciales), Saqueo (+1 suministro por baja) y Mercader (venta al 85%).',
  'Las defensas de pago y su coste (Alquimista 30, Mago 50 monedas) y los costes de los nodos del árbol son una primera estimación.',
  'Las mejoras marcadas como "Inventada" en las tablas de la sección Defensas no estaban en el documento original. Se inventaron con lógica del género; todas las casillas vacías de las tablas originales se rellenaron.',
  'En el documento original las tablas de mejoras tenían celdas vacías y una quinta fila vacía. Se interpretó cada columna como un camino y las filas como niveles 1 a 4; la quinta fila no se usa.',
  'La habilidad activa de cada defensa se colocó siempre en el nivel 4 del camino B, que coincide con las posiciones del documento original (Cuerno Vikingo, Lluvia de flechas y pócima dorada).',
  'Los niveles ofrecen: nivel 1 Bárbaro y Elfo; niveles 2 y 3 las cuatro defensas.',
  'La dificultad se ajustó con un bot de prueba, no con jugadores. Hace falta jugar para afinar vida de los zombis, costes y recompensas.',
  'El empujón del Bárbaro (B2) se limitó a un zombi por golpe porque afectar a todos era demasiado fuerte.',
]));

// ============================================================ 15. RECONSTRUIR
add(h2('Cómo reconstruir el juego desde cero'));
add(ol([
  'Crear el proyecto Vite con Phaser 4 y definir la escena de juego en 1280 x 720 con rejilla de 64 px (20 x 8 casillas), HUD de 48 px y panel inferior de 160 px.',
  'Cargar el arte (sección Arte, animaciones y estilo) y registrar las animaciones con las velocidades de la tabla.',
  'Implementar el camino: puntos de paso, casillas de camino, posición a una distancia dada con desplazamiento lateral suavizado en curvas.',
  'Implementar los zombis: aparición desde una cola temporizada, movimiento por distancia recorrida, efectos de estado, recompensas y fuga al castillo.',
  'Implementar las defensas con su selección de objetivo (el más adelantado en alcance) y cada comportamiento de ataque, proyectil y zona.',
  'Implementar el sistema de caminos de mejora (A, B, C; reglas de niveles 3 y 4; habilidad activa en B4) leyendo las cifras de la sección Defensas.',
  'Implementar oleadas con el generador de la sección Zombis y el escalado de vida y velocidad.',
  'Implementar la economía de batalla (suministros), el panel de interfaz y el fin de partida con recompensas.',
  'Implementar el guardado y el árbol de mejoras en constelación con arrastre (sección Árbol de mejoras permanente), y conectar que los nodos desbloqueen defensas y niveles de mejora en partida.',
  'Añadir el contador de daño por defensa en la función de daño.',
  'Probar con un navegador sin interfaz: reglas de mejoras, bloqueos por árbol, empujón de un solo zombi, pausa de 3 s y bots de equilibrio (3 torres fijas frente a comprar torres y mejoras).',
]));

// ============================================================ 16. REGISTRO
add(h2('Registro de cambios'));
add(table(['Versión', 'Cambios'], [
  ['Primera versión', 'Prototipo con 3 niveles, 6 defensas con fusión por estrellas, 5 zombis, árbol en rectángulos y gráficos provisionales con emojis.'],
  ['Segunda versión', 'Se elimina la fusión. Cada defensa tiene 3 caminos de 4 niveles con reglas de bloqueo (nivel 3 en 2 caminos, nivel 4 en uno). Árbol con nodo central. 4 defensas. Zombis en carriles laterales. Oleadas que escalan.'],
  ['Tercera versión', 'Integración del pack Tiny Swords: terreno, sprites animados, efectos, HUD y panel de madera, menú rediseñado. La rejilla pasa de 80 a 64 px.'],
  ['Cuarta versión', 'Árbol en constelación con arrastre. Alquimista y Mago pasan a ser de pago. Los caminos tienen nodos propios por nivel. Pausa entre oleadas reducida a 3 s. Contador de daño por defensa. Empujón del Bárbaro limitado a un zombi.'],
]));

writeFileSync(out, `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Zombies Must Come Down: TWD</title></head><body>${body.join('\n')}</body></html>`, 'utf8');
console.log('Documento generado:', out, '(' + body.join('').length + ' caracteres)');


