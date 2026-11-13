// FINALE SULLA SCOGLIERA. Si collega a PZ.scogliera (src/strada/scogliera.js): quando la raccolta dei 100 frammenti
// è completa la corsa chiama PZ.scogliera.entra(dati), che chiama PZ.scogliera.scena(dati) definita qui sotto.
//
// La scena è quella del videoclip Pezzidicarne (src/scogliera/: terra.js, oceano.js, luci.js, cielo.js; stessa
// scogliera, stesso sentiero, stesso mare, stessa luna col ghigno, qui nella sua forma finale). In ordine:
//   1. sulla strada vuota il cartello "LA PIETRA È COMPLETA", poi il nero;
//   2. il ragazzo arriva in bici lungo il sentiero, fino al promontorio, e si ferma;
//   2b. (fase 12) arrivato in fondo scende dalla bici (resta sul cavalletto), tira fuori la pietra dalla tasca: la
//      pietra vibra, butta luce gialla con lampi e venature nere, gli sfugge di mano e fluttua a mezz'aria davanti al
//      ciglio. Il giocatore lo muove (trascinando il dito come nella cameretta, o W A S D / frecce) fino alla pietra;
//      vicino compare INTERAGISCI (o E / Spazio / Invio): un attimo di nero e si passa al punto 3;
//   3. la pietra d'ambra completa, vista con i suoi occhi, davanti al mare e alla luna: il giocatore la gira
//      (trascinando il dito o il mouse; sul PC anche frecce o W A S D). Sul retro, scritta a pennarello rosso che
//      cola, in caratteri strani, la data: 15/01/27. Quando la data guarda verso di lui la pietra si ferma lì;
//   4. appena la data guarda verso di lui: schermo nero DI COLPO, la musica si interrompe e suona un campanile
//      distorto (src/audio.js, campanile); dopo qualche rintocco compare la schermata finale (AMBRA,
//      RIGIOCA). (Il ragazzo che si inginocchia e piange non c'è più: le sue funzioni restano qui sotto, non usate.)
// La musica (src/audio.js, musicaFinale) è un carillon malinconico con qualcosa di sbagliato: stonature, un nastro
// che ondeggia, un tritono sotto; alla fine il carillon si scarica.
// Tutto avanza con passo(dt), chiamato dal ciclo della scena (o a mano nelle prove): nessun timer.
PZ.creaFinale = function (o) {
  const renderer = o.renderer, stage = o.stage, V3 = THREE.Vector3, PI = Math.PI;
  const A = PZ.anim, SCH = PZ.CONFIG.schermo;
  const $ = function (id) { return document.getElementById(id); };
  const ui = { tutto: $('scogliera'), nero: $('scNero'), aiuto: $('scAiuto'), fine: $('scFine'), cartello: $('finale') };
  const morbida = function (a, b, v) { return A.morbida(a, b, v); };
  const mix = function (a, b, k) { return a + (b - a) * k; };

  // ---------- Il mondo della scogliera (dal videoclip) ----------
  const scena = new THREE.Scene();
  PZ.qualita.registra(scena);   // (fase 69)
  const cielo = PZ.creaCielo(scena), oceano = PZ.creaOceano(scena), terra = PZ.creaTerra(scena);
  PZ.creaLuci(scena);
  cielo.volto(1);                                         // la luna qui è già girata: il volto guarda verso di noi
  const camera = new THREE.PerspectiveCamera(55, SCH.larghezzaInterna / SCH.altezzaInterna, 0.05, 2500);
  const ciclista = PZ.creaCiclista(scena), bici = ciclista.bici, ragazzo = ciclista.ragazzo;
  const R = ciclista.raggioRuota;
  const P = ciclista.nuovaPosa();

  // ---------- Il sentiero: dove si parte, dove ci si ferma ----------
  const percorso = terra.percorso, L = percorso.getLength();
  percorso.arcLengthDivisions = 3000; percorso.updateArcLengths();
  const punto = function (s, out) { return percorso.getPointAt(Math.max(0, Math.min(1, s / L)), out); };
  const tangente = function (s, out) { return percorso.getTangentAt(Math.max(0, Math.min(1, s / L)), out); };
  const altezza = function (x, z) { return terra.quota(x, z) + 0.08; };      // il sentiero è appoggiato sul terreno
  let S0 = 0;
  for (let s = 0, best = 1e9; s < L; s += 0.5) { const z = punto(s, new V3()).z; if (Math.abs(z - 6) < best) { best = Math.abs(z - 6); S0 = s; } }
  const SF = L - 3.2, V = 6, FRENA = 7;                  // si ferma 3 m prima della fine del sentiero
  const T_CROCIERA = (SF - FRENA - S0) / V, T_VIAGGIO = T_CROCIERA + 2 * FRENA / V;
  function strada(t) {                                     // metri sul sentiero dopo t secondi (frena in fondo)
    if (t <= T_CROCIERA) return S0 + V * t;
    const u = Math.min(t - T_CROCIERA, 2 * FRENA / V), a = V * V / (2 * FRENA);
    return S0 + V * T_CROCIERA + V * u - a * u * u / 2;
  }
  function velocita(t) { if (t <= T_CROCIERA) return V; return Math.max(0, V - (V * V / (2 * FRENA)) * (t - T_CROCIERA)); }

  // il punto della scena: poco prima del ciglio (lo stesso del videoclip), il ragazzo guarda il mare e la luna
  const raggio = new THREE.Raycaster(), giu = new V3(0, -1, 0), tmp = new V3(), tmp2 = new V3(), tmp3 = new V3();
  function suolo(x, z) {                                   // la quota vera del terreno (con le sue irregolarità)
    raggio.set(tmp.set(x, 60, z), giu);
    const h = raggio.intersectObjects(terra.superfici, false)[0];
    return h ? h.point.y : terra.quota(x, z);
  }
  const SCENA = new V3(7.6, 0, -50.2); SCENA.y = suolo(SCENA.x, SCENA.z);
  const DIR = PI + 0.15;                                   // verso il mare e la luna (un po' a sinistra)
  const avanti = A.avanti(DIR, new V3()), sinistra = A.sinistra(DIR, new V3());
  const PIETRA_TERRA = SCENA.clone().addScaledVector(avanti, 0.62); PIETRA_TERRA.y = suolo(PIETRA_TERRA.x, PIETRA_TERRA.z) + 0.05;
  const BICI_TERRA = SCENA.clone().addScaledVector(sinistra, -1.25).addScaledVector(avanti, 0.6); BICI_TERRA.y = suolo(BICI_TERRA.x, BICI_TERRA.z);

  // ---------- La pietra completa e la data ----------
  const pietra = PZ.creaPietra(scena);
  const SCALA = 1.0;
  pietra.scale.setScalar(SCALA);
  const data = (function () {                              // 15/01/27 a pennarello rosso, in caratteri strani, che cola
    const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), rnd = PZ.ps1.casuale(1501);
    // segni di ogni carattere (in una cella da 0 a 1); qualche segno in più li rende strani, ma si leggono
    // (le cifre sono scritte in modo netto: prima l'1 aveva un trattino e sembrava un 7, la data si leggeva "75/07/27")
    const GLIFI = {
      '1': [[[0.3, 0.24], [0.56, 0.04], [0.56, 0.96]], [[0.3, 0.96], [0.82, 0.96]]],
      '5': [[[0.84, 0.05], [0.24, 0.07], [0.2, 0.46], [0.62, 0.4], [0.86, 0.64], [0.62, 0.95], [0.16, 0.88]]],
      '/': [[[0.8, 0.0], [0.2, 1.0]]],
      '0': [[[0.5, 0.03], [0.84, 0.3], [0.84, 0.7], [0.5, 0.97], [0.16, 0.7], [0.16, 0.3], [0.5, 0.03]]],
      '2': [[[0.14, 0.26], [0.42, 0.03], [0.82, 0.16], [0.76, 0.46], [0.14, 0.94], [0.92, 0.94]]],
      '7': [[[0.1, 0.05], [0.9, 0.05], [0.38, 0.97]], [[0.3, 0.52], [0.76, 0.52]]]
    };
    const testo = '15/01/27', cw = (W - 16) / testo.length, ch = 74, y0 = 14;
    const colature = [];
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < testo.length; i++) {
      const x0 = 8 + i * cw, inclina = (rnd() - 0.5) * 0.3, sc = 0.9 + rnd() * 0.2;
      const pt = function (p) {
        const px = (p[0] - 0.5) * cw * 0.82 * sc, py = (p[1] - 0.5) * ch * sc;
        return [x0 + cw / 2 + px * Math.cos(inclina) - py * Math.sin(inclina) + (rnd() - 0.5) * 2.2, y0 + ch / 2 + px * Math.sin(inclina) + py * Math.cos(inclina) + (rnd() - 0.5) * 2.2];
      };
      GLIFI[testo[i]].forEach(function (tratto) {
        const q = tratto.map(pt);
        [['#a1000b', 7.5], ['#c4101a', 5], ['#7a0008', 2]].forEach(function (s, k) {      // pennarello: bordo, corpo, vena scura
          g.strokeStyle = s[0]; g.lineWidth = s[1]; g.beginPath(); g.moveTo(q[0][0] + k * 0.5, q[0][1]);
          for (let j = 1; j < q.length; j++) g.lineTo(q[j][0] + k * 0.5, q[j][1]); g.stroke();
        });
        // colature: dal punto più basso del segno, e a volte da un punto a caso
        let basso = q[0]; q.forEach(function (p) { if (p[1] > basso[1]) basso = p; });
        if (rnd() < 0.75) colature.push([basso[0] + (rnd() - 0.5) * 3, basso[1], 8 + rnd() * 30]);
        if (rnd() < 0.3) { const p = q[Math.floor(rnd() * q.length)]; colature.push([p[0], p[1], 5 + rnd() * 16]); }
      });
    }
    colature.forEach(function (c) {
      const x = c[0], y = c[1], l = Math.min(c[2], H - 6 - y);
      g.strokeStyle = '#a1000b'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 2, y + l); g.stroke();
      g.fillStyle = '#8a0009'; g.beginPath(); g.arc(x, y + l, 2.6, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,140,140,.7)'; g.fillRect(Math.round(x - 1), Math.round(y + l - 2), 1, 1);
    });
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter;
    // la data è "dipinta" sulle faccette del retro della pietra (lato -z): una copia di quelle faccette, appena
    // sollevata, con la scritta proiettata di fronte (così segue le facce come un pennarello vero)
    const gp = pietra.geometry, pos = gp.attributes.position, pp = [], uv = [], n = new V3(), a = new V3(), b = new V3(), cc = new V3();
    let x0 = Infinity, x1 = -Infinity, ya = Infinity, yb = -Infinity;
    for (let i = 0; i < pos.count; i++) { x0 = Math.min(x0, pos.getX(i)); x1 = Math.max(x1, pos.getX(i)); ya = Math.min(ya, pos.getY(i)); yb = Math.max(yb, pos.getY(i)); }
    const Wd = (x1 - x0) * 0.86, Hd = Wd * H / W, cx = (x0 + x1) / 2, cy = (ya + yb) / 2;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); cc.fromBufferAttribute(pos, i + 2);
      n.subVectors(b, a).cross(tmp.subVectors(cc, a)).normalize();
      if (n.z > -0.2) continue;                                              // solo le faccette del retro
      [a, b, cc].forEach(function (v) {
        pp.push(v.x + n.x * 0.0015, v.y + n.y * 0.0015, v.z + n.z * 0.0015);
        uv.push(0.5 - (v.x - cx) / Wd, 0.5 + (v.y - cy) / Hd);               // vista da dietro: si legge da sinistra a destra
      });
    }
    const gd = new THREE.BufferGeometry();
    gd.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); gd.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gd.computeVertexNormals();
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.Mesh(gd, new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.35, emissive: 0x2a0000,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }));
    pietra.add(m);
    return m;
  })();
  const DATA_N = new V3(0, 0, -1);                         // la direzione in cui guarda la data (nella pietra)
  const luceVicina = new THREE.PointLight(0xffd9a0, 0, 2.2, 2); scena.add(luceVicina);   // per il primo piano

  // ---------- Stato ----------
  const F = { fase: 'spenta', t: 0, tt: 0, dati: null, musica: null, pianto: null, q: new THREE.Quaternion(), w: new V3(), guarda: 0, rivelata: false,
    ruote: 0, pedivella: 0, giri: 0 };
  let tasti = {}, trascina = null;
  const camPos = new V3(), camGuarda = new V3(), cg = new V3(), cp = new V3();
  const qBase = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0.5, 0.12));     // all'inizio la data è dietro
  const qData = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, PI, -0.06));     // la data dritta verso di noi
  const assiY = new V3(0, 1, 0), assiX = new V3(1, 0, 0), qd = new THREE.Quaternion();

  function nero(v) { ui.nero.style.opacity = Math.max(0, Math.min(1, v)).toFixed(3); }
  function cambia(fase) { F.fase = fase; F.t = 0; }

  // ---------- Il ragazzo ----------
  function inBici(t) {
    const s = strada(t), v = velocita(t);
    const p = punto(s, tmp2), tg = tangente(s, tmp3);
    const dir = Math.atan2(tg.x, tg.z);
    const y = altezza(p.x, p.z), yAv = altezza(p.x + tg.x * 0.55, p.z + tg.z * 0.55), yDi = altezza(p.x - tg.x * 0.55, p.z - tg.z * 0.55);
    F.ruote += v * F.dt / R; if (v > 0.3) F.pedivella += v * F.dt / R / 2.3;
    ciclista.mettiBici(p.x, y, p.z, dir, Math.atan2(yAv - yDi, 1.1), 0, F.ruote, F.pedivella);
    ciclista.inSella(P, F.pedivella, F.tt, 0.2, 0);
    if (v < 0.3) { P.testa.x = 0.05; P.testa.y = 0.15 * morbida(0, 1.5, t - T_VIAGGIO); }        // fermo: alza lo sguardo
    ciclista.posa(P); ciclista.mostra(true);
    return { p: p, tg: tg, dir: dir, y: y };
  }
  // in piedi (k = 0) o in ginocchio (k = 1); pianto: da 0 a 1, quanto singhiozza (mani sul viso)
  function aTerra(k, pianto) {
    const g = SCENA.y, sob = pianto > 0 ? Math.pow(Math.max(0, Math.sin(F.tt * 5.2)), 3) * (0.6 + 0.4 * Math.sin(F.tt * 0.9)) * pianto : 0;
    P.dir = DIR; P.dirPiedi = DIR;
    P.pos.copy(SCENA).y = g + mix(0.92, 0.52, k) + 0.012 * sob;
    P.bacino.x = 0.1 * k; P.bacino.z = 0;
    P.busto.x = mix(0.04, 0.5, k) + 0.08 * sob; P.busto.y = 0; P.busto.z = 0.02 * Math.sin(F.tt * 0.7) * pianto;
    P.testa.x = mix(0.05, 0.55, Math.max(k, pianto)); P.testa.y = 0; P.testa.z = 0;
    [['sx', 1], ['dx', -1]].forEach(function (c) {
      const lato = c[1], piede = P.piedi[c[0]];
      piede.copy(SCENA).addScaledVector(sinistra, lato * mix(0.11, 0.13, k)).addScaledVector(avanti, mix(0, -0.34, k));
      piede.y = g + mix(0.077, 0.12, k);
      P.punte[c[0]] = mix(0, -1.25, k);
      // mani: lungo i fianchi; in ginocchio sulle cosce
      P.mani[c[0]].copy(P.pos).addScaledVector(avanti, mix(0.04, 0.3, k)).addScaledVector(sinistra, lato * mix(0.26, 0.17, k));
      P.mani[c[0]].y += mix(-0.45, -0.12, k);
    });
    ciclista.posa(P);
    if (pianto > 0) {                                       // le mani sul viso: si rifà la posa con le mani davanti alla faccia
      const tv = ragazzo.testa.getWorldPosition(tmp), q = ragazzo.testa.getWorldQuaternion(new THREE.Quaternion());
      const fr = tmp2.set(0, -0.02, 1).applyQuaternion(q), lt = tmp3.set(1, 0, 0).applyQuaternion(q);
      [['sx', 1], ['dx', -1]].forEach(function (c) {
        const lato = c[1], m = P.mani[c[0]], prima = m.clone();
        const sul = new V3().copy(tv).addScaledVector(fr, 0.13).addScaledVector(lt, lato * 0.05); sul.y -= 0.04;
        m.copy(prima).lerp(sul, pianto);
      });
      ciclista.posa(P);
    }
    ragazzo.conferma();
    ragazzo.gruppo.visible = true;
  }

  // ---------- Telecamere ----------
  function segui(dt, p, tg, y, k) {                        // dietro e sopra il ragazzo che pedala
    cp.set(p.x - tg.x * 6.2 + tg.z * 0.8, y + 2.6, p.z - tg.z * 6.2 - tg.x * 0.8);
    cg.set(p.x + tg.x * 9, y + 1.1, p.z + tg.z * 9);
    if (k === undefined) { camPos.lerp(cp, 1 - Math.exp(-dt * 3)); camGuarda.lerp(cg, 1 - Math.exp(-dt * 3)); } else { camPos.copy(cp); camGuarda.copy(cg); }
    camera.position.copy(camPos); camera.lookAt(camGuarda);
  }
  function occhi() {                                        // i suoi occhi: guarda la pietra davanti al mare e alla luna
    const g = SCENA.y;
    camera.position.copy(SCENA).addScaledVector(avanti, 0.08).y = g + 1.58;
    camera.lookAt(tmp.copy(camera.position).addScaledVector(avanti, 10).add(tmp2.set(0, 0.25, 0)));
    camera.fov = 55; camera.updateProjectionMatrix();
  }
  function largo(k) {                                       // da dietro, un po' di lato: lui sul ciglio, il mare, la luna
    const g = SCENA.y;
    camera.position.copy(SCENA).addScaledVector(avanti, -mix(3.2, 6.0, k)).addScaledVector(sinistra, mix(0.75, 1.05, k)).y = g + mix(1.3, 2.4, k);
    camera.lookAt(tmp.copy(SCENA).addScaledVector(avanti, 8).addScaledVector(sinistra, 0.25).add(tmp2.set(0, mix(0.9, 1.5, k), 0)));
    camera.fov = 55; camera.updateProjectionMatrix();
  }


  // ====================== FASE 12: scende dalla bici, la pietra posseduta, ci si avvicina ======================
  // Dopo il viaggio: lui scende dalla bici (la lascia in piedi sul cavalletto), tira fuori la pietra dalla tasca; la
  // pietra comincia a vibrare, a buttare luce gialla con lampi e venature nere, gli sfugge di mano e fluttua fino a
  // fermarsi a mezz'aria davanti al ciglio (vicino al punto in cui, dopo, la si guarda da vicino). Poi lo muove il
  // giocatore (trascinando il dito come nella cameretta, o W A S D / frecce); vicino alla pietra compare INTERAGISCI:
  // toccandolo si passa alla pietra in primo piano da girare (la parte di prima, invariata).
  const Q0 = ciclista.nuovaPosa(), Q1 = ciclista.nuovaPosa();      // posa di partenza e di arrivo per i passaggi
  const avantiCam = new V3(), lato = new V3();
  const PIETRA_ARIA = SCENA.clone().addScaledVector(avanti, 1.05); PIETRA_ARIA.y = SCENA.y + 1.45;   // dove fluttua
  const G = { stop: new V3(), dirBici: 0, piedi: new V3(), dir: 0, x: 0, z: 0, vx: 0, vz: 0, fase: 0, vel: 0, suono: null, prossimoCrepito: 0, vibra: 0 };
  // in piedi in un punto qualsiasi (quota vera del terreno sotto bacino e piedi); dir = dove guarda
  function inPiedi(Q, x, z, dir, passo, kp) {
    const av = A.avanti(dir, tmp2), si = A.sinistra(dir, tmp3), g = suolo(x, z);
    passo = passo || 0; kp = kp || 0;
    Q.dir = dir; Q.dirPiedi = dir;
    Q.pos.set(x, g + 0.92 - 0.035 * kp * Math.abs(Math.sin(passo)), z);
    Q.bacino.x = 0.04 * kp; Q.bacino.z = 0.03 * kp * Math.sin(passo);
    Q.busto.x = 0.05 + 0.06 * kp; Q.busto.y = 0.08 * kp * Math.sin(passo); Q.busto.z = 0;
    Q.testa.x = 0.05; Q.testa.y = 0; Q.testa.z = 0;
    [['sx', 1, 0], ['dx', -1, Math.PI]].forEach(function (c) {
      const lt = c[1], ph = passo + c[2], piede = Q.piedi[c[0]];
      const avP = 0.24 * kp * Math.sin(ph), su = 0.09 * kp * Math.max(0, Math.cos(ph));
      piede.set(x, 0, z).addScaledVector(si, lt * 0.11).addScaledVector(av, avP);
      piede.y = suolo(piede.x, piede.z) + 0.077 + su;
      Q.punte[c[0]] = -0.3 * su / 0.09 * kp;
      const m = Q.mani[c[0]];
      m.copy(Q.pos).addScaledVector(av, 0.04 - 0.16 * kp * Math.sin(ph)).addScaledVector(si, lt * 0.26); m.y += -0.45;
    });
    const dy = A.quotaBacino(Q.pos, Q.piedi, dir) - Q.pos.y;     // (fase 47) gambe quasi tese, il bacino sale e scende
    Q.pos.y += dy; Q.mani.sx.y += dy; Q.mani.dx.y += dy;
    return Q;
  }
  function mescola(Q, a, b, k) {                             // Q = a + (b - a) * k, posa per posa
    Q.pos.lerpVectors(a.pos, b.pos, k);
    Q.dir = a.dir + A.vicino(b.dir - a.dir, 0) * k; Q.dirPiedi = a.dirPiedi + A.vicino(b.dirPiedi - a.dirPiedi, 0) * k;
    ['bacino', 'busto', 'testa'].forEach(function (n) { Object.keys(a[n]).forEach(function (c) { Q[n][c] = mix(a[n][c], b[n][c], k); }); });
    ['sx', 'dx'].forEach(function (c) { Q.piedi[c].lerpVectors(a.piedi[c], b.piedi[c], k); Q.mani[c].lerpVectors(a.mani[c], b.mani[c], k); Q.punte[c] = mix(a.punte[c], b.punte[c], k); });
    return Q;
  }
  function copiaPosa(Q, a) { return mescola(Q, a, a, 0); }
  // l'effetto della pietra posseduta: vibrazione, luce gialla che sfarfalla, lampi e venature nere, aura scura
  const texNera = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.45, 'rgba(10,6,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 2;                       // filamenti neri che escono dal centro
    for (let i = 0; i < 9; i++) { let a = i * 0.7, x = 32, y = 32; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { a += Math.sin(i * 5 + k) * 0.6; x += Math.cos(a) * 4.5; y += Math.sin(a) * 4.5; g.lineTo(x, y); } g.stroke(); }
    return new THREE.CanvasTexture(c);
  })();
  const auraNera = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNera, transparent: true, depthWrite: false, opacity: 0 }));
  auraNera.scale.set(1.1, 1.1, 1); auraNera.visible = false; scena.add(auraNera);
  const auraGialla = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.ps1.alone(255, 215, 40, 6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  auraGialla.scale.set(1.8, 1.8, 1); auraGialla.visible = false; scena.add(auraGialla);
  const vene = new THREE.Mesh(pietra.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0 }));
  vene.scale.setScalar(1.06); pietra.add(vene); vene.visible = false;
  const EMI_GIALLO = new THREE.Color(0xffc81a), EMI_NERO = new THREE.Color(0x0a0400);
  // k: 0..1 quanto è posseduta; qua: posizione di base della pietra (la vibrazione si aggiunge)
  function pietraViva(dt, k, qua, scala) {
    pietra.visible = true; pietra.scale.setScalar(SCALA * (scala || 1));
    data.visible = false;                                  // la data si scopre solo dopo, girandola da vicino
    const r = Math.random;
    pietra.position.copy(qua).add(tmp.set((r() - 0.5) * 0.03 * k, (r() - 0.5) * 0.03 * k, (r() - 0.5) * 0.03 * k));
    G.vibra += dt * (3 + 9 * k);
    pietra.rotation.set(0.4 * Math.sin(G.vibra * 0.7) + (r() - 0.5) * 0.25 * k, G.vibra * 0.9, 0.3 * Math.cos(G.vibra * 0.5) + (r() - 0.5) * 0.25 * k);
    pietra.brilla(0.6 + 0.4 * k, F.tt);
    // lampi neri improvvisi dentro la luce gialla
    const lampoNero = r() < 0.06 * k ? 1 : 0, sfarfalla = 0.7 + 0.3 * Math.sin(F.tt * 31) * Math.sin(F.tt * 17);
    pietra.material.emissive.copy(EMI_GIALLO).lerp(EMI_NERO, lampoNero ? 0.92 : 0.15 * (1 - sfarfalla));
    vene.visible = k > 0.05; vene.material.opacity = (0.25 + 0.6 * k) * (lampoNero ? 1 : 0.5 + 0.5 * Math.sin(F.tt * 13));
    auraGialla.visible = auraNera.visible = k > 0.02;
    auraGialla.position.copy(pietra.position); auraNera.position.copy(pietra.position);
    auraGialla.material.opacity = (0.35 + 0.45 * k) * sfarfalla * (lampoNero ? 0.3 : 1);
    auraGialla.scale.setScalar((1.2 + 1.6 * k + 0.3 * Math.sin(F.tt * 9)) * (scala || 1) * 0.8);
    auraNera.material.opacity = 0.35 + 0.5 * k * (0.5 + 0.5 * Math.sin(F.tt * 5.3)) + 0.3 * lampoNero;
    auraNera.scale.setScalar((0.7 + 1.0 * k + 0.2 * Math.sin(F.tt * 3.1)) * (scala || 1) * 0.8);
    auraNera.material.rotation = F.tt * 0.8;
    // la luce sul ragazzo e sul terreno (la stessa luce del primo piano, più lontana: nessun materiale da rifare)
    luceVicina.position.copy(pietra.position); luceVicina.distance = 8; luceVicina.decay = 1; luceVicina.color.setHex(0xffcc30);
    luceVicina.intensity = (1.2 + 2.4 * k) * sfarfalla * (lampoNero ? 0.1 : 1);
    if (G.suono) { G.suono.imposta(0.25 + 0.75 * k); G.prossimoCrepito -= dt; if (G.prossimoCrepito <= 0) { G.prossimoCrepito = 0.12 + Math.random() * (0.9 - 0.6 * k); G.suono.crepita(); } }
  }
  function spegniPietraViva() {
    auraGialla.visible = auraNera.visible = vene.visible = false;
    luceVicina.distance = 2.2; luceVicina.decay = 2; luceVicina.color.setHex(0xffd9a0); luceVicina.intensity = 0;
    pietra.rotation.set(0, 0, 0); pietra.scale.setScalar(SCALA); data.visible = true;
    if (G.suono) { G.suono.ferma(1.2); G.suono = null; }
  }
  // telecamera in terza persona, dietro di lui verso la pietra (direzione fissa: i comandi non cambiano verso)
  function terzaPersona(dt, x, z, alto, subito, spalla) {
    const g = suolo(x, z);
    cp.set(x, g, z).addScaledVector(avantiCam, -4.4 + 1.6 * (spalla ? 1 : 0)); cp.y = g + 2.4 + (alto || 0);
    if (spalla) { cp.x += -avantiCam.z * spalla; cp.z += avantiCam.x * spalla; }    // un po' di lato: oltre la sua spalla
    cg.set(x, g + 1.0, z).addScaledVector(avantiCam, 2.6);
    if (subito) { camPos.copy(cp); camGuarda.copy(cg); }
    else { const k = 1 - Math.exp(-dt * 3); camPos.lerp(cp, k); camGuarda.lerp(cg, k); }
    camera.position.copy(camPos); camera.lookAt(camGuarda);
    if (camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); }
  }
  // telecamera di lato (mentre tira fuori la pietra e lei gli sfugge): lo si vede di tre quarti, con la pietra
  const latoCam = new V3(), avL = new V3(), siL = new V3(), guardaL = new V3();
  function diLato(dt, guarda, dist) {
    guardaL.copy(guarda);
    const av = A.avanti(P.dir, avL), si = A.sinistra(P.dir, siL);
    // il lato si sceglie una volta: quello dove il terreno è più basso (dall'altro la collina coprirebbe la scena)
    if (!G.latoCam) {
      const pr = function (l) { const x = P.pos.x + si.x * 2.9 * l + av.x * 0.9, z = P.pos.z + si.z * 2.9 * l + av.z * 0.9; return suolo(x, z); };
      G.latoCam = pr(1) <= pr(-1) ? 1 : -1;
    }
    latoCam.copy(P.pos).addScaledVector(si, 2.9 * G.latoCam).addScaledVector(av, 0.9 - (dist || 0));
    latoCam.y = Math.max(P.pos.y + 0.75, suolo(latoCam.x, latoCam.z) + 1.3);
    const k = 1 - Math.exp(-dt * 2.5); camPos.lerp(latoCam, k); camGuarda.lerp(guardaL, k);
    camera.position.copy(camPos); camera.lookAt(camGuarda);
  }
  const frontCam = new V3(), avF = new V3(), siF = new V3(), guardaF = new V3();
  function frontale(dt, guarda) {
    guardaF.copy(guarda);
    const av = A.avanti(P.dir, avF), si = A.sinistra(P.dir, siF);
    frontCam.copy(P.pos).addScaledVector(av, 2.3).addScaledVector(si, 0.9);
    frontCam.y = Math.max(P.pos.y + 0.55, suolo(frontCam.x, frontCam.z) + 1.0);
    const k = 1 - Math.exp(-dt * 3); camPos.lerp(frontCam, k); camGuarda.lerp(guardaF, k);
    camera.position.copy(camPos); camera.lookAt(camGuarda);
  }
  // comandi per camminare: il joystick della cameretta (si trascina il dito) o W A S D / frecce
  const joy = $('joy'), man = $('manopola'), btnI = $('scInteragisci');
  let joyId = null, joyO = { x: 0, y: 0 }; const joyIn = { x: 0, y: 0 };
  function relativo(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, em: r.height / 40 }; }
  ui.tutto.addEventListener('pointerdown', function (e) {
    if (F.fase !== 'cammina' || joyId !== null || (e.target.closest && e.target.closest('#scInteragisci'))) return;
    const p = relativo(e); joyId = e.pointerId; joyO = { x: p.x, y: p.y };
    if (joy) { joy.style.display = 'block'; joy.style.left = p.x + 'px'; joy.style.top = p.y + 'px'; man.style.transform = 'none'; }
    try { ui.tutto.setPointerCapture(e.pointerId); } catch (x) {}
  });
  ui.tutto.addEventListener('pointermove', function (e) {
    if (e.pointerId !== joyId) return;
    const p = relativo(e), max = p.em * 3.5;
    let dx = p.x - joyO.x, dy = p.y - joyO.y; const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    if (man) man.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    joyIn.x = dx / max; joyIn.y = dy / max; if (Math.hypot(joyIn.x, joyIn.y) < 0.15) { joyIn.x = 0; joyIn.y = 0; }
  });
  function fineJoy(e) { if (e && e.pointerId !== joyId) return; joyId = null; joyIn.x = joyIn.y = 0; if (joy) joy.style.display = 'none'; }
  ui.tutto.addEventListener('pointerup', fineJoy); ui.tutto.addEventListener('pointercancel', fineJoy);
  function interagisci() {
    if (F.fase !== 'cammina' || !ui.tutto.classList.contains('vicino')) return;
    if (PZ.audio.tocco) PZ.audio.tocco();
    ui.tutto.classList.remove('vicino', 'tocca'); fineJoy(); ui.aiuto.style.opacity = '0';
    cambia('avvicina');
  }
  if (btnI) btnI.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); interagisci(); });
  window.addEventListener('keydown', function (e) {
    if (F.fase !== 'cammina') return;
    tasti[e.code] = true;
    if (/Arrow|Space/.test(e.code)) e.preventDefault();
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') interagisci();
  });
  // un passo della camminata libera (vel max 1,7 m/s; non si va oltre il ciglio né lontano dalla scena)
  const CENTRO = new V3(), RAGGIO = { r: 6 };
  function cammina(dt) {
    let ix = joyIn.x, iy = joyIn.y;
    if (tasti.KeyA || tasti.ArrowLeft) ix -= 1; if (tasti.KeyD || tasti.ArrowRight) ix += 1;
    if (tasti.KeyW || tasti.ArrowUp) iy -= 1; if (tasti.KeyS || tasti.ArrowDown) iy += 1;
    const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    // avanti sullo schermo = verso la pietra
    lato.set(-avantiCam.z, 0, avantiCam.x);                              // a destra della telecamera
    const tvx = (avantiCam.x * -iy + lato.x * ix) * 1.7, tvz = (avantiCam.z * -iy + lato.z * ix) * 1.7;
    const k = 1 - Math.exp(-dt * 8); G.vx += (tvx - G.vx) * k; G.vz += (tvz - G.vz) * k;
    let nx = G.x + G.vx * dt, nz = G.z + G.vz * dt;
    // limiti: dentro un cerchio attorno alla scena, mai dove il terreno precipita (il ciglio), mai dentro la pietra
    const dc = Math.hypot(nx - CENTRO.x, nz - CENTRO.z);
    if (dc > RAGGIO.r) { nx = CENTRO.x + (nx - CENTRO.x) * RAGGIO.r / dc; nz = CENTRO.z + (nz - CENTRO.z) * RAGGIO.r / dc; }
    const dp = Math.hypot(nx - PIETRA_ARIA.x, nz - PIETRA_ARIA.z);
    if (dp < 0.55) { nx = PIETRA_ARIA.x + (nx - PIETRA_ARIA.x) * 0.55 / dp; nz = PIETRA_ARIA.z + (nz - PIETRA_ARIA.z) * 0.55 / dp; }
    if (suolo(nx, nz) < SCENA.y - 0.9) {                   // il ciglio: scivola lungo il bordo invece di fermarsi
      if (suolo(nx, G.z) >= SCENA.y - 0.9) nz = G.z;
      else if (suolo(G.x, nz) >= SCENA.y - 0.9) nx = G.x;
      else { nx = G.x; nz = G.z; G.vx *= 0.3; G.vz *= 0.3; }
    }
    G.x = nx; G.z = nz;
    G.vel = Math.hypot(G.vx, G.vz);
    if (G.vel > 0.12) G.dir = G.dir + A.vicino(Math.atan2(G.vx, G.vz) - G.dir, 0) * Math.min(1, dt * 9);
    const fasePrima = G.fase;
    G.fase += G.vel * dt / 0.62 * Math.PI;
    // (fase 33) PASSI su terra e roccia: il piede appoggia quando la fase passa per π/2 + kπ (vedi inPiedi: alzato finché cos > 0)
    const app = function (f) { return Math.floor((f - Math.PI / 2) / Math.PI); };
    if (G.vel > 0.3 && app(G.fase) !== app(fasePrima) && PZ.audio.passoTerra) PZ.audio.passoTerra(Math.min(1, G.vel / 1.7));
    const kp = Math.min(1, G.vel / 1.2);
    inPiedi(P, G.x, G.z, G.dir, G.fase, kp);
    // guarda la pietra
    const yaw = Math.atan2(PIETRA_ARIA.x - G.x, PIETRA_ARIA.z - G.z);
    P.testa.y = Math.max(-0.9, Math.min(0.9, A.vicino(yaw - G.dir, 0))) * 0.7; P.testa.x = -0.12;
    ciclista.posa(P); ragazzo.conferma(); ragazzo.gruppo.visible = true;
    return Math.hypot(G.x - PIETRA_ARIA.x, G.z - PIETRA_ARIA.z);
  }
  // la bici in piedi sul cavalletto, dove si è fermata
  function biciFerma() { ciclista.mettiBici(G.stop.x, G.stop.y, G.stop.z, G.dirBici, 0, 0.12, F.ruote, F.pedivella); }

  // (fase 59) dove sta la pietra tenuta in mano: oltre la punta delle dita della mano destra (polso + 18 cm lungo la
  // mano), così la mano la stringe dal bordo e non ci entra dentro (raggio della pietra in mano: circa 8,5 cm)
  const vPolso = new V3(), vDirMano = new V3(), qPolso = new THREE.Quaternion();
  function presaMano(out) {
    const m = ragazzo.mano('dx'); m.updateMatrixWorld(true);
    m.getWorldPosition(vPolso); m.getWorldQuaternion(qPolso);
    vDirMano.set(0, -1, 0).applyQuaternion(qPolso);
    return out.copy(vPolso).addScaledVector(vDirMano, 0.172);
  }
  // ---------- La pietra in primo piano ----------
  const qMondo = new THREE.Quaternion();
  function pietraInMano(dt, avvicina) {
    pietra.visible = true;
    camera.updateMatrixWorld();
    pietra.position.set(0, -0.045, -mix(0.5, 0.4, avvicina)).applyMatrix4(camera.matrixWorld);
    pietra.quaternion.copy(qMondo.copy(camera.quaternion).multiply(F.q));
    luceVicina.position.copy(camera.position).add(tmp.set(0.2, 0.25, 0).applyQuaternion(camera.quaternion));
    luceVicina.intensity = 0.9;
    pietra.brilla(0.45 + 0.4 * avvicina, F.tt);
  }
  function ruota(ax, ang) { qd.setFromAxisAngle(ax, ang); F.q.premultiply(qd); }
  function giraPietra(dt) {
    // tastiera: frecce o W A S D; trascinamento: il dito o il mouse (con un po' di inerzia quando si lascia)
    const kx = (tasti.ArrowRight || tasti.KeyD ? 1 : 0) - (tasti.ArrowLeft || tasti.KeyA ? 1 : 0);
    const ky = (tasti.ArrowDown || tasti.KeyS ? 1 : 0) - (tasti.ArrowUp || tasti.KeyW ? 1 : 0);
    if (kx || ky) { F.w.set(ky * 2.4, kx * 2.4, 0); F.giri += dt; }
    else if (!trascina) F.w.multiplyScalar(Math.exp(-dt * 2.5));
    ruota(assiY, F.w.y * dt); ruota(assiX, F.w.x * dt);
    if (!trascina && !kx && !ky && F.w.length() < 0.05) ruota(assiY, 0.12 * dt);                 // da sola gira appena
    F.q.normalize();
    // la data guarda verso di lui?
    const d = tmp.copy(DATA_N).applyQuaternion(F.q);
    F.guarda = d.z > 0.8 ? F.guarda + dt : 0;
    return F.guarda > 0.35;
  }
  ui.tutto.addEventListener('pointerdown', function (e) {
    if (F.fase !== 'pietra') return;
    trascina = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    try { ui.tutto.setPointerCapture(e.pointerId); } catch (x) {}
  });
  ui.tutto.addEventListener('pointermove', function (e) {
    if (!trascina || e.pointerId !== trascina.id || F.fase !== 'pietra') return;
    const k = 4.2 / Math.max(200, stage.clientWidth), dx = e.clientX - trascina.x, dy = e.clientY - trascina.y, ora = performance.now();
    ruota(assiY, dx * k); ruota(assiX, dy * k);
    const dts = Math.max(0.008, (ora - trascina.t) / 1000);
    F.w.set(dy * k / dts, dx * k / dts, 0).clampLength(0, 6);
    trascina.x = e.clientX; trascina.y = e.clientY; trascina.t = ora; F.giri += 0.05;
  });
  function lascia(e) { if (trascina && e.pointerId === trascina.id) trascina = null; }
  ui.tutto.addEventListener('pointerup', lascia); ui.tutto.addEventListener('pointercancel', lascia);
  window.addEventListener('keydown', function (e) { if (F.fase === 'pietra' || F.fase === 'data') { tasti[e.code] = true; if (/Arrow/.test(e.code)) e.preventDefault(); } });
  window.addEventListener('keyup', function (e) { tasti[e.code] = false; });
  // RIGIOCA: si ricomincia dalla cameretta (la pagina senza gli indirizzi di prova come #strada)
  // (fase 16) finita la storia si sblocca la modalità arcade (resta sbloccata in questo browser)
  function sbloccaArcade() {
    if (!PZ.arcade || (PZ.arcade.attiva)) return;
    PZ.arcade.sblocca();
    const n = document.getElementById('scSblocco'); if (n) n.classList.add('vis');
  }
  // (fase 58) RIGIOCA: si ricarica e la schermata iniziale mostra solo "TOCCA PER RICOMINCIARE" (serve un tocco per
  // l'audio); TORNA AL MENU: la schermata iniziale normale
  $('scRicomincia').addEventListener('click', function () { if (PZ.audio.tocco) PZ.audio.tocco(); try { sessionStorage.setItem('ambra.rigioca', '1'); } catch (e) {} location.href = location.pathname; });
  $('scMenu').addEventListener('click', function () { if (PZ.audio.tocco) PZ.audio.tocco(); location.href = location.pathname; });

  // ---------- Avanzamento ----------
  const DUR = { scende: 1.8, tasca: 1.7, posseduta: 3.0, avvicina: 0.5, leggi: 3.0, attesa: 3.4, buio: 0.8, ferma: 1.4, data: 3.4, kneel: 1.6, pianto: 7.5, nero: 3.0, campanile: 2.6 };
  function passo(dt) {
    if (F.fase === 'spenta' || F.fase === 'chiusa') return;
    if (!PZ.scogliera.attiva) { chiudi(); return; }       // la corsa è stata riavviata: il finale si annulla
    F.dt = dt; F.t += dt; F.tt += dt;
    if (F.musica) F.musica.passo();
    // (fase 36) Pezzidicarne rallenta come un nastro quanto serve per durare fino alla data sulla pietra:
    // velocità = pezzo che resta / scena che resta (stimata: per camminare e girare la pietra si contano CAMMINA e
    // GIRA secondi), mai sotto 0,55; cambia piano, così si sente scendere come un nastro che rallenta
    if (F.musica && F.musica.velocita) {
      const resto = scenaResta(), vuole = Math.max(0.55, Math.min(1, F.musica.restano() / Math.max(0.5, resto))), ora = F.musica.velocitaOra();
      const nuova = ora + Math.max(-0.08 * dt, Math.min(0.08 * dt, vuole - ora));
      if (Math.abs(nuova - ora) > 1e-4) F.musica.velocita(nuova);
    }
    if (F.fase === 'attesa') {                             // la corsa continua da sola sulla strada vuota (cartello)
      nero(morbida(DUR.attesa - 0.9, DUR.attesa, F.t));
      if (F.t >= DUR.attesa) entraNelMondo();
      return;
    }
    oceano.aggiorna(F.tt);
    cielo.sorriso(1, 0.5 - 0.5 * Math.cos(F.tt * 2 * PI / 5));                 // il ghigno che respira
    if (F.fase === 'viaggio') {
      const b = inBici(F.t);
      segui(dt, b.p, b.tg, b.y, F.t === dt ? 0 : undefined);
      nero(1 - morbida(0, 1.3, F.t));
      if (F.t >= T_VIAGGIO + DUR.ferma) iniziaDiscesa(b);
    } else if (F.fase === 'scende') {                      // scende dalla bici dal lato sinistro e si gira verso il mare
      const k = morbida(0, DUR.scende, F.t);
      biciFerma();
      // il piede sinistro va a terra subito, il destro passa sopra la ruota dietro; le mani lasciano il manubrio
      mescola(P, Q0, Q1, k);
      const kd = morbida(0.25, 0.85, k);
      P.piedi.dx.lerpVectors(Q0.piedi.dx, Q1.piedi.dx, kd); P.piedi.dx.y += 0.55 * Math.sin(Math.PI * kd);
      P.piedi.dx.addScaledVector(A.avanti(G.dirBici, tmp), -0.35 * Math.sin(Math.PI * kd));
      P.pos.y += 0.08 * Math.sin(Math.PI * k);
      const km = morbida(0.45, 1, k); P.mani.dx.lerpVectors(Q0.mani.dx, Q1.mani.dx, km); P.mani.sx.lerpVectors(Q0.mani.sx, Q1.mani.sx, km);
      ciclista.posa(P); ragazzo.conferma(); ragazzo.gruppo.visible = true;
      terzaPersona(dt, P.pos.x, P.pos.z, 0.2);
      if (F.t >= DUR.scende) { G.x = Q1.pos.x; G.z = Q1.pos.z; G.dir = Q1.dir; cambia('tasca'); }
    } else if (F.fase === 'tasca') {                       // si gira verso il mare, tira fuori la pietra dalla tasca
      biciFerma();
      const dirMare = Math.atan2(PIETRA_ARIA.x - G.x, PIETRA_ARIA.z - G.z);
      inPiedi(Q0, G.x, G.z, G.dir, 0, 0); inPiedi(Q1, G.x, G.z, G.dir + A.vicino(dirMare - G.dir, 0), 0, 0);
      mescola(P, Q0, Q1, morbida(0, 0.6, F.t));
      const av = A.avanti(P.dir, tmp2), si = A.sinistra(P.dir, tmp3);
      // mano destra: alla tasca (fianco), poi davanti al petto con la pietra
      const tasca = tmp.copy(P.pos).addScaledVector(si, -0.2).addScaledVector(av, 0.02); tasca.y -= 0.12;
      const petto = new V3().copy(P.pos).addScaledVector(av, 0.36).addScaledVector(si, -0.05); petto.y += 0.38;
      const k1 = morbida(0.3, 0.75, F.t), k2 = morbida(0.8, 1.4, F.t);
      P.mani.dx.lerp(tasca, k1).lerp(petto, k2);
      P.testa.x = mix(0.05, 0.45, k2);
      ciclista.posa(P); ragazzo.conferma();
      if (F.t > 0.8) {                                    // la pietra esce dalla tasca, nella sua mano
        // (fase 59) la pietra sta DAVANTI alle dita, stretta tra la punta delle dita (prima era al centro del petto,
        // dove la mano arrivava dopo: le geometrie si compenetravano). Segue la mano vera, fotogramma per fotogramma
        pietraViva(dt, 0.05 * morbida(1.1, 1.6, F.t), presaMano(F.presa || (F.presa = new V3())), 1.2);
        if (!G.suono && PZ.audio.pietraViva && F.t > 1.2) G.suono = PZ.audio.pietraViva();
      }
      F.petto = petto;
      // davanti a lui, un po' di lato: si vede la mano che esce dalla tasca con la pietra
      frontale(dt, petto);
      if (F.t >= DUR.tasca) cambia('posseduta');
    } else if (F.fase === 'posseduta') {                   // vibra, luce gialla e nera, gli sfugge e fluttua davanti al ciglio
      biciFerma();
      const k = morbida(0, 1.4, F.t), via = morbida(1.4, DUR.posseduta, F.t);
      inPiedi(P, G.x, G.z, P.dir, 0, 0);
      const av = A.avanti(P.dir, tmp2), si = A.sinistra(P.dir, tmp3);
      // lui si ritrae: busto indietro, la mano resta aperta davanti, l'altra si alza a proteggersi
      P.busto.x = mix(0.05, -0.22, via); P.testa.x = mix(0.45, 0.1, via) + 0.06 * Math.sin(F.tt * 23) * k * (1 - via);
      P.mani.dx.copy(F.petto).addScaledVector(av, 0.06 * via); P.mani.dx.y += 0.1 * via;
      P.mani.sx.copy(P.pos).addScaledVector(av, 0.25 * via).addScaledVector(si, 0.22); P.mani.sx.y += mix(-0.45, 0.35, via);
      ciclista.posa(P); ragazzo.conferma();
      const da = tmp.copy(F.presa || F.petto); if (!F.presa) da.y += 0.05;   // (fase 59) parte da dove la teneva
      const q = new V3().lerpVectors(da, PIETRA_ARIA, via); q.y += 0.6 * Math.sin(Math.PI * via);   // vola su e poi giù, verso il ciglio
      pietraViva(dt, 0.25 + 0.75 * k, q, 1.2 + 1.6 * via);
      if (F.t < 1.2) frontale(dt, tmp2.copy(F.petto)); else terzaPersona(dt, P.pos.x, P.pos.z, 0.2, false, 1.1);
      if (F.t < 1.6) { camera.position.x += (Math.random() - 0.5) * 0.04 * k; camera.position.y += (Math.random() - 0.5) * 0.03 * k; }
      if (F.t >= DUR.posseduta) {
        cambia('cammina'); ui.tutto.classList.add('tocca');
        ui.aiuto.innerHTML = 'Avvicinati alla pietra<br><small>(trascina il dito; PC: W A S D o frecce)</small>'; ui.aiuto.style.transition = ''; ui.aiuto.style.opacity = '1';
      }
    } else if (F.fase === 'cammina') {                     // il giocatore lo muove; vicino alla pietra: INTERAGISCI
      biciFerma();
      const d = cammina(dt);
      pietraViva(dt, 0.55 + 0.15 * Math.sin(F.tt * 1.3), tmp.copy(PIETRA_ARIA).add(tmp2.set(0, 0.08 * Math.sin(F.tt * 1.7), 0)), 2.8);
      terzaPersona(dt, G.x, G.z, 0, false, 0.0001 * 0);
      const vicino = d < 1.6;
      if (vicino !== ui.tutto.classList.contains('vicino')) ui.tutto.classList.toggle('vicino', vicino);
      if (F.t > 3 && ui.aiuto.style.opacity !== '0' && G.mosso > 1.2) ui.aiuto.style.opacity = '0';
      G.mosso = (G.mosso || 0) + G.vel * dt;
    } else if (F.fase === 'avvicina') {                    // un attimo di nero, poi la pietra in primo piano (come prima)
      biciFerma();
      inPiedi(P, G.x, G.z, G.dir, 0, 0); ciclista.posa(P); ragazzo.conferma();
      pietraViva(dt, 0.9, tmp.copy(PIETRA_ARIA), 2.8);
      terzaPersona(dt, G.x, G.z, 0);
      nero(morbida(0, DUR.avvicina, F.t));
      if (G.suono) G.suono.imposta(1);
      if (F.t >= DUR.avvicina) {
        spegniPietraViva();
        ragazzo.gruppo.visible = false;
        ui.aiuto.innerHTML = 'Trascina per girare la pietra<br><small>(PC: mouse, frecce o W A S D)</small>';
        F.q.copy(qBase); F.w.set(0, 0, 0); tasti = {};
        cambia('pietra');
      }
    } else if (F.fase === 'buio1') {
      const b = inBici(T_VIAGGIO + DUR.ferma + F.t); segui(dt, b.p, b.tg, b.y);
      nero(morbida(0, DUR.buio, F.t));
      if (F.t >= DUR.buio) {                               // stacco: a terra, la bici posata accanto, la pietra in mano
        ciclista.mettiBici(BICI_TERRA.x, BICI_TERRA.y, BICI_TERRA.z, DIR + 0.6, 0, 1.42, F.ruote, F.pedivella);
        ragazzo.gruppo.visible = false;
        F.q.copy(qBase); F.w.set(0, 0, 0);
        cambia('pietra');
      }
    } else if (F.fase === 'pietra') {
      occhi();
      const vista = giraPietra(dt);
      pietraInMano(dt, 0);
      nero(1 - morbida(0, 0.9, F.t));
      if (!ui.tutto.classList.contains('tocca')) ui.tutto.classList.add('tocca');
      ui.aiuto.style.opacity = (F.t > 1.2 && F.giri < 0.6 ? 1 : F.t > 1.2 && F.giri < 2 ? 0.5 : 0).toString();
      if (vista) {                                          // la data: si ferma dritta e resta leggibile 3 secondi
        ui.tutto.classList.remove('tocca'); F.rivelata = true; ui.aiuto.style.transition = 'none'; ui.aiuto.style.opacity = '0';
        F.qDa = F.q.clone(); F.w.set(0, 0, 0); trascina = null;
        cambia('leggi');
      }
    } else if (F.fase === 'leggi') {                       // 3 s: la pietra si raddrizza e resta ferma, la telecamera non si muove
      occhi();
      F.q.copy(F.qDa).slerp(qData, morbida(0, 0.6, F.t));
      pietraInMano(dt, 0);
      nero(0);
      if (F.t >= DUR.leggi) {                              // poi subito il nero e il campanile
        nero(1);
        if (F.musica) F.musica.ferma();
        if (PZ.audio.campanile) PZ.audio.campanile();
        cambia('campanile');
      }
    } else if (F.fase === 'campanile') {                   // nero; i rintocchi; poi la schermata finale
      nero(1);
      if (F.t >= DUR.campanile) { cambia('fine'); ui.fine.classList.add('vis'); sbloccaArcade(); }
    } else if (F.fase === 'data') {                        // la pietra si ferma con la data dritta verso di lui
      occhi();
      F.q.copy(F.qDa).slerp(qData, morbida(0, 1.4, F.t));
      pietraInMano(dt, morbida(0, 1.6, F.t));
      if (F.t >= DUR.data - DUR.buio) nero(morbida(DUR.data - DUR.buio, DUR.data, F.t));
      if (F.t >= DUR.data) {                               // stacco: lui sul ciglio, la pietra posata davanti
        pietra.position.copy(PIETRA_TERRA); pietra.quaternion.setFromEuler(new THREE.Euler(-PI / 2 + 0.25, DIR, 0)); pietra.scale.setScalar(1.1);
        luceVicina.intensity = 0;
        F.pianto = PZ.audio.voce ? PZ.audio.voce('pianto', null, 165) : null;
        cambia('pianto');
      }
    } else if (F.fase === 'pianto') {                      // si inginocchia e piange; la camera si allontana piano
      const k = morbida(0.3, 0.3 + DUR.kneel, F.t), pk = morbida(0.3 + DUR.kneel * 0.6, 0.3 + DUR.kneel + 0.8, F.t);
      aTerra(k, pk);
      largo(morbida(0, DUR.kneel + DUR.pianto, F.t));
      pietra.brilla(0.9, F.tt);
      nero(1 - morbida(0, 1.1, F.t));
      if (F.pianto) F.pianto.imposta(0.55 * pk, 0);
      if (F.t >= DUR.kneel + DUR.pianto) { cambia('nero'); if (F.musica) F.musica.spegni(DUR.nero + 1.5); if (F.pianto) F.pianto.svanisci(2.5); }
    } else if (F.fase === 'nero') {
      aTerra(1, 1); largo(1); pietra.brilla(0.9, F.tt);
      nero(morbida(0, DUR.nero, F.t));
      if (F.t >= DUR.nero + 0.8) { cambia('fine'); ui.fine.classList.add('vis'); sbloccaArcade(); }
    }
  }
  // (fase 36) quanti secondi mancano, più o meno, a quando si legge la data (lì la musica si interrompe)
  const CAMMINA = 9, GIRA = 7;
  function scenaResta() {
    const dopo = { viaggio: DUR.scende + DUR.tasca + DUR.posseduta + CAMMINA + DUR.avvicina + GIRA + DUR.leggi,
      scende: DUR.tasca + DUR.posseduta + CAMMINA + DUR.avvicina + GIRA + DUR.leggi, tasca: DUR.posseduta + CAMMINA + DUR.avvicina + GIRA + DUR.leggi,
      posseduta: CAMMINA + DUR.avvicina + GIRA + DUR.leggi, cammina: DUR.avvicina + GIRA + DUR.leggi, avvicina: GIRA + DUR.leggi, pietra: DUR.leggi, leggi: 0 };
    const qui = { viaggio: T_VIAGGIO + DUR.ferma, scende: DUR.scende, tasca: DUR.tasca, posseduta: DUR.posseduta, cammina: CAMMINA, avvicina: DUR.avvicina, pietra: GIRA, leggi: DUR.leggi };
    if (!(F.fase in dopo)) return 1;
    return Math.max(F.fase === 'cammina' || F.fase === 'pietra' ? 1.5 : 0, qui[F.fase] - F.t) + dopo[F.fase];
  }
  // fine del viaggio: posa in sella da cui parte, posa in piedi accanto alla bici dove arriva
  function iniziaDiscesa(b) {
    G.stop.set(b.p.x, b.y, b.p.z); G.dirBici = b.dir;
    ciclista.inSella(Q0, F.pedivella, F.tt, 0.2, 0);
    copiaPosa(P, Q0);
    const si = A.sinistra(b.dir, new V3());
    const x = b.p.x + si.x * 0.62, z = b.p.z + si.z * 0.62;
    inPiedi(Q1, x, z, b.dir + 0.5, 0, 0);
    avantiCam.set(PIETRA_ARIA.x - x, 0, PIETRA_ARIA.z - z).normalize();
    CENTRO.set((x + PIETRA_ARIA.x) / 2, 0, (z + PIETRA_ARIA.z) / 2);
    RAGGIO.r = Math.hypot(x - PIETRA_ARIA.x, z - PIETRA_ARIA.z) / 2 + 2.2;
    G.mosso = 0; G.vx = G.vz = 0; G.fase = 0; G.vibra = 0; G.latoCam = 0;
    cambia('scende');
  }
  function entraNelMondo() {
    const C = window.__strada;
    const inv = $('inv'); if (inv) inv.style.display = 'none';            // la pietra non è più nell'inventario: è qui
    if (C) { C.stato.attiva = false; }                     // la corsa si ferma: da qui disegna il finale
    document.getElementById('corsa').style.display = 'none';
    if (ui.cartello) ui.cartello.classList.remove('vis');
    ['specchio', 'velo', 'lampoUrto'].forEach(function (id) { const el = $(id); if (el) el.style.opacity = '0'; });
    if (PZ.audio.vento) PZ.audio.vento(0);
    F.musica = PZ.audio.musicaFinale ? PZ.audio.musicaFinale() : null;
    F.ruote = 0; F.pedivella = 0;
    cambia('viaggio');
    if (giraDaSolo) requestAnimationFrame(ciclo);
  }
  function disegna() {
    if (F.fase === 'spenta' || F.fase === 'chiusa' || F.fase === 'attesa') return;
    cielo.aggiorna(camera.position);
    PZ.qualita.disegna(scena, camera, PZ.CONFIG.qualita.scene.scogliera);   // (fase 69)
  }
  let ultimo = 0, giraDaSolo = true;
  function ciclo(ora) {
    if (F.fase === 'spenta' || F.fase === 'chiusa') return;
    requestAnimationFrame(ciclo);
    const dt = ultimo ? Math.min(0.05, (ora - ultimo) / 1000) : 1 / 60; ultimo = ora;
    passo(dt); disegna();
  }
  function avvia(dati) {
    F.dati = dati; F.tt = 0; F.rivelata = false; F.giri = 0; F.guarda = 0; tasti = {}; trascina = null;
    pietra.visible = false; pietra.scale.setScalar(SCALA); ragazzo.gruppo.visible = false;
    ui.tutto.style.display = 'block'; ui.tutto.classList.remove('tocca'); ui.fine.classList.remove('vis'); ui.aiuto.style.opacity = '0'; nero(0);
    if (ui.cartello) ui.cartello.classList.add('vis');
    cambia('attesa'); ultimo = 0;
    if (giraDaSolo) requestAnimationFrame(ciclo);
  }
  function chiudi() {
    F.fase = 'chiusa';
    if (F.musica) { F.musica.ferma(); F.musica = null; }
    if (F.pianto) { F.pianto.ferma(); F.pianto = null; }
    spegniPietraViva(); fineJoy(); ui.tutto.classList.remove('vicino');
    ui.tutto.style.display = 'none'; ui.fine.classList.remove('vis'); nero(0);
  }
  // PRERISCALDAMENTO (fase 11): si disegna la scena della scogliera qualche volta, con tutto acceso e la telecamera
  // in alcuni punti del finale, così la scheda video prepara adesso materiali e immagini (e non al primo fotogramma
  // del finale). Lo fa la corsa dietro lo schermo nero, una volta sola; poi tutto torna com'era.
  function preriscalda() {
    const salvati = [];
    scena.traverse(function (o) { salvati.push([o, o.visible, o.frustumCulled]); if (!o.isLight) o.visible = true; o.frustumCulled = false; });
    luceVicina.intensity = 0.9;
    // due giri: con la pietra nascosta e con la pietra in vista (dentro ha una luce: cambia il numero di luci della
    // scena, e quindi i programmi dei materiali, anche di quelli che non c'entrano con la pietra)
    [false, true].forEach(function (conPietra) {
      pietra.visible = conPietra;
      try { renderer.compile(scena, camera); } catch (e) {}
      const viste = [[punto(S0, new V3()), SCENA], [SCENA.clone().add(new V3(0, 1.6, 0)), PIETRA_TERRA], [SCENA.clone().add(new V3(3, 2.5, 4)), SCENA]];
      viste.forEach(function (v) { camera.position.copy(v[0]).y += 1.5; camera.lookAt(v[1]); camera.updateMatrixWorld(); cielo.aggiorna(camera.position); renderer.render(scena, camera); });
    });
    salvati.forEach(function (v) { v[0].visible = v[1]; v[0].frustumCulled = v[2]; });
    luceVicina.intensity = 0;
  }
  return { preriscalda: preriscalda, avvia: avvia, passo: passo, disegna: disegna, chiudi: chiudi, stato: F, camera: camera, scena: scena, pietra: pietra, data: data,
    ciclista: ciclista, cielo: cielo, SCENA: SCENA, T_VIAGGIO: T_VIAGGIO, DUR: DUR,
    strumenti: { punto: punto, tangente: tangente, SF: SF, DIR: DIR, suolo: suolo },
    interagisci: interagisci, cammina: G, PIETRA_ARIA: PIETRA_ARIA, joy: joyIn,
    manuale: function () { giraDaSolo = false; },          // per le prove: niente ciclo automatico, si avanza con passo()
    tasti: function () { return tasti; } };
};

// (fase 11) la corsa la prepara prima, dietro lo schermo nero dell'ingresso in strada: la crea e la "preriscalda"
PZ.scogliera.prepara = function () {
  const C = window.__strada;
  if (!C) return;
  if (!PZ.finale) PZ.finale = PZ.creaFinale({ renderer: C.renderer, stage: document.getElementById('stage') });
  if (!PZ.finale.__pronta) { PZ.finale.__pronta = true; PZ.finale.preriscalda(); }
};
// Collegamento con la corsa: la scena viene creata la prima volta che serve (se non è già stata preparata)
PZ.scogliera.scena = function (dati) {
  if (!PZ.finale) {
    const C = window.__strada;
    PZ.finale = PZ.creaFinale({ renderer: C.renderer, stage: document.getElementById('stage') });
  }
  PZ.finale.avvia(dati);
};
