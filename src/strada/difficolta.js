// DIFFICOLTÀ della corsa: un solo posto da cui dipende quanto è difficile la corsa in ogni istante.
// I numeri sono in config.js (sezione strada.difficolta). t = secondi di corsa.
//   p(t)        da 0 a 1: frequenza degli ostacoli, auto doppie, transenne, sagome, pressione del demone, atmosfera
//   velocita(t) m/s della bici (le auto accelerano in proporzione)
//   fase(t)     'apprendimento' | 'pressione' | 'fuga' | 'oltre' (solo per le prove e per chi legge)
//
// FASE 6: LA DIFFICOLTÀ SEGUE I FRAMMENTI RACCOLTI (numeri in config.js, strada.difficolta.frammenti).
//   corsa(t, n)          difficoltà da 0 a 1 con n = frammenti raccolti (già "ammorbidito" da corsa.js, così non sale
//                        a scatti a ogni frammento) e t = secondi di corsa. Quattro fasi:
//                          FASE 1  0-25  si impara: ostacoli singoli e combinazioni semplici
//                          FASE 2 26-50  più ostacoli, combinazioni su corsie diverse, più cambi di corsia
//                          FASE 3 51-75  file fitte e ravvicinate, il demone più vicino, frammenti più rischiosi
//                          FASE 4 76-100 il massimo: precisione, il demone e le anomalie al massimo
//                        Il tempo conta solo un po' (fino al 35% della difficoltà): chi non raccoglie non resta sulla
//                        strada facile per sempre, ma è raccogliendo che la strada diventa una prova.
//   velocitaCorsa(c, n)  m/s della bici: sale con la difficoltà c e, nella fase 4, ancora un po'
//   faseFrammenti(n)     1, 2, 3 o 4
//   velocitaMetri(m)     (FASE 7) m/s della bici dopo m metri: la velocità vera della corsa
PZ.difficolta = (function () {
  const D = PZ.CONFIG.strada.difficolta;
  const limita = function (x) { return Math.max(0, Math.min(1, x)); };
  // dopo l'apprendimento sale subito (la pressione si sente già nel primo minuto), poi rallenta verso il massimo;
  // parte e arriva con pendenza zero, quindi non ci sono scatti
  function p(t) {
    const x = limita((t - D.apprendimento) / (D.tempoMassimo - D.apprendimento));
    return Math.pow(Math.sin(x * Math.PI / 2), D.curva);
  }
  function oltre(t) { const x = limita((t - D.tempoMassimo) / D.tempoOltre); return x * x * (3 - 2 * x); }
  function velocita(t) {
    return D.velocitaIniziale + (D.velocitaMassima - D.velocitaIniziale) * p(t) + (D.velocitaOltre - D.velocitaMassima) * oltre(t);
  }
  function fase(t) { return t < D.apprendimento ? 'apprendimento' : t >= D.tempoMassimo ? 'oltre' : p(t) < 0.5 ? 'pressione' : 'fuga'; }
  const DF = D.frammenti || { punti: [[0, 0], [100, 1]], tempo: 0.35 };
  function liscia(x) { x = limita(x); return x * x * (3 - 2 * x); }
  function pFrammenti(n) {                  // tra un punto e l'altro sale morbida (nessun gradino)
    const P = DF.punti;
    if (n <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (n <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * liscia((n - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
    return P[P.length - 1][1];
  }
  function corsa(t, n) { return 1 - (1 - pFrammenti(n)) * (1 - DF.tempo * p(t)); }
  function velocitaCorsa(c, n) {
    return D.velocitaIniziale + (D.velocitaMassima - D.velocitaIniziale) * c + (D.velocitaOltre - D.velocitaMassima) * liscia((n - 76) / 24);
  }
  // la velocità a cui pianificare le file: quella che ci sarà tra un po' (le file si decidono una decina di secondi
  // prima che arrivino; nel frattempo la bici può accelerare, e le distanze tra le file non devono accorciarsi oltre
  // quanto il generatore ha controllato). anticipo = frammenti in più che si potrebbero prendere nel frattempo
  function velocitaPianifica(t, n) { const a = DF.anticipo || 12; return velocitaCorsa(corsa(t + 12, n + a), n + a); }
  // FASE 7: LA VELOCITÀ SEGUE I METRI PERCORSI (non i frammenti). punti = [metri, m/s] in config.js
  // (difficolta.velocitaMetri); tra un punto e l'altro una curva morbida che sale sempre (nessuno scatto, nessuna
  // discesa); dopo l'ultimo punto continua a salire di "oltre" m/s per metro, SENZA limite.
  const VM = D.velocitaMetri || { punti: [[0, D.velocitaIniziale], [1000, D.velocitaMassima]], oltre: 0 };
  const tangenti = (function () {                      // pendenze di una curva monotona (Fritsch-Carlson)
    const P = VM.punti, n = P.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
    m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    m.push(VM.oltre || 0);
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return m;
  })();
  function velocitaMetri(x) {
    const P = VM.punti, n = P.length;
    if (x <= P[0][0]) return P[0][1];
    if (x >= P[n - 1][0]) return P[n - 1][1] + (VM.oltre || 0) * (x - P[n - 1][0]);
    let i = 0; while (x > P[i + 1][0]) i++;
    const h = P[i + 1][0] - P[i][0], t = (x - P[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * h * tangenti[i] + (-2 * t3 + 3 * t2) * P[i + 1][1] + (t3 - t2) * h * tangenti[i + 1];
  }
  // (fase 57) frenesia da 0 a 1 (n = frammenti; di default quelli raccolti). Nell'arcade 0: lì comandano i metri
  function frenesia(n) {
    const FR = D.frenesia; if (!FR || PZ.difficolta.arcade) return 0;
    if (n === undefined) n = PZ.raccolta ? PZ.raccolta.livello() : 0;
    return liscia((n - FR.da) / (FR.a - FR.da));
  }
  function faseFrammenti(n) { return n <= 25 ? 1 : n <= 50 ? 2 : n <= 75 ? 3 : 4; }
  return { p: p, velocita: velocita, fase: fase, corsa: corsa, pFrammenti: pFrammenti, velocitaCorsa: velocitaCorsa, velocitaPianifica: velocitaPianifica, faseFrammenti: faseFrammenti, velocitaMetri: velocitaMetri, frenesia: frenesia,
    velocitaFrenesia: function (n) { return (1 + (D.frenesia ? D.frenesia.velocita : 0) * frenesia(n)) * (1 + piuStoria('velocita')); },
    piuStoria: piuStoria };
  function piuStoria(k) { return D.storia && !PZ.difficolta.arcade ? D.storia[k] || 0 : 0; }
})();
