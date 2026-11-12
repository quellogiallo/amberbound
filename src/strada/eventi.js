// EVENTI DELLA CORSA: il BLACKOUT e i SENSI DI COLPA. Un solo sistema, aggiornato dalla corsa a ogni fotogramma:
// niente timer del browser, quindi alla morte, al finale o al riavvio basta smettere di chiamarlo (o azzerarlo) e non
// resta nulla in sospeso. Mai due eventi insieme; tra uno e l'altro almeno CFG.pausa secondi.
//
// BLACKOUT: i lampioni si spengono a scatti, finestre e insegne si spengono, la luce cala e la foschia diventa nera
// (questi valori li applica atmosfera.js a partire da E.buio, da 0 a 1). Restano: i fari delle auto, i lampeggianti
// delle transenne, l'alone pallido della ragazza, i frammenti d'ambra, la luce della bici sull'asfalto della sua
// corsia e gli occhi del demone, che si fanno più grandi. Dura qualche secondo, poi la luce torna piano.
//
// SENSI DI COLPA: lacrime che si formano, restano attaccate e poi scivolano sullo schermo (ogni goccia è una piccola
// lente: mostra la strada capovolta), la vista si appanna, i colori si fanno freddi, i suoni ovattati. OGNI volta,
// tutto insieme: la scritta SENSI DI COLPA, le lacrime e i comandi destra/sinistra INVERTITI. Cambia solo quanto
// sono forti lacrime e appannamento:
//   inversione  lacrime leggere (è sempre la prima)
//   annebbiata  vista molto appannata
//   lacrime     tante lacrime e l'immagine che ondeggia (da difficoltà media)
//   crollo      lacrime e appannamento medi (alle difficoltà alte)
// Gli eventi iniziano solo dopo CFG.daMetri metri di corsa (prima la strada è libera da blackout e lacrime).
// L'inversione agisce sul comando vero (corsa.js chiede invertiti() in cambia(), che usano frecce, A/D, pulsanti e
// scorrimenti); il salto non cambia. Inizia e finisce di colpo, mentre l'immagine sfuma.
PZ.creaEventi = function (o) {
  const CFG = PZ.CONFIG.strada.eventi, ui = o.ui, stage = o.stage, renderer = o.renderer;
  const rnd = PZ.ps1.casuale(4242);
  const mix = function (a, b, k) { return a + (b - a) * k; };
  const liscia = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const VARIANTI = {
    annebbiata: { L: 0.5, N: 0.75, D: 0.6, inv: true },
    inversione: { L: 0.32, N: 0.22, D: 0.3, inv: true },
    lacrime: { L: 1, N: 0.45, D: 2.6, inv: true },
    crollo: { L: 0.62, N: 0.42, D: 1.1, inv: true }
  };
  const B_IN = 0.65, B_OUT = 2.2, C_IN = 0.7, C_OUT = 0.9;
  const E = { t: 0, blackout: null, colpa: null, prossimoBlackout: 0, prossimaColpa: 0, libero: 0, buio: 0, eColpa: 0, inverti: false,
    fermo: false, sbloccato: false, numColpa: 0, ultimaVariante: '', conteggio: { blackout: 0, colpa: 0, colpaBreve: 0 }, L: 0, N: 0, D: 0, variante: '' };

  // ---------- La luce della bici: un fascio sull'asfalto davanti alla ruota, si vede solo al buio ----------
  const texF = (function () {
    const c = document.createElement('canvas'); c.width = 16; c.height = 64;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 64, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 64);
    const gx = g.createLinearGradient(0, 0, 16, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.3, 'rgba(0,0,0,0)'); gx.addColorStop(0.7, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 16, 64);
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const fanale = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texF, color: 0xfff0cc,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  fanale.scale.set(1.7, 1, 13); fanale.visible = false;
  o.scena.add(fanale);

  // ---------- Lo strato delle lacrime: una tela sopra l'immagine del gioco ----------
  const tela = document.createElement('canvas'); tela.id = 'lacrime';
  tela.style.position = 'absolute'; tela.style.left = '0'; tela.style.top = '0'; tela.style.display = 'none'; tela.style.pointerEvents = 'none';
  stage.insertBefore(tela, renderer.domElement.nextSibling);
  const g = tela.getContext('2d');
  const p1 = document.createElement('canvas'), p2 = document.createElement('canvas'), g1 = p1.getContext('2d'), g2 = p2.getContext('2d');
  let visibile = false;
  const gocce = [];          // coordinate su uno schermo di 360 x 640
  const BW = 360, BH = 640;

  // ---------- Avvio e fine degli eventi ----------
  function iniziaBlackout(p) {
    E.blackout = { t: 0, durata: mix(CFG.blackout.durata[0], CFG.blackout.durata[1], p) + rnd() * 1.2, torna: false };
    E.conteggio.blackout++;
    if (PZ.audio.blackout) PZ.audio.blackout();
    // (fase 32) annunciato: la scritta (senza spiegazioni) e la scossa elettrica, sincronizzate con lo spegnimento
    if (o.mostraConto) o.mostraConto('BLACKOUT', 1.5);
    E.scattoBuio = false;
  }
  function scegliVariante(p) {
    E.numColpa++;
    if (E.numColpa === 1) return 'inversione';            // la prima volta lacrime leggere: si capisce bene cosa succede
    const lista = [['annebbiata', 1], ['inversione', 1.3]];
    if (p > 0.3) lista.push(['lacrime', 1]);
    if (p > 0.6) lista.push(['crollo', 0.4 + p]);
    lista.forEach(function (x) { if (x[0] === E.ultimaVariante) x[1] *= 0.3; });
    let tot = 0; lista.forEach(function (x) { tot += x[1]; });
    let u = rnd() * tot;
    for (let i = 0; i < lista.length; i++) { u -= lista[i][1]; if (u <= 0) return lista[i][0]; }
    return lista[0][0];
  }
  function iniziaColpa(p, variante, durata) {
    const v = VARIANTI[variante];
    E.colpa = { t: 0, durata: durata, variante: variante, v: v };
    E.variante = variante; E.ultimaVariante = variante;
    E.inverti = v.inv;
    E.conteggio.colpa++;
    if (o.mostraConto) o.mostraConto('SENSI DI COLPA', 1.6);
    if (o.lampo) o.lampo('colpa');
    if (PZ.audio.colpa) PZ.audio.colpa();
    if (PZ.audio.pianoColpa) PZ.audio.pianoColpa(durata);   // (fase 59) il pianoforte
  }
  function fineEvento() { E.libero = E.t + CFG.pausa; }
  // (fase 18) la O Ave Maria: i sensi di colpa in corso si spengono di colpo (niente lacrime, comandi normali)
  function annullaColpa() { if (!E.colpa) return; if (PZ.audio.pianoFerma) PZ.audio.pianoFerma(); E.colpa = null; E.eColpa = 0; E.inverti = false; fineEvento(); }

  // ---------- Aggiornamento ----------
  // t: secondi di corsa; p: difficoltà; attivo: false = nessun evento nuovo, quelli in corso si spengono in fretta
  // (morte, finale); libero: false = per ora non iniziarne (es. la telecamera guarda indietro); xBici: per la luce
  // metri: strada percorsa (gli eventi partono dopo CFG.daMetri)
  function aggiorna(dt, t, p, attivo, libero, xBici, metri) {
    E.t = t;
    if (!attivo && !E.fermo) ferma();
    if (!E.sbloccato && attivo && (metri || 0) >= CFG.daMetri) {       // da qui possono arrivare: il primo poco dopo
      E.sbloccato = true;
      const a = t + CFG.primoDopo[0] + rnd() * (CFG.primoDopo[1] - CFG.primoDopo[0]), b = a + CFG.pausa + 8 + rnd() * 8;
      if (rnd() < 0.5) { E.prossimaColpa = a; E.prossimoBlackout = b; } else { E.prossimoBlackout = a; E.prossimaColpa = b; }
    }
    // BLACKOUT
    if (E.blackout) {
      const b = E.blackout; b.t += dt;
      const fine = B_IN + b.durata;
      let v;
      if (E.fermo) v = Math.max(0, E.buio - dt / 0.6);
      else if (b.t < B_IN) v = Math.sin(b.t * 47) > 0.2 || b.t > B_IN * 0.7 ? Math.min(1, 0.45 + b.t / B_IN) : 0.15;   // si spegne a scatti
      // (fase 32) la scossa a ogni scatto in cui le luci si spengono (la prima, all'inizio, più forte)
      if (!E.fermo && b.t < B_IN) { const buio = v > 0.3; if (buio && !E.scattoBuio && PZ.audio.scossa) { PZ.audio.scossa(!b.scossa); b.scossa = true; } E.scattoBuio = buio; }
      else if (b.t < fine) v = 1;
      else {
        if (!b.torna) { b.torna = true; if (PZ.audio.luceTorna) PZ.audio.luceTorna(); }
        const u = (b.t - fine) / B_OUT;
        v = 1 - liscia(u);
        if (u < 0.3 && Math.sin(b.t * 41) > 0.5) v = 1;                                // qualche scatto prima di riaccendersi
      }
      E.buio = v;
      if ((E.fermo && v <= 0) || b.t >= fine + B_OUT) { E.blackout = null; E.buio = 0; fineEvento(); E.prossimoBlackout = t + mix(CFG.blackout.ogni[0], CFG.blackout.ogni[1], p) + rnd() * mix(12, 7, p); }
    }
    // SENSI DI COLPA
    if (E.colpa) {
      const c = E.colpa; c.t += dt;
      const fine = C_IN + c.durata;
      if (E.fermo) E.eColpa = Math.max(0, E.eColpa - dt / 0.4);
      else E.eColpa = c.t < C_IN ? liscia(c.t / C_IN) : c.t < fine ? 1 : 1 - liscia((c.t - fine) / C_OUT);
      if (c.t >= fine || E.fermo) E.inverti = false;                  // i comandi tornano normali di colpo
      E.L = c.v.L; E.N = c.v.N; E.D = c.v.D;
      if ((E.fermo && E.eColpa <= 0) || c.t >= fine + C_OUT) {
        E.colpa = null; E.eColpa = 0; E.inverti = false; fineEvento(); if (PZ.audio.pianoFerma) PZ.audio.pianoFerma();
        if (!c.breve) E.prossimaColpa = t + mix(CFG.colpa.ogni[0], CFG.colpa.ogni[1], p) + rnd() * mix(10, 6, p);
      }
    }
    // nuovi eventi
    if (attivo && E.sbloccato && !E.fermo && libero !== false && !E.blackout && !E.colpa && t >= E.libero) {
      // (fase 59) al massimo CFG.colpa.max sensi di colpa e CFG.blackout.max blackout per run (contatori azzerati in reset)
      const okColpa = E.conteggio.colpa < (CFG.colpa.max || 1e9), okBuio = E.conteggio.blackout < (CFG.blackout.max || 1e9);
      if (okColpa && t >= E.prossimaColpa) iniziaColpa(p, scegliVariante(p), mix(CFG.colpa.durata[0], CFG.colpa.durata[1], p) + rnd() * 0.8);
      else if (okBuio && t >= E.prossimoBlackout) iniziaBlackout(p);
    }
    aggiornaGocce(dt);
    // la luce della bici, il comando invertito sui pulsanti, i suoni ovattati
    fanale.visible = E.buio > 0.01;
    if (fanale.visible) { fanale.position.set(xBici || 0, 0.016, -0.9 - 6.5); fanale.material.opacity = 0.42 * E.buio; }
    if (ui.corsa.classList.contains('invertiti') !== E.inverti) ui.corsa.classList.toggle('invertiti', E.inverti);
    const ov = E.eColpa * (0.45 + 0.4 * E.N);
    if (Math.abs(ov - ovattato) > 0.02 || (ov === 0 && ovattato !== 0)) { ovattato = ov; if (PZ.audio.ovatta) PZ.audio.ovatta(ov); }
  }
  let ovattato = 0;

  // ---------- Le gocce ----------
  function aggiornaGocce(dt) {
    const k = E.colpa && !E.fermo ? E.eColpa * E.L : 0;
    let nuove = k * 15 * dt;
    while (gocce.length < 44 && (nuove >= 1 || rnd() < nuove)) {
      nuove -= 1;
      const grande = rnd() < 0.3;
      gocce.push({ x: 8 + rnd() * (BW - 16), y: 10 + rnd() * BH * 0.8, r: 0, rMax: grande ? 9 + rnd() * 12 : 3 + rnd() * 4, ferma: 0.4 + rnd() * 1.8, vy: 0, a: 1, scia: [], fase: rnd() * 6 });
    }
    for (let i = gocce.length - 1; i >= 0; i--) {
      const d = gocce[i];
      if (!d.pronta) { d.r = Math.min(d.rMax, d.r + d.rMax * dt / 0.3); d.pronta = d.r >= d.rMax; }   // la goccia si forma
      else if (d.ferma > 0) d.ferma -= dt * (0.4 + d.rMax / 8);                      // resta attaccata
      else {                                                                          // poi scivola, a scatti
        d.vy = Math.min(260, d.vy + 300 * dt * (d.rMax / 7));
        if (rnd() < dt * 1.3) d.vy *= 0.15;
        const y0 = d.y; d.y += d.vy * dt; d.x += Math.sin(d.y * 0.05 + d.fase) * 0.25;
        if (!d.scia.length || Math.abs(d.y - d.scia[d.scia.length - 1][1]) > 4) { d.scia.push([d.x, y0]); if (d.scia.length > 16) d.scia.shift(); }
        d.r = Math.max(0, d.r - dt * 0.35);
      }
      if (!E.colpa || E.fermo) d.a -= dt / (E.fermo ? 0.4 : 0.9);
      if (d.y - d.r > BH || (d.pronta && d.r < 0.8) || d.a <= 0) gocce.splice(i, 1);
    }
  }

  // ---------- Disegno (subito dopo aver disegnato il gioco) ----------
  let T = 0;
  const copia = document.createElement('canvas'), gc = copia.getContext('2d');
  function disegna(src) {
    const e = E.eColpa;
    if (e <= 0.001 && !gocce.length) { if (visibile) { visibile = false; tela.style.display = 'none'; } return; }
    const W = src.width, H = src.height, sx = W / BW, sy = H / BH;
    if (tela.width !== W || tela.height !== H) { tela.width = W; tela.height = H; p1.width = Math.ceil(W / 3); p1.height = Math.ceil(H / 3); p2.width = Math.ceil(W / 9); p2.height = Math.ceil(H / 9); }
    if (!visibile) { visibile = true; tela.style.display = 'block'; }
    T += 1 / 60;
    // UNA sola copia dell'immagine del gioco per fotogramma: leggere l'immagine della scheda video costa (su iPhone
    // moltissimo), prima la si leggeva fino a cento volte (strisce, appannamento, ogni goccia)
    if (copia.width !== W || copia.height !== H) { copia.width = W; copia.height = H; }
    gc.globalCompositeOperation = 'copy'; gc.drawImage(src, 0, 0);
    src = copia;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    // 1. l'immagine del gioco; con molte lacrime ondeggia un poco (a strisce, come vista attraverso l'acqua)
    g.drawImage(src, 0, 0);
    const amp = E.D * e * sx;
    if (amp > 0.4) for (let y = 0; y < H; y += 12) { const h = Math.min(12, H - y); g.drawImage(src, 0, y, W, h, Math.sin(y * 0.045 + T * 2.6) * amp, y, W, h); }
    // 2. appannamento: la stessa immagine rimpicciolita e ingrandita (sfocata), più forte verso i bordi
    const nb = E.N * e;
    if (nb > 0.01) {
      g1.imageSmoothingEnabled = true; g2.imageSmoothingEnabled = true;
      g1.drawImage(src, 0, 0, p1.width, p1.height); g2.drawImage(p1, 0, 0, p2.width, p2.height);
      g.imageSmoothingEnabled = true; g.globalAlpha = 0.72 * nb; g.drawImage(p2, 0, 0, W, H);
      g.globalAlpha = 1;
      const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.12, W / 2, H * 0.55, H * 0.62);
      vg.addColorStop(0, 'rgba(165,182,215,0)'); vg.addColorStop(1, 'rgba(165,182,215,' + (0.3 * nb).toFixed(3) + ')');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    // 3. colori freddi e spenti
    const c = Math.max(E.L, E.N) * e;
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,' + (0.6 * c).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(140,165,225,' + (0.75 * c).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    // 4. le gocce: la scia bagnata, poi la goccia come una lente (immagine capovolta e rimpicciolita), il bordo e il riflesso
    g.imageSmoothingEnabled = false;
    for (let i = 0; i < gocce.length; i++) {
      const d = gocce[i], x = d.x * sx, y = d.y * sy, r = d.r * sx, ry = r * 1.18, a = Math.max(0, Math.min(1, d.a));
      if (r < 0.8) continue;
      if (d.scia.length > 1) {
        g.globalAlpha = 0.7 * a; g.strokeStyle = 'rgba(205,220,250,0.32)'; g.lineWidth = Math.max(1, r * 0.55); g.lineCap = 'round';
        g.beginPath(); g.moveTo(d.scia[0][0] * sx, d.scia[0][1] * sy);
        for (let j = 1; j < d.scia.length; j++) g.lineTo(d.scia[j][0] * sx, d.scia[j][1] * sy);
        g.lineTo(x, y); g.stroke();
      }
      g.globalAlpha = a;
      g.save();
      g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); g.clip();
      const q = Math.min(W, H, r * 7), qx = Math.max(0, Math.min(W - q, x - q / 2)), qy = Math.max(0, Math.min(H - q, y - q / 2));
      g.translate(x, y); g.scale(1, -1);
      g.drawImage(src, qx, qy, q, q, -r, -ry, 2 * r, 2 * ry);
      g.restore();
      g.globalAlpha = 0.38 * a; g.strokeStyle = 'rgba(8,12,28,0.9)'; g.lineWidth = Math.max(1, r * 0.16);
      g.beginPath(); g.ellipse(x, y, r, ry, 0, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.globalAlpha = 0.45 * a; g.strokeStyle = 'rgba(225,235,255,0.9)'; g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath(); g.ellipse(x, y, r * 0.9, ry * 0.9, 0, 1.1 * Math.PI, 1.6 * Math.PI); g.stroke();
      g.globalAlpha = 0.85 * a; g.fillStyle = '#eef4ff';
      g.fillRect(Math.round(x - r * 0.45), Math.round(y - ry * 0.55), Math.max(1, Math.round(r * 0.35)), Math.max(1, Math.round(r * 0.3)));
    }
    g.globalAlpha = 1;
  }

  // ---------- Fine, azzeramento, prove ----------
  // ferma: alla morte e al finale. Niente più eventi; quelli in corso si spengono in fretta; comandi normali subito.
  function ferma() { if (PZ.audio.pianoFerma) PZ.audio.pianoFerma(); E.fermo = true; E.inverti = false; ui.corsa.classList.remove('invertiti'); }
  // reset: a ogni nuova partita. Tutto come all'inizio, subito.
  function reset() {
    if (PZ.audio.pianoFerma) PZ.audio.pianoFerma();
    E.t = 0; E.blackout = null; E.colpa = null; E.buio = 0; E.eColpa = 0; E.inverti = false; E.fermo = false; E.numColpa = 0; E.ultimaVariante = '';
    E.libero = 0; E.L = E.N = E.D = 0; E.variante = '';
    E.sbloccato = false; E.prossimaColpa = Infinity; E.prossimoBlackout = Infinity;
    E.conteggio = { blackout: 0, colpa: 0, colpaBreve: 0 };
    gocce.length = 0; fanale.visible = false; fanale.material.opacity = 0;
    ui.corsa.classList.remove('invertiti');
    if (visibile) { visibile = false; tela.style.display = 'none'; }
    ovattato = 0; if (PZ.audio.ovatta) PZ.audio.ovatta(0);
  }
  // per le prove: forza('blackout') o forza('colpa', 'inversione', durata)
  function forza(tipo, variante, durata) {
    if (E.fermo) return false;
    E.blackout = null; E.colpa = null; E.buio = 0; E.eColpa = 0; E.inverti = false;
    if (tipo === 'blackout') iniziaBlackout(0.5); else iniziaColpa(0.5, variante || 'inversione', durata || 4);
    return true;
  }
  reset();
  return { aggiorna: aggiorna, disegna: disegna, ferma: ferma, reset: reset, forza: forza, stato: E, gocce: gocce, tela: tela, fanale: fanale,
    invertiti: function () { return E.inverti && !E.fermo; }, attivo: function () { return !!(E.blackout || E.colpa); }, annullaColpa: annullaColpa };
};
