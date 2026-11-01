/* El cálculo del cubo de 3 × 3, sin nada de pantalla, para poder probarlo
   aparte (node cubo-calculo.js --prueba).

   Tres partes:
   1. El modelo. Las 54 casillas (caras U R F D L B, nueve cada una, en el orden
      de lectura de cada cara vista de frente) y las 20 piezas: 8 esquinas y 12
      aristas, cada una con su lugar y su orientación. Los giros de las caras
      salen de la geometría (rotar cada casilla en el espacio), no de tablas
      escritas a mano.
   2. El análisis. Lee lo que capturaste y dice si ese cubo puede existir: que
      haya nueve de cada color, que cada esquina y cada arista sean piezas
      reales, que no falte ni sobre ninguna, y las tres leyes que un cubo
      armado de fábrica siempre cumple (la suma de giros de las esquinas, la de
      vueltas de las aristas y la paridad de los intercambios).
   3. Dos soluciones.
      - La corta: el algoritmo de dos fases. Primero lleva el cubo a un estado
        que se resuelve sólo con media vuelta de los lados y cualquier giro de
        arriba y abajo; luego lo termina con esos giros. Cada fase busca con
        tablas de distancias precalculadas. Da unos 20 movimientos; no se
        garantiza que sea la mínima.
      - Por etapas: como lo resuelve una persona. Cruz, esquinas de la primera
        capa, segunda capa, cruz de arriba, esquinas de arriba orientadas,
        esquinas en su lugar y aristas en su lugar. Cada paso usa sólo giros de
        arriba y unos pocos algoritmos con nombre, y busca la combinación más
        corta de ellos.

   El color de cada casilla se guarda como la cara cuyo centro tiene ese
   color (0 a 5, en el orden U R F D L B): así el cubo resuelto es cada cara
   igual a su centro, sea cual sea el esquema de colores del cubo. */

const CuboCalculo = (() => {
  'use strict';

  const CARAS = ['U', 'R', 'F', 'D', 'L', 'B'];
  const U = 0, R = 1, F = 2, D = 3, L = 4, B = 5;
  const opuesta = f => (f + 3) % 6;

  // ------------------------------------------------------------ 1. el modelo

  // Cada cara: su normal, y hacia dónde quedan su derecha y su arriba al verla
  // de frente. x a la derecha, y hacia arriba, z hacia el frente.
  const NORMAL = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [-1, 0, 0], [0, 0, -1]];
  const DERECHA = [[1, 0, 0], [0, 0, -1], [1, 0, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  const ARRIBA = [[0, 0, -1], [0, 1, 0], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 0]];

  const suma = (a, b, k = 1) => a.map((v, i) => v + k * b[i]);
  const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // un cuarto de vuelta en el sentido del reloj, visto desde la punta de n
  const girar = (v, n) => suma(n.map(x => x * punto(n, v)), cruz(n, v), -1);

  // la pieza (x, y, z) y la normal de cada una de las 54 casillas
  const CASILLA = [];
  for (let f = 0; f < 6; f++) {
    for (let fila = 0; fila < 3; fila++) {
      for (let col = 0; col < 3; col++) {
        const p = suma(suma(NORMAL[f], DERECHA[f], col - 1), ARRIBA[f], 1 - fila);
        CASILLA.push({ p, n: NORMAL[f] });
      }
    }
  }
  const llave = (p, n) => p.join(',') + '|' + n.join(',');
  const INDICE = new Map(CASILLA.map((c, i) => [llave(c.p, c.n), i]));

  // Cada giro de cara como permutación: nuevo[i] = viejo[PERM[f][i]].
  const PERM = [];
  for (let f = 0; f < 6; f++) {
    const perm = Array.from({ length: 54 }, (_, i) => i);
    CASILLA.forEach((c, i) => {
      if (punto(c.p, NORMAL[f]) === 1) perm[INDICE.get(llave(girar(c.p, NORMAL[f]), girar(c.n, NORMAL[f])))] = i;
    });
    PERM.push(perm);
  }

  // Las casillas de cada esquina y cada arista, en el orden de las agujas del
  // reloj vistas desde fuera, empezando por la de arriba o abajo. Numeración:
  // U 0-8, R 9-17, F 18-26, D 27-35, L 36-44, B 45-53.
  const ESQ_CASILLAS = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
    [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51]];
  const ESQ_COLORES = [[U, R, F], [U, F, L], [U, L, B], [U, B, R], [D, F, R], [D, L, F], [D, B, L], [D, R, B]];
  const ESQ_NOMBRE = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
  const ARI_CASILLAS = [[5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25], [30, 43], [34, 52],
    [23, 12], [21, 41], [50, 39], [48, 14]];
  const ARI_COLORES = [[U, R], [U, F], [U, L], [U, B], [D, R], [D, F], [D, L], [D, B], [F, R], [F, L], [B, L], [B, R]];
  const ARI_NOMBRE = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

  const RESUELTO = Array.from({ length: 54 }, (_, i) => Math.floor(i / 9));

  // Movimientos: m = cara × 3 + (0 horario, 1 media vuelta, 2 antihorario).
  const NOMBRE_MOV = [];
  for (const c of CARAS) NOMBRE_MOV.push(c, c + '2', c + "'");

  function aplicarCasillas(est, m) {
    const perm = PERM[Math.floor(m / 3)];
    let a = est.slice();
    for (let k = 0; k <= m % 3; k++) a = perm.map(i => a[i]);
    return a;
  }

  // "R U R' U'" → [3, 0, 5, 2]
  function leerMovs(texto) {
    const movs = [];
    const limpio = String(texto).replace(/[’`´]/g, "'");
    for (const t of limpio.split(/[\s,]+/).filter(Boolean)) {
      const m = /^([URFDLB])(2|'|2'|3)?$/.exec(t);
      if (!m) throw new Error(`movimiento desconocido: ${t}`);
      const p = m[2] === "'" || m[2] === '3' ? 2 : m[2] ? 1 : 0;
      movs.push(CARAS.indexOf(m[1]) * 3 + p);
    }
    return movs;
  }
  const escribirMovs = movs => movs.map(m => NOMBRE_MOV[m]).join(' ');
  const inverso = m => m - m % 3 + (2 - m % 3);
  const invertirMovs = movs => movs.slice().reverse().map(inverso);

  // ------------------------------------------------------------ las piezas

  // Un cubo por piezas: dónde está cada pieza (cp, ep: qué pieza ocupa cada
  // lugar) y cómo está girada (co: 0-2, eo: 0-1).
  const resueltoPiezas = () => ({
    cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });

  // a seguido de b
  function multiplicar(a, b) {
    const c = { cp: new Array(8), co: new Array(8), ep: new Array(12), eo: new Array(12) };
    for (let i = 0; i < 8; i++) {
      c.cp[i] = a.cp[b.cp[i]];
      c.co[i] = (a.co[b.cp[i]] + b.co[i]) % 3;
    }
    for (let i = 0; i < 12; i++) {
      c.ep[i] = a.ep[b.ep[i]];
      c.eo[i] = (a.eo[b.ep[i]] + b.eo[i]) % 2;
    }
    return c;
  }

  function aCasillas(c) {
    const est = RESUELTO.slice();
    for (let i = 0; i < 8; i++) {
      for (let n = 0; n < 3; n++) est[ESQ_CASILLAS[i][(n + c.co[i]) % 3]] = ESQ_COLORES[c.cp[i]][n];
    }
    for (let i = 0; i < 12; i++) {
      for (let n = 0; n < 2; n++) est[ARI_CASILLAS[i][(n + c.eo[i]) % 2]] = ARI_COLORES[c.ep[i]][n];
    }
    return est;
  }

  // De casillas a piezas. Devuelve null si alguna pieza no existe; el análisis
  // dice cuál y por qué.
  function aPiezas(est) {
    const c = resueltoPiezas();
    for (let i = 0; i < 8; i++) {
      const col = ESQ_CASILLAS[i].map(k => est[k]);
      const ori = col.findIndex(x => x === U || x === D);
      if (ori < 0) return null;
      const a = col[(ori + 1) % 3], b = col[(ori + 2) % 3];
      const j = ESQ_COLORES.findIndex(e => e[0] === col[ori] && e[1] === a && e[2] === b);
      if (j < 0) return null;
      c.cp[i] = j;
      c.co[i] = ori;
    }
    for (let i = 0; i < 12; i++) {
      const [a, b] = ARI_CASILLAS[i].map(k => est[k]);
      let j = ARI_COLORES.findIndex(e => e[0] === a && e[1] === b);
      if (j >= 0) { c.ep[i] = j; c.eo[i] = 0; continue; }
      j = ARI_COLORES.findIndex(e => e[0] === b && e[1] === a);
      if (j < 0) return null;
      c.ep[i] = j;
      c.eo[i] = 1;
    }
    return c;
  }

  // los seis giros como piezas, sacados de la geometría
  const GIRO = [];
  for (let f = 0; f < 6; f++) GIRO.push(aPiezas(aplicarCasillas(RESUELTO, f * 3)));
  // los 18 movimientos como piezas
  const MOV = [];
  for (let f = 0; f < 6; f++) {
    let c = resueltoPiezas();
    for (let p = 0; p < 3; p++) {
      c = multiplicar(c, GIRO[f]);
      MOV.push(c);
    }
  }
  const aplicarMovs = (c, movs) => movs.reduce((x, m) => multiplicar(x, MOV[m]), c);

  // ------------------------------------------------------------ 2. el análisis

  // est: 54 números de color 0-5, o -1 en las casillas vacías. Los colores
  // pueden ser cualesquiera seis; se reacomodan para que cada uno sea la cara
  // de su centro.
  function analizar(capturado) {
    const r = { problemas: [], piezas: null, casillas: null, datos: {} };
    const vacias = capturado.filter(x => x < 0).length;
    if (vacias) {
      r.problemas.push({ tipo: 'vacias', n: vacias });
      return r;
    }
    const cuenta = [0, 0, 0, 0, 0, 0];
    capturado.forEach(x => cuenta[x]++);
    const malas = cuenta.map((n, color) => ({ color, n })).filter(x => x.n !== 9);
    if (malas.length) {
      r.problemas.push({ tipo: 'cuenta', colores: malas });
      return r;
    }
    const centros = [0, 1, 2, 3, 4, 5].map(f => capturado[f * 9 + 4]);
    if (new Set(centros).size !== 6) {
      r.problemas.push({ tipo: 'centros', centros });
      return r;
    }
    const caraDe = [];
    centros.forEach((color, f) => { caraDe[color] = f; });
    const est = capturado.map(x => caraDe[x]);
    r.casillas = est;

    // cada esquina y cada arista, una por una, para decir cuál está mal
    const vistasEsq = [], vistasAri = [];
    ESQ_CASILLAS.forEach((ks, i) => {
      const col = ks.map(k => est[k]);
      const caras = new Set(col);
      const ori = col.findIndex(x => x === U || x === D);
      let j = -1;
      if (ori >= 0) {
        j = ESQ_COLORES.findIndex(e => e[0] === col[ori] && e[1] === col[(ori + 1) % 3] && e[2] === col[(ori + 2) % 3]);
      }
      if (j >= 0) { vistasEsq.push(j); return; }
      const espejo = ESQ_COLORES.findIndex(e => new Set(e).size === caras.size && e.every(x => caras.has(x)));
      r.problemas.push({ tipo: espejo >= 0 ? 'esquina-espejo' : 'esquina-imposible', lugar: i, colores: col });
    });
    ARI_CASILLAS.forEach((ks, i) => {
      const [a, b] = ks.map(k => est[k]);
      const j = ARI_COLORES.findIndex(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
      if (j >= 0) vistasAri.push(j);
      else r.problemas.push({ tipo: 'arista-imposible', lugar: i, colores: [a, b] });
    });
    if (r.problemas.length) return r;

    const repetidas = (vistas, n) => {
      const c = new Array(n).fill(0);
      vistas.forEach(j => c[j]++);
      return { dobles: c.flatMap((k, j) => (k > 1 ? [j] : [])), faltan: c.flatMap((k, j) => (k === 0 ? [j] : [])) };
    };
    const re = repetidas(vistasEsq, 8), ra = repetidas(vistasAri, 12);
    if (re.dobles.length) r.problemas.push({ tipo: 'esquina-repetida', piezas: re.dobles, faltan: re.faltan });
    if (ra.dobles.length) r.problemas.push({ tipo: 'arista-repetida', piezas: ra.dobles, faltan: ra.faltan });
    if (r.problemas.length) return r;

    const c = aPiezas(est);
    r.piezas = c;
    const giroEsq = c.co.reduce((a, b) => a + b, 0) % 3;
    const vueltaAri = c.eo.reduce((a, b) => a + b, 0) % 2;
    const parEsq = paridad(c.cp), parAri = paridad(c.ep);
    r.datos = {
      enSuLugar: c.cp.filter((j, i) => j === i && c.co[i] === 0).length + c.ep.filter((j, i) => j === i && c.eo[i] === 0).length,
      esquinasGiradas: c.co.filter(x => x).length,
      aristasVolteadas: c.eo.filter(x => x).length,
      giroEsq, vueltaAri, parEsq, parAri,
    };
    if (giroEsq) r.problemas.push({ tipo: 'giro-esquinas', resto: giroEsq });
    if (vueltaAri) r.problemas.push({ tipo: 'vuelta-aristas' });
    if (parEsq !== parAri) r.problemas.push({ tipo: 'paridad' });
    return r;
  }

  function paridad(p) {
    let s = 0;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) s++;
    return s % 2;
  }

  // ------------------------------------------------------------ 3a. la solución corta (dos fases)

  // Coordenadas: un número por cada aspecto del cubo.
  const N_GIRO = 2187, N_VUELTA = 2048, N_FRANJA = 495, N_P8 = 40320, N_P4 = 24;
  const FRANJA_RESUELTA = 494;
  const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];
  const COMB = [];
  for (let n = 0; n < 13; n++) {
    COMB.push([]);
    for (let k = 0; k < 5; k++) COMB[n][k] = k > n ? 0 : k === 0 || k === n ? 1 : COMB[n - 1][k - 1] + COMB[n - 1][k];
  }

  const coordGiro = c => { let t = 0; for (let i = 0; i < 7; i++) t = 3 * t + c.co[i]; return t; };
  const coordVuelta = c => { let t = 0; for (let i = 0; i < 11; i++) t = 2 * t + c.eo[i]; return t; };
  // dónde están las cuatro aristas de la franja de en medio (FR, FL, BL, BR)
  const coordFranja = c => {
    let t = 0, k = 0;
    for (let i = 0; i < 12; i++) if (c.ep[i] >= 8) t += COMB[i][++k];
    return t;
  };
  function indicePerm(p) {
    let t = 0;
    for (let i = 0; i < p.length; i++) {
      let menores = 0;
      for (let j = i + 1; j < p.length; j++) if (p[j] < p[i]) menores++;
      t += menores * FACT[p.length - 1 - i];
    }
    return t;
  }
  function permDeIndice(t, n) {
    const libres = Array.from({ length: n }, (_, i) => i), p = [];
    for (let i = 0; i < n; i++) {
      const f = FACT[n - 1 - i], k = Math.floor(t / f);
      t %= f;
      p.push(libres.splice(k, 1)[0]);
    }
    return p;
  }
  const coordEsquinas = c => indicePerm(c.cp);
  const coordAristas8 = c => indicePerm(c.ep.slice(0, 8));
  const coordFranjaPerm = c => indicePerm(c.ep.slice(8).map(x => x - 8));

  function conGiro(t) {
    const c = resueltoPiezas();
    let s = 0;
    for (let i = 6; i >= 0; i--) { c.co[i] = t % 3; s += c.co[i]; t = Math.floor(t / 3); }
    c.co[7] = (3 - s % 3) % 3;
    return c;
  }
  function conVuelta(t) {
    const c = resueltoPiezas();
    let s = 0;
    for (let i = 10; i >= 0; i--) { c.eo[i] = t % 2; s += c.eo[i]; t = Math.floor(t / 2); }
    c.eo[11] = s % 2;
    return c;
  }
  function conFranja(t) {
    const c = resueltoPiezas(), ocupado = new Array(12).fill(false);
    for (let k = 4; k >= 1; k--) {
      let i = 11;
      while (COMB[i][k] > t) i--;
      t -= COMB[i][k];
      ocupado[i] = true;
    }
    let a = 8, b = 0;
    for (let i = 0; i < 12; i++) c.ep[i] = ocupado[i] ? a++ : b++;
    return c;
  }
  function conEsquinas(t) { const c = resueltoPiezas(); c.cp = permDeIndice(t, 8); return c; }
  function conAristas8(t) { const c = resueltoPiezas(); c.ep = permDeIndice(t, 8).concat([8, 9, 10, 11]); return c; }
  function conFranjaPerm(t) { const c = resueltoPiezas(); c.ep = [0, 1, 2, 3, 4, 5, 6, 7].concat(permDeIndice(t, 4).map(x => x + 8)); return c; }

  // los movimientos de la fase 2: U y D cualquiera, los lados sólo media vuelta
  const MOVS_FASE2 = [0, 1, 2, 9, 10, 11, 4, 7, 13, 16];
  const ES_FASE2 = new Array(18).fill(false);
  MOVS_FASE2.forEach(m => { ES_FASE2[m] = true; });

  let T = null;   // las tablas, se arman la primera vez que se piden

  function tablaMovs(n, con, coord, movs) {
    const t = new Uint16Array(n * 18);
    for (let v = 0; v < n; v++) {
      const base = con(v);
      for (const m of movs) t[v * 18 + m] = coord(multiplicar(base, MOV[m]));
    }
    return t;
  }

  // distancias al objetivo en un par de coordenadas, a lo ancho
  function tablaDistancias(nA, nB, movA, movB, movs, inicio) {
    const d = new Int8Array(nA * nB).fill(-1);
    d[inicio] = 0;
    let hechas = 1;
    for (let prof = 0; hechas < nA * nB; prof++) {
      let nuevas = 0;
      for (let i = 0; i < d.length; i++) {
        if (d[i] !== prof) continue;
        const a = Math.floor(i / nB), b = i % nB;
        for (const m of movs) {
          const j = movA[a * 18 + m] * nB + movB[b * 18 + m];
          if (d[j] < 0) { d[j] = prof + 1; nuevas++; }
        }
      }
      if (!nuevas) break;
      hechas += nuevas;
    }
    return d;
  }

  function prepararTablas() {
    if (T) return T;
    const todos = Array.from({ length: 18 }, (_, i) => i);
    const t = {};
    t.giro = tablaMovs(N_GIRO, conGiro, coordGiro, todos);
    t.vuelta = tablaMovs(N_VUELTA, conVuelta, coordVuelta, todos);
    t.franja = tablaMovs(N_FRANJA, conFranja, coordFranja, todos);
    t.esq = tablaMovs(N_P8, conEsquinas, coordEsquinas, MOVS_FASE2);
    t.ari8 = tablaMovs(N_P8, conAristas8, coordAristas8, MOVS_FASE2);
    t.fperm = tablaMovs(N_P4, conFranjaPerm, coordFranjaPerm, MOVS_FASE2);
    // fase 1: franja con giro, y franja con vuelta
    t.dGiro = tablaDistancias(N_FRANJA, N_GIRO, t.franja, t.giro, todos, FRANJA_RESUELTA * N_GIRO);
    t.dVuelta = tablaDistancias(N_FRANJA, N_VUELTA, t.franja, t.vuelta, todos, FRANJA_RESUELTA * N_VUELTA);
    // fase 2: esquinas con el orden de la franja, y aristas con el orden de la franja
    t.dEsq = tablaDistancias(N_P8, N_P4, t.esq, t.fperm, MOVS_FASE2, 0);
    t.dAri = tablaDistancias(N_P8, N_P4, t.ari8, t.fperm, MOVS_FASE2, 0);
    T = t;
    return t;
  }

  // No girar la misma cara dos veces seguidas, y de dos caras opuestas, una
  // sola orden (U D sí, D U no: dan lo mismo).
  const saltar = (cara, anterior) => cara === anterior || (anterior >= 3 && cara === anterior - 3);

  // c: piezas. Devuelve { movs, fase1 } (fase1: cuántos de los movimientos son
  // de la primera fase), o null si no hay solución.
  // opciones: largo (detenerse al llegar a esto o menos), ms (tiempo para
  // seguir buscando una más corta después de la primera).
  function resolverCorto(c, { largo = 20, ms = 1500, limite = 24 } = {}) {
    const t = prepararTablas();
    const inicio = Date.now();
    let mejor = null, tope = limite, nodos = 0, cortar = false;
    const m1 = [], m2 = [];

    function fase2(esq, ari, fp, falta, n, anterior) {
      if (falta === 0) return esq === 0 && ari === 0 && fp === 0;
      if (Math.max(t.dEsq[esq * N_P4 + fp], t.dAri[ari * N_P4 + fp]) > falta) return false;
      for (const m of MOVS_FASE2) {
        const cara = Math.floor(m / 3);
        if (saltar(cara, anterior)) continue;
        m2[n] = m;
        if (fase2(t.esq[esq * 18 + m], t.ari8[ari * 18 + m], t.fperm[fp * 18 + m], falta - 1, n + 1, cara)) return true;
      }
      return false;
    }

    function inicioFase2(n1) {
      const x = aplicarMovs(c, m1.slice(0, n1));
      const esq = coordEsquinas(x), ari = coordAristas8(x), fp = coordFranjaPerm(x);
      const anterior = n1 ? Math.floor(m1[n1 - 1] / 3) : -1;
      for (let n2 = 0; n1 + n2 < tope; n2++) {
        if (fase2(esq, ari, fp, n2, 0, anterior)) {
          mejor = { movs: m1.slice(0, n1).concat(m2.slice(0, n2)), fase1: n1 };
          tope = mejor.movs.length;
          if (tope <= largo || Date.now() - inicio > ms) cortar = true;
          return;
        }
      }
    }

    function fase1(gi, vu, fr, falta, n, anterior) {
      if (cortar) return;
      if (falta === 0) {
        if (gi === 0 && vu === 0 && fr === FRANJA_RESUELTA && (n === 0 || !ES_FASE2[m1[n - 1]])) inicioFase2(n);
        return;
      }
      if (Math.max(t.dGiro[fr * N_GIRO + gi], t.dVuelta[fr * N_VUELTA + vu]) > falta) return;
      if ((++nodos & 4095) === 0 && mejor && Date.now() - inicio > ms) { cortar = true; return; }
      for (let m = 0; m < 18; m++) {
        const cara = Math.floor(m / 3);
        if (saltar(cara, anterior)) continue;
        m1[n] = m;
        fase1(t.giro[gi * 18 + m], t.vuelta[vu * 18 + m], t.franja[fr * 18 + m], falta - 1, n + 1, cara);
        if (cortar) return;
      }
    }

    const gi = coordGiro(c), vu = coordVuelta(c), fr = coordFranja(c);
    for (let n1 = 0; n1 < tope && !cortar; n1++) fase1(gi, vu, fr, n1, 0, -1);
    return mejor;
  }

  // ------------------------------------------------------------ 3b. la solución por etapas

  // Los cuatro huecos de la segunda capa, cada uno visto de frente: qué cara
  // queda al frente y cuál a la derecha. Un algoritmo escrito para el frente
  // F y la derecha R se traduce a cada hueco.
  const MARCOS = [[F, R], [R, B], [B, L], [L, F]];
  function traducir(texto, k) {
    const [fr, de] = MARCOS[k];
    const cambio = { U: U, D: D, F: fr, R: de, B: opuesta(fr), L: opuesta(de) };
    return leerMovs(texto).map(m => cambio[CARAS[Math.floor(m / 3)]] * 3 + m % 3);
  }

  const ALG = {
    sexy: "R U R' U'",
    derecha: "U R U' R' U' F' U F",
    izquierda: "U' L' U L U F U' F'",
    cruz: "F R U R' U' F'",
    sune: "R U R' U R U2 R'",
    esquinas: "R' F R' B2 R F' R' B2 R2",
    aristas: "R U' R U R U R U' R' U' R2",
  };

  function ficha(nombre, k, movs) {
    return { nombre, marco: k, movs, piezas: aplicarMovs(resueltoPiezas(), movs) };
  }
  const GIROS_ARRIBA = [ficha('U', -1, [0]), ficha('U', -1, [1]), ficha('U', -1, [2])];
  const fichasDe = (nombre, marcos = [0, 1, 2, 3]) => marcos.map(k => ficha(nombre, k, traducir(ALG[nombre], k)));
  const FICHAS = {};
  for (const n of Object.keys(ALG)) FICHAS[n] = fichasDe(n);

  // la esquina de abajo y la arista de en medio de cada hueco
  const ESQ_HUECO = [4, 7, 6, 5];   // DFR, DRB, DBL, DLF
  const ARI_HUECO = [8, 11, 10, 9];  // FR, BR, BL, FL

  const esqBien = (c, i) => c.cp[i] === i && c.co[i] === 0;
  const ariBien = (c, i) => c.ep[i] === i && c.eo[i] === 0;
  const dondeEsq = (c, j) => c.cp.indexOf(j);
  const dondeAri = (c, j) => c.ep.indexOf(j);

  // La combinación más corta de fichas que cumple la meta, a lo hondo con
  // tope creciente. Dos giros de arriba seguidos no se permiten.
  function buscarFichas(c, fichas, meta, tope) {
    const camino = [];
    function hondo(x, falta, previaArriba) {
      if (meta(x)) return true;
      if (falta === 0) return false;
      for (const f of fichas(x)) {
        const arriba = f.marco < 0;
        if (arriba && previaArriba) continue;
        camino.push(f);
        if (hondo(multiplicar(x, f.piezas), falta - 1, arriba)) return true;
        camino.pop();
      }
      return false;
    }
    for (let p = 0; p <= tope; p++) if (hondo(c, p, false)) return camino.slice();
    return null;
  }

  // La cruz: arista por arista, con los 18 movimientos, buscando cuál de las
  // que faltan se pone con menos.
  const DIST_ARISTA = (() => {
    // a dónde va una arista que está en el lugar q con orientación o
    const va = MOV.map(M => {
      const t = new Array(24);
      for (let i = 0; i < 12; i++) for (let o = 0; o < 2; o++) t[M.ep[i] * 2 + o] = i * 2 + (o + M.eo[i]) % 2;
      return t;
    });
    return Array.from({ length: 12 }, (_, casa) => {
      const d = new Array(24).fill(-1), cola = [casa * 2];
      d[casa * 2] = 0;
      while (cola.length) {
        const s = cola.shift();
        for (const t of va) if (d[t[s]] < 0) { d[t[s]] = d[s] + 1; cola.push(t[s]); }
      }
      return d;
    });
  })();

  function ponerAristasCruz(c, puestas, nueva, tope) {
    const todas = puestas.concat([nueva]), camino = [];
    const cota = x => Math.max(...todas.map(j => { const i = dondeAri(x, j); return DIST_ARISTA[j][i * 2 + x.eo[i]]; }));
    function hondo(x, falta, anterior) {
      const h = cota(x);
      if (h === 0) return true;
      if (h > falta) return false;
      for (let m = 0; m < 18; m++) {
        const cara = Math.floor(m / 3);
        if (saltar(cara, anterior)) continue;
        camino.push(m);
        if (hondo(multiplicar(x, MOV[m]), falta - 1, cara)) return true;
        camino.pop();
      }
      return false;
    }
    for (let p = 0; p <= tope; p++) if (hondo(c, p, -1)) return camino.slice();
    return null;
  }

  function resolverPorEtapas(c0) {
    let c = c0;
    const etapas = [];
    const pasoDeFichas = (fichas, extra) => ({ fichas: fichas.map(f => ({ nombre: f.nombre, marco: f.marco, movs: f.movs })), ...extra });
    const aplicarPaso = p => { for (const f of p.fichas) c = aplicarMovs(c, f.movs); };

    // 1. la cruz de abajo
    const cruzPasos = [];
    let puestas = [];
    let faltan = [4, 5, 6, 7];
    while (faltan.length) {
      let elegida = null;
      for (let p = 0; p <= 8 && !elegida; p++) {
        for (const j of faltan) {
          const movs = ponerAristasCruz(c, puestas, j, p);
          if (movs && movs.length <= p) { elegida = { j, movs }; break; }
        }
      }
      if (!elegida) throw new Error('no encontré la cruz');
      const p = { pieza: { arista: elegida.j }, fichas: elegida.movs.length ? [{ nombre: 'libre', marco: -1, movs: elegida.movs }] : [] };
      aplicarPaso(p);
      cruzPasos.push(p);
      puestas.push(elegida.j);
      faltan = faltan.filter(j => j !== elegida.j);
    }
    etapas.push({ etapa: 'cruz', pasos: cruzPasos });

    // 2. las esquinas de abajo
    const esqPasos = [];
    let listas = [];
    let pendientes = [0, 1, 2, 3];
    while (pendientes.length) {
      let elegida = null;
      for (let p = 0; p <= 8 && !elegida; p++) {
        for (const k of pendientes) {
          const meta = x => [4, 5, 6, 7].every(i => ariBien(x, i)) && listas.concat([k]).every(h => esqBien(x, ESQ_HUECO[h]));
          // el algoritmo, sólo en el hueco de destino o en el que tiene atrapada la esquina
          const fichas = x => {
            const donde = ESQ_HUECO.indexOf(dondeEsq(x, ESQ_HUECO[k]));
            const huecos = donde >= 0 && donde !== k ? [k, donde] : [k];
            return GIROS_ARRIBA.concat(huecos.map(h => FICHAS.sexy[h]));
          };
          const f = buscarFichasExacto(c, fichas, meta, p);
          if (f) { elegida = { k, f }; break; }
        }
      }
      if (!elegida) throw new Error('no encontré una esquina');
      const p = pasoDeFichas(elegida.f, { pieza: { esquina: ESQ_HUECO[elegida.k] } });
      aplicarPaso(p);
      esqPasos.push(p);
      listas.push(elegida.k);
      pendientes = pendientes.filter(k => k !== elegida.k);
    }
    etapas.push({ etapa: 'esquinas', pasos: esqPasos });

    // 3. la segunda capa
    const primera = x => [4, 5, 6, 7].every(i => ariBien(x, i) && esqBien(x, i));
    const capaPasos = [];
    listas = [];
    pendientes = [0, 1, 2, 3];
    while (pendientes.length) {
      let elegida = null;
      for (let p = 0; p <= 5 && !elegida; p++) {
        for (const k of pendientes) {
          const meta = x => primera(x) && listas.concat([k]).every(h => ariBien(x, ARI_HUECO[h]));
          const fichas = x => {
            const donde = ARI_HUECO.indexOf(dondeAri(x, ARI_HUECO[k]));
            // derecha en el marco h entra al hueco h; izquierda en el marco h, al hueco h - 1
            const usar = [FICHAS.derecha[k], FICHAS.izquierda[(k + 1) % 4]];
            if (donde >= 0 && donde !== k) usar.push(FICHAS.derecha[donde]);
            return GIROS_ARRIBA.concat(usar);
          };
          const f = buscarFichasExacto(c, fichas, meta, p);
          if (f) { elegida = { k, f }; break; }
        }
      }
      if (!elegida) throw new Error('no encontré una arista de la segunda capa');
      const p = pasoDeFichas(elegida.f, { pieza: { arista: ARI_HUECO[elegida.k] } });
      aplicarPaso(p);
      capaPasos.push(p);
      listas.push(elegida.k);
      pendientes = pendientes.filter(k => k !== elegida.k);
    }
    etapas.push({ etapa: 'capa', pasos: capaPasos });

    // 4 a 7: la capa de arriba, cada etapa con un solo algoritmo y los giros de arriba
    const dosCapas = x => primera(x) && [8, 9, 10, 11].every(i => ariBien(x, i));
    const cruzArriba = x => dosCapas(x) && [0, 1, 2, 3].every(i => x.eo[i] === 0);
    const esqOrientadas = x => cruzArriba(x) && [0, 1, 2, 3].every(i => x.co[i] === 0);
    const esqEnLugar = x => {
      if (!esqOrientadas(x)) return false;
      // en su lugar salvo un giro de arriba
      for (let k = 0; k < 4; k++) if ([0, 1, 2, 3].every(i => x.cp[i] === (i + k) % 4)) return true;
      return false;
    };
    const resuelto = x => x.cp.every((j, i) => j === i) && x.co.every(o => !o) && x.ep.every((j, i) => j === i) && x.eo.every(o => !o);
    for (const [etapa, alg, meta, tope] of [
      ['cruz-arriba', 'cruz', cruzArriba, 6],
      ['orientar', 'sune', esqOrientadas, 8],
      ['esquinas-arriba', 'esquinas', esqEnLugar, 6],
      ['aristas-arriba', 'aristas', resuelto, 6],
    ]) {
      const f = buscarFichas(c, () => GIROS_ARRIBA.concat(FICHAS[alg]), meta, tope);
      if (!f) throw new Error(`no encontré la etapa ${etapa}`);
      const p = pasoDeFichas(f, {});
      aplicarPaso(p);
      etapas.push({ etapa, pasos: [p] });
    }
    if (!resuelto(c)) throw new Error('las etapas no terminaron el cubo');
    return etapas;
  }

  // como buscarFichas, pero con un solo tope (quien llama sube el tope)
  function buscarFichasExacto(c, fichas, meta, prof) {
    const camino = [];
    function hondo(x, falta, previaArriba) {
      if (falta === 0) return meta(x);
      for (const f of fichas(x)) {
        const arriba = f.marco < 0;
        if (arriba && previaArriba) continue;
        camino.push(f);
        if (hondo(multiplicar(x, f.piezas), falta - 1, arriba)) return true;
        camino.pop();
      }
      return false;
    }
    if (prof === 0) return meta(c) ? [] : null;
    return hondo(c, prof, false) ? camino.slice() : null;
  }

  const movsDeEtapas = etapas => etapas.flatMap(e => e.pasos.flatMap(p => p.fichas.flatMap(f => f.movs)));

  // revolver: n movimientos al azar sin repetir cara (con semilla para las pruebas)
  function revolver(n = 25, azar = Math.random) {
    const movs = [];
    let anterior = -1;
    while (movs.length < n) {
      const m = Math.floor(azar() * 18), cara = Math.floor(m / 3);
      if (saltar(cara, anterior)) continue;
      movs.push(m);
      anterior = cara;
    }
    return movs;
  }

  return {
    CARAS, NOMBRE_MOV, RESUELTO, ESQ_CASILLAS, ESQ_COLORES, ESQ_NOMBRE, ARI_CASILLAS, ARI_COLORES, ARI_NOMBRE,
    ESQ_HUECO, ARI_HUECO, ALG, MARCOS,
    leerMovs, escribirMovs, invertirMovs, aplicarCasillas, aplicarMovs, aCasillas, aPiezas, multiplicar,
    resueltoPiezas, analizar, prepararTablas, resolverCorto, resolverPorEtapas, movsDeEtapas, revolver, traducir,
  };
})();

if (typeof module !== 'undefined') {
  module.exports = CuboCalculo;
  if (require.main === module && process.argv.includes('--prueba')) {
    const assert = require('assert');
    const C = CuboCalculo;
    const aplicarTodo = (est, movs) => movs.reduce((e, m) => C.aplicarCasillas(e, m), est);
    // azar con semilla
    let s = 2611;
    const azar = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };

    // el modelo: cuatro cuartos de vuelta regresan al inicio; casillas y piezas dicen lo mismo
    for (let m = 0; m < 18; m += 3) {
      assert.deepStrictEqual(aplicarTodo(C.RESUELTO, [m, m, m, m]), C.RESUELTO, `${C.NOMBRE_MOV[m]} ×4`);
    }
    assert.deepStrictEqual(aplicarTodo(C.RESUELTO, C.leerMovs("R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'")), C.RESUELTO, 'sexy ×6');
    // U horario visto desde arriba: lo del frente pasa a la izquierda
    const u = C.aplicarCasillas(C.RESUELTO, 0);
    assert.deepStrictEqual(u.slice(36, 39), [2, 2, 2], 'U lleva el frente a la izquierda');
    assert.deepStrictEqual(C.aplicarCasillas(C.RESUELTO, 3).slice(18, 21), [2, 2, 3], 'R sube el frente: la columna derecha de F viene de D');
    for (let k = 0; k < 200; k++) {
      const movs = C.revolver(30, azar);
      const est = aplicarTodo(C.RESUELTO, movs);
      const c = C.aplicarMovs(C.resueltoPiezas(), movs);
      assert.deepStrictEqual(C.aCasillas(c), est, 'piezas y casillas coinciden');
      assert.deepStrictEqual(C.aPiezas(est), c, 'de casillas a piezas y de regreso');
      const a = C.analizar(est);
      assert.deepStrictEqual(a.problemas, [], 'un cubo revuelto con giros siempre tiene solución');
    }
    // los algoritmos de la capa de arriba no tocan las dos primeras capas
    const c0 = C.resueltoPiezas();
    for (const n of ['cruz', 'sune', 'esquinas', 'aristas']) {
      for (let k = 0; k < 4; k++) {
        const x = C.aplicarMovs(c0, C.traducir(C.ALG[n], k));
        for (let i = 4; i < 12; i++) assert(x.ep[i] === i && x.eo[i] === 0, `${n} en el marco ${k} respeta la arista ${C.ARI_NOMBRE[i]}`);
        for (let i = 4; i < 8; i++) assert(x.cp[i] === i && x.co[i] === 0, `${n} en el marco ${k} respeta la esquina ${C.ESQ_NOMBRE[i]}`);
        if (n !== 'cruz') assert(x.eo.every(o => !o), `${n} no voltea aristas`);
        if (n === 'esquinas' || n === 'aristas') assert(x.co.every(o => !o), `${n} no gira esquinas`);
        if (n === 'aristas') assert(x.cp.every((j, i) => j === i), 'aristas no mueve esquinas');
      }
    }

    // el análisis encuentra cada tipo de error
    const revuelto = aplicarTodo(C.RESUELTO, C.revolver(25, azar));
    const conProblema = est => C.analizar(est).problemas.map(p => p.tipo);
    const cambiar = (est, pares) => { const e = est.slice(); for (const [i, v] of pares) e[i] = v; return e; };
    const ce = C.ESQ_CASILLAS[0], ca = C.ARI_CASILLAS[0];
    // girar una esquina en su lugar
    const girada = cambiar(revuelto, [[ce[0], revuelto[ce[2]]], [ce[1], revuelto[ce[0]]], [ce[2], revuelto[ce[1]]]]);
    assert.deepStrictEqual(conProblema(girada), ['giro-esquinas']);
    // voltear una arista
    const volteada = cambiar(revuelto, [[ca[0], revuelto[ca[1]]], [ca[1], revuelto[ca[0]]]]);
    assert.deepStrictEqual(conProblema(volteada), ['vuelta-aristas']);
    // intercambiar dos aristas
    const ca2 = C.ARI_CASILLAS[5];
    const cambiadas = cambiar(revuelto, [[ca[0], revuelto[ca2[0]]], [ca[1], revuelto[ca2[1]]], [ca2[0], revuelto[ca[0]]], [ca2[1], revuelto[ca[1]]]]);
    assert.deepStrictEqual(conProblema(cambiadas), ['paridad']);
    // una esquina en espejo (dos de sus casillas cambiadas)
    const espejo = cambiar(revuelto, [[ce[1], revuelto[ce[2]]], [ce[2], revuelto[ce[1]]]]);
    assert(conProblema(espejo).includes('esquina-espejo'));
    // una casilla de otro color: la cuenta no da
    assert.deepStrictEqual(conProblema(cambiar(revuelto, [[0, (revuelto[0] + 1) % 6]])), ['cuenta']);
    assert.deepStrictEqual(conProblema(cambiar(revuelto, [[0, -1]])), ['vacias']);
    // colores con otros nombres: el análisis los reacomoda por los centros
    const otros = revuelto.map(x => [3, 5, 0, 1, 2, 4][x]);
    assert.deepStrictEqual(C.analizar(otros).problemas, []);
    assert.deepStrictEqual(C.analizar(otros).casillas, revuelto);

    // las dos soluciones resuelven, en 100 cubos al azar
    let t = Date.now();
    C.prepararTablas();
    const tTablas = Date.now() - t;
    const largos = [], largosEtapas = [];
    t = Date.now();
    for (let k = 0; k < 100; k++) {
      const movs = C.revolver(30, azar);
      const c = C.aplicarMovs(C.resueltoPiezas(), movs);
      const r = C.resolverCorto(c, { ms: 300 });
      assert(r, 'encontró la corta');
      const sol = r.movs;
      const tras1 = C.aplicarMovs(c, sol.slice(0, r.fase1));
      assert(tras1.co.every(o => !o) && tras1.eo.every(o => !o) && tras1.ep.slice(8).every(j => j >= 8), 'la fase 1 deja el cubo en el grupo de la fase 2');
      const fin = C.aplicarMovs(c, sol);
      assert.deepStrictEqual(fin, C.resueltoPiezas(), `la corta resuelve (cubo ${k})`);
      largos.push(sol.length);
      const et = C.resolverPorEtapas(c);
      assert.deepStrictEqual(C.aplicarMovs(c, C.movsDeEtapas(et)), C.resueltoPiezas(), `las etapas resuelven (cubo ${k})`);
      largosEtapas.push(C.movsDeEtapas(et).length);
    }
    const tSol = Date.now() - t;
    assert.deepStrictEqual(C.resolverCorto(C.resueltoPiezas()).movs, [], 'resuelto: nada que hacer');
    assert.strictEqual(C.movsDeEtapas(C.resolverPorEtapas(C.resueltoPiezas())).length, 0);
    const prom = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
    assert(Math.max(...largos) <= 22, 'la corta nunca pasa de 22');
    console.log(`tablas ${tTablas} ms · 100 cubos en ${tSol} ms`);
    console.log(`corta: promedio ${prom(largos)}, de ${Math.min(...largos)} a ${Math.max(...largos)}`);
    console.log(`por etapas: promedio ${prom(largosEtapas)}, de ${Math.min(...largosEtapas)} a ${Math.max(...largosEtapas)}`);
    console.log('ok');
  }
}
