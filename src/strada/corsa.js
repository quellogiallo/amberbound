// SCENA 2: la strada. Prima la scena iniziale (il ragazzo esce dal portone, vede il demone, sale in bici e scappa),
// poi la corsa: il ragazzo pedala da solo, il giocatore cambia corsia per evitare auto e sagome e salta le transenne,
// mentre il demone della paranoia lo insegue.
//
// Controlli: telefono = scorri il dito a sinistra/destra (una corsia per gesto) oppure i pulsanti ◀ ▶; per saltare il
// pulsante SALTA oppure scorri in su. PC = frecce sinistra/destra o A/D, Spazio (o freccia su, W) per saltare.
// R oppure il pulsante RIAVVIA ricominciano la corsa (senza la scena iniziale).
//
// Velocità: la corsa accelera piano (parametri in config.js, sezione strada.difficolta). Tutto ciò che scorre
// (strada, auto, transenne, sagome) segue un unico "tempo di gioco" tau: quando il gioco accelera tau scorre più in
// fretta, dopo un urto rallenta per un attimo (il mondo intero rallenta, come uno sbandamento), e l'ordine degli
// ostacoli deciso dal generatore resta sempre valido.
PZ.creaCorsa = function (opz) {
  const CFG = PZ.CONFIG.strada, D = CFG.difficolta, renderer = opz.renderer, stage = opz.stage;
  const $ = function (id) { return document.getElementById(id); };
  const SCH = PZ.CONFIG.schermo;
  const scena = new THREE.Scene();
  const citta = PZ.creaCitta(scena);
  const occhi = PZ.creaOcchi(scena, 140);
  const demone = PZ.creaDemone(scena, occhi, { manone: true });   // (fase 10) con le due manone artigliate
  const rnd = PZ.ps1.casuale(321);
  const branco = (function () {   // le sagome (riciclate), usate sia come ostacoli sia come apparizioni
    const tutte = ['alta', 'curva', 'sottile', 'accucciata', 'storta', 'alta', 'sottile'].map(function (v, i) { return PZ.creaSagoma(scena, occhi, v, 11 + i); });
    const occupate = [];
    return {
      tutte: tutte,
      prendi: function () {
        const libere = tutte.filter(function (s) { return occupate.indexOf(s) < 0 && !s.visibile; });
        if (!libere.length) return null;
        const s = libere[Math.floor(rnd() * libere.length)]; occupate.push(s); return s;
      },
      rilascia: function (s) { const i = occupate.indexOf(s); if (i >= 0) occupate.splice(i, 1); },
      reset: function () { tutte.forEach(function (s) { s.nascondi(); }); occupate.length = 0; }
    };
  })();
  const transenne = PZ.creaTransenne(scena, citta.materiali, 24);
  const frammenti = PZ.creaFrammenti(scena, D.velocitaIniziale);
  const ragazze = PZ.creaRagazze(scena, { seduta: 2, ginocchio: 2, rannicchiata: 2, piedi: 2, fissa: 2, braccia: 2 });
  const orologio = PZ.creaOrologio(scena, D.velocitaIniziale);      // l'orologio daliniano (raro): rallenta il mondo
  const salvia = PZ.creaSalvia(scena, D.velocitaIniziale);          // la foglia di salvia gialla (una per partita): la bici vola
  // per ogni nuova fila di ostacoli: prima i frammenti, poi (forse) l'orologio, dove non ci sono frammenti
  let manata = null;   // la manata del demone (fase 6, src/strada/manata.js): creata subito sotto
  const traffico = PZ.creaTraffico(scena, citta, { transenne: transenne, branco: branco, ragazze: ragazze, suManata: function (r) { if (manata) manata.nuova(r); }, suRiga: function (r, p, auto) {
    frammenti.suRiga(r, p, auto);
    // (fase 55) O Ave Maria e orologio mai vicini: mentre uno dei due è in strada o il suo effetto è attivo l'altro non
    // compare, e tra i due restano almeno 7 secondi (S.puFine: ultimo istante "occupato", nel tempo del mondo)
    const tR = S.t + (r.tau - S.tau) / Math.max(0.5, S.Fnom || 1);
    const occ = salvia.inVolo() || orologio.attivo() || !!salvia.stato.inStrada || !!orologio.stato.inStrada;
    if (occ || tR - (S.puFine === undefined ? -1e9 : S.puFine) < 7) return;
    orologio.suRiga(r, p, auto, tR, frammenti);
    if (orologio.stato.inStrada) { S.puFine = tR; return; }
    salvia.suRiga(r, p, auto, frammenti);
    if (salvia.stato.inStrada) S.puFine = tR;
  } });
  manata = PZ.creaManata({ scena: scena, occhi: occhi, LC: citta.LC, V0: D.velocitaIniziale, traffico: traffico });
  const apparizioni = PZ.creaApparizioni(citta, branco);
  const ciclista = PZ.creaCiclista(scena);
  const atmosfera = PZ.creaAtmosfera(scena, citta);
  const inseguimento = PZ.creaInseguimento(demone);
  const specchietto = PZ.creaSpecchietto(renderer);
  let eventi = null;    // blackout e sensi di colpa (creati più sotto, quando c'è l'interfaccia)
  const camera = new THREE.PerspectiveCamera(CFG.campoVisivo, SCH.larghezzaInterna / SCH.altezzaInterna, 0.1, 300);
  const LC = citta.LC, DUR = CFG.durataCambioCorsia, R = ciclista.raggioRuota, RAPPORTO = 2.3, V0 = D.velocitaIniziale;
  // telecamera di gioco: dietro e un po' sopra il ragazzo, guarda dritto lungo la strada
  const CAM = { y: 3.7, z: 5.4, guardaY: 0.6, guardaZ: -10, segui: 0.6 };
  function cameraGioco(x, out) { const cx = x * CAM.segui; out.pos.set(cx, CAM.y, CAM.z); out.guarda.set(cx, CAM.guardaY, CAM.guardaZ); return out; }

  const S = {
    attiva: false, fase: 'ferma', tFase: 0, t: 0, tTot: 0, tau: 0, F: 1, p: 0, metri: 0, vel: 0, corsia: 0,
    x: 0, xc: 0, vx: 0, xDa: 0, vDa: 0, xA: 0, tc: DUR, spinta: 0, tSpinta: 1,
    urti: { auto: 0, transenna: 0, sagoma: 0, manata: 0 }, errori: 0, invul: 0, recupero: 1, scossa: 0, sbandata: 0, inclina: 0, ruote: 0, pedivella: 0, camX: 0,
    salto: { fase: 'no', t: 0, h: 0, pend: 0, alz: 0, alz0: 0, hp: 0, pendp: 0, coda: false }, salti: 0, sguardo: null, prossimoSguardo: 25,
    battito: 0, avvisoSalto: false, pronto: false
  };
  const intro = PZ.creaIntro({ scena: scena, citta: citta, ciclista: ciclista, demone: demone, camera: camera, S: S, cameraGioco: cameraGioco });

  // ---------- Interfaccia ----------
  const ui = { corsa: $('corsa'), metri: $('metri'), urti: $('urti'), dem: $('demoneDist'), conto: $('conto'), aiuto: $('corsaAiuto'),
    lampo: $('lampoUrto'), velo: $('velo'), salta: $('salta'), saltaIntro: $('saltaIntro'), ambra: $('ambraHud'), ambraN: $('ambraN'), morte: $('morte'), morteN: $('morteN') };
  let metriMostrati = -1, demMostrato = -1, contoMostrato = '', tConto = 0;
  // le scritte grandi usano il font DRUNK, che non ha accenti né ! ? ' /: qui le lettere accentate diventano semplici
  // e gli altri segni spariscono (un apostrofo diventa uno spazio)
  function perFont(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['\u2019]/g, ' ').replace(/[^A-Za-z0-9 ,.\-]/g, ''); }
  // il font è largo: se la parola più lunga non sta nella larghezza dello schermo, la scritta si rimpicciolisce
  const misura = document.createElement('canvas').getContext('2d');
  // (il risultato si ricorda per ogni scritta: misurare costringe il browser a ricalcolare la pagina, una volta basta)
  const misurate = {};
  let largConto = 0;                                  // larghezza della scritta: misurata una volta (e dopo un ridimensionamento)
  window.addEventListener('resize', function () { largConto = 0; });
  function adatta(el, testo) {
    if (!testo) { el.style.fontSize = ''; return; }
    if (!largConto) largConto = el.clientWidth;
    const chiave = testo + '|' + largConto;
    if (misurate[chiave] !== undefined) { el.style.fontSize = misurate[chiave]; return; }
    el.style.fontSize = '';
    const cs = getComputedStyle(el), px = parseFloat(cs.fontSize), sp = parseFloat(cs.letterSpacing) || 0;
    misura.font = px + 'px Drunk, monospace';
    let largo = 0;
    testo.split(' ').forEach(function (p) { largo = Math.max(largo, misura.measureText(p).width + sp * p.length); });
    const spazio = largConto * 0.92;
    misurate[chiave] = largo > spazio ? (px * spazio / largo) + 'px' : '';
    el.style.fontSize = misurate[chiave];
  }
  // la scritta grande al centro: un'immagine già pronta (PZ.scritte, in fluido.js), non testo da ridisegnare
  const pxConto = {};
  function mostraConto(testo, durata) {
    testo = perFont(testo || '');
    tConto = durata || 0;
    if (testo === contoMostrato) return;
    contoMostrato = testo;
    ui.conto.classList.toggle('lungo', testo.length > 8);
    let img = null;
    if (testo) {
      const lungo = testo.length > 8 ? 1 : 0;
      if (!largConto) largConto = ui.conto.clientWidth;
      if (!pxConto[lungo]) { ui.conto.style.fontSize = ''; pxConto[lungo] = parseFloat(getComputedStyle(ui.conto).fontSize); }
      img = PZ.scritte.immagine(testo, pxConto[lungo], largConto * 0.92, 0.02);
    }
    if (img) { ui.conto.textContent = ''; ui.conto.appendChild(img); ui.conto.style.fontSize = ''; }
    else { ui.conto.textContent = testo; adatta(ui.conto, testo); }
    if (testo) PZ.riavviaClasse(ui.conto, 'pop'); else ui.conto.classList.remove('pop');
  }
  // prepara prima della corsa le immagini delle scritte che compariranno (dietro lo schermo nero del passaggio)
  function preparaScritte() {
    ['SCAPPA', 'SALTA', 'INVESTITO', 'SENSI DI COLPA', 'O AVE MARIA'].concat(CFG.orologio.attivo !== false ? ['IL TEMPO SI SCIOGLIE'] : []).forEach(function (t) { mostraConto(t, 0); });
    mostraConto('', 0);
    // (fase 11) anche le scritte del finale: "CENTO SU CENTO" sul cartello e "AMBRA" sulla schermata di fine. Erano
    // testo nel font DRUNK (migliaia di puntini per lettera, con contorno e ombre): il browser le disegnava proprio nel
    // momento dei 100 frammenti, ed era un blocco lungo. Ora sono immagini preparate qui, dietro lo schermo nero
    scrittaFissa(document.querySelector('#finale b'), 0.9, 0.04);
    scrittaFissa(document.querySelector('#scFine h1'), 0.9, 0.3);
  }
  function scrittaFissa(el, quota, sp) {
    if (!el || el.__img) return;
    const testo = perFont(el.textContent.trim()); if (!testo) return;
    const px = parseFloat(getComputedStyle(el).fontSize) || 40, larg = (stage.clientWidth || 360) * quota;
    const img = PZ.scritte.immagine(testo, px, larg, sp);
    if (!img) return;                                      // font non ancora pronto: resta il testo
    el.__img = true; el.textContent = ''; el.appendChild(img);
  }
  function aggiornaHud(forza) {
    const m = Math.floor(ARC.attiva ? S.punti : S.metri);        // (arcade: i metri della classifica, con la furia doppi)
    if (forza || m !== metriMostrati) { metriMostrati = m; ui.metri.textContent = m + ' m'; }
    const d = Math.max(0, Math.round(inseguimento.stato.dist));
    if (forza || d !== demMostrato) { demMostrato = d; ui.dem.textContent = 'DEMONE ' + d + ' m'; ui.dem.classList.toggle('vicino', inseguimento.stato.vicinanza > 0.55); }
    if (forza) ui.urti.textContent = 'URTI ' + (S.urti.auto + S.urti.transenna + S.urti.sagoma + (S.urti.manata || 0)) + (inseguimento.stato.catture ? '  ·  PRESO ' + inseguimento.stato.catture : '');
  }
  // contatore dei frammenti: si aggiorna subito e, a ogni nuovo frammento, il numero pulsa un attimo
  let ambraMostrata = -1;
  function aggiornaAmbra(nuovo) {
    const n = PZ.raccolta.conteggio;
    if (n === ambraMostrata && !nuovo) return;
    ambraMostrata = n;
    ui.ambraN.textContent = n + '/' + PZ.raccolta.passo();
    if (nuovo) PZ.riavviaClasse(ui.ambra, 'preso');
  }
  function lampo(classe) { ui.lampo.className = 'ui ' + classe; PZ.dopoFotogramma(function () { if (ui.lampo.className === 'ui ' + classe) ui.lampo.classList.add('via'); }); }
  eventi = PZ.creaEventi({ scena: scena, stage: stage, renderer: renderer, ui: ui, mostraConto: mostraConto, lampo: lampo });
  // la paranoia: più il demone è vicino, più il mondo si deforma e genera allucinazioni (src/strada/paranoia.js)
  const paranoia = PZ.creaParanoia({ scena: scena, citta: citta, ragazze: ragazze, stage: stage, atmosfera: atmosfera, lampo: lampo, velo: $('paranoiaVelo') });
  // OROLOGIO DALINIANO: la città gialla e nera che si scioglie (tutto tranne il ragazzo, la bici, i frammenti e l'orologio)
  const sciogli = PZ.creaScioglimento({ scena: scena, escludi: [ciclista.bici.gruppo, ciclista.ragazzo.gruppo, orologio.gruppo].concat(frammenti.oggetti) });
  if (CFG.orologio.attivo !== false) sciogli.prepara();   // (con l'orologio tolto i materiali restano quelli originali)
  // nel blackout la foschia si chiude e diventa nera: si vede meno lontano
  const NEBBIA_BUIO = { near: 9, far: 58 };
  function anomalia(breve) {
    const c = breve ? 'anomaliaBreve' : 'anomalia';
    PZ.riavviaClasse(stage, c);
    setTimeout(function () { stage.classList.remove(c); }, breve ? 450 : 950);
  }

  // ---------- Corsie ----------
  function cambia(d) {
    if (!S.attiva || S.fase !== 'corsa' || PZ.avvisi.aperto() || ARC.sceltaAperta()) return false;
    if (eventi.invertiti()) d = -d;           // SENSI DI COLPA: destra e sinistra si scambiano (tutti i comandi passano di qui)
    const nuova = Math.max(-1, Math.min(1, S.corsia + d));
    if (nuova === S.corsia) { S.spinta = d; S.tSpinta = 0; return false; }   // già sul bordo: piccola spinta e ritorno
    S.corsia = nuova;
    S.xDa = S.xc; S.vDa = S.vx; S.xA = nuova * LC; S.tc = 0;
    if (PZ.audio.scarto) PZ.audio.scarto();
    return true;
  }
  // spostamento morbido (curva di Hermite): parte dalla posizione e dalla velocità attuali, arriva ferma al centro corsia
  function muoviLaterale(dt) {
    if (S.tc < DUR) {
      S.tc = Math.min(DUR, S.tc + dt);
      const s = S.tc / DUR, s2 = s * s, s3 = s2 * s;
      S.xc = (2 * s3 - 3 * s2 + 1) * S.xDa + (s3 - 2 * s2 + s) * DUR * S.vDa + (-2 * s3 + 3 * s2) * S.xA;
      S.vx = ((6 * s2 - 6 * s) * S.xDa + (3 * s2 - 4 * s + 1) * DUR * S.vDa + (-6 * s2 + 6 * s) * S.xA) / DUR;
    } else { S.xc = S.xA; S.vx = 0; }
    let spinta = 0;
    if (S.tSpinta < 1) { S.tSpinta = Math.min(1, S.tSpinta + dt / 0.28); spinta = S.spinta * 0.22 * Math.sin(Math.PI * S.tSpinta); }
    S.x = S.xc + spinta;
  }

  // ---------- Salto: breve preparazione, salita e discesa morbide, atterraggio ----------
  // Bici e ragazzo si alzano insieme (il ragazzo resta con mani e piedi su manubrio e pedali).
  // Un tocco = un salto. Se tocchi negli ultimi istanti in aria, il salto riparte appena le ruote toccano terra.
  const PREP = 0.07, ARIA = CFG.salto.durata, H = CFG.salto.altezza, CODA = 0.15;
  function formaSalto(t, out) {          // t = secondi dall'inizio del salto, preparazione compresa
    if (t < PREP) { out.h = 0; out.pend = 0.06 * t / PREP; return out; }
    const u = Math.min(1, (t - PREP) / ARIA), w = 2 * u - 1, w2 = w * w;
    out.h = H * (1 - 0.5 * w2 - 0.5 * w2 * w2);                                  // sale in fretta, resta in alto, scende morbida
    out.pend = 0.06 * (1 - u) * (1 - u) + 0.2 * Math.sin(2 * Math.PI * u) * (1 - 0.4 * u);   // muso su in salita, appena giù prima di atterrare
    return out;
  }
  function salta() {
    if (!S.attiva || S.fase !== 'corsa' || PZ.avvisi.aperto() || ARC.sceltaAperta()) return false;
    if (salvia.inVolo()) return false;                  // in volo con la salvia non si salta
    const s = S.salto;
    if (s.fase === 'aria' && s.t > PREP + ARIA - CODA) { s.coda = true; return true; }   // partirà appena atterra
    if (s.fase !== 'no' && s.fase !== 'atterra') return false;
    parti();
    return true;
  }
  function parti() {
    const s = S.salto;
    s.fase = 'prep'; s.t = 0; s.coda = false; s.alz0 = s.alz; S.salti++;
    if (PZ.audio.salto) PZ.audio.salto();
  }
  const polvere = new THREE.Mesh(new THREE.CircleGeometry(0.9, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9a96a8, transparent: true, opacity: 0, depthWrite: false }));
  scena.add(polvere);
  let tPolvere = 1;
  function aggiornaSalto(dt) {
    const s = S.salto;
    s.hp = s.h; s.pendp = s.pend;          // com'era nel fotogramma prima (serve al controllo delle transenne)
    s.t += dt;
    if (s.fase === 'prep' || s.fase === 'aria') {
      formaSalto(s.t, s);
      if (s.t < PREP) s.alz = s.alz0 + (1 - s.alz0) * (s.t / PREP);
      else { s.fase = 'aria'; s.alz = 1 - 0.7 * Math.min(1, (s.t - PREP) / ARIA); }
      if (s.t >= PREP + ARIA) {
        s.fase = 'atterra'; s.t = 0; s.h = 0; s.pend = 0; tPolvere = 0; if (PZ.audio.atterraggio) PZ.audio.atterraggio();
        if (s.coda) parti();
      }
    } else if (s.fase === 'atterra') {
      const u = Math.min(1, s.t / 0.18); s.alz = -0.6 * Math.sin(Math.PI * u); s.h = 0; s.pend = 0;
      if (u >= 1) { s.fase = 'no'; s.alz = 0; }
    } else { s.h = 0; s.pend = 0; s.alz = 0; }
    if (tPolvere < 1) {
      tPolvere = Math.min(1, tPolvere + dt / 0.35);
      polvere.visible = true; polvere.position.set(S.x, 0.02, 0.1);
      polvere.scale.setScalar(0.5 + 1.2 * tPolvere); polvere.material.opacity = 0.45 * (1 - tPolvere);
    } else polvere.visible = false;
  }
  // Punto più basso della bici nel punto z della strada (la bici guarda verso -z), con il salto ad altezza h e
  // pendenza pend: ruote rotonde (raggio e assi del modello originale), pedali e piedi tra le ruote.
  // Infinity = lì non c'è la bici. Serve a decidere se una transenna passa davvero sotto le ruote.
  const ASSI = ciclista.bici.assi, PEDALI = 0.08, SOGLIA_T = transenne.ALTEZZA - 0.02, ZONA_T = 0.86 + 0.12;
  function bassoBici(z, h, pend) {
    const X = -z, cs = Math.cos(pend), sn = Math.sin(pend);
    let c = Infinity;
    for (let i = 0; i < 2; i++) {
      const xa = ASSI[i] * cs - R * sn, ya = h + ASSI[i] * sn + R * cs, d = Math.abs(X - xa);
      if (d <= R) c = Math.min(c, ya - Math.sqrt(R * R - d * d));
    }
    if (X > ASSI[0] && X < ASSI[1]) c = Math.min(c, h + X * sn + PEDALI);
    return c;
  }
  // altezza minima della bici sopra una transenna (spessa pochi centimetri) che in questo fotogramma è passata da zp
  // a z: si controlla tutto il tratto percorso, con il salto interpolato, così le ruote non la attraversano mai
  function quota(z, zp) {
    if (zp === undefined) zp = z;
    const s = S.salto, n = Math.max(1, Math.ceil(Math.abs(z - zp) / 0.04));
    const hp = s.hp === undefined ? s.h : s.hp, pp = s.pendp === undefined ? s.pend : s.pendp;
    let m = Infinity;
    for (let k = 0; k <= n; k++) {
      const a = k / n, zz = zp + (z - zp) * a, h = hp + (s.h - hp) * a, pe = pp + (s.pend - pp) * a;
      m = Math.min(m, bassoBici(zz - 0.02, h, pe), bassoBici(zz + 0.02, h, pe));
    }
    return m;
  }
  // prova "a vuoto": se il salto partisse adesso, la transenna o passerebbe sotto le ruote? (accende il pulsante SALTA)
  const prova = { h: 0, pend: 0 };
  function saltoRiuscirebbe(o) {
    const v = Math.max(1, S.vel), dtp = 1 / 240;
    for (let t = 0; t <= PREP + ARIA; t += dtp) {
      const z = o.z + v * t;
      if (z > ZONA_T) return true;          // passata dietro alla bici senza toccarla
      if (z < -ZONA_T) continue;            // ancora davanti
      formaSalto(t, prova);
      if (Math.min(bassoBici(z - 0.02, prova.h, prova.pend), bassoBici(z + 0.02, prova.h, prova.pend)) < SOGLIA_T) return false;
    }
    return false;                           // atterrerebbe prima che la transenna sia passata
  }

  // ---------- Urti e cattura ----------
  function urto(h) {
    traffico.urta(h, S.x, S.vel);
    S.urti[h.tipo]++; S.errori++;
    S.invul = 1.4; S.recupero = 0; S.scossa = 0.4; S.sbandata = 1;
    if (h.tipo === 'manata') { anomalia(false); lampo('presa'); if (PZ.audio.manataUrto) PZ.audio.manataUrto(); }      // la mano del demone
    else if (h.tipo === 'sagoma' || h.ogg.ragazza) { anomalia(true); lampo('sagoma'); if (PZ.audio.sagomaUrto) PZ.audio.sagomaUrto(); }   // un'allucinazione
    else { lampo('rosso'); if (h.tipo === 'auto') { if (PZ.audio.urto) PZ.audio.urto(); if (PZ.audio.clacson) PZ.audio.clacson(); } else if (PZ.audio.transenna) PZ.audio.transenna(); }
    specchietto.mostra(3.5);
    if (inseguimento.errore(h.tipo)) { cattura(); aggiornaHud(true); return; }
    if (h.tipo === 'auto') {     // investito: il colpo più duro, il demone è addosso
      S.scossa = 0.75; anomalia(false); mostraConto('INVESTITO', 1.2);
      specchietto.mostra(PZ.CONFIG.strada.demone.investimento.durata);
    }
    aggiornaHud(true);
  }
  // ---------- Cattura: il demone lo prende e la partita finisce ----------
  // La morte è uno stato esplicito (S.fase = 'morte'): si entra una volta sola e solo dalla corsa; se la raccolta è
  // già completata vince la scogliera. Il mondo si ferma, il demone lo afferra, la scena si oscura, poi il pannello
  // con RIPROVA. Nessun sistema di gioco viene più aggiornato (ostacoli, frammenti, eventi, demone che uccide).
  // ---------- Orologio daliniano ----------
  const lentoUi = { velo: $('lento'), barra: $('tempoHud') };
  function prendiOrologio() {
    orologio.attiva();
    lampo('orologio'); mostraConto('IL TEMPO SI SCIOGLIE', 1.4);
    if (PZ.audio.orologio) PZ.audio.orologio();
    S.tic = 0.75;                                        // il primo tic dopo il ticchettio al contrario
  }
  // il velo color seppia ai bordi, la barra che si svuota, il ticchettio che rallenta
  function aggiornaLento(dt) {
    const k = (1 - S.lento) / (1 - PZ.CONFIG.strada.orologio.lento);
    PZ.opacita(lentoUi.velo, 0.85 * k);
    if (lentoUi.barra) {                              // la barra si accorcia con una trasformazione (non ricalcola la pagina)
      const on = orologio.attivo() ? '1' : '0'; if (lentoUi.barra.style.opacity !== on) lentoUi.barra.style.opacity = on;
      if (orologio.attivo()) lentoUi.barra.firstElementChild.style.transform = 'scaleX(' + orologio.rimasto().toFixed(3) + ')';
    }
    if (orologio.attivo()) { S.tic = (S.tic || 0) - dt; if (S.tic <= 0) { S.tic = 0.9; if (PZ.audio.tic) PZ.audio.tic(S.lento); } }
  }
  function spegniLento() {
    orologio.ferma(); S.lento = 1; S.nastro = false; if (COL.velocita) COL.velocita(1); PZ.opacita(lentoUi.velo, 0); if (lentoUi.barra) lentoUi.barra.style.opacity = '0';
    sciogli.spegni(traffico.attive); frammenti.risalta(0); if (PZ.audio.tempoOvatta) PZ.audio.tempoOvatta(0);
  }

  // ---------- Foglia di salvia gialla (src/strada/salvia.js) ----------
  const voloUi = $('voloHud');
  function prendiSalvia() {
    salvia.attiva(S.salto.h);
    eventi.annullaColpa();                              // (fase 18) durante il volo i sensi di colpa non colpiscono
    lampo('salvia'); mostraConto('O AVE MARIA', 1.4);
    if (PZ.audio.salvia) PZ.audio.salvia(salvia.durataVolo());
    // (fase 35) niente pezzo a parte: la colonna principale continua, e il boost arriva sul suo basso (salvia.js)
    S.hVolo = Math.max(S.hVolo, S.salto.h);            // presa saltando: il volo parte da quella quota
    if (S.salto.fase !== 'no') { S.salto.fase = 'no'; S.salto.t = 0; S.salto.h = 0; S.salto.pend = 0; S.salto.alz = 0; S.salto.coda = false; }
  }
  // scende solo se nella sua corsia non arriva niente durante la discesa (più un margine)
  // (le auto vanno controllate una per una: un'auto può arrivare un po' dopo la sua fila, o essere ancora sotto la bici)
  function puoScendere() {
    const T = (PZ.CONFIG.strada.salvia.discesa || 0.9) + 0.9, F = Math.max(0.3, S.F);
    if (S.tc < DUR || (traffico.prossimoArrivo(S.tau, S.corsia + 1) - S.tau) / F <= T) return false;   // (corsie 0..2)
    const vAuto = (V0 + D.velocitaAuto) * F;
    for (let i = 0; i < traffico.attive.length; i++) {
      const a = traffico.attive[i];
      if (a.urtata || Math.abs(a.x - S.x) > 1.25 || a.z - a.L / 2 > 1.0) continue;        // altra corsia, o già passata dietro
      if (-(a.z + a.L / 2) < vAuto * T + 1.5) return false;                                // arriverebbe mentre scende
    }
    return true;
  }
  function aggiornaVoloHud() {
    if (!voloUi) return;
    const on = salvia.inVolo() ? '1' : '0';
    if (voloUi.style.opacity !== on) voloUi.style.opacity = on;
    if (on === '1') voloUi.firstElementChild.style.transform = 'scaleX(' + salvia.rimasto().toFixed(3) + ')';
  }

  function cattura() {
    if (S.fase !== 'corsa' || PZ.raccolta.completata) return;
    if (ARC.attiva && S.cuori > 0) { salvaConCuore(); return; }      // (arcade) il CUORE D'AMBRA: la pietra lo respinge
    S.fase = 'morte'; S.tFase = 0; S.jumpLampo = false;
    spegniLento(); manata.ferma();                       // il potere si interrompe, la manata sparisce
    salvia.ferma(); frammenti.solleva(0); S.hVolo = 0; aggiornaVoloHud(); PZ.avvisi.chiudi(false);
    inseguimento.cattura(); inseguimento.stato.presa = 1e9;      // lo tiene: non viene più respinto
    S.invul = 0; S.scossa = 0.7; S.pronto = false; S.sguardo = null;
    scena.fog.near = NEBBIA.near; scena.fog.far = NEBBIA.far;
    ui.salta.classList.remove('pronto'); ui.aiuto.style.opacity = '0';
    ui.corsa.classList.add('morte');
    anomalia(false); lampo('presa');
    mostraConto('', 0);
    specchietto.nascondi();
    eventi.ferma(); traffico.silenzia(); paranoia.ferma();   // gli eventi si spengono, la ragazza tace, le allucinazioni spariscono
    if (PZ.audio.cattura) PZ.audio.cattura();
    COL.morte(true);                                         // (fase 28) la musica si fa lontana e ovattata
    if (PZ.audio.stingerDemone) PZ.audio.stingerDemone();      // (fase 14) il jumpscare: lo stesso colpo della scena iniziale
    ui.morteN.textContent = PZ.raccolta.conteggio + '/' + PZ.raccolta.obiettivo;
    if (ARC.attiva) morteArcade();
    aggiornaHud(true);
  }
  function passoMorte(dt) {
    // tutto fermo (auto, ostacoli, frammenti, strada); solo il demone che lo afferra, la telecamera che trema e il buio
    testa.set(S.x, 1.6, -0.2);
    if (S.tFase > 0.02) testa.copy(camera.position);       // (fase 14) nel jumpscare fissa TE (la telecamera)
    inseguimento.aggiorna(dt, S.p, S.x, testa, 1);
    occhi.aggiorna(dt, testa);
    eventi.aggiorna(dt, S.t, S.p, false, false, S.x);
    atmosfera.aggiorna(Math.min(1, S.p * 1.05), dt, eventi.stato.buio, S.metri);
    aggiornaCamera(dt);
    jumpscare(S.tFase);
    if (S.tFase > 0.95 && !ui.morte.classList.contains('vis')) ui.morte.classList.add('vis');
    if (PZ.audio.vento) PZ.audio.vento(0);
  }

  // (fase 14) JUMPSCARE quando il demone ti prende: stacco netto sulla sua faccia. Il demone si avventa contro la
  // telecamera (da 1,7 m a mezzo metro in un attimo), con le manone tese in avanti verso di te, un lampo bianco e la
  // telecamera che trema forte; poi resta lì, a fissarti, mentre cala il buio della schermata di game over.
  const jsH = new THREE.Vector3(), jsDir = new THREE.Vector3(), jsP = new THREE.Vector3();
  function jumpscare(t) {
    const G = demone.G;
    G.testa.updateMatrixWorld(true); G.testa.getWorldPosition(jsH);
    // dalla faccia del demone verso il ragazzo (orizzontale): la telecamera sta lì in mezzo, faccia a faccia
    jsDir.set(S.x - jsH.x, 0, -0.2 - jsH.z); if (jsDir.lengthSq() < 1e-4) jsDir.set(0, 0, -1); jsDir.normalize();
    const u = Math.min(1, t / 0.16), avventa = 1 - Math.pow(1 - u, 3);
    const d = A_mix(4.6, 2.3, avventa) - 0.05 * Math.sin(t * 6) * Math.min(1, t / 0.4);
    const sc = (t < 0.16 ? 0.02 : 0.11 * Math.exp(-(t - 0.16) * 3.2) + 0.012);
    jsP.copy(jsH).addScaledVector(jsDir, d); jsP.y += 0.05;
    camera.position.set(jsP.x + (rnd() - 0.5) * sc, jsP.y + (rnd() - 0.5) * sc, jsP.z + (rnd() - 0.5) * sc);
    camera.lookAt(jsH.x + (rnd() - 0.5) * sc * 0.6, jsH.y - 0.12 + (rnd() - 0.5) * sc * 0.6, jsH.z);
    camera.rotateZ((rnd() - 0.5) * sc * 1.2);
    const fov = 70;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (t >= 0.16 && !S.jumpLampo) { S.jumpLampo = true; lampo('jump'); }
  }

  // ---------- (fase 16) MODALITÀ ARCADE ----------
  // La corsa non finisce mai: la difficoltà sale con i metri (PZ.raccolta.livello), la velocità senza limite. Ogni
  // 100 frammenti la corsa si ferma e si sceglie un potere: CUORE D'AMBRA (una vita: quando il demone ti prende la
  // pietra esplode di luce e lo respinge) o FURIA D'AMBRA (qualche secondo invincibile: sfondi tutto, il demone resta
  // indietro, i metri contano doppio). Alla morte: i metri, il nickname, la classifica (src/strada/arcade.js).
  // (fase 28) la colonna sonora (src/audio.js): parte alla porta; RIPROVA, arcade e prove ripartono da 4:02.290
  const COL = PZ.audio.colonna || { pausa: function () {}, riprendi: function () {}, inPausa: function () { return false; }, avvia: function () {}, ferma: function () {}, morte: function () {}, aggiorna: function () {}, attiva: function () { return true; }, loopDa: function () { return 0; } };
  const ARC = PZ.arcade, CFG_ARC = PZ.CONFIG.arcade || {};
  const uiA = { cuori: $('cuoriHud'), furia: $('furiaHud'), velo: $('furiaVelo'), record: $('recordHud'), metri: $('arcMetri'), nuovo: $('arcRecord'),
    nick: $('nick'), riga: $('arcNick'), lista: $('arcClassifica') };
  let corsaSalvata = true, recordPrima = 0;
  function mostraCuori(nuovo) {
    let h = ''; for (let i = 0; i < S.cuori; i++) h += '<i' + (nuovo && i === S.cuori - 1 ? ' class="nuovo"' : '') + '></i>';
    uiA.cuori.innerHTML = h;
  }
  function resetArcade() {
    S.cuori = 0; S.furia = 0; S.punti = 0;
    ui.corsa.classList.toggle('arcade', !!ARC.attiva);
    if (!ARC.attiva) return;
    ARC.chiudiScelta(); mostraCuori(false);
    uiA.furia.style.opacity = '0'; PZ.opacita(uiA.velo, 0);
    recordPrima = ARC.record(); uiA.record.textContent = 'RECORD ' + recordPrima + ' m';
    uiA.riga.classList.remove('salvato'); uiA.nuovo.classList.remove('vis'); corsaSalvata = true;
  }
  function passoArcade(dt) {
    S.punti += S.vel * dt * (S.furia > 0 ? 2 : 1);
    if (S.furia > 0) {
      S.furia = Math.max(0, S.furia - dt);
      inseguimento.allontana(dt, 1, CFG_ARC.demoneFuga || 4, CFG_ARC.demoneMax || 14);
      const k = Math.min(1, S.furia / 0.6);
      PZ.opacita(uiA.velo, k * (0.75 + 0.25 * Math.sin(S.tTot * 9)));
      uiA.furia.firstElementChild.style.transform = 'scaleX(' + (S.furia / (CFG_ARC.furia || 8)).toFixed(3) + ')';
      if (S.furia === 0) { uiA.furia.style.opacity = '0'; PZ.opacita(uiA.velo, 0); S.invul = Math.max(S.invul, 1.2); }
    }
  }
  // 100 frammenti: pausa e scelta. (Durante il rodaggio o fuori dalla corsa non succede niente.)
  PZ.raccolta.suArcade(function () {
    if (!ARC.attiva || S.fase !== 'corsa' || !S.attiva) return;
    lampo('ambra'); aggiornaAmbra(true);
    if (PZ.audio.pietra) PZ.audio.pietra();
    salvia.nuovoGiro();                                   // nel prossimo giro di 50 tornano 2-4 O Ave Maria
    ARC.apriScelta(S.cuori, function (quale) {
      if (quale === 'cuore') { S.cuori = Math.min(CFG_ARC.cuoriMax || 3, S.cuori + 1); mostraCuori(true); mostraConto('CUORE D AMBRA', 1.3); }
      else {
        S.furia = CFG_ARC.furia || 8; uiA.furia.style.opacity = '1';
        mostraConto('FURIA', 1.2); lampo('ambra'); S.scossa = Math.max(S.scossa, 0.4);
      }
      if (PZ.audio.vittoria) PZ.audio.vittoria();
    });
  });
  // FURIA: ciò che tocchi vola via, senza danni (né errori, né demone che guadagna)
  function sfonda(h) {
    traffico.urta(h, S.x, Math.max(S.vel, 14), h.tipo === 'auto');     // (fase 19) l'auto si ribalta
    S.scossa = Math.max(S.scossa, h.tipo === 'auto' ? 0.4 : 0.25);
    if (h.tipo === 'auto') { if (PZ.audio.distruzione) PZ.audio.distruzione(); else if (PZ.audio.urto) PZ.audio.urto(); } else if (PZ.audio.transenna) PZ.audio.transenna();
  }
  // CUORE: invece di morire, la pietra esplode di luce e il demone viene respinto lontano
  function salvaConCuore() {
    S.cuori--; mostraCuori(false);
    const I = inseguimento.stato, C = PZ.CONFIG.strada.demone;
    I.dist = C.dopoCattura; I.presa = 0; I.respinta = 0; I.aggressivita = 0; I.investito = 0; I.riduzione = 0;
    S.invul = 2.5; S.scossa = 0.6; S.recupero = Math.min(S.recupero, 0.5);
    lampo('ambra'); anomalia(true); mostraConto('SALVO', 1.2); specchietto.mostra(2.5);
    if (PZ.audio.pietra) PZ.audio.pietra();
    aggiornaHud(true);
  }
  function morteArcade() {
    S.furia = 0; uiA.furia.style.opacity = '0'; PZ.opacita(uiA.velo, 0);
    const m = Math.floor(S.punti);
    uiA.metri.textContent = m + ' m';
    ui.morteN.textContent = PZ.raccolta.totale + ' FRAMMENTI';
    uiA.nuovo.classList.toggle('vis', m > recordPrima && m > 0);
    uiA.nick.value = ARC.nickname();
    uiA.riga.classList.remove('salvato');
    corsaSalvata = false;
    ARC.mostra(uiA.lista, null);
  }
  // salva la corsa in classifica (una volta sola): con SALVA, Invio, RIPROVA o MENU
  function salvaCorsa() {
    if (!ARC.attiva || corsaSalvata || S.fase !== 'morte') return;
    corsaSalvata = true;
    const r = ARC.aggiungi(uiA.nick.value, S.punti, PZ.raccolta.totale);
    uiA.riga.classList.add('salvato');
    ARC.mostra(uiA.lista, r.id);
  }

  // ---------- Telecamera: segue il ragazzo; ogni tanto si gira a guardare il demone ----------
  const cg = { pos: new THREE.Vector3(), guarda: new THREE.Vector3() }, vg = new THREE.Vector3(), gg = new THREE.Vector3();
  const NEBBIA = { near: scena.fog.near, far: scena.fog.far };
  let zoomSguardo = 0;
  function aggiornaCamera(dt) {
    S.camX += (S.x * CAM.segui - S.camX) * (1 - Math.exp(-dt * 4.5));
    // in volo con la salvia la telecamera sale con lui, ma meno di lui: si vede che è in alto, con le auto sotto
    const hv = S.hVolo || 0;
    cg.pos.set(S.camX, CAM.y + 0.4 * hv, CAM.z + 0.45 * hv); cg.guarda.set(S.camX, CAM.guardaY + 0.5 * hv, CAM.guardaZ);
    if (S.sguardo) {
      // sguardo indietro: la camera gira attorno al ragazzo (fino a 150°) e guarda il demone, poi torna
      const g = S.sguardo; g.t += dt;
      const e = PZ.anim.morbida(0, 0.6, g.t) * (1 - PZ.anim.morbida(g.durata - 0.6, g.durata, g.t));
      const ang = 2.6 * e, r = 5.4, alt = CAM.y - 1.2 * e;
      zoomSguardo = e;
      vg.set(S.camX + Math.sin(ang) * r, alt, Math.cos(ang) * r);
      gg.set(S.camX, A_mix(CAM.guardaY, 1.6, e), A_mix(CAM.guardaZ, inseguimento.stato.dist + 4, e));
      cg.pos.copy(vg); cg.guarda.copy(gg);
      // guardando indietro la nebbia si infittisce (come nello specchietto): resta solo il demone
      scena.fog.near = A_mix(NEBBIA.near, specchietto.NEBBIA_DIETRO.vicino, e);
      scena.fog.far = A_mix(NEBBIA.far, specchietto.NEBBIA_DIETRO.lontano, e);
      if (g.t >= g.durata) { S.sguardo = null; scena.fog.near = NEBBIA.near; scena.fog.far = NEBBIA.far; }
    } else {
      const b = eventi.stato.buio;
      // (FASE 7) più si va veloci, più la foschia si apre: gli ostacoli si leggono prima (il tempo per reagire resta
      // giusto anche a 100 km/h e oltre); anche nel blackout si vede almeno a ~2 secondi di strada
      const kv = Math.max(0, Math.min(1, ((S.velBici || S.vel || V0) - 14) / 22));
      const nearV = NEBBIA.near + 22 * kv, farBuio = Math.max(NEBBIA_BUIO.far, Math.min(NEBBIA.far, 2.1 * (S.velBici || S.vel || V0)));
      scena.fog.near = A_mix(nearV, NEBBIA_BUIO.near, b); scena.fog.far = A_mix(NEBBIA.far, farBuio, b);
    }
    let sx = 0, sy = 0;
    if (S.scossa > 0) { S.scossa -= dt; sx = (rnd() - 0.5) * S.scossa * 0.6; sy = (rnd() - 0.5) * S.scossa * 0.4; }
    const pc = paranoia.stato.cam;                        // la paranoia: piccole oscillazioni e prospettiva che si storce
    camera.position.set(cg.pos.x + sx + pc.x, cg.pos.y + sy + pc.y, cg.pos.z);
    camera.lookAt(cg.guarda);
    if (pc.roll) camera.rotateZ(pc.roll);
    // più va veloce più l'inquadratura si allarga (senso di velocità); guardando indietro stringe un po' sul demone
    const fovBase = CFG.campoVisivo + 10 * Math.max(0, Math.min(1, ((S.velBici || S.vel) - V0) / (27.8 - V0)));
    const fov = (S.sguardo ? A_mix(fovBase, 44, zoomSguardo) : fovBase) + pc.fov - 7 * orologio.colpo();   // l'orologio: lo spazio si stringe un attimo
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function A_mix(a, b, k) { return a + (b - a) * k; }
  function forseSguardo() {
    if (S.sguardo || S.t < S.prossimoSguardo || S.salto.fase !== 'no' || salvia.inVolo() || inseguimento.stato.presa > 0 || eventi.attivo()) return;
    const libero = (traffico.prossimoArrivo(S.tau) - S.tau) / S.F;
    if (libero < 3.6) return;                               // guarda indietro solo se davanti non arriva niente
    S.sguardo = { t: 0, durata: 2.3 };
    S.prossimoSguardo = S.t + 24 + rnd() * 12;
    if (PZ.audio.battito) PZ.audio.battito();
  }

  // ---------- Un passo della simulazione ----------
  const testa = new THREE.Vector3();
  function passo(dt) {
    // AVVISO aperto (src/strada/avvisi.js): la corsa è in pausa. Niente scorre: ostacoli, demone, collisioni, tempo,
    // eventi, scritte. Si riparte al tocco, esattamente da dove si era
    // (fase 52b) AVVISO aperto: niente pausa, un forte rallentamento (tutto al 5%, entra ed esce in un attimo); finché
    // è aperto non si viene urtati né presi. L'avviso si chiude da solo dopo 10 secondi (avvisi.js)
    if (S.fase === 'corsa' && ARC.sceltaAperta()) { traffico.pausaSuoni(); return; }
    if (PZ.avvisi.aggiorna) PZ.avvisi.aggiorna();
    const avv = S.fase === 'corsa' && PZ.avvisi.aperto();
    S.kAvviso = (S.kAvviso === undefined ? 1 : S.kAvviso) + ((avv ? 0.05 : 1) - (S.kAvviso === undefined ? 1 : S.kAvviso)) * Math.min(1, dt * 8);
    S.avvisoProtegge = avv || S.kAvviso < 0.6;
    if (S.fase === 'corsa' && S.kAvviso < 0.999) dt *= S.kAvviso;
    S.tTot += dt; S.tFase += dt;
    if (tConto > 0) { tConto -= dt; if (tConto <= 0) mostraConto(''); }
    if (S.fase === 'intro') {
      if (intro.aggiorna(dt)) iniziaCorsa();
      testa.set(S.x, 1.6, 0);
      occhi.aggiorna(dt, testa);
      atmosfera.aggiorna(0, dt);
      if (PZ.audio.vento) PZ.audio.vento(S.vel / 11);
      return;
    }
    if (S.fase === 'finale') { passoFinale(dt); return; }
    if (S.fase === 'morte') { passoMorte(dt); return; }
    if (S.fase !== 'corsa') return;
    // OROLOGIO DALINIANO: il tempo del mondo (dtm) scorre più piano (15%); quello vero (dt) resta per i comandi del
    // ragazzo (cambio corsia, salto), la sua pedalata, la durata del potere, la telecamera e il demone che resta indietro
    const lento = orologio.effetto(dt), dtm = dt * lento;
    S.lento = lento;
    // (fase 51) e la colonna sonora rallenta come un nastro (fino a strada.orologio.nastro), poi torna normale
    // (fase 54) anche gli AVVISI rallentano la musica come un nastro, fino a metà velocità (un'ottava più in basso:
    // resta nella stessa tonalità, suona grave e cupa ma armonica). Vale il più lento tra orologio e avviso.
    const kAv = S.kAvviso === undefined ? 1 : S.kAvviso, nastroAv = kAv < 0.999;
    if (lento < 1 || S.nastro || nastroAv || S.nastroAv) {
      const OC = CFG.orologio, kk = Math.max(0, Math.min(1, (lento - OC.lento) / (1 - OC.lento)));
      const rOro = lento < 1 || S.nastro ? (OC.nastro || 0.5) + (1 - (OC.nastro || 0.5)) * kk : 1;
      const rAv = nastroAv ? 0.5 + 0.5 * Math.max(0, Math.min(1, (kAv - 0.05) / 0.95)) : 1;
      COL.velocita && COL.velocita(Math.min(rOro, rAv)); S.nastro = lento < 1; S.nastroAv = nastroAv;
    }
    S.t += dtm;
    // le istruzioni compaiono dopo la scritta SCAPPA! (per non sovrapporsi) e restano qualche secondo
    const aiutoVisibile = S.tFase > 1.4 && S.tFase < 8;
    if ((ui.aiuto.style.opacity !== '0') !== aiutoVisibile) ui.aiuto.style.opacity = aiutoVisibile ? '1' : '0';
    // difficoltà (src/strada/difficolta.js, numeri in config.js): cresce col tempo di corsa; dopo un urto il mondo
    // rallenta per un attimo
    // FASE 6: la difficoltà segue i frammenti raccolti (ammorbiditi in circa 3 secondi: nessun gradino) e un po' il tempo
    if (ARC.attiva) PZ.raccolta.livelloArcade = Math.min(PZ.raccolta.obiettivo, S.metri / (CFG_ARC.metriPerLivello || 25));
    S.nLiscio += (PZ.raccolta.livello() - S.nLiscio) * (1 - Math.exp(-dtm / 3));
    S.p = PZ.difficolta.corsa(S.t, S.nLiscio);
    PZ.difficolta.ora = S.p;
    // FASE 7: la velocità vera della bici segue i metri percorsi (difficolta.velocitaMetri): sale dopo 300 m, 100 km/h a
    // 1.500 m, poi senza limite. Il resto della difficoltà (quanti ostacoli, quali) segue ancora frammenti e tempo.
    PZ.difficolta.arcade = !!ARC.attiva;
    const nFr = PZ.raccolta.livello();
    let fDiff = PZ.difficolta.velocitaMetri(S.metri) / V0 * PZ.difficolta.velocitaFrenesia(nFr);   // (fase 57) frenesia
    // (avvio rapido) dopo la scena iniziale la bici va a V0: arriva alla velocità della corsa in poco più di un secondo
    if (S.t < S.rampa) { const u = S.t / S.rampa; fDiff = 1 + (fDiff - 1) * u * u * (3 - 2 * u); }
    if (S.recupero < 1) S.recupero = Math.min(1, S.recupero + dt / 1.5);   // (fase 56) tempo vero: è la velocità del ragazzo
    const r = S.recupero * S.recupero * (3 - 2 * S.recupero);
    // (fase 31) O Ave Maria, attacco del basso: la bici accelera ancora (strada.salvia.boostBasso: +40%)
    const bst = 1 + (PZ.CONFIG.strada.salvia.boostBasso || 0.4) * salvia.boost();
    // (fase 56) col tempo che si scioglie il RAGAZZO non si ferma col mondo: avanza a metà della sua velocità (gli
    // ostacoli, che si muovono col tempo del mondo, restano congelati: li raggiunge e li supera)
    const kOr = lento < 1 ? Math.max(0, Math.min(1, (lento - CFG.orologio.lento) / (1 - CFG.orologio.lento))) : 1;
    S.F = fDiff * (0.4 + 0.6 * r) * (0.5 + 0.5 * kOr) * bst;
    S.Fnom = fDiff;
    const tauPrima = S.tau;
    S.tau += S.F * dt;
    S.vel = V0 * S.F;
    S.velBici = V0 * fDiff * (0.4 + 0.6 * r) * bst;          // la bici e il ragazzo non sentono l'orologio: pedalano come sempre
    S.metri += S.vel * dt;
    if (ARC.attiva) passoArcade(dt);

    muoviLaterale(dt);
    aggiornaSalto(dt);
    // FOGLIA DI SALVIA: quota del volo (tempo VERO: nessun altro effetto la allunga); i frammenti salgono con lui
    salvia.altezzaSchermo(renderer.domElement.height);
    S.hVolo = salvia.aggiorna(dt, puoScendere, S.x, S.vel);
    if (salvia.colpoBasso()) { lampo('salvia'); S.scossa = Math.max(S.scossa, 0.35); }    // (fase 31) il colpo del basso
    frammenti.solleva(S.hVolo);
    if (S.sbandata > 0) S.sbandata = Math.max(0, S.sbandata - dt * 1.4);
    const piega = Math.max(-0.3, Math.min(0.3, S.vx * 0.045)) + 0.2 * S.sbandata * Math.sin(S.tTot * 20);
    S.inclina += (piega - S.inclina) * Math.min(1, dt * 12);

    // la città, le auto, le transenne e le sagome scorrono verso il ragazzo
    const k = Math.min(1, S.p * 1.05);
    // eventi: blackout e sensi di colpa (non partono mentre la telecamera guarda indietro)
    eventi.aggiorna(dtm, S.t, S.p, true, !S.sguardo && !salvia.inVolo(), S.x, S.metri);
    traffico.buio(eventi.stato.buio);   // (fase 64) la mano del demone è tornata come prima (manata.buio non si chiama più)
    traffico.ascolta(S.x); traffico.strada(S.metri, S.tau);
    citta.aggiorna(V0 * S.F * dt, camera);
    // le nuove file si pianificano con la velocità normale (non quella rallentata da un urto): così, quando la bici
    // riprende velocità, le distanze tra le file restano quelle controllate dal generatore
    // (le file si pianificano con la velocità che la bici potrebbe avere quando arriveranno: mai più vicine del previsto)
    // (si pianifica con la velocità che la bici avrà quando arriveranno le file più lontane: (ORIZZ + 1) tau = metri V0)
    traffico.aggiorna(dtm, S.tau, Math.max(S.Fnom, PZ.difficolta.velocitaMetri(S.metri + traffico.ORIZZ_METRI) / V0 * PZ.difficolta.velocitaFrenesia(nFr + 8)), S.p, S.t, true, k);
    apparizioni.aggiorna(dtm, S.F, S.p, S.t, traffico.attive, k);
    // urti: subito dopo un urto (lampeggio) non si perde altro terreno, ma ciò che tocchi viene comunque spostato,
    // abbattuto o dissolto, così la bici non passa mai "attraverso" le cose
    // frammenti d'ambra (prima degli urti: se il centesimo arriva insieme alla cattura, vince la scogliera): si prendono passandoci attraverso (in volo quelli sopra le transenne); subito dopo un urto,
    // mentre la bici lampeggia, no: un urto non viene mai premiato
    frammenti.aggiorna(dtm, S.tau);
    orologio.aggiorna(dtm, S.tau, dt);
    if (salvia.inVolo() || orologio.attivo()) S.puFine = Math.max(S.puFine === undefined ? -1e9 : S.puFine, S.t);
    if (S.invul <= 0 && orologio.raccogli(S.x, S.salto.h, S.tau, tauPrima)) prendiOrologio();
    salvia.aggiornaFoglia(dtm, S.tau);
    if (salvia.raccogli(S.x, S.salto.h, S.tau, tauPrima)) prendiSalvia();     // (anche lampeggiando: è rara)
    const presi = S.invul > 0 ? 0 : frammenti.raccogli(S.x, S.salto.h + S.hVolo, S.tau, tauPrima);
    if (presi) {
      S.serie = S.tTot - S.ultimoPreso < 1.2 ? S.serie + presi : 0;       // presi uno dopo l'altro: la nota sale
      S.ultimoPreso = S.tTot;
      if (PZ.audio.ambra) PZ.audio.ambra(S.serie);
      aggiornaAmbra(true);
    }

    if (S.fase !== 'corsa') return;                    // raccolta completata: da qui pensa passoFinale
    // in volo (e un attimo dopo l'atterraggio) niente urti: auto, transenne, sagome e la manata passano sotto
    const h = salvia.protetto() ? null : traffico.controlla(S.x, 0.27, 0.86, quota);
    if (h) { if (S.furia > 0) sfonda(h); else if (S.invul > 0 || S.avvisoProtegge) traffico.urta(h, S.x, S.vel); else urto(h); }
    if (S.fase !== 'corsa') return;                    // il demone l'ha preso: da qui pensa passoMorte
    if (S.invul > 0) S.invul -= dt;

    // bici e ragazzo
    S.ruote += S.velBici * dt / R;
    if (S.salto.fase === 'no' || S.salto.fase === 'atterra') S.pedivella += S.velBici * dt / R / RAPPORTO;   // in aria smette di pedalare
    const visibile = S.invul <= 0 || Math.floor(S.invul * 10) % 2 === 0;
    ciclista.aggiorna(S.x, S.inclina, S.ruote, S.pedivella, S.tTot, visibile, 1 - r, { y: S.salto.h + S.hVolo, pendenza: S.salto.pend + salvia.pendenza(), alzato: S.salto.alz });

    // il demone
    testa.set(S.x, 1.6 + S.salto.h + S.hVolo, -0.2);
    // LA MANATA (fase 6): dopo 60 frammenti il demone ogni tanto compare davanti. Intanto quello che insegue sparisce
    manata.pianifica(PZ.raccolta.livello(), S.t, traffico);
    manata.aggiorna(dtm, S.tau, S.F, testa);
    if (manata.stato.scossa > 0.98) S.scossa = Math.max(S.scossa, 0.55);
    if (manata.demone.visibile) { if (demone.visibile) demone.nascondi(); } else if (!demone.visibile) demone.mostra();
    if (inseguimento.aggiorna(dtm, S.p, S.x, testa, k) && !salvia.protetto() && !(S.furia > 0) && !S.avvisoProtegge) cattura();
    if (salvia.inVolo()) inseguimento.allontana(dt, 1, CFG.salvia.demoneFuga, CFG.salvia.demoneMax);   // in volo il demone resta indietro
    const forzaOr = orologio.forza();
    if (forzaOr > 0) inseguimento.allontana(dt, forzaOr, CFG.orologio.demoneFuga, CFG.orologio.demoneMax);   // il demone resta indietro
    if (S.fase === 'corsa') paranoia.aggiorna(dtm, dt, { vicinanza: inseguimento.stato.vicinanza, metri: S.metri, avanza: V0 * S.F * dt, camera: camera, camX: S.camX,
      auto: traffico.attive, liberoDavanti: (traffico.prossimoArrivo(S.tau, S.corsia + 1) - S.tau) / Math.max(0.3, S.F), pronto: S.pronto, colpa: !!eventi.stato.colpa,
      buio: eventi.stato.buio, lento: S.lento, risalto: occhi.risalto });
    if (S.fase !== 'corsa') return;
    // pericolo: quando il demone arriva molto vicino, un'anomalia breve (una volta per ogni avvicinamento)
    if (inseguimento.stato.vicinanza > 0.72 && !S.allarme) { S.allarme = true; anomalia(true); }
    else if (inseguimento.stato.vicinanza < 0.5) S.allarme = false;
    const vic = inseguimento.stato.vicinanza;
    specchietto.aggiorna(dt, vic > 0.55 && !S.sguardo);
    PZ.opacita(ui.velo, 0.75 * Math.max(0, vic - 0.3) / 0.7);
    S.battito -= dt;
    if (vic > 0.35 && S.battito <= 0) { S.battito = 1.15 - 0.6 * vic; if (PZ.audio.battito) PZ.audio.battito(); }
    forseSguardo();
    occhi.aggiorna(dtm, testa);
    atmosfera.aggiorna(k, dtm, eventi.stato.buio, S.metri);
    aggiornaLento(dt);
    aggiornaVoloHud();
    sciogli.aggiorna(forzaOr, orologio.colpo(), dt, V0 * S.F * dt, traffico.attive);
    frammenti.risalta(forzaOr);
    if (PZ.audio.tempoOvatta && (forzaOr > 0 || S.ovattaTempo)) { PZ.audio.tempoOvatta(0.6 * forzaOr); S.ovattaTempo = forzaOr > 0; }

    // il pulsante SALTA si accende proprio quando, saltando in quell'istante, la transenna della tua corsia passerebbe
    // sotto le ruote (la prima volta compare anche la scritta SALTA!)
    const tr = traffico.transennaDavanti(S.corsia + 1);
    const arrivo = tr ? (-tr.z - ZONA_T) / Math.max(1, S.vel) : 99;
    const puo = (S.salto.fase === 'no' || S.salto.fase === 'atterra') && !salvia.inVolo();
    // (la mano del demone è fatta di fette: si salta solo se si passa sopra a tutte)
    const pronto = !!tr && puo && arrivo < PREP + ARIA && (tr.fette ? tr.fette.every(function (f) { return f.colpita || f.z > ZONA_T || saltoRiuscirebbe(f); }) : saltoRiuscirebbe(tr));
    if (pronto !== S.pronto) { S.pronto = pronto; ui.salta.classList.toggle('pronto', pronto); }
    if (pronto && !S.avvisoSalto) { S.avvisoSalto = true; mostraConto('SALTA', 0.9); }

    aggiornaCamera(dt);
    if (PZ.audio.vento) PZ.audio.vento(S.vel / 12);
    aggiornaHud(false);
    controllaAvvisi();
    if (S.t > 14 && !PZ.avvisi.visto('guida')) PZ.avvisi.segna('guida');   // la prova dei comandi è fatta
  }
  // AVVISI: la prima volta (per questo giocatore) che arriva una meccanica poco intuitiva, la corsa si ferma e un
  // riquadro la spiega (src/strada/avvisi.js). Ognuno una volta sola, poi mai più (anche dopo RIPROVA o RIGIOCA)
  function controllaAvvisi() {
    const A = PZ.avvisi;
    if (!A.visto('manata') && manata.stato.ev && manata.stato.avvisata && !manata.stato.ev.sotto) { A.mostra('manata'); return; }
    if (!A.visto('colpa') && eventi.invertiti()) { A.mostra('colpa'); return; }
    if (!A.visto('maria') && salvia.stato.inStrada && salvia.stato.presa < 0 && salvia.gruppo.position.z > -55) { A.mostra('maria'); return; }
    if (!A.visto('ragazza')) {
      const st = traffico.statiche;
      for (let i = 0; i < st.length; i++) { const o = st[i]; if ((o.ragazza || o.pool === ragazze) && !o.colpita && o.z > -48 && o.z < -6) { A.mostra('ragazza'); return; } }
    }
  }

  // ---------- Raccolta completata: fine della corsa, verso la scogliera ----------
  // Chiamata una volta sola (PZ.raccolta la chiama una volta, e qui si controlla anche la fase). Un lampo d'ambra
  // copre lo schermo mentre spariscono ostacoli, frammenti e demone; i comandi si spengono; la bici rallenta e
  // continua sulla strada vuota; poi PZ.scogliera.entra(...) (src/strada/scogliera.js).
  PZ.raccolta.suCompletamento(function () { if (S.fase === 'corsa') completaRaccolta(); });
  function completaRaccolta() {
    S.fase = 'finale'; S.tFase = 0;
    COL.ferma(4);                                        // (fase 28) verso la scogliera la canzone sfuma
    if (PZ.audio.vittoria) PZ.audio.vittoria();          // il suono della vittoria, subito (una volta: si entra qui una volta sola)
    spegniLento(); salvia.ferma(true);                   // se stava volando, scende piano
    PZ.avvisi.chiudi(false);
    lampo('ambra');
    traffico.reset(S.tau); transenne.reset(); apparizioni.reset(); branco.reset(); ragazze.reset(); frammenti.svuota();
    demone.nascondi(); specchietto.nascondi(); eventi.ferma(); paranoia.ferma(); manata.ferma();
    S.sguardo = null; scena.fog.near = NEBBIA.near; scena.fog.far = NEBBIA.far;
    S.pronto = false; ui.salta.classList.remove('pronto'); PZ.opacita(ui.velo, 0); ui.aiuto.style.opacity = '0';
    ui.corsa.classList.add('finale');
    mostraConto('', 0);
    aggiornaAmbra(true);
    PZ.scogliera.entra({ frammenti: PZ.raccolta.conteggio, metri: Math.floor(S.metri), secondi: +S.t.toFixed(1),
      urti: S.urti.auto + S.urti.transenna + S.urti.sagoma + (S.urti.manata || 0) });
  }
  function passoFinale(dt) {
    S.vel += (6 - S.vel) * (1 - Math.exp(-dt * 0.7));          // rallenta fino a un'andatura tranquilla
    S.F = S.vel / V0; S.tau += S.F * dt; S.metri += S.vel * dt;
    citta.aggiorna(S.vel * dt, camera);
    muoviLaterale(dt);
    aggiornaSalto(dt);
    S.hVolo = salvia.aggiorna(dt, function () { return true; }, S.x, S.vel); frammenti.solleva(S.hVolo); aggiornaVoloHud();
    S.inclina += (0 - S.inclina) * Math.min(1, dt * 6);
    S.ruote += S.vel * dt / R;
    if (S.salto.fase === 'no' || S.salto.fase === 'atterra') S.pedivella += S.vel * dt / R / RAPPORTO;
    ciclista.aggiorna(S.x, S.inclina, S.ruote, S.pedivella, S.tTot, true, 0, { y: S.salto.h + S.hVolo, pendenza: S.salto.pend + salvia.pendenza(), alzato: S.salto.alz });
    frammenti.aggiorna(dt, S.tau);
    eventi.aggiorna(dt, S.t, S.p, false, false, S.x);
    atmosfera.aggiorna(Math.min(1, S.p * 1.05), dt, eventi.stato.buio, S.metri);
    aggiornaCamera(dt);
    if (PZ.audio.vento) PZ.audio.vento(S.vel / 12);
    aggiornaHud(false);
  }

  // ---------- Avvio, scena iniziale, riavvio ----------
  function preparaCorsa(dist, x, tieniMusica) {
    traffico.reset(0); transenne.reset(); apparizioni.reset(); branco.reset(); ragazze.reset();
    Object.assign(S, { fase: 'corsa', tFase: 0, t: 0, tau: 0, F: 1, p: 0, metri: 0, vel: V0, corsia: 0, x: x || 0, xc: x || 0, vx: 0, xDa: 0, vDa: 0, xA: 0, tc: DUR,
      spinta: 0, tSpinta: 1, urti: { auto: 0, transenna: 0, sagoma: 0, manata: 0 }, errori: 0, invul: 0, recupero: 1, scossa: 0, sbandata: 0, inclina: 0, camX: (x || 0) * CAM.segui,
      salto: { fase: 'no', t: 0, h: 0, pend: 0, alz: 0, alz0: 0, hp: 0, pendp: 0, coda: false }, salti: 0, sguardo: null, prossimoSguardo: 14 + rnd() * 6,
      battito: 0, avvisoSalto: false, pronto: false, serie: 0, ultimoPreso: -9, nLiscio: 0, hVolo: 0, rampa: 0 });
    // prima corsa di questo giocatore: le prime file sono di prova (un'auto davanti, poi transenne da saltare, poi
    // un'auto e una transenna insieme: o salti o cambi corsia)
    if (!PZ.avvisi.visto('guida')) traffico.guida([['LAL', 'ALA', 'LLA', 'ALL'], ['TTT', 'LTT', 'TTL', 'TLT', 'LTL', 'TLL', 'LLT'], ['ATL', 'LTA', 'TLA', 'ALT']]);
    PZ.difficolta.ora = 0;
    ui.salta.classList.remove('pronto');
    inseguimento.reset(dist, x);
    // nuova partita: frammenti e contatore da zero (prova controllata: indirizzo ...?strada&ambra=99)
    frammenti.reset(); PZ.raccolta.azzera(); PZ.scogliera.esci(); ui.corsa.classList.remove('finale');
    ui.corsa.classList.remove('morte'); ui.morte.classList.remove('vis'); S.allarme = false;
    resetArcade();
    if (PZ.audio.fermaStinger) PZ.audio.fermaStinger(0.3);   // (fase 14) RIPROVA durante lo stinger del jumpscare
    stage.classList.remove('anomalia', 'anomaliaBreve'); ui.lampo.className = 'ui'; PZ.opacita(ui.velo, 0);
    // eventi da capo: niente blackout, niente lacrime, comandi normali, luci e foschia come all'inizio
    eventi.reset(); traffico.buio(0); manata.buio(0); occhi.risalto(0); atmosfera.aggiorna(0, 0, 0, 0);
    orologio.reset(); spegniLento(); orologio.reset();  // orologi generati da zero, tempo normale
    manata.reset();                                       // nessuna manata in corso, si ricomincia a contare
    salvia.ferma(); frammenti.solleva(0); aggiornaVoloHud();
    PZ.avvisi.chiudi(false);                             // un avviso lasciato a metà non conta come letto
    paranoia.reset();                                     // paranoia da zero: niente figure, suoni, deformazioni
    const prova = (CFG && PZ.CONFIG.test && PZ.CONFIG.test.scorciatoiaStrada) ? /[?&#]ambra=(\d+)/.exec(location.search + location.hash) : null;
    if (prova) PZ.raccolta.imposta(Math.min(PZ.raccolta.obiettivo - 1, +prova[1]));
    S.puFine = -1e9;
    salvia.reset();                                       // nuova soglia per la foglia di salvia (dopo l'eventuale prova)
    aggiornaAmbra(false);
    scena.fog.near = NEBBIA.near; scena.fog.far = NEBBIA.far;
    demone.mostra(); demone.gruppo.scale.set(1, 1, 1); demone.gruppo.visible = true;
    ui.corsa.classList.remove('intro');
    ui.aiuto.style.opacity = '0';
    intro.pulisci();
    mostraConto('SCAPPA', 1.5);
    // (fase 30) la musica riparte dal loop (4:02.290) a ogni corsa nuova; dopo la scena iniziale è già partita (quando
    // sale in sella, src/strada/intro.js) e continua
    if (!rodando && !(tieniMusica && COL.attiva())) COL.avvia(COL.loopDa());
    aggiornaHud(true);
  }
  // dopo la scena iniziale: il demone resta dov'era, e lo specchietto lo mostra subito alle spalle del ragazzo
  function iniziaCorsa() { preparaCorsa(demone.gruppo.position.z, 0, true); S.rampa = 1.2; specchietto.mostra(3.2); }
  function riavvia() {
    citta.sistema(); specchietto.nascondi();
    preparaCorsa(CFG.demone.distanzaIniziale, 0);
    passo(0);
  }
  function avviaIntro() {
    traffico.reset(0); transenne.reset(); apparizioni.reset(); branco.reset(); ragazze.reset();
    S.fase = 'intro'; S.tFase = 0; S.metri = 0;
    ui.corsa.classList.add('intro');
    eventi.reset();
    intro.avvia();
  }
  let ultimo = 0;
  function ciclo(ora) {
    if (!S.attiva) return;
    requestAnimationFrame(ciclo);
    if (S.pausa) { ultimo = ora; return; }                  // (fase 41) in pausa il mondo è fermo
    const dt = ultimo ? Math.min(0.05, (ora - ultimo) / 1000) : 1 / 60;
    ultimo = ora;
    passo(dt);
    COL.aggiorna(dt, eventi.stato.buio);                   // (fase 28) blackout: il segnale della musica salta
    disegna();
  }
  function disegna() {
    const spec = S.fase === 'corsa';
    // le posizioni di tutti gli oggetti si calcolano una volta sola per fotogramma (prima lo faceva ogni disegno)
    scena.updateMatrixWorld(); const au = scena.autoUpdate; scena.autoUpdate = false;
    if (spec) specchietto.immagine(scena, S.x, inseguimento.stato.dist);    // prima l'immagine dello specchietto
    renderer.render(scena, camera);
    scena.autoUpdate = au;
    if (spec) specchietto.sovrapponi();                                      // poi la si appoggia sopra
    eventi.disegna(renderer.domElement);          // lacrime e vista appannata, sopra l'immagine appena disegnata
  }
  // conIntro: true = scena iniziale (dal portone); false = subito la corsa
  // la prima volta che una ragazza compare la scheda video deve preparare i suoi materiali: lo si fa subito, tutte
  // insieme, in un fotogramma invisibile, così in corsa non ci sono scatti quando arriva una posa mai vista
  let preparate = false;
  function preparaRagazze() {
    if (preparate) return; preparate = true;
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 50); cam.position.set(0, 1.2, 0); cam.lookAt(0, 0.8, -8); cam.updateMatrixWorld();
    ragazze.tutte.forEach(function (r, i) { r.mostra(); r.gruppo.position.set((i % 6 - 2.5) * 1.3, 0, -7 - Math.floor(i / 6) * 2); });
    renderer.render(scena, cam);
    ragazze.reset();
    preriscalda();
  }
  // PRERISCALDAMENTO. La prima volta che la scheda video disegna un materiale deve prepararne il programma (e caricare
  // le sue immagini): se succede in corsa, quando arriva la prima auto di un modello, la prima transenna, il demone,
  // l'orologio..., il gioco si blocca per un attimo e va a scatti. Qui, prima che la corsa cominci, si disegna UNA volta
  // tutta la scena con TUTTO acceso (anche ciò che è nascosto o fuori inquadratura), con la telecamera della corsa e con
  // quella dello specchietto; poi ogni cosa torna esattamente com'era. Il fotogramma viene subito ridisegnato: non si vede.
  function preriscalda() {
    const salvati = [];
    // (le luci restano come sono: il loro numero fa parte del programma, va preparato quello vero)
    const luciAccese = new Set(); scena.traverseVisible(function (o) { if (o.isLight) luciAccese.add(o); });
    scena.traverse(function (o) { salvati.push([o, o.visible, o.frustumCulled]); o.visible = o.isLight ? luciAccese.has(o) : true; o.frustumCulled = false; });
    camera.updateMatrixWorld();
    renderer.render(scena, camera);
    const cs = specchietto.camera; cs.position.set(0, 2.05, 0.35); cs.lookAt(0, 1.35, 18); cs.updateMatrixWorld();
    renderer.render(scena, cs);
    specchietto.prepara(scena);                       // e dentro l'immagine dello specchietto
    salvati.forEach(function (v) { v[0].visible = v[1]; v[0].frustumCulled = v[2]; });
  }
  // RODAGGIO: alcune cose la scheda video le prepara solo la prima volta che le disegna in quella precisa situazione
  // (lo specchietto che compare e sparisce, le prime auto che passano, i fari, gli aloni...): prepararle a pezzi in
  // corsa è ciò che faceva andare a scatti i primi secondi. Qui, dietro lo schermo nero del passaggio, si corrono di
  // nascosto 4,5 secondi di corsa vera (45 fotogrammi da 0,1 s), in silenzio e senza che il demone possa prenderti;
  // poi tutto si azzera (come RIPROVA) e la partita vera comincia.
  let rodando = false;                                  // (fase 29) durante il rodaggio la musica non parte
  function rodaggio() {
    rodando = true;
    const audio = PZ.audio, muto = function () { return muto; };
    const zitto = new Proxy(muto, { get: function () { return zitto; }, apply: function () { return undefined; } });
    PZ.audio = zitto; PZ.avvisi.prova(false);          // (nel rodaggio niente avvisi)
    try {
      riavvia(); specchietto.mostra(2);                 // lo specchietto deve comparire e svanire anche qui
      for (let i = 0; i < 45 && S.fase === 'corsa'; i++) { inseguimento.stato.dist = Math.max(inseguimento.stato.dist, 16); S.invul = 0.5; passo(0.1); disegna(); }
    } finally { PZ.audio = audio; PZ.avvisi.prova(true); }
    PZ.raccolta.azzera();
    // (fase 11) anche il finale sulla scogliera si prepara qui, dietro lo schermo nero: prima nasceva (e la scheda
    // video preparava i suoi materiali) proprio nell'istante dei 100 frammenti, e il gioco si bloccava
    try { if (PZ.scogliera.prepara) PZ.scogliera.prepara(); } catch (e) { console.warn(e); }
    riavvia();
    preparaScritte();
    mostraConto('', 0); specchietto.nascondi(); aggiornaHud(true);   // nessuna traccia del rodaggio
    rodando = false;
  }
  let rodato = false;
  function avvia(conIntro) {
    preparaRagazze();
    ui.corsa.style.display = 'block';
    stage.classList.add('inStrada');
    if (!rodato) { rodato = true; const t0 = performance.now(); try { rodaggio(); } catch (e) { console.warn(e); } rodando = false; S.msRodaggio = Math.round(performance.now() - t0); }
    S.attiva = true;
    if (conIntro && CFG.intro !== false) avviaIntro(); else riavvia();
    // (fase 17) inizio della modalità arcade: il banner che spiega i due poteri (la corsa è in pausa finché non si tocca)
    if (ARC.attiva) PZ.avvisi.mostra('arcade', true);
    disegna();
    ultimo = 0; requestAnimationFrame(ciclo);
  }

  // ---------- Controlli ----------
  // scorrimento del dito: un solo comando per gesto (sinistra, destra o su), anche se il dito continua a muoversi
  let tocco = null;
  ui.corsa.addEventListener('pointerdown', function (e) {
    if (!S.attiva || (e.target.closest && (e.target.closest('button') || e.target.closest('input')))) return;
    tocco = { id: e.pointerId, x: e.clientX, y: e.clientY, usato: false };
    try { ui.corsa.setPointerCapture(e.pointerId); } catch (x) {}
  });
  ui.corsa.addEventListener('pointermove', function (e) {
    if (!tocco || e.pointerId !== tocco.id || tocco.usato) return;
    const dx = e.clientX - tocco.x, dy = e.clientY - tocco.y, soglia = Math.max(16, stage.clientWidth * 0.06);
    if (Math.abs(dx) > soglia && Math.abs(dx) > Math.abs(dy) * 1.1) { tocco.usato = true; cambia(dx > 0 ? 1 : -1); }
    else if (-dy > soglia && -dy > Math.abs(dx) * 1.1) { tocco.usato = true; salta(); }
  });
  function fineTocco(e) { if (tocco && e.pointerId === tocco.id) tocco = null; }
  ui.corsa.addEventListener('pointerup', fineTocco);
  ui.corsa.addEventListener('pointercancel', fineTocco);
  function pulsante(id, f) { $(id).addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); f(); }); }
  pulsante('sx', function () { cambia(-1); });
  pulsante('dx', function () { cambia(1); });
  pulsante('salta', function () { salta(); });
  // (fase 41) MENU PAUSA (storia e arcade): il pulsante in alto a destra, o Esc / P sul PC. Il mondo e tutto l'audio si
  // fermano; CONTINUA riprende, RICOMINCIA rifà la corsa da capo (stessa modalità), TORNA AL MENU torna alla
  // schermata iniziale. Se si cambia app o scheda durante la corsa, si mette in pausa da sola.
  function puoPausa() { return S.attiva && (S.fase === 'corsa' || S.fase === 'intro') && !ui.corsa.classList.contains('morte') && !(ARC.sceltaAperta && ARC.sceltaAperta()) && !(PZ.avvisi && PZ.avvisi.aperto && PZ.avvisi.aperto()); }
  function pausa(si) {
    if (si && (S.pausa || !puoPausa())) return;
    if (!si && !S.pausa) return;
    S.pausa = !!si; tocco = null;
    $('pausa').classList.toggle('vis', S.pausa); ui.corsa.classList.toggle('inPausa', S.pausa);
    if (S.pausa) COL.pausa(); else if (COL.inPausa && COL.inPausa()) COL.riprendi(0.15);   // (anche quando la musica è un elemento <audio>)
    if (PZ.audioSospendi) PZ.audioSospendi(S.pausa);
  }
  pulsante('riavvia', function () { if (PZ.audio.tocco) PZ.audio.tocco(); pausa(true); });
  pulsante('pausaContinua', function () { pausa(false); if (PZ.audio.tocco) PZ.audio.tocco(); });
  pulsante('pausaRicomincia', function () { pausa(false); if (PZ.audio.tocco) PZ.audio.tocco(); if (S.fase === 'intro') avviaIntro(); else riavvia(); });
  pulsante('pausaMenu', function () { location.href = location.pathname; });
  $('pausa').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pausa(true); });
  pulsante('riprova', function () { if (PZ.audio.tocco) PZ.audio.tocco(); salvaCorsa(); riavvia(); });
  pulsante('salvaNick', function () { if (PZ.audio.tocco) PZ.audio.tocco(); salvaCorsa(); });
  pulsante('arcMenu', function () { if (PZ.audio.tocco) PZ.audio.tocco(); salvaCorsa(); location.href = location.pathname; });
  $('nick').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); salvaCorsa(); $('nick').blur(); } });
  $('nick').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  pulsante('saltaIntro', function () { if (S.fase === 'intro') intro.salta(); });
  window.addEventListener('keydown', function (e) {
    if (!S.attiva || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); if (!e.repeat) pausa(!S.pausa); return; }
    if (S.pausa) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); pausa(false); } return; }
    const sinistra = e.code === 'ArrowLeft' || e.code === 'KeyA', destra = e.code === 'ArrowRight' || e.code === 'KeyD';
    const su = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
    if (sinistra || destra) { e.preventDefault(); if (!e.repeat) cambia(sinistra ? -1 : 1); }
    else if (su) { e.preventDefault(); if (!e.repeat) { if (S.fase === 'intro') return; salta(); } }
    else if (e.code === 'KeyR' && !e.repeat) riavvia();
    else if ((e.code === 'Enter' || e.code === 'Escape') && S.fase === 'intro') intro.salta();
  });

  const corsa = { avvia: avvia, riavvia: riavvia, cambia: cambia, salta: salta, passo: passo, disegna: disegna, stato: S, traffico: traffico, citta: citta,
    ciclista: ciclista, camera: camera, scena: scena, renderer: renderer, intro: intro, inseguimento: inseguimento, demone: demone, occhi: occhi,
    branco: branco, ragazze: ragazze, apparizioni: apparizioni, transenne: transenne, specchietto: specchietto, atmosfera: atmosfera, quota: quota,
    frammenti: frammenti, raccolta: PZ.raccolta, eventi: eventi, orologio: orologio, salvia: salvia, paranoia: paranoia, mostraConto: mostraConto, sciogli: sciogli, manata: manata, prendiSalvia: prendiSalvia };
  window.__strada = corsa;   // utile per le prove automatiche
  return corsa;
};
