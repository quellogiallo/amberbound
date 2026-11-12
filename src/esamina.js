// (fase 60) GUARDARE DA VICINO: un oggetto della cameretta in primo piano, da girare come la pietra alla fine del
// gioco (trascinando il dito o il mouse; PC: frecce o W A S D). Sotto, i pensieri del protagonista.
// L'oggetto vero resta al suo posto: qui se ne disegna una copia davanti alla telecamera; dietro, un velo scuro
// lascia appena intravedere la stanza (e lei, a terra).
//   const E = PZ.creaEsamina({ scena, camera, stage })
//   E.apri({ oggetto, titolo, pensiero, macchia, dimensione, dopo })   dopo = chiamata alla chiusura
//   E.pensiero(testo)   cambia il pensiero mentre è aperto;  E.aggiorna(dt) a ogni fotogramma;  E.aperto()
PZ.creaEsamina = function (o) {
  const scena = o.scena, camera = o.camera, stage = o.stage;
  const V3 = THREE.Vector3;
  const perno = new THREE.Group(); perno.visible = false; scena.add(perno);
  const velo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0x07030a, transparent: true, opacity: 0.8, depthWrite: false }));
  velo.visible = false; scena.add(velo);
  const luce = new THREE.PointLight(0xfff0dc, 0, 3, 2); scena.add(luce);          // sempre in scena (niente scatti)
  const luce2 = new THREE.PointLight(0xffc89a, 0, 3, 2); scena.add(luce2);

  // ---------- Interfaccia ----------
  const el = document.createElement('div'); el.id = 'esamina'; el.className = 'ui';
  el.innerHTML = '<div class="esTitolo"></div><div class="esAiuto">TRASCINA PER GIRARLO &middot; PC: FRECCE</div><div class="esPensiero"></div><div class="esTasti"><button class="esApri">APRI</button><button class="esChiudi">CHIUDI</button></div>';
  stage.appendChild(el);
  const elTitolo = el.querySelector('.esTitolo'), elPensiero = el.querySelector('.esPensiero'), btn = el.querySelector('.esChiudi'), btnApri = el.querySelector('.esApri');

  let aperto = false, copia = null, dopo = null, tAperto = 0;
  const q = new THREE.Quaternion(), qd = new THREE.Quaternion(), w = new V3(), tasti = {};
  const assiX = new V3(1, 0, 0), assiY = new V3(0, 1, 0), dir = new V3(), tmp = new V3();
  let trascina = null, tocca = null, sospeso = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const elAiuto = el.querySelector('.esAiuto'), AIUTO = elAiuto.innerHTML;

  // la pietra: in un angolo del retro, una macchia rossa (le faccette che guardano da quella parte)
  function macchiaRossa(mesh) {
    const g = mesh.geometry, P = g.attributes.position, verso = new V3(0.55, -0.25, -0.8).normalize();
    const a = new V3(), b = new V3(), c = new V3(), n = new V3(), pos = [], uv = [];
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 32, 32);
    [[16, 16, 10], [10, 20, 6], [22, 12, 5], [20, 23, 4], [8, 11, 3]].forEach(function (s) {
      x.fillStyle = '#8a0a0e'; x.beginPath(); x.arc(s[0], s[1], s[2], 0, 6.283); x.fill();
    });
    x.fillStyle = '#c4161c'; x.beginPath(); x.arc(15, 15, 6, 0, 6.283); x.fill();
    const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter;
    const u = new V3(), v = new V3(); u.crossVectors(verso, assiY).normalize(); v.crossVectors(u, verso).normalize();
    for (let i = 0; i < P.count; i += 3) {
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
      n.subVectors(c, b).cross(tmp.subVectors(a, b)).normalize();
      if (n.dot(verso) < 0.72) continue;
      [a, b, c].forEach(function (p) {
        const q2 = p.clone().addScaledVector(n, 0.0015); pos.push(q2.x, q2.y, q2.z);
        uv.push(0.5 + p.dot(u) / 0.09, 0.5 + p.dot(v) / 0.09);
      });
    }
    if (!pos.length) return;
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    mesh.add(new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4 })));
  }

  function apri(op) {
    if (aperto) chiudi(true);
    copia = op.oggetto.clone(true);
    const via = [];
    copia.traverse(function (x) { x.visible = true; if (x.isLight) via.push(x); });
    via.forEach(function (x) { x.parent.remove(x); });
    copia.position.set(0, 0, 0); copia.rotation.set(0, 0, 0); copia.scale.setScalar(1);
    if (op.macchia && copia.isMesh) macchiaRossa(copia);
    // centrata e grande uguale per tutti
    copia.updateMatrixWorld(true);
    const box = new THREE.Box3();                                   // solo le forme vere (non gli aloni)
    copia.traverse(function (x) {
      if (!x.isMesh || x.isSprite || !x.geometry) return;
      if (!x.geometry.boundingBox) x.geometry.computeBoundingBox();
      box.union(x.geometry.boundingBox.clone().applyMatrix4(x.matrixWorld));
    });
    const cen = box.getCenter(new V3()), dim = box.getSize(new V3());
    copia.position.sub(cen);
    const s = (op.dimensione || 0.26) / Math.max(dim.x, dim.y, dim.z, 0.001);
    perno.scale.setScalar(s);
    perno.add(copia); perno.visible = true; velo.visible = true;
    q.identity(); if (op.giro) q.setFromEuler(op.giro);
    w.set(0, 0, 0);
    elTitolo.textContent = op.titolo || ''; elPensiero.textContent = op.pensiero || '';
    tocca = op.tocca || null; sospeso = false;                         // (fase 61) toccare un punto (lo schermo)
    elAiuto.innerHTML = op.aiuto || AIUTO;
    btnApri.style.display = tocca ? '' : 'none';                        // (fase 62) APRI solo se c'è qualcosa da aprire
    el.classList.add('vis'); aperto = true; dopo = op.dopo || null; tAperto = performance.now();
    luce.intensity = 1.5; luce2.intensity = 0.7;
  }
  function chiudi(muto) {
    if (!aperto) return;
    if (!muto && performance.now() - tAperto < 400) return;
    aperto = false; el.classList.remove('vis');
    perno.visible = false; velo.visible = false; luce.intensity = 0; luce2.intensity = 0;
    if (copia) { perno.remove(copia); copia = null; }
    trascina = null;
    const f = dopo; dopo = null;
    if (!muto && PZ.audio.tocco) PZ.audio.tocco();
    if (f) f();
  }

  function ruota(ax, ang) { qd.setFromAxisAngle(ax, ang); q.premultiply(qd); }
  function aggiorna(dt) {
    if (!aperto) return;
    const kx = (tasti.ArrowRight || tasti.KeyD ? 1 : 0) - (tasti.ArrowLeft || tasti.KeyA ? 1 : 0);
    const ky = (tasti.ArrowDown || tasti.KeyS ? 1 : 0) - (tasti.ArrowUp || tasti.KeyW ? 1 : 0);
    if (kx || ky) w.set(ky * 2.4, kx * 2.4, 0);
    else if (!trascina) w.multiplyScalar(Math.exp(-dt * 2.5));
    ruota(assiY, w.y * dt); ruota(assiX, w.x * dt);
    if (!trascina && !kx && !ky && w.length() < 0.05) ruota(assiY, 0.2 * dt);      // da solo gira appena
    q.normalize();
    camera.updateMatrixWorld();
    camera.getWorldDirection(dir);
    perno.position.copy(camera.position).addScaledVector(dir, 0.55);
    tmp.set(0, 0.03, 0).applyQuaternion(camera.quaternion); perno.position.add(tmp);   // (fase 63) un po' più in alto: sotto ci sono i pensieri
    perno.quaternion.copy(camera.quaternion).multiply(q);
    velo.position.copy(camera.position).addScaledVector(dir, 1.3); velo.quaternion.copy(camera.quaternion);
    luce.position.copy(camera.position).add(tmp.set(0.25, 0.3, 0.1).applyQuaternion(camera.quaternion));
    luce2.position.copy(camera.position).addScaledVector(dir, 0.9).add(tmp.set(-0.3, -0.2, 0).applyQuaternion(camera.quaternion));
  }

  // ---------- Comandi ----------
  el.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    if (!aperto || sospeso || e.target === btn || e.target === btnApri) return;
    e.preventDefault();
    trascina = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), x0: e.clientX, y0: e.clientY, t0: performance.now() };
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
  });
  el.addEventListener('pointermove', function (e) {
    if (!trascina || e.pointerId !== trascina.id) return;
    const r = stage.getBoundingClientRect(), k = 6 / Math.max(1, r.width);
    const dx = (e.clientX - trascina.x) * k, dy = (e.clientY - trascina.y) * k, ora = performance.now(), dts = Math.max(0.008, (ora - trascina.t) / 1000);
    ruota(assiY, dx); ruota(assiX, dy);
    w.set(dy / dts * 0.5, dx / dts * 0.5, 0);
    trascina.x = e.clientX; trascina.y = e.clientY; trascina.t = ora;
  });
  // un tocco breve e fermo su un pezzo segnato (userData.schermo) chiama op.tocca
  function colpito(cx, cy) {
    if (!copia) return false;
    const r = stage.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    perno.updateMatrixWorld(true); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObject(copia, true);
    return h.length > 0 && !!h[0].object.userData.schermo;
  }
  const lascia = function (e) {
    if (!trascina || e.pointerId !== trascina.id) return;
    const t = trascina; trascina = null;
    if (tocca && performance.now() - t.t0 < 350 && Math.hypot(e.clientX - t.x0, e.clientY - t.y0) < 12 && colpito(e.clientX, e.clientY)) { w.set(0, 0, 0); tocca(); }
  };
  el.addEventListener('pointerup', lascia); el.addEventListener('pointercancel', lascia);
  btn.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); chiudi(false); });
  btnApri.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (aperto && !sospeso && tocca) { w.set(0, 0, 0); tocca(); } });
  window.addEventListener('keydown', function (e) {
    if (!aperto || sospeso) return;
    if (tocca && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) { e.preventDefault(); e.stopImmediatePropagation(); tocca(); return; }
    if (/Arrow|Key[WASD]/.test(e.code)) { tasti[e.code] = true; e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); chiudi(false); }
  }, true);
  window.addEventListener('keyup', function (e) { tasti[e.code] = false; }, true);

  return { apri: apri, chiudi: chiudi, aggiorna: aggiorna, aperto: function () { return aperto; },
    pensiero: function (t) { elPensiero.textContent = t; }, perno: perno,
    gira: function (ang) { ruota(assiY, ang); w.set(0, 0, 0); },   // per le prove: gira di un angolo
    sospendi: function (si) { sospeso = !!si; trascina = null; w.set(0, 0, 0); } };
};
