// Terraferma, sentiero sterrato, promontorio con scogliera, rocce, faraglioni e lampione.
//
// Mappa vista dall'alto (la camera guarda verso z negativo):
//
//                     mare aperto
//              ┌──┐  insenatura  ┌──┐    <- due "corna" di roccia; in mezzo il mare, 20 metri più in basso
//              │  └──┐  ciglio ┌──┘  │
//   mare       │     fine sentiero   │   <- promontorio: terreno rialzato, bordo frastagliato
//  ────────────┘        sentiero ┌───┘   <- parete del promontorio rivolta verso la camera
//                      │     │
//      terraferma      │     │   baia (il mare sta 20 metri più in basso)
//                      │     │
//                    camera  │
//
// Il terreno è una griglia di quote (heightfield): dove la costa finisce la quota precipita sotto il mare,
// così i bordi diventano pareti rocciose quasi verticali.
PZ.creaTerra = function (scena) {
  const P = PZ.ps1;
  const C = PZ.CONFIG.colori;
  const mare = PZ.CONFIG.livelloMare;
  const opaco = function (opzioni) {
    opzioni.flatShading = true;
    opzioni.specular = 0x000000; // nessun riflesso: il terreno non deve sembrare acqua
    opzioni.shininess = 0;
    return P.aggancia(new THREE.MeshPhongMaterial(opzioni));
  };

  // Texture a pixel (dal colore più scuro al più chiaro), applicate in coordinate del mondo: 1 ripetizione ogni 8 unità
  const roccia = opaco({ map: P.texture([0x1a2133, 0x242d44, 0x303b57, 0x43516f], 16, 1, 1, 3) });
  const terra = opaco({ map: P.texture([0x0a0e17, 0x0e131d, 0x131925, 0x19202e], 16, 1, 1, 4) });
  const sterrato = opaco({
    map: P.texture([0x2e3138, 0x34383f, 0x3a3e46, 0x42464f], 16, 1, 1, 5),
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
  const grigio = P.aggancia(new THREE.MeshPhongMaterial({ color: C.grigioFreddo, flatShading: true }));
  const giallo = P.aggancia(new THREE.MeshBasicMaterial({ color: C.giallo }));

  // ---------- Sentiero: una linea morbida dalla terraferma fino al promontorio ----------
  const percorso = new THREE.CatmullRomCurve3([
    [5, 72], [4.5, 52], [4, 34], [3, 18], [2.5, 4], [3, -8], [5, -20], [8, -31], [9.5, -40], [9, -47]
  ].map(function (p) { return new THREE.Vector3(p[0], 0, p[1]); }));
  const puntiPercorso = percorso.getSpacedPoints(170);
  const LARGHEZZA = 3.0; // metri: spazio per un ragazzo in bicicletta

  // ---------- Linea di costa (vista dall'alto). Dentro = terra, fuori = mare ----------
  const costa = [
    [-130, 120], [14, 120], [14, 70], [13, 52], [14.5, 38], [13, 24], [14, 10], [12, -2],
    [10, -10], [10.5, -18], [16, -23], [26, -26], [36, -31], [41, -39], [40, -50], [35, -62],
    [30, -76], [26, -90], [21, -99], [15.5, -97], [13, -88], [12.5, -76], [12.5, -66], [11, -58.5],
    [8.5, -55.5], [5, -55.5], [3, -58.5], [1.5, -66], [1.5, -77], [0.5, -88], [-1.5, -97], [-7, -98],
    [-12, -88], [-14, -74], [-16, -60], [-18, -47], [-20, -36], [-26, -29], [-38, -23], [-60, -21], [-130, -23]
  ];

  function distSegmento(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(px - ax - vx * t, pz - az - vz * t);
  }

  // Distanza dalla costa: positiva sulla terra, negativa in mare
  function distanzaCosta(x, z) {
    let d = Infinity, dentro = false;
    for (let i = 0, j = costa.length - 1; i < costa.length; j = i++) {
      const a = costa[i], b = costa[j];
      d = Math.min(d, distSegmento(x, z, a[0], a[1], b[0], b[1]));
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) dentro = !dentro;
    }
    return dentro ? d : -d;
  }

  function distPercorso(x, z) {
    let d = Infinity;
    for (let i = 1; i < puntiPercorso.length; i++) {
      const a = puntiPercorso[i - 1], b = puntiPercorso[i];
      d = Math.min(d, distSegmento(x, z, a.x, a.z, b.x, b.z));
    }
    return d;
  }

  function liscia(a, b, v) { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }

  // Quota del terreno senza rugosità (serve anche per appoggiare sentiero, rocce e lampione)
  function quotaBase(x, z) {
    return 0.5 * Math.sin(x * 0.06 + 1.3) * Math.cos(z * 0.045)
      + 4.2 * Math.exp(-(Math.pow((x - 14) / 20, 2) + Math.pow((z + 41) / 12, 2))) // promontorio rialzato
      + Math.max(0, z - 30) * 0.05;                                                 // il terreno sale alle spalle della camera
  }

  // Quota finale: terreno, bordo frastagliato, parete e fondale
  function quota(x, z) {
    const d = distanzaCosta(x, z) + (P.hash(z * 1.7, 3, x * 1.3) - 0.5) * 2.4; // bordo irregolare
    const fondale = mare - 7 - P.hash(x, 7, z) * 3;
    if (d <= 0) return fondale;
    const sopra = quotaBase(x, z) + (P.hash(x, 1, z) - 0.5) * 0.35 * liscia(2.2, 5, distPercorso(x, z));
    if (d >= 1.4) return sopra;
    // vertice a metà parete: crea sporgenze e rientranze nella roccia
    return fondale + (sopra - 1.2 - fondale) * Math.pow(d / 1.4, 0.6) + (P.hash(x, 2, z) - 0.5) * 5;
  }

  // ---------- Griglia del terreno ----------
  const passo = 2, x0 = -130, x1 = 130, z0 = -114, z1 = 120;
  const nx = Math.round((x1 - x0) / passo), nz = Math.round((z1 - z0) / passo);
  const V = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      let x = x0 + i * passo, z = z0 + j * passo;
      if (i > 0 && i < nx && j > 0 && j < nz) { // spostamento casuale: niente griglia regolare visibile
        x += (P.hash(i, j, 1) - 0.5) * 1.3;
        z += (P.hash(j, i, 2) - 0.5) * 1.3;
      }
      V.push(new THREE.Vector3(x, quota(x, z), z));
    }
  }

  // Ogni triangolo va nel gruppo "sopra" (terra) o "pareti" (roccia) in base alla pendenza
  const sopra = { pos: [], uv: [] }, pareti = { pos: [], uv: [] };
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  function triangolo(a, b, c) {
    if (Math.max(a.y, b.y, c.y) < mare - 2.5) return; // tutto sott'acqua: non si vede
    e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2).normalize();
    const parete = n.y < 0.55;
    const g = parete ? pareti : sopra;
    [a, b, c].forEach(function (v) {
      g.pos.push(v.x, v.y, v.z);
      if (!parete) g.uv.push(v.x / 8, -v.z / 8);
      else g.uv.push((Math.abs(n.x) > Math.abs(n.z) ? v.z : v.x) / 8, v.y / 8);
    });
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = V[j * (nx + 1) + i], b = V[j * (nx + 1) + i + 1];
      const c = V[(j + 1) * (nx + 1) + i], d = V[(j + 1) * (nx + 1) + i + 1];
      if (P.hash(i, j, 3) < 0.5) { triangolo(a, c, b); triangolo(b, c, d); }
      else { triangolo(a, c, d); triangolo(a, d, b); }
    }
  }
  function mesh(dati, materiale) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(dati.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(dati.uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, materiale);
    m.castShadow = true;
    m.receiveShadow = true;
    scena.add(m);
    return m;
  }
  const meshTerra = mesh(sopra, terra);
  const meshPareti = mesh(pareti, roccia);

  // ---------- Sentiero sterrato: un nastro appoggiato sul terreno, con bordi irregolari ----------
  const N = puntiPercorso.length;
  const lunghezza = percorso.getLength(), tratto = lunghezza / (N - 1);
  const sp = [], su = [];
  const bordi = [];
  for (let k = 0; k < N; k++) {
    const p = puntiPercorso[k];
    const t = percorso.getTangentAt(k / (N - 1));
    const nx2 = -t.z, nz2 = t.x; // verso destra
    const fine = Math.min(1, (N - 1 - k) * tratto / 3.5); // il sentiero si stringe e finisce sul promontorio
    const w = LARGHEZZA / 2 * (0.3 + 0.7 * Math.sqrt(fine));
    const ws = w * (1 + (P.hash(k, 5, 0) - 0.5) * 0.25), wd = w * (1 + (P.hash(k, 6, 0) - 0.5) * 0.25);
    const sx = p.x - nx2 * ws, sz = p.z - nz2 * ws, dx = p.x + nx2 * wd, dz = p.z + nz2 * wd;
    bordi.push([sx, quotaBase(sx, sz) + 0.08, sz, dx, quotaBase(dx, dz) + 0.08, dz, k * tratto / 4]);
  }
  for (let k = 0; k < N - 1; k++) {
    const A = bordi[k], B = bordi[k + 1];
    // due triangoli per tratto: (sinistra, destra, sinistra successiva) e (destra, destra successiva, sinistra successiva)
    sp.push(A[0], A[1], A[2], A[3], A[4], A[5], B[0], B[1], B[2]);
    su.push(0, A[6], 1, A[6], 0, B[6]);
    sp.push(A[3], A[4], A[5], B[3], B[4], B[5], B[0], B[1], B[2]);
    su.push(1, A[6], 1, B[6], 0, B[6]);
  }
  const meshSentiero = mesh({ pos: sp, uv: su }, sterrato);
  meshSentiero.castShadow = false;

  // ---------- Rocce sparse sulla terraferma (lontane dal sentiero e dal bordo) ----------
  const rnd = P.casuale(21);
  const geoRocce = new THREE.IcosahedronGeometry(1, 0);
  for (let messe = 0, tentativi = 0; messe < 16 && tentativi < 600; tentativi++) {
    const x = -24 + rnd() * 52, z = -54 + rnd() * 104;
    const s = 0.5 + rnd() * 1.6;
    if (distanzaCosta(x, z) < 3 + s || distPercorso(x, z) < 3.4 + s) continue;
    const r = new THREE.Mesh(geoRocce, roccia);
    r.scale.set(s * (0.8 + rnd()), s * (0.5 + rnd() * 0.5), s * (0.8 + rnd()));
    r.position.set(x, quotaBase(x, z) + s * 0.1, z);
    r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    r.castShadow = true;
    r.receiveShadow = true;
    scena.add(r);
    messe++;
  }

  // ---------- Rocce sul ciglio dell'insenatura (visibili nell'inquadratura finale): x, z, grandezza ----------
  // Stanno sulla cima delle due "corna" di roccia; il ciglio dove si siederà il protagonista resta libero.
  const rndCiglio = P.casuale(33);
  [[-1, -70, 1.1], [14.8, -73, 1], [-2.5, -85, 1.6], [16, -85, 1.5]].forEach(function (c) {
    const x = c[0], z = c[1], s = c[2];
    if (distanzaCosta(x, z) < s + 1) return; // mai a sbalzo sul vuoto
    const r = new THREE.Mesh(geoRocce, roccia);
    r.scale.set(s * (0.9 + rndCiglio() * 0.6), s * (0.6 + rndCiglio() * 0.4), s * (0.9 + rndCiglio() * 0.6));
    r.position.set(x, quotaBase(x, z) + s * 0.1, z);
    r.rotation.set(rndCiglio() * 3, rndCiglio() * 3, rndCiglio() * 3);
    r.castShadow = true;
    r.receiveShadow = true;
    scena.add(r);
  });

  // ---------- Guglia di roccia nel mare, oltre l'insenatura (visibile nell'inquadratura finale) ----------
  // Otto lati, profilo rastremato con un leggero rigonfiamento, appena inclinata, cima irregolare.
  // La texture è alla stessa scala delle pareti della scogliera (una ripetizione ogni 8 m).
  function creaGuglia(cx, cz, raggio, altezza, seme) {
    const rnd = P.casuale(seme);
    const lati = 8, anelli = 6, base = mare - 4;
    const pendenzaX = (rnd() - 0.5) * 0.14 * altezza, pendenzaZ = (rnd() - 0.5) * 0.14 * altezza;
    const anello = [];
    for (let j = 0; j <= anelli; j++) {
      const h = j / anelli;
      const r = raggio * (1 - 0.6 * h + 0.16 * Math.sin(h * Math.PI * 1.3));
      const giro = [];
      for (let i = 0; i < lati; i++) {
        const a = (i / lati) * Math.PI * 2 + j * 0.37;
        const rr = r * (0.8 + rnd() * 0.4);
        const sbalzo = (j > 0 && j < anelli) ? (rnd() - 0.5) * 1.4 : 0;
        giro.push(new THREE.Vector3(cx + pendenzaX * h * h + Math.cos(a) * rr, base + h * altezza + sbalzo, cz + pendenzaZ * h * h + Math.sin(a) * rr));
      }
      anello.push(giro);
    }
    const cima = new THREE.Vector3(cx + pendenzaX + (rnd() - 0.5) * raggio * 0.4, base + altezza * 1.1, cz + pendenzaZ + (rnd() - 0.5) * raggio * 0.4);
    const pos = [], uv = [], n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), c = new THREE.Vector3();
    function triangolo(a, b, d) {
      e1.subVectors(b, a); e2.subVectors(d, a); n.crossVectors(e1, e2);
      c.copy(a).add(b).add(d).divideScalar(3);
      const fuori = new THREE.Vector3(c.x - cx - pendenzaX * 0.5, 0.3, c.z - cz - pendenzaZ * 0.5);
      if (n.dot(fuori) < 0) { const tmp = b; b = d; d = tmp; e1.subVectors(b, a); e2.subVectors(d, a); n.crossVectors(e1, e2); }
      n.normalize();
      [a, b, d].forEach(function (v) {
        pos.push(v.x, v.y, v.z);
        uv.push((Math.abs(n.x) > Math.abs(n.z) ? v.z : v.x) / 8, v.y / 8);
      });
    }
    for (let j = 0; j < anelli; j++) {
      for (let i = 0; i < lati; i++) {
        const a = anello[j][i], b = anello[j][(i + 1) % lati], d = anello[j + 1][i], e = anello[j + 1][(i + 1) % lati];
        triangolo(a, b, e); triangolo(a, e, d);
      }
    }
    for (let i = 0; i < lati; i++) triangolo(anello[anelli][i], anello[anelli][(i + 1) % lati], cima);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, roccia);
    m.castShadow = true;
    m.receiveShadow = true;
    scena.add(m);
  }
  creaGuglia(3, -168, 5.8, 27, 41);

  // ---------- Faraglioni nel mare: x, z, raggio, altezza ----------
  [[56, -62, 7, 28], [-46, -72, 6, 25], [72, -112, 10, 34], [-82, -122, 9, 30]].forEach(function (f, i) {
    const g = new THREE.CylinderGeometry(f[2] * 0.55, f[2], f[3], 6, 3);
    const q = g.attributes.position;
    for (let k = 0; k < q.count; k++) {
      const x = q.getX(k), y = q.getY(k), z = q.getZ(k);
      q.setXYZ(k,
        x + (P.hash(x + i, y, z) - 0.5) * f[2] * 0.5,
        y + (P.hash(z, x, y + i) - 0.5) * 1.5,
        z + (P.hash(y, z + i, x) - 0.5) * f[2] * 0.5);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, roccia);
    m.position.set(f[0], mare - 3 + f[3] / 2, f[1]);
    m.castShadow = true;
    m.receiveShadow = true;
    scena.add(m);
  });

  // ---------- Lampione solitario dove il sentiero sale sul promontorio: l'unico punto caldo ----------
  let pl = puntiPercorso[0];
  puntiPercorso.forEach(function (p) { if (Math.abs(p.z + 25) < Math.abs(pl.z + 25)) pl = p; });
  const lx = pl.x + 1.2, lz = pl.z;          // la lampada sta sopra il bordo destro del sentiero
  const y0 = quotaBase(lx + 1.5, lz);         // quota del terreno alla base del palo
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.6, 5), grigio);
  palo.position.set(lx + 1.5, y0 + 2.3, lz);
  const braccio = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), grigio);
  braccio.position.set(lx + 0.7, y0 + 4.6, lz);
  const lampada = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.45), giallo);
  lampada.position.set(lx, y0 + 4.5, lz);
  palo.castShadow = braccio.castShadow = true;
  scena.add(palo, braccio, lampada);

  // Luce corta: illumina solo un tratto di sentiero intorno al palo
  const luceLampione = new THREE.PointLight(C.giallo, 2.4, 13, 1.6);
  luceLampione.position.set(lx, y0 + 4.1, lz);
  scena.add(luceLampione);

  const bagliore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: P.alone(228, 255, 26, 6), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, fog: false, opacity: 0.8
  }));
  bagliore.scale.set(5, 5, 1);
  bagliore.position.set(lx, y0 + 4.4, lz);
  scena.add(bagliore);

  // Utile alle altre parti: il tracciato del sentiero, la quota del terreno e le superfici calpestabili
  // (servono a bici e personaggio per appoggiarsi esattamente sul terreno visibile)
  return { percorso: percorso, quota: quotaBase, superfici: [meshTerra, meshPareti, meshSentiero], lampione: luceLampione };
};
