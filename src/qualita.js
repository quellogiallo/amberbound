// (fase 69) QUALITÀ DELL'IMMAGINE. Due livelli, scelti dal menu (pulsante QUALITÀ) o da soli (AUTO):
//
//   NORMALE  il gioco com'è sempre stato: immagine interna di 360 x 640 ingrandita a pixel netti, nessun effetto.
//   ALTA     - NITIDEZZA: l'immagine interna è 2 volte più grande (3 volte sui computer), fino a 1080 x 1920;
//            - BORDI: meno seghettati (antialiasing 4x, dove la scheda video lo permette);
//            - BAGLIORE: le luci forti (lampioni, finestre, ambra, occhi del demone, luna) spandono un alone;
//            - ABERRAZIONE CROMATICA: ai bordi dello schermo i colori si separano appena, come in un obiettivo;
//            - GRANA: una grana fine da pellicola (toglie anche le "fasce" di colore nel cielo e nella nebbia);
//            - VIGNETTATURA: gli angoli appena più scuri;
//            - OMBRE vere (src/qualita.js, ombre()): nella scogliera quelle della luna, in strada quelle di ragazzo,
//              bici, auto e ragazze sull'asfalto, nella cameretta quelle della lampada.
//   Modelli, texture a pixel e stile restano gli stessi: è lo stesso gioco, visto meglio.
//
// AUTO: ALTA sui dispositivi che sembrano reggerla; se durante il gioco l'immagine va a scatti la qualità scende da
// sola (prima meno nitidezza, poi NORMALE) e il browser se lo ricorda. Chi sceglie ALTA a mano la tiene sempre.
// Prova: aggiungi ?qualita=alta oppure ?qualita=normale all'indirizzo.
//
// Uso: PZ.qualita.avvia(renderer, stage) una volta; poi PZ.qualita.disegna(scena, camera, forza) al posto di
// renderer.render(scena, camera) per l'immagine principale di ogni scena (sc: { bagliore, soglia } di quella scena).
PZ.qualita = (function () {
  const C = PZ.CONFIG.qualita, SCH = PZ.CONFIG.schermo;
  const uScala = { value: 1 };                       // per gli effetti che contano i pixel (src/strada/sciogli.js)
  let renderer = null, stage = null, mem = null;
  let scelta = 'auto', livello = 'normale', scala = 1, lenta = 0;
  const scene = [], ascolta = [];
  try { mem = window.localStorage; mem.setItem('ambra.prova', '1'); mem.removeItem('ambra.prova'); } catch (e) { mem = null; }
  const leggi = function (k) { try { return mem ? mem.getItem(k) : null; } catch (e) { return null; } };
  const scrivi = function (k, v) { try { if (mem) mem.setItem(k, v); } catch (e) {} };

  // ---------- Il dispositivo regge la qualità alta? ----------
  const telefono = (function () {
    try { return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); } catch (e) { return false; }
  })();
  function regge() {
    if (!renderer || !renderer.capabilities.isWebGL2) return false;          // schede video vecchie: niente
    if (telefono && navigator.deviceMemory && navigator.deviceMemory <= 3) return false;
    if (telefono && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return false;
    return true;
  }
  function scalaAlta() {
    // quanti pixel veri ha lo schermo in altezza, rispetto ai 640 dell'immagine interna
    const h = (stage ? stage.clientHeight : window.innerHeight) * (window.devicePixelRatio || 1) / SCH.altezzaInterna;
    const max = Math.max(1.5, (telefono ? C.scalaTelefono : C.scalaComputer) - lenta);
    return Math.max(1.5, Math.min(max, Math.round(h * 2) / 2));
  }

  // ---------- La catena degli effetti (solo ALTA) ----------
  let rtScena = null, rtA = null, rtB = null, rtC = null, rtD = null, quad = null, scenaQ = null, camQ = null, M = null, tempo = 0;
  const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  function materiali() {
    const mat = function (uniforms, frag) { return new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false }); };
    return {
      // solo le luci forti, rimpicciolite di 4 volte
      soglia: mat({ t: { value: null }, px: { value: new THREE.Vector2() }, uSoglia: { value: C.soglia } },
        'uniform sampler2D t; uniform vec2 px; uniform float uSoglia; varying vec2 vUv;\n' +
        'void main() {\n' +
        '  vec3 c = 0.25 * (texture2D(t, vUv + px * vec2(-1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb + texture2D(t, vUv + px * vec2(1.0, 1.0)).rgb);\n' +
        '  float l = max(c.r, max(c.g, c.b));\n' +
        '  gl_FragColor = vec4(c * smoothstep(uSoglia, uSoglia + 0.25, l) * (l - uSoglia * 0.5) / max(l, 0.001), 1.0);\n' +
        '}'),
      copia: mat({ t: { value: null } }, 'uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }'),
      // sfocatura morbida in una direzione
      sfoca: mat({ t: { value: null }, dir: { value: new THREE.Vector2() } },
        'uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;\n' +
        'void main() {\n' +
        '  vec3 c = texture2D(t, vUv).rgb * 0.227027;\n' +
        '  c += (texture2D(t, vUv + dir * 1.384615).rgb + texture2D(t, vUv - dir * 1.384615).rgb) * 0.316216;\n' +
        '  c += (texture2D(t, vUv + dir * 3.230769).rgb + texture2D(t, vUv - dir * 3.230769).rgb) * 0.070270;\n' +
        '  gl_FragColor = vec4(c, 1.0);\n' +
        '}'),
      // l'immagine finale: scena + bagliore, aberrazione cromatica ai bordi, grana, vignettatura
      fine: mat({ t: { value: null }, b1: { value: null }, b2: { value: null }, uBag: { value: 1 }, uAb: { value: C.aberrazione }, uGr: { value: C.grana },
        uVig: { value: C.vignetta }, uT: { value: 0 }, uRis: { value: new THREE.Vector2(SCH.larghezzaInterna, SCH.altezzaInterna) } },
        'uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2; uniform float uBag; uniform float uAb; uniform float uGr; uniform float uVig; uniform float uT; uniform vec2 uRis; varying vec2 vUv;\n' +
        'float caso(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }\n' +
        'void main() {\n' +
        '  vec2 d = vUv - 0.5; float r2 = dot(d, d);\n' +
        '  vec2 o = d * r2 * uAb;\n' +
        '  vec3 c = vec3(texture2D(t, clamp(vUv + o, 0.001, 0.999)).r, texture2D(t, vUv).g, texture2D(t, clamp(vUv - o, 0.001, 0.999)).b);\n' +
        '  vec3 b = texture2D(b1, vUv).rgb * 0.6 + texture2D(b2, vUv).rgb * 0.55;\n' +
        '  c += b * uBag;\n' +
        '  c *= 1.0 - uVig * smoothstep(0.12, 0.5, r2);\n' +
        '  float l = dot(c, vec3(0.3, 0.59, 0.11));\n' +
        // la grana ha la finezza dei pixel dell\'immagine originale (non sparisce sugli schermi molto fitti)
        '  float n = caso(floor(vUv * uRis * 2.0) + floor(uT * 24.0) * 7.31) - 0.5;\n' +
        '  c += n * uGr * (1.0 - 0.6 * l);\n' +
        '  gl_FragColor = vec4(c, 1.0);\n' +
        '}')
    };
  }
  function prepara() {
    if (M) return;
    M = materiali();
    scenaQ = new THREE.Scene(); camQ = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), M.copia); quad.frustumCulled = false; scenaQ.add(quad);
  }
  function bersagli(w, h) {
    [rtScena, rtA, rtB, rtC, rtD].forEach(function (r) { if (r) r.dispose(); });
    const opz = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false };
    const os = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
    if (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget && C.bordi > 0) { rtScena = new THREE.WebGLMultisampleRenderTarget(w, h, os); rtScena.samples = C.bordi; }
    else rtScena = new THREE.WebGLRenderTarget(w, h, os);
    const w4 = Math.max(2, Math.round(w / 4)), h4 = Math.max(2, Math.round(h / 4)), w8 = Math.max(2, Math.round(w / 8)), h8 = Math.max(2, Math.round(h / 8));
    rtA = new THREE.WebGLRenderTarget(w4, h4, opz); rtB = new THREE.WebGLRenderTarget(w4, h4, opz);
    rtC = new THREE.WebGLRenderTarget(w8, h8, opz); rtD = new THREE.WebGLRenderTarget(w8, h8, opz);
  }
  function passata(mat, verso) { quad.material = mat; renderer.setRenderTarget(verso); renderer.render(scenaQ, camQ); }

  // ---------- Applicare il livello ----------
  function applica() {
    if (!renderer) return;
    const alta = livello === 'alta';
    scala = alta ? scalaAlta() : 1; uScala.value = scala;
    const w = Math.round(SCH.larghezzaInterna * scala), h = Math.round(SCH.altezzaInterna * scala);
    renderer.setSize(w, h, false);
    if (alta) { prepara(); bersagli(w, h); }
    if (stage) stage.classList.toggle('qAlta', alta);
    scene.forEach(punti);
    ombre();
    finestra.length = 0; cattive = 0;
    ascolta.forEach(function (f) { f(stato()); });
  }
  // le stelle (punti di grandezza fissa in pixel) restano grandi uguali sullo schermo
  function punti(scena) {
    scena.traverse(function (o) {
      const m = o.isPoints ? o.material : null;
      if (!m || !m.isPointsMaterial || m.sizeAttenuation) return;
      if (m.userData.dimBase === undefined) m.userData.dimBase = m.size;
      m.size = m.userData.dimBase * scala;
    });
  }

  // ---------- Ombre vere (solo ALTA) ----------
  // Ogni scena dice quali luci fanno ombra e cosa la fa o la riceve (registra(scena, { ombre: function (accese) {} })):
  // accendere o spegnere le ombre obbliga la scheda video a ripreparare i materiali, quindi si fa solo qui (dal menu o
  // all'avvio), mai mentre si gioca.
  let ombreAccese = false;
  function ombre() {
    const vuole = livello === 'alta' && C.ombre;
    if (vuole === ombreAccese) return;
    ombreAccese = vuole;
    renderer.shadowMap.enabled = vuole; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene.forEach(function (s) {
      if (s.userData.qOmbre) s.userData.qOmbre(vuole);
      s.traverse(function (o) { if (o.material) [].concat(o.material).forEach(function (m) { m.needsUpdate = true; }); });
    });
  }

  // ---------- Scende da sola se va a scatti (solo AUTO) ----------
  const finestra = []; let ultimoT = 0, cattive = 0;
  function misura() {
    const ora = performance.now(), dt = ora - ultimoT; ultimoT = ora;
    if (scelta !== 'auto' || livello !== 'alta' || dt > 1500 || dt <= 0 || document.hidden) return;   // (scheda nascosta, ritorno da una pausa lunga)
    finestra.push(dt);
    if (finestra.length < C.auto.fotogrammi) return;
    finestra.sort(function (a, b) { return a - b; });
    const mediana = finestra[finestra.length >> 1]; finestra.length = 0;
    cattive = mediana > C.auto.lento ? cattive + 1 : 0;
    if (cattive < C.auto.volte) return;
    cattive = 0; lenta += 1; scrivi('ambra.qualita.lenta', String(lenta));
    // prima meno nitidezza; se è già al minimo, NORMALE (e via anche le ombre: i materiali si ripreparano una volta)
    if (scalaAlta() >= scala) { livello = 'normale'; applica(); } else applicaSenzaOmbre();
  }
  function applicaSenzaOmbre() {
    const alta = livello === 'alta';
    scala = alta ? scalaAlta() : 1; uScala.value = scala;
    const w = Math.round(SCH.larghezzaInterna * scala), h = Math.round(SCH.altezzaInterna * scala);
    renderer.setSize(w, h, false);
    if (alta) bersagli(w, h);
    if (stage) stage.classList.toggle('qAlta', alta);
    scene.forEach(punti);
    ascolta.forEach(function (f) { f(stato()); });
  }

  // ---------- Disegnare ----------
  // sc: { bagliore, soglia } di questa scena (config.js, qualita.scene)
  function disegna(scena, camera, sc) {
    misura();
    if (ombreAccese) renderer.shadowMap.needsUpdate = true;
    if (livello !== 'alta' || !rtScena) { renderer.setRenderTarget(null); renderer.render(scena, camera); return; }
    renderer.setRenderTarget(rtScena); renderer.render(scena, camera);
    const au = renderer.autoClear; renderer.autoClear = true;
    M.soglia.uniforms.uSoglia.value = sc && sc.soglia !== undefined ? sc.soglia : C.soglia;
    M.soglia.uniforms.t.value = rtScena.texture; M.soglia.uniforms.px.value.set(1 / rtScena.width, 1 / rtScena.height); passata(M.soglia, rtA);
    M.sfoca.uniforms.t.value = rtA.texture; M.sfoca.uniforms.dir.value.set(1 / rtA.width, 0); passata(M.sfoca, rtB);
    M.sfoca.uniforms.t.value = rtB.texture; M.sfoca.uniforms.dir.value.set(0, 1 / rtA.height); passata(M.sfoca, rtA);
    M.copia.uniforms.t.value = rtA.texture; passata(M.copia, rtC);
    M.sfoca.uniforms.t.value = rtC.texture; M.sfoca.uniforms.dir.value.set(1 / rtC.width, 0); passata(M.sfoca, rtD);
    M.sfoca.uniforms.t.value = rtD.texture; M.sfoca.uniforms.dir.value.set(0, 1 / rtC.height); passata(M.sfoca, rtC);
    const U = M.fine.uniforms; tempo += 1 / 60;
    U.t.value = rtScena.texture; U.b1.value = rtA.texture; U.b2.value = rtC.texture; U.uBag.value = C.bagliore * (sc && sc.bagliore !== undefined ? sc.bagliore : 1); U.uT.value = tempo;
    passata(M.fine, null);
    renderer.autoClear = au;
  }

  // ---------- Scelta ----------
  function stato() { return { scelta: scelta, livello: livello, scala: scala, ombre: ombreAccese }; }
  function decidi() { livello = scelta === 'alta' ? 'alta' : scelta === 'normale' ? 'normale' : (regge() && lenta < 2 ? 'alta' : 'normale'); }
  function imposta(s) {
    scelta = s === 'alta' || s === 'normale' ? s : 'auto';
    scrivi('ambra.qualita', scelta);
    if (scelta !== 'auto') { lenta = 0; scrivi('ambra.qualita.lenta', '0'); }
    decidi(); applica();
  }
  function avvia(r, st) {
    renderer = r; stage = st;
    const forzata = /[?&#]qualita=(alta|normale|auto)/.exec(location.search + location.hash);
    scelta = forzata ? forzata[1] : (leggi('ambra.qualita') || 'auto');
    if (scelta !== 'alta' && scelta !== 'normale') scelta = 'auto';
    lenta = Math.max(0, parseInt(leggi('ambra.qualita.lenta'), 10) || 0);
    decidi(); applica();
    window.addEventListener('resize', function () { if (livello === 'alta' && Math.abs(scalaAlta() - scala) >= 0.5) applicaSenzaOmbre(); });
  }
  // opz.ombre(accese): la scena accende o spegne le sue ombre
  function registra(scena, opz) {
    if (scene.indexOf(scena) < 0) scene.push(scena);
    if (opz && opz.ombre) scena.userData.qOmbre = opz.ombre;
    if (!renderer) return;
    punti(scena);
    if (ombreAccese && scena.userData.qOmbre) { scena.userData.qOmbre(true); scena.traverse(function (o) { if (o.material) [].concat(o.material).forEach(function (m) { m.needsUpdate = true; }); }); }
  }
  return { avvia: avvia, disegna: disegna, imposta: imposta, stato: stato, registra: registra, uScala: uScala,
    prossima: function () { return scelta === 'auto' ? 'alta' : scelta === 'alta' ? 'normale' : 'auto'; },
    suCambio: function (f) { ascolta.push(f); } };
})();
