// Automobili low-poly di città: utilitaria, berlina, station wagon, furgone e taxi. Costruite con PZ.Costruttore:
// carrozzeria, abitacolo con i vetri, ruote, paraurti, targhe, fari e fanali. Davanti = +z, terra a y = 0.
// Le stesse forme servono sia per le auto parcheggiate (fari spenti) sia per quelle in arrivo (fari accesi).
PZ.auto = (function () {
  const TIPI = {
    //            lunghezza, larghezza, raggio ruota, cima carrozzeria, tetto, base abitacolo [dietro, davanti], tetto [dietro, davanti]
    utilitaria: { L: 3.6, W: 1.6, r: 0.29, corpo: 0.9, tetto: 1.5, cab: [-1.62, 0.5], tet: [-1.5, -0.3] },
    berlina: { L: 4.45, W: 1.7, r: 0.31, corpo: 0.86, tetto: 1.42, cab: [-1.3, 0.72], tet: [-0.9, -0.02] },
    station: { L: 4.3, W: 1.72, r: 0.32, corpo: 0.94, tetto: 1.58, cab: [-2.05, 0.62], tet: [-1.98, -0.12] },
    furgone: { L: 5.0, W: 1.76, r: 0.32, corpo: 1.05, tetto: 2.28, cab: [-2.5, 1.6], tet: [-2.5, 0.95], furgone: true },
    taxi: { L: 4.45, W: 1.7, r: 0.31, corpo: 0.86, tetto: 1.42, cab: [-1.3, 0.72], tet: [-0.9, -0.02], taxi: true }
  };
  // Colori realistici (pochi accesi: le auto vere sono soprattutto bianche, grigie e nere)
  const COLORI = [0xe8e8e4, 0xb9bec4, 0x6c7178, 0x2a2c31, 0x8e2a2a, 0x2c3f6b, 0x3f5a48, 0xc9b99a, 0x9a4a2c, 0xd6d0c2, 0x4d5c70];
  const VETRO = 0x1d2635, SCURO = 0x26272c, GOMMA = 0x141518, CERCHIO = 0x8a8e94;

  function costruisci(C, nome, colore, x, z, ry, accesa) {
    const T = TIPI[nome], L = T.L, W = T.W, hL = L / 2, hW = W / 2;
    const col = T.taxi ? 0xf2f2ee : colore;
    C.base(x, 0, z, ry || 0);
    const kLuci = accesa ? 'luci' : 'colori';
    // ---- carrozzeria bassa ----
    C.scatola('colori', W, T.corpo - 0.3, L, 0, 0.3, 0, col);
    C.scatola('colori', W + 0.04, 0.17, 0.12, 0, 0.26, hL - 0.04, SCURO);           // paraurti davanti
    C.scatola('colori', W + 0.04, 0.17, 0.12, 0, 0.26, -hL + 0.04, SCURO);          // paraurti dietro
    C.scatola('colori', 0.02, 0.07, L * 0.8, hW + 0.005, 0.5, 0, SCURO);            // modanature laterali
    C.scatola('colori', 0.02, 0.07, L * 0.8, -hW - 0.005, 0.5, 0, SCURO);
    // ---- davanti: calandra, fari, targa ----
    C.scatola('colori', W * 0.42, 0.14, 0.03, 0, 0.5, hL + 0.005, SCURO);
    C.scatola(kLuci, 0.3, 0.12, 0.03, hW - 0.26, 0.62, hL + 0.01, accesa ? 0xfff3d2 : 0xc4c8cc);
    C.scatola(kLuci, 0.3, 0.12, 0.03, -hW + 0.26, 0.62, hL + 0.01, accesa ? 0xfff3d2 : 0xc4c8cc);
    C.scatola('colori', 0.38, 0.1, 0.02, 0, 0.3, hL + 0.03, 0xf0f0ea);
    // ---- dietro: fanali e targa ----
    C.scatola('colori', 0.26, 0.14, 0.03, hW - 0.2, 0.68, -hL - 0.01, 0x7a1518);
    C.scatola('colori', 0.26, 0.14, 0.03, -hW + 0.2, 0.68, -hL - 0.01, 0x7a1518);
    C.scatola('colori', 0.38, 0.1, 0.02, 0, 0.42, -hL - 0.03, 0xf0f0ea);
    // ---- ruote ----
    [hL - 0.78, -hL + 0.78].forEach(function (zr) {
      [1, -1].forEach(function (s) {
        C.cilindro('colori', T.r, 0.2, 8, s * (hW - 0.06), T.r, zr, GOMMA, undefined, 0, Math.PI / 2);
        C.cilindro('colori', T.r * 0.5, 0.04, 6, s * (hW + 0.05), T.r, zr, CERCHIO, undefined, 0, Math.PI / 2);
      });
    });
    // ---- abitacolo: tronco di piramide con i vetri ----
    const yb = T.corpo, yt = T.tetto, wb = hW - 0.05, wt = hW - (T.furgone ? 0.07 : 0.17);
    const zr = T.cab[0], zf = T.cab[1], tr = T.tet[0], tf = T.tet[1];
    const latoVetro = T.furgone ? col : VETRO;
    C.quad('colori', [-wt, yt, tf], [wt, yt, tf], [wt, yt, tr], [-wt, yt, tr], null, col);                 // tetto
    C.quad('colori', [-wb, yb, zf], [wb, yb, zf], [wt, yt, tf], [-wt, yt, tf], null, VETRO);              // parabrezza
    C.quad('colori', [wb, yb, zr], [-wb, yb, zr], [-wt, yt, tr], [wt, yt, tr], null, T.furgone ? col : VETRO);   // lunotto
    C.quad('colori', [wb, yb, zf], [wb, yb, zr], [wt, yt, tr], [wt, yt, tf], null, latoVetro);            // fianchi
    C.quad('colori', [-wb, yb, zr], [-wb, yb, zf], [-wt, yt, tf], [-wt, yt, tr], null, latoVetro);
    if (T.furgone) {
      // furgone: finestrini solo in cabina e due oblò sulle porte posteriori
      [1, -1].forEach(function (s) {
        const x = s * (hW - 0.055 + 0.012);
        C.quad('colori', s > 0 ? [x, yb + 0.12, 1.42] : [x, yb + 0.12, 0.62], s > 0 ? [x, yb + 0.12, 0.62] : [x, yb + 0.12, 1.42],
          s > 0 ? [x, yt - 0.42, 0.62] : [x, yt - 0.42, 1.12], s > 0 ? [x, yt - 0.42, 1.12] : [x, yt - 0.42, 0.62], null, VETRO);
        C.scatola('colori', 0.012, 0.9, 0.02, s * (hW + 0.003), yb, -0.4, SCURO);   // porta scorrevole
      });
      C.scatola('colori', 0.5, 0.36, 0.02, 0.4, yb + 0.4, -hL - 0.005, VETRO);
      C.scatola('colori', 0.5, 0.36, 0.02, -0.4, yb + 0.4, -hL - 0.005, VETRO);
    } else {
      // montanti tra i finestrini laterali, del colore della carrozzeria
      const zm = (zr + zf) / 2 + 0.05, tm = (tr + tf) / 2 + 0.05;
      [1, -1].forEach(function (s) {
        C.quad('colori', s > 0 ? [s * (wb + 0.004), yb, zm + 0.06] : [s * (wb + 0.004), yb, zm - 0.06],
          s > 0 ? [s * (wb + 0.004), yb, zm - 0.06] : [s * (wb + 0.004), yb, zm + 0.06],
          s > 0 ? [s * (wt + 0.004), yt, tm - 0.05] : [s * (wt + 0.004), yt, tm + 0.05],
          s > 0 ? [s * (wt + 0.004), yt, tm + 0.05] : [s * (wt + 0.004), yt, tm - 0.05], null, col);
      });
      C.scatola('colori', 0.1, 0.07, 0.08, wb + 0.07, yb + 0.05, zf - 0.08, col);   // specchietti
      C.scatola('colori', 0.1, 0.07, 0.08, -wb - 0.07, yb + 0.05, zf - 0.08, col);
    }
    if (T.taxi) C.scatola(kLuci, 0.5, 0.15, 0.2, 0, yt, (tr + tf) / 2, accesa ? 0xfff8e0 : 0xe8e4d4);   // insegna TAXI
    C.base();
    return T;
  }

  const nomi = Object.keys(TIPI);
  return { TIPI: TIPI, COLORI: COLORI, nomi: nomi, costruisci: costruisci };
})();
