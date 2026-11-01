/* Calcula las dos soluciones del cubo fuera de la pantalla, para que la página
   no se congele mientras arma las tablas (la primera vez, menos de un
   segundo) y busca la solución corta (hasta un segundo y medio). */

importScripts('cubo-calculo.js?v=1');

self.onmessage = e => {
  const { piezas, pedido } = e.data;
  try {
    const t0 = Date.now();
    CuboCalculo.prepararTablas();
    const t1 = Date.now();
    const corta = CuboCalculo.resolverCorto(piezas, { largo: 20, ms: 1500 });
    const msCorta = Date.now() - t1;
    const etapas = CuboCalculo.resolverPorEtapas(piezas);
    self.postMessage({ pedido, corta, etapas, msTablas: t1 - t0, msCorta });
  } catch (err) {
    self.postMessage({ pedido, error: String(err && err.message || err) });
  }
};
