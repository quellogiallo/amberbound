// Oceano scuro, quasi nero: triangoli ben visibili che ondeggiano lentamente.
PZ.creaOceano = function (scena) {
  const geo = new THREE.PlaneGeometry(1600, 1600, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const base = pos.array.slice(); // posizioni di partenza dei vertici

  const mare = new THREE.Mesh(geo, PZ.ps1.aggancia(new THREE.MeshPhongMaterial({
    color: 0x0b1830,
    specular: PZ.CONFIG.luna.gialla !== false ? 0x5a4c1c : 0x34446a,   // i riflessi della luna sulle onde (dorati se è gialla)
    shininess: 90,
    flatShading: true
  })));
  mare.position.y = PZ.CONFIG.livelloMare;
  mare.receiveShadow = true;
  scena.add(mare);

  return {
    // Con la musica il mare segue il basso: quando il basso è forte le onde sono più alte e più rapide, nel break
    // si calmano e rallentano. "tm" è un tempo che scorre più o meno veloce, senza mai saltare.
    aggiorna: function (t) {
      const a = pos.array, MU = PZ.musica;
      const tm = MU ? MU.tempoMare(t) : t, amp = MU ? 0.6 + 0.6 * MU.basso(t) : 1;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], z = base[i + 2];
        a[i + 1] = (Math.sin(x * 0.05 + tm * 0.55) * 0.9
                 + Math.sin(z * 0.07 - tm * 0.42 + x * 0.02) * 0.8
                 + Math.sin((x + z) * 0.12 + tm * 0.9) * 0.35) * amp;
      }
      pos.needsUpdate = true;
    }
  };
};
