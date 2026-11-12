// Il protagonista: ragazzo low-poly in stile PS1 (circa 1,75 m), felpa nera oversize col cappuccio alzato,
// pantaloni larghi scuri, scarpe semplici. Pochi dettagli gialli: i cordini del cappuccio, la riga delle suole e una
// collana d'oro con un ciondolo a forma di orologio giallo, sul petto, sopra la felpa.
//
// Scheletro articolato: bacino (radice) -> busto -> collo -> testa; busto -> spalle -> braccia -> avambracci -> mani;
// bacino -> anche -> cosce -> gambe -> piedi. Braccia e gambe si piegano da sole per raggiungere un punto
// (cinematica inversa a due segmenti): basta dire dove vanno mani e piedi.
//
// Coordinate del personaggio: z = avanti, y = su, +x = la SUA sinistra, -x = la sua destra.
PZ.creaRagazzo = function (scena) {
  const P = PZ.ps1, C = PZ.CONFIG.colori;
  const giallo = new THREE.MeshPhongMaterial({ color: C.giallo, emissive: 0x161b00, specular: 0x000000, flatShading: true });
  const oro = new THREE.MeshPhongMaterial({ color: 0xd9a81e, emissive: 0x2a1c00, specular: 0x8a7030, shininess: 40, flatShading: true });
  // quadrante dell'orologio: 10 x 10 pixel, giallo, bordo scuro, 4 tacche e due lancette nere spesse (le 10 e 10)
  const cq = document.createElement('canvas');
  cq.width = cq.height = 10;
  const gq = cq.getContext('2d');
  gq.fillStyle = '#e4ff1a'; gq.fillRect(0, 0, 10, 10);
  gq.fillStyle = '#0b0d06';
  [[4, 1], [5, 1], [8, 4], [8, 5], [4, 8], [5, 8], [1, 4], [1, 5]].forEach(function (p) { gq.fillRect(p[0], p[1], 1, 1); });  // tacche
  [[4, 4], [5, 4], [4, 5], [5, 5], [3, 3], [2, 2], [6, 3], [7, 2]].forEach(function (p) { gq.fillRect(p[0], p[1], 1, 1); });  // lancette
  const texQuadrante = new THREE.CanvasTexture(cq);
  texQuadrante.magFilter = texQuadrante.minFilter = THREE.NearestFilter;
  const quadrante = new THREE.MeshPhongMaterial({ map: texQuadrante, emissive: 0x1c2000, specular: 0x000000, flatShading: true });

  // ---------- Volto ----------
  // Un volto maschile semi-realistico in low-poly (stile survival horror PS2): niente faccia piatta e niente occhi
  // da cartone. La forma è una superficie sfaccettata (circa 300 triangoli) con mento, mascella, labbra, naso con
  // le ali, zigomi, orbite incavate e arcate sopracciliari; i dettagli (occhi piccoli e socchiusi, sopracciglia,
  // narici, piega della bocca, barba di qualche giorno, ciuffi di capelli sotto il cappuccio) sono dipinti in una
  // texture di 32 x 40 pixel. Volutamente un po' irregolare e asimmetrico, come una persona vera.
  // Misure in metri, nelle coordinate della testa: mento a y = 0, bocca a y = 0,047, occhi a y = 0,109.
  const VOLTO = (function () {
    const lerpT = function (tab, y) {               // interpolazione lineare in una tabella [[y, valore], ...]
      if (y <= tab[0][0]) return tab[0][1];
      for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) {
        const a = tab[i - 1], b = tab[i], k = (y - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * k;
      }
      return tab[tab.length - 1][1];
    };
    const g = function (x, s) { return Math.exp(-(x * x) / (s * s)); };
    // mezza larghezza del viso a ogni altezza (mascella squadrata, zigomi larghi, fronte che rientra nel cappuccio)
    const LARGO = [[-0.014, 0.036], [0.004, 0.034], [0.02, 0.047], [0.034, 0.057], [0.05, 0.062], [0.066, 0.066],
      [0.09, 0.07], [0.11, 0.07], [0.134, 0.068], [0.156, 0.065], [0.178, 0.06]];
    // profondità della pelle al centro (senza naso e labbra): mento in avanti, fronte che sale indietro
    const CENTRO = [[-0.014, 0.07], [0.004, 0.104], [0.019, 0.114], [0.032, 0.111], [0.05, 0.112], [0.066, 0.114],
      [0.09, 0.113], [0.106, 0.11], [0.12, 0.115], [0.133, 0.119], [0.152, 0.115], [0.178, 0.107]];
    // quanto il viso gira all'indietro verso i lati (muso più stretto in basso, fronte più piatta)
    const CURVA = [[0.004, 0.042], [0.03, 0.04], [0.06, 0.034], [0.09, 0.028], [0.12, 0.026], [0.178, 0.03]];
    // naso: sporgenza al centro e larghezza (in frazione della mezza larghezza del viso)
    const NASO = [[0.06, 0], [0.066, 0.006], [0.074, 0.021], [0.082, 0.02], [0.094, 0.013], [0.106, 0.006], [0.116, 0.002], [0.124, 0]];
    const NASO_L = [[0.066, 0.2], [0.076, 0.24], [0.094, 0.15], [0.116, 0.12]];
    let seme = 7;
    const caso = function () { seme = (seme * 16807) % 2147483647; return seme / 2147483647 - 0.5; };
    function profondita(u, y) {
      const a = Math.abs(u), lab = g(u, 0.34) * (u < 0 ? 1 : 0.94);    // le labbra solo al centro (un po' storte)
      let z = lerpT(CENTRO, y) - lerpT(CURVA, y) * u * u - 0.012 * Math.pow(a, 4);
      z += lerpT(NASO, y) * g(u, lerpT(NASO_L, y));                                      // naso
      z += 0.006 * g(a - 0.27, 0.1) * g(y - 0.07, 0.006);                                // ali del naso
      z -= 0.009 * g(a - 0.45, 0.2) * g(y - 0.109, 0.011);                               // orbite incavate
      z += 0.005 * g(a - 0.42, 0.32) * g(y - 0.128, 0.006);                              // arcate sopracciliari
      z += 0.005 * g(a - 0.64, 0.16) * g(y - 0.091, 0.011);                              // zigomi
      z -= 0.004 * g(a - 0.58, 0.16) * g(y - 0.06, 0.012);                               // guance scavate
      z += lab * (0.0045 * g(y - 0.041, 0.006) - 0.0025 * g(y - 0.0495, 0.003) + 0.003 * g(y - 0.057, 0.005)); // labbra
      z += 0.003 * g(u, 0.3) * g(y - 0.016, 0.01);                                       // mento
      z -= 0.003 * g(a - 0.85, 0.2) * g(y - 0.03, 0.02);                                 // angolo della mascella
      return z;
    }
    const U = [-1, -0.76, -0.55, -0.4, -0.27, -0.13, 0, 0.13, 0.27, 0.4, 0.55, 0.76, 1];
    const Y = [-0.014, 0.004, 0.017, 0.031, 0.041, 0.0495, 0.058, 0.067, 0.075, 0.084, 0.095, 0.104, 0.112, 0.121,
      0.131, 0.143, 0.16, 0.178];
    const pos = [], uv = [], nu = U.length, ny = Y.length;
    const ALTO = 0.178, BASSO = -0.014, MEZZA = 0.075;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nu; i++) {
      const y = Y[j], u = U[i], w = lerpT(LARGO, y) * (u < 0 ? 1.02 : 1);             // lato destro un filo più largo
      const x = u * w + (j > 0 && j < ny - 1 && i > 0 && i < nu - 1 ? caso() * 0.0018 : 0);
      const z = profondita(u, y) + (i > 0 && i < nu - 1 ? caso() * 0.0012 : 0);
      pos.push([x, y + (j > 0 && j < ny - 1 ? caso() * 0.0008 : 0), z]);
    }
    const P3 = [], UV = [];
    function vert(i, j) {
      const v = pos[j * nu + i];
      P3.push(v[0], v[1], v[2]);
      UV.push((v[0] + MEZZA) / (2 * MEZZA), (v[1] - BASSO) / (ALTO - BASSO));
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nu - 1; i++) {
      // diagonali alternate: sfaccettature meno regolari
      if ((i + j) % 2) { vert(i, j); vert(i + 1, j); vert(i + 1, j + 1); vert(i, j); vert(i + 1, j + 1); vert(i, j + 1); }
      else { vert(i, j); vert(i + 1, j); vert(i, j + 1); vert(i + 1, j); vert(i + 1, j + 1); vert(i, j + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    geo.computeVertexNormals();

    // Texture: 32 x 40 pixel, stessa proiezione frontale della geometria
    const TW = 32, TH = 40, c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    const q = c.getContext('2d'), img = q.createImageData(TW, TH), d = img.data;
    let s2 = 91;
    const rnd = function () { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
    const px = function (i) { return -MEZZA + (i + 0.5) / TW * 2 * MEZZA; };
    const py = function (j) { return ALTO - (j + 0.5) / TH * (ALTO - BASSO); };
    const colore = function (i, j, r, gg, b, k) {
      if (i < 0 || j < 0 || i >= TW || j >= TH) return;
      const o = (j * TW + i) * 4; k = k === undefined ? 1 : k;
      d[o] = d[o] + (r - d[o]) * k; d[o + 1] = d[o + 1] + (gg - d[o + 1]) * k; d[o + 2] = d[o + 2] + (b - d[o + 2]) * k;
    };
    const aI = function (x) { return Math.round((x + MEZZA) / (2 * MEZZA) * TW - 0.5); };
    const aJ = function (y) { return Math.round((ALTO - y) / (ALTO - BASSO) * TH - 0.5); };
    // pelle: grigio freddo, appena più calda su guance e naso, con la grana dei pixel
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const x = px(i), y = py(j), o = (j * TW + i) * 4, n = (rnd() - 0.5) * 9;
      const caldo = 6 * g(Math.abs(x) - 0.04, 0.02) * g(y - 0.08, 0.025) + 5 * g(x, 0.012) * g(y - 0.078, 0.012);
      d[o] = 116 + n + caldo; d[o + 1] = 110 + n; d[o + 2] = 120 + n - caldo * 0.5; d[o + 3] = 255;
    }
    // barba di qualche giorno: mascella, mento, sopra il labbro (puntinata)
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const x = px(i), y = py(j), a = Math.abs(x);
      const barba = (y < 0.062 && a > 0.03) || (y < 0.036) || (y > 0.052 && y < 0.064 && a < 0.022);
      if (barba && !(y > 0.037 && y < 0.052 && a < 0.022) && rnd() < 0.4) colore(i, j, 84, 80, 90, 0.3 + rnd() * 0.25);
    }
    // pieghe naso-labbro, ombra sotto il labbro inferiore, solco del mento
    [[1, 0.019, 0.069], [1, 0.022, 0.062], [1, 0.025, 0.055], [-1, 0.018, 0.069], [-1, 0.021, 0.061], [-1, 0.024, 0.054]]
      .forEach(function (p) { colore(aI(p[0] * p[1]), aJ(p[2]), 80, 75, 85, 0.45); });
    for (let x = -0.01; x <= 0.01; x += 0.0047) colore(aI(x), aJ(0.032), 86, 80, 90, 0.25);
    // bocca: piega scura appena storta, labbro superiore più scuro, inferiore con un riflesso
    for (let i = aI(-0.022); i <= aI(0.021); i++) {
      const x = px(i), giu = Math.abs(x) > 0.016 ? 1 : 0;
      colore(i, aJ(0.0495) + giu, 52, 42, 50, 0.95);
      colore(i, aJ(0.0495) - 1 + giu, 112, 98, 106, 0.6);
      if (Math.abs(x) < 0.014) colore(i, aJ(0.0495) + 1, 128, 116, 122, 0.3);
    }
    // naso: narici e ombra sotto la punta
    colore(aI(-0.0075), aJ(0.067), 40, 34, 42, 0.7); colore(aI(0.0075), aJ(0.067), 40, 34, 42, 0.7);
    colore(aI(0), aJ(0.08), 134, 128, 134, 0.4);                        // luce sulla punta
    // occhi: piccoli, socchiusi, un po' infossati. Palpebra superiore scura e pesante, bianco spento, iride scura
    // decentrata (lo sguardo va un filo in basso a sinistra), occhiaie
    [[-1, 0.031, 0.1088, 0], [1, 0.0315, 0.1092, 1]].forEach(function (e) {
      const cx = e[0] * e[1], cy = e[2], i0 = aI(cx), j0 = aJ(cy);
      for (let k = -3; k <= 3; k++) for (let h = -2; h <= 2; h++) colore(i0 + k, j0 + h, 88, 82, 92, 0.55 * g(k / 3.5, 1) * g(h / 2.5, 1)); // orbita
      for (let k = -2; k <= 2; k++) colore(i0 + k, j0 - 1, 28, 24, 30, 0.95);                               // palpebra
      colore(i0 - 3, j0 - 1, 50, 44, 52, 0.6); colore(i0 + 3, j0, 50, 44, 52, 0.5);
      for (let k = -2; k <= 2; k++) colore(i0 + k, j0, 150, 146, 140, Math.abs(k) === 2 ? 0.45 : 0.8);     // bianco
      colore(i0 - 1 + e[3], j0, 30, 26, 30, 1); colore(i0 + e[3], j0, 44, 38, 40, 1);                        // iride
      for (let k = -2; k <= 2; k++) colore(i0 + k, j0 + 1, 96, 88, 98, 0.6);                                 // occhiaia
      // sopracciglio: spesso ma non da cartone, dritto, l'esterno scende; il destro un filo più alto
      for (let k = -3; k <= 3; k++) colore(i0 + k, j0 - 4 + (k * e[0] > 1 ? 1 : 0) - e[3] * (k * e[0] < 0 ? 0 : 0), 40, 35, 42, 0.85);
      colore(i0 - e[0] * 4, j0 - 3, 40, 35, 42, 0.6);
    });
    // ciuffi di capelli scuri che escono dal cappuccio sulla fronte
    for (let i = 0; i < TW; i++) {
      const lungo = 1 + Math.floor(rnd() * 2.2) + (rnd() < 0.18 ? 2 : 0) + (i > 18 && i < 23 ? 2 : 0);   // ciocca a sinistra
      for (let j = 0; j < lungo; j++) colore(i, j, 18, 16, 22, 0.95 - j * 0.1);
    }
    // ombra del cappuccio: il viso è scuro in alto e ai lati e si schiarisce solo su naso, zigomi, bocca e mento
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const x = px(i), y = py(j), o = (j * TW + i) * 4;
      let k = 0.92 - 0.55 * Math.min(1, Math.max(0, (y - 0.095) / 0.065)) - 0.55 * Math.min(1, Math.max(0, (Math.abs(x) - 0.03) / 0.04))
        - 0.25 * Math.min(1, Math.max(0, (0.02 - y) / 0.03));                                  // sotto il mento
      k = Math.max(0.18, k);
      d[o] *= k; d[o + 1] *= k; d[o + 2] *= k;
    }
    q.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return { geo: geo, tex: tex };
  })();
  const volto = new THREE.MeshPhongMaterial({ map: VOLTO.tex, specular: 0x000000, shininess: 0, flatShading: true });

  // ---------- Stoffe (stesso stile del volto: texture dipinte a pixel, pieghe e cuciture) ----------
  const S = PZ.sartoria;
  const F = [0x06070b, 0x0c0e15, 0x13161f, 0x1d212d];            // felpa nera (appena bluastra)
  const PA = [0x0c0f17, 0x131825, 0x1b2132, 0x262d41];           // pantaloni larghi blu notte
  const felpaBusto = S.materiale({ colori: F, pieghe: 16, piegheIn: [0.05, 0.75], pendenza: 0.6, coste: 3,
    cuciture: [0.25, 0.75], seme: 11 }, 0x11141c);
  const felpaManica = S.materiale({ colori: F, pieghe: 14, pendenza: 0.9, seme: 12 }, 0x11141c);
  const felpaPolsino = S.materiale({ colori: F, pieghe: 12, piegheIn: [0.2, 0.6], pendenza: 0.7, coste: 4, seme: 13 }, 0x11141c);
  const felpaTasca = S.materiale({ colori: F, pieghe: 5, seme: 14, dipingi: function (m, C, L) {
    for (let j = 0; j < L; j++) { m(0, j, C[0]); m(L - 1, j, C[0]); }               // bordi cuciti della tasca
  } }, 0x11141c);
  // cappuccio: dentro (davanti, attorno al viso) è quasi nero; fuori pieghe e la cucitura centrale
  const felpaCappuccio = S.materiale({ colori: F, pieghe: 12, pendenza: 0.8, seme: 15,
    dipingi: function (m, C, L) {
      for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) {
        const du = Math.abs((i + 0.5) / L - 0.5), v = 1 - (j + 0.5) / L;
        const k = Math.max(0, 1 - du / 0.2) * Math.min(1, Math.max(0, (v - 0.05) / 0.12)) * Math.min(1, Math.max(0, (0.82 - v) / 0.1));
        if (k > 0) m(i, j, [3, 3, 5], Math.min(1, k * 1.4));
      }
    } }, 0x11141c);
  const felpaBordo = S.materiale({ colori: F, pieghe: 6, pendenza: 0.2, seme: 16 }, 0x11141c);
  const pantCoscia = S.materiale({ colori: PA, pieghe: 13, piegheIn: [0, 0.4], pendenza: 0.9, cuciture: [0.25, 0.75], seme: 21 }, 0x1a2030);
  const pantGamba = S.materiale({ colori: PA, pieghe: 18, piegheIn: [0, 0.35], pendenza: 0.5, cuciture: [0.25, 0.75], seme: 22,
    dipingi: function (m, C, L, rnd) {                                    // pieghe dietro al ginocchio
      for (let f = 0; f < 4; f++) { const j = 2 + f * 2; for (let i = 12; i < 21; i++) if (rnd() < 0.8) m(i + f % 2, j, C[0], 0.8); }
    } }, 0x1a2030);
  const pantBacino = S.materiale({ colori: PA, pieghe: 8, seme: 23, cuciture: [0.5] }, 0x1a2030);
  // scarpe: tomaia grigio scuro, lacci chiari sopra (il centro della texture), punta e tallone rinforzati
  const scarpe = S.materiale({ colori: [0x101216, 0x181b20, 0x22262d, 0x30353e], pieghe: 3, seme: 31,
    dipingi: function (m, C, L) {
      for (let j = 0; j < L; j++) {
        const v = 1 - (j + 0.5) / L;
        if (v > 0.84) for (let i = 0; i < L; i++) m(i, j, C[3], 0.5);                       // punta
        if (v < 0.12) for (let i = 0; i < L; i++) m(i, j, C[0], 0.6);                       // tallone
        if (v > 0.3 && v < 0.66) {                                                         // allacciatura
          for (let i = 13; i <= 18; i++) m(i, j, C[0], 0.8);
          if (j % 3 === 0) for (let i = 13; i <= 18; i++) m(i, j, [120, 118, 112], 0.85);
        }
      }
    } }, 0x1e2127);
  // mani: la stessa pelle del volto (un po' più chiara, fuori dall'ombra del cappuccio), nocche più scure
  const pelle = S.materiale({ colori: [0x5c5862, 0x76717c, 0x837e89, 0x908b96], pieghe: 0, seme: 41,
    dipingi: function (m, C, L, rnd) {
      for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) if (rnd() < 0.08) m(i, j, C[0], 0.4);
    } }, 0x8c8792);

  // Blocco a sezione rettangolare, rastremato: larghezza e profondità in basso (l0, p0) e in alto (l1, p1)
  function blocco(l0, p0, l1, p1, h, materiale) {
    const g = new THREE.BoxGeometry(1, h, 1);
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const k = (q.getY(i) + h / 2) / h;
      q.setX(i, q.getX(i) * (l0 + (l1 - l0) * k));
      q.setZ(i, q.getZ(i) * (p0 + (p1 - p0) * k));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, materiale);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function gruppo(genitore, x, y, z) {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    o.rotation.order = 'YXZ';
    genitore.add(o);
    return o;
  }
  function metti(genitore, mesh, x, y, z) { mesh.position.set(x, y, z); genitore.add(mesh); return mesh; }
  // unisce più geometrie (non indicizzate) in una sola: la catena è un unico oggetto
  function unisci(geos) {
    const parti2 = geos.map(function (g) { return g.index ? g.toNonIndexed() : g; });
    const n = parti2.reduce(function (a, g) { return a + g.attributes.position.count; }, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    parti2.forEach(function (g) {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count;
    });
    const r = new THREE.BufferGeometry();
    r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return r;
  }
  const parti = {};   // ogni pezzo del corpo, con un nome (serve alla dissoluzione nel fumo)

  // ---------- Corpo ----------
  // Ogni pezzo è una forma "a sezioni" (vedi sartoria.js) disegnata nelle coordinate della sua articolazione.
  const L = S.loft;
  function pezzo(genitore, geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    genitore.add(m);
    return m;
  }
  const radice = new THREE.Group();          // il bacino: posizione e direzione di tutto il corpo
  radice.rotation.order = 'YXZ';
  scena.add(radice);
  // bacino dei pantaloni (quasi tutto coperto dalla felpa): fianchi e cavallo
  parti.bacino = pezzo(radice, L([
    { h: -0.13, rx: 0.065, rz: 0.055 }, { h: -0.1, rx: 0.145, rz: 0.095 }, { h: -0.03, rx: 0.155, rz: 0.102, z: 0.004 },
    { h: 0.05, rx: 0.152, rz: 0.099 }, { h: 0.09, rx: 0.14, rz: 0.088 }], { lati: 10, esp: 2.3, seme: 4 }), pantBacino);

  const busto = gruppo(radice, 0, 0.07, 0);  // vita: il busto si piega e ruota da qui
  // felpa oversize: orlo a coste sui fianchi, pancia un po' gonfia (la tasca), petto, spalle scese, collo
  parti.busto = pezzo(busto, L([
    { h: -0.105, rx: 0.168, rz: 0.11 }, { h: -0.072, rx: 0.172, rz: 0.113 }, { h: -0.055, rx: 0.179, rz: 0.12, z: 0.002 },
    { h: 0.05, rx: 0.182, rz: 0.123, z: 0.003 }, { h: 0.18, rx: 0.182, rz: 0.117 }, { h: 0.3, rx: 0.189, rz: 0.115, z: -0.001 },
    { h: 0.39, rx: 0.2, rz: 0.111, z: -0.004 }, { h: 0.44, rx: 0.195, rz: 0.103, z: -0.008 },
    { h: 0.48, rx: 0.158, rz: 0.093, z: -0.01 }, { h: 0.51, rx: 0.098, rz: 0.081, z: -0.01 }, { h: 0.53, rx: 0.062, rz: 0.062, z: -0.01 }],
    { lati: 12, esp: 2.5, irregolare: 0.006, seme: 5 }), felpaBusto);
  // tasca a marsupio: un trapezio cucito davanti alla pancia
  const trapezio = new THREE.Shape();
  trapezio.moveTo(-0.13, -0.05); trapezio.lineTo(0.13, -0.05); trapezio.lineTo(0.097, 0.1); trapezio.lineTo(-0.097, 0.1);
  trapezio.lineTo(-0.13, -0.05);
  const gTasca = new THREE.ExtrudeGeometry(trapezio, { depth: 0.014, bevelEnabled: false });
  const uvT = gTasca.attributes.uv;
  for (let i = 0; i < uvT.count; i++) uvT.setXY(i, uvT.getX(i) * 3 + 0.5, uvT.getY(i) * 3 + 0.2);
  parti.tasca = pezzo(busto, gTasca, felpaTasca);
  parti.tasca.position.set(0, 0, 0.119);
  parti.cordinoSx = metti(busto, blocco(0.012, 0.012, 0.012, 0.012, 0.13, giallo), 0.033, 0.38, 0.114); // cordini gialli
  parti.cordinoDx = metti(busto, blocco(0.012, 0.012, 0.012, 0.012, 0.11, giallo), -0.033, 0.39, 0.114);

  // Collana d'oro: una catena di maglie che scende dalle spalle, sopra la felpa, fino al ciondolo sul petto.
  // Le maglie sono piccoli parallelepipedi orientati lungo la catena, un po' ruotati a vicenda (maglie a catena).
  const tracciato = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 0.488, 0.045), new THREE.Vector3(-0.062, 0.455, 0.112), new THREE.Vector3(-0.035, 0.37, 0.118),
    new THREE.Vector3(0, 0.326, 0.122), new THREE.Vector3(0.035, 0.37, 0.118), new THREE.Vector3(0.062, 0.455, 0.112),
    new THREE.Vector3(0.07, 0.488, 0.045)]);
  const maglie = [], N_MAGLIE = 30, asse = new THREE.Vector3(), su = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < N_MAGLIE; i++) {
    const u = (i + 0.5) / N_MAGLIE, g = new THREE.BoxGeometry(0.009, 0.009, 0.017);
    tracciato.getTangentAt(u, asse);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(su, asse)
      .multiply(new THREE.Quaternion().setFromAxisAngle(su, i % 2 ? Math.PI / 4 : 0))));
    g.translate.apply(g, tracciato.getPointAt(u).toArray());
    maglie.push(g);
  }
  parti.collana = metti(busto, new THREE.Mesh(unisci(maglie), oro), 0, 0, 0);
  // Ciondolo: un orologio da tasca, cassa d'oro a dieci lati, anellino in alto e quadrante giallo
  const orologio = new THREE.Group();
  orologio.position.set(0, 0.268, 0.124);
  busto.add(orologio);
  const cassa = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.014, 10), oro);
  cassa.rotation.x = Math.PI / 2;
  orologio.add(cassa);
  const anello = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.01), oro);
  anello.position.set(0, 0.053, 0);
  orologio.add(anello);
  const faccia = new THREE.Mesh(new THREE.CircleGeometry(0.039, 10), quadrante);
  faccia.position.z = 0.0075;
  orologio.add(faccia);
  [cassa, anello].forEach(function (m) { m.castShadow = true; });
  parti.orologio = cassa; parti.anellino = anello; parti.quadrante = faccia;

  const collo = gruppo(busto, 0, 0.48, 0);
  parti.collo = pezzo(collo, L([{ h: -0.02, rx: 0.07, rz: 0.068 }, { h: 0.04, rx: 0.065, rz: 0.064 }, { h: 0.08, rx: 0.06, rz: 0.06 }],
    { lati: 8, seme: 6 }), felpaBordo);
  const testa = gruppo(collo, 0, 0.05, 0.01);
  testa.scale.setScalar(1.05);   // proporzioni da personaggio di videogioco: testa piena rispetto al corpo snello
  // Cappuccio: un guscio morbido attorno alla testa, con la punta un po' indietro. Davanti, dove c'è il viso,
  // il guscio rientra in profondità (lì la stoffa è quasi nera): il viso resta incassato nel buio.
  const sm = function (a, b, x) { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  parti.cappuccio = pezzo(testa, L([
    { h: -0.045, rx: 0.1, rz: 0.1, z: -0.018 }, { h: 0.0, rx: 0.11, rz: 0.115, z: -0.016 }, { h: 0.06, rx: 0.115, rz: 0.122, z: -0.02 },
    { h: 0.13, rx: 0.116, rz: 0.123, z: -0.024 }, { h: 0.185, rx: 0.11, rz: 0.118, z: -0.031 }, { h: 0.225, rx: 0.093, rz: 0.1, z: -0.04 },
    { h: 0.25, rx: 0.063, rz: 0.074, z: -0.05 }, { h: 0.264, rx: 0.028, rz: 0.038, z: -0.064 }],
    { lati: 12, esp: 2.2, irregolare: 0.007, seme: 7, forma: function (p, a, h) {
      const k = (1 - sm(0.75, 1.2, Math.abs(a))) * sm(-0.035, 0.01, h) * (1 - sm(0.185, 0.222, h));
      p.z -= k * Math.max(0, p.z - 0.045);
    } }), felpaCappuccio);
  // Bordo del cappuccio attorno al viso: una fascia spessa, più sporgente in alto (fa ombra su fronte e occhi).
  // È profonda: dal davanti arriva fin dentro il guscio, così tra bordo e cappuccio non resta nessuna fessura.
  parti.bordo = pezzo(testa, S.anello(function (t) {
    const th = 2 * Math.PI * t, c = Math.cos(th), sn = Math.sin(th);
    const sx = segno(c) * Math.pow(Math.abs(c), 2 / 2.6), sy = segno(sn) * Math.pow(Math.abs(sn), 2 / 2.6);
    const su = Math.max(0, sy), giu = Math.max(0, -sy);
    const davanti = 0.12 + 0.02 * su - 0.016 * giu, dietro = 0.0;      // da dove a dove arriva la fascia (z)
    return { p: new THREE.Vector3(0.087 * sx, 0.097 + 0.104 * sy, (davanti + dietro) / 2),
      fuori: new THREE.Vector3(sx, sy, 0), sezione: [0.014, (davanti - dietro) / 2] };
  }, 24, 6), felpaBordo);
  const viso = new THREE.Mesh(VOLTO.geo, volto);
  viso.castShadow = true; viso.receiveShadow = true;          // il naso fa ombra, il cappuccio fa ombra sul viso
  parti.viso = metti(testa, viso, 0, 0, -0.007);              // un po' rientrato nel cappuccio
  const bocca = new THREE.Object3D();          // punto delle labbra: qui si appoggia la sigaretta
  bocca.position.set(0, 0.048, 0.111);
  testa.add(bocca);

  function segno(v) { return v < 0 ? -1 : 1; }

  // ---------- Braccia e gambe ----------
  function arto(genitore, x, y, z, l1, l2) {
    const sup = gruppo(genitore, x, y, z);
    const inf = gruppo(sup, 0, -l1, 0);
    const fine = gruppo(inf, 0, -l2, 0);
    return { sup: sup, inf: inf, fine: fine, l1: l1, l2: l2 };
  }
  // Mano: palmo sfaccettato, quattro dita appena piegate in avanti e il pollice
  function mano(lato) {
    const geos = [L([{ h: 0.012, rx: 0.026, rz: 0.019 }, { h: -0.01, rx: 0.034, rz: 0.02 }, { h: -0.04, rx: 0.041, rz: 0.019 },
      { h: -0.066, rx: 0.043, rz: 0.016 }, { h: -0.076, rx: 0.039, rz: 0.014 }], { lati: 8, esp: 2.6, seme: 8 })];
    [[-0.027, 0.033], [-0.009, 0.042], [0.009, 0.045], [0.027, 0.041]].forEach(function (d, i) {
      const g = new THREE.BoxGeometry(0.016, d[1], 0.015);
      g.translate(0, -d[1] / 2, 0);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.45 - 0.05 * i));
      // (fase 15) le dita erano in ordine rovesciato (il mignolo accanto al pollice): la mano sembrava girata al
      // contrario. Ora l'indice sta dalla parte del pollice e il mignolo dall'altra, come in una mano vera
      g.translate(lato * d[0], -0.066, 0.002);
      geos.push(g);
    });
    const pol = new THREE.BoxGeometry(0.017, 0.042, 0.016);
    pol.translate(0, -0.021, 0);
    pol.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.55, 0, lato * 0.5)));
    pol.translate(lato * 0.03, -0.012, 0.012);
    geos.push(pol);
    const g = unisci(geos);
    g.scale(1.15, 1.15, 1.15);      // mani grandi, come nei personaggi di riferimento
    g.computeVertexNormals();
    return g;
  }
  const braccia = {}, gambe = {};
  [['sx', 1], ['dx', -1]].forEach(function (lato) {
    const n = lato[0], s = lato[1], N = n === 'sx' ? 'Sx' : 'Dx';
    const br = braccia[n] = arto(busto, s * 0.185, 0.43, 0, 0.29, 0.27);
    // manica larga: spalla scesa, gomito, pieghe dell'avambraccio che si ammucchiano sopra il polsino a coste
    br.mSup = pezzo(br.sup, L([{ h: 0.055, rx: 0.048, rz: 0.048 }, { h: 0.02, rx: 0.058, rz: 0.056 }, { h: -0.05, rx: 0.056, rz: 0.054 },
      { h: -0.17, rx: 0.051, rz: 0.05 }, { h: -0.27, rx: 0.047, rz: 0.047 }, { h: -0.3, rx: 0.044, rz: 0.044 },
      { h: -0.32, rx: 0.033, rz: 0.033 }], { lati: 8, esp: 2.2, irregolare: 0.005, seme: 9 + s }), felpaManica);
    br.mInf = pezzo(br.inf, L([{ h: 0.028, rx: 0.038, rz: 0.038 }, { h: 0.0, rx: 0.047, rz: 0.046 }, { h: -0.1, rx: 0.047, rz: 0.046 },
      { h: -0.2, rx: 0.045, rz: 0.044 }, { h: -0.235, rx: 0.048, rz: 0.047 }, { h: -0.248, rx: 0.039, rz: 0.038 },
      { h: -0.27, rx: 0.036, rz: 0.035 }, { h: -0.276, rx: 0.026, rz: 0.026 }], { lati: 8, esp: 2.2, irregolare: 0.005, seme: 10 + s }),
      felpaPolsino);
    parti['mano' + N] = pezzo(br.fine, mano(s), pelle);
    // gambe: pantaloni larghi, ginocchio, orlo che si ammucchia sulle scarpe
    const gm = gambe[n] = arto(radice, s * 0.1, -0.05, 0, 0.44, 0.42);
    gm.mSup = pezzo(gm.sup, L([{ h: 0.05, rx: 0.067, rz: 0.07 }, { h: -0.03, rx: 0.076, rz: 0.08 }, { h: -0.2, rx: 0.073, rz: 0.075 },
      { h: -0.36, rx: 0.066, rz: 0.069 }, { h: -0.44, rx: 0.062, rz: 0.066, z: 0.005 }, { h: -0.472, rx: 0.05, rz: 0.054 }],
      { lati: 9, esp: 2.2, irregolare: 0.006, seme: 11 + s }), pantCoscia);
    gm.mInf = pezzo(gm.inf, L([{ h: 0.032, rx: 0.05, rz: 0.05 }, { h: 0.0, rx: 0.063, rz: 0.067, z: 0.006 }, { h: -0.06, rx: 0.062, rz: 0.065 },
      { h: -0.2, rx: 0.064, rz: 0.065 }, { h: -0.33, rx: 0.068, rz: 0.069 }, { h: -0.39, rx: 0.074, rz: 0.075 },
      { h: -0.41, rx: 0.07, rz: 0.072 }, { h: -0.43, rx: 0.074, rz: 0.076 }],
      { lati: 9, esp: 2.2, irregolare: 0.007, seme: 12 + s, apertoSotto: true }), pantGamba);
    // scarpe: sneaker basse, tallone, collo imbottito, allacciatura che scende verso la punta arrotondata
    const pianta = [[-0.095, 0.042, 0.03, -0.045], [-0.08, 0.05, 0.045, -0.03], [-0.03, 0.056, 0.052, -0.017], [0.03, 0.058, 0.045, -0.022],
      [0.09, 0.058, 0.034, -0.033], [0.15, 0.054, 0.026, -0.041], [0.19, 0.044, 0.021, -0.046], [0.205, 0.028, 0.015, -0.051]];
    parti['scarpa' + N] = pezzo(gm.fine, L(pianta.map(function (p) { return { h: p[0], rx: p[1], rz: p[2], y: p[3] }; }),
      { lati: 8, esp: 2.6, asse: 'z', seme: 13 + s }), scarpe);
    // suola: la riga gialla tutto attorno
    parti['suola' + N] = pezzo(gm.fine, L(pianta.map(function (p) { return { h: p[0] + (p[0] < 0 ? -0.004 : 0.004), rx: p[1] + 0.006, rz: 0.0075, y: -0.0695 }; }),
      { lati: 8, esp: 3, asse: 'z', seme: 14 }), giallo);
    parti['braccio' + N] = br.mSup; parti['avambraccio' + N] = br.mInf;
    parti['coscia' + N] = gm.mSup; parti['gamba' + N] = gm.mInf;
  });

  const dita = new THREE.Object3D();             // tra indice e medio della mano destra: qui si tiene la sigaretta
  dita.position.set(0, -0.098, 0.012);
  braccia.dx.fine.add(dita);

  // ---------- Dissoluzione nel fumo ----------
  // Ogni parte ha un valore da 0 (intera) a 1 (sparita). La superficie è divisa in cubetti di 3,5 cm che
  // scompaiono in ordine casuale; dove il materiale si sta consumando il bordo diventa giallo acceso.
  // Vale anche per l'ombra: una parte sparita non proietta più ombra.
  const CODICE = 'uniform float uDiss;\nvarying vec3 vPosDiss;\n' +
    'float casoDiss() { vec3 c = floor(vPosDiss / 0.035 + 0.5); return fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\n';
  function dissolvibile(materiale, u, bordo) {
    const m = materiale.clone();
    if (bordo) m.side = THREE.DoubleSide;   // dai buchi si vede l'interno, non il vuoto
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uDiss = u;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPosDiss;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosDiss = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + CODICE)
        .replace('void main() {', 'void main() {\nfloat rDiss = casoDiss();\nfloat sDiss = uDiss * 1.15 - 0.075;\nif (rDiss < sDiss) discard;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' +
          'if (uDiss > 0.0 && rDiss < sDiss + 0.13) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.894, 1.0, 0.102), 0.85);');
    };
    return m;
  }
  const colori = new Map([[giallo, C.giallo], [volto, 0x6e6a74],
    [oro, 0xd9a81e], [quadrante, C.giallo]]);
  Object.keys(parti).forEach(function (nome) {
    const mesh = parti[nome], u = { value: 0 };
    const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    mesh.userData.colore = base.userData.colore !== undefined ? base.userData.colore : colori.get(base);
    mesh.userData.diss = u;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(function (m) { return dissolvibile(m, u, true); })
      : dissolvibile(mesh.material, u, true);
    mesh.customDepthMaterial = dissolvibile(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), u, false);
  });
  function dissolvi(nome, v) {
    const m = parti[nome];
    m.userData.diss.value = v;
    m.visible = v < 1;
  }

  // ---------- Cinematica inversa a due segmenti ----------
  const M = new THREE.Matrix4();
  const vA = new THREE.Vector3(), vE = new THREE.Vector3(), vT = new THREE.Vector3(), vU = new THREE.Vector3(),
    vW = new THREE.Vector3(), vY = new THREE.Vector3(), vZ = new THREE.Vector3(), vX = new THREE.Vector3();
  const qP = new THREE.Quaternion(), qU = new THREE.Quaternion(), qL = new THREE.Quaternion();

  function morbidaIK(a, b, x) { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }

  // Orientamento con l'asse y del segmento lungo "y" e l'asse z il più possibile verso "z"
  function base(y, z, out) {
    vZ.copy(z).addScaledVector(y, -z.dot(y));
    if (vZ.lengthSq() < 1e-8) vZ.set(0, 0, 1).addScaledVector(y, -y.z); // caso limite: z parallelo al segmento
    if (vZ.lengthSq() < 1e-8) vZ.set(1, 0, 0).addScaledVector(y, -y.x);
    vZ.normalize();
    vX.crossVectors(y, vZ);
    M.makeBasis(vX, y, vZ);
    return out.setFromRotationMatrix(M);
  }

  // Piega l'arto perché l'estremità (polso o caviglia) raggiunga "bersaglio"; il gomito/ginocchio va verso "polo".
  // "riserva" (facoltativa) è una seconda direzione per il gomito: entra in gioco, dolcemente, solo quando l'arto
  // punta quasi esattamente verso "polo" (per esempio la mano appoggiata a terra dietro di sé mentre si siede).
  // Lì "polo" non indica più da che parte piegare e l'arto, senza riserva, ruoterebbe di mezzo giro di colpo.
  const vR = new THREE.Vector3(), poloEff = new THREE.Vector3(), vPa = new THREE.Vector3();
  function raggiungi(a, bersaglio, polo, riserva, palmo) {
    a.sup.parent.updateMatrixWorld(true);
    a.sup.getWorldPosition(vA);
    vU.subVectors(bersaglio, vA);
    const d = Math.max(Math.abs(a.l1 - a.l2) + 0.002, Math.min(a.l1 + a.l2 - 0.0005, vU.length()));
    vU.normalize();
    const cosA = (a.l1 * a.l1 + d * d - a.l2 * a.l2) / (2 * a.l1 * d);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    vW.copy(polo).addScaledVector(vU, -polo.dot(vU));
    const chiaro = vW.length();                       // 1 = polo ben definito, 0 = polo lungo il braccio
    if (vW.lengthSq() < 1e-8) vW.set(0, 1, 0).addScaledVector(vU, -vU.y);
    vW.normalize();
    // Braccia: quando il polo è quasi allineato al braccio (la mano a terra dietro di sé) non dice più da che
    // parte piegare. Allora il gomito tiene la direzione che aveva un attimo prima (trasportata sul braccio nuovo)
    // e torna al polo appena questo ridiventa chiaro: niente giravolte. Se il tempo salta (si cerca un altro
    // momento del video) riparte dal polo.
    if (riserva) {
      if (a.wPrima && a.uPrima.dot(vU) > 0.95) {
        vR.copy(a.wPrima).addScaledVector(vU, -a.wPrima.dot(vU));
        if (vR.lengthSq() > 1e-6) {
          const w = morbidaIK(0.3, 0.7, chiaro);
          vW.multiplyScalar(w).addScaledVector(vR.normalize(), 1 - w);
          // anche con il polo chiaro, al massimo ~8 gradi per fotogramma: un gomito non scatta
          const ang = vW.angleTo(vR);
          if (ang > 0.14) vW.normalize().lerp(vR, 1 - 0.14 / ang);
          vW.normalize();
        }
      }
      if (!a.wOra) { a.wOra = new THREE.Vector3(); a.uOra = new THREE.Vector3(); }
      a.wOra.copy(vW); a.uOra.copy(vU);
    }
    vE.copy(vA).addScaledVector(vU, a.l1 * cosA).addScaledVector(vW, a.l1 * sinA);
    vT.copy(vA).addScaledVector(vU, d);
    // Rotazione dei segmenti attorno al proprio asse. Per le braccia si prende dal piano in cui il braccio si
    // piega (perpendicolare a ogni segmento, quindi non si capovolge mai): niente giravolte improvvise.
    // Per le gambe resta il polo, come sempre.
    const zU = riserva ? vR.copy(vW).multiplyScalar(cosA).addScaledVector(vU, -sinA) : polo;
    base(vY.subVectors(vA, vE).normalize(), zU, qU);
    a.sup.parent.getWorldQuaternion(qP);
    a.sup.quaternion.copy(qP.invert().multiply(qU));
    let zL = riserva ? vR.copy(vW).multiplyScalar(d - a.l1 * cosA).addScaledVector(vU, a.l1 * sinA) : polo;
    vY.subVectors(vE, vT).normalize();
    // Braccia: l'avambraccio (e con lui la mano) ruota su se stesso perché il palmo guardi verso "palmo" (verso il
    // corpo e in giù: lungo i fianchi pollice in avanti, sul manubrio e sulle ginocchia palmo in giù, alla bocca
    // palmo verso il viso). Quando l'avambraccio punta proprio in quella direzione, il palmo tiene l'orientamento
    // di un attimo prima; e comunque non ruota mai più di ~8 gradi per fotogramma.
    if (palmo) {
      vPa.copy(palmo).normalize();
      vPa.addScaledVector(vY, -vPa.dot(vY));
      const chiaroP = vPa.length();
      if (chiaroP > 1e-4) vPa.multiplyScalar(1 / chiaroP); else vPa.copy(zL).negate().normalize();
      if (a.pPrima && a.yPrima.dot(vY) > 0.95) {
        vR.copy(a.pPrima).addScaledVector(vY, -a.pPrima.dot(vY));
        if (vR.lengthSq() > 1e-6) {
          vR.normalize();
          const w = morbidaIK(0.3, 0.7, chiaroP);
          vPa.multiplyScalar(w).addScaledVector(vR, 1 - w);
          if (vPa.lengthSq() < 1e-6) vPa.copy(vR);
          vPa.normalize();
          const ang = vPa.angleTo(vR);
          if (ang > 0.14) vPa.copy(vR).lerp(vPa, 0.14 / ang).normalize();
        }
      }
      if (!a.pOra) { a.pOra = new THREE.Vector3(); a.yOra = new THREE.Vector3(); }
      a.pOra.copy(vPa); a.yOra.copy(vY);
      zL = vPa;
    }
    base(vY, zL, qL);
    a.inf.quaternion.copy(qU.invert().multiply(qL));
    a.sup.updateMatrixWorld(true);
  }

  // Orienta un piede: punta verso "avanti", sollevata di "beccheggio" radianti (+ = punta in su)
  const vSu = new THREE.Vector3(), vAv = new THREE.Vector3(), qF = new THREE.Quaternion();
  function orientaPiede(a, avanti, beccheggio) {
    const c = Math.cos(beccheggio), s = Math.sin(beccheggio);
    vAv.copy(avanti).setY(0).normalize();
    vSu.set(0, 1, 0).multiplyScalar(c).addScaledVector(vAv, -s);
    vAv.multiplyScalar(c).y = s;
    base(vSu, vAv, qF);
    a.inf.getWorldQuaternion(qP);
    a.fine.quaternion.copy(qP.invert().multiply(qF));
  }

  // ---------- Posa completa ----------
  // s.pos (bacino nel mondo), s.dir (direzione, 0 = +z), s.bacino {x: avanti, z: lato}, s.busto {x, y, z},
  // s.testa {x: + = guarda in basso, y: + = gira a sinistra}, s.mani {sx, dx} e s.piedi {sx, dx} (punti nel mondo),
  // s.punte {sx, dx} (beccheggio dei piedi), s.dirPiedi (direzione dei piedi, se diversa da quella del corpo)
  const polo = new THREE.Vector3(), riservaB = new THREE.Vector3(), qR = new THREE.Quaternion(), avanti = new THREE.Vector3();
  const poloAlto = new THREE.Vector3(), vSp = new THREE.Vector3(), qI = new THREE.Quaternion();
  const palmoB = new THREE.Vector3(), giuB = new THREE.Vector3(0, -0.7, 0);
  function posa(s) {
    radice.position.copy(s.pos);
    radice.rotation.set(s.bacino.x, s.dir, s.bacino.z);
    busto.rotation.set(s.busto.x, s.busto.y, s.busto.z);
    collo.rotation.set(s.testa.x * 0.35, s.testa.y * 0.3, 0.4 * (s.testa.z || 0));
    testa.rotation.set(s.testa.x * 0.65, s.testa.y * 0.7, s.testa.z || 0);
    radice.updateMatrixWorld(true);

    radice.getWorldQuaternion(qR);
    const dp = s.dirPiedi === undefined ? s.dir : s.dirPiedi;
    avanti.set(Math.sin(dp), 0, Math.cos(dp));
    ['sx', 'dx'].forEach(function (n) {
      const lato = n === 'sx' ? 1 : -1;
      // s.poli (facoltativo): verso dove punta il ginocchio, nel mondo (serve per scavalcare la sella); senza, in avanti
      const pg = s.poli && s.poli[n];
      raggiungi(gambe[n], s.piedi[n], pg ? polo.copy(pg).normalize() : polo.set(lato * 0.12, 0.35, 1).normalize().applyQuaternion(qR));
      orientaPiede(gambe[n], avanti, s.punte ? s.punte[n] : 0);
    });
    busto.getWorldQuaternion(qR);
    qI.copy(qR).invert();
    ['sx', 'dx'].forEach(function (n) {
      const lato = n === 'sx' ? 1 : -1;
      // Direzione del gomito: di solito in fuori, in basso e indietro. Quando la mano sale verso il viso (sigaretta,
      // accendino) quella direzione finirebbe quasi opposta al braccio e il gomito girerebbe di colpo: allora,
      // man mano che la mano sale sopra la spalla, il gomito punta in basso e appena in avanti, come in un
      // gesto vero di portare la mano alla bocca.
      braccia[n].sup.getWorldPosition(vSp);
      vSp.subVectors(s.mani[n], vSp).normalize().applyQuaternion(qI);
      const k = morbidaIK(-0.12, 0.2, vSp.y);
      // in basso il gomito va indietro, in fuori e un po' giù (come in un braccio vero)
      polo.set(lato * 0.55, -0.45, -0.7).normalize().lerp(poloAlto.set(lato * 0.5, -1, 0.15).normalize(), k)
        .normalize().applyQuaternion(qR);
      // palmo verso il corpo (e un po' in giù): mani lungo i fianchi col pollice in avanti, sul manubrio e sulle
      // ginocchia col palmo in giù, alla bocca col palmo verso il viso
      palmoB.set(-lato, 0, 0).applyQuaternion(qR).add(giuB);
      raggiungi(braccia[n], s.mani[n], polo, riservaB.set(lato, 0, 0).applyQuaternion(qR), palmoB);
    });
    radice.updateMatrixWorld(true);
  }

  // A fine fotogramma (dopo l'ultima posa) si ricorda l'orientamento di gomiti e polsi: il fotogramma dopo parte da
  // lì (durante un fotogramma la posa può essere ricalcolata più volte, per portare le mani al viso)
  function conferma() {
    [braccia.sx, braccia.dx].forEach(function (a) {
      if (a.wOra) { if (!a.wPrima) { a.wPrima = new THREE.Vector3(); a.uPrima = new THREE.Vector3(); } a.wPrima.copy(a.wOra); a.uPrima.copy(a.uOra); }
      if (a.pOra) { if (!a.pPrima) { a.pPrima = new THREE.Vector3(); a.yPrima = new THREE.Vector3(); } a.pPrima.copy(a.pOra); a.yPrima.copy(a.yOra); }
    });
  }

  return {
    conferma: conferma,
    gruppo: radice, posa: posa, parti: parti, dissolvi: dissolvi, bocca: bocca, dita: dita, testa: testa,
    mano: function (n) { return braccia[n].fine; },
    misure: { anca: [0.1, -0.05], coscia: 0.44, gamba: 0.42, caviglia: 0.077, spalla: [0.185, 0.5], braccio: 0.29, avambraccio: 0.27 }
  };
};
