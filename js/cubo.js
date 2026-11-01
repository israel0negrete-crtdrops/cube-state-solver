/* La pantalla del cubo de 3 × 3. El cálculo vive en cubo-calculo.js y las
   soluciones se buscan en cubo-trabajador.js, fuera de la pantalla. Aquí se
   captura el cubo, se cuenta el análisis y se reproduce la solución paso a
   paso. El cubo capturado viaja en la dirección (#c=…) sólo cuando se copia
   el enlace. Nada se manda a ningún lado. */

(() => {
  'use strict';

  const C = CuboCalculo;
  const $ = s => document.querySelector(s);
  const lang = () => (document.body.dataset.idioma === 'en' ? 'en' : 'es');

  // Los seis colores de la paleta. El cálculo no los necesita: sólo le
  // importa qué casillas son del color de qué centro.
  const COLORES = {
    es: [['Blanco', 'Bl'], ['Amarillo', 'Am'], ['Rojo', 'Ro'], ['Naranja', 'Na'], ['Azul', 'Az'], ['Verde', 'Ve']],
    en: [['White', 'Wh'], ['Yellow', 'Ye'], ['Red', 'Re'], ['Orange', 'Or'], ['Blue', 'Bl'], ['Green', 'Gr']],
  };
  // el esquema más común: blanco arriba, verde al frente
  const CENTROS = [0, 2, 5, 1, 3, 4];
  const armado = () => Array.from({ length: 54 }, (_, i) => CENTROS[Math.floor(i / 9)]);

  const T = {
    es: {
      caras: ['Arriba', 'Derecha', 'Frente', 'Abajo', 'Izquierda', 'Atrás'],
      carasMin: ['arriba', 'derecha', 'frente', 'abajo', 'izquierda', 'atrás'],
      sentido: ['horario', 'media vuelta', 'antihorario'],
      vacia: 'vacía',
      cuenta: (n, c) => `${c} ${n}`,
      revisiones: [
        'Las 54 casillas, capturadas',
        'Nueve casillas de cada color',
        'Seis centros, uno de cada color',
        'Cada esquina y cada arista es una pieza que existe',
        'Ninguna pieza repetida ni faltante',
        'Los giros de las esquinas suman un múltiplo de tres',
        'Las aristas volteadas son un número par',
        'Esquinas y aristas tienen la misma paridad',
      ],
      sinRevisar: 'sin revisar',
      vacias: n => `Faltan ${n} casilla${n === 1 ? '' : 's'} por capturar.`,
      cuentaMal: xs => cap(xs.map(x => `hay ${x.n} de ${x.c}`).join(', ')) + ': cada color va en nueve casillas.',
      centrosMal: 'Dos centros tienen el mismo color; en un cubo, cada centro es de un color distinto.',
      lugarEsq: caras => `la esquina de ${caras[0]}, ${caras[1]} y ${caras[2]}`,
      lugarAri: caras => `la arista de ${caras[0]} y ${caras[1]}`,
      esqImposible: (l, cs) => `En ${l} hay ${cs}: esa combinación no existe (¿un color repetido, o dos opuestos?).`,
      esqEspejo: (l, cs) => `En ${l} hay ${cs}, pero en el orden de su espejo: esa pieza no existe. Revisa si capturaste alguna cara girada.`,
      ariImposible: (l, cs) => `En ${l} hay ${cs}: esa combinación no existe (¿un color repetido, o dos opuestos?).`,
      repetida: (tipo, dobles, faltan) => `${tipo === 'esq' ? 'La esquina' : 'La arista'} ${dobles} aparece más de una vez y falta ${faltan}.`,
      giro: () => `Hay al menos una esquina girada en su lugar. Pasa cuando una esquina se saca y se mete girada, o cuando una casilla de esquina se capturó mal.`,
      vuelta: 'Hay al menos una arista volteada. Pasa cuando una arista se saca y se mete al revés, o cuando una casilla de arista se capturó mal.',
      paridad: 'Hay piezas intercambiadas: un número impar de intercambios. Pasa al desarmar el cubo y armarlo distinto, o al capturar cambiadas dos casillas.',
      datos: d => `Piezas en su lugar: ${d.enSuLugar} de 20 · esquinas giradas: ${d.esquinasGiradas} · aristas volteadas: ${d.aristasVolteadas}.`,
      siSolucion: 'Este cubo tiene solución.',
      noSolucion: 'Así no se puede armar con giros: corrige la captura o, si el cubo de verdad está así, habría que desarmarlo.',
      yaArmado: 'Este cubo ya está armado: no hay nada que resolver.',
      calculando: 'Buscando las dos soluciones…',
      fallo: e => `No pude calcular la solución: ${e}`,
      sosten: (u, f) => `Sostén el cubo con el centro ${u} arriba y el ${f} al frente durante toda la solución: gira sólo las caras, nunca el cubo entero.`,
      tabCorta: n => `La corta · ${n}`,
      tabEtapas: n => `Por etapas · ${n}`,
      sobreCorta: (n, f1, ms) => (f1 ? `${n} movimientos. Los primeros ${f1} dejan todas las piezas bien orientadas y las aristas de en medio en su franja; los otros ${n - f1} terminan sólo con giros de arriba y abajo y medias vueltas de los lados. Se encontró en ${miles(ms)} ms.` : `${n} movimientos, todos de la segunda fase: el cubo ya tenía todas las piezas bien orientadas y las aristas de en medio en su franja. Se encontró en ${miles(ms)} ms.`),
      sobreEtapas: n => `${n} movimientos en siete etapas. Los algoritmos ya van traducidos a la cara que toca; si prefieres girar el cubo para hacerlos siempre igual, cada uno dice qué color poner al frente.`,
      pasoNum: (i, n) => `Van ${i} de ${n} movimientos.`,
      yaEstaba: 'ya estaba en su lugar',
      fase: n => `Fase ${n}`,
      inicio: 'Al inicio: el cubo como lo capturaste.',
      siguiente: (m, cara, s) => `Sigue ${m}: ${cara}, ${s}.`,
      listo: 'Listo: el cubo queda armado.',
      etapas: {
        cruz: ['La cruz de abajo', 'Las cuatro aristas del color de abajo, cada una entre su centro de abajo y el de su lado. Se ponen una por una con los giros que hagan falta: es la única etapa sin algoritmo fijo.'],
        esquinas: ['Las esquinas de abajo', 'Cada esquina se lleva arriba de su lugar con giros de arriba y se repite R U R\' U\' hasta que entra con su color abajo: de una a cinco veces (dos o cuatro si ya estaba en su lugar, pero girada). Si está atrapada abajo en otro lugar, el mismo algoritmo la saca.'],
        capa: ['La segunda capa', 'Cada arista de en medio va arriba, frente a su centro, y entra hacia la derecha (U R U\' R\' U\' F\' U F) o hacia la izquierda (U\' L\' U L U F U\' F\'). Si está atrapada en otro hueco, el mismo algoritmo la saca.'],
        'cruz-arriba': ['La cruz de arriba', 'F R U R\' U\' F\' voltea las aristas de arriba sin tocar las dos capas de abajo: del punto a la L, de la L a la línea, de la línea a la cruz.'],
        orientar: ['Las esquinas de arriba, con su color hacia arriba', 'R U R\' U R U2 R\' gira tres esquinas de arriba; también cambia de lugar piezas de arriba, pero sin deshacer la cruz. Se repite desde el lado que convenga.'],
        'esquinas-arriba': ['Las esquinas de arriba, en su lugar', 'R\' F R\' B2 R F\' R\' B2 R2 mueve tres esquinas de arriba sin girarlas.'],
        'aristas-arriba': ['Las aristas de arriba, en su lugar', 'R U\' R U R U R U\' R\' U\' R2 mueve tres aristas de arriba; al final, el giro de arriba que falte.'],
      },
      pieza: (tipo, cs) => `${tipo === 'esq' ? 'Esquina' : 'Arista'} ${cs}`,
      alFrente: (alg, c) => `${alg}, con el ${c} al frente`,
      veces: n => `×${n}`,
      giroArriba: 'giro de arriba',
      copiado: 'Enlace copiado',
      noCopio: 'Copia la dirección de la barra: ya lleva este cubo',
      malMovs: t => `No entendí «${t}». Usa U D R L F B, con ' o 2.`,
      revueltoCon: m => `Revuelto desde armado con: ${m}`,
    },
    en: {
      caras: ['Up', 'Right', 'Front', 'Down', 'Left', 'Back'],
      carasMin: ['top', 'right', 'front', 'bottom', 'left', 'back'],
      sentido: ['clockwise', 'half turn', 'counterclockwise'],
      vacia: 'empty',
      cuenta: (n, c) => `${c} ${n}`,
      revisiones: [
        'All 54 squares entered',
        'Nine squares of each color',
        'Six centers, one of each color',
        'Every corner and every edge is a piece that exists',
        'No piece repeated or missing',
        'The corner twists add up to a multiple of three',
        'The flipped edges are an even number',
        'Corners and edges have the same parity',
      ],
      sinRevisar: 'not checked',
      vacias: n => `${n} square${n === 1 ? ' is' : 's are'} still empty.`,
      cuentaMal: xs => cap(xs.map(x => `there are ${x.n} ${x.c} squares`).join(', ')) + ': each color goes on nine squares.',
      centrosMal: 'Two centers have the same color; on a cube, every center is a different color.',
      lugarEsq: caras => `the ${caras[0]}-${caras[1]}-${caras[2]} corner`,
      lugarAri: caras => `the ${caras[0]}-${caras[1]} edge`,
      esqImposible: (l, cs) => `${cap(l)} has ${cs}: that combination does not exist (a repeated color, or two opposite ones?).`,
      esqEspejo: (l, cs) => `${cap(l)} has ${cs}, but in its mirror-image order: that piece does not exist. Check whether you entered a face rotated.`,
      ariImposible: (l, cs) => `${cap(l)} has ${cs}: that combination does not exist (a repeated color, or two opposite ones?).`,
      repetida: (tipo, dobles, faltan) => `The ${dobles} ${tipo === 'esq' ? 'corner' : 'edge'} appears more than once, and ${faltan} is missing.`,
      giro: () => `At least one corner is twisted in place. It happens when a corner is popped out and put back twisted, or when a corner square was entered wrong.`,
      vuelta: 'At least one edge is flipped. It happens when an edge is popped out and put back the other way, or when an edge square was entered wrong.',
      paridad: 'Pieces are swapped: an odd number of swaps. It happens when the cube is taken apart and put back differently, or when two squares were entered swapped.',
      datos: d => `Pieces in place: ${d.enSuLugar} of 20 · twisted corners: ${d.esquinasGiradas} · flipped edges: ${d.aristasVolteadas}.`,
      siSolucion: 'This cube can be solved.',
      noSolucion: 'As entered, it cannot be solved by turning: fix the entry or, if the cube really is like this, it would have to be taken apart.',
      yaArmado: 'This cube is already solved: there is nothing to do.',
      calculando: 'Looking for both solutions…',
      fallo: e => `I could not work out the solution: ${e}`,
      sosten: (u, f) => `Hold the cube with the ${u} center on top and the ${f} one in front for the whole solution: turn only the faces, never the whole cube.`,
      tabCorta: n => `Short · ${n}`,
      tabEtapas: n => `In stages · ${n}`,
      sobreCorta: (n, f1, ms) => (f1 ? `${n} moves. The first ${f1} leave every piece correctly oriented and the middle edges in their slice; the other ${n - f1} finish with only top and bottom turns and half turns of the sides. Found in ${miles(ms)} ms.` : `${n} moves, all of them phase 2: the cube already had every piece oriented and the middle edges in their slice. Found in ${miles(ms)} ms.`),
      sobreEtapas: n => `${n} moves in seven stages. The algorithms are already translated to the face they apply to; if you would rather turn the cube and always do them the same way, each one says which color to put in front.`,
      pasoNum: (i, n) => `${i} of ${n} moves done.`,
      yaEstaba: 'already in place',
      fase: n => `Phase ${n}`,
      inicio: 'At the start: the cube as you entered it.',
      siguiente: (m, cara, s) => `Next, ${m}: ${cara}, ${s}.`,
      listo: 'Done: the cube is solved.',
      etapas: {
        cruz: ['The bottom cross', 'The four edges with the bottom color, each one between its bottom center and its side center. They go in one at a time with whatever turns it takes: it is the only stage without a fixed algorithm.'],
        esquinas: ['The bottom corners', 'Each corner is brought above its spot with top turns, and R U R\' U\' is repeated until it drops in with its color down: one to five times (two or four if it was already in its spot, but twisted). If it is stuck below in another spot, the same algorithm pops it out.'],
        capa: ['The second layer', 'Each middle edge goes to the top, facing its center, and is inserted to the right (U R U\' R\' U\' F\' U F) or to the left (U\' L\' U L U F U\' F\'). If it is stuck in another slot, the same algorithm pops it out.'],
        'cruz-arriba': ['The top cross', 'F R U R\' U\' F\' flips the top edges without touching the two bottom layers: from the dot to the L, from the L to the line, from the line to the cross.'],
        orientar: ['The top corners, color facing up', 'R U R\' U R U2 R\' twists three top corners; it also moves top pieces around, but without undoing the cross. It is repeated from whichever side helps.'],
        'esquinas-arriba': ['The top corners, in place', 'R\' F R\' B2 R F\' R\' B2 R2 moves three top corners without twisting them.'],
        'aristas-arriba': ['The top edges, in place', 'R U\' R U R U R U\' R\' U\' R2 moves three top edges; at the end, whatever top turn is left.'],
      },
      pieza: (tipo, cs) => `${cs} ${tipo === 'esq' ? 'corner' : 'edge'}`,
      alFrente: (alg, c) => `${alg}, with ${c} in front`,
      veces: n => `×${n}`,
      giroArriba: 'top turn',
      copiado: 'Link copied',
      noCopio: 'Copy the address bar: it already holds this cube',
      malMovs: t => `I did not understand “${t}”. Use U D R L F B, with ' or 2.`,
      revueltoCon: m => `Scrambled from solved with: ${m}`,
    },
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const miles = n => Math.round(n).toLocaleString('en-US');
  const t = () => T[lang()];
  const nombreColor = c => COLORES[lang()][c][0];
  const corto = c => COLORES[lang()][c][1];

  // ------------------------------------------------------------ el estado

  let cubo = armado();
  let pincel = 0;
  let resultado = null;   // { analisis, corta, etapas, ms }
  let vista = 'corta';
  let paso = 0;
  let pasos = null;       // { movs, estados, info } de la vista actual
  let armadoDicho = false; // el veredicto dijo que ya estaba armado

  // ------------------------------------------------------------ la red de casillas

  // la cruz: arriba sobre el frente; izquierda, frente, derecha y atrás en fila; abajo bajo el frente
  const LUGAR = [[2, 1], [3, 2], [2, 2], [2, 3], [1, 2], [4, 2]];   // [columna, fila] de U R F D L B

  function armarRed(contenedor, editable) {
    contenedor.textContent = '';
    const celdas = [];
    for (let f = 0; f < 6; f++) {
      const cara = document.createElement('div');
      cara.className = `cara col-${LUGAR[f][0]} fila-${LUGAR[f][1]}`;
      cara.dataset.cara = f;
      const nombre = document.createElement('div');
      nombre.className = 'nombre-cara';
      cara.appendChild(nombre);
      const rejilla = document.createElement('div');
      rejilla.className = 'rejilla-cara';
      for (let k = 0; k < 9; k++) {
        const i = f * 9 + k;
        const el = document.createElement(editable ? 'button' : 'span');
        el.className = 'casilla';
        if (editable) {
          el.type = 'button';
          el.addEventListener('click', () => pintar(i));
        }
        rejilla.appendChild(el);
        celdas[i] = el;
      }
      cara.appendChild(rejilla);
      contenedor.appendChild(cara);
    }
    return celdas;
  }

  function pintarRed(celdas, contenedor, est, { malas = new Set(), gira = -1 } = {}) {
    const tt = t();
    for (const cara of contenedor.querySelectorAll('.cara')) {
      const f = Number(cara.dataset.cara);
      cara.querySelector('.nombre-cara').textContent = tt.caras[f];
      cara.classList.toggle('gira', f === gira);
    }
    celdas.forEach((el, i) => {
      const c = est[i];
      el.textContent = c < 0 ? '' : corto(c);
      el.classList.toggle('vacia', c < 0);
      el.classList.toggle('mal', malas.has(i));
      el.classList.toggle('centro', i % 9 === 4);
      const f = Math.floor(i / 9), k = i % 9;
      el.setAttribute('aria-label', `${tt.caras[f]} ${Math.floor(k / 3) + 1}-${k % 3 + 1}: ${c < 0 ? tt.vacia : nombreColor(c)}`);
    });
  }

  const celdasCaptura = armarRed($('#red-captura'), true);
  const celdasPaso = armarRed($('#red-paso'), false);

  const codigo = () => cubo.map(c => (c < 0 ? '.' : String(c))).join('');

  function pintar(i) {
    cubo[i] = cubo[i] === pincel && i % 9 !== 4 ? -1 : pincel;
    cambio();
  }

  function cambio() {
    resultado = null;
    armadoDicho = false;
    // si la dirección ya lleva un cubo, que lleve éste
    if (location.hash.startsWith('#c=')) history.replaceState(null, '', `#c=${codigo()}`);
    $('#analisis').hidden = true;
    $('#solucion').hidden = true;
    pintarCaptura();
  }

  function pintarCaptura(malas) {
    pintarRed(celdasCaptura, $('#red-captura'), cubo, { malas });
    const cuenta = [0, 0, 0, 0, 0, 0];
    cubo.forEach(c => { if (c >= 0) cuenta[c]++; });
    const cu = $('#cuenta');
    cu.textContent = '';
    cuenta.forEach((n, c) => {
      const s = document.createElement('span');
      s.textContent = t().cuenta(n, nombreColor(c));
      if (n !== 9) s.className = 'fuera';
      cu.appendChild(s);
    });
  }

  // ------------------------------------------------------------ la paleta

  function armarPaleta() {
    const p = $('#paleta');
    p.textContent = '';
    COLORES[lang()].forEach(([nombre, abrev], c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(c === pincel));
      b.className = 'color';
      const a = document.createElement('b');
      a.textContent = abrev;
      b.append(a, ` ${nombre}`);
      b.addEventListener('click', () => { pincel = c; armarPaleta(); });
      p.appendChild(b);
    });
  }

  // ------------------------------------------------------------ el análisis

  const nombresCaras = (letras) => letras.split('').map(l => t().carasMin[C.CARAS.indexOf(l)]);
  // de color de cara (0-5, U R F D L B) al color capturado en ese centro
  const deCara = f => cubo[f * 9 + 4];
  const listaColores = caras => caras.map(f => nombreColor(deCara(f)).toLowerCase()).join('-');

  function analizar() {
    const a = C.analizar(cubo);
    const tt = t();
    const lista = $('#revisiones');
    lista.textContent = '';
    // a qué revisión toca cada problema
    const grupo = {
      vacias: 0, cuenta: 1, centros: 2, 'esquina-imposible': 3, 'esquina-espejo': 3, 'arista-imposible': 3,
      'esquina-repetida': 4, 'arista-repetida': 4, 'giro-esquinas': 5, 'vuelta-aristas': 6, paridad: 7,
    };
    const porGrupo = tt.revisiones.map(() => []);
    const malas = new Set();
    for (const p of a.problemas) {
      porGrupo[grupo[p.tipo]].push(explicar(p));
      if (p.tipo.startsWith('esquina-i') || p.tipo === 'esquina-espejo') C.ESQ_CASILLAS[p.lugar].forEach(i => malas.add(i));
      if (p.tipo === 'arista-imposible') C.ARI_CASILLAS[p.lugar].forEach(i => malas.add(i));
    }
    // las revisiones de 0 a 4 se detienen en la primera que falla; las leyes se revisan las tres
    const primera = porGrupo.findIndex((x, g) => g <= 4 && x.length);
    tt.revisiones.forEach((texto, g) => {
      const li = document.createElement('li');
      const estado = primera >= 0 && g > primera ? 'sin' : porGrupo[g].length ? 'no' : 'si';
      li.className = estado;
      const marca = document.createElement('span');
      marca.className = 'marca';
      marca.textContent = estado === 'si' ? '✓' : estado === 'no' ? '✗' : '–';
      marca.setAttribute('aria-hidden', 'true');
      const cuerpo = document.createElement('span');
      cuerpo.textContent = texto + (estado === 'sin' ? ` (${tt.sinRevisar})` : '');
      li.append(marca, cuerpo);
      for (const e of porGrupo[g]) {
        const p = document.createElement('span');
        p.className = 'por-que';
        p.textContent = e;
        li.appendChild(p);
      }
      lista.appendChild(li);
    });
    const v = $('#veredicto');
    if (a.problemas.length) {
      v.textContent = tt.noSolucion;
      v.className = 'veredicto no';
    } else {
      v.textContent = `${tt.siSolucion} ${tt.datos(a.datos)}`;
      v.className = 'veredicto si';
    }
    $('#analisis').hidden = false;
    pintarCaptura(malas);
    return a;
  }

  function explicar(p) {
    const tt = t();
    switch (p.tipo) {
      case 'vacias': return tt.vacias(p.n);
      case 'cuenta': return tt.cuentaMal(p.colores.map(x => ({ n: x.n, c: nombreColor(x.color).toLowerCase() })));
      case 'centros': return tt.centrosMal;
      case 'esquina-imposible':
      case 'esquina-espejo': {
        const l = tt.lugarEsq(nombresCaras(C.ESQ_NOMBRE[p.lugar]));
        return (p.tipo === 'esquina-espejo' ? tt.esqEspejo : tt.esqImposible)(l, listaColores(p.colores));
      }
      case 'arista-imposible':
        return tt.ariImposible(tt.lugarAri(nombresCaras(C.ARI_NOMBRE[p.lugar])), listaColores(p.colores));
      case 'esquina-repetida':
        return tt.repetida('esq', p.piezas.map(j => listaColores(C.ESQ_COLORES[j])).join(', '), p.faltan.map(j => listaColores(C.ESQ_COLORES[j])).join(', '));
      case 'arista-repetida':
        return tt.repetida('ari', p.piezas.map(j => listaColores(C.ARI_COLORES[j])).join(', '), p.faltan.map(j => listaColores(C.ARI_COLORES[j])).join(', '));
      case 'giro-esquinas': return tt.giro();
      case 'vuelta-aristas': return tt.vuelta;
      case 'paridad': return tt.paridad;
      default: return p.tipo;
    }
  }

  // ------------------------------------------------------------ resolver

  let trabajador = null, pedido = 0;
  function calcular(piezas) {
    return new Promise(resolve => {
      const n = ++pedido;
      if (typeof Worker === 'undefined') {
        const t0 = Date.now();
        try {
          const corta = C.resolverCorto(piezas, { largo: 20, ms: 1500 });
          resolve({ corta, msCorta: Date.now() - t0, etapas: C.resolverPorEtapas(piezas) });
        } catch (e) { resolve({ error: String(e.message || e) }); }
        return;
      }
      if (!trabajador) trabajador = new Worker('../js/cubo-trabajador.js?v=2');
      trabajador.onmessage = e => { if (e.data.pedido === n) resolve(e.data); };
      trabajador.onerror = e => resolve({ error: e.message || 'trabajador' });
      trabajador.postMessage({ piezas, pedido: n });
    });
  }

  async function analizarYResolver() {
    const a = analizar();
    $('#solucion').hidden = true;
    if (a.problemas.length) return;
    const yaArmado = a.datos.enSuLugar === 20;
    const v = $('#veredicto');
    if (yaArmado) { v.textContent = t().yaArmado; armadoDicho = true; return; }
    const sol = $('#solucion');
    sol.hidden = false;
    $('#sosten').textContent = t().calculando;
    $('#sobre-solucion').textContent = '';
    $('#lista').textContent = '';
    for (const id of ['#tab-corta', '#tab-etapas']) $(id).textContent = '…';
    const capturado = cubo.slice();
    const n = pedido + 1;
    const r = await calcular(a.piezas);
    // lo cambiaron, o pidieron otro, mientras calculaba
    if (capturado.join() !== cubo.join() || n !== pedido) return;
    if (r.error) { $('#sosten').textContent = t().fallo(r.error); return; }
    resultado = { analisis: a, ...r };
    paso = 0;
    mostrarVista(vista);
  }

  // ------------------------------------------------------------ la solución, paso a paso

  // Lista plana de movimientos con, para cada uno, de qué etapa y paso viene.
  function aplanar() {
    const info = [];
    if (vista === 'corta') {
      resultado.corta.movs.forEach((m, k) => info.push({ m, fase: k < resultado.corta.fase1 ? 1 : 2 }));
    } else {
      resultado.etapas.forEach((e, ie) => e.pasos.forEach((p, ip) => p.fichas.forEach((f, iff) => f.movs.forEach(m => info.push({ m, ie, ip, iff })))));
    }
    const movs = info.map(x => x.m);
    const estados = [resultado.analisis.casillas];
    for (const m of movs) estados.push(C.aplicarCasillas(estados[estados.length - 1], m));
    return { movs, estados, info };
  }

  function mostrarVista(v) {
    vista = v;
    pasos = aplanar();
    paso = Math.min(paso, pasos.movs.length);
    const tt = t();
    $('#sosten').textContent = tt.sosten(nombreColor(deCara(0)).toLowerCase(), nombreColor(deCara(2)).toLowerCase());
    const nc = resultado.corta.movs.length, ne = C.movsDeEtapas(resultado.etapas).length;
    $('#tab-corta').textContent = tt.tabCorta(nc);
    $('#tab-etapas').textContent = tt.tabEtapas(ne);
    $('#tab-corta').setAttribute('aria-selected', String(v === 'corta'));
    $('#tab-etapas').setAttribute('aria-selected', String(v === 'etapas'));
    $('#sobre-solucion').textContent = v === 'corta'
      ? tt.sobreCorta(nc, resultado.corta.fase1, resultado.msCorta)
      : tt.sobreEtapas(ne);
    armarLista();
    irA(paso);
  }

  function chip(k) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mov';
    b.textContent = C.NOMBRE_MOV[pasos.movs[k]];
    b.dataset.k = k;
    b.addEventListener('click', () => irA(k));
    return b;
  }

  function armarLista() {
    const tt = t();
    const lista = $('#lista');
    lista.textContent = '';
    let k = 0;
    if (vista === 'corta') {
      for (const fase of [1, 2]) {
        const n = pasos.info.filter(x => x.fase === fase).length;
        if (!n) continue;
        const bloque = document.createElement('div');
        bloque.className = 'etapa';
        const h = document.createElement('h3');
        h.textContent = `${tt.fase(fase)} · ${n}`;
        const fila = document.createElement('div');
        fila.className = 'movs';
        for (let j = 0; j < n; j++) fila.appendChild(chip(k++));
        bloque.append(h, fila);
        lista.appendChild(bloque);
      }
      return;
    }
    resultado.etapas.forEach((e, ie) => {
      const [titulo, texto] = tt.etapas[e.etapa];
      const bloque = document.createElement('div');
      bloque.className = 'etapa';
      const h = document.createElement('h3');
      const n = e.pasos.reduce((s, p) => s + p.fichas.reduce((x, f) => x + f.movs.length, 0), 0);
      h.textContent = `${ie + 1}. ${titulo} · ${n}`;
      const p = document.createElement('p');
      p.className = 'ayuda';
      p.textContent = texto;
      bloque.append(h, p);
      for (const ps of e.pasos) {
        if (!ps.fichas.length && !ps.pieza) continue;
        const linea = document.createElement('div');
        linea.className = 'paso-etapa';
        if (ps.pieza) {
          const nom = document.createElement('span');
          nom.className = 'pieza';
          nom.textContent = ps.pieza.esquina !== undefined
            ? tt.pieza('esq', listaColores(C.ESQ_COLORES[ps.pieza.esquina]))
            : tt.pieza('ari', listaColores(C.ARI_COLORES[ps.pieza.arista]));
          linea.appendChild(nom);
        }
        // las fichas iguales seguidas van juntas: (R U R' U') ×3
        const grupos = [];
        for (const f of ps.fichas) {
          const ult = grupos[grupos.length - 1];
          if (ult && ult.f.nombre === f.nombre && ult.f.marco === f.marco && f.marco >= 0) ult.n++;
          else grupos.push({ f, n: 1 });
        }
        if (!grupos.length) {
          const ya = document.createElement('span');
          ya.className = 'ayuda';
          ya.textContent = tt.yaEstaba;
          linea.appendChild(ya);
        }
        for (const g of grupos) {
          const caja = document.createElement('span');
          caja.className = g.f.marco >= 0 ? 'ficha alg' : 'ficha';
          const fila = document.createElement('span');
          fila.className = 'movs';
          for (let r = 0; r < g.n; r++) for (let j = 0; j < g.f.movs.length; j++) fila.appendChild(chip(k++));
          caja.appendChild(fila);
          if (g.f.marco >= 0) {
            const nota = document.createElement('span');
            nota.className = 'nota-alg';
            const frente = nombreColor(deCara(C.MARCOS[g.f.marco][0])).toLowerCase();
            nota.textContent = tt.alFrente(C.ALG[g.f.nombre], frente) + (g.n > 1 ? ` ${tt.veces(g.n)}` : '');
            caja.appendChild(nota);
          }
          linea.appendChild(caja);
        }
        bloque.appendChild(linea);
      }
      lista.appendChild(bloque);
    });
  }

  function irA(k) {
    if (!pasos) return;
    paso = Math.max(0, Math.min(k, pasos.movs.length));
    const n = pasos.movs.length, tt = t();
    const sig = paso < n ? pasos.movs[paso] : -1;
    pintarRed(celdasPaso, $('#red-paso'), pasos.estados[paso].map(f => deCara(f)), { gira: sig >= 0 ? Math.floor(sig / 3) : -1 });
    $('#paso-num').textContent = paso === 0 ? tt.inicio : paso === n ? tt.listo : tt.pasoNum(paso, n);
    $('#paso-texto').textContent = sig >= 0 ? tt.siguiente(C.NOMBRE_MOV[sig], tt.caras[Math.floor(sig / 3)], tt.sentido[sig % 3]) : '';
    for (const b of document.querySelectorAll('#lista .mov')) {
      const j = Number(b.dataset.k);
      b.classList.toggle('hecho', j < paso);
      b.classList.toggle('actual', j === paso);
    }
    $('#ir-inicio').disabled = $('#ir-atras').disabled = paso === 0;
    $('#ir-fin').disabled = $('#ir-adelante').disabled = paso === n;
  }

  // ------------------------------------------------------------ botones

  $('#analizar').addEventListener('click', analizarYResolver);
  $('#ejemplo').addEventListener('click', () => {
    const movs = C.revolver(25);
    cubo = movs.reduce((e, m) => C.aplicarCasillas(e, m), armado());
    $('#movs-mezcla').value = '';
    cambio();
    const rc = $('#revuelto-con');
    rc.dataset.movs = C.escribirMovs(movs);
    rc.textContent = t().revueltoCon(rc.dataset.movs);
    rc.hidden = false;
  });
  $('#armado').addEventListener('click', () => { cubo = armado(); cambio(); });
  $('#vaciar').addEventListener('click', () => { cubo = cubo.map((c, i) => (i % 9 === 4 ? c : -1)); cambio(); });
  $('#aplicar-mezcla').addEventListener('click', () => {
    const err = $('#error-mezcla');
    try {
      const movs = C.leerMovs($('#movs-mezcla').value);
      cubo = movs.reduce((e, m) => C.aplicarCasillas(e, m), cubo);
      err.hidden = true;
      cambio();
    } catch (e) {
      const malo = String(e.message).split(': ').pop();
      err.textContent = t().malMovs(malo);
      err.hidden = false;
    }
  });
  $('#copiar').addEventListener('click', async () => {
    history.replaceState(null, '', `#c=${codigo()}`);
    const b = $('#copiar');
    try {
      await navigator.clipboard.writeText(location.href);
      b.textContent = t().copiado;
    } catch (e) {
      b.textContent = t().noCopio;
    }
    setTimeout(() => { b.textContent = b.dataset[lang()]; }, 2200);
  });
  $('#tab-corta').addEventListener('click', () => { paso = 0; mostrarVista('corta'); });
  $('#tab-etapas').addEventListener('click', () => { paso = 0; mostrarVista('etapas'); });
  $('#ir-inicio').addEventListener('click', () => irA(0));
  $('#ir-atras').addEventListener('click', () => irA(paso - 1));
  $('#ir-adelante').addEventListener('click', () => irA(paso + 1));
  $('#ir-fin').addEventListener('click', () => irA(Infinity));
  document.addEventListener('keydown', e => {
    if ($('#solucion').hidden || !pasos || e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight') { irA(paso + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { irA(paso - 1); e.preventDefault(); }
  });
  document.addEventListener('idioma', () => {
    armarPaleta();
    if (resultado) { analizar(); mostrarVista(vista); } else if (!$('#analisis').hidden) {
      analizar();
      if (armadoDicho) $('#veredicto').textContent = t().yaArmado;
    } else pintarCaptura();
    const rc = $('#revuelto-con');
    if (!rc.hidden) rc.textContent = t().revueltoCon(rc.dataset.movs);
  });

  // un cubo que venga en la dirección
  const m = /#c=([0-5.]{54})$/.exec(location.hash);
  if (m) cubo = m[1].split('').map(x => (x === '.' ? -1 : Number(x)));
  armarPaleta();
  pintarCaptura();
})();
