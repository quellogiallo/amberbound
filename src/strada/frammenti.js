// FRAMMENTI D'AMBRA: i pezzi della pietra da raccogliere correndo. A 100 si sblocca il finale sulla scogliera.
//
// DOVE COMPAIONO. Nascono insieme alle file di ostacoli, con le stesse informazioni del generatore: per ogni fila si
// sa in quali corsie il giocatore può davvero trovarsi passando (fila.R, calcolato tenendo conto dei tempi di
// reazione e di cambio corsia). Un frammento va solo in una di quelle corsie e mai dentro un'auto, una transenna o
// una sagoma, quindi prenderlo non costringe mai a un urto: dopo, da quella corsia, il generatore garantisce sempre
// una via d'uscita. Tre tipi (probabilità in config.js, strada.frammenti):
//   SCIA     da 2 a 5 frammenti in fila in una corsia libera sia nella fila prima sia in quella dopo: facili;
//   CAMBIO   (quando non c'è una scia) una fila di frammenti che a metà passa nella corsia accanto, anche lei libera
//            prima e dopo: invita a cambiare corsia al momento giusto;
//   SALTO    uno in alto sopra una transenna: si prende solo saltandola al momento giusto;
//   RISCHIO  due nella corsia libera accanto a un'auto o a una sagoma: bisogna passarci proprio mentre l'auto o la
//            sagoma è lì accanto (sempre possibile, mai obbligatorio): più rischio, più ambra.
// Le auto vengono incontro e passerebbero sopra un frammento fermo più avanti nella loro corsia: come per transenne e
// sagome, un frammento non va mai in una corsia dove un'auto arriva prima di lui (nei secondi in cui sarebbe in vista).
// La disposizione cambia a ogni partita.
//
// RACCOLTA. Un frammento si prende passandoci attraverso con la bici (in volo, se è sopra una transenna; saltando
// sopra uno basso lo si manca). Ogni frammento ha un numero unico ed è contato una volta sola, anche se l'oggetto
// 3D viene poi riciclato per un altro frammento. Il conteggio sta in PZ.raccolta:
//   PZ.raccolta.conteggio, .obiettivo, .completata
//   PZ.raccolta.azzera()     riporta a zero (nuova partita; servirà anche al game over)
//   PZ.raccolta.imposta(n)   prova controllata: porta il contatore a n (a obiettivo scatta il completamento)
//   PZ.raccolta.suCompletamento(f)  f viene chiamata UNA volta quando il contatore arriva all'obiettivo
//
// DISEGNO. Schegge d'ambra low-poly (stesse tinte della pietra) con un alone: due InstancedMesh con 64 istanze
// riciclate, quindi 2 sole chiamate di disegno in tutto, qualunque sia il numero di frammenti in strada.
PZ.raccolta = (function () {
  const obiettivo = PZ.CONFIG.strada.frammenti.obiettivo;
  const ascolta = [];
  // (fase 16) MODALITÀ ARCADE: R.arcade = true. Il contatore non porta al finale: a obiettivo riparte da zero (R.cicli
  // conta i giri, R.totale tutti i frammenti presi) e avvisa chi ascolta con suArcade (la scelta del potenziamento).
  // R.livello(): il "livello" su cui si regola la difficoltà (quanti ostacoli, la manata...): nella storia sono i
  // frammenti raccolti; nell'arcade sale con i metri (R.livelloArcade, aggiornato dalla corsa), fino a obiettivo.
  const R = { conteggio: 0, obiettivo: obiettivo, completata: false, contati: new Set(), arcade: false, livelloArcade: 0, totale: 0, cicli: 0 };
  const ascoltaArcade = [];
  R.livello = function () { return R.arcade ? R.livelloArcade : R.conteggio; };
  // (fase 17) quanti frammenti per giro: 100 nella storia; nell'arcade ogni potereOgni (config, 50)
  R.passo = function () { return R.arcade ? ((PZ.CONFIG.arcade && PZ.CONFIG.arcade.potereOgni) || 50) : obiettivo; };
  R.suArcade = function (f) { ascoltaArcade.push(f); };
  function completa() {
    if (R.completata) return;
    R.completata = true;
    ascolta.forEach(function (f) { f(R); });
  }
  // conta il frammento con questo numero: vero se è nuovo
  R.conta = function (id) {
    if (R.completata || R.contati.has(id)) return false;
    R.contati.add(id);
    R.totale++;
    if (R.arcade) {
      R.conteggio++;
      if (R.conteggio >= R.passo()) { R.conteggio = 0; R.cicli++; ascoltaArcade.forEach(function (f) { f(R); }); }
      return true;
    }
    R.conteggio = Math.min(obiettivo, R.conteggio + 1);
    if (R.conteggio >= obiettivo) completa();
    return true;
  };
  R.azzera = function () { R.conteggio = 0; R.completata = false; R.contati.clear(); R.totale = 0; R.cicli = 0; R.livelloArcade = 0; };
  R.imposta = function (n) {
    R.conteggio = Math.max(0, Math.min(obiettivo, Math.floor(n)));
    if (R.conteggio >= obiettivo) completa();
  };
  R.suCompletamento = function (f) { ascolta.push(f); };
  return R;
})();

PZ.creaFrammenti = function (scena, V0) {
  const CFG = PZ.CONFIG.strada, C = CFG.frammenti, LC = CFG.larghezzaCorsia, LONTANO = CFG.distanzaComparsa;
  const N = 80, BASSO = 0.78, ALTO = 2.3;          // altezza dei frammenti a terra e sopra le transenne (m)
  const VA = CFG.difficolta.velocitaAuto, VC = V0 + VA;
  const PRIMA = (LONTANO / V0) * (VA / VC) + 0.7;   // un'auto con la fila fino a tanti "tau" prima lo raggiungerebbe in vista
  const rnd = PZ.ps1.casuale(1 + Math.floor(Math.random() * 2000000000));   // diversa a ogni partita

  // ---------- Forma: una scheggia allungata e irregolare, con faccette nei toni della pietra ----------
  const g = new THREE.OctahedronGeometry(0.16, 0);   // circa 55 cm: grande abbastanza da vedersi arrivare
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 0.8 + PZ.ps1.hash(x * 40 + 3, y * 40, z * 40) * 0.4;
    pos.setXYZ(i, x * k * 0.75, y * k * 1.75, z * k * 0.6);
  }
  g.computeVertexNormals();
  const toni = [0xb8580a, 0xd9780f, 0xf09a1c, 0xffb23a, 0xffc85a];
  const colori = new Float32Array(pos.count * 3), col = new THREE.Color();
  for (let f = 0; f < pos.count / 3; f++) {
    col.setHex(toni[Math.floor(PZ.ps1.hash(f, 5, 11) * toni.length)]);
    for (let j = 0; j < 3; j++) col.toArray(colori, (f * 3 + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colori, 3));
  const schegge = new THREE.InstancedMesh(g, new THREE.MeshPhongMaterial({
    vertexColors: true, emissive: 0xb05a08, specular: 0x9a7a3a, shininess: 40, flatShading: true }), N);
  const aloni = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: PZ.ps1.alone(255, 170, 40, 5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }), N);
  [schegge, aloni].forEach(function (m) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scena.add(m); });
  // OROLOGIO DALINIANO: mentre il tempo è sciolto (k da 0 a 1) i frammenti vicini brillano di più, con un alone giallo
  // più grande (si vedono meglio; non se ne aggiungono)
  let bagliore = 0;
  const EMI = new THREE.Color(0xb05a08), EMI_FORTE = new THREE.Color(0xffc21a), ALONE = new THREE.Color(0xffffff), ALONE_GIALLO = new THREE.Color(0xfff07a);
  function risalta(k) {
    if (Math.abs(k - bagliore) < 0.002 && k !== 0) return;
    bagliore = k;
    schegge.material.emissive.copy(EMI).lerp(EMI_FORTE, k);
    aloni.material.color.copy(ALONE).lerp(ALONE_GIALLO, k);
    aloni.material.opacity = 0.9 + 0.1 * k;
  }

  // ---------- Frammenti (riciclati) ----------
  const slot = [];
  for (let i = 0; i < N; i++) slot.push({ attivo: false, id: 0, tau: 0, x: 0, y: 0, corsia: 0, tipo: '', presa: -1, fase: i * 1.7 });
  let prossimoId = 1;
  const stat = { creati: { scia: 0, salto: 0, rischio: 0, cambio: 0 }, pienoPool: 0 };
  function nuovo(tau, corsia, y, tipo) {
    for (let i = 0; i < N; i++) {
      const s = slot[i];
      if (s.attivo) continue;
      s.attivo = true; s.id = prossimoId++; s.tau = tau; s.corsia = corsia; s.x = (corsia - 1) * LC; s.y = y; s.tipo = tipo; s.presa = -1;
      stat.creati[tipo]++;
      return s;
    }
    stat.pienoPool++;
    return null;
  }
  let completata = false;      // a raccolta finita non ne nascono altri
  let righeCorsa = 0;          // (avvio rapido) file viste in questa corsa: sulle prime c'è sempre una scia di frammenti
  // Chiamata dal generatore per ogni nuova fila r (p = la fila prima). Tutto in "tau", il tempo di gioco degli ostacoli.
  function suRiga(r, p, autoInCorsia) {
    if (completata || PZ.raccolta.completata || !p) return;
    const libera = function (x) { return x === 'L'; };
    const sicura = function (l, da, a) { return !autoInCorsia || !autoInCorsia(l, da - PRIMA, a + 0.3); };
    // SCIA: corsia libera nella fila prima e in questa, raggiungibile alla fila prima (lì si può restare fino a qui)
    const da = p.tau + 0.32, a = r.tau - 0.32;
    const buone = [0, 1, 2].filter(function (l) { return libera(p.corsie[l]) && libera(r.corsie[l]) && sicura(l, da, a); });
    let messa = false;
    // (FASE 6) i numeri cambiano con la difficoltà del momento (PZ.difficolta.ora, aggiornata dalla corsa)
    const pd = PZ.difficolta.ora || 0, val = function (v) { return Array.isArray(v) ? v[0] + (v[1] - v[0]) * pd : v; };
    righeCorsa++;
    // (fase 9) da 50 frammenti le file sono più fitte: per non far crescere i frammenti, ogni fila ne offre un po' meno
    const P50 = CFG.difficolta.dopo50, n50 = P50 ? Math.max(0, Math.min(1, (PZ.raccolta.livello() - P50.da) / (P50.pieno - P50.da))) : 0, meno = (1 - (P50 ? P50.menoFrammenti || 0 : 0) * n50) * (C.quanti || 1) / (1 + (PZ.difficolta.piuStoria ? PZ.difficolta.piuStoria('ostacoli') : 0));   // (fase 58) quanti: in tutto il 16% in meno
    if (righeCorsa <= 3 || rnd() < val(C.scia) * meno) {
      const corsie = buone.filter(function (l) { return p.R[l]; });
      if (corsie.length && a - da >= C.passoScia) {
        const l = corsie[Math.floor(rnd() * corsie.length)];
        const n = Math.max(2, Math.min(Math.round(val(C.sciaMax)), Math.floor((a - da) / C.passoScia) + 1));
        const t0 = (da + a) / 2 - (n - 1) * C.passoScia / 2;
        for (let k = 0; k < n; k++) nuovo(t0 + k * C.passoScia, l, BASSO, 'scia');
        messa = true;
      }
    }
    // CAMBIO: due frammenti subito dopo la fila prima in una corsia, e due subito prima di questa fila in un'altra corsia
    // (libera qui, raggiungibile, a portata di cambio corsia). Spesso la prima corsia è chiusa più avanti e la seconda
    // lo era prima: per prenderli tutti bisogna cambiare corsia nel momento giusto. Tra le due coppie c'è sempre il
    // tempo di spostarsi (il cambio corsia, alla velocità di questa fila: si vedono arrivare da lontano).
    if (!messa && rnd() < val(C.cambio) * meno) {
      const Fp = (r.tau - p.tau) / Math.max(0.3, r.gap || 1), ps = C.passoScia, scelte = [];
      [0, 1, 2].forEach(function (l1) {
        if (!libera(p.corsie[l1]) || !p.R[l1]) return;
        [0, 1, 2].forEach(function (l2) {
          if (l2 === l1 || !libera(r.corsie[l2]) || !r.R[l2] || Math.abs(l1 - l2) > (r.k || 0)) return;
          const t1 = p.tau + 0.32, t1e = t1 + ps, t2 = r.tau - 0.32 - ps;
          if (t2 - t1e < (0.12 + 0.38 * Math.abs(l1 - l2)) * Fp) return;   // i frammenti si vedono da lontano: basta il tempo del cambio
          if (!sicura(l1, t1, t1e) || !sicura(l2, t2, t2 + ps)) return;
          scelte.push([l1, l2, t1, t2]);
        });
      });
      if (scelte.length) {
        const c = scelte[Math.floor(rnd() * scelte.length)];
        for (let k = 0; k < 2; k++) nuovo(c[2] + k * ps, c[0], BASSO, 'cambio');
        for (let k = 0; k < 2; k++) nuovo(c[3] + k * ps, c[1], BASSO, 'cambio');
      }
    }
    // SALTO: sopra una transenna in una corsia raggiungibile a questa fila
    const trans = [0, 1, 2].filter(function (l) { return r.corsie[l] === 'T' && r.R[l]; });
    if (trans.length && rnd() < C.salto * meno) nuovo(r.tau, trans[Math.floor(rnd() * trans.length)], ALTO, 'salto');
    // RISCHIO: corsia libera e raggiungibile, accanto a un'auto o a una sagoma di questa fila
    if (rnd() < val(C.rischio) * meno) {
      const corsie = [0, 1, 2].filter(function (l) {
        if (!libera(r.corsie[l]) || !r.R[l] || !sicura(l, r.tau, r.tau)) return false;
        return [l - 1, l + 1].some(function (j) { return j >= 0 && j <= 2 && (r.corsie[j] === 'A' || r.corsie[j] === 'S'); });
      });
      if (corsie.length) {
        const l = corsie[Math.floor(rnd() * corsie.length)];
        nuovo(r.tau - 0.1, l, BASSO, 'rischio');
        if (sicura(l, r.tau, r.tau + 0.3)) nuovo(r.tau + 0.12, l, BASSO, 'rischio');
      }
    }
  }

  // ---------- Aggiornamento e disegno ----------
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), sc = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let tempo = 0;
  function libera(s) { s.attivo = false; s.presa = -1; }
  // dt in secondi; tau = tempo di gioco degli ostacoli (i frammenti scorrono come le transenne: V0 metri per tau)
  function aggiorna(dt, tau) {
    tempo += dt;
    // (fase 28) a tempo di musica: i frammenti si gonfiano un poco e l'alone si allarga sul battito della canzone
    const col = PZ.audio.colonna, bt = col && col.attiva() ? Math.max(0, col.colpo()) : 0, gonfia = 1 + 0.16 * bt, gonfiaAlone = 1 + 0.5 * bt;
    // (fase 34) e saltellano su e giù a tempo: toccano il punto più basso su ogni colpo e salgono a metà battito
    const nb = col && col.attiva() && col.battiti ? col.battiti() : -1, su = nb >= 0 ? 0.16 * Math.abs(Math.sin(Math.PI * nb)) : 0;
    for (let i = 0; i < N; i++) {
      const s = slot[i];
      if (!s.attivo) { schegge.setMatrixAt(i, zero); aloni.setMatrixAt(i, zero); continue; }
      const z = -V0 * (s.tau - tau);
      if (s.presa < 0 && z > 8) { libera(s); schegge.setMatrixAt(i, zero); aloni.setMatrixAt(i, zero); continue; }
      let y = quota(s) + (nb >= 0 ? su : 0.06 * Math.sin(tempo * 2.6 + s.fase)), k = A_lim((z + LONTANO) / 14), ka = k, giro = tempo * 2.2 + s.fase;
      if (s.presa >= 0) {          // raccolto: sale, gira veloce, si gonfia e sparisce; l'alone fa un lampo
        s.presa += dt;
        const u = Math.min(1, s.presa / 0.32);
        y += 0.55 * u; giro += 14 * u;
        k = (1 + 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.6))) * (1 - u);
        ka = (1 + 2.2 * u) * (1 - u * u);
        if (u >= 1) { libera(s); schegge.setMatrixAt(i, zero); aloni.setMatrixAt(i, zero); continue; }
      }
      p3.set(s.x, y, z);
      q.setFromEuler(e.set(0.25 * Math.sin(tempo * 1.3 + s.fase), giro, 0.18));
      const grande = s.tipo === 'salto' ? 1.25 : 1;       // quelli in alto un po' più grandi: si vedono da lontano
      const gg = s.presa >= 0 ? 1 : gonfia, ga = s.presa >= 0 ? 1 : gonfiaAlone;
      sc.set(k * grande * gg, k * grande * gg, k * grande * gg);
      schegge.setMatrixAt(i, M.compose(p3, q, sc));
      const vicino = bagliore > 0 ? bagliore * Math.max(0, Math.min(1, (z + 34) / 20)) : 0;     // di più per quelli vicini
      q.identity(); sc.set(1.5 * ka * grande * (1 + 1.1 * vicino) * ga, 1.5 * ka * grande * (1 + 1.1 * vicino) * ga, 1);
      aloni.setMatrixAt(i, M.compose(p3, q, sc));
    }
    schegge.instanceMatrix.needsUpdate = true; aloni.instanceMatrix.needsUpdate = true;
  }
  function A_lim(x) { return Math.max(0, Math.min(1, x)); }
  // FOGLIA DI SALVIA (salvia.js): mentre la bici vola a "alza" metri, i frammenti salgono con lei (restano davanti
  // alla bici, alla stessa altezza relativa di quelli a terra); scendendo tornano giù insieme. 0 = come sempre
  let alza = 0;
  function quota(s) { return alza > 0 ? Math.max(s.y, alza + BASSO) : s.y; }
  function solleva(m) { alza = Math.max(0, m || 0); }

  // Raccolta: xBici = posizione laterale; h = altezza delle ruote da terra (salto); tauPrima..tau = il tratto
  // percorso in questo fotogramma (così anche a velocità alta o con pochi fotogrammi non se ne salta nessuno).
  // Restituisce quanti frammenti NUOVI sono stati contati.
  function raccogli(xBici, h, tau, tauPrima) {
    let n = 0;
    for (let i = 0; i < N; i++) {
      const s = slot[i];
      if (!s.attivo || s.presa >= 0) continue;
      const z = -V0 * (s.tau - tau), zp = -V0 * (s.tau - tauPrima);
      if (Math.max(z, zp) < -0.65 || Math.min(z, zp) > 0.65) continue;     // davanti o già dietro la bici
      if (Math.abs(s.x - xBici) > 0.62) continue;                          // in un'altra corsia
      const sy = quota(s);
      if (sy < h - 0.12 || sy > h + 1.98) continue;                        // sotto le ruote (in volo) o sopra la testa
      if (sy > 1.5 && h < 0.6) continue;                                  // quelli sopra le transenne: solo in volo vero
      s.presa = 0;
      if (PZ.raccolta.conta(s.id)) n++;
    }
    return n;
  }
  // nuova partita: via tutti i frammenti (il contatore si azzera a parte, con PZ.raccolta.azzera)
  function reset() { slot.forEach(libera); completata = false; righeCorsa = 0; aggiorna(0, 0); }
  // raccolta completata: spariscono quelli in strada (quelli appena presi finiscono la loro animazione)
  function svuota() { completata = true; slot.forEach(function (s) { if (s.presa < 0) libera(s); }); }
  return { suRiga: suRiga, aggiorna: aggiorna, raccogli: raccogli, reset: reset, svuota: svuota, slot: slot, stat: stat, ALTO: ALTO, BASSO: BASSO,
    risalta: risalta, solleva: solleva, oggetti: [schegge, aloni] };
};
