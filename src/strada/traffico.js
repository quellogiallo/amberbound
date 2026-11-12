// I pericoli della strada: auto che vengono incontro (si evitano cambiando corsia), transenne (si saltano) e il
// fantasma della ragazza (in piedi si evita cambiando corsia, a terra si salta come una transenna).
//
// COME VENGONO DECISI. Gli ostacoli arrivano a "file": ogni fila ha, per ognuna delle 3 corsie, una di queste cose:
//   L = libera, A = auto, T = transenna, S = sagoma.
// Le file sono pianificate in anticipo in base all'ISTANTE in cui arriveranno al ragazzo, misurato in un tempo di
// gioco "tau" che scorre più in fretta quando il gioco accelera e più piano dopo un urto. Auto, transenne e sagome
// scorrono tutte con lo stesso tempo, quindi l'ordine e le distanze tra le file restano sempre quelli decisi.
// Prima di accettare una fila il generatore controlla che:
//   1. ci sia almeno una corsia percorribile (libera, oppure con una transenna da saltare);
//   2. QUALUNQUE corsia percorribile il giocatore abbia scelto per la fila prima, da lì possa raggiungere una corsia
//      percorribile della nuova fila nel tempo che c'è tra le due: si calcola quante corsie si fanno in tempo a
//      cambiare (0, 1 o 2) togliendo il tempo in cui gli ostacoli occupano la strada e un tempo di reazione; due salti
//      di fila solo se si fa in tempo a riatterrare. Così non esistono sequenze impossibili, e non serve indovinare
//      in anticipo la corsia giusta: va bene qualsiasi scelta fatta prima;
//   3. un'auto non debba attraversare una transenna o una sagoma che le sta davanti nella stessa corsia;
//   4. transenne e sagome compaiano abbastanza lontano da lasciare il tempo di reagire.
// Le auto (16), le transenne e le sagome sono sempre le stesse, riciclate.
PZ.creaTraffico = function (scena, citta, opz) {
  const CFG = PZ.CONFIG.strada, D = CFG.difficolta, LC = citta.LC, MAT = citta.materiali;
  const V0 = D.velocitaIniziale, VA = D.velocitaAuto, VC = V0 + VA;   // metri per unità di tau
  const LONTANO = CFG.distanzaComparsa, COMPARE_SAGOMA = 55;
  const ORIZZ = LONTANO / V0 + 1.2;                                  // quanto avanti si pianifica (in tau)
  const W_T = (LONTANO / V0) * (VA / VC) + 0.7, W_S = (COMPARE_SAGOMA / V0) * (VA / VC) + 0.7;
  const SALTO = CFG.salto.durata + 0.35;          // due salti di fila: almeno questi secondi tra le due file
  // Modello prudente del giocatore (in secondi): tempo per decidere, tempo per spostarsi di una corsia
  // (gesto + cambio corsia), e quanto ogni ostacolo "occupa" la strada mentre passa accanto alla bici
  const REAZIONE = 0.25, UNA_CORSIA = CFG.durataCambioCorsia + 0.14, LUNGO_BICI = 1.75;
  // LA MANATA (src/strada/manata.js): D = il CORPO del demone, in piedi in una corsia (pieno: non si salta);
  // M = la sua MANO gigante nella corsia accanto, bassa e profonda: si salta come una transenna (fette sottili lungo
  // tutta la sua profondità: si urta anche atterrandoci sopra).
  const MANO = { prof: 1.9, fette: 5, larghezza: LC - 0.12, corpo: 1.15, profCorpo: 1.3 };
  const OCC = { L: 0, A: (5.0 + LUNGO_BICI) / VC, T: (0.15 + LUNGO_BICI) / V0, S: (0.55 + LUNGO_BICI) / V0, M: (MANO.prof + LUNGO_BICI) / V0,
    D: (MANO.prof + LUNGO_BICI) / V0 };   // in tau
  const percorribile = function (x) { return x === 'L' || x === 'T' || x === 'M'; };
  const daSaltare = function (x) { return x === 'T' || x === 'M'; };
  const DIETRO = 32;   // oltre questi metri alle spalle le cose escono di scena (nello specchietto sono già nella nebbia)
  const transenne = opz.transenne, branco = opz.branco, ragazze = opz.ragazze;
  // il fantasma della ragazza: in piedi (si evita) al posto delle sagome; a terra (si salta) al posto di una
  // transenna in una parte delle file con transenne. Mai due ragazze a meno di RAGAZZA.pausa secondi l'una dall'altra.
  const RAGAZZA = CFG.ragazza || { salto: 0, pausa: 1e9 };
  const NIENTE = { imposta: function () {}, svanisci: function () {}, ferma: function () {} };   // voce quando l'audio è spento
  let xAscolto = 0, tempoOra = 0, ultimoHello = -1e9, metriOra = 0, tauOraM = 0;
  const HELLO = { probabilita: 0.5, pausa: 14 };   // non tutte le ragazze in piedi parlano; tra due "hello" almeno 14 s
  const rnd = PZ.ps1.casuale(31);
  const CL = CFG.clacson || { ogni: [6, 9], da: 70, dopo: 18 };
  // DA 50 FRAMMENTI (fase 9): più ostacoli. k sale da 0 (50 frammenti) a 1 (pieno); file più vicine, più auto doppie,
  // più transenne. Il generatore controlla comunque ogni fila (sempre superabile).
  const P50 = D.dopo50 || null;
  function k50() { if (!P50) return 0; const x = Math.max(0, Math.min(1, ((PZ.raccolta ? PZ.raccolta.livello() : 0) - P50.da) / (P50.pieno - P50.da))); return x * x * (3 - 2 * x); }
  const mix = function (a, b, k) { return a + (b - a) * k; };

  // ---------- Le auto (create una volta sola) ----------
  const texFari = (function () {
    const c = document.createElement('canvas'); c.width = 64; c.height = 16;
    const g = c.getContext('2d');
    [16, 48].forEach(function (cx) {
      const gr = g.createRadialGradient(cx, 8, 0, cx, 8, 9);
      gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.3, 'rgba(255,240,200,0.75)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
      g.fillStyle = gr; g.fillRect(cx - 10, 0, 20, 16);
    });
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const texFascio = (function () {   // luce dei fari sull'asfalto, davanti all'auto
    const c = document.createElement('canvas'); c.width = 16; c.height = 32;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 32, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 32);
    const gx = g.createLinearGradient(0, 0, 16, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.25, 'rgba(0,0,0,0)'); gx.addColorStop(0.75, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 16, 32);
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const geoFari = new THREE.PlaneGeometry(1.9, 0.62);
  const geoFascio = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const matFascio = new THREE.MeshBasicMaterial({ map: texFascio, color: 0xfff0d0, transparent: true, opacity: 0.45, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const elenco = ['utilitaria', 'utilitaria', 'utilitaria', 'berlina', 'berlina', 'berlina', 'berlina', 'station', 'station', 'station',
    'furgone', 'furgone', 'taxi', 'utilitaria', 'berlina', 'station'];
  // le luci delle auto hanno un materiale tutto loro: nel blackout si spengono i lampioni, non i fari
  const MAT_AUTO = Object.assign({}, MAT, { luci: MAT.luci.clone() });
  const auto = elenco.map(function (tipo) {
    const C = new PZ.Costruttore();
    const colore = PZ.auto.COLORI[Math.floor(rnd() * PZ.auto.COLORI.length)];
    const Dm = PZ.auto.costruisci(C, tipo, colore, 0, 0, 0, true);
    const g = C.crea(MAT_AUTO);
    // bagliore dei fari: si vede da lontano, anche nella foschia (per questo la sua trasparenza è calcolata a mano)
    const fari = new THREE.Mesh(geoFari, new THREE.MeshBasicMaterial({ map: texFari, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
    fari.position.set(0, 0.62, Dm.L / 2 + 0.06); fari.scale.x = Dm.W / 1.6;
    g.add(fari);
    const fascio = new THREE.Mesh(geoFascio, matFascio);
    fascio.scale.set(Dm.W + 0.6, 1, 6.5); fascio.position.set(0, 0.012, Dm.L / 2 + 3.25);
    g.add(fascio);
    g.visible = false;
    scena.add(g);
    return { gruppo: g, fari: fari, tipo: tipo, L: Dm.L, W: Dm.W, attiva: false, x: 0, z: 0, tau: 0, sfalsa: 0, corsia: 0, urtata: false, sbanda: 0, verso: 1, xBase: 0 };
  });
  const attive = [];
  // macchie nere sotto le sagome che sbarrano la strada (le distinguono dalle apparizioni, che non toccano terra)
  const geoMacchia = new THREE.CircleGeometry(0.85, 10).rotateX(-Math.PI / 2);
  const matMacchia = new THREE.MeshBasicMaterial({ color: 0x050307, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const macchie = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(geoMacchia, matMacchia); m.scale.set(1, 1, 0.6); m.visible = false; scena.add(m); macchie.push(m); }
  const statiche = [];   // transenne e sagome in scena: { tipo: 'T'|'S', x, z, tau, corsia, colpita, idx | sagoma, macchia }

  // ---------- Pianificazione delle file ----------
  const righe = [];
  // R: corsie in cui il giocatore può trovarsi quando passa l'ultima fila; Rs: lì c'è arrivato saltando
  const st = { tauUltima: 0, file: 0, prossimaPausa: 10, prec: ['L', 'L', 'L'], R: [true, true, true], Rs: [false, false, false], occ: 0,
    conteggio: { A: 0, T: 0, S: 0, file: 0, vuote: 0 } };
  function reset(tauOra) {
    attive.forEach(function (a) { a.attiva = false; a.gruppo.visible = false; if (a.clacson) { a.clacson.ferma(0.2); a.clacson = null; } a.suona = false; });
    attive.length = 0;
    statiche.forEach(libera);
    statiche.length = 0;
    righe.length = 0;
    st.tauUltima = (tauOra || 0) + 4.0 - 1.6;           // (avvio rapido) la prima fila arriva dopo circa 3 secondi di strada libera
    st.file = 0; st.prossimaPausa = 9 + Math.floor(rnd() * 5); st.prec = ['L', 'L', 'L'];
    st.R = [true, true, true]; st.Rs = [false, false, false]; st.occ = 0; st.ultima = null; st.ultimaRagazza = 0; ultimoHello = -1e9;
    st.conteggio = { A: 0, T: 0, S: 0, file: 0, vuote: 0, M: 0 };
    st.manataRichiesta = false; st.dopoManata = false; st.calda = null; st.prossimaCalda = 0; st.guida = null;
    st.prossimoClacson = CL.ogni[0] + Math.floor(rnd() * (CL.ogni[1] - CL.ogni[0] + 1));
  }
  function libera(o) {
    if (o.voce) { o.voce.ferma(); o.voce = null; }
    if (o.mano) return;                                      // la mano non ha oggetti suoi (la disegna manata.js)
    if (o.tipo === 'T' && !o.ragazza) transenne.libera(o.idx);
    else {
      const f = o.ragazza || o.sagoma;
      f.nascondi(); (o.pool || branco).rilascia(f); if (o.macchia) o.macchia.visible = false;
    }
  }
  // tutte le combinazioni di un certo tipo, con un peso (più alto = più probabile)
  function perm(lettere) {      // tutte le disposizioni distinte di 3 lettere
    const out = [], usate = {};
    [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].forEach(function (o) {
      const c = [lettere[o[0]], lettere[o[1]], lettere[o[2]]], k = c.join('');
      if (!usate[k]) { usate[k] = 1; out.push(c); }
    });
    return out;
  }
  function candidati(tipo, p) {
    const lista = [];
    const add = function (lettere, peso) { perm(lettere).forEach(function (c) { lista.push([c, peso]); }); };
    if (tipo === 'auto') {
      const doppia = rnd() < Math.min(0.95, mix(D.doppieIniziali, D.doppieFinali, p) + (P50 ? P50.doppie : 0) * k50());
      if (doppia) add(['A', 'A', 'L'], 1);
      add(['A', 'L', 'L'], doppia ? 0.05 : 1);
    } else if (tipo === 'transenna') {
      add(['T', 'L', 'L'], 3); add(['T', 'T', 'T'], 2);
      if (p > 0.2) add(['T', 'T', 'L'], 1.5);
      if (p > 0.35) { add(['A', 'T', 'L'], 2 * p); add(['A', 'T', 'T'], 1.5 * p); }
    } else {
      add(['S', 'L', 'L'], 3);
      if (p > 0.4) add(['S', 'S', 'L'], 1);
      if (p > 0.5) add(['S', 'A', 'L'], 1.5);
      if (p > 0.6) add(['S', 'T', 'L'], 1);
    }
    return lista;
  }
  function valida(c, tau, tauOra, gap) {
    if (!c.some(percorribile)) return false;                                                    // 1
    const anticipo = tau - tauOra;
    if ((c.indexOf('T') >= 0 || c.indexOf('M') >= 0 || c.indexOf('D') >= 0) && anticipo < LONTANO / V0 + 0.2) return false;   // 4
    if (c.indexOf('S') >= 0 && anticipo < COMPARE_SAGOMA / V0 + 0.2) return false;
    for (let l = 0; l < 3; l++) {                                                               // 3
      if (c[l] !== 'T' && c[l] !== 'S' && c[l] !== 'M' && c[l] !== 'D') continue;
      const W = c[l] === 'S' ? W_S : W_T;
      for (let i = 0; i < righe.length; i++) { const r = righe[i]; if (r.corsie[l] === 'A' && tau - r.tau > 0 && tau - r.tau < W) return false; }
    }
    if (!raggiungibili(c, gap, F_pianifica)) return false;                                      // 2
    return true;
  }
  // quante corsie si fanno in tempo a cambiare tra la fila precedente e una nuova fila c, a "gap" secondi di distanza
  function capacita(c, gap, F) {
    let occ = 0; c.forEach(function (x) { occ = Math.max(occ, OCC[x]); });
    const libero = gap - (st.occ + occ) / (2 * F) - REAZIONE;
    return libero >= 2 * UNA_CORSIA + 0.12 ? 2 : libero >= UNA_CORSIA ? 1 : 0;
  }
  // (fase 6) un giocatore molto veloce (reagisce subito e cambia corsia al limite) può arrivare in corsie che il modello
  // prudente non considera: per sapere DOVE PUÒ TROVARSI si usa questo modello veloce, per sapere se DA LÌ si passa
  // si usa quello prudente. Così nessuno resta intrappolato, nemmeno chi è più bravo del previsto.
  const CAMBIO_VELOCE = CFG.durataCambioCorsia + 0.02;
  function capacitaVeloce(c, gap, F) {
    let occ = 0; c.forEach(function (x) { occ = Math.max(occ, OCC[x]); });
    const libero = gap - 0.8 * (st.occ + occ) / (2 * F) - 0.08;
    return libero >= 2 * CAMBIO_VELOCE + 0.04 ? 2 : libero >= CAMBIO_VELOCE ? 1 : 0;
  }
  // regola 2: da ogni corsia possibile per la fila prima si raggiunge una corsia percorribile della nuova fila
  function raggiungibili(c, gap, F, fuori) {
    const k = capacita(c, gap, F), kv = Math.max(k, capacitaVeloce(c, gap, F)), nuovo = [false, false, false], salto = [false, false, false];
    for (let l0 = 0; l0 < 3; l0++) {
      if (!st.R[l0]) continue;
      let ok = false;
      for (let l = 0; l < 3; l++) {
        if (!percorribile(c[l])) continue;
        const d = Math.abs(l - l0);
        if (d <= kv) { nuovo[l] = true; if (daSaltare(c[l])) salto[l] = true; }        // può trovarsi lì
        if (d > k) continue;
        if (daSaltare(c[l]) && st.Rs[l0] && gap < SALTO) continue;     // non fa in tempo a riatterrare
        ok = true;                                                      // da l0 c'è una via sicura
      }
      if (!ok) return false;
    }
    if (fuori) { fuori.R = nuovo; fuori.Rs = salto; fuori.k = k; }
    return true;
  }
  let F_pianifica = 1;
  // (fase 6) pesi delle file possibili: più spesso quelle che chiudono la corsia rimasta libera nella fila prima (bisogna
  // spostarsi: cambio di corsia e poi salto, o viceversa) e quelle con un ostacolo nella corsia "calda" del momento
  function pesa(lista, p) {
    const CA = D.calda, calda = st.calda && st.file < st.calda.fino ? st.calda.l : -1, cambia = D.cambia || 0;
    return lista.map(function (x) {
      const c = x[0]; let w = x[1];
      if (calda >= 0 && c[calda] !== 'L') w *= 1 + (CA.peso - 1) * p;
      let chiude = 0; for (let l = 0; l < 3; l++) if (st.prec[l] === 'L' && c[l] !== 'L') chiude++;
      if (chiude) w *= 1 + cambia * p * chiude;
      return [c, w];
    });
  }
  function scegli(lista) {
    let tot = 0; lista.forEach(function (x) { tot += x[1]; });
    let u = rnd() * tot;
    for (let i = 0; i < lista.length; i++) { u -= lista[i][1]; if (u <= 0) return lista[i][0]; }
    return lista[lista.length - 1][0];
  }
  function aggiungiRiga(tauOra, F, p, tempo) {
    const a = D.intervalloIniziale, b = D.intervalloFinale;
    const min = mix(a[0], b[0], p), max = mix(a[1], b[1], p);
    const k5 = k50();
    let gap = (min + rnd() * (max - min)) * (1 - (P50 ? P50.file : 0) * k5), pausa = false;
    if (PZ.difficolta.frenesia && D.frenesia) gap /= 1 + D.frenesia.ostacoli * PZ.difficolta.frenesia();   // (fase 57)
    if (PZ.difficolta.piuStoria) gap /= 1 + PZ.difficolta.piuStoria('ostacoli');                          // (fase 64)
    // pause (un po' di strada libera ogni tanto): con la difficoltà più rare e più corte
    const PA = D.pause || { ogni: [[9, 14], [9, 14]], durata: [2.4, 2.4] };
    if (st.file >= st.prossimaPausa) {
      gap += mix(PA.durata[0], PA.durata[1], p); pausa = true;
      const o0 = mix(PA.ogni[0][0], PA.ogni[1][0], p), o1 = mix(PA.ogni[0][1], PA.ogni[1][1], p);
      st.prossimaPausa = st.file + Math.round(o0 + rnd() * (o1 - o0));
    }
    // la manata del demone: la fila con la mano ha un po' di spazio prima e dopo (mai addosso ad altri ostacoli)
    const conManata = st.manataRichiesta && !pausa;
    if (conManata || st.dopoManata) gap += 0.45;
    st.dopoManata = false;
    // una corsia "calda" per qualche fila: lì gli ostacoli capitano più spesso
    const CA = D.calda;
    if (CA && p >= CA.da && st.file >= (st.prossimaCalda || 0)) {
      st.calda = { l: Math.floor(rnd() * 3), fino: st.file + CA.file[0] + Math.floor(rnd() * (CA.file[1] - CA.file[0] + 1)) };
      st.prossimaCalda = st.calda.fino + CA.ogni + Math.floor(rnd() * 5);
    }
    const tau = st.tauUltima + gap * F * 1.05;
    F_pianifica = F * 1.05;
    const tempoArrivo = tempo + (tau - tauOra) / F;
    const pt = tempoArrivo >= D.transenne.da ? Math.min(0.75, mix(D.transenne.iniziale, D.transenne.finale, p) + (P50 ? P50.transenne : 0) * k5) : 0;
    // la ragazza come ostacolo: solo dopo RAGAZZA.daMetri metri di corsa (la fila arriva a metriOra + strada fino a lei)
    const metriArrivo = metriOra + (tau - tauOraM) * V0;
    const ragazzaOk = tempoArrivo - st.ultimaRagazza >= RAGAZZA.pausa && metriArrivo >= (RAGAZZA.daMetri || 0);
    const ps = tempoArrivo >= D.sagome.da && (ragazzaOk || !ragazze) ? mix(D.sagome.iniziale, D.sagome.finale, p) : 0;   // (le sagome sono ragazze)
    const u = rnd();
    const tipi = u < pt ? ['transenna', 'auto'] : u < pt + ps ? ['sagoma', 'auto'] : ['auto'];
    let scelta = null, manata = null;
    // MANATA (richiesta dalla corsa dopo 60 frammenti): il corpo del demone in una corsia (D), la mano nella corsia
    // accanto (M). La terza corsia di solito è libera; a volte (soloSalto) è chiusa da un'auto o da una ragazza in
    // piedi: allora si passa solo saltando la mano. Corpo e lato della mano cambiano a caso (nessuna corsia "sicura"
    // fissa). Si accetta solo se il generatore la trova superabile da qualunque corsia possibile (regole 1-4) e se arriva
    // abbastanza tardi da lasciare il tempo di vederla arrivare; altrimenti si riprova con la fila dopo.
    if (conManata && tempoArrivo - tempo > 3.2) {
      const prove = [];
      [0, 1, 2].forEach(function (c) { [c - 1, c + 1].forEach(function (h) { if (h >= 0 && h <= 2) prove.push([c, h, 3 - c - h]); }); });
      for (let i = prove.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = prove[i]; prove[i] = prove[j]; prove[j] = t; }
      const solo = rnd() < ((st.manataOpz && st.manataOpz.soloSalto) || 0);
      const terze = solo ? (rnd() < 0.65 ? ['A', 'S', 'L'] : ['S', 'A', 'L']) : ['L'];
      for (let k = 0; k < terze.length && !scelta; k++) for (let i = 0; i < prove.length && !scelta; i++) {
        const c = ['L', 'L', 'L'], q = prove[i]; c[q[0]] = 'D'; c[q[1]] = 'M'; c[q[2]] = terze[k];
        if (valida(c, tau, tauOra, gap)) { scelta = c; manata = { corpo: q[0], mano: q[1], soloSalto: terze[k] !== 'L' }; }
      }
      if (scelta) { st.manataRichiesta = false; st.dopoManata = true; st.conteggio.manate = (st.conteggio.manate || 0) + 1; if (manata.soloSalto) st.conteggio.soloSalto = (st.conteggio.soloSalto || 0) + 1; }
    }
    // AVVIO GUIDATO (prima corsa del giocatore): le prime file sono decise apposta, per far provare subito i comandi
    // (un'auto nella tua corsia: cambia corsia; poi transenne su più corsie possibile: salta). Ognuna solo se il
    // generatore la trova superabile, altrimenti si riprova con la fila dopo.
    if (!scelta && st.guida && st.guida.length) {
      // ogni passo della guida è un elenco di file possibili, dalla preferita: la prima superabile viene usata
      const prove = [].concat(st.guida[0]);
      for (let i = 0; i < prove.length && !scelta; i++) { const c = prove[i].split(''); if (valida(c, tau, tauOra, gap)) { scelta = c; st.guida.shift(); } }
    }
    for (let i = 0; i < tipi.length && !scelta; i++) {
      const ok = pesa(candidati(tipi[i], p).filter(function (x) { return valida(x[0], tau, tauOra, gap); }), p);
      if (ok.length) scelta = scegli(ok);
    }
    if (!scelta) { scelta = ['L', 'L', 'L']; st.conteggio.vuote++; }
    const esito = {};
    raggiungibili(scelta, gap, F_pianifica, esito);
    if (esito.R) { st.R = esito.R; st.Rs = esito.Rs; }
    let occ = 0; scelta.forEach(function (x) { occ = Math.max(occ, OCC[x]); }); st.occ = occ;
    const riga = { tau: tau, corsie: scelta, gap: gap, pausa: pausa, fatteA: false, fatteT: false, fatteS: false, k: esito.k, R: st.R.slice(), ragazzaSalto: false, manata: manata };
    if (manata && opz.suManata) opz.suManata(riga);
    if (ragazze) {
      if (scelta.indexOf('S') >= 0) st.ultimaRagazza = tempoArrivo;
      else if (scelta.indexOf('T') >= 0 && ragazzaOk && rnd() < RAGAZZA.salto) { riga.ragazzaSalto = true; st.ultimaRagazza = tempoArrivo; }
    }
    righe.push(riga);
    if (opz.suRiga) opz.suRiga(riga, st.ultima, autoInCorsia);   // i frammenti d'ambra si appoggiano alla fila appena decisa
    st.ultima = riga;
    scelta.forEach(function (x) { if (x !== 'L') st.conteggio[x]++; });
    st.conteggio.file++;
    st.prec = scelta; st.tauUltima = tau; st.file++;
  }
  // c'è un'auto (in arrivo o già in strada) nella corsia l con la fila tra i tempi da e a? Le auto vengono incontro,
  // quindi passano sopra tutto ciò che sta fermo più avanti nella loro corsia (vale anche per i frammenti d'ambra)
  function autoInCorsia(l, da, a) {
    for (let i = 0; i < righe.length; i++) { const r = righe[i]; if (r.corsie[l] === 'A' && r.tau > da && r.tau < a) return true; }
    for (let i = 0; i < attive.length; i++) { const m = attive[i]; if (m.corsia === l && m.tau > da && m.tau < a) return true; }
    return false;
  }
  function pianifica(tauOra, F, p, tempo) {
    let n = 0;
    while (st.tauUltima < tauOra + ORIZZ && n++ < 40) aggiungiRiga(tauOra, F, p, tempo);
  }

  // ---------- Comparsa degli oggetti quando le file si avvicinano ----------
  function compari(r, tau) {
    const dS = V0 * (r.tau - tau), dA = VC * (r.tau - tau);
    if (!r.fatteT && dS <= LONTANO) {
      r.fatteT = true;
      let seduta = !!ragazze && r.ragazzaSalto;      // al massimo una ragazza a terra per fila
      r.corsie.forEach(function (x, l) {
        if (x === 'D') {                                   // il corpo del demone: pieno, al centro della mano
          const o = { tipo: 'S', demone: true, mano: r.manata, idx: -1, x: (l - 1) * LC, z: -dS - MANO.prof / 2, tau: r.tau + MANO.prof / 2 / V0, corsia: l, colpita: false,
            larghezza: MANO.corpo, mezzaProf: MANO.profCorpo / 2 };
          o.fette = [o]; statiche.push(o);
          return;
        }
        if (x === 'M') {                                   // la mano del demone: fette sottili lungo la sua profondità
          const fette = [];
          for (let k = 0; k < MANO.fette; k++) {
            const off = MANO.prof * k / (MANO.fette - 1);
            const o = { tipo: 'T', mano: r.manata, idx: -1, x: (l - 1) * LC, z: -dS - off, zp: -dS - off, tau: r.tau + off / V0, corsia: l, colpita: false, fette: fette, prima: k === 0 };
            fette.push(o); statiche.push(o);
          }
          return;
        }
        if (x !== 'T') return;
        if (seduta) {
          const g = ragazze.prendiUna(PZ.POSE_SALTO, rnd);
          if (g) {
            seduta = false;
            const o = { tipo: 'T', idx: -1, ragazza: g, pool: ragazze, x: (l - 1) * LC + (rnd() - 0.5) * 0.12, z: -dS, zp: -dS, tau: r.tau, corsia: l, colpita: false, macchia: null };
            g.gruppo.position.set(o.x, 0, o.z); g.gruppo.rotation.y = (rnd() - 0.5) * 0.5; g.appari(0.5);
            statiche.push(o);
            return;
          }
        }
        const idx = transenne.prendi(); if (idx < 0) return;
        const o = { tipo: 'T', idx: idx, x: (l - 1) * LC, z: -dS, zp: -dS, tau: r.tau, corsia: l, colpita: false };
        transenne.posa(idx, o.x, o.z); statiche.push(o);
      });
    }
    if (!r.fatteS && dS <= COMPARE_SAGOMA) {
      r.fatteS = true;
      r.corsie.forEach(function (x, l) {
        if (x !== 'S') return;
        let pool = ragazze, s = ragazze ? ragazze.prendiUna(PZ.POSE_PIEDI, rnd) : null;     // la ragazza in piedi
        if (!s) { pool = branco; s = branco.prendi(); }                         // (se sono tutte in strada: una sagoma)
        if (!s) return;
        const o = { tipo: 'S', sagoma: s, pool: pool, x: (l - 1) * LC + (rnd() - 0.5) * 0.16, z: -dS, tau: r.tau, corsia: l, colpita: false, macchia: null };
        s.gruppo.position.set(o.x, 0, o.z); s.gruppo.rotation.y = (rnd() - 0.5) * 0.4; s.appari(0.45);
        for (let i = 0; i < macchie.length; i++) if (!macchie[i].visible) { o.macchia = macchie[i]; o.macchia.visible = true; break; }
        statiche.push(o);
      });
    }
    if (!r.fatteA && dA <= LONTANO) {
      r.fatteA = true;
      r.corsie.forEach(function (x, l) {
        if (x !== 'A') return;
        const libere = auto.filter(function (a) { return !a.attiva; }); if (!libere.length) return;
        const a = libere[Math.floor(rnd() * libere.length)];
        a.attiva = true; a.urtata = false; a.sbanda = 0; a.ribalto = null; a.corsia = l; a.tau = r.tau; a.sfalsa = -rnd() * 2.4;
        a.xBase = (l - 1) * LC + (rnd() - 0.5) * 0.14; a.x = a.xBase;
        a.z = -VC * (r.tau - tau) + a.sfalsa;
        a.gruppo.position.set(a.x, 0, a.z); a.gruppo.rotation.set(0, 0, 0); a.gruppo.visible = true;
        a.fari.material.opacity = 0;
        // CLACSON: una macchina ogni 6-9 (a caso) suona mentre viene incontro
        if (a.clacson) { a.clacson.ferma(0.2); a.clacson = null; }
        if (--st.prossimoClacson <= 0) { st.prossimoClacson = CL.ogni[0] + Math.floor(rnd() * (CL.ogni[1] - CL.ogni[0] + 1)); a.suona = true; } else a.suona = false;
        attive.push(a);
      });
    }
    return r.fatteA && r.fatteT && r.fatteS;
  }

  // ---------- Aggiornamento ----------
  // tau: tempo di gioco attuale; F: quanto scorre il tempo di gioco rispetto a quello vero (velocità);
  // p: difficoltà da 0 a 1; tempo: secondi di corsa; genera: false = nessuna nuova fila (intro)
  function aggiorna(dt, tau, F, p, tempo, genera, intensita) {
    tempoOra = tempo;
    if (genera) pianifica(tau, F, p, tempo);
    for (let i = righe.length - 1; i >= 0; i--) if (compari(righe[i], tau)) righe.splice(i, 1);
    // (fase 38) a tempo di musica, come i frammenti: le auto si gonfiano sul colpo e saltellano (giù su ogni colpo,
    // in alto a metà battito). Solo l'aspetto: gli urti restano quelli di sempre
    const col = PZ.audio.colonna, suona = col && col.attiva(), bt = suona ? Math.max(0, col.colpo()) : 0;
    const nb = suona && col.battiti ? col.battiti() : -1, salto = nb >= 0 ? 0.22 * Math.abs(Math.sin(Math.PI * nb)) : 0;
    const gonfia = 1 + 0.12 * bt;
    for (let i = attive.length - 1; i >= 0; i--) {
      const a = attive[i];
      a.z = -VC * (a.tau - tau) + a.sfalsa;
      if (a.sbanda > 0) {                                  // dopo l'urto l'auto scarta di lato e sbanda un poco
        a.sbanda = Math.max(0, a.sbanda - dt * 1.6);
        const k = 1 - a.sbanda;
        a.x = a.xBase + a.verso * 0.6 * Math.sin(Math.min(1, k * 1.4) * Math.PI / 2);
        a.gruppo.rotation.y = a.verso * 0.22 * Math.sin(k * Math.PI);
      }
      // (fase 19) in Furia l'auto viene sbalzata in alto, fa una capriola in avanti sopra la testa del player e
      // ricade dietro di lui a testa in giù
      let lato = 0;
      if (a.ribalto !== null && a.ribalto < 1) {
        a.ribalto = Math.min(1, a.ribalto + dt / 1.1);
        const k = a.ribalto, th = k * Math.PI, h = a.altezza || 1.4;
        a.gruppo.rotation.x = -th;
        a.gruppo.rotation.z = a.verso * 0.35 * Math.sin(th);
        a.x = a.xBase + (a.xBici - a.xBase) * Math.sin(Math.min(1, k * 2) * Math.PI / 2);
        lato = h * 0.5 * (1 - Math.cos(th)) + 3.4 * Math.sin(th);
      }
      const balla = a.ribalto === null;
      a.gruppo.position.set(a.x, lato + (balla ? salto : 0), a.z);
      if (balla) a.gruppo.scale.set(gonfia, gonfia * (1 + 0.04 * bt), gonfia); else a.gruppo.scale.set(1, 1, 1);
      a.fari.material.opacity = Math.max(0, Math.min(1, (LONTANO + 2 + a.z) / 26));   // si accendono uscendo dalla foschia
      if (a.suona) clacson(a);
      if (a.z - a.L / 2 > DIETRO) { a.attiva = false; a.gruppo.visible = false; if (a.clacson) { a.clacson.ferma(0.2); a.clacson = null; } attive.splice(i, 1); }
    }
    for (let i = statiche.length - 1; i >= 0; i--) {
      const o = statiche[i];
      o.zp = o.z;                                          // dov'era nel fotogramma prima
      o.z = -V0 * (o.tau - tau);
      if (o.mano) { /* la mano: la disegna manata.js */ }
      else if (o.tipo === 'T' && !o.ragazza) transenne.sposta(o.idx, o.x, o.z);
      else if (o.ragazza) {
        o.ragazza.gruppo.position.z = o.z;
        o.ragazza.aggiorna(dt, intensita);
        voce(o, o.ragazza);
      } else {
        o.sagoma.gruppo.position.z = o.z;
        if (o.pool === ragazze) voce(o, o.sagoma);
        if (o.macchia) o.macchia.position.set(o.x, 0.012, o.z);
        o.sagoma.aggiorna(dt, intensita);
        if (o.colpita && !o.sagoma.visibile) { if (o.macchia) o.macchia.visible = false; o.macchia = null; }
      }
      if (o.z > DIETRO) { libera(o); statiche.splice(i, 1); }
    }
    transenne.aggiorna(dt);
    disegnaSegni();
  }

  // ---------- La voce della ragazza ----------
  // A terra piange (il pianto cresce mentre ti avvicini); in piedi ti dice "hello" quando sei a una trentina di metri.
  // Dopo che l'hai superata (o colpita) la voce svanisce, con l'eco che resta un attimo nell'aria.
  function voce(o, f) {
    if (!PZ.audio.voce) return;
    const d = -o.z;                                       // metri davanti al ragazzo (negativo: già superata)
    if (!o.voce) {
      if (o.colpita || d > (f.salto ? 44 : 30) || d < 3) return;
      if (!f.salto && (tempoOra - ultimoHello < HELLO.pausa || rnd() >= HELLO.probabilita)) { o.voce = NIENTE; return; }   // questa resta zitta
      if (!f.salto) ultimoHello = tempoOra;
      o.voce = PZ.audio.voce(f.salto ? 'pianto' : 'hello', f.posa) || NIENTE;
    }
    if (o.voceVia) return;
    if (d < -0.5 || o.colpita) { o.voceVia = true; o.voce.svanisci(o.colpita ? 0.35 : 1.6); return; }
    o.voce.imposta(Math.pow(Math.max(0, 1 - d / 46), 1.5), Math.max(-1, Math.min(1, (o.x - xAscolto) / 3)));
  }
  // il clacson di un'auto: entra in dissolvenza da lontano (da CL.da metri), è al massimo quando ti passa accanto, poi
  // sfuma in CL.dopo metri; si sposta a destra o a sinistra con l'auto, e il tono scende quando è passata (Doppler)
  function clacson(a) {
    if (!PZ.audio.clacsonVicino) return;
    const d = -a.z;                                       // metri davanti al ragazzo (negativo: già passata)
    if (!a.clacson) { if (d > CL.da || d < 0 || a.urtata) return; a.clacson = PZ.audio.clacsonVicino() || null; if (!a.clacson) { a.suona = false; return; } }
    const liscia = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const v = d >= 0 ? liscia(1 - d / CL.da) : 1 - liscia(-d / CL.dopo);
    a.clacson.imposta(v * (a.urtata ? 0.6 : 1), Math.max(-1, Math.min(1, (a.x - xAscolto) / 2.5)), d >= 0 ? 1.03 : 0.94);
    if (d < -CL.dopo) { a.clacson.ferma(0.2); a.clacson = null; a.suona = false; }
  }
  // (avviso aperto: la corsa è ferma) i clacson tacciono; al prossimo fotogramma di corsa riprendono da dove erano
  function pausaSuoni() { attive.forEach(function (a) { if (a.clacson) a.clacson.imposta(0, 0, 1); }); }
  function silenzia() {
    attive.forEach(function (a) { if (a.clacson) { a.clacson.ferma(0.4); a.clacson = null; } a.suona = false; }); statiche.forEach(function (o) { if (o.voce && !o.voceVia) { o.voceVia = true; o.voce.svanisci(0.4); } }); }
  function ascolta(x) { xAscolto = x; }
  function strada(metri, tau) { metriOra = metri; tauOraM = tau; }
  // blackout (0..1): le luci dei fari sull'asfalto spiccano di più
  function buio(b) { matFascio.opacity = 0.45 + 0.4 * b; livBuio = b; }
  // (fase 59) BLACKOUT: sotto ogni ostacolo (auto, transenne, ragazze, mani del demone) una macchia di luce ambra
  // tenue sull'asfalto, senza nebbia, che si accende col buio: si vede in che corsia è e quanto è lungo, mentre il
  // resto della città resta spento. Una sola chiamata di disegno.
  let livBuio = 0;
  const N_SEGNI = 40, colSegno = new THREE.Color();
  const segni = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: PZ.ps1.alone(255, 190, 90, 3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }), N_SEGNI);
  segni.frustumCulled = false; segni.count = 0; segni.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scena.add(segni);
  const Mseg = new THREE.Matrix4();
  function disegnaSegni() {
    if (livBuio < 0.01) { segni.count = 0; return; }
    let n = 0;
    const metti = function (x, z, larga, lunga, forte) {
      if (n >= N_SEGNI || z > 6 || z < -LONTANO) return;
      const k = livBuio * forte * Math.max(0, Math.min(1, (z + LONTANO) / 30)) * Math.max(0, Math.min(1, (6 - z) / 4));
      Mseg.makeScale(larga, 1, lunga); Mseg.setPosition(x, 0.02, z);
      segni.setMatrixAt(n, Mseg); segni.setColorAt(n, colSegno.setRGB(0.8 * k, 0.58 * k, 0.25 * k)); n++;
    };
    attive.forEach(function (a) { if (a.ribalto === null) metti(a.x, a.z, 2.1, (a.L || 4.4) + 1.6, 1); });
    statiche.forEach(function (o) {
      if (o.colpita) return;
      if (o.mano) return;   // (fase 64) sotto la mano niente macchia: è tornata come prima
      if (o.mano && o.tipo === 'T') { if (o.prima) metti(o.x, o.z - MANO.prof / 2, MANO.larghezza + 0.5, MANO.prof + 1.4, 1.2); }   // la mano: una sola macchia
      else metti(o.x, o.z, o.tipo === 'T' ? 2.0 : 1.6, 1.5, 0.9);
    });
    segni.count = n; segni.instanceMatrix.needsUpdate = true; if (segni.instanceColor) segni.instanceColor.needsUpdate = true;
  }

  // ---------- Collisioni ----------
  // xBici: posizione laterale; mezzaL, mezzaP: metà larghezza e metà lunghezza della bici;
  // quota(z, zPrima): altezza minima della bici sopra una transenna passata da zPrima a z in questo fotogramma
  function controlla(xBici, mezzaL, mezzaP, quota) {
    for (let i = 0; i < attive.length; i++) {
      const a = attive[i];
      if (a.urtata || Math.abs(a.z) > a.L / 2 + mezzaP + 0.5) continue;
      if (Math.abs(a.x - xBici) < a.W / 2 - 0.08 + mezzaL && Math.abs(a.z) < a.L / 2 - 0.15 + mezzaP) return { tipo: 'auto', ogg: a };
    }
    for (let i = 0; i < statiche.length; i++) {
      const o = statiche[i];
      if (o.colpita) continue;
      if (o.tipo === 'T') {
        const zMin = Math.min(o.z, o.zp), zMax = Math.max(o.z, o.zp);
        const largaT = o.mano ? MANO.larghezza : o.ragazza ? o.ragazza.larghezza : transenne.LARGHEZZA;
        if (zMax < -(mezzaP + 0.12) || zMin > mezzaP + 0.12 || Math.abs(o.x - xBici) > largaT / 2 + mezzaL - 0.06) continue;
        if (quota(o.z, o.zp) >= transenne.ALTEZZA - 0.02) continue;      // la bici è abbastanza in alto: passa sopra
        return { tipo: o.mano ? 'manata' : 'transenna', ogg: o };
      }
      if (o.demone) {                                      // il corpo del demone (la manata): pieno, di qualunque altezza
        if (Math.abs(o.z) > mezzaP + o.mezzaProf || Math.abs(o.x - xBici) > o.larghezza / 2 + mezzaL - 0.05) continue;
        return { tipo: 'manata', ogg: o };
      }
      if (Math.abs(o.z) > mezzaP + 0.22 || Math.abs(o.x - xBici) > o.sagoma.larghezza / 2 + mezzaL - 0.05) continue;
      return { tipo: 'sagoma', ogg: o };
    }
    return null;
  }
  // vel: velocità della bici (serve alla transenna abbattuta, che vola via davanti a lei)
  function urta(h, xBici, vel, ribalta) {
    const o = h.ogg;
    if (h.tipo === 'auto') {
      o.urtata = true; o.sbanda = ribalta ? 0 : 1;
      if (ribalta) {                                      // (fase 19) Furia: l'auto vola sopra il player
        o.ribalto = 0; o.xBase = o.x; o.xBici = xBici;
        if (!o.altezza) { const sc = new THREE.Box3().setFromObject(o.gruppo); o.altezza = Math.max(0.8, sc.max.y - sc.min.y); }
      }
      o.verso = o.x >= xBici ? 1 : -1;
      if (Math.abs(o.x - xBici) < 0.05) o.verso = o.corsia === 0 ? -1 : 1;
    } else if (h.tipo === 'manata') {                     // la mano: tutta la mano in quella corsia è "presa"
      o.fette.forEach(function (f) { f.colpita = true; });
    } else if (h.tipo === 'transenna') {
      o.colpita = true;
      // vola via dal lato opposto alla bici; se la bici è centrata: verso il marciapiede, o a caso al centro
      let verso = o.x - xBici > 0.12 ? 1 : o.x - xBici < -0.12 ? -1 : (o.corsia === 0 ? -1 : o.corsia === 2 ? 1 : (rnd() < 0.5 ? -1 : 1));
      if (o.ragazza) o.ragazza.svanisci(0.25); else transenne.abbatti(o.idx, verso, vel);
    }
    else { o.colpita = true; o.sagoma.svanisci(0.22); }
  }
  // tempo di gioco (tau) in cui arriva il prossimo ostacolo: serve per decidere quando guardare indietro
  // (con "corsia" guarda solo quella corsia)
  function prossimoArrivo(tau, corsia) {
    let m = Infinity; const tutte = corsia === undefined;
    righe.forEach(function (r) { if (r.tau > tau && (tutte ? r.corsie.some(function (x) { return x !== 'L'; }) : r.corsie[corsia] !== 'L') && r.tau < m) m = r.tau; });
    attive.forEach(function (a) { if (!a.urtata && (tutte || a.corsia === corsia) && a.tau > tau - 0.2 && a.tau < m) m = a.tau; });
    statiche.forEach(function (o) { if (!o.colpita && (tutte || o.corsia === corsia) && o.tau > tau - 0.1 && o.tau < m) m = o.tau; });
    return m;
  }
  // la prossima transenna nella corsia indicata (per far lampeggiare il pulsante SALTA al momento giusto)
  function transennaDavanti(corsia) {
    let best = null;
    statiche.forEach(function (o) { if (o.tipo === 'T' && !o.colpita && o.corsia === corsia && o.z < 0 && (!best || o.z > best.z)) best = o; });
    return best;
  }

  reset(0);
  function guida(lista) { st.guida = (lista || []).slice(); }
  function richiediManata(opz) { st.manataRichiesta = true; st.manataOpz = opz || {}; }
  return { pausaSuoni: pausaSuoni, guida: guida, richiediManata: richiediManata, MANO: MANO, aggiorna: aggiorna, reset: reset, controlla: controlla, urta: urta, attive: attive, auto: auto, statiche: statiche, righe: righe,
    stato: st, prossimoArrivo: prossimoArrivo, transennaDavanti: transennaDavanti, V0: V0, VC: VC, ORIZZ_METRI: (ORIZZ + 1) * V0, pianifica: pianifica, valida: valida,
    silenzia: silenzia, ascolta: ascolta, buio: buio, strada: strada };
};
