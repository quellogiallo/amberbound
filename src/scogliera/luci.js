// Luci, ombre e nebbia.
PZ.creaLuci = function (scena) {
  const C = PZ.CONFIG.colori;

  // Nebbia: lontano tutto sfuma in un blu più scuro dell'orizzonte, così mare e cielo restano separati
  scena.fog = new THREE.FogExp2(C.nebbia, 0.0024);

  // Luce debole del cielo: impedisce che le zone in ombra diventino nere piatte
  scena.add(new THREE.HemisphereLight(0x34497f, 0x05070f, 0.85));

  // Luce della luna: arriva dalla direzione della luna (davanti alla camera), quindi le ombre sono lunghe
  // e vengono verso chi guarda; sul mare crea la scia di riflessi sotto la luna.
  // Con la luna gialla la sua luce è calda (le ombre restano blu, perché le colora il cielo)
  const luna = new THREE.DirectionalLight(PZ.CONFIG.luna.gialla !== false ? 0xd6cb92 : 0xa9bcee, 2.2);
  const dir = new THREE.Vector3().fromArray(PZ.CONFIG.luce.direzione).normalize();
  luna.target.position.set(0, 0, -8);
  luna.position.copy(luna.target.position).addScaledVector(dir, 300);
  luna.castShadow = true;
  luna.shadow.mapSize.set(2048, 2048);
  luna.shadow.bias = -0.002;
  luna.shadow.normalBias = 0.4;
  const s = luna.shadow.camera;
  s.left = -80; s.right = 80; s.top = 55; s.bottom = -55; s.near = 120; s.far = 520;
  s.updateProjectionMatrix();
  scena.add(luna, luna.target);

  // Riempimento debolissimo da dietro la camera: le pareti rivolte verso di noi non diventano nere piatte
  const riempimento = new THREE.DirectionalLight(0x4a5f99, 0.55);
  riempimento.position.set(20, 40, 120);
  scena.add(riempimento);
};
