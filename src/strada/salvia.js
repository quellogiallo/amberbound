// LA FOGLIA GIALLA ("MARIA GIALLA" quando si attiva; il file si chiama ancora salvia.js): il potere più raro della
// corsa (una sola foglia per partita).
//
// QUANDO. A ogni partita si sceglie una soglia a caso tra il 42% e il 55% dell'obiettivo (con 100 frammenti: tra 42 e
// 55). Appena il ragazzo ha raccolto quei frammenti, la foglia nasce con la prossima fila di ostacoli. Se non viene
// presa, in quella partita non torna più. Numeri in config.js (strada.salvia).
//
// DOVE. Come l'orologio: in una corsia libera prima e dopo la fila, raggiungibile, dove nessuna auto le passerà sopra
// e non sopra una fila di frammenti; a mezz'aria, all'altezza della bici (si prende passandoci).
//
// IL VOLO (lo comanda corsa.js con aggiorna(dt VERO, ...): nessun altro effetto sul tempo lo può allungare).
//  - sale: in poco più di mezzo secondo la bici si alza a "altezza" metri, con un getto di fumo giallo;
//  - vola: il ragazzo pedala e cambia corsia come sempre; auto, transenne, sagome, la manata e il demone non lo
//    toccano; i frammenti salgono verso di lui (corsa.js passa la quota a frammenti.solleva);
//  - scende: finito il tempo, scende solo quando nella sua corsia non arriva niente per un po' (al massimo aspetta
//    "attesaMax" secondi in più); atterra morbido e solo allora le collisioni tornano (più un attimo di margine).
// IL FUMO: particelle (un solo disegno per tutte) che escono dalla ruota dietro, gialle e luminose da giovani, poi
// color ocra e quasi nere mentre si allargano e svaniscono; scendono e si allargano dietro di lui, e sfumano prima
// di arrivare alla telecamera (non coprono mai il ragazzo). In più scintille gialle che restano nell'aria.
PZ.creaSalvia = function (scena, V0) {
  const CFG = PZ.CONFIG.strada, O = CFG.salvia || {}, LC = CFG.larghezzaCorsia, LONTANO = CFG.distanzaComparsa;
  const VA = CFG.difficolta.velocitaAuto, VC = V0 + VA, PRIMA = (LONTANO / V0) * (VA / VC) + 0.7;
  const rnd = PZ.ps1.casuale(11 + Math.floor(Math.random() * 1e9));
  const ALT = O.altezza || 2.5, SALITA = O.salita || 0.55, DISCESA = O.discesa || 0.9, DURATA = O.durata || [9, 10];   // durata: [min, max] secondi, a caso a ogni volo

  // ---------- La foglia: sette punte seghettate che partono da un punto, gialla con il bordo scuro e le nervature ----------
  // Disegnata a pixel (64x64, senza sfumature: come un oggetto di Minecraft) e "estrusa": più copie una dietro l'altra
  // danno spessore, così anche girandosi di taglio non sparisce.
  const texF = (function () {
    const N = 64, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    g.clearRect(0, 0, N, N);
    const BX = 32, BY = 50;                       // il punto da cui partono le punte
    // [angolo dalla verticale (gradi), lunghezza, larghezza] delle sette punte
    const punte = [[0, 47, 4.3], [-32, 41, 3.9], [32, 41, 3.9], [-64, 32, 3.3], [64, 32, 3.3], [-100, 19, 2.5], [100, 19, 2.5]];
    function punta(an, L, W, m) {                 // una punta seghettata (m = quanto più larga: per il bordo scuro)
      const a = an * Math.PI / 180, ux = Math.sin(a), uy = -Math.cos(a), vx = -uy, vy = ux;
      const lato = [];
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const t = i / n, larg = (W + m) * Math.sin(Math.PI * Math.pow(t, 0.8)) * (i % 2 ? 1.3 : 0.7);   // dentini
        lato.push([t * (L + m), larg]);
      }
      g.beginPath(); g.moveTo(BX, BY);
      lato.forEach(function (q) { g.lineTo(BX + ux * q[0] + vx * q[1], BY + uy * q[0] + vy * q[1]); });
      for (let i = lato.length - 1; i >= 0; i--) { const q = lato[i]; g.lineTo(BX + ux * q[0] - vx * q[1], BY + uy * q[0] - vy * q[1]); }
      g.closePath(); g.fill();
    }
    g.fillStyle = '#1a1200';                      // bordo scuro
    punte.forEach(function (q) { punta(q[0], q[1], q[2], 2.6); });
    g.fillRect(BX - 2.6, BY - 2, 5.2, 14);         // gambo (bordo)
    g.fillStyle = '#e8b80e';                      // giallo
    punte.forEach(function (q) { punta(q[0], q[1], q[2], 0); });
    g.fillRect(BX - 1, BY - 1, 2, 12);
    g.fillStyle = '#ffe54a';                      // la parte chiara al centro di ogni punta
    punte.forEach(function (q) { punta(q[0], q[1] * 0.9, q[2] * 0.45, 0); });
    g.strokeStyle = '#6a4a00'; g.lineWidth = 1;    // nervature
    punte.forEach(function (q) {
      const a = q[0] * Math.PI / 180;
      g.beginPath(); g.moveTo(BX, BY); g.lineTo(BX + Math.sin(a) * q[1] * 0.92, BY - Math.cos(a) * q[1] * 0.92); g.stroke();
    });
    // niente mezze trasparenze: pixel pieni o vuoti
    const d = g.getImageData(0, 0, N, N);
    for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 100 ? 255 : 0;
    g.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t;
  })();
  const gruppo = new THREE.Group(); gruppo.visible = false; scena.add(gruppo);
  const corpo = new THREE.Group(); gruppo.add(corpo);
  const geoF = new THREE.PlaneGeometry(1.1, 1.1);
  const matF = new THREE.MeshLambertMaterial({ map: texF, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x8a6a10 });
  const matDentro = new THREE.MeshLambertMaterial({ map: texF, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x8a6608, emissive: 0x3a2a00 });   // i bordi dello spessore, più scuri
  for (let k = 0; k < 5; k++) {
    const m = new THREE.Mesh(geoF, k === 0 || k === 4 ? matF : matDentro);
    m.position.set(0, 0.05, (k - 2) * 0.014); corpo.add(m);
  }
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.ps1.alone(255, 215, 40, 5), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: 0.6 }));
  alone.scale.set(2.6, 2.6, 1); gruppo.add(alone);
  const GRANDE = 1.3, Y = 1.05;

  // ---------- Il fumo e le scintille: un sistema di particelle (posizione, grandezza, trasparenza, età) ----------
  const NF = 340, NS = 90;
  function nuvola(N, additivo) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), dim = new Float32Array(N), alfa = new Float32Array(N), eta = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('dim', new THREE.BufferAttribute(dim, 1));
    geo.setAttribute('alfa', new THREE.BufferAttribute(alfa, 1));
    geo.setAttribute('eta', new THREE.BufferAttribute(eta, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uAlt: { value: 640 }, uMappa: { value: PZ.ps1.alone(255, 255, 255, additivo ? 4 : 7) } },
      vertexShader: 'attribute float dim; attribute float alfa; attribute float eta; uniform float uAlt; varying float vA; varying float vE;\n' +
        'void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;\n' +
        '  gl_PointSize = dim * uAlt * 0.5 * projectionMatrix[1][1] / max(0.1, -mv.z); vA = alfa; vE = eta; }',
      fragmentShader: 'uniform sampler2D uMappa; varying float vA; varying float vE;\n' +
        'void main() { vec2 pc = gl_PointCoord - 0.5; float a = texture2D(uMappa, gl_PointCoord).a * vA;\n' +
        // bordo sfrangiato: il fumo non è un cerchio perfetto
        '  a *= 0.75 + 0.25 * sin(atan(pc.y, pc.x) * 5.0 + vE * 9.0 + vA * 40.0); if (a < 0.01) discard;\n' +
        (additivo ? '  vec3 c = mix(vec3(1.0, 0.92, 0.45), vec3(1.0, 0.62, 0.05), vE);\n'
          // fumo: giallo acceso da giovane, poi ocra, poi quasi nero (il tempo che brucia)
          : '  vec3 c = mix(vec3(1.0, 0.88, 0.2), vec3(0.7, 0.48, 0.05), smoothstep(0.0, 0.3, vE));\n  c = mix(c, vec3(0.05, 0.035, 0.01), smoothstep(0.3, 0.85, vE));\n') +
        '  gl_FragColor = vec4(c, a); }',
      transparent: true, depthWrite: false, blending: additivo ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 3; scena.add(pts);
    const p = []; for (let i = 0; i < N; i++) p.push({ vivo: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, vita: 1, d0: 0, d1: 0, a0: 0 });
    return { geo: geo, mat: mat, pts: pts, pos: pos, dim: dim, alfa: alfa, eta: eta, p: p, i: 0, N: N };
  }
  const fumo = nuvola(NF, false), scintille = nuvola(NS, true);
  // l'ombra sulla strada: dice quanto è alto
  const ombra = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
  ombra.visible = false; scena.add(ombra);
  // e la luce gialla del fumo sull'asfalto, sotto la bici
  const pozza = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: PZ.ps1.alone(255, 200, 30, 6),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pozza.visible = false; scena.add(pozza);

  function emetti(n, x, y, z, vMondo, forte) {
    const N = n.N;
    const q = n.p[n.i]; n.i = (n.i + 1) % N;
    q.vivo = true; q.t = 0;
    if (n === fumo) {
      q.vita = 0.9 + 0.8 * rnd();
      q.x = x + (rnd() - 0.5) * 0.3; q.y = y + (rnd() - 0.5) * 0.25; q.z = z + rnd() * 0.2;
      // scende sotto la bici e si allarga ai lati: così resta sotto la linea tra la telecamera e il ragazzo
      q.vx = (rnd() - 0.5) * 2.4; q.vy = -0.7 - 1.3 * rnd() + (forte ? 1.2 * (rnd() - 0.5) : 0);
      q.vz = vMondo * (0.12 + 0.1 * rnd()) + 0.6 + 1.2 * rnd();     // resta indietro, molto più piano del mondo: una scia
      q.d0 = 0.3 + 0.5 * rnd() + (forte ? 0.3 : 0); q.d1 = q.d0 * (2.0 + 1.6 * rnd());
      q.a0 = 0.2 + 0.25 * rnd();
    } else {
      q.vita = 0.9 + 0.9 * rnd();
      q.x = x + (rnd() - 0.5) * 0.4; q.y = y + (rnd() - 0.5) * 0.3; q.z = z;
      q.vx = (rnd() - 0.5) * 2.6; q.vy = (rnd() - 0.55) * 1.6; q.vz = vMondo * (0.1 + 0.15 * rnd()) + rnd();
      q.d0 = 0.07 + 0.08 * rnd(); q.d1 = 0.02; q.a0 = 0.8 + 0.2 * rnd();
    }
  }
  function muovi(n, dt, avanza) {
    let vivi = 0;
    for (let i = 0; i < n.N; i++) {
      const q = n.p[i];
      if (q.vivo) { q.t += dt; if (q.t >= q.vita) q.vivo = false; }
      if (!q.vivo) { n.alfa[i] = 0; n.dim[i] = 0; continue; }
      vivi++;
      const u = q.t / q.vita;
      const frena = Math.exp(-dt * (n === fumo ? 1.4 : 0.6));
      q.vx *= frena; q.vy *= frena;
      q.x += q.vx * dt; q.y = Math.max(0.1, q.y + q.vy * dt); q.z += q.vz * dt;
      // ondeggia piano, come fumo vero
      q.x += 0.25 * Math.sin(q.t * 3 + i) * dt;
      n.pos[i * 3] = q.x; n.pos[i * 3 + 1] = q.y; n.pos[i * 3 + 2] = q.z;
      n.dim[i] = q.d0 + (q.d1 - q.d0) * Math.sqrt(u);
      // nasce in fretta, svanisce piano; e sfuma prima di arrivare alla telecamera (z > 2: verso lo spettatore)
      const vicinoCam = 1 - Math.max(0, Math.min(1, (q.z - 2.6) / 1.8));
      n.alfa[i] = q.a0 * Math.min(1, u * 8) * (1 - u) * (1 - u * 0.3) * vicinoCam;
      n.eta[i] = u;
    }
    n.pts.visible = vivi > 0;
    if (vivi > 0 || n.vivi) {
      n.geo.attributes.position.needsUpdate = true; n.geo.attributes.dim.needsUpdate = true;
      n.geo.attributes.alfa.needsUpdate = true; n.geo.attributes.eta.needsUpdate = true;
    }
    n.vivi = vivi;
  }

  // ---------- Stato ----------
  const st = { soglie: [], soglia: 999, nata: false, inStrada: null, presa: -1, t: 0, volo: null, h: 0, pend: 0, grazia: 0, accumulo: 0, accS: 0, attesaRighe: 0, nate: 0 };
  // QUANTE E QUANDO: da 2 a 4 foglie a caso (probabilità in O.quante). La prima tra il 42% e il 55% dell'obiettivo;
  // le altre a caso tra O.altre[0] e O.altre[1] (mai nei primi 30 frammenti), distanti almeno O.distanza frammenti
  // da tutte le altre. Ogni soglia vale una foglia: se non la prendi, quella non torna.
  function scegliSoglie() {
    const N = PZ.raccolta.passo(), q = O.quando || [0.42, 0.55], alt = O.altre || [0.3, 0.92], dmin = O.distanza || 12;
    const pq = O.quante || [0, 0.4, 0.4, 0.2];
    let u = rnd(), quante = 2; for (let i = 0; i < pq.length; i++) { if (u < pq[i]) { quante = i + 1; break; } u -= pq[i]; }
    if (!PZ.raccolta.arcade) quante = Math.min(quante, 3);      // (fase 18) nella storia al massimo 3 (nell'arcade restano 2-4)
    const out = [Math.round(N * (q[0] + rnd() * (q[1] - q[0])))];
    for (let tent = 0; out.length < quante && tent < 200; tent++) {
      const n = Math.round(N * (alt[0] + rnd() * (alt[1] - alt[0])));
      if (out.every(function (m) { return Math.abs(m - n) >= dmin; })) out.push(n);
    }
    return out.sort(function (a, b) { return a - b; });
  }
  // (fase 16) arcade: a ogni giro di 100 frammenti nuove soglie (2-4 foglie per giro), senza toccare una foglia in
  // strada o un volo in corso
  function nuovoGiro() { st.soglie = scegliSoglie(); st.soglia = st.soglie[0]; st.nate = 0; st.attesaRighe = 0; }
  function reset() {
    st.soglie = scegliSoglie(); st.soglia = st.soglie[0]; st.nate = 0; st.attesaRighe = 0;
    st.nata = false; st.inStrada = null; st.presa = -1; st.volo = null; st.h = 0; st.pend = 0; st.grazia = 0; st.accumulo = 0; st.accS = 0; st.boost = 0; st.colpoBasso = false;
    gruppo.visible = false; ombra.visible = false; pozza.visible = false;
    [fumo, scintille].forEach(function (n) { n.p.forEach(function (q) { q.vivo = false; }); muovi(n, 0, 0); n.pts.visible = false; });
  }
  // per ogni nuova fila (come l'orologio): raggiunta la prossima soglia di frammenti, la foglia nasce in un punto
  // RISCHIOSO ma sempre raggiungibile (r.R = corsie in cui il giocatore può davvero trovarsi a quella fila):
  //  - SALTO: in alto sopra una transenna (o una ragazza a terra) della fila: si prende solo saltando al momento giusto;
  //  - ACCANTO: nella corsia libera proprio accanto a un'auto, a una ragazza o alla mano, all'altezza dell'ostacolo,
  //    e solo se nella fila prima quella corsia era chiusa (bisogna spostarsi all'ultimo).
  // Mai dove arriva un'auto nella stessa corsia, mai sopra dei frammenti. Nessun ripiego facile: se la fila non offre
  // un punto così, si aspetta la prossima.
  function suRiga(r, p, autoInCorsia, frammenti) {
    if (O.attiva === false || st.inStrada || st.volo || !p || PZ.raccolta.completata) return;
    if (!st.soglie.length || PZ.raccolta.conteggio < st.soglie[0]) return;
    st.attesaRighe++;
    const occupataFr = function (l, tau) { return frammenti && frammenti.slot.some(function (s) { return s.attivo && s.corsia === l && Math.abs(s.tau - tau) < 0.5; }); };
    const sicura = function (l, da, a) { return !autoInCorsia || !autoInCorsia(l, da - PRIMA, a + 0.3); };
    const scelte = [];
    [0, 1, 2].forEach(function (l) {
      if (!r.R[l] || occupataFr(l, r.tau)) return;
      if (r.corsie[l] === 'T' && sicura(l, r.tau - 0.3, r.tau + 0.3)) scelte.push({ l: l, tau: r.tau, y: O.altoSalto || 2.15, tipo: 'salto', peso: 1 });
      // (solo se nella fila prima quella corsia era chiusa: bisogna entrarci all'ultimo, tra un ostacolo e l'altro)
      if (r.corsie[l] === 'L' && p.corsie[l] !== 'L' && sicura(l, r.tau - 0.5, r.tau + 0.3) &&
          [l - 1, l + 1].some(function (j) { return j >= 0 && j <= 2 && /[ASM]/.test(r.corsie[j]); }))
        scelte.push({ l: l, tau: r.tau, y: Y, tipo: 'accanto', peso: 1 });
    });
    if (!scelte.length) return;
    let tot = 0; scelte.forEach(function (c) { tot += c.peso; });
    let u = rnd() * tot, c = scelte[0];
    for (let i = 0; i < scelte.length; i++) { u -= scelte[i].peso; if (u <= 0) { c = scelte[i]; break; } }
    st.inStrada = { tau: c.tau, corsia: c.l, x: (c.l - 1) * LC, y: c.y, tipo: c.tipo };
    st.soglie.shift(); st.soglia = st.soglie.length ? st.soglie[0] : 999; st.nate++; st.attesaRighe = 0;
    st.nata = !st.soglie.length; st.presa = -1;
    gruppo.visible = true;
  }
  // la foglia in strada (dt e tau del mondo)
  function aggiornaFoglia(dt, tau) {
    st.t += dt;
    const o = st.inStrada;
    if (!o) { gruppo.visible = false; return; }
    const z = -V0 * (o.tau - tau);
    if (st.presa < 0 && z > 8) { st.inStrada = null; gruppo.visible = false; return; }     // non presa: non torna più
    let s = Math.max(0, Math.min(1, (z + LONTANO) / 14)), y = o.y + 0.16 + 0.16 * Math.sin(st.t * 2.4);
    if (st.presa >= 0) {                     // presa: sale vorticando, si accartoccia e brucia in un lampo giallo
      st.presa += dt;
      const u = Math.min(1, st.presa / 0.4);
      y += 1.0 * u; s = (1 - u) * (1 + 0.5 * Math.sin(Math.PI * u));
      corpo.scale.setScalar(s * GRANDE);
      alone.material.opacity = 0.6 * (1 - u); alone.scale.setScalar(2.6 + 2 * u);
      if (u >= 1) { st.inStrada = null; gruppo.visible = false; return; }
    } else { corpo.scale.setScalar(s * GRANDE); alone.scale.set(3.2 * s, 3.2 * s, 1); alone.material.opacity = 0.55 + 0.2 * Math.sin(st.t * 3.2); }
    gruppo.position.set(o.x, y, z);
    // galleggia come un oggetto lasciato a terra in Minecraft: gira su sé stessa a velocità costante e sale e scende piano
    corpo.rotation.set(0, st.t * 1.9 + (st.presa >= 0 ? 12 * st.presa : 0), 0);
  }
  // si prende passandoci attraverso (a terra o in un salto basso). Vero se è stata presa adesso
  function raccogli(xBici, h, tau, tauPrima) {
    const o = st.inStrada;
    if (!o || st.presa >= 0 || st.volo) return false;
    const z = -V0 * (o.tau - tau), zp = -V0 * (o.tau - tauPrima);
    if (Math.max(z, zp) < -0.75 || Math.min(z, zp) > 0.75) return false;
    if (Math.abs(o.x - xBici) > 0.7) return false;
    // all'altezza giusta: a terra si prende passando (non saltandoci sopra); quella sopra la transenna solo in salto
    const y = o.y + 0.16;
    if (y < h + 0.25 || y > h + 1.85) return false;
    st.presa = 0;
    return true;
  }

  // ---------- Il volo (tempo VERO) ----------
  function attiva(h0) {   // h0: quota da cui parte (se la prende saltando, sale da lì senza ricadere)
    const D = Array.isArray(DURATA) ? DURATA[0] + rnd() * (DURATA[1] - DURATA[0]) : DURATA;
    st.volo = { t: 0, fase: 'sale', tDisc: 0, attesa: 0, hDisc: ALT, D: D, h0: Math.max(0, h0 || 0), basso: false, nb: -1 }; st.accumulo = 0; st.forzata = false; st.boost = 0; st.colpoBasso = false; }
  function liscia(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  // dt: secondi VERI. puoScendere(): true se, scendendo adesso, nella corsia non arriva niente durante l'atterraggio.
  // x: posizione laterale della bici; vMondo: metri al secondo con cui scorre la strada. Restituisce la quota (m).
  function aggiorna(dt, puoScendere, x, vMondo) {
    const v = st.volo;
    if (v) {
      v.t += dt;
      if (v.fase === 'sale') {
        st.h = v.h0 + (ALT - v.h0) * liscia(v.t / SALITA); st.pend = 0.16 * Math.sin(Math.PI * Math.min(1, v.t / SALITA));
        if (v.t >= SALITA) v.fase = 'vola';
      }
      if (v.fase === 'vola') {
        st.h = ALT + 0.09 * Math.sin((v.t - SALITA) * 2.3); st.pend = 0.03 * Math.sin((v.t - SALITA) * 1.7);
        if (v.t >= v.D - DISCESA) {
          v.attesa = v.t - (v.D - DISCESA);
          const ok = puoScendere();
          if (ok || v.attesa >= (O.attesaMax || 2.5)) { v.fase = 'scende'; v.tDisc = 0; v.hDisc = st.h; st.forzata = !ok; st.attesa = v.attesa; }
          // (scende comunque perché la corsia non si è mai liberata: dopo l'atterraggio un margine più lungo, così non
          //  viene colpito da ciò che gli era già sotto)
        }
      } else if (v.fase === 'scende') {
        v.tDisc += dt;
        const u = Math.min(1, v.tDisc / DISCESA);
        st.h = v.hDisc * (1 - liscia(u)); st.pend = -0.08 * Math.sin(Math.PI * u);
        if (u >= 1) { st.volo = null; st.h = 0; st.pend = 0; st.grazia = st.forzata ? (O.graziaForzata || 1.2) : (O.grazia || 0.3); if (PZ.audio.atterraggio) PZ.audio.atterraggio(); if (PZ.audio.salviaFine) PZ.audio.salviaFine(); }
      }
    } else if (st.grazia > 0) st.grazia -= dt;
    // (fase 35) IL BASSO della colonna principale: dopo almeno O.basso secondi di volo (2 s), sul primo colpo di basso
    // (il primo tempo di una battuta: nella colonna il basso attacca su ogni battuta, ogni 3,2 s) la bici ha un secondo
    // boost: accelera ancora (corsa.js legge boost()), esplode una vampata di fumo e il fumo resta molto più fitto
    // finché non scende. Senza musica (o in pausa) il boost arriva a O.basso + 1 secondi.
    if (v && !v.basso && v.fase !== 'scende') {
      const col = PZ.audio.colonna, nb = col && col.attiva() && col.battiti ? col.battiti() : -1;
      const sulBasso = nb >= 0 && v.nb >= 0 && Math.floor(nb / 4) > Math.floor(v.nb / 4);
      v.nb = nb;
      if (v.t >= (O.basso || 2) && (sulBasso || (nb < 0 && v.t >= (O.basso || 2) + 1))) {
        v.basso = true; st.colpoBasso = true;
        for (let i = 0; i < 70; i++) emetti(fumo, x, st.h + 0.4, 0.62, vMondo, true);
        for (let i = 0; i < 30; i++) emetti(scintille, x, st.h + 0.5, 0.62, vMondo, false);
      }
    }
    const meta = v && v.basso && v.fase !== 'scende' ? 1 : 0;
    st.boost += (meta - st.boost) * Math.min(1, dt * (meta > st.boost ? 7 : 1.6));
    if (!v && st.boost < 0.01) st.boost = 0;
    // fumo: forte all'inizio, continuo in volo, si dirada scendendo
    const fv = st.volo;
    let rit = 0;
    if (fv) rit = fv.fase === 'sale' ? 260 : fv.fase === 'vola' ? (fv.t > fv.D - DISCESA - 1.2 ? 60 + 70 * Math.max(0, (fv.D - DISCESA - fv.t) / 1.2) : 130) : 50 * (1 - Math.min(1, fv.tDisc / DISCESA));
    rit *= 1 + 1.6 * st.boost;                         // (fase 31) dopo il basso: molto più fumo
    st.accumulo += rit * dt;
    const yE = st.h + 0.4, zE = 0.62;
    while (st.accumulo >= 1) { st.accumulo -= 1; emetti(fumo, x, yE, zE, vMondo, fv && fv.fase === 'sale'); }
    st.accS += (fv ? (fv.fase === 'scende' ? 8 : 26) : 0) * (1 + 1.5 * st.boost) * dt;
    while (st.accS >= 1) { st.accS -= 1; emetti(scintille, x, yE + 0.1, zE, vMondo, false); }
    muovi(fumo, dt, vMondo); muovi(scintille, dt, vMondo);
    ombra.visible = st.h > 0.05;
    if (ombra.visible) { ombra.position.set(x, 0.02, 0.0); ombra.scale.setScalar(1 + 0.35 * st.h); ombra.material.opacity = 0.55 * (1 - 0.5 * st.h / ALT) * Math.min(1, st.h / 0.3); }
    pozza.visible = ombra.visible;
    if (pozza.visible) { pozza.position.set(x, 0.03, 0.9); pozza.scale.set(1.1 + 0.3 * st.h, 1, 1.6 + 0.4 * st.h); pozza.material.opacity = 0.5 * Math.min(1, st.h / 0.6) * (0.85 + 0.15 * Math.sin(st.t * 9)); }
    return st.h;
  }
  function altezzaSchermo(px) { fumo.mat.uniforms.uAlt.value = px; scintille.mat.uniforms.uAlt.value = px; }
  // morte, finale, nuova partita. morbido: la bici scende (finale); altrimenti tutto si spegne subito
  function ferma(morbido) {
    if (st.inStrada && st.presa < 0) { st.inStrada = null; gruppo.visible = false; }
    st.nata = true; st.soglie = [];                // in questa partita niente più foglie
    if (morbido && st.volo) { if (st.volo.fase !== 'scende') { st.volo.fase = 'scende'; st.volo.tDisc = 0; st.volo.hDisc = st.h; } return; }
    st.volo = null; st.h = 0; st.pend = 0; st.grazia = 0; ombra.visible = false; pozza.visible = false;
    [fumo, scintille].forEach(function (n) { n.p.forEach(function (q) { q.vivo = false; }); muovi(n, 0, 0); });
    if (PZ.audio.salviaFine) PZ.audio.salviaFine(true);
  }
  reset();
  return { nuovoGiro: nuovoGiro, suRiga: suRiga, aggiornaFoglia: aggiornaFoglia, raccogli: raccogli, attiva: attiva, aggiorna: aggiorna, ferma: ferma, reset: reset,
    altezzaSchermo: altezzaSchermo, stato: st, gruppo: gruppo, ALT: ALT, oggetti: [fumo.pts, scintille.pts, ombra, pozza],
    // in volo (anche mentre sale o scende) o appena atterrato: niente urti
    protetto: function () { return !!st.volo || st.grazia > 0; },
    inVolo: function () { return !!st.volo; },
    quota: function () { return st.h; }, pendenza: function () { return st.pend; },
    rimasto: function () { return st.volo ? Math.max(0, 1 - st.volo.t / st.volo.D) : 0; },
    durataVolo: function () { return st.volo ? st.volo.D : 0; },
    boost: function () { return st.boost || 0; },                                   // (fase 31) 0-1, il secondo boost
    colpoBasso: function () { const c = st.colpoBasso; st.colpoBasso = false; return c; } };
};
