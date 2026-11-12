// SCENA 1: la cameretta. Avvio, camera, controlli (touch e tastiera), interazioni e raccolta della pietra.
(function () {
  const box = document.getElementById('errore');
  function errore(msg) { box.textContent = 'Qualcosa non ha funzionato:\n\n' + msg + '\n\nControlla LEGGIMI.md'; box.style.display = 'flex'; }
  window.addEventListener('error', function (e) { errore(e.message); });
  if (!window.THREE) { errore('Three.js non è stato caricato (serve internet la prima volta, oppure il file vendor/three.min.js).'); return; }
  if (!window.PZ || !PZ.creaStanza || !PZ.creaGiocatore || !PZ.creaPietra) { errore('Non trovo tutti i file del progetto. Estrai lo zip prima di aprire index.html.'); return; }

  try {
    const CONFIG = PZ.CONFIG, V3 = THREE.Vector3;
    const stage = document.getElementById('stage');
    const $ = function (id) { return document.getElementById(id); };

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x1a0c20);
    stage.insertBefore(renderer.domElement, stage.firstChild);

    const scena = new THREE.Scene();
    const stanza = PZ.creaStanza(scena);
    const giocatore = PZ.creaGiocatore(scena, stanza);

    // Formato verticale 9:16 centrato, immagine interna a bassa risoluzione ingrandita a pixel netti
    const iw = CONFIG.schermo.larghezzaInterna, ih = CONFIG.schermo.altezzaInterna, prop = iw / ih;
    renderer.setSize(iw, ih, false);
    PZ.ps1.risoluzione.value.set(iw, ih);
    const camera = new THREE.PerspectiveCamera(52, prop, 0.1, 40);
    function adatta() {
      const W = window.innerWidth, H = window.innerHeight;
      let h = H, w = H * prop;
      if (w > W) { w = W; h = W / prop; }
      stage.style.width = Math.floor(w) + 'px'; stage.style.height = Math.floor(h) + 'px';
      stage.style.fontSize = Math.max(8, h / 40) + 'px';       // l'interfaccia si scala con lo schermo
    }
    window.addEventListener('resize', adatta); adatta();
    const esamina = PZ.creaEsamina({ scena: scena, camera: camera, stage: stage });   // (fase 60) oggetti da girare

    // ---------- Stato ----------
    const stato = { iniziato: false, modale: false, bloccato: 0, pietra: false, chino: false, finito: false };
    let tMondo = 0, scossa = 0;

    // ---------- Messaggi a schermo ----------
    const didascalia = $('didascalia');
    let timerDida = 0;
    function parla(testo, ms) {
      didascalia.textContent = testo; didascalia.style.display = 'block';
      clearTimeout(timerDida); timerDida = setTimeout(function () { didascalia.style.display = 'none'; }, ms || 3800);
    }
    function dopo(ms, f) { setTimeout(f, ms); }

    // ---------- Interazioni ----------
    const P = stanza.punti;
    const oggetti = [
      { id: 'pietra', p: P.pietra, r: 1.1, attivo: function () { return !stato.pietra; }, fn: guardaPietra },
      { id: 'armadio', p: P.armadio, r: 0.95, fn: apriArmadio },
      { id: 'specchio', p: P.specchio, r: 1.15, fn: esaminaSpecchio },
      { id: 'telefono', p: P.telefono, r: 1.0, fn: apriTelefono },
      { id: 'orologio', p: P.orologio, r: 1.0, fn: esaminaOrologio },
      { id: 'sigarette', p: P.sigarette, r: 0.95, fn: esaminaSigarette },
      { id: 'telAmbra', p: P.telAmbra, r: 0.95, fn: apriTelAmbra },
      { id: 'scatola', p: P.scatola, r: 1.0, fn: scatolaMusicale },
      { id: 'porta', p: P.porta, r: 1.1, fn: usaPorta }
    ];
    function vicino() {
      let best = null, bd = 1e9;
      oggetti.forEach(function (o) {
        if (o.attivo && !o.attivo()) return;
        const d = Math.hypot(giocatore.pos.x - o.p.x, giocatore.pos.z - o.p.z);
        if (d < o.r && d < bd) { best = o; bd = d; }
      });
      return best;
    }

    // Primo piano: quando esamini un oggetto compare un'immagine ingrandita (il protagonista, davanti, lo coprirebbe)
    const pp = $('primo'), ppc = $('primoCanvas'), ppg = ppc.getContext('2d');
    let timerPP = 0;
    function primoPiano(src, titolo) {
      ppc.width = src.width; ppc.height = src.height; ppg.imageSmoothingEnabled = false; ppg.drawImage(src, 0, 0);
      $('primoTitolo').textContent = titolo || ''; pp.style.display = 'flex';
    }
    function chiudiPrimoPiano() { pp.style.display = 'none'; }
    function disegna(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
    const cartaSigarette = disegna(32, 40, function (g, w, h) {
      g.fillStyle = '#3a1b3f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.fillRect(8, 6, 16, 28); g.fillStyle = '#ffd84a'; g.fillRect(8, 6, 16, 6);
      g.fillStyle = '#c2487c'; g.fillRect(12, 18, 8, 7); g.fillStyle = '#fff1e6'; g.fillRect(14, 20, 4, 3);
      g.fillStyle = '#e8dccf'; g.fillRect(8, 30, 16, 4);
    });
    const cartaSagoma = disegna(32, 40, function (g, w, h) {
      g.fillStyle = '#3a1b3f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.fillRect(8, 22, 16, 12); g.fillStyle = '#ffd84a'; g.fillRect(8, 22, 16, 4);
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(16, 8, 5, 6, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(8, 40); g.lineTo(9, 16); g.lineTo(23, 16); g.lineTo(24, 40); g.fill(); g.fillRect(4, 16, 5, 18); g.fillRect(23, 16, 5, 20);
    });
    function cartaOrologio() {
      const ore = stanza.ora(), fermo = stanza.orologioFermo();
      return disegna(32, 32, function (g) {
        g.fillStyle = '#3a1b3f'; g.fillRect(0, 0, 32, 32);
        g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(16, 16, 13, 0, 7); g.fill();
        g.strokeStyle = '#d9709a'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 13, 0, 7); g.stroke();
        g.fillStyle = '#e0a800'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillRect(Math.round(16 + 11 * Math.sin(a)), Math.round(16 - 11 * Math.cos(a)), 1, 1); }
        g.strokeStyle = '#2a2230'; g.lineWidth = 1.5;
        const am = (ore % 1) * 6.283, ao = ore / 12 * 6.283;
        g.beginPath(); g.moveTo(16, 16); g.lineTo(16 + 10 * Math.sin(am), 16 - 10 * Math.cos(am)); g.stroke();
        g.beginPath(); g.moveTo(16, 16); g.lineTo(16 + 6 * Math.sin(ao), 16 - 6 * Math.cos(ao)); g.stroke();
        g.strokeStyle = fermo ? '#e0a800' : '#d22b2b'; g.lineWidth = 1; g.beginPath(); g.moveTo(16, 16); g.lineTo(16 + 11 * Math.sin(ore * 600), 16 - 11 * Math.cos(ore * 600)); g.stroke();
      });
    }

    function esaminaSpecchio() {
      PZ.audio.specchio();
      stato.bloccato = 1.4;
      const v = stanza.specchio.vetro, fl = $('specchioFlash');
      stato.bloccato = 3.0;
      primoPiano(stanza.specchio.normale.image, 'SPECCHIO');
      parla('Il tuo riflesso ti guarda con calma...', 1500);
      dopo(1500, function () {
        primoPiano(stanza.specchio.anomalia.image, 'SPECCHIO');
        v.material.map = stanza.specchio.anomalia; v.material.needsUpdate = true; fl.style.opacity = 1; scossa = 0.3;
        dopo(450, function () { primoPiano(stanza.specchio.normale.image, 'SPECCHIO'); v.material.map = stanza.specchio.normale; v.material.needsUpdate = true; fl.style.opacity = 0; });
        dopo(900, function () { chiudiPrimoPiano(); parla('Per un istante c\'era qualcun altro. Con troppi occhi.', 3600); });
      });
    }

    // (fase 60) GUARDARE DA VICINO E GIRARE: sveglia, sigarette, carillon, pietra e la felpa nell'armadio
    // (src/esamina.js). Sotto, i pensieri del protagonista (config.js, pensieri). Lo specchio e i telefoni restano come prima.
    const PENSA = CONFIG.pensieri || {};
    function guarda(oggetto, titolo, pensiero, op) {
      op = op || {};
      stato.modale = true; didascalia.style.display = 'none'; $('aiuto').style.opacity = 0;
      esamina.apri({ oggetto: oggetto, titolo: titolo, pensiero: pensiero, macchia: op.macchia, dimensione: op.dimensione, giro: op.giro,
        aiuto: op.aiuto, tocca: op.tocca,
        dopo: function () { stato.modale = false; stato.bloccato = 0.3; if (op.dopo) op.dopo(); } });
    }
    function esaminaSigarette() {
      PZ.audio.sigaretta();
      guarda(stanza.oggetti.sigarette, 'PACCHETTO DI SIGARETTE', PENSA.sigarette);
      dopo(2200, function () {                       // la sagoma nera, per un attimo
        if (!esamina.aperto()) return;
        primoPiano(cartaSagoma, 'PACCHETTO DI SIGARETTE'); scossa = 0.2;
        if (PZ.audio.specchio) PZ.audio.specchio();
        dopo(350, function () { chiudiPrimoPiano(); if (esamina.aperto()) esamina.pensiero(PENSA.sigaretteDopo); });
      });
    }

    function esaminaOrologio() {
      PZ.audio.tocco();
      guarda(stanza.oggetti.sveglia, 'SVEGLIA', PENSA.sveglia, { giro: new THREE.Euler(0.15, 0, 0) });
    }

    // (fase 24) toccata mentre suona: pausa; toccata di nuovo: riprende da dove era (e la si guarda da vicino)
    function scatolaMusicale() {
      const r = PZ.audio.scatolaMusicale();
      if (r === 'pausa') { parla('Il carillon si ferma.', 1800); return; }
      guarda(stanza.oggetti.scatola, 'CARILLON', PENSA.carillon, { giro: new THREE.Euler(0.35, 0, 0) });
    }

    // la pietra: prima la si guarda (sul retro, in un angolo, una macchia rossa), poi la si raccoglie come prima
    function guardaPietra() {
      PZ.audio.tocco();
      guarda(stanza.pietra, 'PIETRA D\'AMBRA', PENSA.pietra, { macchia: true, dimensione: 0.2, dopo: raccogliPietra });
    }

    // l'armadio: le ante si aprono, poi la felpa gialla da vicino
    function apriArmadio() {
      const giaAperto = stanza.armadioAperto();
      if (!giaAperto) { stanza.apriArmadio(); if (PZ.audio.armadio) PZ.audio.armadio(); else PZ.audio.tocco(); stato.bloccato = 1.0; }
      dopo(giaAperto ? 0 : 1000, function () { guarda(stanza.oggetti.felpa, 'LA FELPA GIALLA', PENSA.felpa, { dimensione: 0.18 }); });
    }

    // (fase 25) LE CHAT, in stile WhatsApp e già tutte arrivate quando apri il telefono.
    // Ogni riga: [chi, testo, ora]. 'tu' = inviato (verde, a destra, con le spunte), 'lei' = ricevuto (bianco, a sinistra).
    const CHAT = [
      ['lei', 'Dove sei? Ti aspetto da due ore.', '02:31'],
      ['tu', 'Arrivo. Non ricominciare.', '02:33'],
      ['lei', 'Hai detto che stavolta saresti venuto.', '02:33'],
      ['tu', 'Lo so cosa ho detto.', '02:40'],
      ['lei', 'Ieri mi hai guardata in un modo che mi ha fatto paura.', '02:41'],
      ['tu', 'Stai esagerando. Apri la porta.', '02:44'],
      ['lei', 'Non ti apro. Non finché non mi dici cosa c\'è nella pietra, io ho visto che…', '02:47']
    ];
    // IL TELEFONO DI AMBRA: la chat con sua madre (solo messaggi della mamma, nessuna risposta)
    const CHAT_MAMMA = [
      ['lei', 'Ciao tesoro, sono la mamma.', '18:02'],
      ['lei', 'È da un po’ che non ti fai sentire… Volevo sapere se stavi bene.', '18:02'],
      ['lei', 'L’altro giorno sono passata davanti a casa tua, ma non c’eri. Ti ho anche lasciato un messaggio, non so se l’hai ascoltato.', '18:04'],
      ['lei', 'Comunque… ho preparato quei biscotti che ti piacciono tanto Ambra. Se ti va, domenica potresti venire a pranzo.', '18:05'],
      ['lei', 'Non devi avvisarmi troppo presto, sai che per te un posto a tavola c’è sempre amore.', '18:05'],
      ['lei', 'Ti voglio bene. Chiamami quando puoi. 😘😘😘😘❤️', '18:06']
    ];
    let timerChat = [];
    // o: { nome, stato, iniziale, colore, giorno, righe, nonInviato }
    function mostraChat(o) {
      PZ.audio.messaggio();
      stato.modale = true;
      timerChat.forEach(clearTimeout); timerChat = [];
      const t = $('telTitolo'); t.textContent = '';
      const el = function (tag, cls, testo, padre) { const e = document.createElement(tag); if (cls) e.className = cls; if (testo != null) e.textContent = testo; if (padre) padre.appendChild(e); return e; };
      el('span', 'indietro', '‹', t);
      const av = el('i', 'avatar', o.iniziale, t); av.style.background = o.colore;
      const n = el('span', 'nome', o.nome, t); el('small', '', o.stato, n);
      el('span', 'icone', '📞 ⋮', t);
      const chat = $('chat'); chat.textContent = '';
      el('div', 'cifrato', '🔒 I messaggi e le chiamate sono crittografati end-to-end.', chat);
      el('div', 'giorno', o.giorno, chat);
      o.righe.forEach(function (r, i) {
        const d = el('div', 'bolla ' + r[0] + (i === 0 || o.righe[i - 1][0] !== r[0] ? ' primo' : ''), null, chat);
        d.appendChild(document.createTextNode(r[1]));
        const ora = el('span', 'ora', r[2], d);
        if (r[0] === 'tu') el('span', 'spunte', '✓✓', ora);
      });
      if (o.nonInviato) {
        const d = el('div', 'bolla tu nonInviato', null, chat);
        d.appendChild(document.createTextNode(o.nonInviato));
        el('span', 'ora', '⚠ non inviato', d);
      }
      $('telefono').style.display = 'flex';
      chat.scrollTop = chat.scrollHeight;
    }
    function apriTelefono() {
      // l'ultimo messaggio di lei non è mai arrivato: in alto resta "sta scrivendo…"
      mostraChat({ nome: 'Ambra', stato: 'sta scrivendo…', iniziale: 'A', colore: '#c2487c', giorno: 'OGGI', righe: CHAT });
    }
    // (fase 61) il telefono di lei: prima lo si gira in mano; toccando lo schermo (PC: E, Spazio o Invio) si apre la
    // chat con la mamma; chiusa la chat si torna al telefono
    function apriTelAmbra() {
      PZ.audio.tocco();
      guarda(stanza.oggetti.telAmbra, 'IL SUO TELEFONO', PENSA.telefono, { dimensione: 0.16, giro: new THREE.Euler(Math.PI / 2 - 0.25, 0, 0),
        aiuto: 'TRASCINA PER GIRARLO &middot; APRI O TOCCA LO SCHERMO', tocca: chatMamma });
    }
    function chatMamma() {
      PZ.audio.tocco(); esamina.sospendi(true);
      mostraChat({ nome: 'Mamma ❤️', stato: 'ultimo accesso ieri alle 18:07', iniziale: 'M', colore: '#8a6fb0', giorno: 'IERI', righe: CHAT_MAMMA });
    }
    $('chiudiTel').addEventListener('click', function () {
      timerChat.forEach(clearTimeout); $('telefono').style.display = 'none';
      if (esamina.aperto()) esamina.sospendi(false); else stato.modale = false;      // (fase 61) si torna al telefono
    });

    function raccogliPietra() {
      stato.bloccato = 2.1; stato.chino = true;
      PZ.audio.pietra();
      dopo(450, function () {
        stanza.prendiPietra();                                             // la pietra scompare dalla stanza (è in tasca)
        const l = $('lampo'); l.classList.remove('via'); void l.offsetWidth; l.classList.add('via');
        stage.classList.add('anomalia'); scossa = 0.4;
        dopo(950, function () { stage.classList.remove('anomalia'); });
        $('slot').classList.add('pieno'); $('invNome').textContent = 'PIETRA D\'AMBRA  ✓';
      });
      dopo(1100, function () { stato.chino = false; parla('Hai raccolto la pietra d\'ambra. È calda.', 3200); });
      dopo(2200, function () {
        stato.pietra = true; stanza.sblocca();
        parla('La porta si è illuminata. Ora puoi uscire.', 4200);
      });
      stato.pietra = true;                                                // già presa: non si può raccogliere due volte
      stato.sbloccata = false;
      dopo(2200, function () { stato.sbloccata = true; });
    }

    function usaPorta() {
      if (!stato.sbloccata) { PZ.audio.errore(); parla(stato.pietra ? 'Un momento...' : 'La porta non si apre. C\'è ancora qualcosa accanto a lei.', 3200); return; }
      PZ.audio.tocco(); stato.finito = true; stato.modale = true;
      vaiInStrada(false);
    }

    // ---------- Passaggio alla strada (scena 2) ----------
    // Schermo nero con una frase, poi la strada. La cameretta smette di essere disegnata (resta in memoria).
    // test = true: si arriva dal pulsante "Prova la strada" o dall'indirizzo #strada (la pietra risulta già raccolta)
    let corsa = null;
    function vaiInStrada(test, arcade) {
      if (stato.versoStrada) return;
      if (PZ.audio.fermaCarillon) PZ.audio.fermaCarillon(1);
      fermaMusicaStanza();
      if (!PZ.creaCorsa) { $('fine').style.display = 'flex'; return; }
      stato.versoStrada = true; stato.modale = true; stato.iniziato = true;
      ['btn', 'joy', 'aiuto', 'didascalia', 'telefono', 'primo'].forEach(function (id) { $(id).style.display = 'none'; });
      if (test) { $('slot').classList.add('pieno'); $('invNome').textContent = 'PIETRA D\'AMBRA  \u2713'; }
      const pass = $('passaggio');
      pass.style.display = 'flex'; void pass.offsetWidth; pass.classList.add('visibile');
      dopo(test ? 350 : 900, function () {
        stato.uscito = true;
        try { corsa = corsa || PZ.creaCorsa({ renderer: renderer, stage: stage }); corsa.avvia(!arcade); }
        catch (e) { errore(e.message + '\n' + (e.stack || '')); return; }
        dopo(test ? 150 : 600, function () {
          pass.classList.remove('visibile');
          dopo(850, function () { pass.style.display = 'none'; });
        });
      });
    }
    function vuoleStrada() {
      return !!(CONFIG.test && CONFIG.test.scorciatoiaStrada && PZ.creaCorsa && (location.hash === '#strada' || /[?&]strada(=|&|$)/.test(location.search)));
    }
    $('ricomincia').addEventListener('click', function () { location.reload(); });

    // ---------- Controlli ----------
    const input = { x: 0, z: 0 }, tasti = {};
    const joy = $('joy'), man = $('manopola'), btn = $('btn');
    let joyId = null, joyO = { x: 0, y: 0 };
    function relativo(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, em: r.height / 40 }; }
    stage.addEventListener('pointerdown', function (e) {
      if (!stato.iniziato || stato.modale || joyId !== null) return;
      if (e.target.closest && (e.target.closest('#btn') || e.target.closest('#telefono'))) return;
      const p = relativo(e);
      if (p.x > p.w * 0.62 && p.y > p.h * 0.55) return;                    // zona del pulsante
      joyId = e.pointerId; joyO = { x: p.x, y: p.y };
      joy.style.display = 'block'; joy.style.left = p.x + 'px'; joy.style.top = p.y + 'px'; man.style.transform = 'none';
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerId !== joyId) return;
      const p = relativo(e), max = p.em * 3.5;
      let dx = p.x - joyO.x, dy = p.y - joyO.y; const d = Math.hypot(dx, dy);
      if (d > max) { dx *= max / d; dy *= max / d; }
      man.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      input.x = dx / max; input.z = dy / max;
      if (Math.hypot(input.x, input.z) < 0.15) { input.x = 0; input.z = 0; }
    });
    function fineTocco(e) { if (e.pointerId !== joyId) return; joyId = null; input.x = input.z = 0; joy.style.display = 'none'; }
    stage.addEventListener('pointerup', fineTocco); stage.addEventListener('pointercancel', fineTocco);
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    function interagisci() {
      if (!stato.iniziato || stato.modale || stato.bloccato > 0) return;
      const o = vicino(); if (o) o.fn();
    }
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); interagisci(); });
    window.addEventListener('keydown', function (e) {
      if (e.target && e.target.tagName === 'INPUT') return;             // (fase 16) si sta scrivendo il nickname
      tasti[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!stato.iniziato) { if ($('classificaMenu').classList.contains('vis')) $('classificaMenu').classList.remove('vis'); else avvia(); }
        else interagisci();
      }
      if (e.code.indexOf('Arrow') === 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { tasti[e.code] = false; });

    // (fase 42) MUSICA DELLA CAMERETTA: greenlight da 1:24, rallentata al 35% come un nastro, cupa (filtrata, con
    // un'eco lunga), in loop (audio/cameretta-loop.mp3, 51 s). Parte quando entri nella cameretta (STORIA); quando
    // suona il carillon la musica si interrompe (fase 43) e riprende quando il carillon tace; uscendo sfuma.
    // (fase 44) il file si prepara appena si apre la pagina, così al tocco su STORIA parte subito (nello stesso tocco:
    // i browser dei telefoni lo permettono solo lì); il volume parte già alto (un attimo di sfumatura)
    const stanzaMus = { el: null, vol: 0, timer: 0, pronto: null, mix: null };
    try { if (CONFIG.audio.cameretta && CONFIG.audio.cameretta.file) { stanzaMus.pronto = new Audio(CONFIG.audio.cameretta.file); stanzaMus.pronto.loop = true; stanzaMus.pronto.preload = 'auto'; stanzaMus.pronto.load(); } } catch (x) {}
    function musicaStanza() {
      const C = CONFIG.audio.cameretta; if (!C || !C.file || stanzaMus.el || !stanzaMus.pronto) return;
      const e = stanzaMus.pronto; stanzaMus.el = e;
      stanzaMus.mix = PZ.audio.collega ? PZ.audio.collega(e) : { imposta: function (v) { try { e.volume = v; } catch (x) {} } };
      stanzaMus.vol = Math.min(1, CONFIG.audio.volume * (C.volume || 0.6)) * 0.6; stanzaMus.mix.imposta(stanzaMus.vol);
      try { const p = e.play(); if (p && p.catch) p.catch(function () {}); } catch (x) {}
      stanzaMus.timer = setInterval(function () {
        const e = stanzaMus.el; if (!e) return;
        const pieno = Math.min(1, CONFIG.audio.volume * (C.volume || 0.6));
        // (fase 43) il carillon interrompe la musica: si ferma (sfuma in un attimo) e riparte da lì quando il carillon tace
        const car = PZ.audio.carillonSuona && PZ.audio.carillonSuona();
        const vuole = stanzaMus.fuori || car ? 0 : pieno;
        stanzaMus.vol += (vuole - stanzaMus.vol) * (vuole < stanzaMus.vol ? (car ? 0.5 : 0.18) : 0.15);
        stanzaMus.mix.imposta(stanzaMus.vol);
        if (car && !stanzaMus.fuori && stanzaMus.vol < 0.005 && !e.paused) { try { e.pause(); } catch (x) {} }
        if (!car && !stanzaMus.fuori && e.paused) { try { const p = e.play(); if (p && p.catch) p.catch(function () {}); } catch (x) {} }
        if (stanzaMus.fuori && stanzaMus.vol < 0.005) { try { e.pause(); } catch (x) {} clearInterval(stanzaMus.timer); stanzaMus.el = null; }
      }, 50);
    }
    function fermaMusicaStanza() { stanzaMus.fuori = true; }
    function avvia(e) {
      if (stato.iniziato) return;
      stato.iniziato = true; PZ.audio.avvia(); $('avvio').style.display = 'none';
      if (vuoleStrada()) { vaiInStrada(true); return; }
      musicaStanza();
      setTimeout(function () { $('aiuto').style.opacity = 0; }, 6000);
    }
    // (fase 59) nel menu la storia parte SOLO dal tasto STORIA (prima bastava toccare un punto qualsiasi dello schermo:
    // tornando al menu dalla fine, un tocco fuori dai tasti riportava subito nella cameretta). Dopo RIGIOCA invece
    // basta toccare dove si vuole. Nel primo mezzo secondo i tocchi non contano (il dito che ha premuto il tasto).
    const tCarica = performance.now();
    $('avvio').addEventListener('pointerdown', function (e) {
      if (performance.now() - tCarica < 500) return;
      if (!$('avvio').classList.contains('rigioca') && !(e.target.closest && e.target.closest('.via'))) return;
      avvia(e);
    });
    // (fase 58) dopo RIGIOCA (fine della storia): solo "TOCCA PER RICOMINCIARE"
    try { if (sessionStorage.getItem('ambra.rigioca')) { sessionStorage.removeItem('ambra.rigioca'); $('avvio').classList.add('rigioca'); document.querySelector('#avvio .via').textContent = '\u25b6 TOCCA PER RICOMINCIARE'; } } catch (e) {}

    // ---------- (fase 16) MODALITÀ ARCADE: pulsante con il lucchetto, classifica ----------
    // Bloccata finché non si finisce la storia (src/strada/arcade.js). Toccandola bloccata trema e dice perché.
    const arcBtn = $('arcadeBtn');
    function aggiornaArcadeBtn() {
      const ok = !!(PZ.arcade && PZ.creaCorsa && PZ.arcade.sbloccata());
      arcBtn.classList.toggle('bloccato', !ok);
      $('classificaBtn').classList.toggle('vis', ok);
    }
    aggiornaArcadeBtn();
    function avviaArcade() {
      if (stato.iniziato) return;
      if (!PZ.arcade || !PZ.arcade.sbloccata()) {
        PZ.audio.avvia(); PZ.audio.errore();
        PZ.riavviaClasse(arcBtn, 'no'); $('arcadeNota').classList.add('vis');
        clearTimeout(avviaArcade.t); avviaArcade.t = setTimeout(function () { $('arcadeNota').classList.remove('vis'); }, 2600);
        return;
      }
      stato.iniziato = true; PZ.audio.avvia(); PZ.audio.tocco(); $('avvio').style.display = 'none';
      PZ.arcade.attiva = true; PZ.raccolta.arcade = true;
      const pass = $('passaggio');
      pass.querySelector('h2').textContent = 'ARCADE';
      pass.querySelector('p').innerHTML = 'Nessuna fine. Solo la strada.<br>Quanti metri riesci a fare?';
      vaiInStrada(true, true);
    }
    arcBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); avviaArcade(); });
    $('classificaBtn').addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      PZ.audio.avvia(); PZ.audio.tocco();
      PZ.arcade.mostra($('classificaLista'), null); $('classificaMenu').classList.add('vis');
    });
    $('classificaMenu').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    $('chiudiClassifica').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); PZ.audio.tocco(); $('classificaMenu').classList.remove('vis'); });
    // pulsante di prova nella schermata iniziale: porta subito alla strada (si spegne in config.js, test)
    if (CONFIG.test && CONFIG.test.scorciatoiaStrada && PZ.creaCorsa) {
      const prova = $('provaStrada');
      prova.style.display = 'inline-block';
      prova.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (stato.iniziato) return;
        stato.iniziato = true; PZ.audio.avvia(); $('avvio').style.display = 'none';
        vaiInStrada(true);
      });
      if (vuoleStrada()) document.querySelector('#avvio .via').textContent = '\u25b6 TOCCA PER LA STRADA (test)';
    }

    // ---------- Ciclo ----------
    const camPos = new V3(0, 4.2, 4.8), camFuoco = new V3(0, 0.5, 0), tmpF = new V3(), tmpP = new V3();
    let ultimo = performance.now();
    function ciclo(ora) {
      if (stato.uscito) return;                 // siamo in strada: la cameretta non si disegna più
      requestAnimationFrame(ciclo);
      const dt = Math.min(0.05, (ora - ultimo) / 1000); ultimo = ora; tMondo += dt;
      if (stato.bloccato > 0) stato.bloccato -= dt;

      let ix = input.x, iz = input.z;
      if (tasti.KeyA || tasti.ArrowLeft) ix -= 1; if (tasti.KeyD || tasti.ArrowRight) ix += 1;
      if (tasti.KeyW || tasti.ArrowUp) iz -= 1; if (tasti.KeyS || tasti.ArrowDown) iz += 1;
      const fermo = (!stato.iniziato || stato.modale || stato.bloccato > 0) ? (stato.chino ? 'chino' : true) : false;
      giocatore.aggiorna(dt, ix, iz, fermo);
      stanza.aggiorna(tMondo, dt, giocatore.pos);
      esamina.aggiorna(dt);

      // pulsante INTERAGISCI: compare solo vicino a un oggetto
      const o = (stato.iniziato && !stato.modale && stato.bloccato <= 0) ? vicino() : null;
      btn.style.display = o ? 'flex' : 'none';

      // camera dall'alto, segue il giocatore con dolcezza (il muro sud non è disegnato: si vede sempre dentro)
      const gx = giocatore.pos.x, gz = giocatore.pos.z;
      tmpP.set(Math.max(-1.1, Math.min(1.1, gx * 0.6)), 4.1, Math.min(gz + 4.3, 5.1));
      tmpF.set(gx * 0.8, 0.55, Math.min(gz - 0.35, 0.75));
      const k = 1 - Math.exp(-dt * 5);
      camPos.lerp(tmpP, k); camFuoco.lerp(tmpF, k);
      camera.position.copy(camPos);
      if (scossa > 0) { scossa -= dt; camera.position.x += (Math.random() - 0.5) * scossa * 0.5; camera.position.y += (Math.random() - 0.5) * scossa * 0.4; }
      camera.lookAt(camFuoco);
      renderer.render(scena, camera);
    }
    requestAnimationFrame(ciclo);

    // utile per le prove automatiche
    window.__ambra = { esamina: esamina, stato: stato, giocatore: giocatore, stanza: stanza, vicino: vicino, oggetti: oggetti, input: input, avvia: avvia, camera: camera, vaiInStrada: vaiInStrada };
  } catch (e) { errore(e.message + '\n' + (e.stack || '')); }
})();
