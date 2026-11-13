// La cameretta della ragazza: stanza 5 x 5 metri, low poly, rosa e calda, con dettagli gialli.
// Il muro sud (verso la camera) non viene disegnato, così la camera dall'alto vede sempre dentro la stanza.
// Coordinate: x = destra/sinistra, y = altezza, z = profondità (la finestra è a nord, z = -2,5).
PZ.creaStanza = function (scena) {
  const V3 = THREE.Vector3;
  const gruppo = new THREE.Group();
  scena.add(gruppo);
  const colliders = [];      // scatole che il giocatore non può attraversare: {x0, x1, z0, z1}
  const L = 2.5, H = 2.6;    // mezzo lato della stanza, altezza dei muri

  // ---------- Aiuti ----------
  function tex(w, h, disegna, ripX, ripY) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    disegna(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (ripX) t.repeat.set(ripX, ripY || ripX);
    return t;
  }
  function M(colore, em, mappa) {
    return new THREE.MeshPhongMaterial({ color: colore, emissive: em || 0x000000, map: mappa || null, specular: 0x000000, shininess: 0, flatShading: true });
  }
  function lampada(colore, mappa) { return new THREE.MeshBasicMaterial({ color: colore, map: mappa || null }); }   // brilla da sola
  function B(w, h, d, mat, x, y, z, padre) {                   // scatola: y = il punto più basso
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    (padre || gruppo).add(m);
    return m;
  }
  function C(r, h, lati, mat, x, y, z, padre, rTop) {           // cilindro / cono
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop === undefined ? r : rTop, r, h, lati), mat);
    m.position.set(x, y + h / 2, z);
    (padre || gruppo).add(m);
    return m;
  }
  function S(r, mat, x, y, z, padre, sx, sy, sz) {              // sfera a poche facce
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
    m.position.set(x, y, z);
    m.scale.set(sx || 1, sy || 1, sz || 1);
    (padre || gruppo).add(m);
    return m;
  }
  function piano(w, h, mat, x, y, z, ry, rx, padre) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    p.position.set(x, y, z); p.rotation.set(rx || 0, ry || 0, 0);
    (padre || gruppo).add(p); return p;
  }
  function blocco(x0, x1, z0, z1) { colliders.push({ x0: x0, x1: x1, z0: z0, z1: z1 }); }

  // ---------- Colori ----------
  const ROSA = 0xf4a6c0, ROSA_CHIARO = 0xfbd3e1, ROSA_SCURO = 0xd9709a, FUCSIA = 0xc2487c, PANNA = 0xfff1e6,
    LEGNO = 0xd9b38c, LEGNO_SCURO = 0xb9855f, GIALLO = 0xffd84a;
  const m = {
    rosa: M(ROSA), rosaCh: M(ROSA_CHIARO), rosaSc: M(ROSA_SCURO), fucsia: M(FUCSIA), panna: M(PANNA),
    legno: M(LEGNO), legnoSc: M(LEGNO_SCURO), bianco: M(0xffffff), nero: M(0x2a2230),
    giallo: lampada(GIALLO), oro: M(0xe3b341, 0x3a2a00), lilla: M(0xc9a6e0), marrone: M(0x9b6b4a), grigio: M(0xbfb4c4)
  };

  // ---------- Pareti e pavimento ----------
  const texMuro = tex(32, 32, function (g, w, h) {
    g.fillStyle = '#f7b6cc'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = '#fbc6d8'; g.fillRect(x, 0, 4, h); }
    g.fillStyle = '#ffffff';
    [[2, 6], [10, 18], [18, 4], [26, 22], [6, 26], [22, 12]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); g.fillRect(p[0] + 1, p[1] + 1, 1, 1); g.fillRect(p[0] - 1, p[1] + 1, 1, 1); });
  }, 5, 3);
  const texPav = tex(32, 32, function (g, w, h) {
    g.fillStyle = '#e8c9a4'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = '#c99d78'; g.fillRect(0, y, w, 1); g.fillStyle = '#f0d6b6'; g.fillRect(0, y + 1, w, 1); }
    [[5, 0], [20, 8], [11, 16], [27, 24]].forEach(function (p) { g.fillStyle = '#c99d78'; g.fillRect(p[0], p[1], 1, 8); });
  }, 4, 4);
  piano(2 * L, 2 * L, M(0xffffff, 0x201510, texPav), 0, 0, 0, 0, -Math.PI / 2);
  piano(2 * L, H, M(0xffffff, 0x2a1018, texMuro), 0, H / 2, -L, 0);                    // nord
  piano(2 * L, H, M(0xffffff, 0x2a1018, texMuro), -L, H / 2, 0, Math.PI / 2);          // ovest
  piano(2 * L, H, M(0xffffff, 0x2a1018, texMuro), L, H / 2, 0, -Math.PI / 2);          // est
  B(2 * L, 0.1, 0.03, m.panna, 0, 0, -L + 0.015); B(0.03, 0.1, 2 * L, m.panna, -L + 0.015, 0, 0); B(0.03, 0.1, 2 * L, m.panna, L - 0.015, 0, 0);   // zoccolino
  B(2 * L + 0.1, 0.05, 0.08, m.panna, 0, H, -L); B(0.08, 0.05, 2 * L, m.panna, -L, H, 0); B(0.08, 0.05, 2 * L, m.panna, L, H, 0);                   // bordo alto

  // ---------- Tappeto rosa ----------
  const texTappeto = tex(32, 32, function (g, w, h) {
    g.fillStyle = '#e57fa6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff1e6'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 12, 0, 7); g.stroke();
    g.strokeStyle = '#fbc6d8'; g.lineWidth = 1; g.beginPath(); g.arc(16, 16, 7, 0, 7); g.stroke();
  });
  const tappeto = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), M(0xffffff, 0x1a0810, texTappeto));
  tappeto.rotation.x = -Math.PI / 2; tappeto.position.set(0.05, 0.012, 0.15); gruppo.add(tappeto);

  // ---------- Finestra con la notte fuori ----------
  const texNotte = tex(24, 32, function (g, w, h) {
    g.fillStyle = '#16183a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#242a5c'; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.fillStyle = '#fff3b0'; [[4, 5], [17, 8], [10, 14], [20, 20], [5, 24]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); });
    g.fillStyle = '#ffe680'; g.beginPath(); g.arc(16, 8, 4, 0, 7); g.fill();
    g.fillStyle = '#16183a'; g.beginPath(); g.arc(18, 7, 3.4, 0, 7); g.fill();
    g.fillStyle = '#0d0f26'; g.fillRect(0, 26, 8, 6); g.fillRect(12, 24, 6, 8); g.fillRect(19, 27, 5, 5);
    g.fillStyle = '#ffd84a'; g.fillRect(14, 27, 1, 1); g.fillRect(2, 29, 1, 1); g.fillRect(21, 29, 1, 1);
  });
  piano(1.0, 1.2, lampada(0xffffff, texNotte), 0.1, 1.5, -L + 0.012, 0);
  B(1.14, 0.07, 0.06, m.panna, 0.1, 2.1, -L + 0.03); B(1.14, 0.07, 0.06, m.panna, 0.1, 0.86, -L + 0.03);
  B(0.06, 1.31, 0.06, m.panna, -0.47, 0.86, -L + 0.03); B(0.06, 1.31, 0.06, m.panna, 0.67, 0.86, -L + 0.03); B(0.05, 1.2, 0.05, m.panna, 0.1, 0.9, -L + 0.03);
  B(1.24, 0.05, 0.14, m.panna, 0.1, 0.83, -L + 0.07);                                // davanzale
  B(0.3, 1.45, 0.09, m.rosaSc, -0.62, 0.8, -L + 0.07); B(0.3, 1.45, 0.09, m.rosaSc, 0.82, 0.8, -L + 0.07);   // tende
  B(1.7, 0.04, 0.04, m.oro, 0.1, 2.27, -L + 0.07);

  // Lucine gialle: filo di lampadine lungo il muro nord e sopra il letto
  const lucine = [];
  for (let i = 0; i < 17; i++) {
    const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), lampada(GIALLO));
    b.position.set(-2.4 + i * 0.3, 2.38 - 0.12 * Math.sin(Math.PI * ((i % 4) / 3.0)), -L + 0.06); gruppo.add(b); lucine.push(b);
  }
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), lampada(GIALLO));
    b.position.set(-L + 0.06, 2.36 - 0.1 * Math.sin(Math.PI * ((i % 3) / 2.0)), -2.2 + i * 0.3); gruppo.add(b); lucine.push(b);
  }

  // ---------- Poster e foto ----------
  function poster(w, h, disegna, x, y, z, ry) {
    const p = piano(w, h, lampada(0xffffff, tex(24, Math.round(24 * h / w), disegna)), x, y, z, ry);
    B(w + 0.05, h + 0.05, 0.015, m.panna, 0, -(h + 0.05) / 2, -0.012, p);
    return p;
  }
  poster(0.7, 0.95, function (g, w, h) {                                             // luna e stelle
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5b3a8c'); gr.addColorStop(1, '#f08ab0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(12, 14, 6, 0, 7); g.fill();
    g.fillStyle = '#7a559e'; g.beginPath(); g.arc(14.5, 12.5, 5, 0, 7); g.fill();
    g.fillStyle = '#fff'; [[3, 4], [20, 5], [5, 22], [19, 25], [10, 30]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); });
  }, -1.0, 1.55, -L + 0.012, 0);
  // (il poster del gruppo era sopra l'angolo della finestra, alla stessa profondità del vetro: i due piani si
  // contendevano gli stessi pixel e la notte fuori sfarfallava. Ora è sopra la testiera del letto.)
  poster(0.55, 0.75, function (g, w, h) {                                            // gruppo musicale (sagome)
    g.fillStyle = '#ffe680'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2230'; [[4, 12, 5], [11, 10, 5], [18, 13, 5]].forEach(function (p) { g.fillRect(p[0], p[1], p[2], 14); g.fillRect(p[0] + 1, p[1] - 4, 3, 4); });
    g.fillStyle = '#d9709a'; g.fillRect(2, 2, 20, 3);
  }, -1.95, 1.62, -L + 0.012, 0);
  poster(0.6, 0.8, function (g, w, h) {                                              // poster sopra il letto (muro ovest)
    g.fillStyle = '#a8e0f0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff8fb8'; g.beginPath(); g.moveTo(12, 24); g.lineTo(3, 12); g.lineTo(5, 6); g.lineTo(9, 6); g.lineTo(12, 10); g.lineTo(15, 6); g.lineTo(19, 6); g.lineTo(21, 12); g.fill();
    g.fillStyle = '#fff'; g.fillRect(8, 28, 8, 1);
  }, -L + 0.012, 1.55, -1.45, Math.PI / 2);
  [[1.0, 1.7, 0xf08ab0], [1.35, 1.85, 0x8fd0e8], [1.7, 1.72, 0xffe680], [2.05, 1.88, 0xc9a6e0]].forEach(function (f, i) {   // foto appese a un filo
    const p = piano(0.26, 0.32, lampada(0xffffff, tex(10, 12, function (g, w, h) {
      g.fillStyle = '#fffaf5'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#' + f[2].toString(16).padStart(6, '0'); g.fillRect(1, 1, 8, 8);
      g.fillStyle = '#6b4a63'; g.fillRect(3, 3, 4, 4); g.fillStyle = '#ffd1b3'; g.fillRect(4, 3, 2, 2);
    })), f[0], f[1], -L + 0.012, 0);
    p.rotation.z = (i % 2 ? 1 : -1) * 0.08;
  });
  B(1.5, 0.012, 0.012, m.panna, 1.52, 2.07, -L + 0.012);

  // ---------- Letto ----------
  const letto = new THREE.Group(); gruppo.add(letto);
  B(1.0, 0.22, 2.0, m.legnoSc, -1.95, 0.08, -1.45, letto);                           // telaio
  B(1.0, 0.95, 0.07, m.rosaSc, -1.95, 0.1, -2.46, letto);                            // testiera
  B(0.92, 0.22, 1.9, m.panna, -1.95, 0.3, -1.45, letto);                             // materasso
  const copertaMat = M(0xffffff, 0x2a0f18, tex(16, 16, function (g, w, h) {
    g.fillStyle = '#ea78a4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f59abc'; for (let y = 0; y < h; y += 4) for (let x = (y / 4 % 2) * 4; x < w; x += 8) g.fillRect(x, y, 4, 2);
    g.fillStyle = '#fff1e6'; [[3, 3], [11, 9], [6, 12]].forEach(function (p) { g.fillRect(p[0], p[1], 2, 1); g.fillRect(p[0] + 1, p[1] - 1, 1, 3); });
  }, 2, 2));
  B(0.96, 0.08, 1.15, copertaMat, -1.95, 0.5, -0.95, letto);                         // coperta rosa
  B(0.7, 0.1, 0.5, copertaMat, -1.9, 0.56, -1.65, letto).rotation.y = 0.35;           // coperte disordinate
  B(0.5, 0.12, 0.35, copertaMat, -2.1, 0.57, -0.7, letto).rotation.set(0.1, -0.5, 0.15);
  B(0.5, 0.03, 0.4, m.rosaCh, -1.45, 0.45, -0.55, letto).rotation.set(0, 0.5, -0.9);  // lenzuolo che penzola
  B(0.4, 0.14, 0.3, m.bianco, -2.12, 0.52, -2.25, letto).rotation.y = 0.12;           // cuscini
  B(0.4, 0.14, 0.3, m.rosaCh, -1.75, 0.52, -2.25, letto).rotation.y = -0.18;
  const cuore = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), m.fucsia);      // cuscino a cuore
  cuore.scale.set(1.1, 0.8, 0.4); cuore.position.set(-1.95, 0.7, -2.0); cuore.rotation.z = 0.3; letto.add(cuore);
  const orso = new THREE.Group(); orso.position.set(-1.75, 0.6, -1.15); orso.rotation.y = 0.5; letto.add(orso);   // orsetto con fiocco giallo
  S(0.1, m.marrone, 0, 0.1, 0, orso, 1, 1.1, 0.9); S(0.075, m.marrone, 0, 0.27, 0.01, orso);
  S(0.03, m.marrone, -0.06, 0.34, 0, orso); S(0.03, m.marrone, 0.06, 0.34, 0, orso);
  S(0.025, m.nero, -0.025, 0.28, 0.07, orso); S(0.025, m.nero, 0.025, 0.28, 0.07, orso);
  B(0.07, 0.03, 0.03, m.giallo, 0, 0.2, 0.06, orso);
  blocco(-2.5, -1.42, -2.5, -0.42);

  // Comodino con lampada e sveglia
  B(0.45, 0.5, 0.45, m.legno, -1.12, 0, -2.27); blocco(-1.36, -0.88, -2.5, -2.04);
  C(0.05, 0.1, 6, m.oro, -1.28, 0.5, -2.38);
  C(0.15, 0.17, 8, lampada(0xfff0a0), -1.28, 0.6, -2.38, null, 0.08);                   // paralume giallo
  const luceLetto = new THREE.PointLight(0xffd070, 0.8, 4.5, 2); luceLetto.position.set(-1.28, 0.9, -2.15); gruppo.add(luceLetto);
  const sveglia = new THREE.Group(); sveglia.position.set(-1.0, 0.5, -2.2); gruppo.add(sveglia);
  B(0.18, 0.18, 0.07, m.rosaSc, 0, 0, 0, sveglia);
  piano(0.15, 0.15, lampada(0xffffff, tex(16, 16, function (g, w, h) {
    g.fillStyle = '#fff6d6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e0a800'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillRect(Math.round(8 + 6.5 * Math.sin(a)), Math.round(8 - 6.5 * Math.cos(a)), 1, 1); }
  })), 0, 0.09, 0.037, 0, 0, sveglia);
  const perno = new THREE.Group(); perno.position.set(0, 0.09, 0.042); sveglia.add(perno);
  const lancetteMin = new THREE.Group(), lancetteOre = new THREE.Group(), lancettaSec = new THREE.Group();
  B(0.012, 0.06, 0.004, m.nero, 0, 0, 0, lancetteMin); B(0.014, 0.04, 0.004, m.nero, 0, 0, 0.004, lancetteOre); B(0.005, 0.07, 0.003, lampada(0xd22b2b), 0, -0.01, 0.008, lancettaSec);
  perno.add(lancetteMin, lancetteOre, lancettaSec);
  C(0.015, 0.03, 6, m.oro, -0.06, 0.18, 0, sveglia); C(0.015, 0.03, 6, m.oro, 0.06, 0.18, 0, sveglia);   // campanelle
  // (fase 63) sul retro, in basso, piccolo e nero: ICARLY
  { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000000'; g.font = 'bold 10px Arial, sans-serif'; g.fillText('ICARLY', 32, 8);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
    piano(0.08, 0.02, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3 }), 0, 0.025, -0.0362, Math.PI, 0, sveglia); }

  // ---------- Scrivania ----------
  const scr = new THREE.Group(); gruppo.add(scr);
  B(1.6, 0.05, 0.65, m.panna, 1.6, 0.73, -2.14, scr);
  [[0.84, -2.45], [2.36, -2.45], [0.84, -1.83], [2.36, -1.83]].forEach(function (p) { B(0.05, 0.73, 0.05, m.rosaSc, p[0], 0, p[1], scr); });
  B(0.5, 0.2, 0.55, m.rosa, 2.1, 0.5, -2.17, scr);                                   // cassetto
  blocco(0.78, 2.42, -2.5, -1.78);
  const sedia = new THREE.Group(); sedia.position.set(1.45, 0, -1.35); sedia.rotation.y = 0.5; gruppo.add(sedia);
  B(0.4, 0.05, 0.4, m.fucsia, 0, 0.42, 0, sedia); B(0.4, 0.4, 0.05, m.fucsia, 0, 0.47, -0.2, sedia);
  [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(function (p) { B(0.035, 0.42, 0.035, m.panna, p[0], 0, p[1], sedia); });
  blocco(1.22, 1.68, -1.58, -1.12);
  // laptop
  B(0.34, 0.015, 0.24, m.grigio, 1.5, 0.78, -2.2, scr);
  const schermo = B(0.34, 0.22, 0.012, M(0x222233), 1.5, 0.89, -2.31, scr); schermo.rotation.x = -0.25;
  piano(0.3, 0.18, lampada(0xffffff, tex(16, 10, function (g, w, h) {
    g.fillStyle = '#ffd1e3'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff8fb8'; g.fillRect(2, 2, 12, 1); g.fillRect(2, 4, 8, 1); g.fillStyle = '#ffe680'; g.fillRect(11, 6, 3, 3);
  })), 0, 0, 0.008, 0, 0, schermo);
  // trucchi, profumi e accessori
  B(0.13, 0.025, 0.09, m.fucsia, 1.0, 0.78, -2.3, scr); B(0.11, 0.004, 0.07, lampada(0xffc2d6), 1.0, 0.805, -2.3, scr);   // palette
  [0, 0.035, 0.07].forEach(function (d, i) { C(0.01, 0.07, 6, [m.nero, m.oro, m.nero][i], 1.04 + d, 0.78, -2.12, scr); C(0.012, 0.03, 6, [m.fucsia, m.rosaSc, m.rosa][i], 1.04 + d, 0.85, -2.12, scr); });   // rossetti
  B(0.07, 0.11, 0.05, M(0xffd1e8, 0x301020), 1.18, 0.78, -2.05, scr); B(0.03, 0.04, 0.03, m.oro, 1.18, 0.89, -2.05, scr);   // profumi
  C(0.045, 0.1, 6, M(0xc9a6e0, 0x1a0a28), 1.3, 0.78, -2.05, scr);
  C(0.05, 0.12, 8, m.rosaSc, 1.9, 0.78, -2.35, scr);                                  // portapennelli
  [-0.02, 0, 0.02].forEach(function (d) { B(0.01, 0.12, 0.01, m.legno, 1.9 + d, 0.9, -2.35, scr).rotation.z = d * 6; });
  // telefono (smartphone nero con lo schermo acceso)
  const telefono = new THREE.Group(); telefono.position.set(2.1, 0.78, -2.05); telefono.rotation.y = -0.3; scr.add(telefono);
  B(0.075, 0.01, 0.15, m.nero, 0, 0, 0, telefono);
  const schTel = piano(0.063, 0.135, lampada(0xffffff, tex(8, 16, function (g, w, h) {
    g.fillStyle = '#ffe680'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2230'; g.fillRect(1, 2, 5, 2); g.fillRect(2, 6, 5, 2); g.fillRect(1, 10, 4, 2);
  })), 0, 0.0055, 0, 0, -Math.PI / 2, telefono);
  // pacchetto di sigarette (bianco con fascia gialla) e accendino giallo
  const sigarette = new THREE.Group(); sigarette.position.set(1.0, 0.78, -1.98); sigarette.rotation.y = 0.4; scr.add(sigarette);
  B(0.06, 0.09, 0.025, M(0xffffff, 0x1a1a1a), 0, 0, 0, sigarette);
  B(0.062, 0.025, 0.027, m.giallo, 0, 0.045, 0, sigarette);
  B(0.03, 0.03, 0.002, m.fucsia, 0, 0.02, 0.014, sigarette);
  // (fase 63) sul retro la marca: FUCK'D UP!
  const scritta = function (w, h, disegna) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; disegna(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; return t;
  };
  piano(0.058, 0.088, M(0xffffff, 0x1a1a1a, scritta(64, 96, function (g, w, h) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd84a'; g.fillRect(0, 0, w, 26);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c4161c';
    g.font = 'bold 14px "Arial Black", Arial, sans-serif'; g.fillText("FUCK'D", w / 2, 62); g.fillText('UP!', w / 2, 79);   // sotto la fascia gialla
  })), 0, 0.045, -0.0132, Math.PI, 0, sigarette);
  B(0.035, 0.08, 0.015, M(0xffd84a, 0x403000), 1.1, 0.78, -1.95, scr).rotation.y = 0.8;
  // sagoma nera che compare per un attimo vicino al pacchetto
  const sagoma = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.1), new THREE.MeshBasicMaterial({
    map: tex(16, 36, function (g, w, h) {
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(8, 5, 4, 5, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(2, 36); g.lineTo(3, 12); g.lineTo(13, 12); g.lineTo(14, 36); g.fill();
      g.fillRect(0, 12, 3, 16); g.fillRect(13, 12, 3, 18);
    }), transparent: true, depthTest: false }));
  sagoma.position.set(1.0, 1.35, -2.0); sagoma.visible = false; sagoma.renderOrder = 10; gruppo.add(sagoma);

  // ---------- Specchio da trucco con lampadine (muro est) ----------
  const specchio = new THREE.Group(); specchio.position.set(L - 0.03, 1.2, -0.5); specchio.rotation.y = -Math.PI / 2; gruppo.add(specchio);
  B(1.0, 1.6, 0.05, m.fucsia, 0, -0.8, 0, specchio);
  const texRiflesso = tex(20, 32, function (g, w, h) {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#fbe3ee'); gr.addColorStop(1, '#c7a6c9');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(3, 3, 2, 12); g.fillRect(6, 3, 1, 6);
    g.fillStyle = '#9a6f93'; g.fillRect(0, 26, w, 6);                                            // il riflesso del pavimento
  });
  const texAnomalia = tex(20, 32, function (g, w, h) {
    g.fillStyle = '#12060c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(10, 10, 6, 8, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(1, 32); g.lineTo(3, 17); g.lineTo(17, 17); g.lineTo(19, 32); g.fill();
    g.fillStyle = '#ffe640';
    [[6, 5], [10, 4], [14, 5], [4, 9], [8, 8], [12, 8], [16, 9], [7, 12], [13, 12], [10, 15]].forEach(function (p) { g.fillRect(p[0], p[1], 2, 1); });   // occhi multipli
    g.fillStyle = '#12060c'; [[6.5, 5], [14.5, 5], [10.5, 4], [4.5, 9], [8.5, 8], [12.5, 8], [16.5, 9], [7.5, 12], [13.5, 12], [10.5, 15]].forEach(function (p) { g.fillRect(Math.floor(p[0]), Math.floor(p[1]), 1, 1); });
  });
  const vetro = piano(0.88, 1.48, lampada(0xffffff, texRiflesso), 0, 0, 0.03, 0, 0, specchio);
  for (let i = 0; i < 9; i++) [-0.5, 0.5].forEach(function (x) { lucine.push(B(0.045, 0.045, 0.045, m.giallo, x, -0.75 + i * 0.19, 0.045, specchio)); });
  for (let i = 0; i < 5; i++) [0.78, -0.78].forEach(function (y) { lucine.push(B(0.045, 0.045, 0.045, m.giallo, -0.4 + i * 0.2, y, 0.045, specchio)); });
  C(0.28, 0.32, 8, m.lilla, 1.75, 0, -0.5); blocco(1.47, 2.03, -0.78, -0.22);        // pouf

  // ---------- Armadio con vestiti e scarpe ----------
  // (fase 60) l'armadio si apre: è vuoto dentro (scuro), con un'asta, qualche gruccia, due vestiti di lei e, al centro,
  // la FELPA GIALLA che il ragazzo le aveva regalato (scritta GREENLIGHT in verde). Le due ante girano sui cardini.
  const AX = 1.95, AZ0 = 0.5, AZ1 = 1.9, AH = 2.1;                 // fronte, fianchi, altezza
  const dentro = M(0x2a1a26, 0x0a0408), fuori = m.rosaCh;
  B(0.04, AH - 0.002, AZ1 - AZ0 - 0.08, dentro, 2.465, 0.001, (AZ0 + AZ1) / 2);   // fondo (fase 67: dentro i fianchi)
  // (fase 66) cielo e fondo stanno DENTRO i fianchi (prima le loro facce coincidevano con quelle dei fianchi: flickering)
  B(0.54, 0.04, AZ1 - AZ0 - 0.08, fuori, 2.22, AH - 0.04, (AZ0 + AZ1) / 2);      // cielo
  B(0.54, 0.06, AZ1 - AZ0 - 0.08, fuori, 2.22, 0.001, (AZ0 + AZ1) / 2);          // fondo in basso
  B(0.54, AH, 0.04, fuori, 2.22, 0, AZ0 + 0.02); B(0.54, AH, 0.04, fuori, 2.22, 0, AZ1 - 0.02);   // fianchi (fase 67: 1 cm staccati dal muro)
  B(0.5, 0.012, AZ1 - AZ0 - 0.08, dentro, 2.22, 0.06, (AZ0 + AZ1) / 2);           // pianale scuro
  C(0.012, AZ1 - AZ0 - 0.1, 6, m.grigio, 2.22, 1.82, AZ0 + 0.05).rotation.x = Math.PI / 2;   // asta
  const gruccia = function (z, padre) {
    const g = new THREE.Group(); g.position.set(2.22, 1.82, z); (padre || gruppo).add(g);
    C(0.006, 0.06, 4, m.grigio, 0, -0.02, 0, g);
    const s1 = B(0.008, 0.01, 0.22, m.grigio, 0, -0.05, -0.08, g); s1.rotation.x = 0.45;
    const s2 = B(0.008, 0.01, 0.22, m.grigio, 0, -0.05, 0.08, g); s2.rotation.x = -0.45;
    return g;
  };
  [0.7, 0.85, 1.62, 1.75].forEach(function (z) { gruccia(z); });                   // grucce vuote
  B(0.08, 0.7, 0.32, M(0x3a2a44), 2.22, 1.05, 0.78);                              // un vestito scuro di lei
  B(0.08, 0.55, 0.3, M(0x5a2236), 2.22, 1.2, 1.68);                               // e uno bordeaux
  // la felpa: un oggetto a sé (si clona per guardarla da vicino); davanti = +z, poi girata verso la stanza
  function felpaGialla() {
    const f = new THREE.Group();
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#f2d21a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#d9b40e'; g.fillRect(0, 116, 128, 12);                        // elastico in fondo
    g.fillStyle = '#e2c010'; g.fillRect(30, 78, 68, 30);                          // tasca a marsupio
    g.fillStyle = '#c9a40a'; g.fillRect(30, 78, 68, 2); g.fillRect(30, 78, 2, 30); g.fillRect(96, 78, 2, 30);
    g.font = 'bold 19px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = '#0c5a1c'; g.strokeText('GREENLIGHT', 64, 50);
    g.fillStyle = '#2fd14a'; g.fillText('GREENLIGHT', 64, 50);
    g.fillStyle = '#f5f0e0'; g.fillRect(52, 0, 2, 26); g.fillRect(74, 0, 2, 22);   // laccetti del cappuccio
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter;
    const giallo = M(0xf2d21a, 0x2a2000), fronte = M(0xffffff, 0x2a2000, t), polsi = M(0xd9b40e, 0x1e1600);
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.13), [giallo, giallo, giallo, giallo, fronte, giallo]);
    corpo.position.y = -0.33; f.add(corpo);
    [-1, 1].forEach(function (l) {                                                // maniche, un po' aperte
      const ma = new THREE.Group(); ma.position.set(l * 0.23, -0.1, 0); ma.rotation.z = l * 0.18; f.add(ma);
      B(0.12, 0.5, 0.12, giallo, 0, -0.5, 0, ma); B(0.11, 0.06, 0.11, polsi, 0, -0.56, 0, ma);
    });
    const cappuccio = B(0.3, 0.2, 0.16, giallo, 0, -0.1, -0.06, f); cappuccio.rotation.x = -0.35;
    B(0.24, 0.05, 0.13, polsi, 0, -0.08, 0.0, f);                                  // scollo
    return f;
  }
  const felpa = felpaGialla();
  felpa.position.set(2.2, 1.8, 1.22); felpa.rotation.y = -Math.PI / 2; gruppo.add(felpa);
  gruccia(1.22);
  // le ante: perni sui due fianchi; si aprono verso la stanza (apri: 0 = chiuse, 1 = aperte di 115 gradi)
  const texAnta = function (destra) {
    return tex(16, 32, function (g, w, h) {
      g.fillStyle = '#f9c9da'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9709a'; g.fillRect(0, 0, w, 2); g.fillRect(0, 30, w, 2);
      g.fillRect(destra ? 0 : w - 2, 0, 2, h); g.fillStyle = '#e3b341'; g.fillRect(destra ? 3 : 12, 14, 1, 5);
    });
  };
  const ante = [[AZ0, 1, false], [AZ1, -1, true]].map(function (d) {
    const perno = new THREE.Group(); perno.position.set(AX - 0.015, 0.05, d[0]); gruppo.add(perno);
    const anta = new THREE.Mesh(new THREE.BoxGeometry(0.03, AH - 0.1, (AZ1 - AZ0) / 2 - 0.01), [fuori, fuori, fuori, fuori, fuori, fuori]);
    anta.material = [dentro, M(0xffffff, 0x201018, texAnta(d[2])), fuori, fuori, fuori, fuori];
    anta.position.set(0, (AH - 0.1) / 2, d[1] * ((AZ1 - AZ0) / 4)); perno.add(anta);
    return { perno: perno, verso: d[1] };
  });
  let armadioApri = 0, armadioVerso = 0;
  blocco(1.93, 2.5, 0.5, 1.9);
  [[1.55, 1.15, 0xff8fb8, 0.3, 0.06], [1.65, 1.3, 0xffe680, 1.1, 0.05], [1.5, 1.35, 0xc9a6e0, 2.0, 0.07], [1.7, 1.05, 0x8fd0e8, 0.7, 0.05]].forEach(function (c) {
    B(0.34, c[4], 0.26, M(c[2]), c[0], 0, c[1]).rotation.y = c[3];                    // vestiti ammucchiati
  });
  [[1.55, 1.8], [1.72, 1.78]].forEach(function (p, i) {                                // scarpe
    const s = new THREE.Group(); s.position.set(p[0], 0, p[1]); s.rotation.y = 0.2 + i * 0.5; gruppo.add(s);
    B(0.09, 0.07, 0.24, i ? m.fucsia : m.bianco, 0, 0.02, 0, s); B(0.095, 0.02, 0.25, m.oro, 0, 0, 0, s);
  });

  // ---------- Cassettiera con la scatola musicale ----------
  B(0.45, 0.75, 0.95, m.legno, -2.27, 0, 0.25); blocco(-2.5, -2.03, -0.25, 0.75);
  [0.15, 0.4, 0.6].forEach(function (y) { B(0.01, 0.01, 0.8, m.legnoSc, -2.045, y, 0.25); });
  const scatola = new THREE.Group(); scatola.position.set(-2.27, 0.75, 0.0); gruppo.add(scatola);
  B(0.22, 0.1, 0.17, m.oro, 0, 0, 0, scatola); B(0.23, 0.04, 0.18, m.rosaSc, 0, 0.1, 0, scatola);
  const ballerina = new THREE.Group(); ballerina.position.set(0, 0.14, 0); scatola.add(ballerina);
  C(0.035, 0.06, 6, m.rosaCh, 0, 0, 0, ballerina, 0.015); S(0.018, m.panna, 0, 0.08, 0, ballerina);
  S(0.1, m.bianco, -2.27, 0.86, 0.5, null, 1, 1.2, 0.9); S(0.06, m.bianco, -2.27, 1.02, 0.5);   // coniglietto di peluche
  B(0.025, 0.1, 0.02, m.bianco, -2.27, 1.04, 0.47); B(0.025, 0.1, 0.02, m.bianco, -2.27, 1.04, 0.53);
  B(0.02, 0.2, 0.15, m.panna, -2.4, 0.75, 0.62);                                       // cornice con foto

  // ---------- Porta (muro ovest) ----------
  const porta = new THREE.Group(); porta.position.set(-L + 0.03, 0, 1.6); gruppo.add(porta);
  B(0.07, 2.2, 1.05, m.panna, 0, 0, 0, porta);
  B(0.05, 2.1, 0.9, m.legno, 0.03, 0, 0, porta);
  const maniglia = B(0.06, 0.05, 0.14, M(0xe3b341, 0x3a2a00), 0.09, 1.0, 0.33, porta);
  const lucePorta = B(0.01, 2.1, 0.03, m.giallo, 0.06, 0, -0.43, porta); lucePorta.visible = false;
  const alonePorta = piano(0.9, 2.1, new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0.08, 1.05, 0, Math.PI / 2, 0, porta);

  // ---------- La ragazza: lo stesso modello del fantasma in strada (src/personaggi/ragazza.js), distesa sul pavimento,
  // con la pelle di colore naturale. Accanto alla testa, sul pavimento, la macchia di ketchup ----------
  const ragazza = new THREE.Group(); ragazza.position.set(-0.15, 0.012, 0.1); ragazza.rotation.y = 0.15; gruppo.add(ragazza);
  const ombra = new THREE.Mesh(new THREE.CircleGeometry(0.95, 10), new THREE.MeshBasicMaterial({ color: 0x3a1028, transparent: true, opacity: 0.35, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  ombra.rotation.x = -Math.PI / 2; ombra.scale.set(1, 0.4, 1); ombra.position.set(0.12, 0.004, 0); ragazza.add(ombra);
  const modello = PZ.creaRagazza(scena, 'distesa', 3, { naturale: true });
  modello.gruppo.position.set(0.12, 0, 0); ragazza.add(modello.gruppo); modello.mostra();
  // ketchup: una pozza rossa irregolare con schizzi e una colatura, lucida, appoggiata sul pavimento (qui sopra il
  // tappeto) accanto alla tempia destra; il volto resta scoperto
  const texKetchup = tex(64, 64, function (g, w, h) {
    const rk = PZ.ps1.casuale(404);
    g.clearRect(0, 0, w, h);
    function macchia(cx, cy, r, colore) {
      g.fillStyle = colore; g.beginPath();
      for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI * 2, q = r * (0.7 + 0.45 * rk()); const x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q * 0.85; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.fill();
    }
    macchia(30, 32, 19, '#a3000c'); macchia(38, 36, 12, '#a3000c'); macchia(22, 26, 10, '#a3000c');
    g.strokeStyle = '#a3000c'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, 40); g.lineTo(54, 47); g.lineTo(57, 53); g.stroke();   // colatura
    [[8, 14, 3], [52, 18, 2.5], [12, 50, 2], [57, 33, 2], [45, 56, 1.5], [6, 36, 1.5], [24, 8, 1.5]].forEach(function (p) { macchia(p[0], p[1], p[2], '#a3000c'); });   // schizzi
    macchia(30, 33, 13, '#7d0008'); macchia(34, 36, 7, '#5e0006');                    // più spessa e scura al centro
    g.fillStyle = 'rgba(255,170,160,0.85)'; g.fillRect(24, 26, 5, 2); g.fillRect(23, 28, 2, 2); g.fillRect(41, 37, 3, 1);   // riflessi lucidi
  });
  texKetchup.wrapS = texKetchup.wrapT = THREE.ClampToEdgeWrapping;
  const ketchup = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshPhongMaterial({ map: texKetchup, transparent: true, alphaTest: 0.5,
    color: 0xffffff, emissive: 0x2a0002, specular: 0x664444, shininess: 60, flatShading: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
  ketchup.rotation.set(-Math.PI / 2, 0, 0.6); ketchup.position.set(-0.6, 0.006, 0.3); ragazza.add(ketchup);
  blocco(-0.95, 0.85, -0.1, 0.4);

  // ---------- La pietra d'ambra, ben riconoscibile ----------
  const pietra = PZ.creaPietra(scena);
  pietra.visible = true; pietra.scale.setScalar(2.6);
  // (fase 23) il telefono di Ambra, a terra vicino al suo corpo: rosa, lo schermo acceso sulla chat con la mamma
  const telAmbra = new THREE.Group(); telAmbra.position.set(-0.25, 0.012, 0.62); telAmbra.rotation.y = 0.7; gruppo.add(telAmbra);
  // (fase 61) viola come il suo vestito, con il bordo un tono più chiaro
  B(0.075, 0.01, 0.15, M(0x5f4b69, 0x1a1020), 0, 0, 0, telAmbra);
  B(0.079, 0.006, 0.154, M(0x73607d, 0x1a1020), 0, -0.001, 0, telAmbra);
  piano(0.063, 0.135, lampada(0xffffff, tex(8, 16, function (g, w, h) {
    g.fillStyle = '#ffeaf2'; g.fillRect(0, 0, w, h); g.fillStyle = '#c2487c'; g.fillRect(0, 0, w, 2);
    g.fillStyle = '#6e4a57'; g.fillRect(1, 4, 5, 2); g.fillRect(1, 7, 6, 2); g.fillRect(1, 10, 4, 2); g.fillRect(1, 13, 5, 2);
  })), 0, 0.0106, 0, 0, -Math.PI / 2, telAmbra).userData.schermo = true;   // (fase 61) sopra il corpo (prima ci finiva dentro)
  const posPietra = new V3(0.95, 0.3, 0.45);
  pietra.position.copy(posPietra);
  const raggio = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.2, 2.4, 8, 1, true), new THREE.MeshBasicMaterial({
    color: 0xffd84a, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  raggio.position.set(posPietra.x, 1.5, posPietra.z); gruppo.add(raggio);
  const luceAmbra = new THREE.PointLight(0xffc040, 1.2, 4, 2); luceAmbra.position.set(posPietra.x, 0.7, posPietra.z); gruppo.add(luceAmbra);
  const scintille = [];
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), lampada(0xffe680)); gruppo.add(s); scintille.push(s); }
  let pietraPresa = false;

  // ---------- Luci della stanza ----------
  scena.add(new THREE.HemisphereLight(0xffd9ea, 0x8a4f6a, 0.6));
  const centro = new THREE.PointLight(0xffe2b0, 0.4, 9, 2); centro.position.set(0, 2.4, 0.3); scena.add(centro);
  const lunaLuce = new THREE.PointLight(0xaab8ff, 0.35, 5, 2); lunaLuce.position.set(0.1, 1.6, -2.1); scena.add(lunaLuce);

  // ---------- Aggiornamento ----------
  let orologioFermo = true, tOrologio = 0, ore = 3.25;   // (fase 48) la sveglia è ferma da subito
  function aggiorna(t, dt, giocatorePos) {
    if (!pietraPresa) {                                                    // la pietra fluttua e brilla
      pietra.position.y = posPietra.y + Math.sin(t * 2) * 0.04; pietra.rotation.y = t * 0.8;
      pietra.brilla(1, t);
      raggio.material.opacity = 0.16 + 0.05 * Math.sin(t * 3);
      scintille.forEach(function (s, i) {
        const a = t * 1.1 + i * 1.047, r = 0.32 + 0.05 * Math.sin(t * 2 + i);
        s.position.set(posPietra.x + Math.cos(a) * r, 0.45 + 0.25 * Math.sin(t * 1.7 + i * 2), posPietra.z + Math.sin(a) * r);
        s.rotation.y = t * 3;
      });
    }
    lucine.forEach(function (b, i) { b.scale.setScalar(0.8 + 0.2 * Math.sin(t * 2 + i)); });
    // sveglia: le lancette corrono finché il protagonista non si avvicina alla pietra, poi restano ferme
    if (!orologioFermo && giocatorePos && Math.hypot(giocatorePos.x - posPietra.x, giocatorePos.z - posPietra.z) < 1.6) orologioFermo = true;
    if (!orologioFermo) { tOrologio += dt; ore += dt * 0.0016; }
    lancetteMin.rotation.z = -(ore % 1) * Math.PI * 2;
    lancetteOre.rotation.z = -(ore / 12) * Math.PI * 2;
    if (!orologioFermo) lancettaSec.rotation.z = -Math.floor(tOrologio) * Math.PI / 30;
    if (armadioVerso) {                                                            // (fase 60) le ante girano
      armadioApri = Math.max(0, Math.min(1, armadioApri + armadioVerso * dt / 0.9));
      const e = armadioApri * armadioApri * (3 - 2 * armadioApri), a = 2.0 * e;   // fino a 115 gradi: le ante si piegano verso il muro
      ante.forEach(function (x) { x.perno.rotation.y = -x.verso * a; });
      if (armadioApri === 0 || armadioApri === 1) armadioVerso = 0;
    }
    if (lucePorta.visible) alonePorta.material.opacity = 0.18 + 0.08 * Math.sin(t * 3);
  }

  return {
    gruppo: gruppo, colliders: colliders, limite: L - 0.3, aggiorna: aggiorna,
    pietra: pietra, posPietra: posPietra,
    prendiPietra: function () { pietraPresa = true; pietra.visible = false; raggio.visible = false; luceAmbra.intensity = 0; scintille.forEach(function (s) { s.visible = false; }); },
    orologioFermo: function () { return orologioFermo; }, ora: function () { return ore; },
    specchio: { vetro: vetro, normale: texRiflesso, anomalia: texAnomalia },
    sagoma: sagoma,
    // (fase 60) gli oggetti da guardare da vicino (si clonano) e l'armadio
    oggetti: { sveglia: sveglia, sigarette: sigarette, scatola: scatola, felpa: felpa, telAmbra: telAmbra },
    apriArmadio: function () { if (armadioApri < 1) armadioVerso = 1; }, armadioAperto: function () { return armadioApri >= 1; },
    punti: {
      armadio: new V3(1.5, 0, 1.2),
      specchio: new V3(2.0, 0, -0.5), telefono: new V3(2.1, 0, -2.0), orologio: new V3(-1.0, 0, -2.2),
      sigarette: new V3(1.0, 0, -1.98), telAmbra: new V3(-0.25, 0, 0.62), scatola: new V3(-2.27, 0, 0.0), porta: new V3(-2.45, 0, 1.6), pietra: posPietra
    },
    sblocca: function () { lucePorta.visible = true; maniglia.material = lampada(GIALLO); alonePorta.material.opacity = 0.22; }
  };
};
