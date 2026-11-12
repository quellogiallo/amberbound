// Apparizioni: sagome della paranoia che si fanno vedere ma NON sono ostacoli (non si possono urtare).
// Non stanno mai in mezzo a una corsia vicino al ragazzo, così non confondono:
//  - marciapiede: una figura ferma sul marciapiede che lo fissa; sparisce prima che lui le passi accanto;
//  - attraversa: una creatura attraversa lentamente la strada lontano e sparisce sull'altro marciapiede;
//  - lontano: compare in fondo alla strada, nella foschia, per un istante e scompare;
//  - tra le auto: spunta per un attimo tra due auto che arrivano, ancora lontane, e svanisce.
// Diventano più frequenti con la difficoltà; al massimo due alla volta.
PZ.creaApparizioni = function (citta, branco) {
  const D = PZ.CONFIG.strada.difficolta, CFG = D.apparizioni, V0 = D.velocitaIniziale, LC = citta.LC, SOSTA = citta.SOSTA;
  const rnd = PZ.ps1.casuale(515), attive = [];
  const mix = function (a, b, k) { return a + (b - a) * k; };
  let contatore = { marciapiede: 0, attraversa: 0, lontano: 0, traLeAuto: 0 };
  function reset() { attive.forEach(function (a) { a.s.nascondi(); branco.rilascia(a.s); }); attive.length = 0; }
  function nuova(F, auto) {
    const s = branco.prendi(); if (!s) return;
    const lato = rnd() < 0.5 ? -1 : 1, a = { s: s, tipo: '', x: 0, z: 0, vx: 0, vita: 0, durata: 0, finita: false };
    const u = rnd();
    // tra le auto: cerca due auto vicine (o un'auto sola) ancora lontane
    let coppia = null;
    if (u > 0.72 && auto) {
      for (let i = 0; i < auto.length && !coppia; i++) {
        const A = auto[i]; if (A.z > -70 && A.z < -48) coppia = A;
      }
    }
    if (coppia) {
      a.tipo = 'traLeAuto'; a.z = coppia.z; a.x = coppia.x + (coppia.corsia === 2 ? -1 : 1) * LC / 2; a.durata = 0.8;
    } else if (u < 0.36) {
      // sul bordo del marciapiede, davanti a lampioni, alberi e pensiline (così non resta nascosta dietro di loro)
      a.tipo = 'marciapiede'; a.x = lato * (SOSTA + 0.2); a.z = -(45 + rnd() * 30); a.durata = 99;
    } else if (u < 0.62) {
      // attraversa: deve finire di attraversare prima di arrivare a 40 m dal ragazzo
      a.tipo = 'attraversa'; a.x = lato * (SOSTA + 1.2); a.z = -(76 + rnd() * 12);
      const secondi = (-a.z - 40) / (V0 * Math.max(1, F));
      a.vx = -lato * (2 * (SOSTA + 1.2)) / (secondi * 0.9); a.durata = 99;
    } else {
      a.tipo = 'lontano'; a.x = (Math.floor(rnd() * 3) - 1) * LC; a.z = -(80 + rnd() * 10); a.durata = 1 + rnd() * 0.6;
    }
    contatore[a.tipo]++;
    s.gruppo.position.set(a.x, 0, a.z); s.gruppo.rotation.y = a.tipo === 'attraversa' ? (a.vx > 0 ? 1.2 : -1.2) : 0;
    s.appari(a.tipo === 'lontano' || a.tipo === 'traLeAuto' ? 0.18 : 0.5);
    attive.push(a);
  }
  // F: velocità del tempo di gioco; p: difficoltà; tempo: secondi di corsa; auto: auto in scena; intensita: atmosfera
  function aggiorna(dt, F, p, tempo, auto, intensita) {
    if (tempo >= CFG.da && attive.length < 2) {
      const lambda = mix(CFG.iniziale, CFG.finale, p);         // apparizioni al secondo
      if (rnd() < lambda * dt) nuova(F, auto);
    }
    for (let i = attive.length - 1; i >= 0; i--) {
      const a = attive[i];
      a.vita += dt;
      a.z += V0 * F * dt;                                       // ferme rispetto alla strada: vengono incontro con lei
      if (a.tipo === 'attraversa') { a.x += a.vx * dt; if (!a.finita && Math.abs(a.x) > SOSTA + 1.3 && a.vita > 1) { a.finita = true; a.s.svanisci(0.4); } }
      if (a.tipo === 'marciapiede' && !a.finita && a.z > -14) { a.finita = true; a.s.svanisci(0.25); }
      if ((a.tipo === 'lontano' || a.tipo === 'traLeAuto') && !a.finita && a.vita > a.durata) { a.finita = true; a.s.svanisci(0.2); }
      a.s.gruppo.position.set(a.x, 0, a.z);
      a.s.aggiorna(dt, intensita);
      if (!a.s.visibile) { branco.rilascia(a.s); attive.splice(i, 1); }
    }
  }
  return { aggiorna: aggiorna, reset: reset, attive: attive, contatore: function () { return contatore; } };
};
