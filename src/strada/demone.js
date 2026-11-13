// I demoni della paranoia. Figure umanoidi nere, troppo lunghe, coperte di occhi gialli che guardano sempre il
// ragazzo; al centro della fronte un occhio enorme, il dettaglio che le fa riconoscere da lontano.
//
//  - PZ.creaOcchi: tutti gli occhi di tutte le creature in un solo sistema (due "InstancedMesh": il bianco e
//    l'iride). Ogni occhio è attaccato a un pezzo del corpo, l'iride si sposta verso il ragazzo, ogni tanto
//    scatta altrove o sbatte la palpebra. Costa due sole chiamate alla scheda video per tutti gli occhi.
//  - PZ.corpoCreatura: scheletro snodato (bacino, busto, collo, testa, braccia, gambe) fatto di pezzi sfaccettati.
//  - PZ.creaDemone: il demone che insegue, snodato e animato (cammina, corre, afferra), con movimenti innaturali.
//  - PZ.creaSagoma: le sagome secondarie, in pose diverse, con il corpo unito in un pezzo solo (leggere) e la testa
//    libera di scattare.
// Coordinate di una creatura: guarda verso +z, y in su, +x = la SUA sinistra.
PZ.creaOcchi = function (scena, capacita) {
  const V3 = THREE.Vector3;
  // iride: anello ambrato scuro, giallo acceso, pupilla nera, riflesso bianco
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 2, 16, 16, 16);
  gr.addColorStop(0, '#fff1a0'); gr.addColorStop(0.45, '#ffd23a'); gr.addColorStop(0.8, '#e09a10'); gr.addColorStop(1, '#6a3a00');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#050307'; g.beginPath(); g.arc(16, 16, 5.5, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.fillRect(19, 10, 3, 3);
  const tex = new THREE.CanvasTexture(c); tex.magFilter = tex.minFilter = THREE.NearestFilter;
  const matS = new THREE.MeshBasicMaterial({ color: 0xd9d0aa, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const matI = new THREE.MeshBasicMaterial({ map: tex, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const sclere = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), matS, capacita);
  const iridi = new THREE.InstancedMesh(new THREE.CircleGeometry(0.62, 10), matI, capacita);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  [sclere, iridi].forEach(function (m) {
    m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < capacita; i++) m.setMatrixAt(i, ZERO);
    scena.add(m);
  });
  const elenco = [], rnd = PZ.ps1.casuale(808);
  let risalto = 0;
  // proprietario: la creatura (ha .visibile e .scala), genitore: il pezzo del corpo a cui è attaccato l'occhio
  function aggiungi(proprietario, genitore, pos, normale, r) {
    if (elenco.length >= capacita) return -1;
    elenco.push({ prop: proprietario, gen: genitore, pos: new V3().fromArray(pos), n: new V3().fromArray(normale).normalize(), r: r,
      palpebra: 1 + rnd() * 5, chiude: 0, sx: 0, sy: 0, tScatto: rnd() * 2 });
    return elenco.length - 1;
  }
  const p = new V3(), n = new V3(), d = new V3(), ax = new V3(), ay = new V3(), o3 = new V3(), s = new V3();
  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), Z = new V3(0, 0, 1);
  // bersaglio: punto del mondo che gli occhi fissano (la testa del ragazzo)
  function aggiorna(dt, bersaglio) {
    for (let i = 0; i < elenco.length; i++) {
      const o = elenco[i];
      if (!o.prop.visibile) { sclere.setMatrixAt(i, ZERO); iridi.setMatrixAt(i, ZERO); continue; }
      p.copy(o.pos).applyMatrix4(o.gen.matrixWorld);
      n.copy(o.n).transformDirection(o.gen.matrixWorld);
      q.setFromUnitVectors(Z, n);
      // palpebre: ogni occhio sbatte per conto suo, a intervalli irregolari
      o.palpebra -= dt;
      if (o.palpebra <= 0) { o.chiude = 0.16; o.palpebra = 1.2 + rnd() * 5.5; }
      let ap = 1;
      if (o.chiude > 0) { o.chiude -= dt; ap = Math.max(0.05, Math.min(1, Math.abs(o.chiude / 0.08 - 1))); }
      const r = o.r * (o.prop.scala || 1) * (1 + 0.45 * risalto);   // nel blackout gli occhi si fanno più grandi
      s.set(r, r * ap, r);
      m.compose(p, q, s); sclere.setMatrixAt(i, m);
      // l'iride guarda il bersaglio, con piccoli scatti nervosi
      ax.set(1, 0, 0).applyQuaternion(q); ay.set(0, 1, 0).applyQuaternion(q);
      d.copy(bersaglio).sub(p).normalize();
      o.tScatto -= dt;
      if (o.tScatto <= 0) { o.sx = (rnd() - 0.5); o.sy = (rnd() - 0.5); o.tScatto = 0.5 + rnd() * 2.2; }
      const ag = o.prop.agitazione === undefined ? 0.35 : o.prop.agitazione;
      const ox = Math.max(-0.42, Math.min(0.42, d.dot(ax) * 1.3 + o.sx * ag)), oy = Math.max(-0.42, Math.min(0.42, d.dot(ay) * 1.3 + o.sy * ag));
      o3.copy(p).addScaledVector(n, r * 0.04).addScaledVector(ax, ox * r * 0.6).addScaledVector(ay, oy * r * 0.6);
      m.compose(o3, q, s); iridi.setMatrixAt(i, m);
    }
    sclere.instanceMatrix.needsUpdate = true; iridi.instanceMatrix.needsUpdate = true;
  }
  return { aggiungi: aggiungi, aggiorna: aggiorna, elenco: elenco, sclere: sclere, iridi: iridi, risalto: function (v) { risalto = v; } };
};

// Materiale del corpo: nero con un velo viola, NON toccato dalla foschia (da lontano resta una sagoma nera)
PZ.materialeDemoni = (function () {
  let m = null;
  return function () { return m || (m = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false })); };
})();
PZ.bagliore = (function () {   // alone giallo per l'occhio grande, visibile anche da lontano
  let t = null;
  return function () {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,230,120,1)'); gr.addColorStop(0.25, 'rgba(255,200,60,.6)'); gr.addColorStop(1, 'rgba(255,170,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    t = new THREE.CanvasTexture(c); return t;
  };
})();

PZ.auraViola = (function () {   // luce viola alle spalle delle sagome: di notte le stacca dal fondo scuro
  let t = null;
  return function () {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 2, 16, 16, 16);
    gr.addColorStop(0, 'rgba(120,60,170,.9)'); gr.addColorStop(0.5, 'rgba(80,30,120,.45)'); gr.addColorStop(1, 'rgba(40,10,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    t = new THREE.CanvasTexture(c); return t;
  };
})();

// Scheletro di una creatura. prop: proporzioni (metri). Restituisce i giunti (Group) e l'elenco degli occhi.
PZ.corpoCreatura = function (prop) {
  const P = Object.assign({ anca: 1.5, coscia: 0.8, gamba: 0.8, busto: 1.0, spalle: 0.5, vita: 0.28, collo: 0.32,
    testa: 1, braccio: 0.78, avambraccio: 0.8, dita: 0.3, magrezza: 1, seme: 1 }, prop || {});
  const rnd = PZ.ps1.casuale(P.seme), MAT = PZ.materialeDemoni();
  const tono = function () { const v = rnd(); return v < 0.33 ? 0x0c0a11 : v < 0.66 ? 0x120f19 : 0x17131f; };
  const k = P.magrezza;
  function pezzo(genitore, costruisci) {
    const C = new PZ.Costruttore(); costruisci(C);
    const gr = C.crea({ corpo: MAT }); const mesh = gr.children[0];
    gr.remove(mesh); mesh.matrixAutoUpdate = true; genitore.add(mesh);
    return mesh;
  }
  function cil(rTop, rBot, lati) { return new THREE.CylinderGeometry(rTop, rBot, 1, lati); }
  const G = { radice: new THREE.Group(), bacino: new THREE.Group(), busto: new THREE.Group(), collo: new THREE.Group(), testa: new THREE.Group(),
    spalla: [new THREE.Group(), new THREE.Group()], gomito: [new THREE.Group(), new THREE.Group()], polso: [new THREE.Group(), new THREE.Group()],
    anca: [new THREE.Group(), new THREE.Group()], ginocchio: [new THREE.Group(), new THREE.Group()], caviglia: [new THREE.Group(), new THREE.Group()] };
  const meshes = [];
  G.radice.add(G.bacino); G.bacino.position.y = P.anca;
  G.bacino.add(G.busto); G.busto.position.y = 0.06;
  G.busto.add(G.collo); G.collo.position.set(0, P.busto, 0.02);
  G.collo.add(G.testa); G.testa.position.y = P.collo;
  // bacino
  meshes.push(pezzo(G.bacino, function (C) { C.geo('corpo', cil(0.15 * k, 0.12 * k, 6), 0, 0, 0, 0, 0, 0, tono(), 1, 0.24, 0.75); }));
  // busto: stretto in vita, spalle larghe e magre, schiena incurvata; costole appena accennate
  meshes.push(pezzo(G.busto, function (C) {
    C.geo('corpo', cil(P.spalle / 2 * k, P.vita / 2 * k, 6), 0, P.busto / 2, 0, 0, 0, 0, tono(), 1, P.busto, 0.62);
    for (let i = 0; i < 4; i++) C.scatola('corpo', P.spalle * 0.7 * k, 0.03, 0.05, 0, P.busto * (0.45 + i * 0.11), 0.12 * k, tono(), 0, 0.1, 0);
    for (let i = 0; i < 5; i++) C.sfera('corpo', 0.035, 0, P.busto * (0.15 + i * 0.17), -0.12 * k, tono(), 1, 0.8, 1);   // vertebre
  }));
  // collo e testa: testa lunga, mento a punta
  meshes.push(pezzo(G.collo, function (C) { C.geo('corpo', cil(0.045, 0.06, 5), 0, P.collo / 2, 0, 0, 0, 0, tono(), 1, P.collo, 1); }));
  const T = P.testa;
  meshes.push(pezzo(G.testa, function (C) {
    C.sfera('corpo', 1, 0, 0.18 * T, 0.02, tono(), 0.15 * T, 0.26 * T, 0.17 * T, 1);
    C.geo('corpo', cil(0.0, 0.07 * T, 4), 0, -0.02 * T, 0.05 * T, Math.PI, 0, 0, tono(), 1, 0.16 * T, 1);   // mento
    C.scatola('corpo', 0.2 * T, 0.05 * T, 0.05 * T, 0, 0.21 * T, 0.14 * T, tono());                         // arcata sopra l'occhio
  }));
  // braccia
  [0, 1].forEach(function (i) {
    const s = i === 0 ? 1 : -1;
    G.busto.add(G.spalla[i]); G.spalla[i].position.set(s * (P.spalle / 2 * k - 0.02), P.busto - 0.06, 0);
    G.spalla[i].add(G.gomito[i]); G.gomito[i].position.y = -P.braccio;
    G.gomito[i].add(G.polso[i]); G.polso[i].position.y = -P.avambraccio;
    meshes.push(pezzo(G.spalla[i], function (C) { C.geo('corpo', cil(0.065 * k, 0.045 * k, 5), 0, -P.braccio / 2, 0, 0, 0, 0, tono(), 1, P.braccio, 1); }));
    meshes.push(pezzo(G.gomito[i], function (C) { C.geo('corpo', cil(0.045 * k, 0.03 * k, 5), 0, -P.avambraccio / 2, 0, 0, 0, 0, tono(), 1, P.avambraccio, 1); }));
    meshes.push(pezzo(G.polso[i], function (C) {
      C.scatola('corpo', 0.09, 0.12, 0.035, 0, -0.12, 0, tono());
      for (let f = 0; f < 4; f++) {   // dita lunghe e aperte
        const a = (f - 1.5) * 0.22;
        C.scatola('corpo', 0.018, P.dita, 0.018, Math.sin(a) * 0.12 + (f - 1.5) * 0.02, -0.12 - P.dita / 2, 0.01 * f, tono(), 0, 0, a * 0.8);
      }
    }));
  });
  // gambe
  [0, 1].forEach(function (i) {
    const s = i === 0 ? 1 : -1;
    G.bacino.add(G.anca[i]); G.anca[i].position.set(s * 0.1 * k, -0.04, 0);
    G.anca[i].add(G.ginocchio[i]); G.ginocchio[i].position.y = -P.coscia;
    G.ginocchio[i].add(G.caviglia[i]); G.caviglia[i].position.y = -P.gamba;
    meshes.push(pezzo(G.anca[i], function (C) { C.geo('corpo', cil(0.08 * k, 0.055 * k, 5), 0, -P.coscia / 2, 0, 0, 0, 0, tono(), 1, P.coscia, 1); }));
    meshes.push(pezzo(G.ginocchio[i], function (C) {
      C.geo('corpo', cil(0.055 * k, 0.035 * k, 5), 0, -P.gamba / 2, 0, 0, 0, 0, tono(), 1, P.gamba, 1);
      C.sfera('corpo', 0.05, 0, 0, 0.02, tono(), 1, 1, 1);     // ginocchio sporgente
    }));
    meshes.push(pezzo(G.caviglia[i], function (C) { const pie = cil(0.0, 0.05, 4); pie.rotateY(Math.PI / 4); C.geo('corpo', pie, 0, -0.02, 0.15, Math.PI / 2, 0, 0, tono(), 1, 0.36, 0.6); }));
  });
  // occhi: [giunto, posizione, normale, raggio]. Il primo è l'occhio enorme della fronte.
  const occhi = [
    [G.testa, [0, 0.2 * T, 0.19 * T], [0, 0.12, 1], 0.105 * T],
    [G.testa, [0.126 * T, 0.07 * T, 0.11 * T], [0.85, 0, 0.55], 0.032 * T], [G.testa, [-0.126 * T, 0.07 * T, 0.11 * T], [-0.85, 0, 0.55], 0.032 * T],
    [G.testa, [0.1 * T, 0.36 * T, 0.105 * T], [0.5, 0.5, 0.7], 0.028 * T], [G.testa, [-0.09 * T, 0.34 * T, 0.115 * T], [-0.5, 0.4, 0.75], 0.025 * T],
    [G.testa, [0.03 * T, -0.03 * T, 0.14 * T], [0.1, -0.3, 1], 0.022 * T],
    [G.busto, [0, P.busto * 0.78, 0.15 * k], [0, 0.1, 1], 0.06], [G.busto, [0.12 * k, P.busto * 0.64, 0.135 * k], [0.4, 0, 1], 0.048],
    [G.busto, [-0.11 * k, P.busto * 0.6, 0.13 * k], [-0.4, 0, 1], 0.042], [G.busto, [0.05, P.busto * 0.4, 0.115 * k], [0.1, 0, 1], 0.045],
    [G.busto, [-0.07, P.busto * 0.24, 0.1 * k], [-0.2, 0, 1], 0.038], [G.busto, [0.08, P.busto * 0.1, 0.09 * k], [0.3, -0.2, 1], 0.032],
    [G.busto, [0.05, P.busto * 0.7, -0.155 * k], [0.1, 0, -1], 0.045],
    [G.spalla[0], [0.05 * k, -0.33, 0.035], [0.7, 0, 0.7], 0.038], [G.spalla[1], [-0.05 * k, -0.4, 0.035], [-0.7, 0, 0.7], 0.035],
    [G.gomito[0], [0.035 * k, -0.25, 0.03], [0.7, 0, 0.7], 0.032], [G.gomito[1], [-0.035 * k, -0.2, 0.03], [-0.7, 0, 0.7], 0.03],
    [G.gomito[0], [0.025 * k, -0.6, 0.025], [0.6, 0, 0.8], 0.026], [G.gomito[1], [-0.025 * k, -0.58, 0.025], [-0.6, 0, 0.8], 0.026],
    [G.polso[0], [0, -0.12, 0.02], [0, 0, 1], 0.026], [G.polso[1], [0, -0.12, 0.02], [0, 0, 1], 0.024],
    [G.anca[0], [0.03 * k, -0.32, 0.075 * k], [0.3, 0, 1], 0.042], [G.anca[1], [-0.03 * k, -0.42, 0.07 * k], [-0.3, 0, 1], 0.038],
    [G.ginocchio[0], [0, -0.32, 0.05 * k], [0, 0, 1], 0.034], [G.ginocchio[1], [0, -0.4, 0.048 * k], [0, 0, 1], 0.03]
  ];
  return { G: G, occhi: occhi, meshes: meshes, prop: P };
};

// rumore morbido: somma di sinusoidi con frequenze che non si ripetono mai uguali
PZ.rumoreDemone = function (t, seme) {
  return 0.5 * Math.sin(t * 1.3 + seme) + 0.3 * Math.sin(t * 2.71 + seme * 2.3) + 0.2 * Math.sin(t * 4.37 + seme * 5.1);
};

// ---------- Le MANONE del demone (fase 10) ----------
// Una mano grande, nera, deformata, con dita lunghe e artigli d'osso: la stessa idea della mano della manata, in
// proporzione al corpo (circa 85 cm dal polso alla punta degli artigli). Coordinate del polso: la mano pende verso il
// basso (-y), le dita si piegano in avanti (+z) come se stessero per afferrare. lato: 1 = mano sinistra del demone
// (+x), -1 = destra (il pollice va verso l'interno).
PZ.manoneDemone = function (lato) {
  const V3 = THREE.Vector3, SU = new V3(0, 1, 0), qq = new THREE.Quaternion(), ee = new THREE.Euler(0, 0, 0, 'YXZ'), dd = new V3();
  const C = new PZ.Costruttore(), r = PZ.ps1.casuale(lato > 0 ? 515 : 616);
  const NERO = 0x0b0910, NERO2 = 0x120f19, VENA = 0x1d1626, OSSO = 0x8a8068, PUNTA = 0xc9bf98;
  function osso(k, a, b, r0, r1, col, lati) {
    dd.subVectors(b, a); const l = dd.length(); dd.divideScalar(l || 1);
    qq.setFromUnitVectors(SU, dd); ee.setFromQuaternion(qq, 'YXZ');
    C.geo(k, new THREE.CylinderGeometry(r1, r0, 1, lati || 5), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, ee.x, ee.y, ee.z, col, 1, l, 1);
  }
  function artiglio(a, dir, lung, rr, col) {
    qq.setFromUnitVectors(SU, dd.copy(dir).normalize()); ee.setFromQuaternion(qq, 'YXZ');
    C.geo('a', new THREE.ConeGeometry(rr, lung, 5), a.x + dd.x * lung / 2, a.y + dd.y * lung / 2, a.z + dd.z * lung / 2, ee.x, ee.y, ee.z, col, 1, 1, 1);
  }
  const A = new V3(), M = new V3(), B = new V3(), i = -lato;            // i: verso l'interno del corpo
  // polso gonfio e dorso della mano, storto, con un bozzo e le vene
  osso('m', A.set(0, 0.04, 0), B.set(0, -0.17, 0.01), 0.055, 0.085, NERO2, 6);
  C.sfera('m', 1, 0, -0.29, 0.02, NERO, 0.2, 0.16, 0.085, 1);
  C.sfera('m', 1, i * 0.06, -0.24, -0.06, NERO2, 0.09, 0.08, 0.06, 0);
  for (let v = 0; v < 3; v++) osso('m', A.set((v - 1) * 0.06, -0.16, -0.07), B.set((v - 1) * 0.11, -0.38, -0.06), 0.012, 0.01, VENA, 4);
  // quattro dita lunghe, a ventaglio, con le nocche sporgenti; piegate in avanti come uncini
  for (let f = 0; f < 4; f++) {
    const u = (f - 1.5), ang = u * 0.2, L = (f === 1 || f === 2 ? 1 : 0.86) * (0.92 + r() * 0.16);
    A.set(u * 0.075, -0.4, 0.03);
    M.set(A.x + Math.sin(ang) * 0.17 * L, A.y - 0.2 * L, A.z + 0.05);
    B.set(M.x + Math.sin(ang) * 0.12 * L, M.y - 0.17 * L, M.z + 0.14 * L);
    osso('m', A, M, 0.038, 0.032, f % 2 ? NERO : NERO2, 5);
    C.sfera('m', 0.036, M.x, M.y, M.z, NERO2, 1, 1, 1, 0);
    osso('m', M, B, 0.032, 0.02, f % 2 ? NERO2 : NERO, 5);
    artiglio(B, new V3(Math.sin(ang) * 0.2, -0.45, 0.8), 0.2 + r() * 0.05, 0.022, OSSO);
    artiglio(M, new V3(-0.1, 0.2, -1), 0.06, 0.012, PUNTA);              // spuntoni sulle nocche
  }
  // il pollice, verso l'interno, piegato in avanti
  A.set(i * 0.13, -0.26, 0.04); M.set(i * 0.2, -0.38, 0.1); B.set(i * 0.17, -0.48, 0.2);
  osso('m', A, M, 0.04, 0.032, NERO2, 5); osso('m', M, B, 0.032, 0.02, NERO, 5);
  artiglio(B, new V3(-i * 0.3, -0.4, 0.7), 0.17, 0.02, OSSO);
  return C.crea({ m: PZ.materialeDemoni(), a: PZ.matArtigliDemone() });
};
PZ.matArtigliDemone = (function () {
  let m = null;
  return function () { return m || (m = new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x6a6040, shininess: 40, flatShading: true, fog: false })); };
})();

// ---------- Il demone che insegue ----------
// opz.manone: true = al posto delle mani sottili due manone artigliate (il demone che ti insegue, anche nella scena
// iniziale e nello specchietto)
PZ.creaDemone = function (scena, occhi, opz) {
  const corpo = PZ.corpoCreatura({ anca: 1.55, coscia: 0.82, gamba: 0.84, busto: 1.05, spalle: 0.52, collo: 0.34, testa: 1.35,
    braccio: 0.8, avambraccio: 0.85, dita: 0.34, magrezza: 1, seme: 77 });
  const G = corpo.G, R = PZ.rumoreDemone, rnd = PZ.ps1.casuale(4242);
  if (opz && opz.manone) {
    [0, 1].forEach(function (i) {
      G.polso[i].children.forEach(function (c) { if (c.isMesh) c.visible = false; });   // le dita sottili di prima
      const m = PZ.manoneDemone(i === 0 ? 1 : -1);
      G.polso[i].add(m);
    });
  }
  const D = { gruppo: G.radice, G: G, visibile: false, scala: 1, agitazione: 0.4 };
  G.radice.visible = false;
  scena.add(G.radice);
  corpo.occhi.forEach(function (o) { occhi.aggiungi(D, o[0], o[1], o[2], o[3]); });
  // alone dell'occhio grande
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.bagliore(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.85 }));
  alone.position.set(0, 0.2 * 1.35, 0.3); alone.scale.set(0.8, 0.8, 1);
  G.testa.add(alone);
  D.alone = alone;
  // aura viola alle sue spalle: di notte stacca la sagoma nera dal fondo scuro
  const ca = document.createElement('canvas'); ca.width = ca.height = 32;
  const ga = ca.getContext('2d'), gra = ga.createRadialGradient(16, 16, 2, 16, 16, 16);
  gra.addColorStop(0, 'rgba(120,60,170,.9)'); gra.addColorStop(0.5, 'rgba(80,30,120,.45)'); gra.addColorStop(1, 'rgba(40,10,60,0)');
  ga.fillStyle = gra; ga.fillRect(0, 0, 32, 32);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(ca), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.55 }));
  aura.position.set(0, 1.7, -0.45); aura.scale.set(3.2, 4.6, 1);
  G.radice.add(aura);
  D.aura = aura;

  let fase = 0, t = 0, scatto = 0, scattoV = 0, scattoTesta = 0, prossimoScatto = 1;
  const V3 = THREE.Vector3, tmp = new V3(), tmp2 = new V3();
  const invRadice = new THREE.Matrix4(), PIEDE = [new V3(0, -0.05, -0.03), new V3(0, -0.05, 0.15), new V3(0, -0.035, 0.33), new V3(0, -0.035, 0)];   // punti sotto la suola
  D.mostra = function () { D.visibile = true; G.radice.visible = true; };
  D.nascondi = function () { D.visibile = false; G.radice.visible = false; };
  D.posiziona = function (x, y, z, dir) { G.radice.position.set(x, y, z); G.radice.rotation.y = dir; };
  // modo: 'fermo', 'cammina', 'corre', 'afferra'. vel: m/s (cadenza dei passi). bersaglio: punto da fissare
  D.anima = function (dt, modo, vel, bersaglio, intensita) {
    t += dt;
    const corre = modo === 'corre' || modo === 'afferra';
    const freq = corre ? 1.25 + vel * 0.07 : modo === 'cammina' ? 0.75 + vel * 0.12 : 0;
    fase += dt * Math.PI * 2 * freq;
    // scatti innaturali: ogni tanto la testa o una spalla scattano di colpo e tornano piano
    prossimoScatto -= dt;
    if (prossimoScatto <= 0) { scatto = (rnd() - 0.5) * 1.6; scattoV = rnd() < 0.5 ? 0 : 1; scattoTesta = (rnd() - 0.5) * 1.2; prossimoScatto = 0.9 + rnd() * 2.8; }
    scatto *= Math.exp(-dt * 7); scattoTesta *= Math.exp(-dt * 5);
    const n1 = R(t, 1), n2 = R(t * 1.4, 7), n3 = R(t * 0.8, 13);
    const a = corre ? 1 : modo === 'cammina' ? 0.55 : 0;
    // (fase 14) inclinazione delle braccia per puntarle sul bersaglio mentre corre: dalla spalla (quota circa) alla
    // testa del ragazzo; relativa al busto chino (spalla.x negativa = in avanti; -PI/2 rispetto al busto = orizzontale)
    let mira = -1.95;
    if (corre && bersaglio) {
      const R0 = G.radice, hS = R0.position.y + (corpo.prop.anca + corpo.prop.busto * 0.78) * R0.scale.y;
      const dO = Math.hypot(bersaglio.x - R0.position.x, bersaglio.z - R0.position.z);
      const elev = Math.max(-0.75, Math.min(0.35, Math.atan2(bersaglio.y - hS, Math.max(0.5, dO))));
      mira = -(Math.PI / 2 + elev) - (0.62 + 0.05 * Math.sin(2 * fase));
    }
    [0, 1].forEach(function (i) {
      const s = i === 0 ? 1 : -1, ph = fase + (i === 0 ? 0 : Math.PI), sn = Math.sin(ph), cs = Math.cos(ph);
      // gambe: passi lunghi; camminando una gamba strascica (zoppica)
      const zoppa = modo === 'cammina' && i === 1 ? 0.45 : 1;
      G.anca[i].rotation.x = -0.72 * a * sn * zoppa + (modo === 'fermo' ? 0.05 * n1 * s : 0);
      G.anca[i].rotation.z = s * (0.05 + 0.04 * n2);
      G.ginocchio[i].rotation.x = 0.18 + a * (0.95 * Math.max(0, -Math.sin(ph + 0.7)) + 0.15) * zoppa;
      G.caviglia[i].rotation.x = 0.25 * a * sn - 0.1;
      // braccia: corrono protese in avanti, come per afferrare; camminando penzolano storte
      if (modo === 'afferra') {
        // (fase 14) ti ha preso: le manone puntate su di te, aperte ai lati della faccia, che tremano e artigliano
        G.spalla[i].rotation.x = mira + 0.08 + 0.08 * Math.sin(t * 9 + i);
        G.spalla[i].rotation.z = s * 0.07; G.gomito[i].rotation.x = -0.15 - 0.12 * Math.sin(t * 13 + 2 * i); G.polso[i].rotation.x = -0.45 - 0.2 * Math.sin(t * 11 + i);
      } else if (corre) {
        // (fase 14) corre con le braccia TESE VERSO DI TE, come se volesse raggiungerti a ogni costo: puntate sul
        // bersaglio (la testa del ragazzo), quasi dritte; a ogni passo una si allunga e l'altra si ritrae appena
        // (artiglia l'aria a turno), le manone si aprono e si chiudono, con un tremito nervoso
        const allunga = Math.sin(ph + Math.PI);                                // +1 = questo braccio si allunga
        G.spalla[i].rotation.x = mira - 0.16 * allunga + 0.05 * n3 * s + 0.04 * Math.sin(t * 17 + 3 * i);
        G.spalla[i].rotation.z = s * (0.1 + 0.05 * n2) - s * 0.05 * Math.max(0, allunga);
        G.gomito[i].rotation.x = -0.08 - 0.32 * Math.max(0, -allunga);         // si piega solo mentre si ritrae
        G.polso[i].rotation.x = -0.15 - 0.4 * Math.max(0, allunga) + 0.15 * n1;   // la mano si apre in avanti per afferrare
      } else {
        G.spalla[i].rotation.x = -0.2 + 0.25 * a * Math.sin(ph + Math.PI) + 0.08 * n3;
        G.spalla[i].rotation.z = s * (0.12 + 0.06 * n1);
        G.gomito[i].rotation.x = -0.25 + 0.1 * n2; G.polso[i].rotation.x = 0.1 * n3;
      }
    });
    if (scattoV) G.spalla[0].rotation.z += scatto * 0.6; else G.spalla[1].rotation.x += scatto * 0.5;
    // busto chino in avanti, si torce a ogni passo; il bacino sobbalza
    G.bacino.position.y = corpo.prop.anca - (corre ? 0.12 + 0.07 * Math.abs(Math.sin(fase)) : modo === 'cammina' ? 0.04 * Math.abs(Math.sin(fase)) : 0.02 * (1 + n1));
    G.busto.rotation.x = (corre ? 0.62 : modo === 'cammina' ? 0.38 : 0.28) + 0.05 * Math.sin(2 * fase) + 0.04 * n2;
    G.busto.rotation.y = 0.14 * a * Math.sin(fase) + 0.05 * n3;
    G.busto.rotation.z = 0.06 * n1 + (modo === 'cammina' ? 0.08 * Math.sin(fase) : 0);
    // testa: fissa il bersaglio anche mentre il corpo si muove, piegata di lato, con scatti improvvisi
    G.collo.rotation.x = -(G.busto.rotation.x * 0.75);
    if (bersaglio) {
      G.testa.updateMatrixWorld(true);
      G.testa.getWorldPosition(tmp);
      tmp2.copy(bersaglio).sub(tmp);
      const yaw = Math.atan2(tmp2.x, tmp2.z) - G.radice.rotation.y, pitch = -Math.atan2(tmp2.y, Math.hypot(tmp2.x, tmp2.z));
      let yv = yaw; while (yv > Math.PI) yv -= 2 * Math.PI; while (yv < -Math.PI) yv += 2 * Math.PI;
      G.testa.rotation.set(Math.max(-0.6, Math.min(0.6, pitch)) * 0.8, Math.max(-1, Math.min(1, yv)) * 0.8 + scattoTesta * 0.5, 0.35 + 0.15 * n1 + scattoTesta);
    } else G.testa.rotation.set(0.1 * n2, 0.3 * n3 + scattoTesta * 0.5, 0.35 + 0.15 * n1 + scattoTesta);
    // (fase 65) piedi a terra: se il punto più basso dei piedi finisce sotto il suolo (y = 0 della radice), tutto il
    // corpo sale quanto basta (i movimenti restano quelli di prima; prima i piedi affondavano nell'asfalto)
    G.radice.updateMatrixWorld(true);
    invRadice.copy(G.radice.matrixWorld).invert();
    let basso = Infinity;
    [0, 1].forEach(function (i) { PIEDE.forEach(function (p) { tmp.copy(p); G.caviglia[i].localToWorld(tmp).applyMatrix4(invRadice); if (tmp.y < basso) basso = tmp.y; }); });
    if (basso < 0) G.bacino.position.y -= basso;
    const k = intensita === undefined ? 0.5 : intensita;
    alone.material.opacity = 0.3 + 0.45 * k; alone.scale.setScalar(0.32 + 0.4 * k);
    aura.material.opacity = 0.35 + 0.35 * k;
    G.radice.updateMatrixWorld(true);
  };
  return D;
};

// ---------- Le sagome secondarie: pose diverse, corpo unito in un pezzo solo, testa libera ----------
PZ.VARIANTI_SAGOMA = ['alta', 'curva', 'sottile', 'accucciata', 'storta'];
PZ.creaSagoma = function (scena, occhi, variante, seme) {
  const V3 = THREE.Vector3;
  const proporzioni = {
    alta: { anca: 1.42, coscia: 0.76, gamba: 0.76, busto: 0.95, braccio: 0.76, avambraccio: 0.8, testa: 1.2 },
    curva: { anca: 1.3, coscia: 0.7, gamba: 0.72, busto: 0.9, braccio: 0.7, avambraccio: 0.72, testa: 1.15 },
    sottile: { anca: 1.68, coscia: 0.88, gamba: 0.9, busto: 1.12, braccio: 0.86, avambraccio: 0.9, testa: 1.1, magrezza: 0.75 },
    accucciata: { anca: 1.25, coscia: 0.7, gamba: 0.7, busto: 0.85, braccio: 0.85, avambraccio: 0.9, testa: 1.25 },
    storta: { anca: 1.4, coscia: 0.75, gamba: 0.78, busto: 0.98, braccio: 0.74, avambraccio: 0.78, testa: 1.2 }
  }[variante];
  proporzioni.seme = seme || 3;
  const corpo = PZ.corpoCreatura(proporzioni), G = corpo.G;
  // posa fissa della variante
  const pose = {
    alta: function () { G.busto.rotation.x = 0.12; G.spalla[0].rotation.set(-0.15, 0, 0.1); G.spalla[1].rotation.set(-0.1, 0, -0.08); G.gomito[0].rotation.x = -0.2; G.gomito[1].rotation.x = -0.15; G.collo.rotation.z = 0.25; },
    curva: function () { G.busto.rotation.set(0.85, 0.2, 0.15); G.collo.rotation.x = -0.6; G.spalla[0].rotation.set(-2.3, 0, 0.3); G.gomito[0].rotation.x = -1.6; G.spalla[1].rotation.set(-0.5, 0, -0.2); G.gomito[1].rotation.x = -0.2; G.anca[0].rotation.x = -0.25; G.ginocchio[0].rotation.x = 0.35; G.ginocchio[1].rotation.x = 0.2; },
    sottile: function () { G.busto.rotation.x = 0.08; G.spalla[0].rotation.set(-0.75, 0, 0.55); G.spalla[1].rotation.set(-0.7, 0, -0.5); G.gomito[0].rotation.x = -0.25; G.gomito[1].rotation.x = -0.3; },
    accucciata: function () { G.anca[0].rotation.set(-1.55, 0, 0.25); G.anca[1].rotation.set(-1.45, 0, -0.25); G.ginocchio[0].rotation.x = 2.35; G.ginocchio[1].rotation.x = 2.3; G.caviglia[0].rotation.x = -0.6; G.caviglia[1].rotation.x = -0.6; G.busto.rotation.x = 0.95; G.collo.rotation.x = -0.9; G.spalla[0].rotation.set(-0.55, 0, 0.25); G.spalla[1].rotation.set(-0.7, 0, -0.2); G.gomito[0].rotation.x = -0.25; G.gomito[1].rotation.x = -0.1; },
    storta: function () { G.busto.rotation.set(0.25, 0.55, -0.2); G.anca[1].rotation.set(-0.35, 0, -0.35); G.ginocchio[1].rotation.x = 0.9; G.spalla[0].rotation.set(0.5, 0, 0.1); G.gomito[0].rotation.x = -1.2; G.spalla[1].rotation.set(-0.3, 0, -0.45); G.collo.rotation.z = -0.5; }
  }[variante];
  pose();
  G.radice.updateMatrixWorld(true);
  // piedi a terra: si abbassa (o si alza) tutto finché il punto più basso tocca il suolo
  let minY = Infinity; const v = new V3();
  corpo.meshes.forEach(function (m) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); if (v.y < minY) minY = v.y; }
  });
  // unisce tutto il corpo (tranne collo e testa) in un solo pezzo
  const radice = new THREE.Group(), testaViva = new THREE.Group();
  const geos = [];
  const testaMeshes = [];
  G.collo.traverse(function (o) { if (o.isMesh) testaMeshes.push(o); });
  corpo.meshes.forEach(function (m) { if (testaMeshes.indexOf(m) < 0) geos.push(m); });
  const posArr = [], norArr = [], colArr = [], nm = new THREE.Matrix3();
  geos.forEach(function (m) {
    const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color;
    nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); posArr.push(v.x, v.y - minY, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); norArr.push(v.x, v.y, v.z);
      colArr.push(Cc.getX(i), Cc.getY(i), Cc.getZ(i));
    }
  });
  const gb = new THREE.BufferGeometry();
  gb.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  gb.setAttribute('normal', new THREE.Float32BufferAttribute(norArr, 3));
  gb.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
  gb.computeBoundingSphere();
  const corpoUnito = new THREE.Mesh(gb, PZ.materialeDemoni());
  radice.add(corpoUnito);
  // la testa resta un pezzo vivo: stessa posizione e orientamento del collo nella posa
  const mCollo = new THREE.Matrix4().copy(G.collo.matrixWorld);
  mCollo.elements[13] -= minY;
  mCollo.decompose(testaViva.position, testaViva.quaternion, testaViva.scale);
  radice.add(testaViva);
  testaMeshes.forEach(function (m) {
    const mm = new THREE.Matrix4().copy(G.collo.matrixWorld).invert().multiply(m.matrixWorld);
    const c = new THREE.Mesh(m.geometry, m.material); mm.decompose(c.position, c.quaternion, c.scale); testaViva.add(c);
  });
  const S = { gruppo: radice, testa: testaViva, variante: variante, visibile: false, scala: 1, agitazione: 0.45, larghezza: variante === 'accucciata' ? 0.9 : 0.75 };
  // occhi: quelli del corpo restano fermi rispetto alla radice; quelli della testa seguono la testa viva
  const inv = new THREE.Matrix4(), mx = new THREE.Matrix4();
  corpo.occhi.forEach(function (o) {
    const gi = o[0];
    let inTesta = false; let x = gi; while (x) { if (x === G.collo) { inTesta = true; break; } x = x.parent; }
    if (inTesta) {
      inv.copy(G.collo.matrixWorld).invert(); mx.multiplyMatrices(inv, gi.matrixWorld);
      const p = new V3().fromArray(o[1]).applyMatrix4(mx), n = new V3().fromArray(o[2]).transformDirection(mx);
      occhi.aggiungi(S, testaViva, p.toArray(), n.toArray(), o[3]);
    } else {
      const p = new V3().fromArray(o[1]).applyMatrix4(gi.matrixWorld); p.y -= minY;
      const n = new V3().fromArray(o[2]).transformDirection(gi.matrixWorld);
      occhi.aggiungi(S, radice, p.toArray(), n.toArray(), o[3]);
    }
  });
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.bagliore(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.7 }));
  {
    inv.copy(G.collo.matrixWorld).invert(); mx.multiplyMatrices(inv, G.testa.matrixWorld);
    const p = new V3().fromArray(corpo.occhi[0][1]).applyMatrix4(mx); alone.position.copy(p).add(new V3(0, 0, 0.05));
  }
  alone.scale.set(0.6, 0.6, 1); testaViva.add(alone);
  // aura viola alle spalle, alta quanto la sagoma (come quella del demone, più tenue)
  const hS = testaViva.position.y + 0.3;
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.auraViola(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.35 }));
  aura.position.set(0, hS * 0.55, -0.35); aura.scale.set(hS * 1.05, hS * 1.5, 1);
  radice.add(aura);
  radice.visible = false;
  scena.add(radice);
  const R = PZ.rumoreDemone, rnd = PZ.ps1.casuale((seme || 3) * 31);
  let t = rnd() * 10, scatto = 0, prossimo = 1 + rnd() * 2, comparsa = 1, verso = 0;   // verso: 1 appare, -1 svanisce
  const base = testaViva.quaternion.clone(), e = new THREE.Euler(), qq = new THREE.Quaternion();
  S.mostra = function () { S.visibile = true; radice.visible = true; comparsa = 1; verso = 0; radice.scale.set(1, 1, 1); };
  S.nascondi = function () { S.visibile = false; radice.visible = false; verso = 0; };
  S.appari = function (durata) { S.mostra(); comparsa = 0; verso = 1 / (durata || 0.35); radice.scale.set(1, 0.05, 1); };
  S.svanisci = function (durata) { verso = -1 / (durata || 0.3); };
  // ondeggia, respira, la testa scatta; durante comparsa/sparizione si allunga dal suolo e tremola
  S.aggiorna = function (dt, intensita) {
    if (!S.visibile) return;
    t += dt;
    if (verso !== 0) {
      comparsa = Math.max(0, Math.min(1, comparsa + verso * dt));
      radice.scale.set(1 - 0.3 * (1 - comparsa), Math.max(0.03, comparsa), 1 - 0.3 * (1 - comparsa));
      radice.visible = comparsa > 0.97 || Math.sin(t * 60) > -0.3;
      if (comparsa >= 1 && verso > 0) { verso = 0; radice.visible = true; }
      if (comparsa <= 0 && verso < 0) { S.nascondi(); return; }
    }
    prossimo -= dt;
    if (prossimo <= 0) { scatto = (rnd() - 0.5) * 1.4; prossimo = 0.8 + rnd() * 3; }
    scatto *= Math.exp(-dt * 6);
    radice.rotation.z = 0.03 * R(t, 3); radice.rotation.x = 0.02 * R(t * 0.7, 9);
    e.set(0.15 * R(t * 0.9, 2), 0.25 * R(t * 0.6, 5) + scatto * 0.6, 0.2 * R(t * 1.1, 8) + scatto);
    qq.setFromEuler(e); testaViva.quaternion.copy(base).multiply(qq);
    const k = intensita === undefined ? 0.5 : intensita;
    alone.material.opacity = 0.25 + 0.45 * k; alone.scale.setScalar(0.26 + 0.34 * k);
    aura.material.opacity = 0.28 + 0.22 * k;
    radice.updateMatrixWorld(true);
  };
  S.alone = alone; S.aura = aura;
  return S;
};
