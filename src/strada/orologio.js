// L'OROLOGIO DALINIANO: un raro oggetto speciale. Un orologio molle (quadrante color crema, cornice d'oro) che cola
// come se si stesse sciogliendo, sospeso a mezz'aria in una corsia; gira piano su sé stesso e ondeggia, con un alone
// freddo azzurrino (così non si confonde con i frammenti d'ambra, arancioni).
//
// RARITÀ (numeri in config.js, strada.orologio). A ogni partita si decide una volta sola:
//  - con probabilità "probabilita" ci sarà un primo orologio, in un momento a caso tra primo[0] e primo[1] secondi
//    di corsa (quindi a volte non c'è proprio);
//  - se c'è il primo, con probabilità "secondo" ce ne sarà un altro, almeno distanza[0] secondi dopo.
// Mai più di 2 generati per partita (raccolti o no), mai due in strada insieme; se uno non viene preso non ne nasce
// subito un altro. Si azzera a ogni nuova partita (RIPROVA, RIAVVIA).
//
// DOVE. Come i frammenti: nasce insieme a una fila di ostacoli, in una corsia libera prima e dopo, raggiungibile e
// dove nessuna auto gli passerà sopra; a metà tra le due file, all'altezza della bici (si prende passandoci).
//
// EFFETTO (lo applica corsa.js): per "durata" secondi VERI (4) il mondo rallenta fino a "lento" (15%): strada, auto,
// ostacoli, frammenti, eventi e difficoltà; il demone resta indietro. Il ragazzo no: pedala, cambia corsia e salta alla
// velocità normale. Prima un attimo di gelo (quasi fermo), poi il tempo "sciolto", nell'ultimo secondo si ricompone.
// La città gialla e nera che si scioglie è in sciogli.js (guidata da stato.forza e stato.colpo).
PZ.creaOrologio = function (scena, V0) {
  const CFG = PZ.CONFIG.strada, O = CFG.orologio, LC = CFG.larghezzaCorsia, LONTANO = CFG.distanzaComparsa;
  const VA = CFG.difficolta.velocitaAuto, VC = V0 + VA, PRIMA = (LONTANO / V0) * (VA / VC) + 0.7;
  const rnd = PZ.ps1.casuale(7 + Math.floor(Math.random() * 1e9));

  // ---------- Il modello: quadrante (una griglia ritagliata a cerchio) e cornice, deformati come se colassero ----------
  const texQ = (function () {
    const N = 64, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    g.clearRect(0, 0, N, N);
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill();          // bordo d'oro
    g.fillStyle = '#efe4c2'; g.beginPath(); g.arc(32, 32, 27, 0, 7); g.fill();          // quadrante crema
    g.fillStyle = '#d8caa0'; g.beginPath(); g.arc(34, 35, 24, 0, 7); g.fill();          // ombra morbida
    g.fillStyle = '#efe4c2'; g.beginPath(); g.arc(31, 31, 22, 0, 7); g.fill();
    g.fillStyle = '#2a2018';
    for (let i = 0; i < 12; i++) {                                                         // tacche delle ore
      const a = i / 12 * Math.PI * 2, r = i % 3 ? 22 : 21;
      g.fillRect(Math.round(32 + Math.sin(a) * r) - 1, Math.round(32 - Math.cos(a) * r) - 1, i % 3 ? 2 : 3, i % 3 ? 2 : 3);
    }
    g.strokeStyle = '#2a2018'; g.lineCap = 'round';
    g.lineWidth = 3; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + 9, 32 + 7); g.stroke();      // ore
    g.lineWidth = 2; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 - 4, 32 - 17); g.stroke();     // minuti
    g.fillStyle = '#8a1a14'; g.fillRect(31, 31, 3, 3);
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const R = 0.5;
  const geoQ = new THREE.PlaneGeometry(2 * R, 2 * R, 10, 10);
  const geoC = new THREE.TorusGeometry(R * 0.97, 0.045, 5, 18);
  const baseQ = geoQ.attributes.position.array.slice(), baseC = geoC.attributes.position.array.slice();
  // la colatura: la metà destra si piega all'indietro e in giù come appoggiata su un ramo invisibile; il bordo in basso
  // si allunga e gocciola. m: quanto è molle (respira piano)
  function cola(src, dst, m) {
    for (let i = 0; i < src.length; i += 3) {
      const x = src[i], y = src[i + 1], z = src[i + 2];
      const dx = Math.max(0, x + 0.05), giu = Math.max(0, -y - 0.12);
      // (la metà destra ricade come stoffa bagnata, l'angolo in basso a destra cola in una goccia lunga)
      let nx = x - 0.45 * dx * dx, ny = y - (1.55 + 0.25 * m) * dx * dx - 1.4 * giu * giu * (1 + 2.4 * Math.max(0, x)), nz = z - 0.95 * dx * dx;
      nz += 0.06 * Math.sin(y * 4 + m * 3) * (0.3 + dx);
      dst[i] = nx; dst[i + 1] = ny; dst[i + 2] = nz;
    }
  }
  const gruppo = new THREE.Group(); gruppo.visible = false; scena.add(gruppo);
  const GRANDE = 1.35;                         // si vede bene anche arrivando veloci
  const corpo = new THREE.Group(); gruppo.add(corpo);
  const quadrante = new THREE.Mesh(geoQ, new THREE.MeshLambertMaterial({ map: texQ, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x3a3424 }));
  const cornice = new THREE.Mesh(geoC, new THREE.MeshPhongMaterial({ color: 0xc9a24a, emissive: 0x3a2a08, specular: 0xfff0b0, shininess: 50, flatShading: true }));
  const corona = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), cornice.material);
  corona.position.set(0, R + 0.06, 0);
  quadrante.visible = cornice.visible = corona.visible = false; corpo.add(quadrante, cornice, corona);
  // (fase 51) L'IMMAGINE: l'orologio molle in pixel art (il disegno di Genos), su un piano che gira come la O Ave
  // Maria. Il vecchio modello 3D resta nel codice ma non si vede. L'immagine è dentro il file (data URL), così si
  // carica anche aprendo il gioco dal file sul computer
  const imgOr = new Image(), texImg = new THREE.Texture(imgOr);
  texImg.magFilter = texImg.minFilter = THREE.NearestFilter; texImg.generateMipmaps = false;
  imgOr.onload = function () { texImg.needsUpdate = true; };
  imgOr.src = 'data:image/png;base64,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';
  const immagine = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: texImg, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  immagine.position.y = 0.05;
  corpo.add(immagine);
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.ps1.alone(150, 215, 255, 5), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: 0.55 }));
  alone.material.map = PZ.ps1.alone(255, 210, 60, 5);        // (fase 51) alone dorato, come l'orologio
  alone.scale.set(2.2, 2.2, 1); gruppo.add(alone);
  function deforma(m) {
    cola(baseQ, geoQ.attributes.position.array, m); geoQ.attributes.position.needsUpdate = true; geoQ.computeVertexNormals();
    cola(baseC, geoC.attributes.position.array, m); geoC.attributes.position.needsUpdate = true; geoC.computeVertexNormals();
  }

  // ---------- Stato ----------
  const Y = 1.05;                              // altezza dal suolo (si prende passando, senza saltare)
  const st = { generati: 0, raccolti: 0, piani: [], inStrada: null, presa: -1, t: 0, effetto: null, lento: 1, ultimoGenerato: -1e9 };
  // decide all'inizio della partita se e quando ci saranno orologi
  function reset() {
    st.generati = 0; st.raccolti = 0; st.inStrada = null; st.presa = -1; st.effetto = null; st.lento = 1; st.forza = 0; st.colpo = 0; st.ultimoGenerato = -1e9; st.piani = []; st.tentativi = 0; st.mancati = 0; st.attesa = -1;
    // (fase 51) una sola volta per partita: da una soglia a caso tra frammenti[0] e frammenti[1] in poi
    const F = O.frammenti || [60, 70];
    if (O.attivo !== false) st.piani.push(F[0] + Math.floor(rnd() * (F[1] - F[0] + 1)));
    gruppo.visible = false;
  }
  // per ogni nuova fila (come i frammenti). tempo = secondi di corsa in cui la fila arriverà al ragazzo
  function suRiga(r, p, autoInCorsia, tempo, frammenti) {
    // (fase 52) la prima volta dalla soglia di frammenti; se lo manchi, una seconda volta 7-8 s dopo; poi mai più
    const secondo = st.generati === 1 && st.mancati === 1 && st.attesa === 0;
    if (!p || st.inStrada || st.effetto || PZ.raccolta.completata) return;
    if (!secondo && (st.generati >= 1 || !st.piani.length || PZ.raccolta.livello() < st.piani[0])) return;
    const da = p.tau + 0.4, a = r.tau - 0.4;
    const libera = function (x) { return x === 'L'; };
    let tau = (da + a) / 2;
    const vicini = function (l) { return frammenti && frammenti.slot.some(function (s) { return s.attivo && s.corsia === l && Math.abs(s.tau - tau) < 0.5; }); };
    let corsie = a - da < 0.3 ? [] : [0, 1, 2].filter(function (l) {
      if (!libera(p.corsie[l]) || !libera(r.corsie[l]) || !p.R[l]) return false;
      if (autoInCorsia && autoInCorsia(l, da - PRIMA, a + 0.3)) return false;
      // non sopra una fila di frammenti (fase 51: dopo qualche fila senza posto, i frammenti lì accanto si tolgono)
      return st.tentativi >= 3 || !vicini(l);
    });
    // (fase 51) se tra le due file non c'è posto: proprio sulla fila, in una corsia libera e raggiungibile dove
    // nessuna auto arriva prima (come i frammenti "rischio"): così compare presto, anche quando le strade sono piene
    if (!corsie.length) {
      tau = r.tau;
      corsie = [0, 1, 2].filter(function (l) { return libera(r.corsie[l]) && r.R[l] && !(autoInCorsia && autoInCorsia(l, tau - PRIMA, tau + 0.3)) && (st.tentativi >= 3 || !vicini(l)); });
    }
    if (!corsie.length) { st.tentativi = (st.tentativi || 0) + 1; return; }
    const l = corsie[Math.floor(rnd() * corsie.length)];
    if (frammenti) frammenti.slot.forEach(function (s) { if (s.attivo && s.presa < 0 && s.corsia === l && Math.abs(s.tau - tau) < 0.5) s.attivo = false; });
    st.inStrada = { tau: tau, corsia: l, x: (l - 1) * LC };
    st.piani.shift(); st.generati++; st.presa = -1; st.attesa = -1;
    gruppo.visible = true;
  }
  // dt: secondi del mondo (rallentati anche loro); tau: tempo di gioco degli ostacoli
  function aggiorna(dt, tau, dtVero) {
    st.t += dt;
    const o = st.inStrada;
    if (st.attesa > 0) st.attesa = Math.max(0, st.attesa - (dtVero || dt));       // (fase 52) conto alla rovescia per la seconda volta
    if (!o) { gruppo.visible = false; return; }
    const z = -V0 * (o.tau - tau);
    if (st.presa < 0 && z > 8) {                 // non preso: se ne va (la prima volta torna dopo 7-8 secondi)
      st.inStrada = null; gruppo.visible = false; st.mancati++;
      if (st.mancati === 1 && st.raccolti === 0) { st.attesa = 7 + rnd(); st.tentativi = 3; }   // la seconda volta trova posto prima
      return;
    }
    let s = Math.max(0, Math.min(1, (z + LONTANO) / 14)), y = Y + 0.16 * Math.sin(st.t * 2.4);    // (fase 51) galleggia come la O Ave Maria
    if (st.presa >= 0) {                     // preso: si allunga verso l'alto, si torce e sparisce in un lampo freddo
      st.presa += dtVero || dt;           // (fase 51) col tempo vero: il mondo intanto è congelato
      const u = Math.min(1, st.presa / 0.45);
      y += 0.8 * u; s = (1 - u) * (1 + 0.6 * Math.sin(Math.PI * u));
      corpo.scale.set(s * (1 - 0.5 * u), s * (1 + 1.2 * u), s);
      alone.material.opacity = 0.55 + 0.45 * (1 - u);
      alone.scale.setScalar(2.2 + 3 * u);
      if (u >= 1) { st.inStrada = null; gruppo.visible = false; return; }
    } else { corpo.scale.setScalar(s * GRANDE); alone.scale.set(2.6 * s, 2.6 * s, 1); alone.material.opacity = 0.42 + 0.13 * Math.sin(st.t * 3); }
    gruppo.position.set(o.x, y, z);
    // (fase 51) gira su sé stesso a velocità costante, come la O Ave Maria (preso: vortica)
    corpo.rotation.set(0, st.t * 1.9 + (st.presa >= 0 ? 12 * st.presa : 0), 0);
  }
  // come per i frammenti: passandoci attraverso (a terra o in volo basso). Vero se è stato preso adesso
  function raccogli(xBici, h, tau, tauPrima) {
    const o = st.inStrada;
    if (!o || st.presa >= 0) return false;
    const z = -V0 * (o.tau - tau), zp = -V0 * (o.tau - tauPrima);
    if (Math.max(z, zp) < -0.75 || Math.min(z, zp) > 0.75) return false;
    if (Math.abs(o.x - xBici) > 0.7 || h > 1.6) return false;
    st.presa = 0; st.raccolti++;
    return true;
  }
  // ---------- L'effetto: un moltiplicatore del tempo del mondo, guidato dal tempo VERO ----------
  function attiva() { st.effetto = { t: 0 }; }
  // tre fasi (tempo VERO): un attimo di gelo (il mondo quasi fermo), poi giù fino a "lento" e lì resta; nell'ultimo
  // secondo il tempo si ricompone piano. forza = quanto è "sciolto" il mondo da vedere (0..1), colpo = lo strappo
  // dei primi decimi di secondo (lo spazio che si piega)
  function effetto(dtVero) {
    const e = st.effetto;
    if (!e) { st.lento = 1; st.forza = 0; st.colpo = 0; return 1; }
    e.t += dtVero;
    const D = O.durata, G = O.gelo || [0, O.lento], IN = 0.25, OUT = 1.0, liscia = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    let lento;
    if (e.t < G[0]) lento = 1 - (1 - G[1]) * liscia(e.t / 0.06);                                 // gelo
    else if (e.t < G[0] + IN) lento = G[1] + (O.lento - G[1]) * liscia((e.t - G[0]) / IN);      // il mondo riparte, lentissimo
    else if (e.t < D - OUT) lento = O.lento;
    else lento = O.lento + (1 - O.lento) * liscia((e.t - (D - OUT)) / OUT);                   // si ricompone
    st.lento = lento;
    st.forza = e.t < 0.35 ? liscia(e.t / 0.35) : e.t < D - OUT ? 1 : 1 - liscia((e.t - (D - OUT)) / OUT);
    st.colpo = e.t < 0.45 ? Math.sin(Math.PI * Math.min(1, e.t / 0.45)) : 0;
    if (e.t >= D) { st.effetto = null; st.lento = 1; st.forza = 0; st.colpo = 0; }
    return st.lento;
  }
  // morte o finale: l'effetto si interrompe subito (il mondo di gioco è comunque fermo o finito); niente più orologi
  function ferma() { st.attesa = -1; st.effetto = null; st.lento = 1; st.forza = 0; st.colpo = 0; st.piani = []; if (st.inStrada && st.presa < 0) { st.inStrada = null; gruppo.visible = false; } }
  reset();
  return { suRiga: suRiga, aggiorna: aggiorna, raccogli: raccogli, attiva: attiva, effetto: effetto, ferma: ferma, reset: reset, stato: st, gruppo: gruppo,
    attivo: function () { return !!st.effetto; }, forza: function () { return st.forza || 0; }, colpo: function () { return st.colpo || 0; }, rimasto: function () { return st.effetto ? Math.max(0, 1 - st.effetto.t / O.durata) : 0; } };
};
