// (fase 81) LO SFONDO DEL MENU: il ragazzo e lei che camminano mano nella mano sul sentiero della scogliera, al
// tramonto, verso il mare. È la scena vera del gioco (lo stesso terreno della scogliera, gli stessi modelli), qui
// colorata dalla luce dorata del sole basso: un ricordo, prima di tutto. La telecamera li segue da dietro; quando
// arrivano in fondo al sentiero l'immagine sfuma e la passeggiata ricomincia.
//   const M = PZ.creaSfondoMenu(renderer)   M.passo(dt) (aggiorna e disegna)   M.libera() (quando si entra nel gioco)
PZ.creaSfondoMenu = function (renderer) {
  const V3 = THREE.Vector3, A = PZ.anim, SCH = PZ.CONFIG.schermo, P1 = PZ.ps1;
  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, SCH.larghezzaInterna / SCH.altezzaInterna, 0.1, 2500);

  // ---------- Il cielo del tramonto: viola in alto, rosso, poi arancio e ambra sull'orizzonte (a fasce, PS1) ----------
  const righe = 40, cv = document.createElement('canvas'); cv.width = 1; cv.height = righe;
  const g = cv.getContext('2d');
  const cima = new THREE.Color(0x1c1236), viola = new THREE.Color(0x5a2a5a), rosso = new THREE.Color(0xc0504a), ambra = new THREE.Color(0xffb04a), sotto = new THREE.Color(0x6a3a3a);
  for (let i = 0; i < righe; i++) {
    const k = i / (righe - 1);                    // 0 = cima, 0,5 = orizzonte, 1 = sotto
    let c;
    if (k < 0.5) { const u = k / 0.5; c = cima.clone().lerp(viola, Math.min(1, u * 1.6)).lerp(rosso, Math.max(0, (u - 0.55) / 0.3) * 1).lerp(ambra, Math.pow(Math.max(0, (u - 0.8) / 0.2), 1.3)); }
    else c = ambra.clone().lerp(sotto, Math.min(1, (k - 0.5) * 6));
    g.fillStyle = '#' + c.getHexString(); g.fillRect(0, i, 1, 1);
  }
  const texCielo = new THREE.CanvasTexture(cv); texCielo.magFilter = texCielo.minFilter = THREE.NearestFilter;
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, fog: false, depthWrite: false }));
  cielo.renderOrder = -10; scena.add(cielo);
  // il sole: basso sul mare, davanti a loro (un disco e due aloni a fasce)
  const DIR_SOLE = new V3(-0.12, 0.045, -1).normalize();
  const sole = new THREE.Group(); scena.add(sole);
  const alone1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: P1.alone(255, 170, 80, 7), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
  alone1.scale.set(380, 380, 1); sole.add(alone1);
  const alone2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: P1.alone(255, 220, 140, 5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 1 }));
  alone2.scale.set(110, 110, 1); sole.add(alone2);
  const disco = new THREE.Mesh(new THREE.CircleGeometry(26, 20), new THREE.MeshBasicMaterial({ color: 0xffe6a0, fog: false, depthWrite: false }));
  sole.add(disco);
  // stelle appena accese in alto (il cielo verso la notte del gioco)
  const nS = 120, posS = new Float32Array(nS * 3), rs = P1.casuale(19);
  for (let i = 0; i < nS; i++) { const az = rs() * Math.PI * 2, el = Math.asin(0.45 + rs() * 0.55); posS[i * 3] = Math.cos(az) * Math.cos(el) * 800; posS[i * 3 + 1] = Math.sin(el) * 800; posS[i * 3 + 2] = Math.sin(az) * Math.cos(el) * 800; }
  const geoS = new THREE.BufferGeometry(); geoS.setAttribute('position', new THREE.BufferAttribute(posS, 3));
  const stelle = new THREE.Points(geoS, new THREE.PointsMaterial({ color: 0xffd8c8, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.55 }));
  stelle.frustumCulled = false; scena.add(stelle);

  // ---------- Il mare e la scogliera del finale, nei colori del tramonto ----------
  const prima = scena.children.length;
  const oceano = PZ.creaOceano(scena);
  const mare = scena.children[prima];
  if (mare && mare.material) { mare.material.color.setHex(0x3a2440); mare.material.specular.setHex(0xffa450); mare.material.shininess = 26; }
  const terra = PZ.creaTerra(scena);
  const tinta = function (mesh, colori, seme) { if (mesh && mesh.material && mesh.material.map) { const t = P1.texture(colori, 16, 1, 1, seme); mesh.material.map = t; mesh.material.needsUpdate = true; } };
  tinta(terra.superfici[0], [0x2e2a1c, 0x3a3522, 0x47402a, 0x564d32], 4);           // erba secca
  tinta(terra.superfici[1], [0x3e2e30, 0x4e3a3a, 0x624844, 0x7a5a50], 3);           // roccia calda
  tinta(terra.superfici[2], [0x6a5444, 0x76604e, 0x846c58, 0x947a62], 5);           // sterrato
  if (terra.lampione) terra.lampione.intensity = 0.7;                              // il lampione si è appena acceso
  scena.fog = new THREE.FogExp2(0xb8684e, 0.0021);
  scena.add(new THREE.HemisphereLight(0xffb27a, 0x3a2438, 1.15));
  const luceSole = new THREE.DirectionalLight(0xffa458, 2.1);
  luceSole.target.position.set(0, 0, 0); luceSole.position.copy(DIR_SOLE).multiplyScalar(300); scena.add(luceSole, luceSole.target);
  const riempi = new THREE.DirectionalLight(0x9a78b8, 0.55); riempi.position.set(10, 30, 120); scena.add(riempi);

  // ---------- Loro due ----------
  const ragazzo = PZ.creaRagazzo(scena);
  const lei = PZ.creaRagazza(scena, 'fissa', 3, { naturale: true, cammina: true });
  lei.mostra();
  const O = lei.ossa;
  const Pz = { pos: new V3(), dir: 0, dirPiedi: 0, bacino: { x: 0, z: 0 }, busto: { x: 0, y: 0, z: 0 }, testa: { x: 0, y: 0, z: 0 },
    sguardo: 0, giro: 0, mani: { sx: new V3(), dx: new V3() }, piedi: { sx: new V3(), dx: new V3() }, punte: { sx: 0, dx: 0 } };
  const percorso = terra.percorso, L = percorso.getLength();
  percorso.arcLengthDivisions = 2000; percorso.updateArcLengths();
  const punto = function (s, out) { return percorso.getPointAt(Math.max(0, Math.min(1, s / L)), out); };
  const quota = function (x, z) { return terra.quota(x, z) + 0.08; };
  const S_INIZIO = 14, S_FINE = L - 16, VEL = 1.0, MEZZO = 0.31;        // metri; m/s; metà distanza tra i due
  const M = { s: S_INIZIO, fase: 0, t: 0, nero: 1, dtL: 0 };
  const c = new V3(), avanti = new V3(), sinistra = new V3(), dietro = new V3(), davanti = new V3(), mano = new V3();
  const ALTEZZA = 0.92, CAVIGLIA = 0.077, vel = 0.75;

  function posaLui(x, z, dir, fase) {
    const gz = quota(x, z);
    const s = Math.sin(fase), co = Math.cos(fase);
    avanti.set(Math.sin(dir), 0, Math.cos(dir)); sinistra.set(Math.cos(dir), 0, -Math.sin(dir));
    Pz.pos.set(x, gz + ALTEZZA - 0.012 + 0.025 * Math.abs(co) * vel, z);
    Pz.dir = dir; Pz.dirPiedi = dir;
    Pz.bacino.x = 0.03 * vel; Pz.bacino.z = -0.035 * s * vel;
    Pz.busto.x = 0.06 * vel; Pz.busto.y = -0.1 * s * vel; Pz.busto.z = 0.03 * s * vel;
    Pz.testa.x = 0.06; Pz.testa.y = -0.18 + 0.06 * s * vel; Pz.testa.z = -0.04;      // la testa appena girata verso di lei
    [['sx', 1, 0], ['dx', -1, Math.PI]].forEach(function (gg) {
      const n = gg[0], lato = gg[1], f = fase + gg[2];
      const passo = 0.3 * Math.sin(f) * vel, alza = Math.max(0, Math.cos(f)) * 0.13 * vel;
      Pz.piedi[n].set(x, 0, z).addScaledVector(avanti, passo).addScaledVector(sinistra, lato * 0.11);
      Pz.piedi[n].y = quota(Pz.piedi[n].x, Pz.piedi[n].z) + CAVIGLIA + alza;
      Pz.punte[n] = 0.35 * Math.cos(f) * vel;
      const osc = -Math.sin(f - 0.35), am = Math.max(0, osc), im = Math.max(0, -osc);
      Pz.mani[n].set(x, 0, z).addScaledVector(avanti, 0.035 + (0.2 * am - 0.15 * im) * vel).addScaledVector(sinistra, lato * (0.215 - 0.03 * am * vel + 0.02 * im * vel));
      Pz.mani[n].y = gz + ALTEZZA - 0.13 + (0.075 * am + 0.015 * im) * vel;
    });
    const dy = A.quotaBacino(Pz.pos, Pz.piedi, dir) - Pz.pos.y;
    Pz.pos.y += dy; Pz.mani.sx.y += dy;
    Pz.mani.dx.copy(mano);                                  // la mano destra stringe quella di lei
    ragazzo.posa(Pz); ragazzo.conferma();
  }
  function posaLei(x, z, dir, fase) {
    const gz = quota(x, z);
    lei.gruppo.position.set(x, gz, z); lei.gruppo.rotation.y = dir;
    const s = Math.sin(fase);
    O.bacino.position.y = 0.86 + 0.014 * Math.cos(2 * fase);
    O.bacino.rotation.set(0, 0.06 * s, 0);
    ['sx', 'dx'].forEach(function (n, i) {
      const a = O.A[n], f = fase + (i ? Math.PI : 0), sn = Math.sin(f);
      a.anca.rotation.set(-0.34 * sn, 0, -a.s * 0.02);
      a.ginocchio.rotation.set(0.06 + 0.55 * Math.max(0, Math.sin(f + 1.9)), 0, 0);
      a.caviglia.rotation.set(-0.08 + 0.25 * Math.max(0, Math.sin(f - 0.6)), 0, 0);
    });
    // il braccio sinistro verso di lui (le mani unite), il destro che oscilla piano
    O.A.sx.spalla.rotation.set(-0.12, 0, 0.36); O.A.sx.gomito.rotation.set(-0.12, 0, 0); O.A.sx.polso.rotation.set(0, 0, -0.2);
    O.A.dx.spalla.rotation.set(0.22 * Math.sin(fase), 0, -0.06); O.A.dx.gomito.rotation.set(-0.12 - 0.08 * Math.max(0, -Math.sin(fase)), 0, 0); O.A.dx.polso.rotation.set(0, 0, 0.1);
    O.busto.rotation.set(-0.02, -0.05 * s, 0);
    O.testa.rotation.set(0.04, 0.22, 0.1);                   // guarda un poco verso di lui
    lei.gruppo.updateMatrixWorld(true);
    O.A.sx.polso.getWorldPosition(mano);                      // dove arriva la sua mano: lì va quella di lui
    mano.y -= 0.06;
  }
  function passo(dtVero) {
    // (fase 82b) passo ammorbidito: un fotogramma più lento non dà uno strappo alla camminata
    M.dtL += (Math.min(0.05, dtVero) - M.dtL) * 0.12;
    const dt = M.dtL;
    M.t += dt;
    M.s += VEL * dt; M.fase += dt * 8.2 * vel;
    if (M.s > S_FINE) M.nero = Math.min(1, M.nero + dt / 1.2);
    else M.nero = Math.max(0, M.nero - dt / 1.6);
    if (M.s > S_FINE + 1.4) { M.s = S_INIZIO; M.nero = 1; }
    punto(M.s, c); punto(M.s + 0.6, davanti);
    const dir = Math.atan2(davanti.x - c.x, davanti.z - c.z);
    sinistra.set(Math.cos(dir), 0, -Math.sin(dir));
    // lei a destra di lui (la mano sinistra di lei nella destra di lui)
    posaLei(c.x - sinistra.x * MEZZO, c.z - sinistra.z * MEZZO, dir, M.fase + 0.4);
    posaLui(c.x + sinistra.x * MEZZO, c.z + sinistra.z * MEZZO, dir, M.fase);
    // la telecamera: dietro e un po' più in alto, guarda lontano verso il mare (loro restano nella parte bassa)
    punto(M.s - 11, dietro); punto(M.s + 30, davanti);
    const yc = quota(c.x, c.z);
    camera.position.set(dietro.x + 0.3 * Math.sin(M.t * 0.13), yc + 3.0 + 0.1 * Math.sin(M.t * 0.21), dietro.z);
    camera.lookAt(davanti.x, yc + 9.6, davanti.z);
    cielo.position.copy(camera.position); stelle.position.copy(camera.position);
    sole.position.copy(camera.position).addScaledVector(DIR_SOLE, 780); sole.lookAt(camera.position);
    alone1.material.opacity = 0.82 + 0.06 * Math.sin(M.t * 0.7);
    oceano.aggiorna(M.t);
    const w = renderer.domElement.width, h = renderer.domElement.height;
    if (Math.abs(camera.aspect - w / h) > 1e-3) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    renderer.render(scena, camera);
    return M.nero;
  }
  // (fase 82b) disegna una volta TUTTO (anche ciò che è fuori inquadratura): programmi e immagini pronti prima di partire
  function prepara() {
    const salvati = [];
    scena.traverse(function (o) { salvati.push([o, o.frustumCulled]); o.frustumCulled = false; });
    passo(0);
    salvati.forEach(function (v) { v[0].frustumCulled = v[1]; });
  }
  function libera() {
    scena.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }
  const out = { passo: passo, prepara: prepara, libera: libera, scena: scena, camera: camera, stato: M, L: L, lei: lei, ragazzo: ragazzo };
  window.__menu = out;   // utile per le prove automatiche
  return out;
};
