// (fase 78) LA FUGA: la scena a 100/100 frammenti, prima della scogliera (circa 7 secondi, si può saltare).
//   A  (0 - 2,4 s)  il ragazzo accelera; in fondo alla strada la nebbia si apre e tra i palazzi compare uno SPIRAGLIO:
//                   la scogliera, il mare, la luna. La città finisce lì.
//   B  (2,4 - 5 s)  controcampo: il demone si ferma in mezzo alla strada, alza le braccia, trema di rabbia, si accende
//                   di rosso e URLA (src/audio.js, urloDemone). La telecamera trema.
//   C  (5 - 7,2 s)  il ragazzo sfreccia verso lo spiraglio, che si avvicina e si accende; lampo d'ambra: la scogliera.
// Qui ci sono i pezzi della scena (lo spiraglio, la rabbia del demone, le inquadrature); il tempo e il passaggio alla
// scogliera li gestisce la corsa (src/strada/corsa.js, fase 'fuga').
PZ.creaFuga = function (o) {
  const scena = o.scena, V3 = THREE.Vector3;
  const T = { A: 2.4, B: 5.0, fine: 7.2, urlo: 2.65 };

  // ---------- Lo spiraglio: la scogliera in fondo alla strada ----------
  // Un grande quadro dipinto a pixel (stesso stile del gioco), lontano, oltre la nebbia: copre la città che c'è dietro,
  // così sembra che la strada finisca e si apra sulla scogliera. Si accende piano.
  const tex = (function () {
    const W = 256, H = 160, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), rnd = PZ.ps1.casuale(7878);
    // il cielo: blu notte in alto, più chiaro e verdastro all'orizzonte
    const cielo = g.createLinearGradient(0, 0, 0, 92);
    cielo.addColorStop(0, '#05081a'); cielo.addColorStop(0.6, '#13284a'); cielo.addColorStop(1, '#3d5f6e');
    g.fillStyle = cielo; g.fillRect(0, 0, W, 92);
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(230, 236, 255,' + (0.3 + rnd() * 0.6) + ')'; g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 70), 1, 1); }
    // la luna, col suo alone
    const al = g.createRadialGradient(168, 34, 4, 168, 34, 46);
    al.addColorStop(0, 'rgba(255, 244, 200, 0.55)'); al.addColorStop(1, 'rgba(255, 244, 200, 0)');
    g.fillStyle = al; g.fillRect(110, 0, 120, 90);
    g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(168, 34, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(200, 190, 160, 0.5)'; g.fillRect(163, 30, 3, 3); g.fillRect(171, 37, 4, 2);
    // il mare: scuro, con la scia della luna che luccica
    g.fillStyle = '#0b1a2c'; g.fillRect(0, 92, W, 68);
    for (let y = 93; y < 160; y += 2) {
      const largo = 6 + (y - 92) * 0.9;
      for (let k = 0; k < 7; k++) {
        const x = 168 + (rnd() - 0.5) * largo * 2;
        g.fillStyle = 'rgba(255, 236, 180,' + (0.25 + rnd() * 0.55) * (1 - (y - 92) / 110) + ')';
        g.fillRect(Math.floor(x), y, 2 + Math.floor(rnd() * 4), 1);
      }
    }
    g.fillStyle = 'rgba(160, 200, 210, 0.35)'; g.fillRect(0, 92, W, 1);        // la linea dell'orizzonte
    // la scogliera: a sinistra una parete di roccia scura con l'erba sopra, a destra uno sperone più basso
    g.fillStyle = '#0a0a10';
    g.beginPath(); g.moveTo(0, 60); g.lineTo(26, 58); g.lineTo(44, 66); g.lineTo(62, 72); g.lineTo(80, 86); g.lineTo(96, 104); g.lineTo(104, 126);
    g.lineTo(98, 160); g.lineTo(0, 160); g.closePath(); g.fill();
    g.fillStyle = '#1c2a18'; g.beginPath(); g.moveTo(0, 60); g.lineTo(26, 58); g.lineTo(44, 66); g.lineTo(62, 72); g.lineTo(80, 86); g.lineTo(78, 90); g.lineTo(58, 77);
    g.lineTo(40, 71); g.lineTo(22, 64); g.lineTo(0, 66); g.closePath(); g.fill();
    g.fillStyle = '#0a0a10';
    g.beginPath(); g.moveTo(W, 82); g.lineTo(226, 86); g.lineTo(208, 98); g.lineTo(198, 118); g.lineTo(204, 160); g.lineTo(W, 160); g.closePath(); g.fill();
    // il sentiero che scende verso il bordo, e un piccolo punto d'ambra che brilla laggiù
    g.fillStyle = 'rgba(120, 110, 90, 0.5)'; for (let i = 0; i < 14; i++) g.fillRect(40 + i * 3, 74 + i * 1.6, 3, 1);
    g.fillStyle = '#ffc21a'; g.fillRect(86, 96, 2, 2); g.fillStyle = 'rgba(255, 194, 26, 0.4)'; g.fillRect(85, 95, 4, 4);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  })();
  const spiraglio = new THREE.Mesh(new THREE.PlaneGeometry(64, 40),
    new THREE.MeshBasicMaterial({ map: tex, fog: false, transparent: true, opacity: 0, depthWrite: true }));
  spiraglio.renderOrder = 2; spiraglio.visible = false; scena.add(spiraglio);
  // il bagliore in fondo: la luce della scogliera che entra nella strada
  const luce = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.bagliore(), color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
  luce.scale.set(60, 36, 1); luce.renderOrder = 3; luce.visible = false; scena.add(luce);
  function spiraglioA(z, k, chiaro) {
    spiraglio.visible = luce.visible = k > 0.001;
    spiraglio.position.set(0, 14, z); spiraglio.material.opacity = k;
    luce.position.set(0, 9, z + 2); luce.material.opacity = 0.35 * k + 0.5 * (chiaro || 0);
  }

  // ---------- La rabbia del demone ----------
  // dopo l'animazione "fermo" del demone (src/strada/demone.js) si piegano le ossa: braccia alzate e aperte, testa
  // all'indietro che urla, busto inarcato, tutto che trema; e un alone rosso che pulsa dietro di lui
  const rosso = new THREE.Sprite(new THREE.SpriteMaterial({ map: PZ.bagliore(), color: 0xff1a0a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
  rosso.renderOrder = 4; rosso.visible = false; scena.add(rosso);
  const tmp = new V3();
  function rabbia(D, t, k, dt) {
    const G = D.G, tr = function (a) { return (Math.random() - 0.5) * a * k; };
    const urla = Math.max(0, Math.min(1, (t - T.urlo + 0.15) / 0.2));
    [0, 1].forEach(function (i) {
      const s = i === 0 ? 1 : -1;
      G.spalla[i].rotation.set(-2.5 * k + tr(0.25), 0, s * (0.55 * k) + tr(0.2));
      G.gomito[i].rotation.set(-0.35 * k + tr(0.3), 0, 0);
      G.polso[i].rotation.set(-0.6 * k + tr(0.5), 0, 0);
    });
    G.busto.rotation.x += (-0.25 * k - G.busto.rotation.x * k) + tr(0.08);
    G.collo.rotation.x = -0.3 * k * urla + tr(0.1);
    G.testa.rotation.set(-0.75 * k * urla + tr(0.12), tr(0.25), tr(0.3));
    G.radice.position.x += tr(0.12); G.radice.position.y += Math.abs(tr(0.06));
    G.radice.updateMatrixWorld(true);
    G.testa.getWorldPosition(tmp);
    rosso.visible = k > 0.01; rosso.position.copy(tmp); rosso.position.z += 0.6;
    const pulsa = 0.65 + 0.35 * Math.sin(t * 22);
    rosso.material.opacity = k * (0.35 + 0.55 * urla) * pulsa; rosso.scale.setScalar(5 + 4 * urla * pulsa);
  }
  function spegni() { spiraglio.visible = luce.visible = rosso.visible = false; spiraglio.material.opacity = 0; }

  return { T: T, spiraglio: spiraglioA, rabbia: rabbia, spegni: spegni };
};
