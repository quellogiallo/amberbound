// (fase 65) CLASSIFICA ONLINE (Firebase): la classifica dell'arcade condivisa fra tutti i giocatori.
//  - Ogni dispositivo entra in modo ANONIMO (nessuna email): Firebase gli dà un codice segreto (uid).
//  - Nel database (Firestore, raccolta "classifica") c'è UN documento per giocatore, con il suo record migliore:
//    { n: nickname, m: metri, f: frammenti, d: data }. Una corsa peggiore non lo sostituisce.
//  - Se manca internet (o Firebase non risponde) il gioco usa la classifica del dispositivo (src/strada/arcade.js):
//    il gioco non si blocca mai per colpa della classifica.
// Le chiavi stanno in config.js (firebase). Le regole di sicurezza del database sono in LEGGIMI.md.
PZ.online = (function () {
  const CFG = PZ.CONFIG.firebase;
  const V = '10.12.2', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  const RACCOLTA = 'classifica', ATTESA = 6000;
  let pronto = null;                          // Promise -> { db, uid, fs } oppure null (non disponibile)

  function conTempo(p, ms) {
    return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(new Error('tempo scaduto')); }, ms); })]);
  }
  function avvia() {
    if (pronto) return pronto;
    if (!CFG || !CFG.apiKey || location.protocol === 'file:') { pronto = Promise.resolve(null); return pronto; }
    pronto = conTempo(Promise.all([
      import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')
    ]).then(function (m) {
      const app = m[0].initializeApp(CFG), auth = m[1].getAuth(app), fs = m[2];
      const db = fs.getFirestore(app);
      return m[1].signInAnonymously(auth).then(function (c) { return { db: db, uid: c.user.uid, fs: fs }; });
    }), ATTESA * 2).catch(function (e) { console.warn('[classifica online] non disponibile:', e && e.message); pronto = null; return null; });
    return pronto;
  }

  const O = {};
  O.avvia = avvia;
  let invio = null;                           // l'ultimo salvataggio in corso (la classifica lo aspetta)

  // salva la corsa: tiene solo il record migliore del giocatore
  O.invia = function (nome, metri, frammenti) {
    metri = Math.floor(metri);
    invio = avvia().then(function (F) {
      if (!F) return null;
      const fs = F.fs, ref = fs.doc(F.db, RACCOLTA, F.uid);
      return conTempo(fs.getDoc(ref), ATTESA).then(function (s) {
        const vecchio = s.exists() ? s.data() : null;
        if (vecchio && vecchio.m >= metri) {
          if (vecchio.n === nome) return true;                            // niente di nuovo
          return fs.updateDoc(ref, { n: nome, m: vecchio.m, f: vecchio.f || 0, d: fs.serverTimestamp() }).then(function () { return true; });
        }
        return conTempo(fs.setDoc(ref, { n: nome, m: metri, f: Math.floor(frammenti || 0), d: fs.serverTimestamp() }), ATTESA).then(function () { return true; });
      });
    }).catch(function (e) { console.warn('[classifica online] salvataggio non riuscito:', e && e.message); return null; });
    return invio;
  };

  // legge i primi N e la posizione del giocatore: { lista: [{id,n,m,tu}], tu: {posizione, n, m} | null } o null
  O.leggi = function (N) {
    const attendi = invio || Promise.resolve();
    return attendi.then(avvia).then(function (F) {
      if (!F) return null;
      const fs = F.fs, col = fs.collection(F.db, RACCOLTA);
      const primi = conTempo(fs.getDocs(fs.query(col, fs.orderBy('m', 'desc'), fs.limit(N))), ATTESA);
      const mio = conTempo(fs.getDoc(fs.doc(F.db, RACCOLTA, F.uid)), ATTESA);
      return Promise.all([primi, mio]).then(function (r) {
        const lista = [];
        r[0].forEach(function (d) { const v = d.data(); lista.push({ id: d.id, n: v.n, m: v.m, tu: d.id === F.uid }); });
        if (!r[1].exists()) return { lista: lista, tu: null };
        const me = r[1].data();
        if (lista.some(function (v) { return v.tu; })) return { lista: lista, tu: null };
        // fuori dai primi: quanti hanno fatto più metri di me?
        return conTempo(fs.getCountFromServer(fs.query(col, fs.where('m', '>', me.m))), ATTESA).then(function (c) {
          return { lista: lista, tu: { posizione: c.data().count + 1, n: me.n, m: me.m } };
        }).catch(function () { return { lista: lista, tu: null }; });
      });
    }).catch(function (e) { console.warn('[classifica online] lettura non riuscita:', e && e.message); return null; });
  };

  // si collega subito in sottofondo, così alla prima classifica è già pronto
  setTimeout(avvia, 1500);
  return O;
})();
