// L'inseguimento. Il demone corre dietro al ragazzo, nella sua stessa corsia (con un attimo di ritardo).
//  - Se il giocatore non sbaglia, la distanza resta più o meno stabile (si accorcia appena col passare del tempo).
//  - A ogni errore (auto, transenna, sagoma) il demone guadagna metri (l'auto è il più grave: ti arriva alle calcagna
//    e ci resta per qualche secondo, e un altro errore in quel tempo è la fine); gli errori ravvicinati lo rendono più
//    aggressivo (guadagna di più e la distanza "stabile" si accorcia). L'aggressività si calma da sola.
//  - Se arriva addosso al ragazzo lo afferra e la partita finisce (game over: corsa.js, cattura). cattura() e il
//    "respinto indietro" restano per l'animazione della presa.
// Lo specchietto in alto mostra la strada alle spalle del ragazzo quando il demone si avvicina o dopo un errore.
PZ.creaInseguimento = function (demone) {
  const C = PZ.CONFIG.strada.demone;
  const mix = function (a, b, k) { return a + (b - a) * k; };
  const S = { dist: C.distanzaIniziale, obiettivo: C.distanzaStabile, aggressivita: 0, catture: 0, x: 0, presa: 0, riduzione: 0, vicinanza: 0, t: 0, respinta: 0 };
  function reset(dist, x) {
    S.investito = 0;
    S.dist = dist === undefined ? C.distanzaIniziale : dist; S.x = x || 0; S.aggressivita = 0; S.catture = 0; S.presa = 0; S.riduzione = 0; S.respinta = 0; S.t = 0; S.vicinanza = 0;
  }
  // un errore: restituisce true se il demone è arrivato addosso
  // (fase 66) la partenza: S.t < slancio + fuga
  const P0 = C.partenza;
  function inPartenza() { return !!P0 && S.t < P0.slancio + P0.fuga; }
  function errore(tipo) {
    if (inPartenza()) {
      // all'inizio un errore lo porta addosso (le manone ti sfiorano), ma non ti prende
      S.dist = Math.max(C.cattura + P0.sfiora, S.dist - (C.perdite[tipo] || 6));
      S.aggressivita = Math.min(3, S.aggressivita + 1);
      return false;
    }
    const perdita = (C.perdite[tipo] || 6) * (1 + C.aggressivita * S.aggressivita), prima = S.dist;
    S.dist -= perdita;
    S.aggressivita = Math.min(3, S.aggressivita + 1);
    // investito da un'auto: l'errore più grave. Il demone ti arriva alle calcagna e ci resta per un po'. Da solo non
    // uccide (anche ora che, nelle fasi difficili, il demone sta più vicino): uccide se arriva mentre è già addosso
    if (tipo === 'auto' && C.investimento) {
      const calcagna = C.cattura + C.investimento.margine;
      if (S.dist > C.cattura || (prima > calcagna && !(S.investito > 0))) {
        S.dist = Math.min(Math.max(S.dist, calcagna), calcagna); S.aggressivita = 3; S.investito = C.investimento.durata;
      }
    }
    return S.dist <= C.cattura;
  }
  function cattura() {
    S.catture++; S.presa = 1.0; S.dist = C.cattura - 0.6; S.riduzione = C.tempoMargineRidotto; S.aggressivita = Math.max(1, S.aggressivita * 0.5);
    S.lato = S.x >= 0 ? 1 : -1;      // lo afferra dal lato esterno della strada
  }
  // p: difficoltà 0..1; xBici: corsia del ragazzo; bersaglio: testa del ragazzo; intensita: atmosfera 0..1
  function aggiorna(dt, p, xBici, bersaglio, intensita) {
    S.t += dt;
    S.aggressivita *= Math.exp(-dt * 0.035);                 // si dimezza in circa 20 secondi
    if (S.riduzione > 0) S.riduzione -= dt;
    if (S.investito > 0) S.investito -= dt;
    S.obiettivo = S.investito > 0 ? C.cattura + C.investimento.margine : Math.max(C.distanzaMinima, mix(C.distanzaStabile, C.distanzaMinimaStabile, p) - (S.riduzione > 0 ? C.margineRidotto : 0) - 1.5 * S.aggressivita);
    if (S.presa > 0) {                                        // lo tiene per un attimo, poi viene respinto
      S.presa -= dt;
      if (S.presa <= 0) S.respinta = 1;
    } else if (S.respinta > 0) {
      S.respinta = Math.max(0, S.respinta - dt / 0.5);
      S.dist = mix(C.dopoCattura, S.dist, S.respinta * S.respinta);
    } else if (inPartenza()) {
      // (fase 66) PARTENZA: prima lo scatto fino alle tue spalle, poi la fuga lenta fino alla distanza normale
      if (S.t < P0.slancio) S.dist += (P0.vicino - S.dist) * (1 - Math.exp(-dt * 4));
      else {
        const f = Math.min(1, (S.t - P0.slancio) / P0.fuga), e = f * f * (3 - 2 * f);
        const ob = mix(P0.vicino, S.obiettivo, e);
        S.dist += (ob - S.dist) * (1 - Math.exp(-dt * (S.dist < ob ? 0.6 : 2)));
      }
    } else {
      const k = S.dist > S.obiettivo ? 0.35 : C.recupero;    // da lontano accorcia in fretta, da vicino si allontana piano
      S.dist += (S.obiettivo - S.dist) * (1 - Math.exp(-dt * k));
    }
    S.x += (xBici - S.x) * (1 - Math.exp(-dt * 1.6));
    const ondeggia = 0.35 * Math.sin(S.t * 0.9) * (S.presa > 0 ? 0 : 1);
    // quando lo afferra si mette di fianco, un po' dietro, e allunga le braccia verso di lui: così non copre la
    // strada davanti (la telecamera è alle sue spalle); mentre viene respinto torna al centro della corsia
    const kp = S.presa > 0 ? 1 : S.respinta;
    const xd = S.x + ondeggia + (S.lato || 1) * 0.95 * kp, zd = Math.max(1.6 + 0.6 * kp, S.dist);
    demone.posiziona(xd, 0, zd, kp > 0.02 ? Math.atan2(xBici - xd, -zd) : Math.PI);
    demone.anima(dt, S.presa > 0 ? 'afferra' : 'corre', 11, bersaglio, intensita);
    // vicinanza: 0 = lontano (distanza stabile o più), 1 = addosso
    S.vicinanza = Math.max(0, Math.min(1, (C.distanzaStabile - S.dist) / (C.distanzaStabile - C.cattura)));
    return S.dist <= C.cattura && S.presa <= 0 && S.respinta <= 0;
  }
  // OROLOGIO DALINIANO: mentre il tempo è sciolto il demone resta indietro (metri al secondo VERO, k da 0 a 1), fino a
  // "max" metri oltre la distanza a cui vorrebbe stare; poi riprende a inseguire con le sue regole (da lontano accorcia
  // in qualche secondo, non subito). Non mentre afferra o viene respinto.
  function allontana(dtVero, k, velocita, max) {
    if (k <= 0 || S.presa > 0 || S.respinta > 0) return;
    S.dist = Math.min(Math.max(S.dist, S.obiettivo + max), S.dist + velocita * k * dtVero);
  }
  return { stato: S, reset: reset, errore: errore, cattura: cattura, aggiorna: aggiorna, allontana: allontana };
};

// Specchietto retrovisore: una piccola immagine in alto con la strada alle spalle del ragazzo (e il demone).
// Si disegna in una texture a parte, solo quando serve e un fotogramma ogni pochi: costa poco.
PZ.creaSpecchietto = function (renderer) {
  const CFG = PZ.CONFIG.strada.specchietto;
  const W = 160, H = 64;
  const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  // nello specchietto la nebbia è più fitta: dietro di te la strada sparisce nel buio dopo pochi metri, il demone
  // (che la nebbia non copre) resta ben visibile, e le auto già passate escono di scena senza "sparire" a vista
  const NEBBIA_DIETRO = { vicino: 5, lontano: 30 };
  const cam = new THREE.PerspectiveCamera(27, W / H, 0.2, NEBBIA_DIETRO.lontano + 2);
  const cornice = document.getElementById('specchio');
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scenaQuad = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, depthTest: false, depthWrite: false, transparent: true }));
  // posizione sullo schermo (coordinate da -1 a 1): in alto al centro, immagine specchiata come in un retrovisore
  quad.position.set(0, 0.835, 0); quad.scale.set(-0.66, 0.15, 1);
  scenaQuad.add(quad);
  let vis = 0, tempo = 0, n = 0;
  function mostra(sec) { tempo = Math.max(tempo, sec); }
  function aggiorna(dt, pericolo) {
    if (tempo > 0) tempo -= dt;
    const vuole = CFG.attivo && (tempo > 0 || pericolo);
    vis += ((vuole ? 1 : 0) - vis) * Math.min(1, dt * 6);
    if (cornice) { PZ.opacita(cornice, vis); if (cornice.__p !== !!pericolo) { cornice.__p = !!pericolo; cornice.classList.toggle('pericolo', !!pericolo); } }
  }
  // da chiamare dopo aver disegnato la scena principale
  // dist: distanza del demone (la telecamera dello specchietto lo inquadra al centro)
  // Si fa in due tempi: PRIMA della scena principale l'immagine dello specchietto (immagine), DOPO la si appoggia sopra
  // (sovrapponi). Così la scheda video non deve riprendere l'immagine principale già finita per disegnarci sopra di
  // nuovo dopo aver lavorato altrove: sui telefoni (iPhone compreso) quel "riprendere" costa un fotogramma intero.
  function disegna(scena, xBici, dist) { immagine(scena, xBici, dist); sovrapponi(); }
  function immagine(scena, xBici, dist) {
    if (vis < 0.02) return;
    if (n++ % CFG.ogniFotogrammi === 0) {
      cam.position.set(xBici, 2.05, 0.35); cam.lookAt(xBici * 0.7, 1.35, Math.max(8, Math.min(26, dist || 18)));
      const f = scena.fog, n0 = f.near, f0 = f.far;
      f.near = NEBBIA_DIETRO.vicino; f.far = NEBBIA_DIETRO.lontano;
      renderer.setRenderTarget(rt); renderer.render(scena, cam); renderer.setRenderTarget(null);
      f.near = n0; f.far = f0;
    }
  }
  function sovrapponi() {
    if (vis < 0.02) return;
    quad.material.opacity = vis;
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.render(scenaQuad, ortho);
    renderer.autoClear = ac;
  }
  function nascondi() { tempo = 0; vis = 0; PZ.opacita(cornice, 0); }
  // preriscaldamento (corsa.js): disegna una volta la scena nella SUA immagine, così la scheda video prepara già ora
  // tutto ciò che serve per disegnare lì dentro (la prima volta costa: in corsa farebbe scattare il gioco)
  function prepara(scena) {
    cam.position.set(0, 2.05, 0.35); cam.lookAt(0, 1.35, 18); cam.updateMatrixWorld();
    renderer.setRenderTarget(rt); renderer.render(scena, cam);
    cam.lookAt(0, 1.35, -18); cam.updateMatrixWorld(); renderer.render(scena, cam);     // anche verso la strada davanti
    renderer.setRenderTarget(null);
    const ac = renderer.autoClear; renderer.autoClear = false; quad.material.opacity = 0.01; renderer.render(scenaQuad, ortho); renderer.autoClear = ac;
  }
  return { mostra: mostra, aggiorna: aggiorna, disegna: disegna, immagine: immagine, sovrapponi: sovrapponi, nascondi: nascondi, prepara: prepara, camera: cam, visibile: function () { return vis; }, NEBBIA_DIETRO: NEBBIA_DIETRO };
};
