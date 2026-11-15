// (fase 72) OMBRE PROIETTATE: il protagonista (ragazzo + bici) e le auto proiettano a terra la loro sagoma esatta,
// che si muove con loro (le gambe che pedalano, le ruote, la bici che si inclina, l'auto che sbanda), più una macchia
// morbida proprio sotto, dove toccano terra. Funziona a ogni qualità grafica e su ogni telefono: non usa le "shadow
// map" (pesanti), ma copie appiattite dei modelli (stessa geometria, nessuna memoria in più).
//
// Come funziona: ogni pezzo del modello ha una copia scura che la scheda video schiaccia sul piano del terreno lungo
// la direzione della luce (una matrice di proiezione). Le copie si sovrappongono senza scurirsi due volte (stencil):
// l'ombra è un'unica sagoma uniforme. La foschia le sfuma con la distanza, come tutto il resto.
//
//   const O = PZ.creaOmbre(scena, { luce: [x, y, z], opacita });   luce = la direzione in cui VIAGGIA la luce
//   O.segui(gruppo, { macchia: [rx, rz], terra: f })   questo gruppo (e tutto ciò che contiene) fa ombra, ogni
//                                         fotogramma; macchia = la macchia morbida sotto (raggi in metri); terra(x, z) =
//                                         la quota del terreno: se c'è, l'ombra si stende su un piano che segue la
//                                         pendenza del terreno sotto l'oggetto (scogliera), se no sul piano comune
//   O.piano(nx, ny, nz, d)                il piano comune del terreno: n·p = d (strada: 0, 1, 0, 0,012)
//   O.statica(gruppo, padre)              ombra fissa, calcolata una volta (auto parcheggiate)
//   O.macchia(raggioX, raggioZ)           una macchia morbida da posare sotto un oggetto (restituisce la Mesh)
//   O.aggiorna()                          da chiamare subito prima del disegno
PZ.creaOmbre = function (scena, opz) {
  opz = opz || {};
  const V3 = THREE.Vector3;
  const L = new V3().fromArray(opz.luce || [0.25, -1, 0.6]);
  if (L.y > -0.45 * L.length()) { L.y = -0.45 * Math.hypot(L.x, L.z) / Math.sqrt(1 - 0.45 * 0.45); }   // mai ombre infinite (luce troppo radente)
  L.normalize();
  const N = new V3(0, 1, 0); let D = 0.012;
  const P = new THREE.Matrix4();
  // proiezione lungo L sul piano N·p = D:  p' = p - L * (N·p - D) / (N·L)
  function calcola(P, N, D) {
    const k = 1 / N.dot(L);
    P.set(
      1 - L.x * N.x * k, -L.x * N.y * k, -L.x * N.z * k, L.x * D * k,
      -L.y * N.x * k, 1 - L.y * N.y * k, -L.y * N.z * k, L.y * D * k,
      -L.z * N.x * k, -L.z * N.y * k, 1 - L.z * N.z * k, L.z * D * k,
      0, 0, 0, 1);
  }
  calcola(P, N, D);
  const mat = new THREE.MeshBasicMaterial({
    color: opz.colore || 0x000000, transparent: true, opacity: opz.opacita === undefined ? 0.5 : opz.opacita, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp
  });
  mat.side = THREE.DoubleSide;                            // la proiezione può girare le facce: le teniamo tutte
  // la macchia morbida: un disco sfumato (più scuro al centro)
  const texMacchia = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    r.addColorStop(0, 'rgba(0,0,0,0.85)'); r.addColorStop(0.55, 'rgba(0,0,0,0.5)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const matMacchia = new THREE.MeshBasicMaterial({ map: texMacchia, transparent: true, depthWrite: false, opacity: opz.opacitaMacchia === undefined ? 0.75 : opz.opacitaMacchia,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const geoMacchia = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

  // chi fa ombra: nessuna luce, niente di trasparente (bagliori, fasci dei fari), niente sprite
  function faOmbra(o) {
    if (!o.isMesh || o.isInstancedMesh || o.userData.senzaOmbra) return false;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    return !!m && !m.transparent && m.blending === THREE.NormalBlending && m !== mat && m !== matMacchia;
  }
  const seguiti = [], copie = new Map(); let giro = 0;
  function segui(g, o) {
    if (seguiti.some(function (x) { return x.g === g; })) return;
    o = o || {};
    const s = { g: g, terra: o.terra || null, P: o.terra ? new THREE.Matrix4() : P, N: new V3(0, 1, 0), D: D, macchia: null, conta: 0, ult: new V3(1e9, 0, 0) };
    if (o.macchia) { s.macchia = macchia(o.macchia[0], o.macchia[1]); s.mr = o.macchia; scena.add(s.macchia); }
    seguiti.push(s);
  }
  // il punto di riferimento dell'oggetto: la media delle origini dei suoi pezzi visibili (ruote e telaio, gambe e busto)
  const rif = new V3(), tmp = new V3(), a = new V3(), b = new V3(), q = new THREE.Quaternion(), SU = new V3(0, 1, 0), dirO = new V3();
  function riferimento(g) {
    let n = 0; rif.set(0, 0, 0);
    g.traverseVisible(function (o) { if (o.isMesh && faOmbra(o)) { rif.add(tmp.setFromMatrixPosition(o.matrixWorld)); n++; } });
    if (n) rif.multiplyScalar(1 / n); else rif.setFromMatrixPosition(g.matrixWorld);
    return n;
  }
  // il piano del terreno sotto l'oggetto, dalla quota in tre punti (lì, verso dove cade l'ombra, di lato)
  const lh = new V3();
  function pianoTerra(s) {
    lh.set(L.x, 0, L.z); if (lh.lengthSq() < 1e-6) lh.set(0, 0, 1); lh.normalize();
    const x = rif.x, z = rif.z, y0 = s.terra(x, z);
    a.set(lh.x * 1.6, s.terra(x + lh.x * 1.6, z + lh.z * 1.6) - y0, lh.z * 1.6);
    b.set(-lh.z * 1.2, s.terra(x - lh.z * 1.2, z + lh.x * 1.2) - y0, lh.x * 1.2);
    s.N.crossVectors(b, a).normalize(); if (s.N.y < 0) s.N.negate();
    if (s.N.y < 0.5) s.N.set(0, 1, 0);                    // pendenze assurde (un bordo, un sasso): piano orizzontale
    s.D = s.N.x * x + s.N.y * (y0 + 0.03) + s.N.z * z;
    calcola(s.P, s.N, s.D);
  }
  function copia(m) {
    let c = copie.get(m);
    if (!c) {
      c = new THREE.Mesh(m.geometry, mat);
      c.matrixAutoUpdate = false; c.frustumCulled = false; c.renderOrder = -1; c.userData.senzaOmbra = true;
      scena.add(c); copie.set(m, c);
    }
    if (c.geometry !== m.geometry) c.geometry = m.geometry;   // (il ragazzo ricostruisce i suoi pezzi: la copia segue)
    return c;
  }
  function aggiorna() {
    giro++;
    for (let i = 0; i < seguiti.length; i++) {
      const s = seguiti[i], g = s.g;
      let vis = g.visible && !!g.parent;
      for (let p = g.parent; vis && p; p = p.parent) vis = p.visible;
      if (!vis) { if (s.macchia) s.macchia.visible = false; continue; }
      g.updateMatrixWorld();
      if (s.terra || s.macchia) riferimento(g);
      // il piano del terreno si ricalcola ogni 6 fotogrammi, o subito se l'oggetto si è spostato di più di mezzo metro
      if (s.terra && (s.conta-- <= 0 || Math.abs(rif.x - s.ult.x) + Math.abs(rif.z - s.ult.z) > 0.5)) { pianoTerra(s); s.conta = 6; s.ult.copy(rif); }
      const Pm = s.terra ? s.P : P;
      g.traverseVisible(function (o) {
        if (!faOmbra(o)) return;
        const c = copia(o);
        c.matrix.multiplyMatrices(Pm, o.matrixWorld); c.matrixWorldNeedsUpdate = true;
        c.visible = true; c.userData.giro = giro;
      });
      if (s.macchia) {
        // la macchia: sotto l'oggetto, sul suo piano, girata come lui; si stringe se l'oggetto si alza (salto)
        const Nn = s.terra ? s.N : N, Dd = s.terra ? s.D : D;
        const h = Nn.x * rif.x + Nn.y * rif.y + Nn.z * rif.z - Dd;
        const piede = rif.clone().addScaledVector(Nn, -h + 0.004);
        const alto = Math.max(0, h - (s.mr[2] || 0.6));
        const k = Math.max(0, 1 - alto / 1.6);
        s.macchia.visible = k > 0.05;
        s.macchia.position.copy(piede);
        dirO.set(0, 0, 1).applyQuaternion(g.getWorldQuaternion(q)); dirO.addScaledVector(Nn, -dirO.dot(Nn));
        const yaw = Math.atan2(dirO.x, dirO.z);
        s.macchia.quaternion.setFromUnitVectors(SU, Nn).multiply(q.setFromAxisAngle(SU, yaw));
        s.macchia.scale.set(s.mr[0] * (0.5 + 0.5 * k), 1, s.mr[1] * (0.5 + 0.5 * k));
      }
    }
    copie.forEach(function (c, m) {
      if (c.userData.giro !== giro) c.visible = false;
      if (!m.parent && c.userData.giro !== giro) { scena.remove(c); copie.delete(m); }   // pezzi buttati via
    });
  }
  function piano(nx, ny, nz, d) { N.set(nx, ny, nz).normalize(); D = d; calcola(P, N, D); }
  // un'ombra fissa: la sagoma del gruppo già appiattita, unita in un'unica geometria e aggiunta a "padre"
  // (il gruppo resta com'è: serve solo da stampo)
  function statica(stampo, padre) {
    stampo.updateMatrixWorld(true);
    const pos = [], tmp = new V3(), M = new THREE.Matrix4();
    stampo.traverse(function (o) {
      if (!faOmbra(o)) return;
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = geo.attributes.position;
      M.multiplyMatrices(P, o.matrixWorld);
      for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i).applyMatrix4(M); pos.push(tmp.x, tmp.y, tmp.z); }
      if (geo !== o.geometry) geo.dispose();
    });
    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, mat); m.renderOrder = -1; m.userData.senzaOmbra = true;
    padre.add(m);
    return m;
  }
  function macchia(rx, rz) {
    const m = new THREE.Mesh(geoMacchia, matMacchia); m.scale.set(rx, 1, rz); m.renderOrder = -1; m.userData.senzaOmbra = true;
    return m;
  }
  return { segui: segui, aggiorna: aggiorna, piano: piano, statica: statica, macchia: macchia, luce: L, materiale: mat };
};
