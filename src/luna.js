// LA LUNA COL VOLTO (dal videoclip Pezzidicarne, src/environment/sky.js: stesso modello, stessa mappa, stesso volto
// disegnato a pixel). Qui è una funzione a sé, usata dal cielo della strada e da quello della scogliera.
//   PZ.lunaVolto(genitore, { offset, raggio, gialla, seme })
//     offset: posizione della luna rispetto al punto da cui la si guarda (il centro del genitore)
//   restituisce { luna, aloni, volto(k), sorriso(g, a), pulsa(p), posiziona(centro) }
//     volto(k): 0 = luna normale, 1 = mezzo giro, il volto guarda verso di noi (entra di lato, prima in ombra sul bordo)
//     sorriso(g, a): g da 0 (bocca corta e dritta) a 1 (ghigno pieno); a = quanto è inarcato (il "respiro")
PZ.lunaVolto = function (genitore, o) {
  const C = PZ.CONFIG.colori;
  const rnd = PZ.ps1.casuale(o.seme || 11);
  for (let i = 0; i < 420 * 2; i++) rnd();          // come nel videoclip (prima si fanno le stelle): stessi crateri
  const gialla = o.gialla !== false, R = o.raggio;
  const offset = new THREE.Vector3().fromArray(o.offset);
  // Luna: sfera a facce piatte (low-poly), con crateri quadrati a pixel.
  // Colore: gialla (oro scuro, più calda del giallo fluorescente di bici e fumo) oppure quella originale, azzurrina.
  // Si sceglie in config.js con luna.gialla (true / false).
  const TINTE = gialla
    ? { base: '#d4bc3a', crateri: ['#b49c2a', '#94801c'], alone: [235, 205, 80] }
    : { base: '#' + new THREE.Color(C.lunaChiara).getHexString(), crateri: ['#b9c6e6', '#9fb0d6'], alone: [165, 195, 255] };
  const lc = document.createElement('canvas');
  lc.width = lc.height = 64;
  const lg = lc.getContext('2d');
  lg.fillStyle = TINTE.base;
  lg.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 34; i++) {
    const r = 1 + Math.floor(rnd() * 5);
    lg.fillStyle = rnd() < 0.8 ? TINTE.crateri[0] : TINTE.crateri[1];
    lg.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), r * 2, r);
  }
  // La superficie della luna è una mappa "a fasce" di tutta la sfera (128 x 64); sul lato nascosto, opposto a chi
  // guarda, c'è il volto. Il volto si rivela facendo ruotare la superficie attorno all'asse verticale della luna
  // (vedi volto() più sotto): la luce resta ferma, il disegno gira come su una sfera vera, e il volto entra di
  // lato, prima scorciato e in ombra sul bordo, poi sempre più pieno, fino a guardare dritto verso di noi.
  const lv = document.createElement('canvas');
  lv.width = 128;
  lv.height = 64;
  const vg = lv.getContext('2d');
  vg.imageSmoothingEnabled = false;
  vg.drawImage(lc, 0, 0, 128, 64);
  const versoNoi = offset.clone().normalize().negate();          // il punto della luna rivolto verso la camera
  const uNoi = Math.atan2(versoNoi.z, -versoNoi.x) / (2 * Math.PI) + 0.5;
  const uVolto = (uNoi + 0.5) % 1;                                // mezzo giro più in là: invisibile all'inizio
  const yVolto = (0.5 - Math.asin(versoNoi.y) / Math.PI) * 64;
  const fondo = document.createElement('canvas');                 // la superficie senza volto, per ridisegnarlo
  fondo.width = 128; fondo.height = 64;
  fondo.getContext('2d').drawImage(lv, 0, 0);
  PZ.disegnaVolto(vg, uVolto * 128, yVolto, gialla, 0, 0);
  const texLuna = new THREE.CanvasTexture(lv);
  texLuna.magFilter = THREE.NearestFilter;
  texLuna.minFilter = THREE.NearestFilter;
  texLuna.wrapS = THREE.RepeatWrapping;

  // Volume a sfaccettature: ogni triangolo ha una sola tinta (più scura lontano dalla luce, che arriva un po' da
  // destra), con piccole differenze casuali tra un triangolo e l'altro. Si legge come una sfera intagliata.
  const geoLuna = new THREE.IcosahedronGeometry(R, 2);
  const pl = geoLuna.attributes.position;
  const versoLuce = offset.clone().normalize().negate().add(new THREE.Vector3(0.45, 0.15, 0)).normalize();
  const tinte = new Float32Array(pl.count * 3);
  const nv = new THREE.Vector3(), nf = new THREE.Vector3();
  for (let i = 0; i < pl.count; i += 3) {
    nf.set(0, 0, 0);
    for (let j = 0; j < 3; j++) nf.add(nv.fromBufferAttribute(pl, i + j));
    nf.normalize();
    const f = (0.28 + 0.72 * Math.pow(Math.max(0, nf.dot(versoLuce)), 0.55)) * (0.92 + rnd() * 0.12);
    for (let j = 0; j < 3; j++) {
      tinte[(i + j) * 3] = Math.min(1, f * 0.97); tinte[(i + j) * 3 + 1] = Math.min(1, f * 0.98); tinte[(i + j) * 3 + 2] = Math.min(1, f);
    }
  }
  geoLuna.setAttribute('color', new THREE.BufferAttribute(tinte, 3));
  const luna = new THREE.Mesh(geoLuna, new THREE.MeshBasicMaterial({ map: texLuna, vertexColors: true, fog: false }));
  genitore.add(luna);

  // Due aloni a fasce attorno alla luna: uno largo e tenue, uno stretto e più forte
  const aloni = [[R * 5, 0.2], [R * 2.4, 0.42]].map(function (a) {
    const alone = new THREE.Sprite(new THREE.SpriteMaterial({
      map: PZ.ps1.alone(TINTE.alone[0], TINTE.alone[1], TINTE.alone[2], 7), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, fog: false, opacity: a[1]
    }));
    alone.scale.set(a[0], a[0], 1);
    genitore.add(alone);
    return alone;
  });

  return {
    luna: luna, aloni: aloni,
    volto: function (k) { texLuna.offset.x = 0.5 * k; },
    // il volto si ridisegna solo quando cambia davvero di un pixel, così l'animazione resta a scatti netti
    sorriso: (function () {
      let ultimo = '0/0';
      return function (g, a) {
        const qg = Math.round(Math.max(0, Math.min(1, g)) * 24) / 24, qa = Math.round(Math.max(0, Math.min(1, a)) * 16) / 16;
        if (qg + '/' + qa === ultimo) return;
        ultimo = qg + '/' + qa;
        vg.drawImage(fondo, 0, 0);
        PZ.disegnaVolto(vg, uVolto * 128, yVolto, gialla, qg, qa);
        texLuna.needsUpdate = true;
      };
    })(),
    pulsa: function (p) { aloni.forEach(function (a, i) { a.material.opacity = [0.2, 0.42][i] * Math.max(0.2, 1 + 1.2 * p); }); },
    // centro: il punto da cui la si guarda (la camera), se il genitore non lo segue già
    posiziona: function (centro) { luna.position.copy(centro).add(offset); aloni.forEach(function (a) { a.position.copy(luna.position); }); }
  };
};

// Il volto della luna, disegnato pixel per pixel attorno al punto (cx, cy) della mappa.
// Qualcosa di profondamente sbagliato. Il volto sta in basso sul disco, sotto una fronte alta, come una testa
// appena abbassata che ti guarda dal basso. Niente sopracciglia: un'arcata sporgente a V, illuminata sopra,
// getta un'ombra che copre la parte alta degli occhi. Sotto, occhi enormi e spalancati, chiari e contornati di
// nero, con la pupilla nera spinta in alto, contro l'ombra: guarda da sotto in su. E un ghigno innaturale: sottile ma larghissimo, che si allunga fino ai lati
// della luna e risale all'altezza degli occhi, un po' storto.
// Pochi pixel netti e spessi, così l'espressione si legge anche quando la luna è piccola, da lontano.
PZ.disegnaVolto = function (g, cx, cy, gialla, ghigno, arco) {
  const gh = ghigno || 0;                                       // 0 = nessuna espressione, 1 = ghigno pieno
  const d = 0.0075 * (arco || 0) * gh;                          // ghigno più inarcato: gli angoli salgono
  const W = 6 + 15.2 * gh;                                      // mezza larghezza della bocca
  function centro(X) { return 6.4 - gh * (0.0279 + d) * X * X - 0.03 * gh * X; }
  const C = gialla
    ? { ombra: '#7e6a12', orbita: '#211b02', ciglio: '#120e01', bianco: '#fff6c4', anello: '#c7b54a',
      pupilla: '#050400', piega: '#5e4f0c', bocca: '#0b0801', labbro: '#6c5a10', rilievo: '#ecd862', scuro: '#4a3e08' }
    : { ombra: '#7f8db6', orbita: '#1c2444', ciglio: '#0e1430', bianco: '#f6f8ff', anello: '#98a6cc',
      pupilla: '#03050c', piega: '#5e6a90', bocca: '#070b1c', labbro: '#6f7ca4', rilievo: '#eef2ff', scuro: '#3c4870' };
  const GIU = 4.5;                                              // quanto il volto è spostato verso il basso
  function segmento(X, Y, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((X - ax) * vx + (Y - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(X - ax - vx * t, Y - ay - vy * t);
  }
  for (let y = Math.floor(cy - 14); y <= cy + 20; y++) {
    for (let x = Math.floor(cx - 26); x <= cx + 26; x++) {
      const X = x + 0.5 - cx, Y = y + 0.5 - cy - GIU, ax = Math.abs(X);
      let c = null;
      // bocca: senza espressione è una linea corta e dritta; il ghigno si allarga, si inarca e diventa una
      // mezzaluna nera larghissima, più spessa al centro e appuntita agli angoli, che risalgono fino all'altezza
      // degli occhi; il lato destro sale un po' più del sinistro
      const sp = (0.9 + 0.8 * gh) * (1 - gh * (X / W) * (X / W));
      const y1 = centro(X) - sp / 2, y2 = centro(X) + sp / 2;
      if (ax < 0.7 * W && Y >= y2 && Y < y2 + 1.0) c = C.labbro;                       // ombra sotto il labbro
      if (ax < 0.8 * W && Y > y1 - 0.9 && Y <= y1) c = C.labbro;                       // labbro superiore
      if (ax < W && Y > y1 && Y < y2) c = C.bocca;
      // arcata sporgente a V: più bassa verso il naso; sotto di lei c'è ombra
      const yA = -7.0 - Math.max(0, ax - 0.8) * 0.2;          // bordo dell'arcata
      let rOcchio = 99;                                         // distanza dal centro dell'occhio più vicino
      [-1, 1].forEach(function (lato) {
        // pieghe che seguono gli angoli del ghigno, sulle guance (solo quando il ghigno è ormai largo)
        if (gh > 0.55) {
          const yAng = centro(lato * W);
          if (segmento(X, Y, lato * (W - 2.7), yAng + 5.3, lato * (W + 1.3), yAng - 0.5) < 0.5) c = C.piega;
        }
        const dx = X - lato * 8, dy = Y + 3.8;
        const dyS = dy + 0.28 * dx * lato;                      // orbite inclinate verso il naso
        if ((dx / 7.4) * (dx / 7.4) + (dyS / 6.0) * (dyS / 6.0) < 1) c = C.ombra;
        if ((dx / 6.0) * (dx / 6.0) + (dyS / 5.0) * (dyS / 5.0) < 1) c = C.orbita;
        // occhio enorme e sporgente: chiaro, contornato di nero, pupilla nera
        const r = Math.hypot(dx - 0.25 * lato, (dy + 0.1) * 1.05);
        if (r < 4.3) c = C.ciglio;
        if (r < 3.5) c = r > 2.8 ? C.anello : C.bianco;
        if (Math.hypot(dx - 0.25 * lato, dy + 1.0) < 1.3) c = C.pupilla;     // pupilla in alto: guarda da sotto l'arcata
        rOcchio = Math.min(rOcchio, r);
        if (segmento(X, Y, lato * 4.5, 2.6, lato * 11.5, 1.6) < 0.5) c = C.piega;              // occhiaie
      });
      // l'ombra dell'arcata copre la parte alta degli occhi (nero) e la fronte sotto di lei (scuro)
      if (ax < 14 && Y > yA + 0.5 && Y < yA + 2.7) c = rOcchio < 4.3 || c === C.orbita ? C.ciglio : C.scuro;
      // l'arcata: una costola chiara (presa dalla luce) con una linea scura subito sotto
      if (ax < 14 && Math.abs(Y - (yA - 0.4)) < 0.75) c = C.rilievo;
      if (ax < 14 && Y >= yA + 0.35 && Y < yA + 1.1) c = C.ciglio;
      // naso: un cuneo d'ombra che scende dall'arcata e due fessure
      if (Y > yA + 1 && Y < 2.6 && ax < 0.35 + (Y - yA) * 0.06) c = C.scuro;
      if (Math.abs(Y - 3.2) < 0.55 && Math.abs(ax - 1.3) < 0.5) c = C.orbita;
      if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
    }
  }
};
