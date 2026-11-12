// Texture della città, disegnate a pixel su piccoli canvas (stile PS1): asfalto, marciapiede, facciate con finestre
// accese e persiane, negozi al piano terra, insegne e cartelli stradali, aloni di luce.
// Tutte le misure sono potenze di due, così si ripetono bene anche sui telefoni più vecchi.
PZ.textureCitta = function () {
  const rnd = PZ.ps1.casuale(2024);

  function canvas(w, h, disegna) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    disegna(g, w, h);
    return c;
  }
  function tex(c, ripeti) {
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    if (ripeti) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function hex(n) { return '#' + n.toString(16).padStart(6, '0'); }
  function px(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  // schiarisce/scurisce un colore (k > 1 più chiaro)
  function tono(n, k) {
    const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), gg = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
    return (r << 16) | (gg << 8) | b;
  }

  // ---------- Asfalto: grigio scuro con granelli ----------
  const asfalto = tex(canvas(32, 32, function (g, w, h) {
    g.fillStyle = '#323339'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) px(g, Math.floor(rnd() * w), Math.floor(rnd() * h), rnd() < 0.55 ? '#2d2e33' : (rnd() < 0.8 ? '#38393f' : '#414248'));
    g.fillStyle = '#2a2b30'; g.fillRect(3, 20, 7, 1); g.fillRect(9, 21, 4, 1);   // una crepa
  }), true);

  // ---------- Marciapiede: lastre di cemento chiaro con le fughe ----------
  const marciapiede = tex(canvas(32, 32, function (g, w, h) {
    g.fillStyle = '#8d8a88'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) px(g, Math.floor(rnd() * w), Math.floor(rnd() * h), rnd() < 0.5 ? '#83807e' : '#989592');
    g.fillStyle = '#6e6b6a'; g.fillRect(0, 0, w, 1); g.fillRect(0, 16, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(16, 0, 1, 16); g.fillRect(8, 16, 1, 16); g.fillRect(24, 16, 1, 16);
  }), true);

  // ---------- Facciate: un unico atlante 512 x 128 con 8 intonaci diversi, ognuno largo 64 pixel = 4 campate,
  // alto 128 = 8 piani (16 x 16 pixel per finestra). Una seconda texture contiene solo le finestre accese:
  // è "emissiva", cioè brilla anche al buio. Colori tipici di una città italiana.
  const PALETTE = [
    { base: 0xd2a35e, persiane: 0x3f5b38 },   // ocra, persiane verdi
    { base: 0xc0704f, persiane: 0x5a3a26 },   // terracotta, persiane marroni
    { base: 0xe2cf98, persiane: 0x3f5b38 },   // giallo paglia
    { base: 0xd99a83, persiane: 0x6b4a33 },   // rosa salmone
    { base: 0xe6dcc6, persiane: 0x46525c },   // crema, persiane grigie
    { base: 0x9fa9ae, persiane: 0x3a3f45 },   // grigio azzurro (palazzo più moderno)
    { base: 0xb9b08e, persiane: 0x4c5a3a },   // grigio verde
    { base: 0xcf8f5a, persiane: 0x3f5b38 }    // arancio
  ];
  const accese = [];
  const vetro = '#1a2130', vetroRiflesso = '#2c3850', acceso = ['#ffd27a', '#ffc35e', '#ffe2a6', '#f5b85a'];
  const atlanteF = canvas(512, 128, function (g) {
    PALETTE.forEach(function (P, i) {
      const r = PZ.ps1.casuale(100 + i * 17), X0 = i * 64;
      g.fillStyle = hex(P.base); g.fillRect(X0, 0, 64, 128);
      for (let k = 0; k < 500; k++) px(g, X0 + Math.floor(r() * 64), Math.floor(r() * 128), hex(tono(P.base, r() < 0.5 ? 0.92 : 1.06)));
      for (let f = 0; f < 8; f++) {
        const y0 = 128 - (f + 1) * 16;
        g.fillStyle = hex(tono(P.base, 0.82)); g.fillRect(X0, y0 + 15, 64, 1);           // marcapiano
        for (let b = 0; b < 4; b++) {
          const x0 = X0 + b * 16, s = r();
          g.fillStyle = hex(tono(P.base, 1.12)); g.fillRect(x0 + 4, y0 + 2, 8, 11);     // cornice chiara
          if (s < 0.24) {                                                                // finestra accesa
            const col = acceso[Math.floor(r() * acceso.length)];
            g.fillStyle = col; g.fillRect(x0 + 5, y0 + 3, 6, 9);
            g.fillStyle = hex(P.persiane); g.fillRect(x0 + 3, y0 + 3, 2, 9); g.fillRect(x0 + 11, y0 + 3, 2, 9);   // persiane aperte
            const tenda = r() < 0.5;
            if (tenda) { g.fillStyle = 'rgba(80,40,20,.35)'; g.fillRect(x0 + 5, y0 + 3, 6, 3); }
            accese.push([x0 + 5, y0 + 3, col, tenda]);
          } else if (s < 0.6) {                                                          // vetro buio
            g.fillStyle = vetro; g.fillRect(x0 + 5, y0 + 3, 6, 9);
            g.fillStyle = vetroRiflesso; g.fillRect(x0 + 5, y0 + 3, 2, 3);
            g.fillStyle = hex(P.persiane); g.fillRect(x0 + 3, y0 + 3, 2, 9); g.fillRect(x0 + 11, y0 + 3, 2, 9);
          } else {                                                                       // persiane chiuse
            g.fillStyle = hex(P.persiane); g.fillRect(x0 + 5, y0 + 3, 6, 9);
            g.fillStyle = hex(tono(P.persiane, 0.7)); for (let y = y0 + 4; y < y0 + 12; y += 2) g.fillRect(x0 + 5, y, 6, 1);
            g.fillRect(x0 + 8, y0 + 3, 1, 9);
          }
          g.fillStyle = hex(tono(P.base, 1.2)); g.fillRect(x0 + 4, y0 + 12, 8, 1);      // davanzale
        }
      }
    });
  });
  const atlanteFL = canvas(512, 128, function (g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 128);
    accese.forEach(function (a) { g.fillStyle = a[2]; g.fillRect(a[0], a[1], 6, 9); if (a[3]) { g.fillStyle = '#5a4020'; g.fillRect(a[0], a[1], 6, 3); } });
  });
  const facciate = { mappa: tex(atlanteF), luce: tex(atlanteFL), palette: PALETTE, n: PALETTE.length };

  // ---------- Piano terra (4 righe da 16 pixel, ognuna 64 pixel = 4 campate) ----------
  // 0 vetrine illuminate, 1 serrande abbassate, 2 bar con tenda a strisce, 3 portone e finestrelle con grata
  const negoziLuci = [];
  const negozi = canvas(64, 64, function (g) {
    const r = PZ.ps1.casuale(77);
    // riga 0: vetrine
    g.fillStyle = '#5b5148'; g.fillRect(0, 0, 64, 16);
    [[2, 'v'], [18, 'p'], [34, 'v'], [50, 'v']].forEach(function (a) {
      if (a[1] === 'v') { g.fillStyle = '#20232a'; g.fillRect(a[0], 4, 13, 12); g.fillStyle = '#f2e6c4'; g.fillRect(a[0] + 1, 5, 11, 10); negoziLuci.push([a[0] + 1, 5, 11, 10, '#f2e6c4']);
        g.fillStyle = '#c9b48c'; g.fillRect(a[0] + 2, 11, 3, 4); g.fillRect(a[0] + 7, 9, 3, 6); }
      else { g.fillStyle = '#2a2420'; g.fillRect(a[0] + 3, 5, 8, 11); g.fillStyle = '#e8d8b0'; g.fillRect(a[0] + 4, 6, 6, 4); negoziLuci.push([a[0] + 4, 6, 6, 4, '#e8d8b0']); }
    });
    g.fillStyle = '#2b2b30'; g.fillRect(0, 0, 64, 3);
    // riga 1: serrande
    g.fillStyle = '#6a6458'; g.fillRect(0, 16, 64, 16);
    [1, 17, 33, 49].forEach(function (x) {
      g.fillStyle = '#7d8086'; g.fillRect(x, 20, 14, 12);
      g.fillStyle = '#5f6268'; for (let y = 21; y < 32; y += 2) g.fillRect(x, y, 14, 1);
      if (r() < 0.6) { g.fillStyle = '#b9474a'; g.fillRect(x + 3, 24, 5, 2); g.fillStyle = '#4a7ab9'; g.fillRect(x + 7, 27, 4, 2); }   // scritte (graffiti)
    });
    g.fillStyle = '#2b2b30'; g.fillRect(0, 16, 64, 3);
    // riga 2: bar con vetrina e tenda a strisce
    g.fillStyle = '#4e4640'; g.fillRect(0, 32, 64, 16);
    for (let x = 0; x < 64; x += 4) { g.fillStyle = (x / 4) % 2 ? '#e9e2d4' : '#a8322e'; g.fillRect(x, 32, 4, 4); }
    g.fillStyle = '#20232a'; g.fillRect(2, 37, 40, 11); g.fillStyle = '#ffd99a'; g.fillRect(3, 38, 38, 10); negoziLuci.push([3, 38, 38, 10, '#ffd99a']);
    g.fillStyle = '#7a4a2a'; g.fillRect(6, 44, 30, 4);                      // bancone
    g.fillStyle = '#2a2420'; g.fillRect(46, 37, 10, 11); g.fillStyle = '#ffd99a'; g.fillRect(47, 38, 8, 5); negoziLuci.push([47, 38, 8, 5, '#ffd99a']);
    // riga 3: portone di legno ad arco e finestrelle con grata
    g.fillStyle = hex(0x8a7f70); g.fillRect(0, 48, 64, 16);
    g.fillStyle = '#4a2e1c'; g.fillRect(24, 52, 16, 12); g.fillRect(26, 51, 12, 1); g.fillStyle = '#3a2214'; g.fillRect(31, 52, 1, 12);
    g.fillStyle = '#c9a24a'; g.fillRect(29, 58, 1, 1); g.fillRect(34, 58, 1, 1);
    [6, 48].forEach(function (x) { g.fillStyle = '#1a2130'; g.fillRect(x, 53, 8, 6); g.fillStyle = '#2b2b30'; for (let i = 0; i < 8; i += 2) g.fillRect(x + i, 53, 1, 6); });
  });
  const negoziL = canvas(64, 64, function (g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
    negoziLuci.forEach(function (a) { g.fillStyle = a[4]; g.fillRect(a[0], a[1], a[2], a[3]); });
  });

  // ---------- Insegne e cartelli (atlante 128 x 64) ----------
  // Carattere a pixel 3 x 5 (M e N più larghe) per le scritte
  const FONT = {
    A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
    E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], H: ['101', '101', '111', '101', '101'],
    I: ['111', '010', '010', '010', '111'], L: ['100', '100', '100', '100', '111'], M: ['10001', '11011', '10101', '10001', '10001'],
    N: ['1001', '1101', '1011', '1001', '1001'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'],
    R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '111'], Z: ['111', '001', '010', '100', '111'], '0': ['111', '101', '101', '101', '111'],
    '3': ['111', '001', '011', '001', '111'], ' ': ['0', '0', '0', '0', '0']
  };
  function scrivi(g, testo, x, y, col) {
    let cx = x;
    g.fillStyle = col;
    for (const ch of testo) {
      const gl = FONT[ch] || FONT[' '];
      for (let r = 0; r < 5; r++) for (let c = 0; c < gl[r].length; c++) if (gl[r][c] === '1') g.fillRect(cx + c, y + r, 1, 1);
      cx += gl[0].length + 1;
    }
    return cx - x - 1;
  }
  function larghezza(testo) { let w = 0; for (const ch of testo) w += (FONT[ch] || FONT[' '])[0].length + 1; return w - 1; }
  const R = {};   // regioni dell'atlante in pixel: [x, y, w, h]
  const atl = canvas(128, 64, function (g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 64);
    function disco(cx, cy, r, col) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
    // Zona 30 (cerchio bianco con bordo rosso)
    disco(8, 8, 7.5, '#c8202a'); disco(8, 8, 5.5, '#f4f4f0'); scrivi(g, '30', 5, 6, '#111'); R.zona30 = [0, 0, 16, 16];
    // Divieto di sosta (azzurro con bordo e barra rossi)
    disco(24, 8, 7.5, '#c8202a'); disco(24, 8, 5.5, '#2459b8');
    g.strokeStyle = '#c8202a'; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 4); g.lineTo(28, 12); g.stroke(); R.sosta = [16, 0, 16, 16];
    // Attraversamento pedonale (quadrato blu, triangolo bianco)
    g.fillStyle = '#2459b8'; g.fillRect(33, 1, 14, 14); g.fillStyle = '#f4f4f0';
    g.beginPath(); g.moveTo(40, 3); g.lineTo(46, 13); g.lineTo(34, 13); g.fill();
    g.fillStyle = '#111'; g.fillRect(40, 6, 1, 1); g.fillRect(39, 7, 2, 3); g.fillRect(38, 10, 1, 2); g.fillRect(41, 10, 1, 2); R.pedoni = [32, 0, 16, 16];
    // Parcheggio (P bianca su blu)
    g.fillStyle = '#2459b8'; g.fillRect(49, 1, 14, 14); g.fillStyle = '#f4f4f0'; g.fillRect(53, 4, 2, 9); g.fillRect(55, 4, 3, 2); g.fillRect(55, 8, 3, 2); g.fillRect(57, 5, 2, 4); R.parcheggio = [48, 0, 16, 16];
    // Farmacia: croce verde luminosa
    g.fillStyle = '#0c1a10'; g.fillRect(64, 0, 16, 16); g.fillStyle = '#29d65a'; g.fillRect(70, 2, 4, 12); g.fillRect(66, 6, 12, 4);
    g.fillStyle = '#9dffb6'; g.fillRect(71, 3, 2, 10); g.fillRect(67, 7, 10, 2); R.farmacia = [64, 0, 16, 16];
    // Tabacchi: T bianca su fondo blu scuro
    g.fillStyle = '#16233f'; g.fillRect(80, 0, 16, 16); g.fillStyle = '#f4f4f0'; g.fillRect(83, 3, 10, 2); g.fillRect(87, 5, 2, 9); R.tabacchi = [80, 0, 16, 16];
    // Fermata autobus
    g.fillStyle = '#f4f4f0'; g.fillRect(96, 0, 32, 16); g.fillStyle = '#2459b8'; g.fillRect(97, 1, 30, 14);
    scrivi(g, 'BUS', 106, 6, '#f4f4f0'); R.bus = [96, 0, 32, 16];
    // Insegne dei negozi (64 x 8): scritte a pixel
    const insegne = [['BAR', '#a8322e', '#fff4e0'], ['PIZZERIA', '#20301c', '#ffe6a0'], ['ALIMENTARI', '#1d3f73', '#f4f4f0'],
      ['TABACCHI', '#16233f', '#f4f4f0'], ['FARMACIA', '#0c3a1a', '#9dffb6'], ['HOTEL', '#3a1c40', '#ffd9f2'], ['PANIFICIO', '#5a3a1c', '#ffe6c0'], ['LAVANDERIA', '#e9e2d4', '#2459b8']];
    insegne.forEach(function (s, i) {
      const x = (i % 2) * 64, y = 16 + Math.floor(i / 2) * 8;
      g.fillStyle = s[1]; g.fillRect(x, y, 64, 8);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, 64, 1);
      const w = larghezza(s[0]);
      scrivi(g, s[0], x + Math.floor((64 - w) / 2), y + 2, s[2]);
      R['insegna' + i] = [x, y, 64, 8];
    });
    // Cartello col nome della via, sui palazzi (lastra bianca)
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 48, 64, 12); g.fillStyle = '#9a968a'; g.fillRect(0, 59, 64, 1);
    scrivi(g, 'VIA DELL AMBRA', 4, 51, '#2a2a2a'); R.via = [0, 48, 64, 12];
    // Taxi
    g.fillStyle = '#f4f4f0'; g.fillRect(64, 48, 32, 8); scrivi(g, 'TAXI', 70, 49, '#111'); R.taxi = [64, 48, 32, 8];
  });
  // da regione in pixel a coordinate uv [u0, v0, u1, v1] (v cresce verso l'alto)
  function uv(r) { return [r[0] / 128, 1 - (r[1] + r[3]) / 64, (r[0] + r[2]) / 128, 1 - r[1] / 64]; }

  // ---------- Aloni: pozza di luce dei lampioni sull'asfalto e bagliore dei fari ----------
  const pozza = tex(canvas(32, 32, function (g) {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  }));
  const fari = tex(canvas(64, 16, function (g) {
    [16, 48].forEach(function (cx) {
      const gr = g.createRadialGradient(cx, 8, 0, cx, 8, 9);
      gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.3, 'rgba(255,240,200,0.75)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
      g.fillStyle = gr; g.fillRect(cx - 10, 0, 20, 16);
    });
  }));
  const alone = tex(canvas(16, 16, function (g) {
    const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.4, 'rgba(255,220,150,0.5)'); gr.addColorStop(1, 'rgba(255,210,140,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
  }));

  return {
    asfalto: asfalto, marciapiede: marciapiede, facciate: facciate,
    negozi: tex(negozi, true), negoziLuce: tex(negoziL, true),
    insegne: tex(atl), uv: uv, R: R, pozza: pozza, fari: fari, alone: alone, tono: tono
  };
};
