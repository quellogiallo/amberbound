// La "sartoria" del protagonista: costruisce le forme del corpo nello stesso stile del volto, cioè superfici
// sfaccettate low-poly (stile survival horror PS2) con texture dipinte a pixel: pieghe della stoffa, cuciture,
// polsini e orli a coste, lacci delle scarpe. Niente parallelepipedi.
//
// loft(sezioni, opzioni): una forma fatta di anelli (sezioni) uno dopo l'altro lungo un asse, uniti da facce.
//   Ogni sezione: { h: posizione lungo l'asse, rx: mezza larghezza, rz: mezza profondità, x, y, z: centro }.
//   opzioni: lati (facce per giro), esp (2 = ellisse, più alto = più squadrato), asse 'y' (in verticale) o 'z'
//   (in orizzontale, per le scarpe), forma(p, a, h) per deformare i punti, irregolare (in metri), seme.
// tessuto(opzioni): texture 32 x 32 di stoffa.
PZ.sartoria = (function () {
  function caso(seme) {
    let s = seme || 1;
    return function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }
  function segno(v) { return v < 0 ? -1 : 1; }

  function loft(sez, o) {
    o = o || {};
    const n = o.lati || 8, e = o.esp || 2, asse = o.asse || 'y', rnd = caso(o.seme || 3), irr = o.irregolare || 0;
    const hMin = sez[0].h, hMax = sez[sez.length - 1].h, P = [];
    const salti = [];   // irregolarità di ogni punto (uguale per il punto di cucitura, che chiude il giro)
    for (let j = 0; j < sez.length; j++) {
      const s = sez[j], anello = [];
      salti.push([]);
      for (let k = 0; k <= n; k++) {
        if (k < n) salti[j].push([(rnd() - 0.5) * irr, (rnd() - 0.5) * irr]);
        const r = salti[j][k % n], a = -Math.PI + 2 * Math.PI * k / n;
        const sx = segno(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 2 / e);
        const cz = segno(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 2 / e);
        const p = new THREE.Vector3();
        const ex = (j === 0 || j === sez.length - 1) ? 0 : r[0], ez = (j === 0 || j === sez.length - 1) ? 0 : r[1];
        if (asse === 'y') p.set((s.x || 0) + (s.rx + ex) * sx, s.h, (s.z || 0) + (s.rz + ez) * cz);
        else p.set((s.x || 0) + (s.rx + ex) * sx, (s.y || 0) + (s.rz + ez) * cz, s.h);
        if (o.forma) o.forma(p, a, s.h);
        anello.push({ p: p, u: k / n, v: (s.h - hMin) / (hMax - hMin) });
      }
      P.push(anello);
    }
    const pos = [], uv = [];
    const metti = function (q) { pos.push(q.p.x, q.p.y, q.p.z); uv.push(q.u, q.v); };
    for (let j = 0; j < P.length - 1; j++) for (let k = 0; k < n; k++) {
      const a = P[j][k], b = P[j][k + 1], c = P[j + 1][k + 1], d = P[j + 1][k];
      if ((j + k) % 2) { metti(a); metti(b); metti(c); metti(a); metti(c); metti(d); }
      else { metti(a); metti(b); metti(d); metti(b); metti(c); metti(d); }
    }
    // tappi alle due estremità (verso il centro dell'anello)
    [[0, o.apertoSotto], [P.length - 1, o.apertoSopra]].forEach(function (t) {
      if (t[1]) return;
      const R = P[t[0]], cen = new THREE.Vector3();
      for (let k = 0; k < n; k++) cen.add(R[k].p);
      cen.multiplyScalar(1 / n);
      const C = { p: cen, u: 0.5, v: R[0].v };
      for (let k = 0; k < n; k++) { metti(R[k]); metti(R[k + 1]); metti(C); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // Tubo chiuso lungo un percorso chiuso (il bordo del cappuccio). percorso(t) -> {p, fuori, sezione: [r1, r2], spinta}
  function anello(percorso, segmenti, lati) {
    const P = [], T = new THREE.Vector3(), N = new THREE.Vector3(), Z = new THREE.Vector3();
    for (let i = 0; i <= segmenti; i++) {
      const t = (i % segmenti) / segmenti, q = percorso(t), q2 = percorso(((i + 1) % segmenti) / segmenti);
      T.subVectors(q2.p, q.p).normalize();
      N.copy(q.fuori).addScaledVector(T, -q.fuori.dot(T)).normalize();
      Z.crossVectors(T, N).normalize();
      const giro = [];
      for (let k = 0; k <= lati; k++) {
        const b = 2 * Math.PI * k / lati + Math.PI / lati;
        giro.push({ p: q.p.clone().addScaledVector(N, q.sezione[0] * Math.cos(b)).addScaledVector(Z, q.sezione[1] * Math.sin(b))
          .add(q.spinta || new THREE.Vector3()), u: k / lati, v: i / segmenti });
      }
      P.push(giro);
    }
    const pos = [], uv = [];
    const metti = function (q) { pos.push(q.p.x, q.p.y, q.p.z); uv.push(q.u, q.v); };
    for (let i = 0; i < segmenti; i++) for (let k = 0; k < lati; k++) {
      metti(P[i][k]); metti(P[i][k + 1]); metti(P[i + 1][k + 1]);
      metti(P[i][k]); metti(P[i + 1][k + 1]); metti(P[i + 1][k]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // ---------- Texture ----------
  // colori: 4 tinte dalla più scura alla più chiara. pieghe: quante pieghe (linea scura con un filo di luce
  // sopra). coste: righe a coste in basso (orli, polsini); costeSopra: in alto. cuciture: colonne (u da 0 a 1).
  // piegheIn: [v0, v1] fascia in cui si concentrano le pieghe. dipingi(c, colore): disegno aggiuntivo.
  function hex(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
  function tessuto(o) {
    const L = 32, cv = document.createElement('canvas');
    cv.width = cv.height = L;
    const q = cv.getContext('2d'), img = q.createImageData(L, L), d = img.data, rnd = caso(o.seme || 5);
    const C = o.colori.map(hex);
    const metti = function (i, j, c, k) {
      i = ((i % L) + L) % L;
      if (j < 0 || j >= L) return;
      const p = (j * L + i) * 4; k = k === undefined ? 1 : k;
      for (let z = 0; z < 3; z++) d[p + z] = d[p + z] + (c[z] - d[p + z]) * k;
      d[p + 3] = 255;
    };
    // fondo: la tinta media con una grana di pixel più chiari e più scuri (stoffa)
    for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) {
      const r = rnd(), c = r < 0.12 ? C[0] : r < 0.62 ? C[1] : r < 0.93 ? C[2] : C[3];
      metti(i, j, C[1]); metti(i, j, c, 0.42);
    }
    // pieghe
    const pv = o.piegheIn || [0, 1];
    for (let f = 0; f < (o.pieghe || 0); f++) {
      const i0 = Math.floor(rnd() * L), j0 = Math.floor((1 - (pv[0] + rnd() * (pv[1] - pv[0]))) * (L - 1));
      const lung = 4 + Math.floor(rnd() * 7), pend = (rnd() - 0.5) * (o.pendenza || 0.5);
      for (let k = 0; k < lung; k++) {
        const j = Math.round(j0 + k * pend);
        metti(i0 + k, j, C[0], 0.9);
        metti(i0 + k, j - 1, C[3], 0.55);
        if (k > 1 && k < lung - 2) metti(i0 + k, j + 1, C[0], 0.35);
      }
    }
    // cuciture
    (o.cuciture || []).forEach(function (u) {
      const i = Math.round(u * L) % L;
      for (let j = 0; j < L; j++) { metti(i, j, C[0], 0.85); if (j % 3 === 0) metti(i + 1, j, C[3], 0.4); }
    });
    // coste (orli e polsini): righe verticali alternate
    const coste = function (j0, j1) {
      for (let j = j0; j <= j1; j++) for (let i = 0; i < L; i++) metti(i, j, i % 2 ? C[0] : C[2], 0.85);
      for (let i = 0; i < L; i++) metti(i, j0 - 1, C[0], 0.7);
    };
    if (o.coste) coste(L - o.coste, L - 1);
    if (o.costeSopra) coste(0, o.costeSopra - 1);
    if (o.dipingi) o.dipingi(metti, C, L, rnd);
    q.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function materiale(o, colore) {
    const m = new THREE.MeshPhongMaterial({ map: tessuto(o), specular: 0x000000, shininess: 0, flatShading: true });
    m.userData.colore = colore;
    return m;
  }
  return { loft: loft, anello: anello, tessuto: tessuto, materiale: materiale, caso: caso };
})();
