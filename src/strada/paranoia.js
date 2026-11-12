// LA PARANOIA CONTAMINA LA REALTÀ. Più il demone è vicino, più il mondo si deforma e genera allucinazioni.
//
// INTENSITÀ. Riusa la vicinanza del demone già calcolata da inseguimento.js (0 = alla distanza "stabile", 1 = addosso).
// L'intensità la segue in fretta quando sale e piano quando scende (non si azzera mai di colpo). Quattro livelli:
//   1 PRESENZA LONTANA (< 0,3)   eventi rari: un'ombra che attraversa, un lampione che trema, un bisbiglio lontano, la
//                                ragazza per un istante lontana o ai margini dello schermo
//   2 PARANOIA IN AUMENTO (0,3)  palazzi che si piegano per un attimo verso la strada, luci che si spengono e
//                                riaccendono, ombre a forma umana, piccole oscillazioni della telecamera, bisbigli da
//                                lati diversi, la ragazza dietro un'auto o che attraversa la strada a scatti
//   3 REALTÀ INSTABILE (0,55)    bordi che si sdoppiano in rosso e azzurro, prospettiva che si storce e torna, finestre di
//                                un giallo sbagliato che si spengono, respiri alle spalle, il bordone grave; raro:
//                                il JUMPSCARE della ragazza davanti alla telecamera
//   4 PARANOIA CRITICA (0,8)     tutto più fitto e stratificato, gli occhi del demone più grandi, luci che pulsano
// Gli eventi sono casuali (processi di Poisson: non si possono prevedere guardando il tempo), con pause minime tra
// quelli importanti, al massimo una ragazza alla volta, e ogni tanto qualche secondo di silenzio.
//
// SICUREZZA. Tutto è solo da vedere e da sentire: niente collisioni, i comandi non cambiano, il ragazzo e il demone
// non vengono spostati. La ragazza è lo stesso modello degli ostacoli (preso in prestito dalla stessa riserva).
// Il jumpscare parte solo se nella corsia del ragazzo non arriva niente per un po', mai con il pulsante SALTA acceso,
// mai durante i sensi di colpa o l'orologio. Le deformazioni toccano solo ciò che sta sopra i 2,5 metri (palazzi,
// lampioni, alberi): strada, corsie, auto e ostacoli restano dove sono. Alla morte e al finale tutto si spegne;
// RIPROVA lo azzera. Un solo sistema, aggiornato dalla corsa a ogni fotogramma: nessun timer del browser.
PZ.creaParanoia = function (o) {
  const CFG = PZ.CONFIG.strada.paranoia, scena = o.scena, citta = o.citta, ragazze = o.ragazze, stage = o.stage;
  const MAT = citta.materiali, SOSTA = citta.SOSTA, LC = citta.LC, V3 = THREE.Vector3;
  const rnd = PZ.ps1.casuale(11 + Math.floor(Math.random() * 1e9));
  const liscia = function (a, b, v) { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
  const audio = function () { return PZ.audio.paranoia; };

  // ---------- Palazzi che si piegano: una piccola aggiunta ai materiali della città (solo sopra i 2,5 m) ----------
  const U = { uPiega: { value: 0 }, uOnda: { value: 0 }, uTempo: { value: 0 } };
  ['facciate', 'negozi', 'colori', 'luci', 'insegne', 'aloni'].forEach(function (n) {
    const m = MAT[n]; if (!m) return;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uPiega = U.uPiega; sh.uniforms.uOnda = U.uOnda; sh.uniforms.uTempo = U.uTempo;
      sh.vertexShader = 'uniform float uPiega; uniform float uOnda; uniform float uTempo;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  float hP = clamp((position.y - 2.5) / 12.0, 0.0, 1.0);\n' +
        '  transformed.x -= sign(position.x) * uPiega * hP * (0.85 + 0.15 * sin(uTempo * 2.0 + position.z * 0.15));\n' +
        '  transformed.z += uOnda * hP * sin(uTempo * 6.0 + position.y * 0.7 + position.x * 0.3);');
    };
    m.needsUpdate = true;
  });

  // ---------- Ombre che attraversano la strada (a terra; da lontano sembrano persone) ----------
  const texOmbra = (function () {
    const c = document.createElement('canvas'); c.width = 32; c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 34, 2, 16, 34, 30);
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = 'rgba(0,0,0,0.9)';
    g.beginPath(); g.ellipse(16, 8, 5, 6, 0, 0, 7); g.fill();                    // testa
    g.beginPath(); g.moveTo(8, 16); g.lineTo(24, 16); g.lineTo(21, 44); g.lineTo(18, 63); g.lineTo(14, 63); g.lineTo(11, 44); g.closePath(); g.fill();   // corpo allungato
    g.fillRect(4, 18, 4, 22); g.fillRect(24, 18, 4, 22);                           // braccia lunghe
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texOmbra, transparent: true, opacity: 0,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
  ombra.visible = false; scena.add(ombra);

  // ---------- Stato ----------
  const P = { valore: 0, livello: 0, t: 0, silenzio: 0, ultimaMaggiore: -99, ultimaRagazza: -99, ultimoJump: -999, prossimoJump: 0,
    app: null, ombra: null, piega: null, cam: { roll: 0, fov: 0, x: 0, y: 0 }, camEv: null, finestre: null, attiva: true,
    conto: { periferica: 0, lontano: 0, dietroAuto: 0, attraversa: 0, jumpscare: 0, bisbiglio: 0, respiro: 0, risata: 0, ombra: 0, lampioni: 0, finestre: 0, piega: 0, camera: 0, cromatico: 0 } };
  // frequenze (eventi al secondo) ai quattro livelli: si passa dall'una all'altra in modo continuo
  const F = {
    bisbiglio: [0.05, 0.12, 0.22, 0.38], respiro: [0, 0.025, 0.06, 0.09], risata: [0, 0, 0.012, 0.025],
    ombra: [0.03, 0.06, 0.09, 0.12], lampioni: [0.04, 0.07, 0.12, 0.2], finestre: [0.01, 0.04, 0.07, 0.1],
    piega: [0, 0.035, 0.06, 0.09], camera: [0, 0.035, 0.07, 0.1], cromatico: [0, 0, 0.04, 0.08],
    periferica: [0.012, 0.03, 0.05, 0.06], lontano: [0.015, 0.025, 0.03, 0.03], dietroAuto: [0, 0.02, 0.035, 0.04], attraversa: [0, 0.015, 0.03, 0.04],
    jumpscare: [0, 0, 0.02, 0.06]
  };
  function tasso(nome, v) {
    const a = F[nome], x = Math.max(0, Math.min(3, v / 0.27)), i = Math.min(2, Math.floor(x)), k = x - i;
    return a[i] + (a[i + 1] - a[i]) * k;
  }
  function succede(nome, v, dt) { return rnd() < tasso(nome, v) * dt; }

  // ---------- La ragazza (presa in prestito dalla riserva degli ostacoli) ----------
  function prendiRagazza(pose) { const r = ragazze.prendiUna(pose, rnd); if (r) { r.mostra(); r.gruppo.rotation.set(0, 0, 0); r.gruppo.scale.set(1, 1, 1); } return r; }
  function lasciaRagazza() { const a = P.app; if (!a) return; a.r.nascondi(); a.r.gruppo.scale.set(1, 1, 1); ragazze.rilascia(a.r); P.app = null; }
  function nuovaApparizione(tipo, info) {
    let x, z, durata, pose = ['fissa', 'piedi', 'braccia'], dati = {};
    const lato = rnd() < 0.5 ? -1 : 1;
    if (tipo === 'periferica') { x = lato * (SOSTA + 0.5 + rnd() * 0.7); z = -(7 + rnd() * 5); durata = 0.16 + rnd() * 0.18; pose = ['fissa']; }
    else if (tipo === 'lontano') { x = rnd() < 0.5 ? (Math.floor(rnd() * 3) - 1) * LC : lato * (SOSTA + 0.4); z = -(46 + rnd() * 14); durata = 1.1 + rnd() * 1.4; }
    else if (tipo === 'dietroAuto') {
      const a = (info.auto || []).filter(function (c) { return !c.urtata && c.z < -32 && c.z > -62; })[0];
      if (!a) return false;
      const fuori = a.corsia === 0 ? -1 : a.corsia === 2 ? 1 : lato;
      x = a.x + fuori * (a.W / 2 + 0.25); z = a.z - a.L / 2 - 0.45; durata = 0.9 + rnd() * 0.7; dati.auto = a; pose = ['fissa'];
    } else if (tipo === 'attraversa') { x = lato * (SOSTA + 0.6); z = -(40 + rnd() * 12); durata = 2.2; dati.verso = -lato; dati.scatto = 0; dati.fermo = 0.15; pose = ['piedi', 'fissa']; }
    else if (tipo === 'jumpscare') { x = 0; z = 0; durata = 0.42; pose = ['braccia', 'fissa']; dati.lato = lato; }
    const r = prendiRagazza(pose);
    if (!r) return false;
    P.app = { r: r, tipo: tipo, x: x, z: z, vita: 0, durata: durata, d: dati };
    r.gruppo.position.set(x, 0, z);
    P.conto[tipo]++; P.ultimaRagazza = P.t;
    // un bisbiglio che arriva da dove sta lei (non per il jumpscare: lì c'è il suo suono)
    if (tipo !== 'jumpscare' && tipo !== 'periferica' && rnd() < 0.5 && audio()) audio().bisbiglio(Math.max(-1, Math.min(1, (x - info.camX) / 4)), 0.25, true);
    return true;
  }
  const tmp = new V3(), avanti = new V3(), destra = new V3();
  function aggiornaApparizione(dt, avanza, info) {
    const a = P.app; if (!a) return;
    a.vita += dt;
    const r = a.r;
    if (a.tipo === 'jumpscare') {
      // davanti alla telecamera, di lato: si avvicina di scatto, resta un istante immobile, sparisce
      const cam = info.camera; cam.updateMatrixWorld();
      avanti.set(0, 0, -1).applyQuaternion(cam.quaternion); destra.set(1, 0, 0).applyQuaternion(cam.quaternion);
      const u = Math.min(1, a.vita / 0.14), d = 2.3 - 1.25 * (1 - Math.pow(1 - u, 3));
      tmp.copy(cam.position).addScaledVector(avanti, d).addScaledVector(destra, a.d.lato * 0.3);
      tmp.y -= 1.42;
      r.gruppo.position.copy(tmp);
      r.gruppo.lookAt(cam.position.x, tmp.y, cam.position.z);
      r.gruppo.rotation.z = 0.25 * a.d.lato * (1 - u);
      r.aggiorna(dt * 0.2, 1);
      r.gruppo.visible = true;
    } else {
      a.z += avanza;                                  // ferma rispetto alla strada (o all'auto, se è dietro un'auto)
      if (a.d.auto) { a.z = a.d.auto.z - a.d.auto.L / 2 - 0.45; a.x = a.d.auto.x + (a.x > a.d.auto.x ? 1 : -1) * (a.d.auto.W / 2 + 0.25); }
      if (a.tipo === 'attraversa') {                  // a scatti: uno scatto velocissimo, poi immobile
        if (a.d.fermo > 0) a.d.fermo -= dt;
        else { a.d.scatto += dt; a.x += a.d.verso * 9 * dt; if (a.d.scatto > 0.12 + rnd() * 0.08) { a.d.scatto = 0; a.d.fermo = 0.18 + rnd() * 0.35; } }
        if (Math.abs(a.x) > SOSTA + 0.8 && a.vita > 0.6) a.durata = 0;
      }
      r.gruppo.position.set(a.x, 0, a.z);
      r.gruppo.rotation.y = Math.atan2(info.camX - a.x, 6 - a.z);       // guarda verso il ragazzo
      r.aggiorna(dt, 0.8);
      // sparisce prima che lui ci arrivi, o appena finisce il suo tempo
      if ((a.tipo === 'lontano' && a.z > -30) || (a.tipo === 'dietroAuto' && a.z > -24) || (a.tipo === 'attraversa' && a.z > -26)) a.durata = 0;
    }
    if (a.vita >= a.durata) lasciaRagazza();
  }

  // ---------- Aggiornamento ----------
  // dt: secondi del mondo (rallentati dall'orologio); dtVero: per la telecamera e gli effetti a schermo;
  // info: { vicinanza, metri, avanza (metri di strada in questo fotogramma), camera, camX, auto, liberoDavanti (s),
  //         pronto (SALTA acceso), colpa, buio, lento, risalto(f) }
  function aggiorna(dt, dtVero, info) {
    if (!P.attiva) return;
    P.t += dt; U.uTempo.value += dtVero;
    // intensità: sale in fretta (mezzo secondo), scende piano (tre secondi)
    const bersaglio = info.metri < CFG.da ? 0 : Math.max(0, Math.min(1, info.vicinanza));
    P.valore += (bersaglio - P.valore) * (1 - Math.exp(-dt / (bersaglio > P.valore ? 0.5 : 3)));
    const v = P.valore;
    P.livello = info.metri < CFG.da ? 0 : v < 0.3 ? 1 : v < 0.55 ? 2 : v < 0.8 ? 3 : 4;
    if (P.livello === 0) { aggiornaApparizione(dt, info.avanza, info); finiEffetti(dtVero); return; }
    const fitto = info.colpa || info.buio > 0.5;   // durante i sensi di colpa e il blackout: meno effetti a schermo
    // silenzio: ogni tanto qualche secondo senza bisbigli
    if (P.silenzio > 0) P.silenzio -= dt; else if (rnd() < 0.04 * dt) P.silenzio = 3 + rnd() * 5;
    const A = audio();
    if (A && P.silenzio <= 0) {
      if (succede('bisbiglio', v, dt)) { P.conto.bisbiglio++; const dietro = rnd() < 0.3; A.bisbiglio((rnd() * 2 - 1) * (dietro ? 0.3 : 1), (dietro ? 0.18 : 0.12) + 0.2 * v, dietro || rnd() < 0.5); }
      if (succede('respiro', v, dt)) { P.conto.respiro++; A.respiro((rnd() - 0.5) * 0.6, 0.22 + 0.15 * v, true); }
      if (succede('risata', v, dt)) { P.conto.risata++; A.risata(rnd() * 2 - 1, 0.12); }
    }
    if (A) A.bordone(liscia(0.5, 1, v));
    // la città
    if (succede('lampioni', v, dt)) { P.conto.lampioni++; o.atmosfera.sfarfalla(0.25 + 0.35 * rnd()); }
    if (!P.finestre && succede('finestre', v, dt)) { P.conto.finestre++; P.finestre = { t: 0, tinta: v > 0.55 ? 0xff3a10 : 0xffe040 }; }
    if (!P.ombra && succede('ombra', v, dt)) {
      P.conto.ombra++; const lato = rnd() < 0.5 ? -1 : 1;
      P.ombra = { x: lato * 9, z: -(13 + rnd() * 14), vx: -lato * (16 + rnd() * 6), umana: v > 0.3 || rnd() < 0.3 };
    }
    const libera = P.t - P.ultimaMaggiore > 2.5;
    if (libera && !fitto && !P.piega && succede('piega', v, dt)) { P.conto.piega++; P.ultimaMaggiore = P.t; P.piega = { t: 0, forza: 0.35 + 0.9 * v, onda: v > 0.55 ? 0.25 : 0 }; }
    if (libera && !fitto && !P.camEv && succede('camera', v, dt)) { P.conto.camera++; P.ultimaMaggiore = P.t; P.camEv = { t: 0, roll: (rnd() < 0.5 ? -1 : 1) * (0.03 + 0.05 * v), fov: (rnd() < 0.5 ? -1 : 1) * (3 + 6 * v) }; }
    if (libera && !fitto && succede('cromatico', v, dt)) { P.conto.cromatico++; P.ultimaMaggiore = P.t; PZ.riavviaClasse(stage, 'cromatico'); P.cromatico = 0.32; }
    // la ragazza
    if (!P.app && info.metri >= CFG.ragazzaDa && P.t - P.ultimaRagazza > 4) {
      const tipi = ['periferica', 'lontano', 'dietroAuto', 'attraversa'];
      for (let i = 0; i < tipi.length && !P.app; i++) if (succede(tipi[i], v, dt)) nuovaApparizione(tipi[i], info);
      // JUMPSCARE: raro, mai due vicini, solo quando nella sua corsia non arriva niente per un po'
      // (fase 65) solo nella STORIA (mai nell'arcade); se a CFG.jumpscareSicuro metri non è ancora capitato, parte
      // appena la corsia davanti è libera: almeno uno per run
      const storia = !(PZ.arcade && PZ.arcade.attiva), dovuto = storia && P.conto.jumpscare === 0 && info.metri >= (CFG.jumpscareSicuro || 1e9);
      if (storia && !P.app && info.metri >= CFG.jumpscareDa && P.t >= P.prossimoJump && !info.colpa && info.lento > 0.99 && !info.pronto &&
          info.liberoDavanti > 1.3 && (dovuto || succede('jumpscare', v, dt))) {
        if (nuovaApparizione('jumpscare', info)) {
          P.ultimoJump = P.t; P.prossimoJump = P.t + CFG.pausaJumpscare[0] + rnd() * (CFG.pausaJumpscare[1] - CFG.pausaJumpscare[0]);
          P.ultimaMaggiore = P.t;
          if (A) A.jumpscare();
          PZ.riavviaClasse(stage, 'anomaliaBreve');
          if (o.lampo) o.lampo('jump');
        }
      }
    }
    aggiornaApparizione(dt, info.avanza, info);
    finiEffetti(dtVero, info);
    // il demone più minaccioso al livello 4: occhi più grandi (insieme al blackout)
    if (info.risalto) info.risalto(Math.max(info.buio, 0.7 * liscia(0.8, 1, v)));
  }
  // gli effetti in corso: si chiudono da soli, sempre in modo morbido
  function finiEffetti(dtVero, info) {
    const v = P.valore;
    if (P.ombra) {
      const s = P.ombra; s.x += s.vx * dtVero; s.z += (info ? info.avanza : 0);
      ombra.visible = true; ombra.position.set(s.x, 0.02, s.z); ombra.rotation.y = s.vx > 0 ? -1.3 : 1.3; ombra.scale.set(s.umana ? 1 : 1.6, 1, s.umana ? 1 : 0.6);
      ombra.material.opacity = 0.42 * Math.min(1, (9 - Math.abs(s.x)) / 2);
      if (Math.abs(s.x) > 9.5 && Math.sign(s.x) === Math.sign(s.vx)) { P.ombra = null; ombra.visible = false; }
    }
    if (P.piega) {
      const e = P.piega; e.t += dtVero;
      const k = e.t < 0.35 ? liscia(0, 0.35, e.t) : 1 - liscia(0.6, 1.3, e.t);
      U.uPiega.value = e.forza * k; U.uOnda.value = e.onda * k;
      if (e.t >= 1.3) { P.piega = null; U.uPiega.value = 0; U.uOnda.value = 0; }
    }
    if (P.camEv) {
      const e = P.camEv; e.t += dtVero;
      const k = e.t < 0.25 ? liscia(0, 0.25, e.t) : 1 - liscia(0.45, 1.2, e.t);
      P.cam.roll = e.roll * k; P.cam.fov = e.fov * k;
      if (e.t >= 1.2) { P.camEv = null; P.cam.roll = 0; P.cam.fov = 0; }
    }
    // piccole oscillazioni continue della telecamera ai livelli alti
    const tremito = liscia(0.45, 1, v) * 0.03;
    P.cam.x = tremito * Math.sin(U.uTempo.value * 7.1); P.cam.y = tremito * 0.7 * Math.sin(U.uTempo.value * 5.3 + 1);
    if (P.finestre) {
      const e = P.finestre; e.t += dtVero;
      // si accendono di un colore sbagliato, poi si spengono quasi tutte, poi tornano normali
      if (e.t < 0.35) o.atmosfera.finestre(e.tinta, 0.8, 1.5); else if (e.t < 0.9) o.atmosfera.finestre(e.tinta, 0.5, 0.15); else { o.atmosfera.finestre(null, 0, 1); P.finestre = null; }
    }
    if (P.cromatico > 0) { P.cromatico -= dtVero; if (P.cromatico <= 0) stage.classList.remove('cromatico'); }
    PZ.opacita(o.velo, 0.75 * liscia(0.55, 1, v) * (0.75 + 0.25 * Math.sin(U.uTempo.value * 3.3)));
  }
  // morte o finale: tutto si spegne (le figure spariscono, i suoni sfumano, la città torna dritta)
  function ferma() {
    P.attiva = false; pulisci();
  }
  function pulisci() {
    lasciaRagazza(); P.ombra = null; ombra.visible = false; P.piega = null; U.uPiega.value = 0; U.uOnda.value = 0;
    P.camEv = null; P.cam.roll = 0; P.cam.fov = 0; P.cam.x = 0; P.cam.y = 0;
    if (P.finestre) { o.atmosfera.finestre(null, 0, 1); P.finestre = null; }
    P.cromatico = 0; stage.classList.remove('cromatico');
    PZ.opacita(o.velo, 0);
    if (audio()) audio().zittisci();
  }
  function reset() {
    pulisci();
    P.attiva = true; P.valore = 0; P.livello = 0; P.t = 0; P.silenzio = 0; P.ultimaMaggiore = -99; P.ultimaRagazza = -99; P.ultimoJump = -999;
    P.prossimoJump = CFG.pausaJumpscare[0] * 0.3;
    Object.keys(P.conto).forEach(function (k) { P.conto[k] = 0; });
  }
  reset();
  return { aggiorna: aggiorna, ferma: ferma, reset: reset, stato: P, uniformi: U, ombra: ombra, nuova: function (tipo, info) { return nuovaApparizione(tipo, info); } };
};
