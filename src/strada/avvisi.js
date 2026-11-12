// AVVISI (disclaimer) sulle meccaniche meno intuitive: la manata del demone, i sensi di colpa, la ragazza come
// ostacolo, la O Ave Maria. Ognuno compare UNA SOLA VOLTA PER GIOCATORE, la prima volta che quella cosa arriva,
// e rallenta fortissimo la corsa (fase 52b: niente più pausa; intanto non si muore) finché non si tocca lo schermo
// (TAP PER CONTINUARE; su PC anche Spazio, Invio o un clic) o non passano 10 secondi.
//
// CHI È IL GIOCATORE. Un identificativo anonimo, casuale, creato la prima volta e salvato nel browser (localStorage,
// "ambra.giocatore"). Nessun indirizzo IP, nessun dato personale. Gli avvisi già visti sono salvati per quel
// giocatore, uno per uno ("ambra.avvisi.<id>": { manata: data, colpa: data, ... }). Se i dati del browser vengono
// cancellati, o si gioca da un altro browser/telefono, gli avvisi ricompaiono: va bene così. Se il browser non lascia
// salvare niente (navigazione privata su alcuni telefoni), gli avvisi si ricordano solo finché la pagina resta aperta.
//
// La corsa chiede: PZ.avvisi.visto(nome), PZ.avvisi.mostra(nome) e, a ogni fotogramma, PZ.avvisi.aperto() (se è
// aperto la corsa è ferma: niente ostacoli, demone, collisioni, tempo). RIPROVA, RIAVVIA e RIGIOCA non li rimostrano.
PZ.avvisi = (function () {
  const TESTI = {
    manata: { titolo: 'LA MANATA', righe: [
      'Il demone ti sbarra la strada: il suo <b>corpo</b> chiude una corsia, la sua <b>mano</b> quella accanto.',
      'La mano è un ostacolo vero: <b>SALTALA</b> come una transenna, oppure <b>cambia corsia</b> se la terza è libera.',
      'A volte saltarla è <b>l\'unica via</b>.'] },
    colpa: { titolo: 'SENSI DI COLPA', righe: [
      'La colpa ti confonde: per qualche secondo <b>SINISTRA e DESTRA sono INVERTITE</b> (le frecce si girano).',
      'Il <b>SALTO</b> invece funziona come sempre.'] },
    ragazza: { titolo: 'LEI', righe: [
      'Il fantasma della ragazza ti sbarra la strada.',
      '<b>In piedi</b>: non si salta, <b>cambia corsia</b>. <b>A terra</b>: <b>SALTALA</b> come una transenna.'] },
    arcade: { titolo: 'MODALITA ARCADE', righe: [
      'Nessuna fine: corri finché reggi. Più metri fai, più la strada si fa difficile.',
      'Ogni <b>50 frammenti</b> la pietra ti dà un potere, a scelta:',
      '<b>CUORE D\'AMBRA</b>: una vita in più (fino a 3). Se il demone ti prende, la pietra lo respinge.',
      '<b>FURIA D\'AMBRA</b>: 8 secondi invincibile. Sfondi auto, transenne e mani, il demone resta indietro e i metri contano doppio.'] },
    maria: { titolo: 'O AVE MARIA', righe: [
      'Prendila passandoci attraverso: la bici <b>vola per qualche secondo</b> sopra auto, transenne e demone.',
      'È sempre in punti rischiosi: <b>sopra una transenna va presa saltando</b>.'] }
  };
  // ---------- Il giocatore e gli avvisi già visti ----------
  let memoria = null, id = null, visti = {};
  try { memoria = window.localStorage; memoria.setItem('ambra.prova', '1'); memoria.removeItem('ambra.prova'); } catch (e) { memoria = null; }
  function nuovoId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    let s = ''; for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
    return s.slice(0, 8) + '-' + s.slice(8, 12) + '-4' + s.slice(13, 16) + '-a' + s.slice(17, 20) + '-' + s.slice(20, 32);
  }
  try {
    id = memoria && memoria.getItem('ambra.giocatore');
    if (!id) { id = nuovoId(); if (memoria) memoria.setItem('ambra.giocatore', id); }
    const v = memoria && memoria.getItem('ambra.avvisi.' + id);
    visti = v ? (JSON.parse(v) || {}) : {};
  } catch (e) { visti = {}; if (!id) id = nuovoId(); }
  function salva() { try { if (memoria) memoria.setItem('ambra.avvisi.' + id, JSON.stringify(visti)); } catch (e) {} }

  // ---------- Il riquadro ----------
  let el = null, aperto = null, tAperto = 0, attivi = true;
  function crea() {
    if (el) return el;
    el = document.createElement('div'); el.id = 'avviso'; el.className = 'ui';
    el.innerHTML = '<div class="avvRiq"><div class="avvOcchi"><i></i><i></i><i></i></div><h4></h4><div class="avvTesto"></div><div class="avvTap">TAP PER CONTINUARE</div><div class="avvPc">PC: Spazio, Invio o clic</div></div>';
    (document.getElementById('stage') || document.body).appendChild(el);
    const via = function (e) { if (!aperto) return; e.preventDefault(); e.stopPropagation(); chiudi(true); };
    el.addEventListener('pointerdown', via);
    window.addEventListener('keydown', function (e) {
      if (!aperto) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); chiudi(true); }
      else if (/Arrow|Key[WASD]/.test(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); }     // la corsa è ferma
    }, true);
    return el;
  }
  // sempre = true: si mostra anche se già visto (il banner della modalità arcade, a ogni inizio)
  function mostra(nome, sempre) {
    const T = TESTI[nome];
    if (!T || aperto || !attivi || (visti[nome] && !sempre)) return false;
    crea();
    el.querySelector('h4').textContent = T.titolo;
    el.querySelector('.avvTesto').innerHTML = T.righe.map(function (r) { return '<p>' + r + '</p>'; }).join('');
    aperto = nome; tAperto = performance.now();
    el.classList.remove('via'); el.classList.add('vis');
    PZ.riavviaClasse(el, 'entra');
    if (PZ.audio && PZ.audio.avviso) PZ.audio.avviso();
    return true;
  }
  // letto: true = l'ha chiuso il giocatore (da ora non ricompare); false = chiuso dal gioco (RIPROVA, morte...): non
  // conta come visto. Un tocco nei primi 0,45 s non chiude (era il dito di un gesto di gioco ancora in corso).
  function chiudi(letto) {
    if (!aperto) return;
    if (letto && performance.now() - tAperto < 1000) return;   // (fase 59) 1 s: un dito che sta già strisciando non lo chiude senza leggerlo
    if (letto) { visti[aperto] = new Date().toISOString(); salva(); if (PZ.audio && PZ.audio.tocco) PZ.audio.tocco(); }
    aperto = null;
    el.classList.remove('vis', 'entra');
  }
  return {
    mostra: mostra, chiudi: chiudi,
    // (fase 52b) a ogni fotogramma: dopo 10 secondi l'avviso si chiude da solo (conta come letto)
    aggiorna: function () { if (aperto && performance.now() - tAperto > 10000) chiudi(true); },
    aperto: function () { return !!aperto; }, quale: function () { return aperto; },
    visto: function (nome) { return !!visti[nome]; },
    // segna senza mostrare niente (es. 'guida' = ha già fatto la prima corsa con gli ostacoli di prova)
    segna: function (nome) { if (!visti[nome]) { visti[nome] = new Date().toISOString(); salva(); } },
    giocatore: function () { return id; }, elenco: function () { return Object.assign({}, visti); },
    // per le prove automatiche: false = non mostrare nessun avviso; dimentica() = come un giocatore nuovo
    prova: function (si) { attivi = si !== false; if (!attivi) chiudi(false); },
    dimentica: function () { visti = {}; salva(); }
  };
})();
