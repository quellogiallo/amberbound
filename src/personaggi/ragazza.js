// IL FANTASMA DELLA RAGAZZA: un'allucinazione che compare in strada e ostacola il ragazzo.
// È la ragazza della cameretta (vestito viola, capelli scuri lunghi), fatta con gli stessi strumenti del protagonista
// (forme a sezioni sfaccettate e stoffe dipinte a pixel di sartoria.js, materiali opachi, ombreggiatura piatta):
// stesso mondo, stesse proporzioni da videogioco PS2. Il modello del ragazzo non è toccato.
// Pelle bianchissima, freddo bagliore attorno, una ferita rossa che cola dalla tempia destra, occhi segnati dal pianto.
//
// Sei pose (ogni ragazza nasce in una posa e resta in quella). Da SALTARE (basse, come una transenna):
//   'seduta'       seduta per terra, ginocchia al petto, il viso tra le mani, singhiozza;
//   'ginocchio'    in ginocchio sui talloni, piegata in avanti, il viso coperto: si dondola;
//   'rannicchiata' stesa su un fianco, rannicchiata, trema.
// Da EVITARE cambiando corsia (in piedi):
//   'piedi'        ti guarda e ti saluta con la mano;
//   'fissa'        immobile, braccia abbandonate, testa piegata: ti fissa, e ogni tanto la testa scatta;
//   'braccia'      ti tende le braccia come per fermarti.
// Più una posa per la cameretta: 'distesa', supina sul pavimento (con opzioni.naturale: la stessa ragazza, viva, con la
// pelle di colore naturale, senza bagliore freddo, senza alone e senza sfarfallio).
// Interfaccia uguale a quella delle sagome (demone.js): gruppo, visibile, larghezza, mostra, nascondi, appari,
// svanisci, aggiorna(dt, intensita). Per restare leggera i pezzi che non si muovono sono uniti per materiale.
PZ.creaRagazza = function (scena, posa, seme, opzioni) {
  const V3 = THREE.Vector3, S = PZ.sartoria, L = S.loft;
  const PI = Math.PI, NATURALE = !!(opzioni && opzioni.naturale);

  // ---------- Materiali: stesse stoffe dipinte del ragazzo, nei colori della ragazza (sbiaditi) ----------
  const fredda = function (m, k) { if (!NATURALE) m.emissive = new THREE.Color(0x1c2434).multiplyScalar(k || 1); return m; };   // luce propria fredda (solo il fantasma)
  const VESTITO = [0x34263c, 0x4b3954, 0x5f4b69, 0x73607d];
  const vestito = fredda(S.materiale({ colori: VESTITO, pieghe: 14, piegheIn: [0.1, 0.9], pendenza: 0.7, coste: 2, cuciture: [0.25, 0.75], seme: 61 }));
  const gonna = fredda(S.materiale({ colori: VESTITO, pieghe: 18, piegheIn: [0, 1], pendenza: 0.15, coste: 2, seme: 62 }));
  const manica = fredda(S.materiale({ colori: VESTITO, pieghe: 10, pendenza: 0.9, coste: 3, seme: 63 }));
  // pelle: bianchissima per il fantasma; nella cameretta un incarnato naturale (stessi quattro toni, stesse ombre)
  const PELLE = NATURALE ? [0xc4927e, 0xdcab93, 0xedc1a8, 0xf7d5bf] : [0xaeb7c3, 0xc9d1da, 0xdde3e9, 0xeef2f6];
  const pelle = fredda(S.materiale({ colori: PELLE, pieghe: 0, seme: 64, dipingi: function (m, C, Lt, rnd) {
    for (let j = 0; j < Lt; j++) for (let i = 0; i < Lt; i++) if (rnd() < 0.06) m(i, j, C[0], 0.35);
  } }), 1.6);
  const CAPELLI = [0x0b0710, 0x130c18, 0x1c1222, 0x2a1a2d];
  const capelli = fredda(S.materiale({ colori: CAPELLI, pieghe: 22, piegheIn: [0, 1], pendenza: 0.05, seme: 65 }), 0.6);
  const scarpe = fredda(S.materiale({ colori: [0x0e0c12, 0x16131b, 0x201b26, 0x2c2633], pieghe: 2, seme: 66 }), 0.4);
  // la testa (cranio): solo pelle, ombre sui lati e la ferita sulla tempia destra che cola; il viso vero è il VOLTO
  // scolpito qui sotto, appoggiato davanti (u attorno alla testa, davanti a u = 0,5; v dal mento in su)
  const viso = (function () {
    const N = 48, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const q = cv.getContext('2d'), img = q.createImageData(N, N), d = img.data, rnd = S.caso(67);
    const C = PELLE.map(function (c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; });
    function px(u, v, c, k) {
      const i = Math.round(u * N - 0.5), j = Math.round((1 - v) * N - 0.5);
      if (j < 0 || j >= N) return;
      const p = (j * N + ((i % N) + N) % N) * 4; k = k === undefined ? 1 : k;
      for (let z = 0; z < 3; z++) d[p + z] += (c[z] - d[p + z]) * k;
      d[p + 3] = 255;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const r = rnd(), u = (i + 0.5) / N, v = 1 - (j + 0.5) / N, c = r < 0.1 ? C[1] : r < 0.9 ? C[2] : C[3];
      px(u, v, C[2]); px(u, v, c, 0.4);
      const fronte = Math.max(0, 1 - Math.abs(u - 0.5) / 0.3);              // ai lati e dietro più in ombra
      px(u, v, C[0], 0.35 * (1 - fronte));
    }
    const u1 = 1 / N, v1 = 1 / N;
    // la ferita sulla tempia destra (alla sua destra, quindi u < 0,5): rosso scuro al centro, rosso vivo attorno,
    // e due righe che colano verso la guancia
    const ut = 0.33, vt = 0.62;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const r = Math.abs(a) + Math.abs(b);
      if (r <= 3) px(ut + a * u1, vt + b * v1, r <= 1 ? [92, 6, 12] : [176, 18, 22], r <= 1 ? 1 : 0.9);
    }
    for (let k = 1; k < 12; k++) px(ut + (k > 6 ? u1 : 0), vt - (2 + k) * v1, [160, 14, 20], k < 9 ? 0.9 : 0.6);
    for (let k = 1; k < 7; k++) px(ut + 2 * u1, vt - (2 + k) * v1, [140, 10, 16], 0.8);
    q.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = THREE.RepeatWrapping;
    return fredda(new THREE.MeshPhongMaterial({ map: t, specular: 0x000000, shininess: 0, flatShading: true }), 1.6);
  })();

  // ---------- Volto (fase 62) ----------
  // Lo stesso metodo del volto del ragazzo (ragazzo.js): una superficie sfaccettata di circa 450 triangoli, scolpita
  // (mento piccolo, mascella sottile, zigomi alti, naso piccolo con le ali, labbra piene, orbite morbide, arcate
  // appena accennate) e una texture di 32 x 40 pixel con la stessa proiezione frontale. Qui non c'è il cappuccio: la
  // superficie nasce dalla forma del cranio (stesse sezioni della testa qui sotto) e ai bordi rientra dentro il cranio,
  // così il viso e la testa sono un pezzo solo. Un po' irregolare e asimmetrica, come una persona vera.
  // Misure in metri, nelle coordinate della testa: mento a y = -0,022, bocca a y = 0,036, occhi a y = 0,105, attaccatura dei capelli a y = 0,155.
  const CRANIO = [{ h: -0.025, rx: 0.03, rz: 0.035, z: 0.02 }, { h: 0.0, rx: 0.06, rz: 0.07, z: 0.012 }, { h: 0.05, rx: 0.08, rz: 0.092 },
    { h: 0.11, rx: 0.088, rz: 0.1 }, { h: 0.16, rx: 0.085, rz: 0.097 }, { h: 0.2, rx: 0.07, rz: 0.08 }, { h: 0.225, rx: 0.038, rz: 0.045 }, { h: 0.235, rx: 0.01, rz: 0.012 }];
  const VOLTO = (function () {
    const lerpT = function (tab, y) {
      if (y <= tab[0][0]) return tab[0][1];
      for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) {
        const a = tab[i - 1], b = tab[i], k = (y - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * k;
      }
      return tab[tab.length - 1][1];
    };
    const g = function (x, s) { return Math.exp(-(x * x) / (s * s)); };
    // davanti del cranio (ellisse della sezione) all'altezza y, a distanza x dal centro
    function cranio(x, y) {
      let i = 1; while (i < CRANIO.length - 1 && CRANIO[i].h < y) i++;
      const a = CRANIO[i - 1], b = CRANIO[i], k = Math.max(0, Math.min(1, (y - a.h) / (b.h - a.h)));
      const rx = a.rx + (b.rx - a.rx) * k, rz = a.rz + (b.rz - a.rz) * k, zc = (a.z || 0) + ((b.z || 0) - (a.z || 0)) * k;
      return zc + rz * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx)));
    }
    // mezza larghezza del viso: mento piccolo e appuntito, mascella sottile, zigomi alti, fronte che sale nei capelli
    const LARGO = [[-0.022, 0.017], [-0.01, 0.028], [0.002, 0.039], [0.016, 0.049], [0.031, 0.056], [0.05, 0.062], [0.07, 0.067],
      [0.09, 0.07], [0.11, 0.071], [0.13, 0.07], [0.155, 0.066]];
    // naso: piccolo, punta un po' all'insù; sporgenza al centro e larghezza (frazione della mezza larghezza)
    const NASO = [[0.056, 0], [0.061, 0.006], [0.067, 0.013], [0.075, 0.012], [0.087, 0.008], [0.1, 0.004], [0.112, 0.001], [0.12, 0]];
    const NASO_L = [[0.061, 0.17], [0.07, 0.2], [0.088, 0.12], [0.11, 0.1]];
    let seme = 19;
    const caso = function () { seme = (seme * 16807) % 2147483647; return seme / 2147483647 - 0.5; };
    function profondita(u, x, y) {
      const a = Math.abs(u), lab = g(u, 0.36) * (u < 0 ? 1 : 0.95);
      let z = cranio(x, y) + 0.005 - 0.014 * Math.pow(a, 4);                              // ai bordi rientra nel cranio
      z += lerpT(NASO, y) * g(u, lerpT(NASO_L, y));                                     // naso
      z += 0.0035 * g(a - 0.24, 0.08) * g(y - 0.062, 0.005);                            // ali del naso
      z -= 0.0065 * g(a - 0.42, 0.2) * g(y - 0.104, 0.011);                             // orbite (morbide)
      z += 0.0028 * g(a - 0.4, 0.3) * g(y - 0.124, 0.006);                              // arcate appena accennate
      z += 0.005 * g(a - 0.62, 0.17) * g(y - 0.086, 0.011);                             // zigomi alti
      z += 0.002 * g(a - 0.5, 0.2) * g(y - 0.058, 0.014);                               // guance piene
      z += lab * (0.0048 * g(y - 0.029, 0.005) - 0.002 * g(y - 0.036, 0.0022) + 0.0042 * g(y - 0.042, 0.0038)); // labbra piene
      z -= 0.0015 * g(u, 0.12) * g(y - 0.05, 0.004);                                    // solco sopra il labbro
      z += 0.004 * g(u, 0.26) * g(y - 0.004, 0.009);                                    // mento
      return z;
    }
    const U = [-1, -0.8, -0.6, -0.43, -0.28, -0.14, 0, 0.14, 0.28, 0.43, 0.6, 0.8, 1];
    const Y = [-0.022, -0.01, 0.002, 0.014, 0.023, 0.03, 0.036, 0.042, 0.05, 0.057, 0.064, 0.072, 0.081, 0.091, 0.099, 0.106,
      0.113, 0.122, 0.133, 0.144, 0.155];
    const pos = [], nu = U.length, ny = Y.length;
    const ALTO = 0.155, BASSO = -0.022, MEZZA = 0.073;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nu; i++) {
      const y = Y[j], u = U[i], w = lerpT(LARGO, y) * (u < 0 ? 1.015 : 1);            // lato destro un filo più largo
      const x = u * w + (j > 0 && j < ny - 1 && i > 0 && i < nu - 1 ? caso() * 0.0014 : 0);
      const z = profondita(u, x, y) + (i > 0 && i < nu - 1 ? caso() * 0.0009 : 0);
      pos.push([x, y + (j > 0 && j < ny - 1 ? caso() * 0.0006 : 0), z]);
    }
    const P3 = [], UV = [];
    function vert(i, j) {
      const v = pos[j * nu + i];
      P3.push(v[0], v[1], v[2]);
      UV.push((v[0] + MEZZA) / (2 * MEZZA), (v[1] - BASSO) / (ALTO - BASSO));
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nu - 1; i++) {
      if ((i + j) % 2) { vert(i, j); vert(i + 1, j); vert(i + 1, j + 1); vert(i, j); vert(i + 1, j + 1); vert(i, j + 1); }
      else { vert(i, j); vert(i + 1, j); vert(i, j + 1); vert(i + 1, j); vert(i + 1, j + 1); vert(i, j + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    geo.computeVertexNormals();

    // Texture: 32 x 40 pixel, stessa proiezione frontale della geometria (come quella del ragazzo)
    const TW = 32, TH = 40, c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    const q = c.getContext('2d'), img = q.createImageData(TW, TH), d = img.data;
    const rnd = S.caso(93), CP = PELLE.map(function (k) { return [(k >> 16) & 255, (k >> 8) & 255, k & 255]; });
    const px = function (i) { return -MEZZA + (i + 0.5) / TW * 2 * MEZZA; };
    const py = function (j) { return ALTO - (j + 0.5) / TH * (ALTO - BASSO); };
    const colore = function (i, j, c3, k) {
      if (i < 0 || j < 0 || i >= TW || j >= TH) return;
      const o = (j * TW + i) * 4; k = k === undefined ? 1 : k;
      d[o] += (c3[0] - d[o]) * k; d[o + 1] += (c3[1] - d[o + 1]) * k; d[o + 2] += (c3[2] - d[o + 2]) * k;
    };
    const aI = function (x) { return Math.round((x + MEZZA) / (2 * MEZZA) * TW - 0.5); };
    const aJ = function (y) { return Math.round((ALTO - y) / (ALTO - BASSO) * TH - 0.5); };
    // colori: viva (cameretta) o fantasma (strada)
    const K = NATURALE ? { labbra: [166, 88, 100], labbro: [92, 38, 50], rosa: [228, 150, 150], pianto: [196, 120, 128], trucco: [58, 40, 56],
      occhio: [232, 222, 216], iride: [52, 34, 30], ciglia: [24, 16, 22], sopracc: [46, 30, 34], ombra: CP[0], capelli: [20, 12, 24] }
      : { labbra: [124, 108, 136], labbro: [66, 54, 84], rosa: [170, 182, 206], pianto: [120, 118, 152], trucco: [40, 36, 58],
      occhio: [214, 222, 232], iride: [30, 26, 40], ciglia: [16, 12, 22], sopracc: [44, 36, 54], ombra: CP[0], capelli: [16, 10, 20] };
    // pelle: il tono del cranio, con la grana dei pixel; ai bordi l'ombra dei lati della testa (così il passaggio non si vede)
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const x = px(i), y = py(j), o = (j * TW + i) * 4, r = rnd(), cc = r < 0.1 ? CP[1] : r < 0.9 ? CP[2] : CP[3];
      d[o] = CP[2][0]; d[o + 1] = CP[2][1]; d[o + 2] = CP[2][2]; d[o + 3] = 255;
      colore(i, j, cc, 0.4);
      colore(i, j, K.ombra, 0.18 * Math.min(1, Math.max(0, (Math.abs(x) - 0.035) / 0.03)) + 0.12 * Math.min(1, Math.max(0, (0.012 - y) / 0.03)));
      colore(i, j, CP[3], 0.25 * g(x, 0.012) * g(y - 0.07, 0.03));                                   // luce sul dorso del naso
      colore(i, j, K.rosa, 0.22 * g(Math.abs(x) - 0.038, 0.014) * g(y - 0.074, 0.014));               // guance arrossate dal pianto
    }
    // naso: narici piccole e ombra sotto la punta
    colore(aI(-0.0062), aJ(0.059), K.ombra, 0.75); colore(aI(0.0062), aJ(0.059), K.ombra, 0.75);
    colore(aI(0), aJ(0.057), K.ombra, 0.3);
    // bocca: labbra piene, piegate appena in giù agli angoli; il superiore più scuro, l'inferiore con un riflesso
    for (let i = aI(-0.019); i <= aI(0.019); i++) {
      const x = px(i), giu = Math.abs(x) > 0.014 ? 1 : 0, bordo = Math.abs(x) > 0.016 ? 0.55 : 1;
      const jb = aJ(0.036);
      colore(i, jb - 1 + giu, K.labbra, 0.75 * bordo);                       // labbro superiore
      colore(i, jb + giu, K.labbro, 0.95);                                   // la piega
      if (Math.abs(x) < 0.016) colore(i, jb + 1, K.labbra, 0.8);             // labbro inferiore
      if (Math.abs(x) < 0.006) colore(i, jb + 1, CP[3], 0.3);
    }
    // occhi: a mandorla, più grandi di quelli del ragazzo ma piccoli rispetto a un cartone; palpebra con le ciglia
    // e un filo di trucco che scappa verso l'esterno, iride scura che guarda dritta, bordo sotto arrossato dal pianto
    [[-1, 0.0275, 0.1048, 0], [1, 0.0272, 0.1052, 1]].forEach(function (e) {
      const s = e[0], cx = s * e[1], i0 = aI(cx), j0 = aJ(e[2]);
      for (let k = -3; k <= 3; k++) for (let h = -2; h <= 2; h++) colore(i0 + k, j0 + h, K.ombra, 0.4 * g(k / 3.5, 1) * g(h / 2.5, 1));   // orbita
      for (let k = -2; k <= 3; k++) colore(i0 + s * k, j0 - 1, K.ciglia, k === -2 ? 0.6 : 0.95);                              // palpebra e ciglia
      colore(i0 + s * 4, j0 - 2, K.ciglia, 0.75);                                                                              // la codina del trucco
      for (let k = -2; k <= 2; k++) colore(i0 + s * k, j0, K.occhio, Math.abs(k) === 2 ? 0.55 : 0.9);                         // bianco
      colore(i0 + s * 3, j0, K.ciglia, 0.5);
      colore(i0 - 1 + e[3], j0, K.iride, 1); colore(i0 + e[3], j0, K.iride, 1);                                               // iride
      colore(i0 - 1 + e[3], j0 - 1, K.ciglia, 1);
      for (let k = -2; k <= 2; k++) colore(i0 + s * k, j0 + 1, K.pianto, 0.7);                                                // bordo arrossato
      for (let k = -1; k <= 2; k++) colore(i0 + s * k, j0 + 2, K.ombra, 0.35);                                               // occhiaia
      // sopracciglia sottili e tristi: l'interno sale, l'esterno scende
      for (let k = -2; k <= 3; k++) colore(i0 + s * k, j0 - 4 + (k >= 1 ? 1 : 0) - (k === -2 ? 1 : 0), K.sopracc, k === 3 ? 0.55 : 0.85);
      // il trucco colato con le lacrime: due righe che scendono sulla guancia (una più lunga)
      const lunga = s < 0 ? 9 : 7;
      for (let k = 2; k < lunga; k++) colore(i0 + s * (k > 5 ? 1 : 0), j0 + k, k < 5 ? K.trucco : K.pianto, k < 5 ? 0.75 : 0.6);
      for (let k = 2; k < 5; k++) colore(i0 + s * 2, j0 + k, K.trucco, 0.45);
    });
    // il sangue della tempia destra arriva fino al bordo del viso e cola lungo la guancia
    for (let k = 0; k < 12; k++) colore(aI(-0.063 + (k > 6 ? 0.0045 : 0)), aJ(0.118) + k, [150, 12, 18], k < 9 ? 0.85 : 0.5);
    colore(aI(-0.059), aJ(0.118) + 2, [176, 18, 22], 0.6);
    // capelli che scendono sulla fronte: una frangia di lato, più lunga sulla sua destra
    for (let i = 0; i < TW; i++) {
      const x = px(i), lungo = 1 + Math.floor(rnd() * 1.8) + (x < -0.01 ? Math.round(5 * Math.min(1, (-0.01 - x) / 0.04)) : 0) + (rnd() < 0.15 ? 1 : 0);
      for (let j = 0; j < lungo; j++) colore(i, j, K.capelli, 0.96 - j * 0.07);
    }
    q.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return { geo: geo, tex: tex };
  })();
  const volto = fredda(new THREE.MeshPhongMaterial({ map: VOLTO.tex, specular: 0x000000, shininess: 0, flatShading: true }), 1.6);
  const rosso = new THREE.MeshPhongMaterial({ color: 0x9a0c12, emissive: 0x3a0004, specular: 0x552222, shininess: 30, flatShading: true });

  // ---------- Scheletro (articolazioni come quelle del ragazzo, un po' più piccole) ----------
  function gruppo(genitore, x, y, z) { const o = new THREE.Group(); o.position.set(x, y, z); o.rotation.order = 'YXZ'; genitore.add(o); return o; }
  function pezzo(genitore, geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; genitore.add(m); return m; }
  const radice = new THREE.Group(); radice.rotation.order = 'YXZ';
  const bacino = gruppo(radice, 0, 0.86, 0);
  const busto = gruppo(bacino, 0, 0.06, 0);
  const collo = gruppo(busto, 0, 0.44, 0);
  const testa = gruppo(collo, 0, 0.055, 0.008);
  const arti = {};
  [['sx', 1], ['dx', -1]].forEach(function (l) {
    const n = l[0], s = l[1];
    const spalla = gruppo(busto, s * 0.155, 0.4, -0.005), gomito = gruppo(spalla, 0, -0.26, 0), polso = gruppo(gomito, 0, -0.235, 0);
    const anca = gruppo(bacino, s * 0.082, -0.04, 0), ginocchio = gruppo(anca, 0, -0.41, 0), caviglia = gruppo(ginocchio, 0, -0.39, 0);
    arti[n] = { spalla: spalla, gomito: gomito, polso: polso, anca: anca, ginocchio: ginocchio, caviglia: caviglia, s: s };
    // braccio: manica lunga e stretta, polsino a coste; mano pallida
    pezzo(spalla, L([{ h: 0.03, rx: 0.045, rz: 0.045 }, { h: -0.04, rx: 0.05, rz: 0.048 }, { h: -0.2, rx: 0.042, rz: 0.04 }, { h: -0.27, rx: 0.038, rz: 0.037 }],
      { lati: 8, irregolare: 0.004, seme: 70 + s }), manica);
    pezzo(gomito, L([{ h: 0.02, rx: 0.037, rz: 0.036 }, { h: -0.12, rx: 0.036, rz: 0.034 }, { h: -0.2, rx: 0.033, rz: 0.031 }, { h: -0.215, rx: 0.026, rz: 0.026 }],
      { lati: 8, irregolare: 0.004, seme: 72 + s }), manica);
    pezzo(polso, L([{ h: 0.01, rx: 0.024, rz: 0.017 }, { h: -0.03, rx: 0.033, rz: 0.016 }, { h: -0.07, rx: 0.031, rz: 0.013 }, { h: -0.09, rx: 0.018, rz: 0.01 }],
      { lati: 8, esp: 2.4, seme: 74 + s }), pelle);
    // gamba: nuda e pallida sotto la gonna, scarpette scure
    pezzo(anca, L([{ h: 0.02, rx: 0.065, rz: 0.068 }, { h: -0.15, rx: 0.06, rz: 0.062 }, { h: -0.38, rx: 0.045, rz: 0.048 }, { h: -0.42, rx: 0.042, rz: 0.045 }],
      { lati: 9, irregolare: 0.004, seme: 76 + s }), pelle);
    pezzo(ginocchio, L([{ h: 0.02, rx: 0.043, rz: 0.046 }, { h: -0.12, rx: 0.044, rz: 0.05, z: -0.006 }, { h: -0.33, rx: 0.03, rz: 0.032 }, { h: -0.39, rx: 0.027, rz: 0.03 }],
      { lati: 9, irregolare: 0.004, seme: 78 + s }), pelle);
    pezzo(caviglia, L([{ h: -0.06, rx: 0.03, rz: 0.022, y: -0.035 }, { h: -0.02, rx: 0.036, rz: 0.03, y: -0.035 }, { h: 0.08, rx: 0.038, rz: 0.028, y: -0.045 },
      { h: 0.135, rx: 0.028, rz: 0.018, y: -0.055 }], { lati: 8, esp: 2.4, asse: 'z', seme: 80 + s }), scarpe);
  });
  // busto: corpetto aderente, scollo tondo
  pezzo(busto, L([{ h: -0.07, rx: 0.12, rz: 0.085 }, { h: 0.05, rx: 0.115, rz: 0.08 }, { h: 0.2, rx: 0.14, rz: 0.098, z: 0.01 }, { h: 0.3, rx: 0.15, rz: 0.095 },
    { h: 0.39, rx: 0.16, rz: 0.088 }, { h: 0.43, rx: 0.12, rz: 0.075 }, { h: 0.455, rx: 0.06, rz: 0.055 }], { lati: 12, esp: 2.3, irregolare: 0.004, seme: 81 }), vestito);
  // gonna a campana fino al ginocchio, aperta sotto
  const gonnaMesh = pezzo(bacino, L([{ h: 0.02, rx: 0.125, rz: 0.09 }, { h: -0.08, rx: 0.16, rz: 0.12 }, { h: -0.25, rx: 0.2, rz: 0.16 }, { h: -0.42, rx: 0.235, rz: 0.19 }],
    { lati: 14, esp: 2.1, irregolare: 0.012, seme: 82, apertoSotto: true }), gonna);
  pezzo(collo, L([{ h: -0.03, rx: 0.042, rz: 0.042 }, { h: 0.06, rx: 0.038, rz: 0.038 }], { lati: 8, seme: 83 }), pelle);
  // testa: ovale (più minuta di quella del ragazzo), con il volto scolpito davanti
  pezzo(testa, L(CRANIO, { lati: 14, esp: 2.0, irregolare: 0.002, seme: 84 }), viso);
  pezzo(testa, VOLTO.geo, volto);                                  // (fase 62) il volto scolpito, davanti al cranio
  // la ferita: un piccolo grumo rosso in rilievo sulla tempia destra
  const grumo = pezzo(testa, new THREE.IcosahedronGeometry(0.014, 0), rosso);
  grumo.position.set(-0.078, 0.122, 0.045);
  // capelli: calotta sopra e dietro la testa (davanti lascia libero il viso, con una frangia di lato), lunghi dietro
  // fino a metà schiena e due ciocche ai lati del viso
  const sm = function (a, b, x) { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  pezzo(testa, L([{ h: 0.045, rx: 0.094, rz: 0.104, z: -0.006 }, { h: 0.1, rx: 0.098, rz: 0.11, z: -0.006 }, { h: 0.16, rx: 0.094, rz: 0.106, z: -0.008 },
    { h: 0.205, rx: 0.08, rz: 0.09, z: -0.01 }, { h: 0.235, rx: 0.05, rz: 0.058, z: -0.012 }, { h: 0.252, rx: 0.012, rz: 0.014, z: -0.014 }],
    { lati: 14, esp: 2.0, irregolare: 0.008, seme: 85, apertoSotto: true, forma: function (p, a, h) {
      const davanti = 1 - sm(0.7, 1.25, Math.abs(a)), basso = 1 - sm(0.1, 0.15, h);   // (fase 62) attaccatura un po' più bassa: copre il bordo alto del volto
      p.z -= davanti * basso * Math.max(0, p.z + 0.01) * (a > 0 ? 1 : 0.55);   // il viso resta scoperto (frangia di lato)
    } }), capelli);
  pezzo(testa, L([{ h: 0.13, rx: 0.09, rz: 0.03, z: -0.085 }, { h: 0.0, rx: 0.098, rz: 0.035, z: -0.095 }, { h: -0.18, rx: 0.105, rz: 0.03, z: -0.1 },
    { h: -0.36, rx: 0.09, rz: 0.02, z: -0.095 }, { h: -0.42, rx: 0.06, rz: 0.012, z: -0.09 }], { lati: 10, esp: 2.6, irregolare: 0.012, seme: 86 }), capelli);
  [-1, 1].forEach(function (s) {
    pezzo(testa, L([{ h: 0.12, rx: 0.016, rz: 0.022, x: s * 0.088, z: 0.03 }, { h: 0.0, rx: 0.019, rz: 0.024, x: s * 0.094, z: 0.03 },
      { h: -0.16, rx: 0.016, rz: 0.02, x: s * 0.1, z: 0.02 }, { h: -0.22, rx: 0.008, rz: 0.01, x: s * 0.1, z: 0.015 }], { lati: 6, irregolare: 0.006, seme: 87 + s }), capelli);
  });

  // ---------- Le due pose ----------
  const A = arti;
  let animati;
  if (posa === 'seduta') {
    bacino.position.set(0, 0.13, -0.05);
    ['sx', 'dx'].forEach(function (n) {
      const a = A[n];
      a.anca.rotation.set(-2.3, a.s * 0.12, -a.s * 0.12);          // ginocchia al petto, un po' aperte
      a.ginocchio.rotation.set(2.55, 0, 0);
      a.caviglia.rotation.set(-0.3, 0, 0);
      a.spalla.rotation.set(-1.0, 0, a.s * 0.35);                    // braccia avanti, verso il viso
      a.gomito.rotation.set(-1.85, 0, -a.s * 0.25);
      a.polso.rotation.set(-0.3, 0, 0);
    });
    busto.rotation.set(0.62, 0, 0);                                  // curva sulle ginocchia
    collo.rotation.set(0.35, 0, 0); testa.rotation.set(0.45, 0.1, 0.06);   // il viso tra le mani
    animati = [busto];
  } else if (posa === 'ginocchio') {
    // in ginocchio, seduta sui talloni, piegata in avanti con il viso coperto dalle mani: si dondola
    bacino.position.set(0, 0.19, -0.12);
    ['sx', 'dx'].forEach(function (n) {
      const a = A[n];
      a.anca.rotation.set(-1.35, a.s * 0.1, -a.s * 0.08);
      a.ginocchio.rotation.set(2.92, 0, 0);
      a.caviglia.rotation.set(1.45, 0, 0);
      a.spalla.rotation.set(-0.55, 0, a.s * 0.3);
      a.gomito.rotation.set(-2.05, 0, -a.s * 0.3);
      a.polso.rotation.set(-0.25, 0, 0);
    });
    busto.rotation.set(0.95, 0, 0);
    collo.rotation.set(0.3, 0, 0); testa.rotation.set(0.35, -0.08, -0.05);
    animati = [busto];
  } else if (posa === 'rannicchiata') {
    // stesa su un fianco in mezzo alla corsia, rannicchiata, le braccia attorno alle ginocchia: trema
    // (è la posa raccolta della ragazza seduta, girata su un fianco; la gonna è più corta per non sporgere)
    bacino.position.set(0.1, 0.165, -0.1); bacino.rotation.set(0, 0, Math.PI / 2);
    gonnaMesh.scale.set(0.85, 0.5, 0.85);
    ['sx', 'dx'].forEach(function (n) {
      const a = A[n];
      a.anca.rotation.set(-2.35, a.s * 0.08, -a.s * 0.06);
      a.ginocchio.rotation.set(2.6, 0, 0);
      a.caviglia.rotation.set(-0.35, 0, 0);
      a.spalla.rotation.set(-0.95, 0, a.s * 0.25);
      a.gomito.rotation.set(-1.15, 0, -a.s * 0.35);
    });
    busto.rotation.set(0.55, 0, 0);
    collo.rotation.set(0.3, 0, 0); testa.rotation.set(0.4, 0, 0.1);
    animati = [busto];
  } else if (posa === 'distesa') {
    // supina sul pavimento, la testa verso -x: un braccio aperto sul pavimento, l'altro sul fianco, il viso girato
    // appena verso chi guarda (verso +z), le gambe distese e un po' piegate
    bacino.position.set(0, 0.105, 0); bacino.rotation.set(-PI / 2, 0, PI / 2);
    // la gonna resta piena (le gambe ci stanno dentro: schiacciata, le cosce la attraversavano); la parte che finirebbe
    // sotto il pavimento è nascosta dal pavimento; si vede anche dall'interno, dall'orlo verso le gambe
    gonnaMesh.scale.set(1.04, 0.82, 0.86); gonna.side = THREE.DoubleSide;
    // (fase 62) gambe appoggiate davvero: polpacci e talloni sfiorano il pavimento (2-5 mm sopra) senza entrarci.
    // Prima la gamba sinistra scendeva in diagonale e il polpaccio e la scarpa finivano 6-7 cm sotto il pavimento.
    A.sx.anca.rotation.set(0.02, 0, 0.06); A.sx.ginocchio.rotation.set(0.1, 0, 0); A.sx.caviglia.rotation.set(-0.6, 0, 0.2);
    A.dx.anca.rotation.set(-0.16, 0, -0.03); A.dx.ginocchio.rotation.set(0.48, 0, 0); A.dx.caviglia.rotation.set(-0.88, 0, -0.2);
    A.sx.spalla.rotation.set(0, 0, 1.1); A.sx.gomito.rotation.set(-0.35, 0, 0.2); A.sx.polso.rotation.set(0, 0, 0.2);
    A.dx.spalla.rotation.set(0.1, 0, -0.25); A.dx.gomito.rotation.set(-0.5, 0, 0); A.dx.polso.rotation.set(0, 0, -0.1);
    collo.rotation.set(-0.1, 0, 0); testa.rotation.set(-0.12, -0.55, 0);
    animati = [];
  } else if (posa === 'fissa') {
    // in piedi, immobile, le braccia abbandonate lungo i fianchi, la testa piegata di lato: ti fissa
    bacino.position.set(0, 0.86, 0);
    ['sx', 'dx'].forEach(function (n) {
      const a = A[n];
      a.anca.rotation.set(0, 0, -a.s * 0.02); a.ginocchio.rotation.set(0.03, 0, 0); a.caviglia.rotation.set(-0.03, 0, 0);
      a.spalla.rotation.set(0.04, 0, a.s * 0.05); a.gomito.rotation.set(-0.06, 0, 0); a.polso.rotation.set(0, 0, a.s * 0.1);
    });
    busto.rotation.set(-0.03, 0, 0);
    testa.rotation.set(0.12, 0, 0.42);
    animati = [testa];
  } else if (posa === 'braccia') {
    // in piedi, ti tende le braccia come per fermarti
    bacino.position.set(0, 0.86, 0);
    ['sx', 'dx'].forEach(function (n) {
      const a = A[n];
      a.anca.rotation.set(0.02, 0, -a.s * 0.03); a.ginocchio.rotation.set(0.05, 0, 0); a.caviglia.rotation.set(-0.06, 0, 0);
      a.spalla.rotation.set(-1.3, -a.s * 0.12, a.s * 0.12); a.gomito.rotation.set(-0.25, 0, 0); a.polso.rotation.set(0.2, 0, 0);
    });
    busto.rotation.set(0.1, 0, 0);
    testa.rotation.set(0.05, 0, -0.1);
    animati = [A.sx.spalla, A.dx.spalla, testa];
  } else {
    bacino.position.set(0, 0.86, 0);
    ['sx', 'dx'].forEach(function (n) {
      const a = A[n];
      a.anca.rotation.set(0.02, 0, -a.s * 0.03); a.ginocchio.rotation.set(0.05, 0, 0); a.caviglia.rotation.set(-0.06, 0, 0);
    });
    A.sx.spalla.rotation.set(0.05, 0, 0.12); A.sx.gomito.rotation.set(-0.15, 0, 0);            // braccio sinistro lungo il fianco
    A.dx.spalla.rotation.set(-0.15, 0, -2.35); A.dx.gomito.rotation.set(0, 0, -0.5);            // il destro alzato: saluta
    testa.rotation.set(0.08, 0, 0.16);                               // testa inclinata, guarda il ragazzo
    animati = [testa, A.dx.gomito];
  }
  // unisce per materiale tutti i pezzi che dipendono dallo stesso gruppo (fermo o animato): poche chiamate di disegno
  radice.updateMatrixWorld(true);
  function cuoci(radiceCottura, salta) {
    const perMat = new Map(), inv = new THREE.Matrix4().copy(radiceCottura.matrixWorld).invert(), M = new THREE.Matrix4();
    const via = [];
    radiceCottura.traverse(function (o) {
      if (!o.isMesh) return;
      let x = o.parent; while (x && x !== radiceCottura) { if (salta.indexOf(x) >= 0) return; x = x.parent; }
      M.multiplyMatrices(inv, o.matrixWorld);
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(M);
      if (!perMat.has(o.material)) perMat.set(o.material, []);
      perMat.get(o.material).push(g); via.push(o);
    });
    via.forEach(function (o) { o.parent.remove(o); });
    perMat.forEach(function (geos, mat) {
      const n = geos.reduce(function (s, g) { return s + g.attributes.position.count; }, 0);
      const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2); let k = 0;
      geos.forEach(function (g) {
        pos.set(g.attributes.position.array, k * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2);
        k += g.attributes.position.count;
      });
      const r = new THREE.BufferGeometry();
      r.setAttribute('position', new THREE.BufferAttribute(pos, 3)); r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      r.computeVertexNormals();
      const m = new THREE.Mesh(r, mat); m.castShadow = true; radiceCottura.add(m);
      if (!NATURALE) radiceCottura.add(contorno(r));
    });
  }
  // (fase 59) CONTORNO SPETTRALE: la stessa forma gonfiata di pochi centimetri, disegnata solo dal lato interno, in
  // bianco-azzurro e senza nebbia: attorno alla sagoma resta un filo di luce che la stacca dalla strada anche di corsa
  const matContorno = new THREE.MeshBasicMaterial({ color: 0xcfe4ff, side: THREE.BackSide, fog: false, transparent: true, opacity: 0.85, depthWrite: false });
  function contorno(geo) {
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, somma = new Map(), chiave = [];
    for (let i = 0; i < P.length; i += 3) {
      const k = Math.round(P[i] * 500) + ',' + Math.round(P[i + 1] * 500) + ',' + Math.round(P[i + 2] * 500);
      chiave.push(k); const s = somma.get(k) || [0, 0, 0]; s[0] += N[i]; s[1] += N[i + 1]; s[2] += N[i + 2]; somma.set(k, s);
    }
    const Q = new Float32Array(P.length), SP = 0.03;
    for (let i = 0, j = 0; i < P.length; i += 3, j++) {
      const s = somma.get(chiave[j]), l = Math.hypot(s[0], s[1], s[2]) || 1;
      Q[i] = P[i] + s[0] / l * SP; Q[i + 1] = P[i + 1] + s[1] / l * SP; Q[i + 2] = P[i + 2] + s[2] / l * SP;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(Q, 3));
    const m = new THREE.Mesh(g, matContorno); m.renderOrder = -1; return m;
  }
  animati.forEach(function (g) { cuoci(g, animati.filter(function (x) { return x !== g; })); });
  cuoci(radice, animati);

  // alone freddo alle spalle: la stacca dal buio come le sagome, ma bianco-azzurro
  const BASSA = { seduta: 0.85, ginocchio: 0.75, rannicchiata: 0.6, distesa: 0.5 };
  const hA = BASSA[posa] || 1.65;
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.ps1.alone(190, 215, 255, 5), blending: THREE.AdditiveBlending, depthWrite: false,
    transparent: true, opacity: 0.4 }));
  alone.position.set(0, hA * 0.55, -0.25); alone.scale.set(hA * 1.1, hA * 1.35, 1);
  if (!NATURALE) radice.add(alone);
  // (fase 39) NEBBIA GRIGIA LUMINESCENTE attorno a lei (così si vede bene come ostacolo): un alone grigio largo e
  // qualche sbuffo di nebbia che le gira intorno piano, più uno strato basso ai suoi piedi
  const texNebbia = PZ.ps1.alone(200, 200, 205, 7), nebbia = [];
  const grande = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebbia, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.32 }));
  grande.position.set(0, hA * 0.5, 0.1); grande.scale.set(hA * 2.4, hA * 2.0, 1);
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebbia, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 }));
    sp.userData = { a: i * 1.26, r: 0.35 + 0.12 * (i % 3), h: hA * (0.15 + 0.17 * i), v: 0.35 + 0.1 * i, s: 0.7 + 0.15 * (i % 2) };
    nebbia.push(sp);
  }
  const terra = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNebbia, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3 }));
  terra.position.set(0, 0.12, 0.1); terra.scale.set(hA * 1.6 + 0.6, 0.5, 1);
  // (fase 59) la sua impronta sulla strada: una macchia di luce fredda larga quanto la parte che urta (la "hitbox"),
  // così si capisce subito quale corsia occupa
  const impronta = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: PZ.ps1.alone(200, 225, 255, 4),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false }));
  impronta.rotation.x = -Math.PI / 2; impronta.position.set(0, 0.03, 0);
  { const LG = { seduta: 0.8, piedi: 0.66, ginocchio: 0.72, rannicchiata: 1.0, fissa: 0.62, braccia: 0.72 }[posa] || 0.66; impronta.scale.set(LG * 2.6, 1.6, 1); }
  if (!NATURALE) radice.add(impronta);
  if (!NATURALE) { radice.add(grande); radice.add(terra); nebbia.forEach(function (sp) { radice.add(sp); }); }
  radice.visible = false;
  scena.add(radice);

  // ---------- Comparsa, sparizione, movimento ----------
  const rnd = PZ.ps1.casuale((seme || 5) * 97 + (posa === 'seduta' ? 13 : 0));
  let t = rnd() * 10, comparsa = 1, verso = 0, sfarfalla = 0;
  const LARGA = { seduta: 0.8, piedi: 0.66, ginocchio: 0.72, rannicchiata: 1.0, fissa: 0.62, braccia: 0.72 };
  // salto: true = si salta (come una transenna), false = si evita cambiando corsia
  const R = { gruppo: radice, posa: posa, visibile: false, larghezza: LARGA[posa] || 0.66, salto: !!BASSA[posa], arti: A, ossa: { bacino: bacino, busto: busto, collo: collo, testa: testa } };
  R.mostra = function () { R.visibile = true; radice.visible = true; comparsa = 1; verso = 0; radice.scale.set(1, 1, 1); };
  R.nascondi = function () { R.visibile = false; radice.visible = false; verso = 0; };
  R.appari = function (durata) { R.mostra(); comparsa = 0; verso = 1 / (durata || 0.45); radice.scale.set(1, 0.05, 1); };
  R.svanisci = function (durata) { verso = -1 / (durata || 0.3); };
  const b0 = busto.rotation.x, t0 = testa.rotation.clone(), g0 = A.dx.gomito.rotation.z;
  const sp0 = [A.sx.spalla.rotation.x, A.dx.spalla.rotation.x];
  let scatto = 0, prossimoScatto = 1 + rnd() * 2, versoScatto = 1;
  R.aggiorna = function (dt, intensita) {
    if (!R.visibile) return;
    t += dt;
    if (verso !== 0) {          // compare e sparisce come le altre allucinazioni: sale dal suolo e tremola
      comparsa = Math.max(0, Math.min(1, comparsa + verso * dt));
      radice.scale.set(1 - 0.25 * (1 - comparsa), Math.max(0.03, comparsa), 1 - 0.25 * (1 - comparsa));
      radice.visible = comparsa > 0.97 || Math.sin(t * 57) > -0.3;
      if (comparsa >= 1 && verso > 0) { verso = 0; radice.visible = true; }
      if (comparsa <= 0 && verso < 0) { R.nascondi(); return; }
    } else {                    // ogni tanto sfarfalla per un attimo: è un'allucinazione
      sfarfalla -= dt;
      if (sfarfalla < -2.5 - rnd() * 4) sfarfalla = 0.12;
      radice.visible = sfarfalla <= 0 || Math.sin(t * 70) > 0;
    }
    if (posa === 'seduta') {    // singhiozzi: scosse irregolari del busto e delle spalle
      const sing = Math.max(0, Math.sin(t * 7.3)) * (0.5 + 0.5 * Math.sin(t * 1.3 + 1)) + 0.15 * Math.sin(t * 23);
      busto.rotation.x = b0 + 0.06 * sing;
      busto.position.y = 0.06 + 0.012 * sing;
    } else if (posa === 'ginocchio') {   // si dondola avanti e indietro, con qualche singhiozzo
      const sing = Math.max(0, Math.sin(t * 6.1)) * Math.max(0, Math.sin(t * 0.9 + 2)) * 0.6;
      busto.rotation.x = b0 + 0.14 * Math.sin(t * 2.3) + 0.05 * sing;
    } else if (posa === 'rannicchiata') {   // trema e ogni tanto un singulto le scuote le spalle
      const sing = Math.pow(Math.max(0, Math.sin(t * 1.7)), 8);
      busto.rotation.x = b0 + 0.012 * Math.sin(t * 37) + 0.08 * sing;
      busto.rotation.z = 0.01 * Math.sin(t * 29 + 1);
    } else if (posa === 'fissa') {          // ferma; ogni tanto la testa scatta di lato e torna, come un'immagine che salta
      prossimoScatto -= dt;
      if (prossimoScatto <= 0) { scatto = 0.14; versoScatto = -versoScatto; prossimoScatto = 1.4 + rnd() * 2.6; }
      if (scatto > 0) scatto -= dt;
      const sc = scatto > 0 ? 1 : 0;
      testa.rotation.set(t0.x + 0.15 * sc, t0.y + 0.35 * sc * versoScatto, t0.z - 0.6 * sc + 0.015 * Math.sin(t * 1.3));
    } else if (posa === 'braccia') {        // le braccia tese salgono e scendono piano, la testa ondeggia
      A.sx.spalla.rotation.x = sp0[0] + 0.12 * Math.sin(t * 1.4);
      A.dx.spalla.rotation.x = sp0[1] + 0.12 * Math.sin(t * 1.4 + 0.8);
      testa.rotation.set(t0.x + 0.04 * Math.sin(t * 0.8), t0.y + 0.1 * Math.sin(t * 0.5), t0.z + 0.05 * Math.sin(t * 1.0));
    } else {                  // saluta: l'avambraccio va avanti e indietro; la testa ondeggia appena
      A.dx.gomito.rotation.z = g0 + 0.45 * Math.sin(t * 6.5);
      testa.rotation.set(t0.x + 0.03 * Math.sin(t * 0.9), t0.y + 0.08 * Math.sin(t * 0.6), t0.z + 0.04 * Math.sin(t * 1.1));
    }
    const k = intensita === undefined ? 0.5 : intensita;
    alone.material.opacity = 0.3 + 0.2 * k + 0.08 * Math.sin(t * 2.1);
    grande.material.opacity = 0.42 + 0.08 * Math.sin(t * 1.3);
    terra.material.opacity = 0.42 + 0.08 * Math.sin(t * 0.9 + 1);
    matContorno.opacity = 0.72 + 0.18 * Math.sin(t * 3.1); impronta.material.opacity = 0.5 + 0.12 * Math.sin(t * 2.2);   // (fase 59) respirano piano
    nebbia.forEach(function (sp) {
      const u = sp.userData, an = u.a + t * u.v;
      sp.position.set(Math.cos(an) * u.r, u.h + 0.08 * Math.sin(t * 0.7 + u.a), Math.sin(an) * u.r * 0.6 + 0.1);
      const sc = hA * u.s * (1 + 0.15 * Math.sin(t * 0.8 + u.a)); sp.scale.set(sc, sc * 0.8, 1);
      sp.material.opacity = 0.28 + 0.1 * Math.sin(t * 1.1 + u.a);
    });
  };
  return R;
};

// Le ragazze in strada: sempre le stesse, riciclate (come le sagome). quante = { posa: numero }.
// prendi(posa) prende una ragazza libera in quella posa; prendiUna(['seduta', 'ginocchio'], rnd) una a caso tra quelle.
PZ.POSE_SALTO = ['seduta', 'ginocchio', 'rannicchiata'];
PZ.POSE_PIEDI = ['piedi', 'fissa', 'braccia'];
PZ.creaRagazze = function (scena, quante) {
  const tutte = [];
  let seme = 1;
  Object.keys(quante).forEach(function (posa) { for (let i = 0; i < quante[posa]; i++) tutte.push(PZ.creaRagazza(scena, posa, seme++)); });
  const occupate = [];
  function libera(r) { return occupate.indexOf(r) < 0 && !r.visibile; }
  return {
    tutte: tutte,
    prendi: function (posa) {
      for (let i = 0; i < tutte.length; i++) { const r = tutte[i]; if (r.posa === posa && libera(r)) { occupate.push(r); return r; } }
      return null;
    },
    prendiUna: function (pose, rnd) {
      const ok = tutte.filter(function (r) { return pose.indexOf(r.posa) >= 0 && libera(r); });
      if (!ok.length) return null;
      const r = ok[Math.floor(rnd() * ok.length)]; occupate.push(r); return r;
    },
    rilascia: function (r) { const i = occupate.indexOf(r); if (i >= 0) occupate.splice(i, 1); },
    reset: function () { tutte.forEach(function (r) { r.nascondi(); }); occupate.length = 0; }
  };
};
