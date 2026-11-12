// Bicicletta gialla: telaio a tubi squadrati, ruote scure con raggi (si vede quando girano), pedali e manubrio.
// Coordinate della bici: z = avanti, y = su, +x = sinistra del ciclista, -x = sua destra. Ruote appoggiate a y = 0.
// Misure da bici da città per un ragazzo di 1,75 m: ruote da 26" (raggio 0,33 m), passo 1,05 m, sella a 0,95 m.
PZ.creaBici = function (scena) {
  const C = PZ.CONFIG.colori;
  const opaco = function (o) { o.flatShading = true; o.specular = o.specular || 0x000000; o.shininess = o.shininess || 0; return new THREE.MeshPhongMaterial(o); };
  const giallo = opaco({ color: C.giallo, emissive: 0x161b00, specular: 0x2a2a20, shininess: 18 });
  const scuro = opaco({ color: 0x0a0c11 });
  const metallo = opaco({ color: 0x353c4c, specular: 0x1c2026, shininess: 12 });

  const R = 0.33;                                  // raggio delle ruote
  const radice = new THREE.Group();                // punto a terra a metà tra le ruote: posizione, direzione, pendenza
  radice.rotation.order = 'YXZ';
  const rollio = new THREE.Group();                // inclinazione laterale attorno alla linea d'appoggio delle ruote
  radice.add(rollio);
  const telaio = new THREE.Group();
  rollio.add(telaio);
  scena.add(radice);

  const asseZ = new THREE.Vector3(0, 0, 1);
  function tubo(a, b, spessore, materiale, genitore) {
    const da = new THREE.Vector3().fromArray(a), db = new THREE.Vector3().fromArray(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(spessore, spessore, da.distanceTo(db)), materiale);
    m.position.copy(da).add(db).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(asseZ, db.clone().sub(da).normalize());
    m.castShadow = true;
    (genitore || telaio).add(m);
    return m;
  }
  function blocco(l, a, p, pos, materiale, genitore) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), materiale);
    m.position.fromArray(pos);
    m.castShadow = true;
    (genitore || telaio).add(m);
    return m;
  }

  // Punti principali del telaio
  const MOV = [0, 0.29, -0.05];                    // movimento centrale (perno dei pedali)
  const SELLA = [0, 0.86, -0.2];                   // cima del tubo piantone
  const STERZO_SU = [0, 0.86, 0.37], STERZO_GIU = [0, 0.68, 0.42];
  const DIETRO = -0.52, DAVANTI = 0.53;            // assi delle ruote

  tubo(MOV, SELLA, 0.042, giallo);                 // piantone
  tubo(SELLA, STERZO_SU, 0.042, giallo);           // tubo orizzontale
  tubo(MOV, STERZO_GIU, 0.048, giallo);            // tubo obliquo
  tubo(STERZO_GIU, STERZO_SU, 0.055, giallo);      // tubo sterzo
  [1, -1].forEach(function (s) {
    tubo([s * 0.055, R, DIETRO], [s * 0.03, 0.29, -0.06], 0.026, giallo);   // foderi bassi
    tubo([s * 0.055, R, DIETRO], [s * 0.025, 0.84, -0.19], 0.026, giallo);  // foderi alti
    tubo([s * 0.05, R, DAVANTI], [s * 0.025, 0.68, 0.42], 0.03, giallo);    // forcella
  });
  tubo(SELLA, [0, 0.93, -0.235], 0.026, metallo);  // reggisella
  blocco(0.13, 0.05, 0.27, [0, 0.955, -0.245], scuro);   // sella
  tubo(STERZO_SU, [0, 0.99, 0.33], 0.032, metallo);      // attacco manubrio
  tubo([0.27, 0.99, 0.31], [-0.27, 0.99, 0.31], 0.026, metallo); // manubrio
  blocco(0.1, 0.036, 0.036, [0.23, 0.99, 0.31], scuro);  // manopola sinistra
  blocco(0.1, 0.036, 0.036, [-0.23, 0.99, 0.31], scuro); // manopola destra

  // Ruote: copertone a 14 lati, 6 raggi e mozzo. Girano attorno al proprio asse (x)
  function ruota(z) {
    const g = new THREE.Group();
    g.position.set(0, R, z);
    const gomma = new THREE.Mesh(new THREE.TorusGeometry(R - 0.026, 0.028, 4, 14), scuro);
    gomma.rotation.y = Math.PI / 2;
    gomma.castShadow = true;
    g.add(gomma);
    for (let i = 0; i < 3; i++) {
      const raggio = new THREE.Mesh(new THREE.BoxGeometry(0.012, 2 * (R - 0.05), 0.012), metallo);
      raggio.rotation.x = i * Math.PI / 3;
      g.add(raggio);
    }
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), metallo));
    telaio.add(g);
    return g;
  }
  const ruotaDietro = ruota(DIETRO), ruotaDavanti = ruota(DAVANTI);

  // Parafanghi gialli sopra le ruote (angoli: 0 = in cima alla ruota, + = verso il davanti).
  // Visti da dietro sono la parte gialla più riconoscibile della bici
  function parafango(z, da, a) {
    const r = R + 0.035, n = 6;
    for (let i = 0; i < n; i++) {
      const a0 = da + (a - da) * i / n, a1 = da + (a - da) * (i + 1) / n;
      const p0 = new THREE.Vector3(0, R + r * Math.cos(a0), z + r * Math.sin(a0));
      const p1 = new THREE.Vector3(0, R + r * Math.cos(a1), z + r * Math.sin(a1));
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, p0.distanceTo(p1) + 0.004), giallo);
      m.position.copy(p0).add(p1).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(asseZ, p1.sub(p0).normalize());
      m.castShadow = true;
      telaio.add(m);
    }
  }
  parafango(DIETRO, -2.1, 0.35);
  parafango(DAVANTI, -0.45, 1.5);

  // Pedaliera: corona sul lato destro, due pedivelle opposte, pedali che restano orizzontali
  const pedaliera = new THREE.Group();
  pedaliera.position.fromArray(MOV);
  telaio.add(pedaliera);
  const corona = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.012, 10), metallo);
  corona.rotation.z = Math.PI / 2;
  corona.position.x = -0.06;
  pedaliera.add(corona);
  const pedali = [];
  [1, -1].forEach(function (s) {            // s = +1 sinistra (pedivella in alto a 0°), -1 destra (in basso)
    tubo([s * 0.075, 0, 0], [s * 0.1, s * 0.17, 0], 0.022, metallo, pedaliera);
    const perno = new THREE.Group();
    perno.position.set(s * 0.14, s * 0.17, 0);
    pedaliera.add(perno);
    blocco(0.09, 0.022, 0.06, [0, 0, 0], scuro, perno);
    pedali.push(perno);
  });

  // Punti d'appoggio per il personaggio (le mani, i piedi, il bacino), letti in coordinate del mondo
  function aggancio(pos, genitore) { const o = new THREE.Object3D(); o.position.fromArray(pos); (genitore || telaio).add(o); return o; }
  const punti = {
    sella: aggancio([0, 0.985, -0.23]),
    manopolaSx: aggancio([0.22, 0.99, 0.31]),
    manopolaDx: aggancio([-0.22, 0.99, 0.31]),
    pedaleSx: aggancio([0, 0.018, 0], pedali[0]),
    pedaleDx: aggancio([0, 0.018, 0], pedali[1])
  };

  // Aggiorna la bici: pos = punto a terra tra le ruote, direzione = angolo (0 = verso +z), pendenza (+ = muso in su),
  // inclinazione (+ = verso la destra del ciclista), giroRuote e pedivella in radianti
  function aggiorna(pos, direzione, pendenza, inclinazione, giroRuote, pedivella) {
    radice.position.copy(pos);
    radice.rotation.set(-pendenza, direzione, 0);
    rollio.rotation.z = inclinazione;
    ruotaDietro.rotation.x = ruotaDavanti.rotation.x = giroRuote;
    pedaliera.rotation.x = pedivella;
    pedali[0].rotation.x = pedali[1].rotation.x = -pedivella; // i pedali restano paralleli al telaio
    radice.updateMatrixWorld(true);
  }

  function punto(nome, out) { return punti[nome].getWorldPosition(out || new THREE.Vector3()); }
  // Da coordinate della bici (telaio) a coordinate del mondo: un punto, oppure una direzione
  function locale(x, y, z, out) { return telaio.localToWorld((out || new THREE.Vector3()).set(x, y, z)); }
  const qT = new THREE.Quaternion();
  function direzione(x, y, z, out) { telaio.getWorldQuaternion(qT); return (out || new THREE.Vector3()).set(x, y, z).applyQuaternion(qT); }

  return {
    gruppo: radice, aggiorna: aggiorna, punto: punto, locale: locale, direzione: direzione,
    raggioRuota: R, passo: DAVANTI - DIETRO, assi: [DIETRO, DAVANTI]
  };
};
