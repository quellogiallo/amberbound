// (fase 80) IL TOMBINO: un evento opzionale durante la corsa (numeri in config.js, strada.tombino).
//
// IN STRADA. Ogni tanto, in una corsia libera, un tombino di ghisa: dalle fessure della grata esce una luce gialla,
// come d'ambra, e da sotto si sente un ticchettio d'orologio. Se sei nella sua corsia, poco prima di arrivarci compare
// SCENDI (PC: E o freccia giù): se lo premi la bici frena e scendi; se no ci passi sopra e la corsa continua.
//
// SOTTO. Una piccola camera sotterranea (si cammina come nella cameretta): tubature, muri sporchi, una lampadina che
// sfarfalla, una porta di ferro chiusa da cui filtra la stessa luce gialla. Tre valvole (con un simbolo dipinto sopra:
// LUNA, OCCHIO, PIETRA), quattro tubature (una per valvola e la principale) e quattro spie sopra la porta. Sul muro,
// accanto alla porta, un orologio dipinto: i tre simboli sono sulle ore e la lancetta indica il primo; si leggono nel
// verso della freccia (orario). La sequenza giusta apre la porta. Cambia a ogni partita, ma in una partita è sempre
// la stessa. Una valvola sbagliata: vapore, la sequenza si azzera e il tempo scende di "penalita" secondi.
// Hai "tempo" secondi: col passare del tempo la luce rossa cresce, la lampadina impazzisce, il demone gratta e batte
// sulle tubature sempre più vicino. A zero ti trova: si risale e ti prende (game over, come in strada).
// Si risale dalla scala quando vuoi: con la porta aperta prendi il premio, senza niente se rinunci.
//
//   const T = PZ.creaTombino({ scena, renderer, stage, V0 })
//   in strada:  T.reset(), T.suRiga(r, p, autoInCorsia, metri, frammenti), T.aggiorna(dt, tau, dtVero), T.davanti(corsia, vel, tau)
//   sotto:      T.entra(fine)  fine({ premio: n, perfetto, preso })   T.passo(dt)   T.disegna()   T.attivo()   T.prepara()
PZ.creaTombino = function (o) {
  const CFG = PZ.CONFIG.strada, T = CFG.tombino, LC = CFG.larghezzaCorsia, LONTANO = CFG.distanzaComparsa;
  const V0 = o.V0, scena = o.scena, renderer = o.renderer, stage = o.stage;
  const VA = CFG.difficolta.velocitaAuto, VC = V0 + VA, PRIMA = (LONTANO / V0) * (VA / VC) + 0.7;
  const V3 = THREE.Vector3;
  const rnd = PZ.ps1.casuale(91 + Math.floor(Math.random() * 1e9));
  const $ = function (id) { return document.getElementById(id); };
  const A = function () { return PZ.audio.sotto || null; };
  function canvas(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
  function tex(c) { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }
  const liscia = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  // =====================================================================================================
  // IN STRADA: il tombino
  // =====================================================================================================
  // la grata: ghisa scura con un anello, fessure a griglia e al centro una lancetta in rilievo (la luce passa dalle fessure)
  const FESSURE = [];
  for (let y = 14; y <= 48; y += 6) for (let x = 14; x <= 48; x += 6) { const d = Math.hypot(x - 32, y - 32); if (d < 19 && d > 6) FESSURE.push([x, y]); }
  const texGrata = tex(canvas(64, 64, function (g) {
    g.fillStyle = '#121110'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#25221e'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill();
    g.fillStyle = '#1a1816'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill();
    g.fillStyle = '#2e2a24'; g.beginPath(); g.arc(32, 32, 23, 0, 7); g.fill();
    const r = PZ.ps1.casuale(5);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? '#3a342a' : '#141210'; g.fillRect(Math.floor(8 + r() * 48), Math.floor(8 + r() * 48), 1, 1); }
    g.fillStyle = '#4a2a10'; FESSURE.forEach(function (f) { g.fillRect(f[0] - 2, f[1] - 1, 4, 2); });
    g.fillStyle = '#3d3830'; g.beginPath(); g.arc(32, 32, 5, 0, 7); g.fill();            // il mozzo, con la lancetta
    g.strokeStyle = '#4f483c'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 22); g.moveTo(32, 32); g.lineTo(38, 35); g.stroke();
  }));
  const texLuceGrata = tex(canvas(64, 64, function (g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; FESSURE.forEach(function (f) { g.fillRect(f[0] - 2, f[1] - 1, 4, 2); });
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, 0, 0);
  }));
  // la colonna di luce che esce dalla grata: sfuma verso l'alto
  const texColonna = tex(canvas(4, 32, function (g) { for (let y = 0; y < 32; y++) { g.fillStyle = 'rgba(255,255,255,' + (Math.pow(y / 31, 2.2)).toFixed(3) + ')'; g.fillRect(0, y, 4, 1); } }));
  texColonna.magFilter = texColonna.minFilter = THREE.LinearFilter;
  const strada = new THREE.Group(); strada.visible = false; scena.add(strada);
  const matGrata = PZ.ps1.aggancia(new THREE.MeshLambertMaterial({ map: texGrata, emissive: 0xffb02a, emissiveMap: texLuceGrata, emissiveIntensity: 1 }));
  const grata = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.64, 0.05, 16), matGrata); grata.position.y = 0.025; strada.add(grata);
  const colletto = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 16).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x0f0e0d })); colletto.position.y = 0.012; strada.add(colletto);
  const colonna = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.52, 3.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb436, map: texColonna, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  colonna.position.y = 1.72; strada.add(colonna);
  const aloneTerra = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: PZ.ps1.alone(255, 176, 50, 6), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  aloneTerra.position.y = 0.06; strada.add(aloneTerra);
  // la luce che esce dal tombino illumina la bici quando ci passa: sempre in scena (spenta), così non si ricompila niente
  const luceStrada = new THREE.PointLight(0xffa83a, 0, 7, 2); luceStrada.position.set(0, 0.5, 0); scena.add(luceStrada);

  const st = { inStrada: null, piani: [], generati: 0, usato: false, tic: 0, t: 0 };
  function reset() {
    st.inStrada = null; st.piani = []; st.generati = 0; st.usato = false; st.t = 0; st.tic = 0;
    if (rnd() < T.probabilita) st.piani.push(T.metri[0] + rnd() * (T.metri[1] - T.metri[0]));
    strada.visible = false; luceStrada.intensity = 0;
    S.simboli = [];                                  // nuova partita: nuova soluzione (decisa alla prima discesa)
    fineJumpscare();
    if (S.attivo) chiudiSotto();
  }
  function disponibile() { return !st.usato && !st.inStrada && st.piani.length && st.generati < T.max && !(PZ.arcade && PZ.arcade.attiva && !T.arcade); }
  // per ogni nuova fila di ostacoli (come l'orologio): a metà tra due file, in una corsia libera prima e dopo, dove
  // nessuna auto passerà sopra. Toglie i frammenti che ci sarebbero sopra.
  function suRiga(r, p, autoInCorsia, metri, frammenti) {
    if (!p || !disponibile() || PZ.raccolta.completata || metri < st.piani[0]) return false;
    const da = p.tau + 0.45, a = r.tau - 0.45;
    if (a - da < 0.35) return false;
    const tau = (da + a) / 2, libera = function (x) { return x === 'L'; };
    const corsie = [0, 1, 2].filter(function (l) {
      return libera(p.corsie[l]) && libera(r.corsie[l]) && p.R[l] && !(autoInCorsia && autoInCorsia(l, da - PRIMA, a + 0.3));
    });
    if (!corsie.length) return false;
    const l = corsie[Math.floor(rnd() * corsie.length)];
    if (frammenti) frammenti.slot.forEach(function (s) { if (s.attivo && s.presa < 0 && s.corsia === l && Math.abs(s.tau - tau) < 0.6) s.attivo = false; });
    st.inStrada = { tau: tau, corsia: l, x: (l - 1) * LC };
    st.piani.shift(); st.generati++;
    strada.visible = true;
    return true;
  }
  function aggiorna(dt, tau, dtVero) {
    st.t += dtVero || dt;
    const s = st.inStrada;
    if (!s) { strada.visible = false; luceStrada.intensity = 0; return; }
    const z = -V0 * (s.tau - tau);
    if (z > 7) {                                   // passato senza entrare: forse ricompare più avanti
      st.inStrada = null; strada.visible = false; luceStrada.intensity = 0;
      if (st.generati < T.max && rnd() < T.ancora) st.piani.push((st.ultimiMetri || 0) + T.dopo[0] + rnd() * (T.dopo[1] - T.dopo[0]));
      return;
    }
    strada.position.set(s.x, 0, z);
    // la luce respira e ogni tanto trema, come una fiamma sotto la grata
    const fl = 0.82 + 0.12 * Math.sin(st.t * 3.1) + 0.06 * Math.sin(st.t * 11.7) - (rnd() < 0.03 ? 0.25 : 0);
    matGrata.emissiveIntensity = fl;
    colonna.material.opacity = 0.24 * fl; aloneTerra.material.opacity = 0.5 * fl;
    luceStrada.position.set(s.x, 0.45, z); luceStrada.intensity = z > -45 ? 1.4 * fl * Math.min(1, (z + 45) / 20) : 0;
    // il ticchettio: si sente avvicinandosi (e da vicino è forte)
    st.tic -= dtVero || dt;
    if (st.tic <= 0 && z > -70) { st.tic = 0.5; const v = Math.max(0, Math.min(1, (z + 70) / 64)); if (A() && v > 0.02) A().tic(v * v, false); }
  }
  // il tombino che arriva nella corsia del ragazzo, entro "finestra" secondi: la sua z, altrimenti null
  function davanti(corsia, vel) {
    const s = st.inStrada; if (!s || s.corsia !== corsia + 1 || st.usato) return null;
    const z = strada.position.z;
    if (z > 0.6 || -z / Math.max(1, vel) > T.finestra) return null;
    return z;
  }
  function metri(m) { st.ultimiMetri = m; }

  // =====================================================================================================
  // SOTTO: la camera sotterranea (una scena a parte, disegnata al posto della strada)
  // =====================================================================================================
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x030302);
  sc.fog = new THREE.Fog(0x040302, 5, 13);
  const cam = new THREE.PerspectiveCamera(52, PZ.CONFIG.schermo.larghezzaInterna / PZ.CONFIG.schermo.altezzaInterna, 0.1, 40);
  // la camera è stretta e profonda (si gioca in verticale): muri laterali a ±MX, muro nord a -MURO, il lato sud è aperto
  const MX = 2.2, MURO = 3.4, LIM = 3.1, ALTO = 2.8, XV = MX - 0.14;
  function mat(m) { return PZ.ps1.aggancia(m); }
  // muri: piastrelle di cemento verdastre, sporche, con colature scure dall'alto
  const texMuro = tex(canvas(64, 64, function (g) {
    const r = PZ.ps1.casuale(33), col = ['#2a2d25', '#262922', '#30322a', '#22251f', '#2d2f26'];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { g.fillStyle = col[Math.floor(Math.pow(r(), 1.5) * col.length)]; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#16180f'; for (let i = 0; i < 64; i += 16) { g.fillRect(0, i, 64, 1); g.fillRect(i + ((i / 16) % 2 ? 8 : 0), 0, 1, 64); }
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 64), l = 10 + Math.floor(r() * 40); g.fillStyle = 'rgba(10,8,4,0.55)'; g.fillRect(x, 0, 1 + Math.floor(r() * 2), l); }
    for (let i = 0; i < 30; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.5)' : 'rgba(8,10,6,0.6)'; g.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 2, 1); }
  }));
  texMuro.wrapS = texMuro.wrapT = THREE.RepeatWrapping;
  const texPav = tex(canvas(32, 32, function (g) {
    const r = PZ.ps1.casuale(34), col = ['#1c1b16', '#22201a', '#17160f', '#29261d'];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { g.fillStyle = col[Math.floor(Math.pow(r(), 1.4) * col.length)]; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#100f0b'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32);
  }));
  texPav.wrapS = texPav.wrapT = THREE.RepeatWrapping; texPav.repeat.set(3, 4.5);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(2 * MX, 2 * MURO).rotateX(-Math.PI / 2), mat(new THREE.MeshLambertMaterial({ map: texPav }))); sc.add(pav);
  function muro(w, x, z, ry) {
    const t = texMuro.clone(); t.needsUpdate = true; t.repeat.set(w / 1.5, ALTO / 1.5);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ALTO), mat(new THREE.MeshLambertMaterial({ map: t })));
    m.position.set(x, ALTO / 2, z); m.rotation.y = ry; sc.add(m); return m;
  }
  muro(2 * MX, 0, -MURO, 0); muro(2 * MURO, -MX, 0, Math.PI / 2); muro(2 * MURO, MX, 0, -Math.PI / 2);
  // pozzanghere che riflettono un poco
  const matPozza = mat(new THREE.MeshLambertMaterial({ color: 0x050605, emissive: 0x0c0a05, transparent: true, opacity: 0.8 }));
  [[0.5, 1.1, 0.6], [-1.1, -1.5, 0.42], [1.3, 0.2, 0.35], [-0.3, -0.4, 0.3]].forEach(function (p) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(p[2], 9).rotateX(-Math.PI / 2), matPozza); m.position.set(p[0], 0.008, p[1]); m.scale.z = 0.7; sc.add(m);
  });
  // la grata di scolo, casse, cavi
  const ferro = mat(new THREE.MeshLambertMaterial({ color: 0x2b2722 }));
  const ruggine = PZ.ps1.texture([0x3a1d10, 0x4a2714, 0x5a3218, 0x2a140a, 0x6a3c1c], 16, 1, 1, 41);
  const matTubo = function () { return mat(new THREE.MeshLambertMaterial({ map: ruggine, color: 0xb0a090, emissive: 0x000000 })); };
  const scolo = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2), mat(new THREE.MeshLambertMaterial({ map: texGrata }))); scolo.position.set(0.9, 0.01, 0.2); sc.add(scolo);
  const colliders = [];
  function cassa(x, z, w, h, d, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(new THREE.MeshLambertMaterial({ map: PZ.ps1.texture([0x3a2c1c, 0x2e2216, 0x463424, 0x241a10], 16, 1, 1, 51 + colliders.length) })));
    m.position.set(x, h / 2, z); m.rotation.y = ry || 0; sc.add(m);
    colliders.push({ x0: x - w / 2 - 0.05, x1: x + w / 2 + 0.05, z0: z - d / 2 - 0.05, z1: z + d / 2 + 0.05 });
  }
  cassa(1.75, 2.65, 0.7, 0.6, 0.6, 0.1); cassa(1.85, 1.85, 0.5, 0.45, 0.5, -0.2);
  // i muri laterali per il giocatore (il limite di giocatore.js è quadrato: qui la camera è più stretta)
  colliders.push({ x0: MX - 0.06, x1: MX + 4, z0: -9, z1: 9 }, { x0: -MX - 4, x1: -MX + 0.06, z0: -9, z1: 9 });
  // ---------- La porta di ferro (muro nord) con le quattro spie sopra; dietro, la nicchia d'ambra ----------
  const PW = 1.1, PH = 1.65, ZP = -MURO + 0.03;
  const telaio = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.24, PH + 0.14, 0.1), ferro); telaio.position.set(0, (PH + 0.14) / 2, ZP + 0.02); sc.add(telaio);
  const nicchia = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.6), new THREE.MeshBasicMaterial({ color: 0x2a1604, side: THREE.BackSide })); nicchia.position.set(0, PH / 2, ZP - 0.28); sc.add(nicchia);
  const luceNicchia = new THREE.PointLight(0xffa020, 0.35, 4.5, 2); luceNicchia.position.set(0, 1.0, ZP + 0.3); sc.add(luceNicchia);
  const cardine = new THREE.Group(); cardine.position.set(-PW / 2, 0, ZP + 0.07); sc.add(cardine);
  const texPorta = tex(canvas(32, 48, function (g) {
    g.fillStyle = '#2c2a26'; g.fillRect(0, 0, 32, 48); g.fillStyle = '#3a3731'; g.fillRect(2, 2, 28, 44); g.fillStyle = '#25231f'; g.fillRect(4, 4, 24, 18); g.fillRect(4, 26, 24, 18);
    g.fillStyle = '#5a5246'; for (let i = 0; i < 6; i++) { g.fillRect(3, 3 + i * 8.4, 1, 1); g.fillRect(28, 3 + i * 8.4, 1, 1); }
    const r = PZ.ps1.casuale(8); for (let i = 0; i < 50; i++) { g.fillStyle = 'rgba(90,40,14,0.6)'; g.fillRect(Math.floor(r() * 32), Math.floor(r() * 48), 1, 2); }
    g.fillStyle = '#6a2010'; g.fillRect(14, 20, 4, 8);
  }));
  const anta = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.08), mat(new THREE.MeshLambertMaterial({ map: texPorta }))); anta.position.set(PW / 2, PH / 2, 0); cardine.add(anta);
  const volantino = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 5, 10), ferro); volantino.position.set(PW / 2 + 0.25, PH / 2, 0.07); cardine.add(volantino);
  // la luce gialla che filtra dalle fessure della porta
  const matFessura = new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  [[0, PH + 0.005, PW, 0.03], [-PW / 2 - 0.005, PH / 2, 0.03, PH], [PW / 2 + 0.005, PH / 2, 0.03, PH], [0, 0.01, PW, 0.025]].forEach(function (f) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(f[2], f[3]), matFessura); m.position.set(f[0], f[1], ZP + 0.13); sc.add(m);
  });
  const aloneFessura = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.ps1.alone(255, 170, 40, 5), color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  aloneFessura.position.set(0, 0.2, ZP + 0.25); aloneFessura.scale.set(2.4, 1.0, 1); sc.add(aloneFessura);
  // dietro la porta: i frammenti d'ambra che fluttuano
  const matAmbra = new THREE.MeshPhongMaterial({ color: 0xffa21e, emissive: 0x8a4a00, specular: 0xfff0a0, shininess: 60, flatShading: true });
  const schegge = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 + rnd() * 0.04, 0), matAmbra);
    m.userData.base = new V3((rnd() - 0.5) * 0.8, 0.35 + rnd() * 1.1, ZP - 0.15 - rnd() * 0.3); m.userData.f = rnd() * 6;
    m.position.copy(m.userData.base); sc.add(m); schegge.push(m);
  }
  // le quattro spie: valvola sinistra, principale, valvola nord, valvola destra
  const LX = [-0.45, -0.15, 0.15, 0.45];
  const spie = LX.map(function (x) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8).rotateX(Math.PI / 2), ferro); b.position.set(x, 2.3, ZP + 0.06); sc.add(b);
    const v = new THREE.Mesh(new THREE.CircleGeometry(0.055, 8), new THREE.MeshBasicMaterial({ color: 0x1a0c04 })); v.position.set(x, 2.3, ZP + 0.095); sc.add(v);
    return v;
  });
  // ---------- Le tubature: una per valvola (fino alla sua spia) e la principale (dal soffitto) ----------
  function tubo(punti, raggio) {
    const m = matTubo(), g = new THREE.Group();
    for (let i = 0; i < punti.length - 1; i++) {
      const a = new V3().fromArray(punti[i]), b = new V3().fromArray(punti[i + 1]), l = a.distanceTo(b);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(raggio, raggio, l, 7), m);
      s.position.copy(a).add(b).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()); g.add(s);
      if (i > 0) { const e = new THREE.Mesh(new THREE.SphereGeometry(raggio * 1.35, 7, 5), m); e.position.copy(a); g.add(e); }
    }
    sc.add(g); return { g: g, m: m };
  }
  const ZT = -MURO + 0.14;
  const tubi = [
    tubo([[-XV, 0.2, -0.4], [-XV, 2.0, -0.4], [-XV, 2.0, ZT], [LX[0], 2.0, ZT], [LX[0], 2.24, ZT]], 0.06),
    tubo([[XV, 0.2, -0.4], [XV, 2.0, -0.4], [XV, 2.0, ZT], [LX[3], 2.0, ZT], [LX[3], 2.24, ZT]], 0.06),
    tubo([[1.45, 0.2, ZT], [1.45, 1.86, ZT], [LX[2], 1.86, ZT], [LX[2], 2.24, ZT]], 0.06),
    tubo([[LX[1], ALTO, ZT], [LX[1], 2.38, ZT]], 0.085)                // la principale
  ];
  // ---------- I simboli: LUNA, OCCHIO, PIETRA (vernice sporca), e l'orologio dipinto che li mette in ordine ----------
  const NOMI = ['LUNA', 'OCCHIO', 'PIETRA'];
  function simbolo(g, k, cx, cy, r, col) {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = Math.max(1, r * 0.22);
    if (k === 0) {                                  // luna crescente
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx + r * 0.45, cy - r * 0.2, r * 0.85, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    } else if (k === 1) {                           // occhio
      g.beginPath(); g.moveTo(cx - r, cy); g.quadraticCurveTo(cx, cy - r * 1.2, cx + r, cy); g.quadraticCurveTo(cx, cy + r * 1.2, cx - r, cy); g.stroke();
      g.beginPath(); g.arc(cx, cy, r * 0.32, 0, 7); g.fill();
    } else {                                        // pietra sfaccettata
      g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.8, cy - r * 0.2); g.lineTo(cx + r * 0.45, cy + r); g.lineTo(cx - r * 0.45, cy + r); g.lineTo(cx - r * 0.8, cy - r * 0.2); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(cx - r * 0.8, cy - r * 0.2); g.lineTo(cx + r * 0.8, cy - r * 0.2); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
    }
  }
  // targhe sopra le valvole (si ridisegnano a ogni partita: i simboli cambiano valvola)
  const VALV = [
    { p: new V3(-XV, 1.0, -0.4), n: new V3(1, 0, 0), presa: new V3(-MX + 0.4, 0, -0.4), spia: 0 },
    { p: new V3(XV, 1.0, -0.4), n: new V3(-1, 0, 0), presa: new V3(MX - 0.4, 0, -0.4), spia: 3 },
    { p: new V3(1.45, 1.0, ZT), n: new V3(0, 0, 1), presa: new V3(1.45, 0, -MURO + 0.45), spia: 2 }
  ];
  VALV.forEach(function (v, i) {
    v.g = new THREE.Group(); v.g.position.copy(v.p).addScaledVector(v.n, 0.09); v.g.lookAt(v.g.position.clone().add(v.n)); sc.add(v.g);
    const rossa = mat(new THREE.MeshLambertMaterial({ color: 0x7a1a12, emissive: 0x100000 }));
    v.ruota = new THREE.Group(); v.g.add(v.ruota);
    v.ruota.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 5, 12), rossa));
    for (let k = 0; k < 2; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), rossa); r.rotation.z = k * Math.PI / 2; v.ruota.add(r); }
    v.ruota.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6).rotateX(Math.PI / 2), rossa));
    v.cv = document.createElement('canvas'); v.cv.width = v.cv.height = 32; v.tex = tex(v.cv);
    v.targa = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mat(new THREE.MeshLambertMaterial({ map: v.tex, emissive: 0x2a2416, emissiveMap: v.tex })));
    v.targa.position.copy(v.p).addScaledVector(v.n, 0.05); v.targa.position.y = 1.55; v.targa.lookAt(v.targa.position.clone().add(v.n)); sc.add(v.targa);
    v.vapore = [];
  });
  // l'orologio dipinto (a sinistra della porta): un cerchio d'ambra, le tacche, i tre simboli sulle ore, la lancetta
  // che indica il primo e la freccia del verso. Leggermente luminoso: è la cosa che si nota nel buio.
  const cvOro = document.createElement('canvas'); cvOro.width = cvOro.height = 128;
  const texOro = tex(cvOro);
  const murale = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mat(new THREE.MeshLambertMaterial({ map: texOro, transparent: true, emissive: 0xffffff, emissiveMap: texOro, emissiveIntensity: 0.45 })));
  murale.position.set(-1.35, 1.25, -MURO + 0.02); sc.add(murale);
  const PRESA_MURALE = new V3(-1.35, 0, -MURO + 0.45);
  function disegnaOrologio(g, simboliOrdine, inizio) {
    const N = 128, c = N / 2;
    g.clearRect(0, 0, N, N);
    const col = '#e0a43a', scuro = 'rgba(120,70,20,0.85)';
    g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(c, c, 54, 0, 7); g.stroke();
    g.strokeStyle = scuro; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 47, 0, 7); g.stroke();
    g.fillStyle = col;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(Math.round(c + Math.sin(a) * 50) - 2, Math.round(c - Math.cos(a) * 50) - 2, 4, 4); }
    // tre posizioni: ore 12, 4 e 8. Il primo simbolo della sequenza sta su quella indicata dalla lancetta
    const POS = [0, 4, 8], dove = [];
    for (let k = 0; k < 3; k++) dove.push(POS[(inizio + k) % 3]);
    simboliOrdine.forEach(function (s, k) { const a = dove[k] / 12 * Math.PI * 2; simbolo(g, s, c + Math.sin(a) * 34, c - Math.cos(a) * 34, 10, '#efe2c0'); });
    const a0 = dove[0] / 12 * Math.PI * 2;      // la lancetta (rossa, come la macchia sulla pietra)
    g.strokeStyle = '#b3101a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a0) * 21, c - Math.cos(a0) * 21); g.stroke();
    g.fillStyle = '#b3101a'; g.beginPath(); g.arc(c, c, 5, 0, 7); g.fill();
    // la freccia del verso: un arco sul bordo, subito dopo la lancetta, con la punta in senso orario
    const b0 = a0 - Math.PI / 2 + 0.35, b1 = b0 + 1.0;
    g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(c, c, 61, b0, b1); g.stroke();
    const px = c + Math.cos(b1) * 61, py = c + Math.sin(b1) * 61, tx = -Math.sin(b1), ty = Math.cos(b1);
    g.fillStyle = col; g.beginPath(); g.moveTo(px + tx * 7, py + ty * 7); g.lineTo(px - tx * 2 + Math.cos(b1) * 6, py - ty * 2 + Math.sin(b1) * 6); g.lineTo(px - tx * 2 - Math.cos(b1) * 6, py - ty * 2 - Math.sin(b1) * 6); g.closePath(); g.fill();
    // sporco e graffi sopra la vernice
    const r = PZ.ps1.casuale(77); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 90; i++) g.fillRect(Math.floor(r() * N), Math.floor(r() * N), 1 + Math.floor(r() * 3), 1);
    g.globalCompositeOperation = 'source-over';
  }
  // ---------- La scala per risalire (angolo sud-ovest) con la luce fredda della strada che scende dal tombino ----------
  const ZS = 2.5;
  const scala = new THREE.Group(); scala.position.set(-MX + 0.12, 0, ZS); sc.add(scala);
  [-0.22, 0.22].forEach(function (dz) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, ALTO + 0.6, 0.05), ferro); m.position.set(0, (ALTO + 0.6) / 2, dz); scala.add(m); });
  for (let y = 0.3; y < ALTO + 0.5; y += 0.32) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.44), ferro); m.position.set(0.02, y, 0); scala.add(m); }
  // la luce fredda della strada che scende dal tombino: una pozza azzurrina ai piedi della scala
  const pozzaLuce = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: PZ.ps1.alone(150, 175, 235, 5), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  pozzaLuce.position.set(-MX + 0.55, 0.02, ZS); sc.add(pozzaLuce);
  const luceScala = new THREE.PointLight(0x8aa0d8, 0.5, 3.5, 2); luceScala.position.set(-MX + 0.7, 2.2, ZS); sc.add(luceScala);
  const PRESA_SCALA = new V3(-MX + 0.4, 0, ZS);
  // ---------- Luci: una lampadina appesa che sfarfalla, una luce rossa che cresce con l'ansia ----------
  sc.add(new THREE.HemisphereLight(0x5a5646, 0x16120c, 1.0));
  const lampadina = new THREE.PointLight(0xffd090, 1.6, 9, 1.6); lampadina.position.set(0.2, 2.35, -0.2); sc.add(lampadina);
  const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); bulbo.position.set(0.2, 2.45, -0.2); sc.add(bulbo);
  const filo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0x111111 })); filo.position.set(0.2, 2.75, -0.2); sc.add(filo);
  const luceRossa = new THREE.PointLight(0xff1a10, 0, 9, 1.5); luceRossa.position.set(0.5, 2.0, 1.4); sc.add(luceRossa);
  // gli occhi nel buio (verso la fine): due punti rossi che compaiono e spariscono negli angoli
  const matOcchi = new THREE.SpriteMaterial({ map: PZ.ps1.alone(255, 40, 30, 4), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const occhi = [new THREE.Sprite(matOcchi), new THREE.Sprite(matOcchi)];
  occhi.forEach(function (s) { s.scale.set(0.16, 0.16, 1); sc.add(s); });
  // gocce che cadono dal soffitto
  const matGoccia = new THREE.MeshBasicMaterial({ color: 0x8a9a8a, transparent: true, opacity: 0.6 });
  const gocce = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), matGoccia); m.userData.x = (rnd() - 0.5) * 3.8; m.userData.z = (rnd() - 0.5) * 5.5; m.userData.y = rnd() * ALTO; sc.add(m); gocce.push(m); }
  // vapore delle valvole sbagliate
  const matVapore = new THREE.SpriteMaterial({ map: PZ.ps1.alone(220, 220, 210, 5), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const vapori = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(matVapore.clone()); s.visible = false; sc.add(s); vapori.push({ s: s, t: 1, v: new V3() }); }
  // il protagonista: lo stesso della cameretta, con gli stessi movimenti (src/giocatore.js)
  const stanzaFinta = { limite: LIM, colliders: colliders };
  const giocatore = PZ.creaGiocatore(sc, stanzaFinta);
  // (fase 80b) IL DEMONE DEL GAME OVER: quando il tempo finisce ti salta addosso qui sotto (stesso modello e stesso
  // jumpscare della strada), con la porta, le tubature e l'orologio dipinto alle sue spalle
  const occhiS = PZ.creaOcchi(sc, 40);
  const demoneS = PZ.creaDemone(sc, occhiS, { manone: true });
  const J = { t: 0, testa: new V3(), bers: new V3(), p: new V3() }, DZ = -1.0;
  function iniziaJumpscare() {
    J.t = 0;
    giocatore.pos.set(0, 0, 3.0); if (giocatore.ragazzo && giocatore.ragazzo.gruppo) giocatore.ragazzo.gruppo.visible = false;
    demoneS.mostra(); demoneS.posiziona(0, 0, DZ, 0);
    luceRossa.position.set(0, 2.2, DZ + 1.6); matOcchi.opacity = 0;
    sc.fog.near = 3; sc.fog.far = 11; ui.velo.style.opacity = '0';
  }
  // t = secondi dal salto: il demone si avventa contro la telecamera (da lontano a mezzo metro), poi resta a fissarti
  function jumpscare(dt) {
    J.t += dt; const t = J.t;
    J.bers.set(0, 1.5, DZ + 3);
    demoneS.anima(dt, 'afferra', 11, J.bers, 1);
    occhiS.aggiorna(dt, J.bers);
    const G = demoneS.G; G.testa.updateMatrixWorld(true); G.testa.getWorldPosition(J.testa);
    const u = Math.min(1, t / 0.16), avv = 1 - Math.pow(1 - u, 3);
    const d = 3.4 + (1.75 - 3.4) * avv - 0.05 * Math.sin(t * 6) * Math.min(1, t / 0.4);
    const sc2 = t < 0.16 ? 0.02 : 0.11 * Math.exp(-(t - 0.16) * 3.2) + 0.012;
    J.p.copy(J.testa); J.p.z += d; J.p.y += 0.05;
    cam.position.set(J.p.x + (rnd() - 0.5) * sc2, J.p.y + (rnd() - 0.5) * sc2, J.p.z + (rnd() - 0.5) * sc2);
    cam.lookAt(J.testa.x + (rnd() - 0.5) * sc2 * 0.6, J.testa.y - 0.12 + (rnd() - 0.5) * sc2 * 0.6, J.testa.z);
    cam.rotateZ((rnd() - 0.5) * sc2 * 1.2);
    if (cam.fov !== 70) { cam.fov = 70; cam.updateProjectionMatrix(); }
    // la luce rossa pulsa, la lampadina impazzisce
    luceRossa.intensity = 2.6 + 0.8 * Math.sin(t * 9); lampadina.intensity = rnd() < 0.35 ? 0.15 : 1.1; bulbo.material.color.setHex(lampadina.intensity < 0.5 ? 0x3a2a14 : 0xffe0a0);
  }
  // (fase 80c) A 5 SECONDI: il demone compare alle spalle del ragazzo e resta immobile ad aspettare (solo gli occhi
  // ti seguono); a 0 ti corre addosso, poi il jumpscare. Se apri la porta in tempo, sparisce.
  const AT = { on: false, corsa: false, x: 0, z: 0, coll: null, t: 0 };
  function appareAlleSpalle() {
    const d = giocatore.dir(), gx = giocatore.pos.x, gz = giocatore.pos.z;
    // "dietro di te" visto da chi gioca: oltre il ragazzo rispetto alla telecamera (più a nord), così lo vedi
    // incombere sopra la sua spalla. Contro il muro nord: di fianco, alla stessa altezza
    let x = gx + 0.35 * (gx > 0 ? -1 : 1), z = gz - 1.4;
    if (z < -MURO + 0.6) { z = Math.max(-MURO + 0.6, gz); x = gx + (gx > 0 ? -1.3 : 1.3); }
    x = Math.max(-MX + 0.45, Math.min(MX - 0.45, x));
    AT.on = true; AT.corsa = false; AT.t = 0; AT.x = x; AT.z = z;
    demoneS.mostra(); demoneS.posiziona(x, 0, z, Math.atan2(gx - x, gz - z));
    AT.coll = { x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35 }; colliders.push(AT.coll);   // non lo attraversi
    luceRossa.position.set(x, 2.1, z + 0.3); S.scossa = Math.max(S.scossa, 0.5);
    if (A()) A().colpo(1, 0); if (PZ.audio.ringhio) PZ.audio.ringhio(0.9, 0); if (PZ.audio.battito) PZ.audio.battito(1.6);
  }
  function togliAttesa() {
    if (AT.coll) { const i = colliders.indexOf(AT.coll); if (i >= 0) colliders.splice(i, 1); AT.coll = null; }
    if (AT.on) demoneS.nascondi(); AT.on = false; AT.corsa = false;
    luceRossa.position.set(0.5, 2.0, 1.4);
  }
  // ogni fotogramma mentre aspetta (o mentre corre verso di te): vero quando ti ha raggiunto
  function passoAttesa(dt) {
    if (!AT.on) return false;
    AT.t += dt;
    const gx = giocatore.pos.x, gz = giocatore.pos.z;
    J.bers.set(gx, 1.5, gz);
    if (AT.corsa) {
      const dx = gx - AT.x, dz = gz - AT.z, dd = Math.hypot(dx, dz), v = 5.5 * dt;
      if (dd <= 0.75) return true;
      AT.x += dx / dd * Math.min(v, dd); AT.z += dz / dd * Math.min(v, dd);
      demoneS.posiziona(AT.x, 0, AT.z, Math.atan2(dx, dz)); demoneS.anima(dt, 'corre', 14, J.bers, 1);
    } else {
      demoneS.anima(dt, 'fermo', 0, J.bers, 1);
      const R0 = demoneS.gruppo; R0.position.y = 0.012 * Math.sin(AT.t * 2.2);          // respira appena
    }
    occhiS.aggiorna(dt, J.bers);
    luceRossa.intensity = Math.max(luceRossa.intensity, 1.8 + 0.6 * Math.sin(AT.t * 4));
    return false;
  }
  function fineJumpscare() {
    togliAttesa();
    demoneS.nascondi(); if (giocatore.ragazzo && giocatore.ragazzo.gruppo) giocatore.ragazzo.gruppo.visible = true;
    if (cam.fov !== 52) { cam.fov = 52; cam.updateProjectionMatrix(); }
    luceRossa.position.set(0.5, 2.0, 1.4); J.t = 0;
  }

  // ---------- Interfaccia (dentro #sotto, in index.html) ----------
  const ui = { box: $('sotto'), tempo: $('sottoTempo'), msg: $('sottoMsg'), agisci: $('sottoAgisci'), nero: $('sottoNero'), velo: $('sottoVelo'),
    lente: $('sottoLente'), joy: $('sottoJoy'), man: $('sottoManopola'), premio: $('sottoPremio'), pausa: $('sottoPausa'), aiuto: $('sottoAiuto') };
  const S = { attivo: false, fase: 'no', t: 0, tempo: 0, seq: [], simboli: [], k: 0, errori: 0, vinto: false, fine: null, anim: [], porta: 0, tensione: 0,
    prossimoSuono: 0, prossimaGoccia: 0, prossimoBattito: 0, flick: 0, scossa: 0, msgT: 0, lente: false, uscita: null, dist: 0, input: { x: 0, z: 0 }, tasti: {} };
  // la soluzione di questa partita: decisa una volta per partita (la ritrovi uguale se scendi di nuovo nella stessa)
  function nuovaSoluzione() {
    const perm = function () { const a = [0, 1, 2]; for (let i = 2; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    S.simboli = perm();                 // S.simboli[v] = il simbolo dipinto sopra la valvola v
    S.ordine = perm();                  // l'ordine dei simboli sull'orologio
    S.inizio = Math.floor(rnd() * 3);   // dove punta la lancetta
    S.seq = S.ordine.map(function (s) { return S.simboli.indexOf(s); });   // le valvole, in ordine
    VALV.forEach(function (v, i) {
      const g = v.cv.getContext('2d'); g.fillStyle = '#1c1a14'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#2a261c'; g.fillRect(2, 2, 28, 28);
      simbolo(g, S.simboli[i], 16, 16, 9, '#e8dcb8');
      v.tex.needsUpdate = true;
    });
    disegnaOrologio(cvOro.getContext('2d'), S.ordine, S.inizio); texOro.needsUpdate = true;
  }
  function msg(t, sec) { ui.msg.textContent = t || ''; ui.msg.classList.toggle('vis', !!t); S.msgT = sec || 2.2; }
  function chiudiSotto() {
    S.attivo = false; S.fase = 'no';
    ui.box.classList.remove('vis', 'urgente'); ui.nero.style.opacity = '0'; ui.lente.classList.remove('vis'); S.lente = false;
    ui.joy.style.display = 'none'; S.joyId = null; S.input.x = S.input.z = 0; S.tasti = {};
    if (A()) A().ronzio(0);
  }
  function entra(fine) {
    if (S.attivo || !st.inStrada) return false;
    st.usato = true; st.inStrada = null; strada.visible = false; luceStrada.intensity = 0;
    if (!S.simboli.length) nuovaSoluzione();
    Object.assign(S, { attivo: true, fase: 'scende', t: 0, tempo: T.tempo, k: 0, errori: 0, vinto: false, fine: fine, porta: 0, tensione: 0,
      prossimoSuono: 3 + rnd() * 2, prossimaGoccia: 1, prossimoBattito: 0, scossa: 0, uscita: null });
    giocatore.pos.set(-MX + 0.55, 0, ZS - 0.15); togliAttesa();
    cardine.rotation.y = 0; luceNicchia.intensity = 0.35; spie.forEach(function (s) { s.material.color.setHex(0x1a0c04); });
    tubi.forEach(function (t) { t.m.emissive.setHex(0x000000); });
    VALV.forEach(function (v) { v.ruota.rotation.z = 0; v.giro = 0; v.aperta = false; });
    schegge.forEach(function (m) { m.visible = true; m.position.copy(m.userData.base); m.scale.setScalar(1); });
    ui.box.classList.add('vis'); ui.box.classList.remove('urgente'); ui.premio.textContent = ''; ui.premio.classList.remove('vis');
    ui.nero.style.transition = 'none'; ui.nero.style.opacity = '1';
    aggiornaTempo(true);
    if (A()) A().frena();
    return true;
  }
  // ---------- Il puzzle ----------
  function giraValvola(i) {
    const v = VALV[i];
    if (S.vinto || v.aperta) { msg(S.vinto ? 'LA PORTA È APERTA' : 'È GIÀ APERTA', 1.4); return; }
    if (A()) A().valvola();
    v.giro = 0.65;
    if (S.seq[S.k] === i) {
      v.aperta = true; S.k++;
      tubi[i].m.emissive.setHex(0x7a3a00); spie[v.spia].material.color.setHex(0xffb030);
      if (A()) setTimeout(function () { if (S.attivo && A()) A().giusto(S.k - 1); }, 380);
      if (S.k >= 3) vittoria();
      else msg(NOMI[S.simboli[i]] + '  ·  ' + S.k + ' / 3', 1.6);
    } else {
      S.errori++;
      S.tempo = Math.max(0.5, S.tempo - T.penalita);
      setTimeout(function () { if (!S.attivo) return; if (A()) A().sbagliato(); sbuffo(v); }, 350);
      VALV.forEach(function (w) { if (w.aperta) { w.aperta = false; w.indietro = 0.6; } });
      S.k = 0; S.scossa = Math.max(S.scossa, 0.35);
      tubi.forEach(function (t) { t.m.emissive.setHex(0x000000); }); spie.forEach(function (s) { s.material.color.setHex(0x3a0804); });
      setTimeout(function () { if (S.attivo && !S.vinto) spie.forEach(function (s) { s.material.color.setHex(0x1a0c04); }); }, 700);
      msg('SBAGLIATO  ·  -' + T.penalita + ' S', 1.8);
      aggiornaTempo(true);
    }
  }
  function sbuffo(v) {
    for (let n = 0; n < 5; n++) {
      const p = vapori.find(function (x) { return x.t >= 1; }); if (!p) break;
      p.t = -n * 0.06; p.s.visible = true; p.s.position.copy(v.p).addScaledVector(v.n, 0.15); p.s.position.y += 0.1;
      p.v.copy(v.n).multiplyScalar(0.6 + rnd() * 0.5); p.v.y = 0.5 + rnd() * 0.6; p.v.x += (rnd() - 0.5) * 0.4; p.v.z += (rnd() - 0.5) * 0.4;
    }
  }
  function premio() { return S.errori === 0 ? T.perfetto : T.premio; }
  function vittoria() {
    S.vinto = true; S.porta = 0.001;
    tubi[3].m.emissive.setHex(0x9a5200); spie.forEach(function (s) { s.material.color.setHex(0xffc040); });
    setTimeout(function () { if (S.attivo && A()) A().porta(); }, 500);
    msg(S.errori === 0 ? 'PERFETTO' : 'LA PORTA SI APRE', 2.4); aggiornaTempo(true);
    ui.premio.textContent = '+' + premio() + ' AMBRA'; ui.premio.classList.add('vis');
    ui.box.classList.remove('urgente');
  }
  function risali() {
    if (S.uscita) return;
    S.uscita = { t: 0, esito: S.vinto ? { premio: premio(), perfetto: S.errori === 0 } : { premio: 0 } };
    if (A()) A().valvola();
  }
  function preso() {
    if (S.uscita) return;
    S.uscita = { t: 0, esito: { premio: 0, preso: true }, preso: true };
    if (PZ.audio.ringhio) PZ.audio.ringhio(1, 0);
    S.scossa = 0.4;
  }
  // ---------- Interazione: la cosa più vicina (valvola, orologio dipinto, scala) ----------
  const OGG = [
    { p: VALV[0].presa, nome: function () { return 'GIRA'; }, fn: function () { giraValvola(0); } },
    { p: VALV[1].presa, nome: function () { return 'GIRA'; }, fn: function () { giraValvola(1); } },
    { p: VALV[2].presa, nome: function () { return 'GIRA'; }, fn: function () { giraValvola(2); } },
    { p: PRESA_MURALE, nome: function () { return 'GUARDA'; }, fn: function () { apriLente(); } },
    { p: PRESA_SCALA, nome: function () { return S.vinto ? 'RISALI' : 'RISALI SENZA PREMIO'; }, fn: function () { risali(); } }
  ];
  function vicino() {
    let m = null, dm = (PZ.CONFIG.interazione.raggio || 1.15) + 0.15;
    OGG.forEach(function (x) { const d = Math.hypot(giocatore.pos.x - x.p.x, giocatore.pos.z - x.p.z); if (d < dm) { dm = d; m = x; } });
    return m;
  }
  function interagisci() {
    if (!S.attivo || S.fase !== 'gioca' || S.uscita) return;
    if (S.lente) { chiudiLente(); return; }
    const x = vicino(); if (x) { if (PZ.audio.tocco) PZ.audio.tocco(); x.fn(); }
  }
  function apriLente() {
    S.lente = true; ui.lente.innerHTML = ''; const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#16120c'; g.beginPath(); g.arc(64, 64, 63, 0, 7); g.fill(); g.drawImage(cvOro, 0, 0); ui.lente.appendChild(c);
    const s = document.createElement('small'); s.textContent = 'TOCCA PER CHIUDERE'; ui.lente.appendChild(s);
    ui.lente.classList.add('vis');
  }
  function chiudiLente() { S.lente = false; ui.lente.classList.remove('vis'); }
  ui.lente.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); chiudiLente(); });
  ui.agisci.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); interagisci(); });
  ui.pausa.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); const b = $('riavvia'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); });
  // la levetta (come nella cameretta): si tocca dove si vuole, a parte l'angolo del pulsante
  function relativo(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, em: r.height / 40 }; }
  ui.box.addEventListener('pointerdown', function (e) {
    if (!S.attivo || S.joyId != null) return;
    if (S.lente) { chiudiLente(); return; }
    const p = relativo(e);
    if (p.x > p.w * 0.62 && p.y > p.h * 0.55) return;
    S.joyId = e.pointerId; S.joyO = { x: p.x, y: p.y };
    ui.joy.style.display = 'block'; ui.joy.style.left = p.x + 'px'; ui.joy.style.top = p.y + 'px'; ui.man.style.transform = 'none';
    try { ui.box.setPointerCapture(e.pointerId); } catch (x) {}
  });
  ui.box.addEventListener('pointermove', function (e) {
    if (e.pointerId !== S.joyId) return;
    const p = relativo(e), max = p.em * 3.5;
    let dx = p.x - S.joyO.x, dy = p.y - S.joyO.y; const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    ui.man.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    S.input.x = dx / max; S.input.z = dy / max;
    if (Math.hypot(S.input.x, S.input.z) < 0.15) { S.input.x = 0; S.input.z = 0; }
  });
  function fineTocco(e) { if (e.pointerId !== S.joyId) return; S.joyId = null; S.input.x = S.input.z = 0; ui.joy.style.display = 'none'; }
  ui.box.addEventListener('pointerup', fineTocco); ui.box.addEventListener('pointercancel', fineTocco);
  window.addEventListener('keydown', function (e) {
    if (!S.attivo || (e.target && e.target.tagName === 'INPUT')) return;
    S.tasti[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) interagisci(); }
    if (e.code.indexOf('Arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { S.tasti[e.code] = false; });

  let tempoMostrato = -1;
  function aggiornaTempo(forza) {
    const s = Math.max(0, Math.ceil(S.tempo));
    if (!forza && s === tempoMostrato) return; tempoMostrato = s;
    ui.tempo.textContent = S.vinto ? 'APERTA' : ('00:' + (s < 10 ? '0' : '') + s);
    ui.tempo.classList.toggle('poco', !S.vinto && s <= 10);
  }
  // ---------- Un passo sotto terra (tempo vero; in pausa non viene chiamato) ----------
  const tmpP = new V3(), tmpF = new V3(), camPos = new V3(-1.2, 4.4, 6.2), camFuoco = new V3(-1.6, 0.5, 1.5);
  function passo(dt) {
    if (!S.attivo) return;
    S.t += dt;
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) msg(''); }
    // entrata: nero, poi la camera si apre
    if (S.fase === 'scende') {
      if (S.t > 0.45) { S.fase = 'gioca'; ui.nero.style.transition = 'opacity .7s'; ui.nero.style.opacity = '0'; msg('RISOLVI PRIMA CHE TI TROVI', 2.6); camPos.set(-0.5, 5.6, 6.6); camFuoco.set(-0.75, 0.4, 1.4); }
    }
    const gioca = S.fase === 'gioca' && !S.uscita;
    // il tempo scende (fermo quando la porta è aperta)
    if (gioca && !S.vinto) { S.tempo -= dt; if (S.tempo <= 0) { S.tempo = 0; preso(); } }
    if (gioca && !S.vinto && S.tempo <= 5 && !AT.on) appareAlleSpalle();      // (fase 80c)
    if (S.vinto && AT.on && !S.uscita) { togliAttesa(); S.scossa = Math.max(S.scossa, 0.3); if (A()) A().colpo(0.5, 0); }
    aggiornaTempo(false);
    PZ.opacita(ui.aiuto, S.fase === 'gioca' && S.t < 8 ? 0.85 : 0);
    const kT = S.vinto ? Math.max(0, S.tensione - dt * 0.5) : liscia(1 - S.tempo / T.tempo);
    S.tensione = kT;
    if (!S.vinto) ui.box.classList.toggle('urgente', S.tempo <= 10 && S.fase === 'gioca');
    // il ragazzo
    let ix = S.input.x, iz = S.input.z; const K = S.tasti;
    if (K.KeyA || K.ArrowLeft) ix -= 1; if (K.KeyD || K.ArrowRight) ix += 1; if (K.KeyW || K.ArrowUp) iz -= 1; if (K.KeyS || K.ArrowDown) iz += 1;
    giocatore.aggiorna(dt, ix, iz, !gioca || S.lente);
    // il pulsante: compare solo vicino a qualcosa
    const v = gioca ? vicino() : null;
    const nome = v ? v.nome() : '';
    if (ui.agisci.textContent !== nome) ui.agisci.textContent = nome;
    ui.agisci.classList.toggle('vis', !!v && !S.lente);
    // valvole che girano, vapore, porta, schegge
    VALV.forEach(function (w) {
      if (w.giro > 0) { const d = Math.min(w.giro, dt); w.giro -= d; w.ruota.rotation.z -= d * 9; }
      if (w.indietro > 0) { const d = Math.min(w.indietro, dt); w.indietro -= d; w.ruota.rotation.z += d * 12; }
    });
    vapori.forEach(function (p) {
      if (p.t >= 1) return; p.t += dt / 1.1; if (p.t < 0) return;
      p.s.position.addScaledVector(p.v, dt); p.s.scale.setScalar(0.25 + 1.1 * p.t); p.s.material.opacity = 0.55 * (1 - p.t);
      if (p.t >= 1) p.s.visible = false;
    });
    if (S.porta > 0 && S.porta < 1) { S.porta = Math.min(1, S.porta + dt / 1.6); }
    const ep = liscia((S.porta - 0.3) / 0.7);
    cardine.rotation.y = -1.45 * ep;
    luceNicchia.intensity = 0.35 + 2.4 * ep + (S.vinto ? 0.25 * Math.sin(S.t * 4) : 0.12 * Math.sin(S.t * 5));
    matFessura.opacity = 0.75 + 0.2 * Math.sin(S.t * 6.3) - 0.3 * ep;
    aloneFessura.material.opacity = 0.3 + 0.5 * ep;
    schegge.forEach(function (m, i) {
      const f = m.userData.f; m.rotation.set(S.t * 1.3 + f, S.t * 1.9 + f, 0);
      if (S.porta >= 1) {                                   // aperta: volano verso il ragazzo e spariscono
        const u = Math.min(1, Math.max(0, (S.porta2 = (S.porta2 || 0)) - i * 0.06));
        tmpP.set(giocatore.pos.x, 1.0, giocatore.pos.z);
        m.position.lerpVectors(m.userData.base, tmpP, liscia(u)); m.scale.setScalar(1 - 0.8 * u); m.visible = u < 1;
      } else m.position.set(m.userData.base.x, m.userData.base.y + 0.05 * Math.sin(S.t * 2 + f), m.userData.base.z);
    });
    if (S.porta >= 1) { const prima = S.porta2 || 0; S.porta2 = prima + dt / 1.2; if (prima < 0.05 && S.porta2 >= 0.05 && PZ.audio.pietra) PZ.audio.pietra(); }
    // l'ansia: la lampadina sfarfalla sempre di più, la luce rossa sale, la nebbia si chiude
    S.flick -= dt;
    let lb = 1.0;
    if (S.flick < 0) { if (rnd() < 0.05 + 0.5 * kT) { S.flickDur = 0.04 + rnd() * (0.08 + 0.25 * kT); S.flick = S.flickDur + rnd() * (1.6 - 1.4 * kT); } else S.flick = 0.15; }
    if (S.flickDur > 0) { S.flickDur -= dt; lb = rnd() < 0.5 ? 0.08 : 0.35; }
    lampadina.intensity = (1.6 - 0.35 * kT) * lb; bulbo.material.color.setHex(lb < 0.5 ? 0x3a2a14 : 0xffe0a0);
    luceRossa.intensity = 2.2 * kT * kT * (0.8 + 0.2 * Math.sin(S.t * 3.3));
    sc.fog.far = 13 - 3.5 * kT; sc.fog.near = 5 - 1.5 * kT;
    PZ.opacita(ui.velo, Math.min(0.9, 0.5 * kT * kT + (S.uscita && S.uscita.preso ? 0.5 : 0)));
    if (A()) A().ronzio(S.fase === 'gioca' ? 0.1 + 0.9 * kT : 0);
    // i suoni del demone: sempre più vicini e più fitti (da lontano a sinistra o a destra, poi da dietro la scala)
    if (gioca && !S.vinto) {
      S.prossimoSuono -= dt;
      if (S.prossimoSuono <= 0) {
        S.prossimoSuono = (5.5 - 4.2 * kT) * (0.7 + 0.6 * rnd());
        const pan = (rnd() - 0.5) * 1.6 * (1 - 0.6 * kT), vol = 0.15 + 0.85 * kT, q = rnd();
        if (q < 0.4) { if (A()) A().colpo(vol, pan); if (kT > 0.4) S.scossa = Math.max(S.scossa, 0.15 + 0.3 * kT); }
        else if (q < 0.7) { if (A()) A().raschio(vol, pan); }
        else if (PZ.audio.ringhio) PZ.audio.ringhio(vol, pan);
      }
      S.prossimoBattito -= dt;
      if (kT > 0.3 && S.prossimoBattito <= 0) { S.prossimoBattito = 1.15 - 0.6 * kT; if (PZ.audio.battito) PZ.audio.battito(0.8 + 0.8 * kT); }
    }
    S.prossimaGoccia -= dt;
    if (S.prossimaGoccia <= 0) { S.prossimaGoccia = 0.9 + rnd() * 2.2; if (A()) A().goccia(0.5, (rnd() - 0.5) * 1.4); }
    gocce.forEach(function (g) { g.userData.y -= dt * 4; if (g.userData.y < 0) { g.userData.y = ALTO; g.userData.x = (rnd() - 0.5) * 3.8; g.userData.z = (rnd() - 0.5) * 5.5; } g.position.set(g.userData.x, g.userData.y, g.userData.z); });
    // occhi nel buio (dalla metà del tempo): in un angolo lontano dalla luce, per un attimo
    if (kT > 0.5 && !S.vinto && !AT.on && rnd() < dt * (0.25 + 0.8 * kT) && !S.occhiT) {
      S.occhiT = 0.5 + rnd() * 0.9; const ang = [[1.95, 0.2, -2.7], [1.95, 0.9, 3.1], [-1.95, 1.6, 0.9], [0.4, 0.4, 3.3]][Math.floor(rnd() * 4)];
      occhi[0].position.set(ang[0] - 0.07, ang[1] + 0.9, ang[2]); occhi[1].position.set(ang[0] + 0.07, ang[1] + 0.9, ang[2]);
    }
    if (S.occhiT > 0) { S.occhiT -= dt; matOcchi.opacity = Math.min(1, S.occhiT * 4) * (0.6 + 0.4 * kT); if (S.occhiT <= 0) { S.occhiT = 0; matOcchi.opacity = 0; } }
    if (!S.uscita) passoAttesa(dt);
    // uscita (scala o demone): nero, poi si torna in strada
    if (S.uscita) {
      S.uscita.t += dt;
      if (S.uscita.preso) { luceRossa.intensity = 3; lampadina.intensity = rnd() < 0.5 ? 0 : 0.3; if (!AT.on) appareAlleSpalle(); AT.corsa = true; }
      const raggiunto = S.uscita.preso && passoAttesa(dt);
      if (S.uscita.preso && (raggiunto || S.uscita.t > 1.2)) {             // (fase 80b-c) ti ha raggiunto: il jumpscare qui sotto
        togliAttesa();
        const f = S.fine; chiudiSotto(); iniziaJumpscare();
        if (f) f({ premio: 0, preso: true, sotto: true });
        return;
      }
      if (!S.uscita.preso && S.uscita.t > 0.05 && ui.nero.style.opacity !== '1') { ui.nero.style.transition = 'opacity ' + (S.uscita.preso ? '.25s' : '.45s'); ui.nero.style.opacity = '1'; }
      if (S.uscita.t > (S.uscita.preso ? 0.9 : 0.6)) {
        const esito = S.uscita.esito, f = S.fine;
        chiudiSotto(); ui.nero.style.transition = 'opacity .5s';
        if (f) f(esito);
        return;
      }
    }
    // telecamera dall'alto, come nella cameretta (il muro sud non c'è: si vede sempre dentro)
    const gx = giocatore.pos.x, gz = giocatore.pos.z;
    tmpP.set(gx * 0.3, 5.6, Math.min(gz + 4.4, 6.6));
    tmpF.set(gx * 0.45, 0.4, Math.min(gz - 0.9, 1.0));
    if (AT.on) { tmpP.y += 0.6; tmpP.z += 0.6; tmpF.y += 0.5; tmpF.z = Math.min(tmpF.z, (gz + AT.z) / 2); }   // (fase 80c) si vede anche la sua testa
    const k = 1 - Math.exp(-dt * 5);
    camPos.lerp(tmpP, k); camFuoco.lerp(tmpF, k);
    cam.position.copy(camPos);
    if (S.scossa > 0) { S.scossa = Math.max(0, S.scossa - dt * 1.5); cam.position.x += (rnd() - 0.5) * S.scossa * 0.3; cam.position.y += (rnd() - 0.5) * S.scossa * 0.25; }
    if (kT > 0.75 && !S.vinto) { cam.position.x += (rnd() - 0.5) * 0.03 * kT; cam.position.y += (rnd() - 0.5) * 0.03 * kT; }
    cam.lookAt(camFuoco);
  }
  function disegna() {
    const w = renderer.domElement.width, h = renderer.domElement.height;
    if (Math.abs(cam.aspect - w / h) > 1e-3) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    renderer.render(sc, cam);
  }
  // prepara i materiali della camera (dietro lo schermo nero del caricamento), così la prima discesa non scatta
  function prepara() {
    try { nuovaSoluzione(); S.simboli = []; demoneS.mostra(); demoneS.posiziona(0, 0, DZ, 0); renderer.compile(sc, cam); renderer.render(sc, cam); demoneS.nascondi(); } catch (e) { console.warn(e); }
  }
  return { reset: reset, suRiga: suRiga, aggiorna: aggiorna, davanti: davanti, metri: metri, entra: entra, passo: passo, disegna: disegna, prepara: prepara, jumpscare: jumpscare,
    attivo: function () { return S.attivo; },
    stato: S, strada: st, gruppo: strada, scena: sc, camera: cam, giocatore: giocatore, VALV: VALV, interagisci: interagisci, vicino: vicino, giraValvola: giraValvola, risali: risali,
    disponibile: disponibile };
};
