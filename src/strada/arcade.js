// (fase 16) MODALITÀ ARCADE: la corsa infinita. Qui ci sono le cose che non stanno nella corsa:
//  - lo SBLOCCO: la modalità si apre solo dopo aver finito la storia (salvato nel browser: "ambra.arcade");
//  - la CLASSIFICA dei metri, salvata sul dispositivo ("ambra.classifica": le 30 corse migliori) con il nickname
//    (l'ultimo usato si ricorda: "ambra.nickname");
//  - la SCELTA DEL POTERE ogni 100 frammenti (CUORE D'AMBRA o FURIA D'AMBRA): mentre è aperta la corsa è in pausa.
// La corsa (src/strada/corsa.js) chiede PZ.arcade.attiva, apriScelta(...), sceltaAperta(), aggiungi(...), ecc.
// Per le prove (con test.scorciatoiaStrada in config.js) l'indirizzo con "arcade" (es. index.html?arcade) sblocca la
// modalità solo per quella visita, senza salvarla.
PZ.arcade = (function () {
  const CFG = PZ.CONFIG.arcade || {};
  const K_SBLOCCO = 'ambra.arcade', K_CLASSIFICA = 'ambra.classifica', K_NICK = 'ambra.nickname', SALVATI = 30;
  let mem = null;
  try { mem = window.localStorage; mem.setItem('ambra.prova', '1'); mem.removeItem('ambra.prova'); } catch (e) { mem = null; }
  const leggi = function (k) { try { return mem ? mem.getItem(k) : null; } catch (e) { return null; } };
  const scrivi = function (k, v) { try { if (mem) mem.setItem(k, v); } catch (e) {} };
  let sbloccataOra = false, listaRiserva = [];        // (se il browser non salva niente vale finché la pagina è aperta)
  if (PZ.CONFIG.test && PZ.CONFIG.test.scorciatoiaStrada && /[?&#]arcade(=|&|$)/.test(location.search + location.hash)) sbloccataOra = true;

  const A = { attiva: false };
  A.sbloccata = function () { return sbloccataOra || leggi(K_SBLOCCO) === '1'; };
  A.sblocca = function () { const prima = A.sbloccata(); sbloccataOra = true; scrivi(K_SBLOCCO, '1'); return !prima; };

  // ---------- Classifica ----------
  A.classifica = function () {
    let L = null;
    try { L = JSON.parse(leggi(K_CLASSIFICA) || 'null'); } catch (e) { L = null; }
    if (!Array.isArray(L)) L = listaRiserva;
    return L.filter(function (v) { return v && typeof v.m === 'number'; }).sort(function (a, b) { return b.m - a.m || a.d - b.d; });
  };
  A.record = function () { const L = A.classifica(); return L.length ? L[0].m : 0; };
  A.nickname = function () { return leggi(K_NICK) || ''; };
  // pulisce il nome: maiuscolo, niente simboli strani, al massimo 12 caratteri
  A.pulisci = function (n) { return String(n || '').toUpperCase().replace(/[^A-Z0-9ÀÈÉÌÒÙ _.\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12); };
  // salva una corsa; restituisce il suo id (per evidenziarla) e la posizione in classifica (1 = prima)
  // (fase 17) stesso nickname = stessa persona: in classifica resta solo il suo record migliore. Una corsa peggiore
  // non sostituisce la vecchia (e risponde con il record già salvato, nuovo: false). ANONIMO non si raggruppa.
  A.aggiungi = function (nome, metri, frammenti) {
    nome = A.pulisci(nome) || 'ANONIMO';
    if (nome !== 'ANONIMO') scrivi(K_NICK, nome);
    const v = { id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), n: nome, m: Math.floor(metri), f: frammenti || 0, d: Date.now() };
    let L = A.classifica();
    if (nome !== 'ANONIMO') {
      const best = L.find(function (x) { return x.n === nome; });      // la classifica è ordinata: il primo è il migliore
      if (best && best.m >= v.m) { if (PZ.online) PZ.online.invia(nome, v.m, v.f); return { id: best.id, posizione: L.indexOf(best) + 1, nuovo: false }; }
      L = L.filter(function (x) { return x.n !== nome; });
    }
    L.push(v);
    L.sort(function (a, b) { return b.m - a.m || a.d - b.d; });
    const tenuti = L.slice(0, SALVATI);
    listaRiserva = tenuti; scrivi(K_CLASSIFICA, JSON.stringify(tenuti));
    if (PZ.online) PZ.online.invia(nome, v.m, v.f);                     // (fase 65) anche online
    return { id: v.id, posizione: L.indexOf(v) + 1, nuovo: true };
  };
  // (fase 65) scrive la classifica: prima quella del dispositivo (subito), poi, se arriva, quella ONLINE di tutti
  let giro = 0;
  function riga(ol, nome, metri, tu, pos) {
    const li = document.createElement('li');
    if (tu) li.className = 'tu';
    if (pos) li.style.counterSet = 'pos ' + pos;
    const s = document.createElement('span'); s.textContent = nome;
    const b = document.createElement('b'); b.textContent = metri + ' m';
    li.appendChild(s); li.appendChild(b); ol.appendChild(li);
  }
  A.mostra = function (ol, tu) {
    const mio = ++giro, N = CFG.classifica || 10;
    mostraLocale(ol, tu);
    if (!PZ.online) return;
    ol.setAttribute('data-stato', 'carica');
    PZ.online.leggi(N).then(function (R) {
      if (mio !== giro) return;                                  // nel frattempo è stata chiesta un'altra classifica
      if (!R) { ol.setAttribute('data-stato', 'locale'); return; }
      ol.setAttribute('data-stato', 'online');
      ol.textContent = '';
      if (!R.lista.length) { const li = document.createElement('li'); li.className = 'vuota'; li.textContent = 'ANCORA NESSUNA CORSA'; ol.appendChild(li); return; }
      R.lista.forEach(function (v) { riga(ol, v.n, v.m, v.tu, 0); });
      if (R.tu) riga(ol, R.tu.n, R.tu.m, true, R.tu.posizione);  // tu, fuori dai primi, con la tua posizione vera
    });
  };
  function mostraLocale(ol, tu) {
    const L = A.classifica(), N = CFG.classifica || 10;
    ol.textContent = '';
    if (!L.length) { const li = document.createElement('li'); li.className = 'vuota'; li.textContent = 'ANCORA NESSUNA CORSA'; ol.appendChild(li); return; }
    let righe = L.slice(0, N);
    const iTu = tu ? L.findIndex(function (v) { return v.id === tu; }) : -1;
    L.slice(0, N).concat(iTu >= N ? [L[iTu]] : []).forEach(function (v, i) {
      const li = document.createElement('li');
      if (v.id === tu) li.className = 'tu';
      if (i >= N) li.style.counterSet = 'pos ' + (iTu + 1);       // la tua corsa fuori dai primi: con la sua posizione vera
      const s = document.createElement('span'); s.textContent = v.n;
      const b = document.createElement('b'); b.textContent = v.m + ' m';
      li.appendChild(s); li.appendChild(b); ol.appendChild(li);
    });
    righe = null;
  };

  // ---------- Scelta del potere (ogni tot frammenti, config arcade.potereOgni) ----------
  let el = null, quando = 0, fatto = null;
  function scegli(quale) {
    if (!el || !el.classList.contains('vis') || performance.now() - quando < 500) return;   // niente tocchi rimasti dal gioco
    const b = el.querySelector('[data-potere="' + quale + '"]');
    if (!b || b.classList.contains('pieno')) return;
    el.classList.remove('vis');
    const f = fatto; fatto = null;
    if (f) f(quale);
  }
  function prepara() {
    if (el) return;
    el = document.getElementById('potere');
    el.querySelectorAll('.potereScelta').forEach(function (b) {
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); scegli(b.getAttribute('data-potere')); });
    });
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    window.addEventListener('keydown', function (e) {
      if (!el.classList.contains('vis')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'ArrowLeft' || e.code === 'KeyA') scegli('cuore');
      else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'ArrowRight' || e.code === 'KeyD') scegli('furia');
    }, true);
  }
  // cuori = quanti ne ha già; cb(quale) quando sceglie
  A.apriScelta = function (cuori, cb) {
    prepara();
    const max = CFG.cuoriMax || 3, bc = el.querySelector('[data-potere="cuore"]');
    bc.classList.toggle('pieno', cuori >= max);
    bc.querySelector('.quanti').textContent = cuori >= max ? '(Hai già ' + max + ' cuori: il massimo.)' : cuori ? '(Ne hai ' + cuori + '.)' : '';
    el.querySelector('.durata').textContent = CFG.furia || 8;
    el.classList.add('vis'); quando = performance.now(); fatto = cb;
    if (PZ.audio && PZ.audio.avviso) PZ.audio.avviso();
  };
  A.chiudiScelta = function () { if (el) el.classList.remove('vis'); fatto = null; };
  A.sceltaAperta = function () { return !!(el && el.classList.contains('vis')); };
  return A;
})();
