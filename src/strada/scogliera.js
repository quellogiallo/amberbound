// FINALE SULLA SCOGLIERA: punto d'ingresso.
// Quando il giocatore raccoglie tutti i frammenti d'ambra, la corsa si ferma (niente più ostacoli, comandi spenti,
// il demone sparisce) e chiama PZ.scogliera.entra(dati) UNA volta sola, con
//   dati = { frammenti, metri, secondi, urti }.
// La scena vera (il ragazzo arriva alla scogliera, compare la pietra d'ambra completa, si può ruotare, sul retro
// la data di uscita dell'EP) non c'è ancora: per collegarla basta assegnare
//   PZ.scogliera.scena = function (dati) { ... }
// prima che la raccolta finisca (per esempio in un file nuovo caricato dopo questo). Finché non c'è, compare un
// cartello d'attesa sopra la strada. Esce anche l'evento 'ambra:scogliera' sulla finestra (dati in event.detail).
// PZ.scogliera.esci() lo richiude (la usa il riavvio della corsa).
PZ.scogliera = {
  scena: null,
  attiva: false,
  entra: function (dati) {
    if (this.attiva) return;
    this.attiva = true;
    try { window.dispatchEvent(new CustomEvent('ambra:scogliera', { detail: dati })); } catch (e) {}
    if (typeof this.scena === 'function') { this.scena(dati); return; }
    const el = document.getElementById('finale');
    if (el) setTimeout(function () { if (PZ.scogliera.attiva) el.classList.add('vis'); }, 900);
  },
  esci: function () {
    this.attiva = false;
    const el = document.getElementById('finale');
    if (el) el.classList.remove('vis');
  }
};
