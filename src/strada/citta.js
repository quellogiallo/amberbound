// La strada cittadina: tre corsie, stalli blu per le auto parcheggiate, marciapiedi, palazzi con negozi, lampioni,
// alberi, cartelli, fermate dell'autobus, cassonetti, strisce pedonali e strade laterali.
//
// Come funziona il percorso "senza fine": la strada è fatta di TRATTI lunghi 24 metri. All'avvio se ne preparano
// 12 diversi (ognuno già unito in pochi pezzi per materiale); 6 alla volta sono in scena, uno dietro l'altro.
// Il ragazzo resta fermo a z = 0 e la città gli scorre incontro: quando un tratto finisce dietro la camera
// viene spostato in fondo alla fila, scegliendo a caso tra quelli non in uso. Niente viene creato durante la corsa.
//
// Coordinate: x = destra (+) / sinistra (-), y = altezza, z = verso la camera (+). Il ragazzo va verso -z.
PZ.creaCitta = function (scena) {
  const CFG = PZ.CONFIG.strada;
  const T = PZ.textureCitta();
  const LC = CFG.larghezzaCorsia;            // larghezza di una corsia
  const BORDO = 1.5 * LC;                    // fine delle tre corsie (linea bianca)
  const SOSTA = BORDO + 1.8;                 // fine della fascia di sosta (cordolo)
  const MURO = SOSTA + 2.5;                  // inizio dei palazzi
  const SL = 24;                             // lunghezza di un tratto
  const N_TRATTI = 13, IN_SCENA = 8;          // 8 in scena: due dietro (per lo specchietto) e sei davanti
  const FAC_U = 10.4, FAC_V = 24.8;          // metri coperti da una "piastrella" di facciata (4 campate x 8 piani)
  const PIANO = 3.1, TERRA = 4;              // altezza di un piano e del piano terra

  // ---------- Materiali condivisi da tutti i tratti ----------
  const lamb = function (o) { o.vertexColors = true; return new THREE.MeshLambertMaterial(o); };
  T.asfalto.repeat.set(1, 1);
  const MAT = {
    colori: lamb({}),
    asfalto: lamb({ map: T.asfalto }),
    marciapiede: lamb({ map: T.marciapiede }),
    facciate: lamb({ map: T.facciate.mappa, emissiveMap: T.facciate.luce, emissive: 0xffffff }),
    negozi: lamb({ map: T.negozi, emissiveMap: T.negoziLuce, emissive: 0xffffff }),
    segni: lamb({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    luci: new THREE.MeshBasicMaterial({ vertexColors: true }),
    insegne: new THREE.MeshBasicMaterial({ map: T.insegne, vertexColors: true }),
    pozze: new THREE.MeshBasicMaterial({ map: T.pozza, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    aloni: new THREE.MeshBasicMaterial({ map: T.alone, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })
  };

  // ---------- Pezzi ricorrenti ----------
  // facciata lungo z (rivolta verso la strada) spezzata dove la texture ricomincia: così basta un atlante unico
  function facciataZ(C, s, zA, zB, y0, y1, pal, uo, vo, x) {
    let u = uo, z = s < 0 ? zA : zB, rimane = zA - zB;
    const dir = s < 0 ? -1 : 1, v0 = vo, v1 = vo + (y1 - y0) / FAC_V;
    while (rimane > 0.001) {
      const fr = u - Math.floor(u), passo = Math.min(rimane, (1 - fr) * FAC_U), z2 = z + dir * passo;
      const U0 = (pal + fr) / 8 + 0.0004, U1 = (pal + fr + passo / FAC_U) / 8 - 0.0004;
      C.quad('facciate', [x, y0, z], [x, y0, z2], [x, y1, z2], [x, y1, z], [U0, v0, U1, v1]);
      u += passo / FAC_U; z = z2; rimane -= passo;
    }
  }
  // facciata rivolta verso +z (si vede attraverso le strade laterali), da x0 a x1
  function facciataX(C, z, x0, x1, y0, y1, pal, vo) {
    let u = 0, x = x0, rimane = x1 - x0;
    const v0 = vo, v1 = vo + (y1 - y0) / FAC_V;
    while (rimane > 0.001) {
      const fr = u - Math.floor(u), passo = Math.min(rimane, (1 - fr) * FAC_U), x2 = x + passo;
      const U0 = (pal + fr) / 8 + 0.0004, U1 = (pal + fr + passo / FAC_U) / 8 - 0.0004;
      C.quad('facciate', [x, y0, z], [x2, y0, z], [x2, y1, z], [x, y1, z], [U0, v0, U1, v1]);
      u += passo / FAC_U; x = x2; rimane -= passo;
    }
  }
  // quadrilatero a terra (rivolto verso l'alto)
  function suolo(C, k, x0, x1, z0, z1, y, colore, uv) {
    C.quad(k, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], uv || [x0 / 2.5, -z0 / 2.5, x1 / 2.5, -z1 / 2.5], colore);
  }
  // cartello (quadrato con la figura presa dall'atlante) su un palo, rivolto verso chi arriva in bici
  function cartello(C, x, z, regione, alto, w, h) {
    w = w || 0.62; h = h || 0.62; alto = alto || 2.5;
    C.cilindro('colori', 0.04, alto + h / 2, 6, x, 0.15, z, 0x8c9096);
    C.scatola('colori', w + 0.04, h + 0.04, 0.03, x, alto - h / 2 + 0.15 - 0.02, z - 0.03, 0x9a9ea4);
    const uv = T.uv(T.R[regione]), y0 = alto - h / 2 + 0.15, y1 = y0 + h;
    C.quad('insegne', [x - w / 2, y0, z], [x + w / 2, y0, z], [x + w / 2, y1, z], [x - w / 2, y1, z], uv, 0xd8d8d8);
  }
  // lampione: palo, braccio verso la strada, corpo luminoso, alone e pozza di luce calda sull'asfalto
  function lampione(C, s, z) {
    const xp = s * (SOSTA + 0.45), xt = s * (BORDO + 0.75);
    C.scatola('colori', 0.26, 0.6, 0.26, xp, 0.15, z, 0x2f3833);
    C.cilindro('colori', 0.07, 6.6, 6, xp, 0.15, z, 0x3a4440);
    C.scatola('colori', Math.abs(xp - xt) + 0.1, 0.09, 0.09, (xp + xt) / 2, 6.72, z, 0x3a4440);
    C.scatola('colori', 0.56, 0.16, 0.32, xt, 6.62, z, 0x2a302c);
    C.scatola('luci', 0.46, 0.04, 0.24, xt, 6.6, z, 0xfff0c4);
    C.quad('aloni', [xt - 0.9, 5.7, z + 0.2], [xt + 0.9, 5.7, z + 0.2], [xt + 0.9, 7.5, z + 0.2], [xt - 0.9, 7.5, z + 0.2], [0, 0, 1, 1], 0xffe2a0);
    // pozza di luce: sulla strada fino al cordolo, poi un pezzo sul marciapiede
    const R = 3.4, cx = xt, x0 = cx - R, x1 = cx + R;
    const xs0 = Math.max(x0, -SOSTA), xs1 = Math.min(x1, SOSTA);
    const u = function (x) { return (x - x0) / (2 * R); };
    C.quad('pozze', [xs0, 0.01, z + R], [xs1, 0.01, z + R], [xs1, 0.01, z - R], [xs0, 0.01, z - R], [u(xs0), 0, u(xs1), 1], 0xffc878);
    const ms0 = s > 0 ? SOSTA : Math.max(x0, -MURO), ms1 = s > 0 ? Math.min(x1, MURO) : -SOSTA;
    if (ms1 > ms0) C.quad('pozze', [ms0, 0.16, z + R], [ms1, 0.16, z + R], [ms1, 0.16, z - R], [ms0, 0.16, z - R], [u(ms0), 0, u(ms1), 1], 0xffc878);
  }
  function albero(C, x, z, r) {
    C.scatola('colori', 0.9, 0.02, 0.9, x, 0.15, z, 0x3a3128);
    C.cilindro('colori', 0.13, 3.0, 6, x, 0.15, z, 0x5d5244);
    const h = 3.8 + r() * 0.8;
    C.sfera('colori', 1.5, x, h + 0.4, z, 0x2c4527, 1.05, 0.85, 1.05, 1);
    C.sfera('colori', 1.0, x + 0.5 * (r() - 0.5), h + 1.3, z + 0.4 * (r() - 0.5), 0x3a5a32, 1, 0.8, 1, 1);
  }
  function cassonetti(C, s, zc, r) {
    const colori = [0x5f6368, 0x2459b8, 0xd9b030, 0x2f6b3a, 0x6b4a2a];
    for (let i = 0; i < 3; i++) {
      const z = zc + 1.4 - i * 1.4, col = colori[Math.floor(r() * colori.length)], x = s * (SOSTA - 0.55);
      C.scatola('colori', 0.9, 1.2, 1.25, x, 0.08, z, col);
      C.scatola('colori', 0.96, 0.08, 1.3, x, 1.28, z, T.tono(col, 0.8));
      [-0.45, 0.45].forEach(function (dz) { C.cilindro('colori', 0.08, 0.1, 6, x, 0.0, z + dz, 0x18191c); });
    }
  }
  function pensilina(C, s, z) {
    const x = s * (SOSTA + 1.25);
    C.scatola('colori', 1.3, 0.08, 4.0, x, 2.45, z, 0x5c646c);                          // tetto
    C.scatola('colori', 0.05, 2.3, 4.0, x + s * 0.6, 0.15, z, 0x2a3a48);                // vetro sul retro
    C.scatola('colori', 0.08, 2.3, 0.08, x + s * 0.6, 0.15, z + 1.95, 0x5c646c);
    C.scatola('colori', 0.08, 2.3, 0.08, x + s * 0.6, 0.15, z - 1.95, 0x5c646c);
    C.scatola('colori', 0.5, 0.08, 2.4, x + s * 0.3, 0.6, z, 0x6a5240);                  // panchina
    C.scatola('luci', 1.2, 1.7, 0.08, x, 0.45, z + 2.0, 0xd8e4f2);                       // pannello pubblicitario illuminato
    C.scatola('colori', 1.0, 1.0, 0.02, x, 0.85, z + 2.05, 0x6a4a8a);
    cartello(C, s * (SOSTA + 0.3), z + 2.6, 'bus', 2.6, 0.9, 0.45);
  }
  function edicola(C, s, z) {
    const x = s * (SOSTA + 1.35);
    C.scatola('colori', 1.7, 2.3, 2.8, x, 0.15, z, 0x2f5a40);
    C.scatola('colori', 2.0, 0.12, 3.1, x, 2.45, z, 0x24463a);
    C.scatola('colori', 0.04, 1.4, 2.4, x - s * 0.86, 0.65, z, 0x8c9096);                // serranda chiusa
    for (let i = 0; i < 6; i++) C.scatola('colori', 0.045, 0.02, 2.4, x - s * 0.86, 0.75 + i * 0.22, z, 0x6e7278);
  }
  function panchina(C, s, z) {
    const x = s * (SOSTA + 1.6);
    C.scatola('colori', 0.5, 0.06, 1.8, x, 0.6, z, 0x6a5240);
    C.scatola('colori', 0.06, 0.45, 1.8, x + s * 0.24, 0.7, z, 0x6a5240);
    C.scatola('colori', 0.4, 0.45, 0.06, x, 0.15, z + 0.8, 0x2a2d30);
    C.scatola('colori', 0.4, 0.45, 0.06, x, 0.15, z - 0.8, 0x2a2d30);
  }

  // ---------- Un palazzo affacciato sulla strada ----------
  const PORTA_Z = -9.4;
  function palazzo(C, s, zA, zB, r, opz) {
    const w = zA - zB, piani = 2 + Math.floor(r() * 4), H = TERRA + piani * PIANO;
    const pal = Math.floor(r() * 8), P = T.facciate.palette[pal], x = s * MURO, prof = opz.profondo ? 21 : 10;
    const uo = Math.floor(r() * 4) / 4, vo = Math.floor(r() * (8 - piani + 1)) / 8;
    // piani superiori
    facciataZ(C, s, zA, zB, TERRA, H, pal, uo, vo, x);
    // piano terra: vetrine, serrande, bar o portone
    const riga = opz.riga !== undefined ? opz.riga : Math.floor(r() * 4);
    const nv0 = 1 - (riga * 16 + 16) / 64 + 0.002, nv1 = 1 - riga * 16 / 64 - 0.002, nu0 = r();
    const nu1 = nu0 + w / FAC_U;
    if (opz.foro && s > 0) {
      // il vano del portone (opz.foro = [z da, z a, altezza]) resta aperto: il piano terra in tre pezzi attorno
      const f0 = opz.foro[0], f1 = opz.foro[1], fh = opz.foro[2];
      const u = function (z) { return nu0 + (z - zB) / (zA - zB) * (nu1 - nu0); }, v = function (y) { return nv0 + (y - 0.15) / (TERRA - 0.15) * (nv1 - nv0); };
      const pezzo = function (z1, z2, y1, y2) { C.quad('negozi', [x, y1, z1], [x, y1, z2], [x, y2, z2], [x, y2, z1], [u(z1), v(y1), u(z2), v(y2)], 0xe8e0d0); };
      pezzo(zB, f0, 0.15, TERRA); pezzo(f1, zA, 0.15, TERRA); pezzo(f0, f1, fh, TERRA);
      C.scatola('colori', 0.08, 0.5, f0 - zB, x - s * 0.04, 0.15, (f0 + zB) / 2, 0x77726a);
      C.scatola('colori', 0.08, 0.5, zA - f1, x - s * 0.04, 0.15, (zA + f1) / 2, 0x77726a);
    } else {
      if (s < 0) C.quad('negozi', [x, 0.15, zA], [x, 0.15, zB], [x, TERRA, zB], [x, TERRA, zA], [nu0, nv0, nu1, nv1], 0xe8e0d0);
      else C.quad('negozi', [x, 0.15, zB], [x, 0.15, zA], [x, TERRA, zA], [x, TERRA, zB], [nu0, nv0, nu1, nv1], 0xe8e0d0);
      C.scatola('colori', 0.08, 0.5, w, x - s * 0.04, 0.15, (zA + zB) / 2, 0x77726a);     // zoccolo di pietra
    }
    // cornicione, pluviale
    C.scatola('colori', 0.36, 0.32, w, x - s * 0.16, H - 0.3, (zA + zB) / 2, T.tono(P.base, 1.15));
    C.scatola('colori', 0.42, 0.18, w, x - s * 0.19, TERRA - 0.12, (zA + zB) / 2, T.tono(P.base, 0.9));
    C.scatola('colori', 0.08, H - 0.3, 0.08, x - s * 0.06, 0, zB + 0.12, 0x5a4a3a);
    // fianco verso la camera: muro cieco (oppure con le finestre, se dà su una strada laterale)
    const xin = s * MURO, xout = s * (MURO + prof);
    if (opz.fiancoFacciata) facciataX(C, zA, Math.min(xin, xout), Math.max(xin, xout), 0.15, H, pal, vo);
    else C.quad('colori', [Math.min(xin, xout), 0, zA], [Math.max(xin, xout), 0, zA], [Math.max(xin, xout), H, zA], [Math.min(xin, xout), H, zA], null, T.tono(P.base, 0.72));
    // balconi sotto alcune finestre (allineati alle campate della texture)
    if (r() < 0.5 && piani > 1) {
      const campate = Math.floor(w / 2.6);
      for (let f = 1; f < piani; f++) for (let b = 0; b < campate; b++) {
        if (r() < 0.45) continue;
        const zc = s < 0 ? zA - (b + 0.5) * 2.6 : zB + (b + 0.5) * 2.6, y = TERRA + f * PIANO - 0.05;
        if (zc > zA - 1.1 || zc < zB + 1.1) continue;
        C.scatola('colori', 0.7, 0.12, 1.9, x - s * 0.35, y, zc, 0x9a948a);
        C.scatola('colori', 0.04, 0.85, 1.9, x - s * 0.68, y + 0.12, zc, 0x2b2d30);
        C.scatola('colori', 0.66, 0.85, 0.04, x - s * 0.35, y + 0.12, zc + 0.93, 0x2b2d30);
        C.scatola('colori', 0.66, 0.85, 0.04, x - s * 0.35, y + 0.12, zc - 0.93, 0x2b2d30);
        if (r() < 0.3) C.scatola('colori', 0.3, 0.3, 0.3, x - s * 0.45, y + 0.12, zc + 0.5, 0x2f5a2a);   // vaso di piante
      }
    }
    // insegna sopra il negozio (scritta a pixel) e insegna a bandiera rivolta verso la strada
    if (riga === 0 || riga === 2) {
      const n = riga === 2 ? 0 : 1 + Math.floor(r() * 7), zc = (zA + zB) / 2, lw = Math.min(4.2, w - 1.2);
      const uv = T.uv(T.R['insegna' + n]), xi = x - s * 0.08, y0 = 3.2, y1 = 3.8;
      C.scatola('colori', 0.1, 0.7, lw + 0.12, x - s * 0.04, 3.15, zc, 0x1c1c20);
      if (s < 0) C.quad('insegne', [xi, y0, zc + lw / 2], [xi, y0, zc - lw / 2], [xi, y1, zc - lw / 2], [xi, y1, zc + lw / 2], uv, 0xffffff);
      else C.quad('insegne', [xi, y0, zc - lw / 2], [xi, y0, zc + lw / 2], [xi, y1, zc + lw / 2], [xi, y1, zc - lw / 2], uv, 0xffffff);
      const bandiera = n === 4 ? 'farmacia' : n === 3 ? 'tabacchi' : null;
      if (bandiera) {
        const xb = x - s * 0.75, zb = zA - 0.9, u2 = T.uv(T.R[bandiera]);
        C.scatola('colori', 0.75, 0.05, 0.05, x - s * 0.37, 3.75, zb, 0x2b2d30);
        C.scatola('colori', 0.66, 0.66, 0.08, xb, 2.9, zb - 0.05, 0x111214);
        C.quad('insegne', [xb - 0.3, 2.93, zb], [xb + 0.3, 2.93, zb], [xb + 0.3, 3.53, zb], [xb - 0.3, 3.53, zb], u2, 0xffffff);
      }
    }
    if (opz.targa) {   // targa col nome della via, all'angolo
      const uv = T.uv(T.R.via), xt = x - s * 0.03, z0 = zA - 0.3, z1 = zA - 1.5;
      if (s < 0) C.quad('insegne', [xt, 3.1, z0], [xt, 3.1, z1], [xt, 3.35, z1], [xt, 3.35, z0], uv, 0xcfcfcf);
      else C.quad('insegne', [xt, 3.1, z1], [xt, 3.1, z0], [xt, 3.35, z0], [xt, 3.35, z1], uv, 0xcfcfcf);
    }
    return H;
  }

  // larghezze dei palazzi per riempire esattamente un intervallo
  function dividi(lung, r) {
    const pezzi = [];
    let resto = lung;
    while (resto > 11) { const p = 5 + r() * 6; pezzi.push(p); resto -= p; }
    if (resto < 4 && pezzi.length) pezzi[pezzi.length - 1] += resto; else pezzi.push(resto);
    return pezzi;
  }

  // ---------- Un tratto di strada lungo 24 m (z da 0 a -24) ----------
  // opz.partenza: il tratto dove comincia la scena iniziale. A destra c'è il palazzo della ragazza con il portone
  // (porta vera, che si apre), il marciapiede è sgombro e non ci sono auto in sosta dove passerà la bici.
  function tratto(seme, opz) {
    opz = opz || {};
    const r = PZ.ps1.casuale(seme), C = new PZ.Costruttore();
    // incrocio con una strada laterale (al massimo su un lato) e strisce pedonali
    let lat = null, strisce = null;
    if (r() < 0.38) { const zl = -8 - r() * 6; lat = { s: r() < 0.5 ? -1 : 1, z0: zl, z1: zl - 7 }; strisce = zl + 2.2; }
    else if (r() < 0.25) strisce = -6 - r() * 12;
    if (opz.partenza) { lat = null; strisce = null; }
    const sgombro = function (s) { return opz.partenza && s > 0; };
    const libero = function (z, margine) {      // niente sosta vicino a incroci e strisce
      if (lat && z < lat.z0 + margine && z > lat.z1 - margine) return false;
      if (strisce !== null && Math.abs(z - strisce) < 1.6 + margine) return false;
      return true;
    };

    // asfalto delle tre corsie e della sosta
    suolo(C, 'asfalto', -SOSTA, SOSTA, 0, -SL, 0, 0xffffff);
    // linee tratteggiate tra le corsie (3 m pieni, 3 m vuoti) e linee bianche continue ai bordi
    [-LC / 2, LC / 2].forEach(function (x) {
      for (let k = 0; k < 4; k++) {
        const z0 = -6 * k - 0.5, z1 = z0 - 3;
        if (strisce !== null && z1 < strisce + 1.4 && z0 > strisce - 1.4) continue;
        suolo(C, 'segni', x - 0.06, x + 0.06, z0, z1, 0.004, 0xe8e8e2);
      }
    });
    [-1, 1].forEach(function (s) {
      const x = s * BORDO;
      suolo(C, 'segni', x - 0.06, x + 0.06, 0, -SL, 0.004, 0xe8e8e2);
      // stalli blu (sosta a pagamento): linea lungo la corsia e separatori ogni 4,8 m
      for (let k = 0; k < 5; k++) {
        const z = -k * 4.8;
        if (!libero(z - 2.4, 1.2) || (lat && lat.s === s && z < lat.z0 + 1 && z > lat.z1 - 1)) continue;
        suolo(C, 'segni', s * (BORDO + 0.12), s * (BORDO + 0.22), z, z - 4.8, 0.004, 0x2a5fc4);
        suolo(C, 'segni', Math.min(s * (BORDO + 0.12), s * SOSTA), Math.max(s * (BORDO + 0.12), s * SOSTA), z + 0.05, z - 0.05, 0.004, 0x2a5fc4);
      }
    });
    // strisce pedonali (bande lunghe nel verso di marcia, come in Italia)
    if (strisce !== null) for (let x = -SOSTA + 0.3; x < SOSTA - 0.3; x += 1.0) suolo(C, 'segni', x, x + 0.5, strisce + 1.3, strisce - 1.3, 0.005, 0xeeeeea);
    // tombini
    for (let i = 0; i < 2; i++) { const x = (Math.floor(r() * 3) - 1) * LC + (r() - 0.5) * 0.6; C.cilindro('segni', 0.32, 0.01, 8, x, 0.0, -3 - r() * 18, 0x2a2b30); }

    [-1, 1].forEach(function (s) {
      const haLat = lat && lat.s === s;
      // cordolo e marciapiede (interrotti dove c'è la strada laterale)
      const intervalli = haLat ? [[0, lat.z0], [lat.z1, -SL]] : [[0, -SL]];
      intervalli.forEach(function (iv) {
        const zc = (iv[0] + iv[1]) / 2, lu = iv[0] - iv[1];
        C.scatola('colori', 0.15, 0.15, lu, s * (SOSTA + 0.075), 0, zc, 0xb8b4ad);
        const x0 = s < 0 ? -MURO : SOSTA + 0.15, x1 = s < 0 ? -(SOSTA + 0.15) : MURO;
        suolo(C, 'marciapiede', x0, x1, iv[0], iv[1], 0.15, 0xffffff);
      });
      if (haLat) {
        // strada laterale: asfalto, due marciapiedi stretti, palazzo in fondo che chiude la vista
        const xa = s * SOSTA, xb = s * (MURO + 21);
        suolo(C, 'asfalto', Math.min(xa, xb), Math.max(xa, xb), lat.z0 - 1.4, lat.z1 + 1.4, 0, 0xe0e0e0);
        suolo(C, 'marciapiede', Math.min(s * (SOSTA + 0.15), xb), Math.max(s * (SOSTA + 0.15), xb), lat.z0, lat.z0 - 1.4, 0.15, 0xffffff);
        suolo(C, 'marciapiede', Math.min(s * (SOSTA + 0.15), xb), Math.max(s * (SOSTA + 0.15), xb), lat.z1 + 1.4, lat.z1, 0.15, 0xffffff);
        C.scatola('colori', Math.abs(xb - xa), 0.15, 0.15, (xa + xb) / 2, 0, lat.z0 - 1.4, 0xb8b4ad);
        C.scatola('colori', Math.abs(xb - xa), 0.15, 0.15, (xa + xb) / 2, 0, lat.z1 + 1.4, 0xb8b4ad);
        const pal = Math.floor(r() * 8), xf = s * (MURO + 21);
        if (s < 0) facciataZ(C, -1, lat.z0 + 2, lat.z1 - 2, 0, 15.5, pal, 0, 0, xf);
        else facciataZ(C, 1, lat.z0 + 2, lat.z1 - 2, 0, 15.5, pal, 0, 0, xf);
      }
      // palazzi
      const tratti = haLat ? [[0, lat.z0, false], [lat.z1, -SL, true]] : [[0, -SL, false]];
      tratti.forEach(function (t) {
        let z = t[0];
        const pezzi = sgombro(s) ? [6, 9.5, 8.5] : dividi(t[0] - t[1], r);
        pezzi.forEach(function (w, i) {
          palazzo(C, s, z, z - w, r, { profondo: t[2] && i === 0, fiancoFacciata: t[2] && i === 0, targa: (haLat && i === 0 && r() < 0.8) || (sgombro(s) && i === 1),
            riga: sgombro(s) && i === 1 ? 0 : undefined, foro: sgombro(s) && i === 1 ? [PORTA_Z - 0.68, PORTA_Z + 0.68, 2.74] : null });
          z -= w;
        });
      });
      // lampione (uno per lato, sfalsati: uno ogni 12 m in tutto)
      lampione(C, s, s < 0 ? -6 : -18);
      // alberi, panchine, pensilina, edicola, cartelli
      const extra = sgombro(s) ? 1 : r(), conAlberi = !sgombro(s) && r() < 0.45;
      let ingombro = null;                                   // dove c'è già la pensilina o l'edicola
      if (extra < 0.18 && !haLat) { pensilina(C, s, -12); ingombro = [-9.5, -14.5]; }
      else if (extra < 0.3 && !haLat) { edicola(C, s, -11); ingombro = [-9, -13]; }
      else if (extra < 0.5) { const z = haLat ? lat.z1 - 4 : -12; if (z > -SL + 1.5) { panchina(C, s, z); ingombro = [z + 1.2, z - 1.2]; } }
      if (conAlberi) [s < 0 ? -2 : -6, s < 0 ? -10 : -14, -22].forEach(function (z) {
        if (haLat && z < lat.z0 + 1 && z > lat.z1 - 1) return;
        if (ingombro && z < ingombro[0] + 0.6 && z > ingombro[1] - 0.6) return;
        albero(C, s * (SOSTA + 1.0), z, r);
      });
      if (strisce !== null) cartello(C, s * (SOSTA + 0.3), strisce + 1.9, 'pedoni');
      else if (!sgombro(s) && r() < 0.35) cartello(C, s * (SOSTA + 0.3), -9 - r() * 6, ['zona30', 'sosta', 'parcheggio'][Math.floor(r() * 3)]);
      // auto parcheggiate negli stalli blu, oppure i cassonetti della differenziata
      let cassonettiMessi = false;
      for (let k = 0; k < 5; k++) {
        const zc = -2.4 - k * 4.8;
        if (!libero(zc, 2.6) || (haLat && zc < lat.z0 + 3 && zc > lat.z1 - 3)) continue;
        const q = sgombro(s) ? 1 : r();
        if (q < 0.5) {
          const tipi = ['utilitaria', 'utilitaria', 'berlina', 'station', 'furgone'], tipo = tipi[Math.floor(r() * tipi.length)];
          const col = PZ.auto.COLORI[Math.floor(r() * PZ.auto.COLORI.length)];
          PZ.auto.costruisci(C, tipo, col, s * (BORDO + 0.92), zc + (r() - 0.5) * 0.4, r() < 0.5 ? 0 : Math.PI, false);
        } else if (q < 0.6 && !cassonettiMessi) { cassonetti(C, s, zc, r); cassonettiMessi = true; }
      }
    });
    const g = C.crea(MAT);
    if (opz.partenza) { porta = creaPorta(); porta.gruppo.position.set(MURO, 0, PORTA_Z); g.add(porta.gruppo); }
    g.visible = false;
    scena.add(g);
    return g;
  }

  // ---------- Il portone del palazzo della ragazza (si apre e si richiude) ----------
  // (PORTA_Z: dove sta nel tratto di partenza; davanti la facciata ha un vano aperto, dietro c'è l'androne)
  // Gruppo centrato sul portone, sul piano della facciata (x = 0); la strada è verso -x.
  let porta = null;
  function creaPorta() {
    const g = new THREE.Group(), C = new PZ.Costruttore();
    C.scatola('colori', 0.16, 2.78, 0.24, -0.08, 0.15, 0.78, 0xb9ad98);                   // stipiti di pietra
    C.scatola('colori', 0.16, 2.78, 0.24, -0.08, 0.15, -0.78, 0xb9ad98);
    C.scatola('colori', 0.2, 0.32, 1.8, -0.1, 2.75, 0, 0xc4b8a2);                          // architrave
    C.scatola('colori', 0.55, 0.05, 1.75, -0.27, 0.15, 0, 0x9a948a);                       // gradino
    // androne: un corridoio buio profondo 1,8 m dietro il portone (pareti, soffitto, pavimento, fondo), così l'anta che
    // si apre verso l'interno si vede girare contro il buio
    const AD = 1.8;
    C.quad('colori', [AD, 0.16, -0.66], [AD, 0.16, 0.66], [AD, 2.74, 0.66], [AD, 2.74, -0.66], null, 0x0b0909);                    // fondo
    C.quad('colori', [0, 0.16, -0.66], [AD, 0.16, -0.66], [AD, 2.74, -0.66], [0, 2.74, -0.66], null, 0x161110);                    // parete (lato cerniera)
    C.quad('colori', [AD, 0.16, 0.66], [0, 0.16, 0.66], [0, 2.74, 0.66], [AD, 2.74, 0.66], null, 0x161110);                        // parete
    C.quad('colori', [0, 2.74, -0.66], [AD, 2.74, -0.66], [AD, 2.74, 0.66], [0, 2.74, 0.66], null, 0x0e0b0a);                      // soffitto
    C.quad('colori', [0, 0.16, 0.66], [AD, 0.16, 0.66], [AD, 0.16, -0.66], [0, 0.16, -0.66], null, 0x1c1714);                      // pavimento
    C.quad('luci', [AD - 0.006, 2.25, -0.3], [AD - 0.006, 2.25, 0.3], [AD - 0.006, 2.55, 0.3], [AD - 0.006, 2.55, -0.3], null, 0x7a5a28);   // lampadina delle scale
    C.scatola('colori', 0.03, 0.2, 0.32, -0.02, 3.12, 0, 0xe9e6dc);                        // numero civico
    g.add(C.crea(MAT));
    // anta con la cerniera dal lato di -z. Si apre VERSO L'INTERNO, come i portoni veri: prima si apriva verso la
    // strada e richiudendosi spazzava il marciapiede proprio dove il ragazzo si ferma, attraversandolo
    const cerniera = new THREE.Group(); cerniera.position.set(-0.035, 0.16, -0.66); g.add(cerniera);
    const Cp = new PZ.Costruttore();
    Cp.scatola('colori', 0.07, 2.56, 1.3, 0, 0, 0.65, 0x5a3622);                           // anta di legno
    [[0.3, 0.36], [0.3, 0.94], [1.4, 0.36], [1.4, 0.94]].forEach(function (q) { Cp.scatola('colori', 0.02, 0.95, 0.46, -0.04, q[0], q[1], 0x47291a); });
    Cp.scatola('colori', 0.05, 0.07, 0.14, -0.065, 1.12, 1.14, 0xc9a24a);                   // maniglia d'ottone
    cerniera.add(Cp.crea(MAT));
    const vm = new THREE.Vector3();
    return { gruppo: g, apri: function (k) { cerniera.rotation.y = 1.5 * k; },
      // la maniglia esterna, nel mondo (serve alla mano del ragazzo che tira il portone per chiuderlo)
      maniglia: function (out) { cerniera.updateMatrixWorld(true); return cerniera.localToWorld((out || vm).set(-0.17, 1.155, 1.14)); } };
  }

  // ---------- Cielo notturno: cupola sfumata, stelle e luna. Segue la camera; la nebbia ha il colore dell'orizzonte ----------
  const NEBBIA = 0x262d57;
  scena.fog = new THREE.Fog(NEBBIA, 34, 96);
  const cielo = new THREE.Group(), cieloParti = {};
  (function () {
    const g = new THREE.SphereGeometry(160, 16, 12), pos = g.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) col.push(0, 0, 0);
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    // colori del cielo dall'orizzonte (uguale alla nebbia) allo zenit: si possono cambiare durante la corsa
    const c = new THREE.Color(), cb = new THREE.Color(), cm = new THREE.Color(), ca = new THREE.Color();
    cieloParti.colora = function (basso, medio, alto) {
      cb.set(basso); cm.set(medio); ca.set(alto);
      const C = g.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        const el = pos.getY(i) / 160;
        if (el < 0.02) c.copy(cb); else if (el < 0.3) c.copy(cb).lerp(cm, (el - 0.02) / 0.28); else c.copy(cm).lerp(ca, Math.min(1, (el - 0.3) / 0.5));
        C.setXYZ(i, c.r, c.g, c.b);
      }
      C.needsUpdate = true;
    };
    cieloParti.colora(NEBBIA, 0x151a3c, 0x060818);
    const cupola = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    cupola.renderOrder = -10;
    cielo.add(cupola);
    const r = PZ.ps1.casuale(5), sp = [];
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2, el = 0.12 + r() * 1.3;
      sp.push(Math.cos(a) * Math.cos(el) * 150, Math.sin(el) * 150, Math.sin(a) * Math.cos(el) * 150);
    }
    const gs = new THREE.BufferGeometry(); gs.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stelle = new THREE.Points(gs, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.5, sizeAttenuation: false, fog: false, depthWrite: false }));
    stelle.renderOrder = -9;
    cielo.add(stelle);
    // la luna del videoclip Pezzidicarne (src/luna.js): all'inizio una luna normale; durante la corsa si gira piano e
    // mostra il volto, poi il ghigno si allarga fino alla forma finale (lo comanda atmosfera.js)
    const lunaV = PZ.lunaVolto(cielo, { offset: [4, 15.5, -118], raggio: 6, gialla: true });   // sotto lo specchietto, in fondo alla strada
    lunaV.posiziona(new THREE.Vector3());
    lunaV.luna.renderOrder = -8; lunaV.aloni.forEach(function (a) { a.renderOrder = -8; });
    lunaV.volto(0); lunaV.sorriso(0, 0);
    cieloParti.luna = lunaV; cieloParti.stelle = stelle;
  })();
  scena.add(cielo);

  // ---------- Luci: notte con un po' di luna (le luci calde vengono da finestre, lampioni e fari) ----------
  const luceEmi = new THREE.HemisphereLight(0x7480b8, 0x2a2633, 0.85), luceAmb = new THREE.AmbientLight(0x3a3a4a, 0.35);
  scena.add(luceEmi); scena.add(luceAmb);
  const lunaLuce = new THREE.DirectionalLight(0xb8c4ff, 0.4);
  lunaLuce.position.set(-0.5, 1, 0.4);
  scena.add(lunaLuce);

  // ---------- I tratti e il loro riciclo ----------
  const tutti = [];
  for (let i = 0; i < N_TRATTI; i++) tutti.push(tratto(1000 + i * 37));
  const partenza = tratto(7777, { partenza: true });
  const attivi = [];
  const scegli = PZ.ps1.casuale(99);
  function prendiLibero() {
    const liberi = tutti.filter(function (g) { return !g.visible; });
    return liberi[Math.floor(scegli() * liberi.length)];
  }
  // o.partenza: il tratto col portone va da z = -12 a z = +12 (porta a z = 2,6, bici a z = 0)
  function sistema(o) {
    attivi.forEach(function (g) { g.visible = false; });
    partenza.visible = false;
    attivi.length = 0;
    let z = 60;                                    // due tratti alle spalle (per lo specchietto e la scena iniziale)
    for (let i = 0; i < IN_SCENA; i++) {
      const g = (o && o.partenza && i === 2) ? partenza : prendiLibero();      // il terzo tratto copre da -12 a +12
      g.position.z = z; g.visible = true; attivi.push(g); z -= SL;
    }
    if (porta) porta.apri(0);
  }
  sistema();
  // dz: quanti metri la città si sposta verso la camera in questo fotogramma
  function aggiorna(dz, camera) {
    for (let i = 0; i < attivi.length; i++) attivi[i].position.z += dz;
    while (attivi[0].position.z - SL > 45) {
      const vecchio = attivi.shift(), nuovo = prendiLibero();
      vecchio.visible = false;
      nuovo.position.z = attivi[attivi.length - 1].position.z - SL; nuovo.visible = true;
      attivi.push(nuovo);
    }
    if (camera) cielo.position.copy(camera.position);
  }

  return { aggiorna: aggiorna, sistema: sistema, BORDO: BORDO, SOSTA: SOSTA, MURO: MURO, LC: LC, tratti: tutti, attivi: attivi, materiali: MAT,
    porta: porta, cielo: cieloParti, luci: { emi: luceEmi, amb: luceAmb, luna: lunaLuce }, NEBBIA: NEBBIA };
};
