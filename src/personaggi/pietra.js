// La pietra d'ambra: un oggetto 3D a sé, piccolo e irregolare, con faccette di toni ambrati diversi
// (come un oggetto d'inventario PS1). Una leggera luce propria la rende leggibile di notte; posata a terra si accende appena.
PZ.creaPietra = function (scena) {
  const g = new THREE.IcosahedronGeometry(0.07, 0); // 20 facce, circa 15 cm
  const p = g.attributes.position;
  // Forma irregolare: ogni vertice si sposta in base alla sua posizione (i vertici condivisi restano uniti)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.75 + PZ.ps1.hash(x * 30, y * 30, z * 30) * 0.5;
    p.setXYZ(i, x * k * 1.15, y * k * 0.78, z * k * 0.95);
  }
  g.computeVertexNormals();

  // Un tono per faccia: dal miele scuro all'arancio chiaro
  const toni = [0xb8580a, 0xd9780f, 0xf09a1c, 0xffb23a];
  const colori = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let f = 0; f < p.count / 3; f++) {
    c.setHex(toni[Math.floor(PZ.ps1.hash(f, 9, 3) * toni.length)]);
    for (let j = 0; j < 3; j++) c.toArray(colori, (f * 3 + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colori, 3));

  const pietra = new THREE.Mesh(g, new THREE.MeshPhongMaterial({
    vertexColors: true, emissive: 0x5c2a00, specular: 0x7a5a2a, shininess: 30, flatShading: true
  }));
  pietra.castShadow = true;
  pietra.visible = false; // compare quando esce dalla tasca
  scena.add(pietra);

  // Bagliore: quando è posata a terra la pietra si accende appena, come se contenesse un po' di energia.
  // Un alone giallo a fasce (stile PS1) e una luce piccolissima che tocca solo la roccia vicina.
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({
    map: PZ.ps1.alone(240, 230, 60, 5), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: 0
  }));
  alone.scale.set(0.55, 0.55, 1);
  pietra.add(alone);
  const luce = new THREE.PointLight(0xf0e050, 0, 1.8, 2);
  pietra.add(luce);
  const emissivoSpento = new THREE.Color(0x5c2a00), emissivoAcceso = new THREE.Color(0xa86a10);
  // k da 0 a 1: intensità del bagliore; t: secondi, per un respiro lentissimo della luce
  pietra.brilla = function (k, t) {
    const respiro = 1 + 0.18 * Math.sin(t * 1.7) * k;
    alone.material.opacity = 0.42 * k * respiro;
    alone.visible = k > 0;
    luce.intensity = 0.9 * k * respiro;
    pietra.material.emissive.copy(emissivoSpento).lerp(emissivoAcceso, k * respiro * 0.9);
  };
  return pietra;
};
