// Transenne dei lavori in corso: pannello a strisce bianche e rosse su due gambe, lampeggiante giallo in cima.
// Si superano solo saltando (o cambiando corsia). Sono tutte nello stesso "InstancedMesh": qualunque numero di
// transenne in scena costa due sole chiamate alla scheda video (corpo e lampeggianti).
// Coordinate di una transenna: centrata sulla corsia, pannello rivolto verso +z (verso chi arriva in bici).
PZ.creaTransenne = function (scena, materiali, capacita) {
  const LARGHEZZA = 1.55, ALTEZZA = 0.82;          // larghezza del pannello e altezza del suo bordo superiore
  const C = new PZ.Costruttore();
  const ROSSO = 0xc0222c, BIANCO = 0xf2efe8, SCURO = 0x2a2c31;
  [-1, 1].forEach(function (s) {
    C.scatola('colori', 0.06, 0.96, 0.06, s * 0.71, 0, 0, 0x8d9096);                 // gambe
    C.scatola('colori', 0.1, 0.05, 0.62, s * 0.71, 0, 0, SCURO);                     // piedi
  });
  C.scatola('colori', LARGHEZZA, 0.24, 0.035, 0, ALTEZZA - 0.24, 0, ROSSO);          // pannello (fondo rosso)
  C.scatola('colori', LARGHEZZA - 0.1, 0.06, 0.03, 0, 0.3, 0, ROSSO);                 // traversa bassa
  // strisce bianche oblique sul davanti del pannello
  const y0 = ALTEZZA - 0.24, y1 = ALTEZZA, z = 0.02, w = 0.12, passo = 0.26, inclina = 0.14, mezza = LARGHEZZA / 2;
  for (let x = -mezza - inclina; x < mezza; x += passo) {
    const a0 = Math.max(-mezza, Math.min(mezza, x)), b0 = Math.max(-mezza, Math.min(mezza, x + w));
    const a1 = Math.max(-mezza, Math.min(mezza, x + inclina)), b1 = Math.max(-mezza, Math.min(mezza, x + w + inclina));
    if (b0 - a0 < 0.005 && b1 - a1 < 0.005) continue;
    C.quad('colori', [a0, y0, z], [b0, y0, z], [b1, y1, z], [a1, y1, z], null, BIANCO);
  }
  C.scatola('colori', 0.15, 0.1, 0.1, -0.71, 0.93, 0, SCURO);                        // scatola del lampeggiante
  const geo = C.crea({ colori: materiali.colori }).children[0].geometry;
  const corpo = new THREE.InstancedMesh(geo, materiali.colori, capacita);
  const matLuce = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  const luci = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.13, 0.09), matLuce, capacita);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  [corpo, luci].forEach(function (m) {
    m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < capacita; i++) m.setMatrixAt(i, ZERO);
    scena.add(m);
  });
  const el = [];
  for (let i = 0; i < capacita; i++) el.push({ attiva: false, x: 0, z: 0, caduta: 0, cade: false, dx: 0, dz: 0, y: 0, vx: 0, vy: 0, vz: 0, giro: 0, imbardata: 0, aTerra: false });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), p = new THREE.Vector3(), uno = new THREE.Vector3(1, 1, 1);
  const lp = new THREE.Vector3(-0.71, 1.04, 0.01);
  let t = 0;
  function prendi() { for (let i = 0; i < capacita; i++) if (!el[i].attiva) return i; return -1; }
  function posa(i, x, zz) {
    const o = el[i]; o.attiva = true; o.x = x; o.z = zz; o.caduta = 0; o.cade = false;
    o.dx = o.dz = o.y = o.vx = o.vy = o.vz = o.giro = o.imbardata = 0; o.aTerra = false;
  }
  function sposta(i, x, zz) { el[i].x = x; el[i].z = zz; }
  function libera(i) { el[i].attiva = false; }
  // urtata dalla bici: vola via in avanti e di lato (verso = -1 sinistra, +1 destra), si rovescia e finisce a terra
  // fuori dalla traiettoria della bici, così le ruote non la attraversano. vel = velocità della bici (m/s).
  function abbatti(i, verso, vel) {
    const o = el[i]; if (o.cade) return;
    o.cade = true; o.caduta = 0; o.aTerra = false;
    o.vx = (verso || 1) * 2.7; o.vy = 2.1; o.vz = -((vel || 8) + 1.6); o.giro = (verso || 1) * 2.2;
  }
  function aggiorna(dt) {
    t += dt;
    // lampeggio: tutti insieme, come le lampade dei cantieri
    matLuce.color.setHex(Math.floor(t / 0.42) % 2 ? 0x5a3608 : 0xffc23a);
    for (let i = 0; i < capacita; i++) {
      const o = el[i];
      if (!o.attiva) { corpo.setMatrixAt(i, ZERO); luci.setMatrixAt(i, ZERO); continue; }
      let k = 0;
      if (o.cade) {
        // volo semplice (gravità), poi scivola sull'asfalto e si ferma: velocità misurate rispetto alla strada
        o.caduta = Math.min(1, o.caduta + dt / 0.32); k = o.caduta * o.caduta * (3 - 2 * o.caduta);
        if (!o.aTerra) {
          o.vy -= 9.8 * dt; o.y += o.vy * dt; o.imbardata += o.giro * dt;
          if (o.y <= 0 && o.vy < 0) { o.y = 0; o.vy = 0; o.aTerra = true; }
        } else { const f = Math.exp(-dt * 5); o.vx *= f; o.vz *= f; }
        o.dx += o.vx * dt; o.dz += o.vz * dt;
      }
      e.set(-1.52 * k, o.imbardata, 0); q.setFromEuler(e);
      p.set(o.x + o.dx, o.y + 0.31 * k, o.z + o.dz);
      m4.compose(p, q, uno); corpo.setMatrixAt(i, m4);
      p.copy(lp).applyQuaternion(q); p.x += o.x + o.dx; p.y += o.y + 0.31 * k; p.z += o.z + o.dz;
      m4.compose(p, q, uno); luci.setMatrixAt(i, m4);
    }
    corpo.instanceMatrix.needsUpdate = true; luci.instanceMatrix.needsUpdate = true;
  }
  function reset() { for (let i = 0; i < capacita; i++) el[i].attiva = false; aggiorna(0); }
  return { prendi: prendi, posa: posa, sposta: sposta, libera: libera, abbatti: abbatti, aggiorna: aggiorna, reset: reset,
    LARGHEZZA: LARGHEZZA, ALTEZZA: ALTEZZA, elementi: el };
};
