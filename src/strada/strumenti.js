// Strumenti per le animazioni: curve morbide, tracce a chiavi e camminata procedurale.
// Tutto dipende solo dal tempo (in secondi), come la camera: a parità di secondo, stessa posa.
PZ.anim = (function () {
  function limita(v) { return Math.max(0, Math.min(1, v)); }
  // Passaggio morbido da 0 a 1 tra a e b: parte e arriva con velocità e accelerazione nulle
  function morbida(a, b, v) { const x = limita((v - a) / (b - a)); return x * x * x * (x * (x * 6 - 15) + 10); }
  function mix(a, b, k) { return a + (b - a) * k; }
  function copia(v) { return typeof v === 'number' ? v : v.clone(); }

  // Catmull-Rom tra p1 e p2 (numeri o vettori)
  function cr(p0, p1, p2, p3, f, out) {
    const f2 = f * f, f3 = f2 * f;
    const a = -0.5 * f3 + f2 - 0.5 * f, b = 1.5 * f3 - 2.5 * f2 + 1, c = -1.5 * f3 + 2 * f2 + 0.5 * f, d = 0.5 * f3 - 0.5 * f2;
    if (typeof p1 === 'number') return a * p0 + b * p1 + c * p2 + d * p3;
    return out.set(0, 0, 0).addScaledVector(p0, a).addScaledVector(p1, b).addScaledVector(p2, c).addScaledVector(p3, d);
  }

  // Traccia a chiavi: [tempo, valore]. Tra due chiavi il valore cambia con una curva morbida.
  // Un "gesto" (chiavi raggruppate con gesto()) attraversa i punti intermedi senza fermarsi.
  // t0 = istante della prima chiave (di solito l'inizio della fase); senza t0 il valore iniziale resta fermo
  // fino alla prima chiave.
  function Traccia(iniziale, t0) { this.k = [[t0 === undefined ? -Infinity : t0, copia(iniziale)]]; this.gesti = []; }
  Traccia.prototype.chiave = function (t, v, fermo) { this.k.push([t, copia(v), !!fermo]); this.pendenze = null; return this; };
  Traccia.prototype.gesto = function (t0, t1, valori) {
    this.gesti.push([t0, t1, valori.map(copia)]);
    return this.chiave(t0, valori[0], true).chiave(t1, valori[valori.length - 1], true);
  };
  // Movimento fluido: tra una chiave e l'altra il valore non si ferma più a ogni chiave, ma la attraversa con
  // continuità (curva cubica che non va mai oltre le chiavi: niente rimbalzi). Si ferma solo dove deve: quando
  // torna indietro, quando resta fermo (due chiavi uguali), all'inizio e alla fine e ai bordi dei gesti.
  Traccia.prototype.fluida = function () { this.liscia = true; this.pendenze = null; return this; };
  function comp(v, c) { return typeof v === 'number' ? v : (c === 0 ? v.x : c === 1 ? v.y : v.z); }
  Traccia.prototype.calcolaPendenze = function () {
    const k = this.k, n = k.length, nc = typeof k[0][1] === 'number' ? 1 : 3, m = [];
    for (let i = 0; i < n; i++) {
      m.push([0, 0, 0]);
      if (i === 0 || i === n - 1 || k[i][2] || k[i - 1][0] === -Infinity) continue;
      const h0 = k[i][0] - k[i - 1][0], h1 = k[i + 1][0] - k[i][0];
      if (h0 <= 1e-6 || h1 <= 1e-6) continue;
      for (let c = 0; c < nc; c++) {
        const d0 = (comp(k[i][1], c) - comp(k[i - 1][1], c)) / h0, d1 = (comp(k[i + 1][1], c) - comp(k[i][1], c)) / h1;
        if (d0 * d1 <= 0) continue;                       // inversione o sosta: lì si ferma
        const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;          // Fritsch-Butland: monotona, senza sbavature
        m[i][c] = (w1 + w2) / (w1 / d0 + w2 / d1);
      }
    }
    this.pendenze = m;
  };
  Traccia.prototype.ultimo = function () { return this.k[this.k.length - 1][1]; };
  Traccia.prototype.valore = function (t, out) {
    for (let g = 0; g < this.gesti.length; g++) {
      const G = this.gesti[g];
      if (t > G[0] && t < G[1]) {
        const v = G[2], u = morbida(G[0], G[1], t) * (v.length - 1);
        const i = Math.min(v.length - 2, Math.floor(u));
        return cr(v[Math.max(0, i - 1)], v[i], v[i + 1], v[Math.min(v.length - 1, i + 2)], u - i, out);
      }
    }
    const k = this.k;
    for (let i = k.length - 1; i >= 0; i--) {
      if (t >= k[i][0]) {
        if (i === k.length - 1) return typeof k[i][1] === 'number' ? k[i][1] : out.copy(k[i][1]);
        const a = k[i][1], b = k[i + 1][1];
        if (this.liscia && k[i][0] !== -Infinity) {
          if (!this.pendenze) this.calcolaPendenze();
          const h = k[i + 1][0] - k[i][0], m0 = this.pendenze[i], m1 = this.pendenze[i + 1];
          if (h <= 1e-6) return typeof b === 'number' ? b : out.copy(b);
          const s = limita((t - k[i][0]) / h), s2 = s * s, s3 = s2 * s;
          const H00 = 2 * s3 - 3 * s2 + 1, H10 = s3 - 2 * s2 + s, H01 = -2 * s3 + 3 * s2, H11 = s3 - s2;
          if (typeof a === 'number') return H00 * a + H10 * h * m0[0] + H01 * b + H11 * h * m1[0];
          return out.set(H00 * a.x + H10 * h * m0[0] + H01 * b.x + H11 * h * m1[0],
            H00 * a.y + H10 * h * m0[1] + H01 * b.y + H11 * h * m1[1],
            H00 * a.z + H10 * h * m0[2] + H01 * b.z + H11 * h * m1[2]);
        }
        const w = k[i][0] === -Infinity ? 0 : morbida(k[i][0], k[i + 1][0], t);
        return typeof a === 'number' ? mix(a, b, w) : out.copy(a).lerp(b, w);
      }
    }
    return 0;
  };

  // Sinistra di un personaggio con direzione "dir" (0 = guarda verso +z)
  function sinistra(dir, out) { return (out || new THREE.Vector3()).set(Math.cos(dir), 0, -Math.sin(dir)); }
  function avanti(dir, out) { return (out || new THREE.Vector3()).set(Math.sin(dir), 0, Math.cos(dir)); }
  // Angolo equivalente ad "a" ma il più vicino possibile a "rif" (evita giri inutili di 360°)
  function vicino(a, rif) { while (a - rif > Math.PI) a -= 2 * Math.PI; while (a - rif < -Math.PI) a += 2 * Math.PI; return a; }

  // Camminata in linea retta da "da" ad "a" (x, z), a piedi uniti all'inizio e alla fine.
  // Il numero di passi dipende dalla distanza; la durata dal numero di passi e dalla loro cadenza.
  function camminata(o) {
    const D = Math.hypot(o.a.x - o.da.x, o.a.z - o.da.z);
    const n = Math.max(1, Math.ceil(D / o.passo - 0.15));   // passi che fanno avanzare
    const m = n + 1;                                          // + l'ultimo, che riunisce i piedi
    const Ts = o.durataPasso, T = m * Ts, l = D / n;
    const V = D / (T - Ts);                                   // velocità del bacino a regime
    const ux = (o.a.x - o.da.x) / D, uz = (o.a.z - o.da.z) / D;
    const dirA = vicino(o.dirA, o.dirDa);
    const prima = o.primo === 'sx' ? 'sx' : 'dx';
    // Direzione del corpo: se c'è una direzione di marcia (dirVia), prima si gira verso dove va, poi verso dirA
    const via = o.dirVia === undefined ? null : vicino(o.dirVia, o.dirDa);
    const dirFine = via === null ? dirA : vicino(o.dirA, via);
    function dir(t) {
      if (via === null) return mix(o.dirDa, dirA, morbida(0, T, t));
      return t < T / 2 ? mix(o.dirDa, via, morbida(0, 0.45 * T, t)) : mix(via, dirFine, morbida(0.55 * T, T, t));
    }
    // Appoggi: piede, tempo in cui si posa, punto (lungo la linea + scarto laterale)
    const appoggi = { sx: [], dx: [] };
    const sx0 = sinistra(o.dirDa);
    if (o.piediDa) { // parte dai piedi dove sono davvero
      appoggi.sx.push([0, o.piediDa.sx.x, o.piediDa.sx.z]);
      appoggi.dx.push([0, o.piediDa.dx.x, o.piediDa.dx.z]);
    } else {
      appoggi.sx.push([0, o.da.x + sx0.x * o.larghezza, o.da.z + sx0.z * o.larghezza]);
      appoggi.dx.push([0, o.da.x - sx0.x * o.larghezza, o.da.z - sx0.z * o.larghezza]);
    }
    for (let j = 1; j <= m; j++) {
      const piede = (j % 2 === 1) === (prima === 'sx') ? 'sx' : 'dx';
      const d = Math.min(D, j * l), te = j * Ts;
      const s = sinistra(dir(te)), lato = piede === 'sx' ? 1 : -1;
      appoggi[piede].push([te, o.da.x + ux * d + s.x * lato * o.larghezza, o.da.z + uz * d + s.z * lato * o.larghezza]);
    }
    if (appoggi.sx[appoggi.sx.length - 1][0] < T) { const u = appoggi.sx[appoggi.sx.length - 1]; appoggi.sx.push([T, u[1], u[2]]); }
    if (appoggi.dx[appoggi.dx.length - 1][0] < T) { const u = appoggi.dx[appoggi.dx.length - 1]; appoggi.dx.push([T, u[1], u[2]]); }

    // Posizione di un piede al tempo t: fermo sull'appoggio, poi un arco basso fino al successivo
    function piede(nome, t, out) {
      const A = appoggi[nome];
      let i = 1;
      while (i < A.length - 1 && t > A[i][0]) i++;
      const p = A[i - 1], q = A[i], t0 = q[0] - Ts;
      if (q[1] === p[1] && q[2] === p[2]) { out.set(p[1], 0, p[2]); return 0; }
      const f = morbida(t0, q[0], t);
      out.set(mix(p[1], q[1], f), 0, mix(p[2], q[2], f));
      return t > t0 && t < q[0] ? Math.sin(Math.PI * (t - t0) / Ts) : 0; // 0 = appoggiato, 1 = alto
    }
    function percorsa(t) { // distanza del bacino: rampa a coseno all'inizio e alla fine
      t = Math.max(0, Math.min(T, t));
      const r = function (x) { return V / 2 * (x - Ts / Math.PI * Math.sin(Math.PI * x / Ts)); };
      if (t < Ts) return r(t);
      if (t > T - Ts) return D - r(T - t);
      return V * (t - Ts / 2);
    }
    return { durata: T, durataPasso: Ts, distanza: D, dir: dir, piede: piede, percorsa: percorsa, ux: ux, uz: uz, da: o.da, dirFine: dir(T) };
  }

  // Corsa breve lungo una curva che passa per i punti dati (Catmull-Rom): parte da fermo e arriva con velocità vFine,
  // senza fermarsi agli angoli. o.passi passi lunghi o.durataPasso secondi, alternando i piedi a partire da o.primo.
  // Ogni piede resta a terra meno di un passo (o.volo > 1), quindi c'è un breve volo come nella corsa vera; un piede
  // appoggiato resta fermo dove si è posato (niente scivolamenti). o.ultimo = dove si posa l'ultimo piede (facoltativo).
  function corsetta(o) {
    const Pn = o.punti, nP = Pn.length, N = 240, tab = [0], px = [], pz = [], tx = [], tz = [];
    function punto(u) {
      const i = Math.min(nP - 2, Math.floor(u)), f = u - i, p0 = Pn[Math.max(0, i - 1)], p1 = Pn[i], p2 = Pn[i + 1], p3 = Pn[Math.min(nP - 1, i + 2)];
      px.push(cr(p0.x, p1.x, p2.x, p3.x, f)); pz.push(cr(p0.z, p1.z, p2.z, p3.z, f));
    }
    for (let k = 0; k <= N; k++) { punto(k / N * (nP - 1)); if (k) tab.push(tab[k - 1] + Math.hypot(px[k] - px[k - 1], pz[k] - pz[k - 1])); }
    for (let k = 0; k <= N; k++) {      // tangenti nei punti della tabella (differenze centrali): la direzione cambia con continuità
      const a = Math.max(0, k - 1), b = Math.min(N, k + 1), dx = px[b] - px[a], dz = pz[b] - pz[a], l = Math.hypot(dx, dz) || 1;
      tx.push(dx / l); tz.push(dz / l);
    }
    const L = tab[N];
    // punto e direzione alla distanza s lungo la curva (oltre la fine prosegue dritto)
    function suCurva(s, out) {
      const oltre = Math.max(0, s - L);
      s = Math.max(0, Math.min(L, s));
      let lo = 0, hi = N;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] < s) lo = m; else hi = m; }
      const f = (s - tab[lo]) / Math.max(1e-9, tab[hi] - tab[lo]);
      out.tx = mix(tx[lo], tx[hi], f); out.tz = mix(tz[lo], tz[hi], f);
      const l = Math.hypot(out.tx, out.tz) || 1; out.tx /= l; out.tz /= l;
      out.x = mix(px[lo], px[hi], f) + out.tx * oltre; out.z = mix(pz[lo], pz[hi], f) + out.tz * oltre;
      return out;
    }
    const n = o.passi, Ts = o.durataPasso, T = n * Ts, vF = o.vFine || 0, kV = o.volo || 1.25, m1 = vF * T / L;
    // distanza fatta: da ferma, con una curva cubica, fino a vFine alla fine (dopo prosegue a vFine)
    function percorsa(t) {
      if (t >= T) return L + vF * (t - T);
      const u = limita(t / T), u2 = u * u, u3 = u2 * u;
      return L * ((-2 * u3 + 3 * u2) + (u3 - u2) * m1);
    }
    function velocita(t) { if (t >= T) return vF; const u = limita(t / T); return L / T * (-6 * u * u + 6 * u + (3 * u * u - 2 * u) * m1); }
    // appoggi: [tempo in cui si posa, x, z]; il piede si posa accanto alla curva, dove passerà il bacino a metà appoggio
    // ogni appoggio: [tempo, x, z, distanza lungo la curva, scarto laterale (+ = a sinistra), correzione x, correzione z]
    const c = {}, c2 = {};
    function appoggio(te, x, z, sl, lat) {
      if (sl === undefined) {        // punto qualsiasi: lo si proietta sulla curva
        let k0 = 0, bd = Infinity;
        for (let k = 0; k <= N; k++) { const d = (px[k] - x) * (px[k] - x) + (pz[k] - z) * (pz[k] - z); if (d < bd) { bd = d; k0 = k; } }
        sl = tab[k0]; lat = (x - px[k0]) * tz[k0] - (z - pz[k0]) * tx[k0];
      }
      suCurva(sl, c2);
      return [te, x, z, sl, lat, x - (c2.x + c2.tz * lat), z - (c2.z - c2.tx * lat)];
    }
    const appoggi = { sx: [appoggio(0, o.piediDa.sx.x, o.piediDa.sx.z)], dx: [appoggio(0, o.piediDa.dx.x, o.piediDa.dx.z)] };
    for (let j = 1; j <= n; j++) {
      const piede = (j % 2 === 1) === (o.primo === 'sx') ? 'sx' : 'dx', te = j * Ts;
      if (j === n && o.ultimo) { appoggi[piede].push(appoggio(te, o.ultimo.x, o.ultimo.z)); continue; }
      const sl = percorsa(Math.min(T, te + (2 - kV) / 2 * Ts));   // a metà appoggio
      suCurva(sl, c);
      const w = o.larghezza * (piede === 'sx' ? 1 : -1);      // a sinistra della direzione (tx, tz) c'è (tz, -tx)
      appoggi[piede].push(appoggio(te, c.x + c.tz * w, c.z - c.tx * w, sl, w));
    }
    // piede al tempo t: fermo sull'appoggio, poi un arco fino al successivo. Restituisce l'altezza dell'arco (0..1)
    function piede(nome, t, out) {
      const Ap = appoggi[nome];
      let i = 1;
      while (i < Ap.length - 1 && t > Ap[i][0]) i++;
      if (Ap.length < 2 || t >= Ap[i][0]) { const u = Ap[Ap.length < 2 ? 0 : i]; out.set(u[1], 0, u[2]); return 0; }
      const p = Ap[i - 1], q = Ap[i], t0 = Math.max(p[0], q[0] - kV * Ts);
      if (t <= t0) { out.set(p[1], 0, p[2]); return 0; }
      // in volo il piede va lungo la curva (accanto al bacino), non in linea retta: così non taglia gli angoli
      const f = (t - t0) / (q[0] - t0), g = morbida(0, 1, f), lat = mix(p[4], q[4], g);
      suCurva(mix(p[3], q[3], g), c2);
      out.set(c2.x + c2.tz * lat + mix(p[5], q[5], g), 0, c2.z - c2.tx * lat + mix(p[6], q[6], g));
      return Math.sin(Math.PI * f);
    }
    // bacino: sulla curva; il corpo guarda dove va (all'inizio si gira da dirDa in o.giro secondi)
    function bacino(t, out) { suCurva(percorsa(t), c); return out.set(c.x, 0, c.z); }
    function dir(t) {
      suCurva(percorsa(t) + 0.12, c);
      const d = vicino(Math.atan2(c.tx, c.tz), o.dirDa);
      return mix(o.dirDa, d, morbida(0, o.giro || 1.2 * Ts, t));
    }
    // su e giù del bacino: più basso a metà appoggio, più alto in volo (-1..1), solo mentre corre
    function molleggio(t) {
      const k = morbida(0, Ts, t) * (1 - morbida(T - Ts, T, t));
      return -Math.cos(2 * Math.PI * (t / Ts - (2 - kV) / 2)) * k;      // metà appoggio: (j + (2 - volo) / 2) passi
    }
    return { durata: T, durataPasso: Ts, lunghezza: L, piede: piede, bacino: bacino, dir: dir, percorsa: percorsa, velocita: velocita,
      molleggio: molleggio, suCurva: suCurva, appoggi: appoggi };
  }

  // Percorso nello spazio per punti e tempi: chiavi [tempo, punto, velocità]. Dove la velocità è data (per esempio
  // all'inizio, per continuare senza scatti un movimento già in corso) la curva parte proprio con quella; dove manca
  // la si ricava dai punti vicini (zero al primo e all'ultimo punto).
  function Percorso(chiavi) {
    const k = this.k = chiavi.map(function (c) { return [c[0], c[1].clone(), c[2] ? c[2].clone() : null]; });
    for (let i = 0; i < k.length; i++) {
      if (k[i][2]) continue;
      k[i][2] = (i === 0 || i === k.length - 1) ? new THREE.Vector3()
        : k[i + 1][1].clone().sub(k[i - 1][1]).multiplyScalar(1 / (k[i + 1][0] - k[i - 1][0]));
    }
  }
  Percorso.prototype.valore = function (t, out) {
    const k = this.k;
    if (t <= k[0][0]) return out.copy(k[0][1]);
    if (t >= k[k.length - 1][0]) return out.copy(k[k.length - 1][1]);
    let i = 0;
    while (t > k[i + 1][0]) i++;
    const h = k[i + 1][0] - k[i][0], s = (t - k[i][0]) / h, s2 = s * s, s3 = s2 * s;
    return out.set(0, 0, 0).addScaledVector(k[i][1], 2 * s3 - 3 * s2 + 1).addScaledVector(k[i][2], (s3 - 2 * s2 + s) * h)
      .addScaledVector(k[i + 1][1], -2 * s3 + 3 * s2).addScaledVector(k[i + 1][2], (s3 - s2) * h);
  };

  // (fase 47) CAMMINATA UMANA: l'altezza del bacino la decidono le gambe. Ogni anca (0,1 m di lato e 5 cm sotto il
  // bacino, come nel modello) deve arrivare alla caviglia con la gamba quasi tesa (tesa = frazione della gamba,
  // coscia 0,44 + gamba 0,42): il bacino sta all'altezza più bassa tra le due, quindi a piedi uniti la gamba è
  // dritta e quando i piedi sono lontani (passo lungo) il bacino scende un poco, come nella camminata vera (prima
  // il bacino era fisso e basso: ginocchia sempre piegate). Restituisce la quota del bacino.
  function quotaBacino(pos, piedi, dir, tesa) {
    const L = 0.86 * (tesa || 0.975), s = sinistra(dir);
    let y = Infinity;
    [['sx', 1], ['dx', -1]].forEach(function (c) {
      const f = piedi[c[0]], ax = pos.x + s.x * 0.1 * c[1], az = pos.z + s.z * 0.1 * c[1];
      const h2 = (f.x - ax) * (f.x - ax) + (f.z - az) * (f.z - az);
      y = Math.min(y, f.y + Math.sqrt(Math.max(0.25 * L * L, L * L - h2)) + 0.05);
    });
    return y;
  }
  return { quotaBacino: quotaBacino, limita: limita, morbida: morbida, mix: mix, Traccia: Traccia, sinistra: sinistra, avanti: avanti, vicino: vicino, camminata: camminata,
    corsetta: corsetta, Percorso: Percorso };
})();
