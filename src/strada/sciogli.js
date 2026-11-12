// IL MONDO SI SCIOGLIE: l'aspetto della città mentre l'orologio daliniano ha fermato il tempo.
// Tutto è guidato da due numeri dell'orologio (orologio.js): forza (0 = normale, 1 = tempo sciolto) e colpo (lo strappo
// dei primi decimi di secondo). Niente di questo tocca il gioco: collisioni, posizioni vere, comandi restano uguali.
//
//  - GIALLO E NERO: una piccola aggiunta, alla fine dello shader, a TUTTI i materiali della scena tranne quelli del
//    ragazzo, della bici, dei frammenti d'ambra e dell'orologio. Ogni colore (già con la nebbia) diventa una scala
//    dal nero profondo al giallo acceso secondo la sua luminosità, con lente onde di luce che scorrono: le forme restano
//    leggibili (strada, auto, transenne, ragazze), cambiano solo i colori.
//  - LO SPAZIO LIQUIDO: nella stessa aggiunta, i vertici si spostano sullo schermo in onde lente (orizzontali) e le parti
//    alte "colano" verso il basso; all'attivazione un'onda più forte (lo spazio che si piega). Spostamenti di pochi
//    pixel: la strada si legge sempre.
//  - AUTO STIRATE NEL TEMPO: le auto si allungano all'indietro (il muso resta dov'è davvero, così ciò che vedi davanti è
//    ciò che urti) e lasciano dietro una scia gialla.
//  - PULVISCOLO: filamenti e granelli gialli sospesi nell'aria, quasi fermi.
// Si accende in un terzo di secondo e si spegne piano nell'ultimo secondo, insieme al tempo. Alla morte, al finale e a
// ogni nuova partita forza = 0: tutto torna come prima (le auto riprendono la loro lunghezza a ogni fotogramma).
PZ.creaScioglimento = function (o) {
  const scena = o.scena, escludi = o.escludi || [];
  const U = { uGiallo: { value: 0 }, uTempoG: { value: 0 }, uColpoG: { value: 0 } };

  // ---------- 1. Materiali: giallo e nero + spazio liquido ----------
  const VERT = 'uniform float uGiallo; uniform float uTempoG; uniform float uColpoG;\n';
  const ONDA = '#include <project_vertex>\n' +
    'if (uGiallo + uColpoG > 0.001 && gl_Position.w > 0.0) {\n' +
    '  vec2 nd = gl_Position.xy / gl_Position.w;\n' +
    '  nd.x += uGiallo * (0.022 * sin(nd.y * 6.0 + uTempoG * 1.6) + 0.01 * sin(nd.y * 15.0 - uTempoG * 2.2));\n' +
    '  nd.y -= uGiallo * 0.035 * (0.5 + 0.5 * sin(nd.x * 4.0 + uTempoG * 0.9)) * clamp(nd.y + 0.2, 0.0, 1.2);\n' +
    '  nd += uColpoG * 0.07 * vec2(sin(nd.y * 3.5 + 1.0), sin(nd.x * 3.0)) * (0.3 + length(nd));\n' +
    '  gl_Position.xy = nd * gl_Position.w;\n' +
    '}';
  const FRAG = 'uniform float uGiallo; uniform float uTempoG; uniform float uColpoG;\n';
  const COLORE = '#include <fog_fragment>\n' +
    'if (uGiallo > 0.001) {\n' +
    '  float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));\n' +
    '  vec2 fc = gl_FragCoord.xy;\n' +
    '  float liquido = sin(fc.y * 0.045 + sin(fc.x * 0.021 + uTempoG * 0.8) * 2.4 - uTempoG * 1.3);\n' +
    '  float l2 = clamp(lum * 1.35 + 0.07 * liquido, 0.0, 1.0);\n' +
    '  vec3 nero = vec3(0.025, 0.018, 0.0), giallo = vec3(1.0, 0.86, 0.06), bianco = vec3(1.0, 0.97, 0.72);\n' +
    '  vec3 duo = mix(nero, giallo, smoothstep(0.05, 0.42, l2));\n' +
    '  duo = mix(duo, bianco, smoothstep(0.75, 1.0, l2));\n' +
    '  gl_FragColor.rgb = mix(gl_FragColor.rgb, duo, uGiallo);\n' +
    '}';
  const fatti = new WeakSet(), vietati = new WeakSet();
  function raccogliVietati() {
    escludi.forEach(function (ob) { if (ob) ob.traverse(function (c) { if (c.material) [].concat(c.material).forEach(function (m) { vietati.add(m); }); }); });
  }
  function adatta(m) {
    if (!m || fatti.has(m) || vietati.has(m) || m.isShaderMaterial || m.isRawShaderMaterial) return;
    fatti.add(m);
    const prima = m.onBeforeCompile, chiave = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
    m.onBeforeCompile = function (sh, r) {
      if (prima) prima.call(this, sh, r);
      sh.uniforms.uGiallo = U.uGiallo; sh.uniforms.uTempoG = U.uTempoG; sh.uniforms.uColpoG = U.uColpoG;
      sh.vertexShader = VERT + sh.vertexShader.replace('#include <project_vertex>', ONDA);
      sh.fragmentShader = FRAG + sh.fragmentShader.replace('#include <fog_fragment>', COLORE);
    };
    // il programma compilato va distinto da quello di un materiale con la stessa aggiunta precedente ma senza questa
    m.customProgramCacheKey = function () { return chiave + '|sciogli'; };
    m.needsUpdate = true;
  }
  // da chiamare una volta a scena pronta (e di nuovo all'attivazione, per i materiali nati dopo: di solito nessuno)
  function prepara() {
    raccogliVietati();
    scena.traverse(function (c) { if (c.material) [].concat(c.material).forEach(adatta); });
  }

  // ---------- 2. Pulviscolo giallo sospeso ----------
  const NP = 260, pos = new Float32Array(NP * 3), base = [];
  for (let i = 0; i < NP; i++) {
    base.push({ x: (Math.random() - 0.5) * 18, y: 0.3 + Math.random() * 7, z: -Math.random() * 46 + 4, f: Math.random() * 6.28 });
  }
  const geoP = new THREE.BufferGeometry(); geoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const texP = PZ.ps1.alone(255, 215, 30, 4);
  const matP = new THREE.PointsMaterial({ color: 0xffe14a, size: 0.16, map: texP, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  const pulviscolo = new THREE.Points(geoP, matP); pulviscolo.frustumCulled = false; pulviscolo.visible = false; scena.add(pulviscolo);

  // ---------- 3. Scie gialle dietro le auto ----------
  const texScia = (function () {
    const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,220,40,0)'); gr.addColorStop(1, 'rgba(255,220,40,0.85)');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 64); return new THREE.CanvasTexture(c);
  })();
  const scie = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: texScia, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.visible = false; scena.add(m); scie.push(m);
  }
  // la texture va dal trasparente (lontano) al pieno (attaccato all'auto): ruoto le facce in modo che lo sia lungo z
  scie.forEach(function (m) { const uv = m.geometry.attributes.uv; m.geometry.rotateX(-Math.PI / 2); uv.needsUpdate = true; });

  escludi.push(pulviscolo); scie.forEach(function (m) { escludi.push(m); });

  // ---------- Aggiornamento ----------
  let forzaPrima = 0;
  // forza, colpo: dall'orologio; dtVero: secondi veri; avanza: metri percorsi dal mondo in questo fotogramma; auto: le auto
  function aggiorna(forza, colpo, dtVero, avanza, auto) {
    U.uGiallo.value = forza; U.uColpoG.value = colpo;
    U.uTempoG.value += dtVero;
    if (forza > 0 && forzaPrima === 0) prepara();               // eventuali materiali nuovi
    forzaPrima = forza;
    // auto: si allungano all'indietro (s), il muso resta al suo posto; a forza 0 tornano esattamente come sono
    const s = 1 + 0.7 * forza;
    let n = 0;
    for (let i = 0; i < auto.length; i++) {
      const a = auto[i];
      a.gruppo.scale.z = s;
      a.gruppo.position.z = a.z - (s - 1) * a.L / 2;
      if (forza > 0.01 && n < scie.length && !a.urtata) {
        const sc = scie[n++], lung = a.L * (0.4 + 2.6 * forza);
        sc.visible = true; sc.material.opacity = 0.55 * forza;
        sc.scale.set(a.W * 0.9, 1.1, lung);
        sc.position.set(a.x, 0.6, a.z - a.L / 2 - lung / 2 + 0.2);
      }
    }
    for (; n < scie.length; n++) scie[n].visible = false;
    // pulviscolo: quasi fermo, scende e ondeggia piano
    pulviscolo.visible = forza > 0.01;
    if (pulviscolo.visible) {
      matP.opacity = 0.85 * forza;
      const T = U.uTempoG.value;
      for (let i = 0; i < NP; i++) {
        const b = base[i];
        b.z += avanza; if (b.z > 5) b.z -= 50;                  // scorre con il mondo (lentissimo)
        pos[i * 3] = b.x + 0.25 * Math.sin(T * 0.7 + b.f);
        pos[i * 3 + 1] = b.y + 0.18 * Math.sin(T * 0.5 + b.f * 1.3);
        pos[i * 3 + 2] = b.z;
      }
      geoP.attributes.position.needsUpdate = true;
    }
  }
  function spegni(auto) { aggiorna(0, 0, 0, 0, auto || []); }
  return { prepara: prepara, aggiorna: aggiorna, spegni: spegni, uniformi: U, pulviscolo: pulviscolo, scie: scie };
};
