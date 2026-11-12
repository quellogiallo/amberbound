// SCENA INIZIALE della strada (circa 12 secondi, si può saltare).
//  A. Il portone del palazzo della ragazza si apre verso l'interno, il ragazzo esce sul marciapiede, si ferma appena
//     fuori e, voltandosi, tira il portone per la maniglia finché si chiude; poi si guarda intorno.
//  B. In fondo alla strada (dietro di lui) compare il demone. La testa del ragazzo scatta verso di lui, il corpo si
//     gira, fa un passo indietro: busto all'indietro, mani alzate, tremito.
//  C. Subito dopo corre alla bici (appoggiata sul cavalletto) girando dietro la ruota posteriore e afferra il manubrio
//     senza fermarsi; raddrizza la bici (il cavalletto si chiude), la inclina verso di sé e la scavalca: la gamba
//     destra sale in avanti, passa sopra il tubo orizzontale (davanti alla sella) e va sul pedale, mentre lui si
//     solleva sul piede sinistro; spinge subito, in piedi, e il piede sinistro va sull'altro pedale.
//  D. Parte in piedi sui pedali, scende dal marciapiede (prima la ruota davanti, poi quella dietro) e raggiunge la
//     corsia centrale piegandosi nelle curve; la telecamera gli gira intorno fino alla visuale di gioco mentre il demone
//     comincia a correre. Alla fine il controllo passa al giocatore ("SCAPPA!").
// Tutti i movimenti del ragazzo usano lo scheletro e la cinematica inversa originali e gli strumenti di animazione
// del videoclip. Tutto dipende solo dal tempo della scena (anche velocità e strada fatta sono formule esatte): la
// scena è identica a qualsiasi frequenza di fotogrammi.
PZ.creaIntro = function (ctx) {
  const A = PZ.anim, V3 = THREE.Vector3, PI = Math.PI;
  const ciclista = ctx.ciclista, bici = ciclista.bici, citta = ctx.citta, dem = ctx.demone, camera = ctx.camera, S = ctx.S;
  const Y = 0.15, INPIEDI = 0.965, CAV = 0.077, R = ciclista.raggioRuota, RAPPORTO = 2.3;
  const V0 = PZ.CONFIG.strada.difficolta.velocitaIniziale, DIST0 = PZ.CONFIG.strada.demone.distanzaIniziale;
  const BX = 5.65, PED0 = 1.25 * PI, CAVALLETTO = -0.13;
  const DEM0 = new V3(0.4, 0, 46);                 // dove compare il demone: in fondo alla strada, nella foschia
  const dirDemone = Math.atan2(DEM0.x - 6.25, DEM0.z - 2.45);
  // dove arriva correndo (bacino) e dove posa il piede sinistro, accanto alla sella: da lì sale
  const ARRIVO = { x: 5.27, z: 0.2 }, TP = new V3(5.19, Y + CAV, 0.22);

  // ---------- camminate e corsa (generatori di passi) ----------
  const tmp = new V3(), tmp2 = new V3(), tmp3 = new V3();
  const piedi = function (c, t) { const a = new V3(), b = new V3(); c.piede('sx', t, a); c.piede('dx', t, b); return { sx: a, dx: b }; };
  const T = {};
  T.porta = 1.3; T.esce = 1.9;           // il portone si apre quando lo schermo nero è già svanito; lui esce quando è quasi tutto aperto
  // si ferma appena fuori dal portone (a portata di mano della maniglia) e lo tira per chiuderlo: il portone si apre
  // verso l'interno, quindi chiudendosi non passa mai sul marciapiede dove sta lui
  // (parte dal fondo dell'androne, dal lato opposto alla cerniera: fuori dal giro dell'anta)
  const c1 = A.camminata({ da: { x: 8.5, z: 2.78 }, a: { x: 6.5, z: 2.6 }, dirDa: -PI / 2, dirA: -PI / 2, passo: 0.58, durataPasso: 0.5, larghezza: 0.1, primo: 'dx' });
  T.fuori = T.esce + c1.durata; T.chiude = T.fuori - 0.2; T.chiusa = T.chiude + 0.75; T.demone = T.chiusa + 0.3;
  // (fase 14) appena compare il demone la telecamera stringe su di lui (zoom): la scena dura un secondo in più
  const ZOOM = 1.0; T.zoomFine = T.demone + ZOOM; T.gira = T.demone + 0.3 + ZOOM;
  const c2 = A.camminata({ da: { x: 6.5, z: 2.6 }, a: { x: 6.4, z: 2.38 }, dirDa: -PI / 2, dirA: dirDemone, passo: 0.5, durataPasso: 0.36, larghezza: 0.1, primo: 'sx', piediDa: piedi(c1, c1.durata) });
  T.paura = T.gira + c2.durata;
  const c3 = A.camminata({ da: { x: 6.4, z: 2.38 }, a: { x: 6.36, z: 1.95 }, dirDa: dirDemone, dirA: dirDemone, passo: 0.4, durataPasso: 0.3, larghezza: 0.1, primo: 'dx', piediDa: piedi(c2, c2.durata) });
  T.versoBici = T.paura + 0.8;
  // corsa alla bici: si gira di scatto, gira dietro la ruota posteriore e arriva accanto alla sella (4 passi, ~1,2 s)
  const cr = A.corsetta({ punti: [{ x: 6.36, z: 1.95 }, { x: 5.85, z: 1.38 }, { x: 5.24, z: 1.02 }, ARRIVO], dirDa: dirDemone, giro: 0.36,
    passi: 4, durataPasso: 0.29, larghezza: 0.09, primo: 'dx', volo: 1.25, vFine: 0.75, piediDa: piedi(c3, c3.durata), ultimo: { x: TP.x, z: TP.z } });
  const dirArrivo = A.vicino(cr.dir(cr.durata), PI);      // vicino a PI (la corsa calcola gli angoli vicino a dirDemone)
  T.presa = T.versoBici + cr.durata;     // afferra il manubrio mentre posa l'ultimo piede
  T.sella = T.presa + 0.44;              // ha scavalcato: piede destro sul pedale, in piedi
  T.spinta = T.sella + 0.02; T.via = T.spinta + 0.3; T.fine = T.via + 3.5;
  const D = T.fine;

  // ---------- partenza: velocità e strada fatta dalla spinta (formule esatte), percorso fino al centro ----------
  const PV = 2.2, DT = T.fine - T.spinta;
  function velocita(t) { if (t <= T.spinta) return 0; const u = Math.min(1, (t - T.spinta) / DT); return V0 * (1 - Math.pow(1 - u, PV)); }
  function strada(t) {
    if (t <= T.spinta) return 0;
    const u = Math.min(1, (t - T.spinta) / DT);
    return V0 * DT * (u - (1 - Math.pow(1 - u, PV + 1)) / (PV + 1)) + V0 * Math.max(0, t - T.fine);
  }
  // posizione laterale nel tempo: dal marciapiede (x = BX) al centro della strada con una curva dolce; l'accelerazione
  // laterale resta sotto i 2,7 m/s², quindi la bici si piega al massimo di ~15° (prima a sinistra, poi a destra)
  const TX0 = T.spinta + 0.25, TX1 = T.fine - 0.05;
  function xTempo(t) { return BX * (1 - A.morbida(TX0, TX1, t)); }
  // scendendo dal marciapiede ogni ruota fa un breve salto (~0,2 s) oltre lo spigolo, come una ruota vera
  function cordolo(x) { return Y * A.morbida(4.2, 4.64, x); }
  // inclinazione della bici durante la salita: sul cavalletto pende verso il ragazzo; afferrato il manubrio la
  // raddrizza, poi la inclina verso di sé per scavalcare; spingendo sul pedale torna dritta
  const inclina = new A.Traccia(CAVALLETTO).chiave(T.presa, CAVALLETTO).chiave(T.presa + 0.17, -0.04).chiave(T.presa + 0.36, -0.2)
    .chiave(T.spinta, -0.2).chiave(T.spinta + 0.42, 0).fluida();
  // parte in piedi sui pedali, poi dopo qualche pedalata si siede (0,8 = in piedi ma col bacino un po' più basso:
  // così anche con il pedale tutto in basso la gamba ci arriva senza tendersi di colpo)
  const IN_PIEDI = 0.8;
  function inPiedi(t) { return t < T.spinta ? 0 : IN_PIEDI * (1 - A.morbida(T.via + 0.9, T.via + 1.9, t)); }
  // da coordinate della bici ferma accanto al marciapiede (inclinata di fi) al mondo, e viceversa
  function aMondo(x, y, z, fi, out) { const c = Math.cos(fi), s = Math.sin(fi); return out.set(BX - (x * c - y * s), Y + x * s + y * c, -z); }
  function aBici(p, fi, out) { const c = Math.cos(fi), s = Math.sin(fi), dx = BX - p.x, dy = p.y - Y; return out.set(dx * c + dy * s, -dx * s + dy * c, -p.z); }

  // ---------- telecamera: quattro inquadrature con stacchi netti, poi un movimento continuo ----------
  //  A (portone): da lontano, dal lato della strada.  B1 (il demone): alle spalle del ragazzo, verso il fondo della
  //  strada: in primo piano lui che si gira, in fondo il demone che compare.  B2 (paura): davanti a lui, da vicino.
  //  C (la bici): dalla strada, larga, segue il ragazzo che corre alla bici e si avvicina mentre sale in sella.
  //  D (partenza): la telecamera gira intorno al ragazzo che parte: prima davanti a lui (dietro, in fondo, il demone
  //  che comincia a correre), poi di lato e infine alle sue spalle, dove diventa la visuale di gioco.
  const v = function (x, y, z) { return new V3(x, y, z); };
  const stacco = function (tr, tA, vA, vB) { return tr.chiave(tA - 0.012, vA, true).chiave(tA, vB, true); };
  const camP = new A.Traccia(v(1.2, 2.4, 8.8), 0).chiave(T.esce, v(1.3, 2.35, 8.4)).chiave(T.fuori, v(1.7, 2.1, 7.2));
  stacco(camP, T.demone - 0.1, v(1.75, 2.08, 7.0), v(6.85, 1.95, -3.0));
  stacco(camP, T.paura - 0.05, v(6.8, 1.9, -2.3), v(6.05, 1.72, 4.2));
  stacco(camP, T.versoBici - 0.05, v(6.1, 1.7, 4.0), v(2.45, 2.05, -3.9)).chiave(T.presa, v(2.65, 1.85, -2.25))
    .chiave(T.via, v(2.6, 1.9, -1.5)).fluida();
  const camG = new A.Traccia(v(6.4, 1.5, 1.6), 0).chiave(T.esce, v(6.4, 1.5, 1.6)).chiave(T.fuori, v(6.3, 1.5, 1.6));
  stacco(camG, T.demone - 0.1, v(6.3, 1.5, 1.7), v(2.9, 1.75, 42));
  stacco(camG, T.paura - 0.05, v(2.7, 1.8, 42), v(6.25, 1.6, 2.05));
  stacco(camG, T.versoBici - 0.05, v(6.28, 1.58, 1.8), v(5.8, 1.05, 0.9)).chiave(T.presa, v(5.45, 1.0, 0.0))
    .chiave(T.via, v(5.0, 1.0, -0.5)).fluida();
  const camF = new A.Traccia(52, 0).chiave(T.fuori, 52);
  stacco(camF, T.demone - 0.1, 52, 33);
  stacco(camF, T.paura - 0.05, 28, 44);
  stacco(camF, T.versoBici - 0.05, 44, 50).chiave(T.via, 50).fluida();
  // D: giro intorno al ragazzo (angolo attorno a lui misurato da +z, distanza, altezza, apertura)
  const D0 = T.spinta, D1 = T.via + 1.15, D2 = T.fine - 0.15;
  const giro = { ang: null, dist: null, alto: null, fov: null, off0: new V3() };
  function preparaGiro(cp0, cg0, x0) {
    const dx = cp0.x - x0, dz = cp0.z, a0 = Math.atan2(dx, dz);
    giro.ang = new A.Traccia(a0, D0).chiave(D1, -175 * PI / 180).chiave(D2, -2 * PI).fluida();
    giro.dist = new A.Traccia(Math.hypot(dx, dz), D0).chiave(D1, 4.6).chiave(D2, 5.4).fluida();
    giro.alto = new A.Traccia(cp0.y, D0).chiave(D1, 1.5).chiave(D2, 3.7).fluida();
    giro.fov = new A.Traccia(camF.valore(D0), D0).chiave(D1, 46).chiave(D2, PZ.CONFIG.strada.campoVisivo).fluida();
    giro.off0.set(cg0.x - x0, cg0.y, cg0.z);
  }

  // ---------- il ragazzo ----------
  const P = ciclista.nuovaPosa();
  const lib = { sx: new V3(), dx: new V3() }, braccia = { sx: new V3(), dx: new V3() };
  // altezza del pavimento sotto un piede, vicino al portone (facciata a x = 7): androne 0,16, gradino di pietra 0,20
  // (da x = 6,455 a 7), marciapiede 0,15. Prima i piedi stavano sempre a quota marciapiede e affondavano nel gradino.
  const MURO_P = 7.0, GRADINO = 0.55;
  // r = mezza larghezza del raccordo (niente salti di colpo: il piede in aria sale o scende dolcemente sullo spigolo)
  function suolo(x, r) {
    const e1 = MURO_P - GRADINO, e2 = MURO_P;
    return Y + 0.05 * A.morbida(e1 - r, e1 + r, x) - 0.04 * A.morbida(e2 - r, e2 + r, x);
  }
  // (fase 33) PASSI sull'asfalto: un passo quando un piede torna a terra (l'altezza del piede, da 0 a 1, scende a 0)
  const alzato = { sx: 0, dx: 0 };
  function appoggio(lato, h, corsa) {
    // alzato = quanto si è alzato il piede in questo passo (il massimo); quando torna a terra suona e si azzera
    if (h <= 0.001) { if (alzato[lato] > 0.2 && PZ.audio.passoStrada) PZ.audio.passoStrada(corsa, lato === 'sx' ? -1 : 1); alzato[lato] = 0; }
    else alzato[lato] = Math.max(alzato[lato], h);
  }
  function passi(c, tau) {           // bacino e piedi dal generatore di passi, sul marciapiede (ctx.passi del videoclip)
    const d = c.percorsa(tau);
    const hs = c.piede('sx', tau, P.piedi.sx), hd = c.piede('dx', tau, P.piedi.dx);
    appoggio('sx', hs, false); appoggio('dx', hd, false);
    // il piede poggia su quello che ha sotto: pavimento dell'androne, gradino del portone o marciapiede
    const gs = suolo(P.piedi.sx.x, 0.07), gd = suolo(P.piedi.dx.x, 0.07);
    P.piedi.sx.y = gs + CAV + 0.06 * hs; P.piedi.dx.y = gd + CAV + 0.06 * hd;
    P.punte.sx = -0.2 * hs; P.punte.dx = -0.2 * hd;
    P.dir = P.dirPiedi = c.dir(tau);
    const x = c.da.x + c.ux * d, z = c.da.z + c.uz * d;
    const passo = A.morbida(0, c.durataPasso, tau) * (1 - A.morbida(c.durata - c.durataPasso, c.durata, tau));
    P.pos.set(x, suolo(x, 0.25) + INPIEDI - 0.025 * passo * (1 - Math.max(hs, hd)), z);
    P.pos.y = A.quotaBacino(P.pos, P.piedi, P.dir);     // (fase 47) gambe quasi tese, il bacino sale e scende a ogni passo
    const a = A.avanti(P.dir, tmp);
    return Math.max(-1, Math.min(1, ((P.piedi.dx.x - P.piedi.sx.x) * a.x + (P.piedi.dx.z - P.piedi.sx.z) * a.z) / 0.35)) * passo;
  }
  function passiCorsa(tau) {         // di corsa: ginocchia più piegate, piedi più alti, su e giù a ogni passo
    cr.bacino(tau, P.pos);
    const hs = cr.piede('sx', tau, P.piedi.sx), hd = cr.piede('dx', tau, P.piedi.dx);
    appoggio('sx', hs, true); appoggio('dx', hd, true);
    P.piedi.sx.y = suolo(P.piedi.sx.x, 0.07) + CAV + 0.14 * hs; P.piedi.dx.y = suolo(P.piedi.dx.x, 0.07) + CAV + 0.14 * hd;
    P.punte.sx = -0.4 * hs; P.punte.dx = -0.4 * hd;
    P.dir = P.dirPiedi = cr.dir(tau);
    P.pos.y = Y + INPIEDI - 0.06 * A.morbida(0, 0.25, tau) + 0.018 * cr.molleggio(tau);
    const a = A.avanti(P.dir, tmp);
    return Math.max(-1, Math.min(1, ((P.piedi.dx.x - P.piedi.sx.x) * a.x + (P.piedi.dx.z - P.piedi.sx.z) * a.z) / 0.45));
  }
  function maniLibere(osc) {         // mani lungo i fianchi con l'oscillazione del passo (ctx.maniLibere del videoclip)
    const vf = A.avanti(P.dir, tmp2), vl = A.sinistra(P.dir, tmp3);
    const piega = P.bacino.x + P.busto.x, alto = 0.07 + 0.43 * Math.cos(piega), avanti = 0.43 * Math.sin(piega);
    [['sx', 1], ['dx', -1]].forEach(function (c) {
      const lato = c[1], o = lib[c[0]];
      const fuori = Math.max(0.2, lato * (lato * 0.26 - Math.sin(P.busto.z) * 0.43));
      o.copy(P.pos).addScaledVector(vf, avanti + 0.04 + 0.11 * osc * lato).addScaledVector(vl, lato * fuori);
      o.y += alto - 0.52;
    });
  }
  function maniCorsa(osc) {          // di corsa: gomiti piegati, le braccia vanno avanti e indietro opposte alle gambe
    const vf = A.avanti(P.dir, tmp2), vl = A.sinistra(P.dir, tmp3);
    [['sx', 1], ['dx', -1]].forEach(function (c) {
      const lato = c[1], o = braccia[c[0]], a = osc * lato;
      o.copy(P.pos).addScaledVector(vf, 0.08 + 0.2 * a).addScaledVector(vl, lato * 0.22);
      o.y += 0.04 + 0.12 * Math.max(0, a);
    });
  }
  // ginocchio destro mentre scavalca (direzione nel riferimento del bacino: x a sinistra, y in su, z avanti): finché il
  // piede è sotto l'anca il ginocchio va in avanti, come sempre; quando il piede sale davanti (sopra il tubo
  // orizzontale) va in su; sul pedale torna quello di sempre. Così resta sempre davanti alla gamba e non si gira mai.
  const POLO = new V3(-0.12, 0.35, 1).normalize(), POLO_ALTO = new V3(0, 1, 0.3).normalize();

  const qP = new THREE.Quaternion(), eP = new THREE.Euler(), poli = { dx: new V3() };
  const poloGamba = new A.Traccia(POLO, 0).chiave(T.presa + 0.15, POLO).chiave(T.presa + 0.235, POLO_ALTO)
    .chiave(T.presa + 0.3, POLO_ALTO).chiave(T.sella, POLO);
  function mettiPolo(t) {
    if (t <= T.presa + 0.15 || t >= T.sella) return;
    qP.setFromEuler(eP.set(P.bacino.x, P.dir, P.bacino.z, 'YXZ'));   // come il bacino del ragazzo
    poloGamba.valore(t, poli.dx).normalize().applyQuaternion(qP);
    P.poli = poli;
  }
  // salita in sella: tracce costruite nell'istante in cui afferra il manubrio (servono i punti della bici)
  // bacino (coordinate della bici): accanto alla bici mentre la gamba destra sale, poi in alto sopra il tubo orizzontale
  // (davanti alla sella) e infine in piedi sui pedali, come quando pedala in piedi
  const P2 = new V3(0.26, 1.04, -0.2), P2b = new V3(0.08, 1.15, -0.14), P3 = new V3(0, 1.05 + 0.08 * IN_PIEDI, -0.24 + 0.14 * IN_PIEDI);
  let salita = null;
  function preparaSalita(fi) {
    // bacino (nel mondo): continua la corsa con la stessa velocità, si abbassa un attimo per darsi la spinta, sale
    // sulla gamba sinistra e passa sopra la sella
    const E = cr.bacino(cr.durata, new V3()); E.y = Y + INPIEDI - 0.06;
    const fine = cr.suCurva(cr.lunghezza, {});
    const v0 = new V3(fine.tx, 0, fine.tz).multiplyScalar(cr.velocita(cr.durata));
    const P1 = E.clone().add(v(0.03, -0.03, 0)).addScaledVector(v0, 0.08);
    const W2 = aMondo(P2.x, P2.y, P2.z, inclina.valore(T.presa + 0.24), new V3());
    const W2b = aMondo(P2b.x, P2b.y, P2b.z, inclina.valore(T.presa + 0.34), new V3());
    const W3 = aMondo(P3.x, P3.y, P3.z, inclina.valore(T.sella), new V3());
    // piede destro (in coordinate della bici): dal marciapiede dietro, su, sopra la ruota posteriore e giù sul pedale
    const RF = new V3(); cr.piede('dx', cr.durata, RF); RF.y = Y + CAV;
    const F0 = aBici(RF, inclina.valore(T.presa + 0.03), new V3());
    const ped = aBici(bici.punto('pedaleDx', new V3()).add(bici.direzione(0, 0.077, -0.11, tmp)), fi, new V3());
    salita = {
      RF: RF,
      bacino: new A.Percorso([[T.presa, E, v0], [T.presa + 0.12, P1], [T.presa + 0.24, W2], [T.presa + 0.34, W2b], [T.sella, W3]]),
      piede: new A.Traccia(F0, T.presa).gesto(T.presa + 0.03, T.sella, [F0, v(0.28, 0.58, -0.02), v(0.05, 1.0, 0.12), v(-0.25, 0.82, 0.05), ped]),
      dir: new A.Traccia(dirArrivo, T.presa).chiave(T.presa + 0.25, PI - 0.12).chiave(T.sella, PI).fluida(),   // verso la bici
      bx: new A.Traccia(0.12, T.presa).chiave(T.presa + 0.26, 0.3).chiave(T.sella, FINE_SALITA.bx).fluida(),
      cx: new A.Traccia(0.34, T.presa).chiave(T.presa + 0.25, 0.52).chiave(T.sella, FINE_SALITA.cx).fluida(),   // sul manubrio
      cy: new A.Traccia(0, T.presa).chiave(T.presa + 0.25, 0.1).chiave(T.sella, FINE_SALITA.cy).fluida(),       // spalle dritte
      bz: new A.Traccia(0, T.presa).chiave(T.sella, FINE_SALITA.bz).fluida(),
      tx: new A.Traccia(0.13, T.presa).chiave(T.presa + 0.2, 0.13).chiave(T.sella, FINE_SALITA.tx).fluida()     // guarda avanti
    };
  }
  // la salita finisce nella posa in piedi sui pedali (da lì la prende ciclista.inSella, con un passaggio morbido)
  const FINE_SALITA = { bx: 0.46, cx: 0.55, cy: -0.03, bz: -0.2, tx: -0.24 };
  // piede sinistro: fermo dove si è posato, poi sulla punta; quando salta in sella si stacca e va sul pedale sinistro
  // (s = strada fatta: quando la bici parte il marciapiede scorre all'indietro)
  const anca = new V3();
  function piedeSinistro(t, s) {
    const punta = A.morbida(T.presa + 0.12, T.presa + 0.24, t), wL = A.morbida(T.presa + 0.24, T.presa + 0.58, t);
    P.piedi.sx.copy(TP); P.piedi.sx.y += 0.055 * punta; P.piedi.sx.z += s;
    const p0 = -0.35 * punta;
    if (wL > 0) {
      bici.punto('pedaleSx', tmp3).add(bici.direzione(0, 0.077, -0.11, tmp2));
      P.piedi.sx.lerp(tmp3, wL); P.piedi.sx.y += 0.12 * Math.sin(PI * wL);
    }
    P.punte.sx = A.mix(p0, 0, wL);           // sul pedale il piede è in piano (la bici è ancora sul marciapiede)
    // la gamba sinistra si distende al massimo fin quasi tesa: se il bacino sale di più (il salto) il piede si stacca
    // da terra un attimo prima, invece di restare indietro e far scattare il ginocchio
    qP.setFromEuler(eP.set(P.bacino.x, P.dir, P.bacino.z, 'YXZ'));
    anca.set(0.1, -0.05, 0).applyQuaternion(qP).add(P.pos);
    const d = P.piedi.sx.distanceTo(anca), d0 = 0.78, dm = 0.85;   // oltre d0 si avvicina dolcemente al limite dm
    if (d > d0) P.piedi.sx.sub(anca).multiplyScalar((d0 + (dm - d0) * Math.tanh((d - d0) / (dm - d0))) / d).add(anca);
    return wL;
  }
  // cavalletto: un tubetto scuro dalla pedaliera a terra; raddrizzando la bici si chiude lungo il fodero
  const cavalletto = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1), new THREE.MeshLambertMaterial({ color: 0x1a1c22 }));
  ctx.scena.add(cavalletto);
  const PIEDE_CAV = new V3(5.37, Y, 0.05), dCav = new V3(), dChiuso = new V3();
  function metticavalletto(vis, k) {
    cavalletto.visible = vis;
    if (!vis) return;
    const a = bici.locale(0.04, 0.29, -0.1, tmp), l = 0.35;
    dCav.subVectors(PIEDE_CAV, a).normalize();
    if (k > 0) { bici.locale(0.06, 0.31, -0.42, dChiuso).sub(a).normalize(); dCav.lerp(dChiuso, k).normalize(); }
    tmp2.copy(a).addScaledVector(dCav, l);
    cavalletto.position.copy(a).add(tmp2).multiplyScalar(0.5); cavalletto.scale.z = l; cavalletto.lookAt(tmp2);
  }

  // ---------- stato della scena ----------
  let t = 0, fatto = false, scorso = 0;
  const suoni = {};
  function suona(nome, f) { if (!suoni[nome]) { suoni[nome] = true; if (PZ.audio[f]) PZ.audio[f](); } }
  const camGioco = { pos: new V3(), guarda: new V3() };
  const cp = new V3(), cg = new V3(), cpG = new V3(), cgG = new V3();

  function avvia() {
    t = 0; fatto = false; scorso = 0; salita = null; giro.ang = null; alzato.sx = alzato.dx = 0;
    Object.keys(suoni).forEach(function (k) { delete suoni[k]; });
    citta.sistema({ partenza: true });
    citta.porta.apri(0);
    S.ruote = 0; S.pedivella = PED0; S.vel = 0; S.x = BX;
    dem.nascondi();
    aggiorna(0);
  }
  function salta() { if (!fatto) { t = D - 0.001; aggiorna(0.001); } }

  function aggiorna(dt) {
    if (fatto) return true;
    t += dt;
    // --- portone ---
    const apertura = A.morbida(T.porta, T.porta + 0.8, t) * (1 - A.morbida(T.chiude, T.chiusa, t));
    citta.porta.apri(apertura);
    if (t > T.porta) suona('porta', 'portaApre');
    // (fase 30) la colonna sonora parte nell'istante in cui sale in sella, direttamente dal loop (4:02.290)
    // (fase 37) il kick (proprio a 4:02.290, misurato sul file) deve cadere nell'istante in cui sale in sella: la musica
    // parte prima di quanto ritarda l'uscita audio del dispositivo, senza dissolvenza, un soffio prima del colpo
    const lat = PZ.audio.latenza ? PZ.audio.latenza() : 0;
    if (t >= T.sella - lat && !suoni.musica) { suoni.musica = true; if (PZ.audio.colonna) PZ.audio.colonna.avvia(PZ.audio.colonna.loopDa() - 0.004, true); }
    if (t > T.chiusa - 0.05) suona('chiusa', 'portaChiude');

    // --- bici: ferma sul cavalletto; dalla spinta parte forte, scende dal marciapiede e va al centro della strada ---
    const s = strada(t), vel = velocita(t), ds = s - scorso;
    scorso = s; S.vel = vel;
    const x = xTempo(t), h = 0.01, xa = xTempo(t + h), xb = xTempo(t - h);
    const vx = (xa - xb) / (2 * h), ax = (xa - 2 * x + xb) / (h * h), d1 = vel > 0.05 ? vx / vel : 0;
    S.ruote += ds * Math.sqrt(1 + d1 * d1) / R;        // le ruote girano quanto la strada fatta, anche in diagonale
    S.pedivella = PED0 + S.ruote / RAPPORTO;
    citta.aggiorna(ds, camera);
    const dir = PI + Math.atan(-d1);
    // in curva si piega quanto serve a quella velocità; in piedi sui pedali la bici ondeggia a ogni pedalata
    const piega = Math.atan(ax / 9.81);
    const fi = inclina.valore(t) + piega + 0.06 * inPiedi(t) * A.morbida(T.spinta, T.spinta + 0.3, t) * Math.sin(S.pedivella);
    // scendendo dal marciapiede scende prima la ruota davanti, poi quella dietro
    const sd = Math.sin(dir), yf = cordolo(x + 0.53 * sd), yr = cordolo(x - 0.52 * sd);
    S.x = x;
    ciclista.mettiBici(x, (yf * 0.52 + yr * 0.53) / 1.05, 0, dir, Math.atan2(yf - yr, 1.05), fi, S.ruote, S.pedivella);
    metticavalletto(t < T.presa + 0.2, A.morbida(T.presa + 0.02, T.presa + 0.19, t));

    // --- ragazzo ---
    P.bacino.x = 0.04; P.bacino.z = 0; P.busto.x = 0.06; P.busto.y = 0; P.busto.z = 0; P.testa.x = 0.05; P.testa.y = 0; P.testa.z = 0;
    P.poli = null;
    if (t < T.presa) {
      // a piedi: esce, si gira verso il demone, indietreggia, corre alla bici
      let osc;
      if (t < T.esce) osc = passi(c1, 0);
      else if (t < T.gira) osc = passi(c1, t - T.esce);
      else if (t < T.paura) osc = passi(c2, t - T.gira);
      else if (t < T.versoBici) osc = passi(c3, t - T.paura);
      else osc = passiCorsa(t - T.versoBici);
      maniLibere(osc);
      const kc = A.morbida(T.versoBici - 0.1, T.versoBici + 0.25, t);      // postura di corsa: busto in avanti
      if (kc > 0) {
        maniCorsa(osc); lib.sx.lerp(braccia.sx, kc); lib.dx.lerp(braccia.dx, kc);
        P.bacino.x += 0.08 * kc; P.busto.x += 0.22 * kc; P.testa.x += 0.08 * kc;
      }
      P.mani.sx.copy(lib.sx); P.mani.dx.copy(lib.dx);
      // chiude il portone: si volta appena e, quando la maniglia gli arriva a portata, la prende con la sinistra e
      // tira fino a chiudere; poi lascia
      const presaPorta = A.morbida(T.chiude + 0.25, T.chiude + 0.5, t) * (1 - A.morbida(T.chiusa + 0.05, T.chiusa + 0.3, t));
      if (presaPorta > 0) {
        P.mani.sx.lerp(citta.porta.maniglia(tmp), presaPorta);
        P.testa.y += 0.75 * presaPorta; P.busto.y += 0.25 * presaPorta;
      }
      // si guarda intorno appena uscito
      const intorno = A.morbida(T.chiusa, T.chiusa + 0.3, t) * (1 - A.morbida(T.demone, T.gira, t));
      P.testa.y += 0.45 * intorno * Math.sin((t - T.fuori) * 2.4);
      // si accorge del demone: la testa scatta prima del corpo
      const accorge = A.morbida(T.zoomFine + 0.06, T.zoomFine + 0.24, t) * (1 - A.morbida(T.versoBici - 0.15, T.versoBici + 0.2, t));
      P.testa.y += A.vicino(dirDemone - P.dir, 0) * 0.6 * accorge;
      // paura: indietreggia col busto, scuote la testa, alza le mani, trema; poi scatta via
      const paura = A.morbida(T.paura - 0.18, T.paura + 0.12, t) * (1 - A.morbida(T.versoBici - 0.12, T.versoBici + 0.22, t));
      if (paura > 0) {
        P.busto.x -= 0.24 * paura; P.bacino.x -= 0.05 * paura; P.testa.x -= 0.14 * paura;
        P.testa.y += 0.22 * paura * Math.sin((t - T.paura) * 10) * (1 - A.morbida(T.paura, T.paura + 0.7, t));
        P.busto.z += 0.02 * paura * Math.sin(t * 37); P.testa.z += 0.025 * paura * Math.sin(t * 43);
        const vf = A.avanti(P.dir, tmp), vl = A.sinistra(P.dir, tmp2);
        [['sx', 1], ['dx', -1]].forEach(function (c) {
          tmp3.copy(P.pos).addScaledVector(vf, 0.3).addScaledVector(vl, c[1] * 0.19); tmp3.y += 0.36 + 0.015 * Math.sin(t * 31 + c[1]);
          P.mani[c[0]].lerp(tmp3, 0.85 * paura);
        });
      }
      // le mani raggiungono il manubrio durante l'ultimo passo
      const presa = A.morbida(T.presa - 0.32, T.presa - 0.02, t);
      if (presa > 0) {
        bici.punto('manopolaSx', tmp).add(bici.direzione(0, 0.045, -0.03, tmp2)); P.mani.sx.lerp(tmp, presa);
        bici.punto('manopolaDx', tmp).add(bici.direzione(0, 0.045, -0.03, tmp2)); P.mani.dx.lerp(tmp, presa);
        P.busto.x += 0.06 * presa;
      }
    } else if (t < T.spinta) {
      // sale in sella: raddrizza la bici, la inclina verso di sé e scavalca la ruota dietro con la gamba destra
      if (!salita) preparaSalita(fi);
      suona('presa', 'clic');
      salita.bacino.valore(t, P.pos);
      P.dir = salita.dir.valore(t); P.dirPiedi = dirArrivo;
      P.bacino.x = salita.bx.valore(t); P.busto.x = salita.cx.valore(t); P.busto.y = salita.cy.valore(t); P.bacino.z = salita.bz.valore(t);
      P.testa.x = salita.tx.valore(t);
      // piede destro: percorso in coordinate della bici (segue la bici che si inclina)
      salita.piede.valore(t, tmp); aMondo(tmp.x, tmp.y, tmp.z, fi, P.piedi.dx);
      const stacca = A.morbida(T.presa + 0.03, T.presa + 0.1, t);       // finché è a terra resta dov'è
      if (stacca < 1) P.piedi.dx.copy(tmp.copy(salita.RF).lerp(P.piedi.dx, stacca));
      P.punte.dx = -0.4 * A.morbida(T.presa + 0.03, T.presa + 0.1, t) * (1 - A.morbida(T.presa + 0.2, T.presa + 0.4, t));
      piedeSinistro(t, 0);
      bici.punto('manopolaSx', P.mani.sx).add(bici.direzione(0, 0.045, -0.03, tmp));
      bici.punto('manopolaDx', P.mani.dx).add(bici.direzione(0, 0.045, -0.03, tmp));
      mettiPolo(t);
    } else {
      // in sella: spinge sul pedale destro e parte in piedi sui pedali
      ciclista.inSella(P, S.pedivella, S.tTot, 0.6 * (1 - A.morbida(T.via, T.fine, t)), inPiedi(t));
      const kb = A.morbida(T.spinta, T.spinta + 0.3, t);
      if (kb < 1) {   // dalla posa sulla sella (agganciata alla bici) a quella della pedalata
        bici.locale(P3.x, P3.y, P3.z, tmp); P.pos.copy(tmp.lerp(P.pos, kb));
        P.bacino.x = A.mix(FINE_SALITA.bx, P.bacino.x, kb); P.busto.x = A.mix(FINE_SALITA.cx, P.busto.x, kb);
        P.busto.y = A.mix(FINE_SALITA.cy, P.busto.y, kb); P.busto.z *= kb; P.bacino.z = A.mix(FINE_SALITA.bz, P.bacino.z, kb);
        P.testa.x = A.mix(FINE_SALITA.tx, P.testa.x, kb); P.testa.y *= kb; P.testa.z *= kb;
        P.dirPiedi = A.mix(dirArrivo, A.vicino(P.dirPiedi, dirArrivo), kb);
      }
      if (t < T.presa + 0.58) piedeSinistro(t, s);      // il piede sinistro finisce di arrivare sul pedale
      // un'occhiata alle spalle, al demone, appena partito
      const occhiata = A.morbida(T.spinta + 0.22, T.spinta + 0.4, t) * (1 - A.morbida(T.spinta + 0.7, T.spinta + 0.95, t));
      P.testa.y += 0.85 * occhiata; P.busto.y += 0.2 * occhiata; P.testa.x -= 0.1 * occhiata;
    }
    ciclista.posa(P);
    ciclista.mostra(true);

    // --- demone: compare in fondo alla strada, avanza piano, poi corre dietro alla bici ---
    if (t >= T.demone) {
      if (!dem.visibile) { dem.mostra(); suona('demone', 'demoneAppare'); if (t < T.zoomFine) suona('stinger', 'stingerDemone'); }
      const comparsa = A.morbida(T.demone, T.demone + 0.5, t);
      dem.gruppo.scale.set(1, Math.max(0.05, comparsa), 1);
      dem.gruppo.visible = comparsa > 0.98 || Math.sin(t * 55) > -0.2;
      const zCammina = DEM0.z - 1.55 * (Math.min(t, T.sella) - T.demone);
      const kc = A.morbida(T.sella, T.fine, t);
      const zd = A.mix(zCammina, DIST0, kc), xd = A.mix(DEM0.x, 0, kc);
      dem.posiziona(xd, 0, zd, PI);
      tmp.copy(P.pos); tmp.y += 0.7;
      dem.anima(dt, kc > 0.02 ? 'corre' : 'cammina', kc > 0.02 ? 12 : 1.55, tmp, 0.4);
    }
    if (t > T.paura) suona('battito', 'battito');

    // --- telecamera: le inquadrature A, B1, B2, C; poi (D) il giro intorno al ragazzo fino alla visuale di gioco ---
    camP.valore(t, cp); camG.valore(t, cg);
    let fov = camF.valore(t);
    // (fase 14) ZOOM SUL DEMONE: appena compare, l'inquadratura alle spalle del ragazzo stringe di colpo su di lui
    // (resta lì circa un secondo, con un leggero tremolio di camera a mano), poi torna larga e il ragazzo si gira
    const kz = A.morbida(T.demone + 0.08, T.demone + 0.4, t) * (1 - A.morbida(T.zoomFine + 0.02, T.zoomFine + 0.24, t));
    if (kz > 0) {
      dem.gruppo.getWorldPosition(tmp3); tmp3.y += 2.05;
      cg.lerp(tmp3, kz);
      fov = A.mix(fov, 6.5, kz);
      const tr = 0.04 * kz; cg.x += tr * Math.sin(t * 23); cg.y += tr * 0.7 * Math.sin(t * 31 + 1);
    }
    // inquadratura C: lo sguardo segue anche il ragazzo che corre alla bici (fino all'inizio del giro)
    if (t > T.versoBici - 0.05 && t < D0) { tmp.copy(P.pos); tmp.y -= 0.05; cg.lerp(tmp, 0.45 * (1 - A.morbida(D0 - 0.45, D0, t))); }
    if (t >= D0) {
      if (!giro.ang) { camP.valore(D0, tmp); camG.valore(D0, tmp2); preparaGiro(tmp, tmp2, x); }
      const a = giro.ang.valore(t), d = giro.dist.valore(t);
      cpG.set(x + d * Math.sin(a), giro.alto.valore(t), d * Math.cos(a));
      // dove guarda: sempre il ragazzo mentre la telecamera gli gira intorno; quando è davanti a lui guarda un po' più
      // in là, verso il demone che lo insegue; solo quando è già alle sue spalle guarda la strada davanti
      const sulRagazzo = A.morbida(D0, D0 + 0.5, t);
      tmp.copy(giro.off0).lerp(tmp3.set(0, 1.05, 0), sulRagazzo);
      const verso = A.morbida(D1 - 0.6, D1 - 0.05, t) * (1 - A.morbida(D1 + 0.05, D1 + 0.5, t));
      tmp.lerp(tmp3.set(0, 1.4, 5.5), verso);
      ctx.cameraGioco(x, camGioco);
      tmp2.set(camGioco.guarda.x - x, camGioco.guarda.y, camGioco.guarda.z);
      tmp.lerp(tmp2, A.morbida(D2 - 0.75, D2, t));
      cgG.set(x + tmp.x, tmp.y, tmp.z);
      // il giro parte da fermo: nel primo mezzo secondo si fonde con l'inquadratura C, che intanto rallenta
      const kg = A.morbida(D0, D0 + 0.5, t);
      cp.lerp(cpG, kg); cg.lerp(cgG, kg); fov = A.mix(fov, giro.fov.valore(t), kg);
      // ultimi istanti: coincide esattamente con la visuale di gioco (niente scatti quando comincia la corsa)
      const kb = A.morbida(D2 - 0.5, D, t);
      if (kb > 0) { cp.lerp(camGioco.pos, kb); cg.lerp(camGioco.guarda, kb); fov = A.mix(fov, PZ.CONFIG.strada.campoVisivo, kb); }
    }
    camera.position.copy(cp); camera.lookAt(cg);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (t >= D) { fatto = true; suona('scappa', 'scappa'); }
    return fatto;
  }
  // se si passa alla corsa prima della fine (tasto R), non deve restare in strada niente della scena
  function pulisci() { metticavalletto(false); }
  return { avvia: avvia, aggiorna: aggiorna, salta: salta, pulisci: pulisci, durata: D, tempi: T, tempo: function () { return t; }, finita: function () { return fatto; } };
};
