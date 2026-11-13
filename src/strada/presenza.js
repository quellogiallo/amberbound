// (fase 66) LA PRESENZA DEL DEMONE ALLE TUE SPALLE.
// Quando il demone è vicino non lo vedi (è dietro la telecamera), ma lo SENTI:
//  - LE MANONE: le sue due mani artigliate entrano dai lati dello schermo (all'altezza del ragazzo, sopra i pulsanti), come se ti stesse allungando le
//    braccia addosso da dietro. Più è vicino più entrano; tremano, e a turno scattano in avanti per afferrarti.
//    Sono le stesse manone del demone (PZ.manoneDemone), con un alone viola dietro che le stacca dalla strada buia.
//    Arrivano solo ai lati del ragazzo: lui, la strada davanti e gli ostacoli si vedono sempre.
//  - IL ROSSO: la città vira al rosso sangue (foschia, cielo, luci, finestre) e pulsa col battito del cuore.
//  - I SUONI: il battito più forte, il suo ringhio e il suo respiro alle spalle, da destra o da sinistra.
// Tutto dipende solo dalla distanza del demone (inseguimento.js): niente cambia nel gioco, solo quello che vedi e senti.
PZ.creaPresenza = function (o) {
  const scena = o.scena, camera = o.camera, atmosfera = o.atmosfera, C = PZ.CONFIG.strada.demone.presenza;
  const V3 = THREE.Vector3, rnd = PZ.ps1.casuale(6606);
  const liscia = function (a, b, v) { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
  const SCALA = 0.52;
  // le due manone: s = +1 quella a destra dello schermo, -1 a sinistra (il pollice verso il centro)
  const mani = [1, -1].map(function (s) {
    const g = new THREE.Group(), m = PZ.manoneDemone(s);
    m.scale.setScalar(SCALA); g.add(m);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.auraViola(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
    aura.position.set(0, -0.22, -0.06); aura.scale.set(0.75, 0.9, 1); g.add(aura);
    g.traverse(function (x) { x.frustumCulled = false; x.renderOrder = 5; });
    g.visible = false; scena.add(g);
    return { s: s, g: g, aura: aura, scatto: 0, prossimo: 0.6 + rnd() * 1.2, tremaT: 0, tx: 0, ty: 0, tz: 0 };
  });
  const P = { entra: 0, rosso: 0, battito: 0, ringhio: 1.5, respiro: 3, attiva: false };
  const W = new V3(), A = new V3(), Y = new V3(), Z = new V3(), X = new V3(), GIU = new V3(0, -1, 0), M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), q = new THREE.Quaternion();

  // posa di una mano nello spazio della telecamera: il polso fuori dal bordo dello schermo, le dita che puntano verso
  // il ragazzo, il palmo in giù, gli artigli piegati per afferrare
  function posa(mano, e, dt) {
    const s = mano.s;
    // lo scatto per afferrare: va in avanti di colpo, poi torna piano
    mano.prossimo -= dt;
    if (mano.prossimo <= 0 && e > 0.3) { mano.scatto = 1; mano.prossimo = 0.8 + rnd() * 1.4 - 0.4 * e; }
    const sc = mano.scatto; mano.scatto = Math.max(0, mano.scatto - dt / 0.45);
    const k = sc > 0.75 ? (1 - sc) / 0.25 : sc / 0.75;            // sale in un attimo, scende piano
    // tremito nervoso: un nuovo strattone ogni 1/20 di secondo
    mano.tremaT -= dt;
    if (mano.tremaT <= 0) { mano.tremaT = 0.05; const a = 0.012 + 0.02 * e; mano.tx = (rnd() - 0.5) * a; mano.ty = (rnd() - 0.5) * a; mano.tz = (rnd() - 0.5) * a; }
    W.set(s * (0.86 - 0.46 * e - 0.06 * k) + mano.tx, -0.43 + 0.03 * k + mano.ty, -1.25 - 0.12 * k + mano.tz);
    A.set(s * 0.1, -0.36 + 0.04 * k, -2.7);                  // verso il ragazzo, ai suoi lati: non lo coprono mai
    Y.subVectors(W, A).normalize();                                 // la mano "pende" lungo -y: -y verso il bersaglio
    Z.copy(GIU).addScaledVector(Y, -GIU.dot(Y)).normalize();        // le dita si piegano verso il basso (palmo in giù)
    Z.applyAxisAngle(Y, s * 0.7);                                    // girate sul fianco: si vedono gli artigli aperti verso di lui
    X.crossVectors(Y, Z);
    M.makeBasis(X, Y, Z).setPosition(W);
    M2.multiplyMatrices(camera.matrixWorld, M);
    M2.decompose(mano.g.position, mano.g.quaternion, mano.g.scale);
    // artigli che si chiudono nello scatto: la mano ruota sulle nocche
    q.setFromAxisAngle(X.set(1, 0, 0), 0.35 * k); mano.g.children[0].quaternion.copy(q);
  }

  // dist: metri del demone; attivo: false = va via (morte, finale, manata, demone nascosto); vicinanza: 0..1
  function aggiorna(dt, info) {
    const attivo = !!info.attivo, dist = attivo ? info.dist : 99;
    const ob = liscia(C.da, C.pieno, dist);
    // entrano in fretta, escono piano
    P.entra += (ob - P.entra) * (1 - Math.exp(-dt * (ob > P.entra ? 5 : 2.2)));
    const e = P.entra, vis = e > 0.01;
    camera.updateMatrixWorld();
    mani.forEach(function (m) {
      m.g.visible = vis;
      if (vis) { posa(m, e, dt); m.aura.material.opacity = 0.6 * e; }
    });
    // il battito: il rosso pulsa a ogni colpo
    P.battito = Math.max(0, P.battito - dt * 2.5);
    const vic = attivo ? Math.max(0, Math.min(1, info.vicinanza || 0)) : 0;
    const bersaglio = C.rosso * liscia(0.3, 1, vic) * (0.82 + 0.18 * P.battito);
    P.rosso += (bersaglio - P.rosso) * (1 - Math.exp(-dt * (bersaglio > P.rosso ? 6 : 1.5)));
    if (atmosfera) atmosfera.pericolo(P.rosso);
    // suoni alle spalle: il ringhio (più spesso più è vicino) e il respiro (solo molto vicino)
    const A0 = PZ.audio;
    if (attivo && e > 0.2) {
      P.ringhio -= dt;
      if (P.ringhio <= 0) { P.ringhio = 3.2 - 2 * e + rnd() * 1.6; if (A0.ringhio) A0.ringhio(0.35 + 0.65 * e, (rnd() - 0.5) * 0.9); }
      P.respiro -= dt;
      if (e > 0.5 && P.respiro <= 0) { P.respiro = 3.5 + rnd() * 2.5; if (A0.paranoia && A0.paranoia.respiro) A0.paranoia.respiro((rnd() - 0.5) * 0.5, 0.25 + 0.25 * e, true); }
    } else { P.ringhio = Math.max(P.ringhio, 0.8); P.respiro = Math.max(P.respiro, 1.5); }
  }
  function battito() { P.battito = 1; }
  function reset() {
    P.entra = 0; P.rosso = 0; P.battito = 0; P.ringhio = 1.2; P.respiro = 3;
    mani.forEach(function (m) { m.g.visible = false; m.scatto = 0; });
    if (atmosfera) atmosfera.pericolo(0);
  }
  return { aggiorna: aggiorna, battito: battito, reset: reset, stato: P };
};
