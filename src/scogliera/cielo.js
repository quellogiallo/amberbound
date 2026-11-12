// Cielo notturno, stelle e luna della SCOGLIERA (dal videoclip Pezzidicarne, src/environment/sky.js).
// Cielo, stelle e luna seguono la posizione della camera: stanno "all'infinito", quindi non si avvicinano mai.
PZ.creaCielo = function (scena) {
  const C = PZ.CONFIG.colori;
  const rnd = PZ.ps1.casuale(11);

  // Cielo: una grande sfera vista da dentro, con un gradiente a fasce (poche righe di colore = look PS1)
  const righe = 32;
  const cv = document.createElement('canvas');
  cv.width = 1;
  cv.height = righe;
  const g = cv.getContext('2d');
  const cima = new THREE.Color(0x01030a);
  const medio = new THREE.Color(C.bluNotte);
  const orizzonte = new THREE.Color(C.bluOrizzonte);
  for (let i = 0; i < righe; i++) {
    const k = Math.min(1, (i / (righe - 1)) * 2); // 0 = cima del cielo, 1 = linea dell'orizzonte
    const col = new THREE.Color().copy(cima).lerp(medio, Math.min(1, k * 1.4)).lerp(orizzonte, Math.pow(k, 4));
    g.fillStyle = '#' + col.getHexString();
    g.fillRect(0, i, 1, 1);
  }
  const texCielo = new THREE.CanvasTexture(cv);
  texCielo.magFilter = THREE.NearestFilter;
  texCielo.minFilter = THREE.NearestFilter;
  const cielo = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  cielo.renderOrder = -10;
  scena.add(cielo);

  // Stelle: punti quadrati sopra l'orizzonte
  const n = 420;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const az = rnd() * Math.PI * 2;
    const el = Math.asin(0.03 + rnd() * 0.97);
    pos[i * 3] = Math.cos(az) * Math.cos(el) * 800;
    pos[i * 3 + 1] = Math.sin(el) * 800;
    pos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * 800;
  }
  const geoStelle = new THREE.BufferGeometry();
  geoStelle.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stelle = new THREE.Points(geoStelle, new THREE.PointsMaterial({
    color: C.grigioFreddo, size: 1.6, sizeAttenuation: false, fog: false
  }));
  stelle.frustumCulled = false;
  scena.add(stelle);

  // Luna: il modello del videoclip (src/luna.js)
  const L = PZ.lunaVolto(scena, { offset: PZ.CONFIG.luna.posizione, raggio: PZ.CONFIG.luna.raggio, gialla: PZ.CONFIG.luna.gialla });

  return {
    volto: L.volto, sorriso: L.sorriso, pulsa: L.pulsa, luna: L.luna,
    aggiorna: function (posCamera) {
      cielo.position.copy(posCamera);
      stelle.position.copy(posCamera);
      L.posiziona(posCamera);
    }
  };
};
