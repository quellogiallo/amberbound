// LA MANATA DEL DEMONE. Da 60 frammenti in su il demone non si limita a inseguire: compare DAVANTI al ragazzo, in
// piedi in una corsia, e schianta nella corsia ACCANTO una mano gigantesca, nera, deformata, con lunghi artigli.
//   corpo del demone  = una corsia chiusa (non si salta: è alto più di cinque metri);
//   mano              = la corsia accanto, bassa: si SALTA come una transenna (la sua hitbox è la mano che si vede);
//   terza corsia      = di solito libera; a volte (O.soloSalto) è chiusa da un'auto o da una ragazza in piedi, e
//                       allora l'unico modo di passare è saltare la mano.
//
// CHI DECIDE COSA. La corsa chiede una manata (pianifica, qui sotto) al generatore degli ostacoli (traffico.js), che
// la mette in una fila SOLO se è superabile da qualunque corsia in cui il giocatore possa trovarsi (stesse regole
// delle transenne: o si raggiunge la corsia libera, o si salta la mano). Per il generatore il corpo è la lettera D (un
// ostacolo pieno), la mano la lettera M (una transenna profonda quanto la mano, fatta di fette sottili).
// Qui c'è solo ciò che si vede e si sente, legato al tempo che manca all'arrivo della fila:
//   2,6 s  avviso: un ringhio basso; sull'asfalto si allarga una crepa nera, dove arriverà la mano;
//   2,5 s  il demone (lo stesso modello che insegue: un secondo esemplare, quello dietro intanto sparisce) emerge
//          dall'asfalto nella sua corsia;
//   2,0 s  alza il braccio (un braccio lungo e storto che finisce nella mano gigante, ancora chiusa, in alto);
//   1,45 s lo abbatte: la mano si schianta nella corsia accanto, si apre e si allarga di colpo; gli artigli si piantano
//          nell'asfalto e per un attimo brillano; colpo sordo, crepe, schegge scure, la scena trema.
// Poi demone e mano RESTANO LÌ, fermi, finché il ragazzo non li ha superati del tutto; solo allora sprofondano.
PZ.creaManata = function (o) {
  const scena = o.scena, LC = o.LC, V0 = o.V0, CFG = PZ.CONFIG.strada.manata;
  const MANO = o.traffico.MANO;
  const rnd = PZ.ps1.casuale(6060 + Math.floor(Math.random() * 1e6));
  const liscia = function (a, b, v) { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
  const T = { avviso: 2.6, emerge: 2.5, alza: 2.0, colpo: 1.45 };
  const V3 = THREE.Vector3, SU = new V3(0, 1, 0);

  // ---------- Il demone davanti: un secondo esemplare dello stesso modello ----------
  const D = PZ.creaDemone(scena, o.occhi);
  const G = D.G;
  if (D.aura) D.aura.visible = false;            // niente alone viola dietro di lui: in questo attacco solo nero

  // ---------- Pezzi tra due punti (cilindri sfaccettati) per il Costruttore ----------
  const qq = new THREE.Quaternion(), ee = new THREE.Euler(0, 0, 0, 'YXZ'), dd = new V3();
  function osso(C, k, a, b, r0, r1, colore, lati) {
    dd.subVectors(b, a); const l = dd.length(); dd.divideScalar(l || 1);
    qq.setFromUnitVectors(SU, dd); ee.setFromQuaternion(qq, 'YXZ');
    C.geo(k, new THREE.CylinderGeometry(r1, r0, 1, lati || 5), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, ee.x, ee.y, ee.z, colore, 1, l, 1);
  }
  function punta(C, k, a, dir, lung, r, colore) {        // un artiglio: cono dalla base a verso dir
    qq.setFromUnitVectors(SU, dd.copy(dir).normalize()); ee.setFromQuaternion(qq, 'YXZ');
    C.geo(k, new THREE.ConeGeometry(r, lung, 5), a.x + dd.x * lung / 2, a.y + dd.y * lung / 2, a.z + dd.z * lung / 2, ee.x, ee.y, ee.z, colore, 1, 1, 1);
  }

  // ---------- La mano gigante ----------
  // Coordinate della mano: il polso è nell'origine, la mano si allunga verso +x (lontano dal corpo del demone), le dita
  // si aprono a ventaglio sull'asfalto lungo z. Palmo in giù, nocche alte al massimo 0,75 m (sotto la transenna: si
  // salta), artigli piantati per terra. Il lato del demone si ottiene specchiando (scala x = -1).
  const NERO = 0x07060a, NERO2 = 0x0d0a12, VENA = 0x1a1220, OSSO = 0x8a8068, PUNTA = 0xc9bf98;
  const matMano = new THREE.MeshPhongMaterial({ vertexColors: true, color: 0xffffff, specular: 0x2a2418, shininess: 22, flatShading: true });
  const matArtigli = new THREE.MeshPhongMaterial({ vertexColors: true, color: 0xffffff, specular: 0x6a6040, shininess: 40, flatShading: true, emissive: 0x000000 });
  const manoGr = (function () {
    const C = new PZ.Costruttore(), A = new V3(), B = new V3(), M = new V3(), r = PZ.ps1.casuale(919);
    const PROF = MANO.prof, Z = PROF / 2 - 0.08;
    // polso e dorso della mano (gonfio, storto), con le vene in rilievo
    osso(C, 'm', A.set(-0.25, 0.42, 0.02), B.set(0.32, 0.38, -0.04), 0.3, 0.34, NERO2, 6);
    C.sfera('m', 1, 0.62, 0.36, 0.0, NERO, 0.48, 0.3, Z * 0.66, 1);
    C.sfera('m', 1, 0.5, 0.48, -0.15, NERO2, 0.3, 0.22, 0.35, 0);                       // un bozzo innaturale sul dorso
    for (let i = 0; i < 4; i++) osso(C, 'm', A.set(0.1, 0.55, -0.15 + i * 0.1), B.set(0.85, 0.5 + 0.05 * Math.sin(i * 3), -Z * 0.55 + i * Z * 0.36), 0.035, 0.03, VENA, 4);
    // quattro dita lunghe a ventaglio: due falangi (la prima sale alle nocche, la seconda scende a terra), poi l'artiglio
    const dita = [[-0.62, 1.05], [-0.2, 1.25], [0.2, 1.18], [0.6, 0.95]];
    dita.forEach(function (d, i) {
      const ang = d[0], L = d[1] * (0.92 + r() * 0.16), dx = Math.cos(ang), dz = Math.sin(ang) * 1.25;
      const z0 = (i - 1.5) * Z * 0.34;
      A.set(0.85, 0.38, z0);
      M.set(A.x + dx * L * 0.42, 0.66 + r() * 0.08, z0 + dz * L * 0.42);                   // nocca alta
      B.set(A.x + dx * L, 0.12, z0 + dz * L);                                             // la punta tocca terra
      osso(C, 'm', A, M, 0.15, 0.12, i % 2 ? NERO : NERO2, 5);
      C.sfera('m', 0.13, M.x, M.y, M.z, NERO2, 1, 0.9, 1, 0);                             // nocca
      osso(C, 'm', M, B, 0.12, 0.07, i % 2 ? NERO2 : NERO, 5);
      punta(C, 'a', B, new V3(dx, -0.55, dz * 0.8), 0.62 + r() * 0.15, 0.075, OSSO);        // artiglio lungo, nel terreno
      punta(C, 'a', M, new V3(0.3, 0.9, 0.1), 0.16, 0.035, PUNTA);                          // spuntoni sulle nocche
    });
    // il pollice, storto all'indietro
    A.set(0.3, 0.35, -Z * 0.55); M.set(0.45, 0.55, -Z * 0.95); B.set(0.25, 0.1, -Z * 1.12);
    osso(C, 'm', A, M, 0.14, 0.11, NERO2, 5); osso(C, 'm', M, B, 0.11, 0.06, NERO, 5);
    punta(C, 'a', B, new V3(-0.3, -0.6, -0.5), 0.5, 0.07, OSSO);
    const g = C.crea({ m: matMano, a: matArtigli });
    return g;
  })();
  // (fase 59) BLACKOUT: un contorno giallo scuro attorno a mano e artigli (la stessa forma gonfiata di pochi
  // centimetri, vista solo dal lato interno, senza nebbia): nel buio si legge la sagoma e la corsia che occupa
  const matBordo = new THREE.MeshBasicMaterial({ color: 0xc89a22, side: THREE.BackSide, fog: false, transparent: true, opacity: 0, depthWrite: false });
  const bordi = [];
  manoGr.children.slice().forEach(function (m) {
    if (!m.isMesh) return;
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, somma = new Map(), chiave = [];
    for (let i = 0; i < P.length; i += 3) {
      const k = Math.round(P[i] * 400) + ',' + Math.round(P[i + 1] * 400) + ',' + Math.round(P[i + 2] * 400);
      chiave.push(k); const s = somma.get(k) || [0, 0, 0]; s[0] += N[i]; s[1] += N[i + 1]; s[2] += N[i + 2]; somma.set(k, s);
    }
    const Q = new Float32Array(P.length), SP = 0.045;
    for (let i = 0, j = 0; i < P.length; i += 3, j++) {
      const s = somma.get(chiave[j]), l = Math.hypot(s[0], s[1], s[2]) || 1;
      Q[i] = P[i] + s[0] / l * SP; Q[i + 1] = P[i + 1] + s[1] / l * SP; Q[i + 2] = P[i + 2] + s[2] / l * SP;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(Q, 3));
    const b = new THREE.Mesh(g, matBordo); b.position.copy(m.position); b.quaternion.copy(m.quaternion); b.scale.copy(m.scale);
    b.renderOrder = -1; b.visible = false; manoGr.add(b); bordi.push(b);
  });
  let livBuio = 0;
  const ANELLO_NERO = new THREE.Color(0x030202), ANELLO_GIALLO = new THREE.Color(0x9a7414);
  function buio(b) {
    livBuio = b;
    matBordo.opacity = 0.9 * b; bordi.forEach(function (x) { x.visible = b > 0.01; });
    anello.material.color.copy(ANELLO_NERO).lerp(ANELLO_GIALLO, b);
  }
  manoGr.scale.set(1.15, 1, 1);                  // un po' più lunga verso l'esterno: riempie la corsia
  const mano = new THREE.Group(); mano.add(manoGr); mano.visible = false; scena.add(mano);
  // il braccio gigante: dalla spalla del demone al polso della mano, in due pezzi con un gomito storto
  const braccio = (function () {
    const C = new PZ.Costruttore();
    C.geo('m', new THREE.CylinderGeometry(1, 1, 1, 6), 0, 0.5, 0, 0, 0, 0, NERO2, 1, 1, 1);
    C.sfera('m', 1, 0, 0.35, 0.3, NERO, 0.7, 0.18, 0.5, 0);                            // muscolo storto
    const g1 = C.crea({ m: matMano }).children[0];
    const C2 = new PZ.Costruttore();
    C2.geo('m', new THREE.CylinderGeometry(0.85, 1, 1, 6), 0, 0.5, 0, 0, 0, 0, NERO, 1, 1, 1);
    for (let i = 0; i < 3; i++) C2.geo('m', new THREE.ConeGeometry(0.25, 0.7, 4), 0.85, 0.25 + i * 0.25, 0, 0, 0, -1.2, OSSO, 1, 1, 1);   // spine
    const g2 = C2.crea({ m: matMano }).children[0];
    [g1, g2].forEach(function (m) { m.matrixAutoUpdate = true; m.visible = false; scena.add(m); });
    return [g1, g2];
  })();
  function mettiOsso(m, a, b, r) {                         // cilindro unitario (da y=0 a y=1) tra a e b, raggio r
    dd.subVectors(b, a); const l = dd.length();
    m.position.copy(a); m.quaternion.setFromUnitVectors(SU, dd.divideScalar(l || 1)); m.scale.set(r, l, r); m.visible = true;
  }

  // ---------- A terra: la crepa nera dell'avviso, l'onda e le schegge dell'impatto ----------
  const texCrepe = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.55, 'rgba(6,4,4,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.lineWidth = 1.6;
    for (let i = 0; i < 11; i++) {                  // crepe che partono dal centro (nere, con un filo rosso dentro)
      let a = i / 11 * Math.PI * 2 + 0.3 * Math.sin(i * 7), x = 32, y = 32;
      const pts = [[x, y]];
      for (let k = 0; k < 6; k++) { a += (Math.sin(i * 13 + k * 5) * 0.5); x += Math.cos(a) * 5; y += Math.sin(a) * 5; pts.push([x, y]); }
      [['rgba(0,0,0,0.95)', 2.2], ['rgba(120,10,12,0.55)', 0.7]].forEach(function (s) {
        g.strokeStyle = s[0]; g.lineWidth = s[1]; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.stroke();
      });
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const macchia = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texCrepe, transparent: true,
    opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  macchia.visible = false; scena.add(macchia);
  const anello = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x030202, transparent: true,
    opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
  anello.visible = false; scena.add(anello);
  const NP = 16, schegge = [];
  const geoS = new THREE.BoxGeometry(0.16, 0.12, 0.16), matS = new THREE.MeshLambertMaterial({ color: 0x141217 });
  for (let i = 0; i < NP; i++) { const m = new THREE.Mesh(geoS, matS); m.visible = false; scena.add(m); schegge.push({ m: m, v: new V3(), t: 0 }); }

  // ---------- Stato ----------
  const S = { ev: null, prossima: Infinity, quante: 0, visibile: false, scossa: 0, avvisata: false, colpita: false };
  function reset() { S.ev = null; S.prossima = Infinity; S.quante = 0; S.scossa = 0; nascondiTutto(); }
  function nascondiTutto() {
    D.nascondi(); mano.visible = false; macchia.visible = false; anello.visible = false; braccio[0].visible = braccio[1].visible = false;
    G.spalla[0].visible = G.spalla[1].visible = true;
    schegge.forEach(function (s) { s.m.visible = false; }); S.visibile = false;
  }
  // la corsa: n = frammenti raccolti, t = secondi di corsa. Chiede una manata al generatore quando è il momento.
  // Una sola alla volta: la prossima si chiede solo quando quella di prima è finita (niente sovrapposizioni)
  function pianifica(n, t, traffico) {
    if (n < CFG.da) { S.prossima = Infinity; return; }
    if (S.prossima === Infinity) S.prossima = t + CFG.prima[0] + rnd() * (CFG.prima[1] - CFG.prima[0]);
    if (!S.ev && t >= S.prossima && !traffico.stato.manataRichiesta) {
      const f4 = n >= CFG.fase4;
      traffico.richiediManata({ soloSalto: f4 ? CFG.soloSalto4 : CFG.soloSalto });
      const P = f4 ? CFG.pausa4 : CFG.pausa;
      S.prossima = t + P[0] + rnd() * (P[1] - P[0]);
    }
  }
  // il generatore ha messo una manata in questa fila: riga.manata = { corpo, mano, soloSalto }
  function nuova(riga) {
    const m = riga.manata, xc = (m.corpo - 1) * LC, xm = (m.mano - 1) * LC, lato = xm > xc ? 1 : -1;
    S.ev = { riga: riga, xm: xm, xc: xc, lato: lato, braccio: lato > 0 ? 0 : 1, colpo: false, sotto: 0, t: 0 };
    S.avvisata = false; S.colpita = false;
    S.quante++;
  }
  const bersaglio = new V3(), spalla = new V3(), polso = new V3(), gomito = new V3(), alto = new V3();
  // dt: secondi del mondo; tau: tempo di gioco ora; F: velocità del gioco; testa: dove guarda il demone (il ragazzo)
  function aggiorna(dt, tau, F, testa) {
    S.scossa = Math.max(0, S.scossa - dt * 2.5);
    const e = S.ev;
    schegge.forEach(function (s) {
      if (!s.m.visible) return;
      s.t += dt; s.v.y -= 14 * dt; s.m.position.addScaledVector(s.v, dt); s.m.position.z += V0 * F * dt; s.m.rotation.x += dt * 9; s.m.rotation.y += dt * 7;
      if (s.m.position.y < -0.2 || s.t > 1.6) s.m.visible = false;
    });
    if (!e) { if (S.visibile) nascondiTutto(); return; }
    e.t += dt;
    const zFila = -V0 * (e.riga.tau - tau);                // il bordo della mano verso il ragazzo (come le transenne)
    const resta = (e.riga.tau - tau) / Math.max(0.3, F);   // secondi che mancano all'arrivo
    const zMano = zFila - MANO.prof / 2;                   // centro della mano e del corpo
    // superati: quando il ragazzo ha passato tutta la mano e tutto il corpo (più un margine), sprofondano
    if (!e.sotto && zFila - MANO.prof > 1.6) e.sotto = e.t;
    const via = e.sotto ? liscia(0, 0.45, e.t - e.sotto) : 0;
    // avviso: il ringhio e la crepa nera che si allarga dove arriverà la mano
    if (resta <= T.avviso && !S.avvisata) { S.avvisata = true; if (PZ.audio.manataAvviso) PZ.audio.manataAvviso(Math.max(-1, Math.min(1, e.xm / 3))); }
    if (resta <= T.avviso && via < 1) {
      macchia.visible = true;
      const k = e.colpo ? 1 : liscia(T.avviso, T.avviso - 0.4, resta) * (0.6 + 0.4 * Math.sin(e.t * 11));
      macchia.material.opacity = 0.95 * k * (1 - via);
      const cresce = e.colpo ? 1.25 : 0.5 + 0.5 * liscia(T.avviso, T.colpo, resta);
      macchia.position.set(e.xm, 0.02, zMano); macchia.scale.set(LC * 1.25 * cresce, 1, MANO.prof * 1.5 * cresce);
    }
    // il demone in piedi nella sua corsia: emerge, alza il braccio, colpisce; resta lì finché non l'hai superato
    const sc = CFG.scala || 1.6;
    const emerso = liscia(T.emerge, T.emerge - 0.45, resta);
    const i = e.braccio, s = e.lato;
    if (resta <= T.emerge && via < 1) {
      if (!D.visibile) { D.mostra(); G.radice.scale.setScalar(sc); D.scala = sc; }
      D.posiziona(e.xc - s * 0.12, -3.9 * sc * (1 - emerso) - 4.2 * sc * via, zMano - 0.2, 0);
      bersaglio.copy(testa);
      D.anima(dt, 'fermo', 0, bersaglio, 1);
      const alza = liscia(T.alza, T.alza - 0.4, resta), colpo = e.colpo ? 1 : 0;
      G.busto.rotation.x = 0.3 + 0.2 * alza + 0.35 * colpo;
      G.busto.rotation.z = -s * (0.1 * alza + 0.32 * colpo);
      G.collo.rotation.x = -G.busto.rotation.x * 0.6;
      G.spalla[i].visible = alza <= 0;                      // alzandolo, il suo braccio diventa quello gigante
      G.radice.updateMatrixWorld(true);
      G.spalla[i].getWorldPosition(spalla);
      // il polso: prima sale in alto sopra la corsia accanto, poi si schianta sul bordo tra le due corsie
      const xb = (e.xc + e.xm) / 2;
      alto.set(e.xc + s * 1.1, 2.6 * sc, zMano + 0.4);
      polso.set(xb + s * 0.02, 0.42, zMano);
      if (alza > 0) {
        const pr = e.colpo ? 1 : 0;
        const pq = polso.clone(); pq.lerpVectors(alto, polso, pr);
        if (!e.colpo) pq.lerpVectors(spalla.clone().add(gomito.set(s * 0.4, -1.2, 0.3)), alto, alza);
        gomito.lerpVectors(spalla, pq, 0.5).add(alto.set(s * 0.15, 0.55 + 0.4 * (1 - pr), 0.35));  // gomito storto, in fuori
        mettiOsso(braccio[0], spalla, gomito, 0.2 * sc / 1.6);
        mettiOsso(braccio[1], gomito, pq, 0.17 * sc / 1.6);
        braccio[0].visible = braccio[1].visible = via < 0.8;
        // la mano: chiusa e piccola in alto, poi si schianta e si apre
        mano.visible = via < 1;
        mano.position.copy(pq); mano.position.y = e.colpo ? -0.62 * via : pq.y - 0.4;
        mano.rotation.set(0, 0, e.colpo ? 0 : s * 0.9);
        let k = 0.55;
        if (e.colpo) {
          const u = e.t - e.tColpo;
          k = u < 0.12 ? 0.55 + 0.6 * liscia(0, 0.12, u) : 1 + 0.15 * Math.exp(-(u - 0.12) * 12) * Math.cos((u - 0.12) * 28);
          // gli artigli si piantano e per un attimo brillano (giallo malato), poi tornano d'osso
          const b = Math.max(0, 1 - u / 0.6);
          matArtigli.emissive.setRGB(0.55 * b, 0.45 * b, 0.05 * b);
        }
        // (fase 59) nel blackout gli artigli restano appena accesi, giallo malato
        const eb = 0.3 * livBuio;
        if (!e.colpo || matArtigli.emissive.r < 0.55 * eb) matArtigli.emissive.setRGB(0.55 * eb, 0.45 * eb, 0.05 * eb);
        mano.scale.set(s * k, k * (1 - 0.6 * via), k);
      }
    } else {
      if (D.visibile) D.nascondi();
      mano.visible = false; braccio[0].visible = braccio[1].visible = false;
      G.spalla[0].visible = G.spalla[1].visible = true;
    }
    // l'impatto
    if (!e.colpo && resta <= T.colpo) {
      e.colpo = true; e.tColpo = e.t; S.scossa = 1;
      if (PZ.audio.manataColpo) PZ.audio.manataColpo(Math.max(-1, Math.min(1, e.xm / 3)));
      anello.visible = true;
      schegge.forEach(function (q) {
        q.m.visible = true; q.t = 0;
        q.m.position.set(e.xm + (rnd() - 0.5) * LC, 0.15, zMano + (rnd() - 0.5) * MANO.prof * 1.3);
        q.v.set((rnd() - 0.5) * 5, 3 + rnd() * 4.5, (rnd() - 0.5) * 3);
      });
    }
    if (e.colpo) {
      const ua = Math.min(1, (e.t - e.tColpo) / 0.5);
      anello.position.set(e.xm, 0.03, zMano); anello.scale.setScalar(1.2 + 3.5 * ua); anello.material.opacity = 0.75 * (1 - ua);
      if (ua >= 1) anello.visible = false;
    }
    if (via >= 1) { nascondiTutto(); S.ev = null; }
    S.visibile = D.visibile || mano.visible;
    if (zFila > 40) { S.ev = null; nascondiTutto(); }     // (sicurezza: la fila è passata da un pezzo)
  }
  function ferma() { S.ev = null; S.prossima = Infinity; nascondiTutto(); }
  return { buio: buio, pianifica: pianifica, nuova: nuova, aggiorna: aggiorna, reset: reset, ferma: ferma, stato: S, demone: D, mano: mano,
    visibile: function () { return S.visibile; }, scossa: function () { return S.scossa; } };
};
