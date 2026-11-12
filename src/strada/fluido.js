// FLUIDITÀ (soprattutto su iPhone): piccoli attrezzi per toccare la pagina senza far lavorare il browser per niente.
//  - PZ.dopoFotogramma(f): esegue f al prossimo fotogramma. Serve per far ripartire un'animazione CSS (togli la classe
//    ora, rimettila al fotogramma dopo) SENZA il vecchio trucco "void el.offsetWidth", che costringeva il browser a
//    ricalcolare l'impaginazione di tutta la pagina a ogni frammento preso, a ogni urto, a ogni lampo: uno scatto.
//  - PZ.riavviaClasse(el, c): fa ripartire l'animazione legata alla classe c.
//  - PZ.opacita(el, v): cambia l'opacità di un velo solo se è cambiata davvero (a passi di 0,01) e lo toglie del
//    tutto (visibility: hidden) quando è trasparente: un velo a tutto schermo invisibile costa comunque, sopra il gioco.
(function () {
  const coda = [];
  let prenotato = false;
  const raf = function (f) { return (window.__rafVero || window.requestAnimationFrame).call(window, f); };
  function esegui() { prenotato = false; const l = coda.splice(0); for (let i = 0; i < l.length; i++) { try { l[i](); } catch (e) {} } }
  PZ.dopoFotogramma = function (f) { coda.push(f); if (!prenotato) { prenotato = true; raf(esegui); } };
  PZ.riavviaClasse = function (el, c) {
    if (!el) return;
    if (!el.classList.contains(c)) { el.classList.add(c); return; }
    el.classList.remove(c);
    PZ.dopoFotogramma(function () { el.classList.add(c); });
  };
  PZ.opacita = function (el, v) {
    if (!el) return;
    const q = v <= 0.005 ? 0 : Math.round(Math.min(1, v) * 100) / 100;
    if (el.__op === q) return;
    el.__op = q;
    el.style.opacity = String(q);
    el.style.visibility = q === 0 ? 'hidden' : 'visible';
  };
})();

// SCRITTE GRANDI IN MEZZO ALLO SCHERMO (SCAPPA, SALTA, INVESTITO, SENSI DI COLPA, IL TEMPO SI SCIOGLIE).
// Il font DRUNK è un ricalco fatto di migliaia di puntini (circa 17.000 punti per lettera): il browser lo ridisegnava
// ogni volta che una scritta compariva, con contorno e ombre, e su iPhone questo è uno scatto bello lungo. Ora ogni
// scritta si disegna UNA volta in un'immagine (con lo stesso aspetto: giallo, contorno e ombra neri) e poi si mostra
// quella: comparire, ingrandirsi e sparire costa pochissimo. Le immagini delle scritte note si preparano prima della
// corsa (PZ.scritte.prepara). Se il font non è ancora caricato si usa la scritta normale, senza ricordarla.
PZ.scritte = (function () {
  const cache = {};
  function disegna(testo, px, larg, sp) {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const m = document.createElement('canvas').getContext('2d');
    let P = px;
    const misura = function (s, p) { m.font = p + 'px Drunk, monospace'; let w = 0; for (let i = 0; i < s.length; i++) w += m.measureText(s[i]).width + sp * p; return w - sp * p; };
    // la parola più lunga deve stare nella larghezza; poi le parole vanno a capo
    const parole = testo.split(' ');
    const lunga = Math.max.apply(null, parole.map(function (w) { return misura(w, P); }));
    if (lunga > larg) P = P * larg / lunga;
    const righe = []; let riga = '';
    parole.forEach(function (w) { const prova = riga ? riga + ' ' + w : w; if (riga && misura(prova, P) > larg) { righe.push(riga); riga = w; } else riga = prova; });
    if (riga) righe.push(riga);
    const alt = P * 1.12, bordo = 0.09 * P;
    const W = Math.ceil(larg + 2 * bordo), H = Math.ceil(alt * righe.length + 2 * bordo);
    const c = document.createElement('canvas'); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
    c.style.width = W + 'px'; c.style.height = H + 'px';
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.font = P + 'px Drunk, monospace'; g.textBaseline = 'alphabetic';
    const scrivi = function (dx, dy, colore) {
      g.fillStyle = colore;
      righe.forEach(function (r, k) {
        let x = (W - misura(r, P)) / 2 + dx; const y = bordo + alt * k + P * 0.86 + dy;
        for (let i = 0; i < r.length; i++) { g.fillText(r[i], x, y); m.font = P + 'px Drunk, monospace'; x += m.measureText(r[i]).width + sp * P; }
      });
    };
    // ombra morbida, contorno nero (otto spostamenti) e ombra netta, poi il giallo sopra
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 0.3 * P * dpr; scrivi(0, 0, '#000'); g.shadowBlur = 0; g.shadowColor = 'transparent';
    const o = 0.035 * P;
    [[o, 0], [-o, 0], [0, o], [0, -o], [o, o], [-o, -o], [o, -o], [-o, o], [0.06 * P, 0.06 * P]].forEach(function (d) { scrivi(d[0], d[1], '#000'); });
    scrivi(0, 0, '#ffd21f');
    c.className = 'scrittaImg';
    return c;
  }
  // testo, px = grandezza del font (CSS), larg = larghezza disponibile (CSS), sp = spaziatura tra le lettere (in em)
  function immagine(testo, px, larg, sp) {
    const pronto = document.fonts && document.fonts.check ? document.fonts.check('20px Drunk') : true;
    const chiave = testo + '|' + Math.round(px) + '|' + Math.round(larg);
    if (cache[chiave]) return cache[chiave];
    if (!pronto) return null;
    return (cache[chiave] = disegna(testo, px, larg, sp || 0));
  }
  return { immagine: immagine };
})();
