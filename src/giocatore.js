// Il protagonista incappucciato del videoclip (stesso modello, stessa felpa, stessa collana) che cammina nella stanza.
// Il modello arriva da src/personaggi/ragazzo.js senza modifiche: qui si decide solo dove sta e come muove gambe e braccia.
PZ.creaGiocatore = function (scena, stanza) {
  const V3 = THREE.Vector3;
  const r = PZ.creaRagazzo(scena);
  const C = PZ.CONFIG.giocatore;
  const pos = new V3(-0.1, 0, 1.9);
  let dir = Math.PI, fase = 0, vel = 0, chino = 0;
  const P = { pos: new V3(), dir: 0, dirPiedi: 0, bacino: { x: 0, z: 0 }, busto: { x: 0, y: 0, z: 0 }, testa: { x: 0, y: 0, z: 0 },
    sguardo: 0, giro: 0, mani: { sx: new V3(), dx: new V3() }, piedi: { sx: new V3(), dx: new V3() }, punte: { sx: 0, dx: 0 } };
  const ALTEZZA = 0.92, CAVIGLIA = 0.077;

  function angolo(da, a, k) { let d = a - da; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return da + d * k; }

  // spinge il cerchio del giocatore fuori dalle scatole dei mobili
  function collisioni() {
    const lim = stanza.limite;
    pos.x = Math.max(-lim, Math.min(lim, pos.x)); pos.z = Math.max(-lim, Math.min(lim + 0.2, pos.z));
    stanza.colliders.forEach(function (b) {
      const cx = Math.max(b.x0, Math.min(pos.x, b.x1)), cz = Math.max(b.z0, Math.min(pos.z, b.z1));
      const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
      if (d < C.raggio) {
        if (d > 1e-5) { pos.x = cx + dx / d * C.raggio; pos.z = cz + dz / d * C.raggio; }
        else { pos.z = b.z1 + C.raggio; }   // dentro la scatola (non dovrebbe succedere): esce verso sud
      }
    });
  }

  function aggiorna(dt, ix, iz, fermo) {
    const mag = fermo ? 0 : Math.min(1, Math.hypot(ix, iz));
    if (mag > 0.05) {
      pos.x += ix / Math.max(1, Math.hypot(ix, iz)) * C.velocita * mag * dt;
      pos.z += iz / Math.max(1, Math.hypot(ix, iz)) * C.velocita * mag * dt;
      dir = angolo(dir, Math.atan2(ix, iz), Math.min(1, dt * 10));
    }
    collisioni();
    vel += (((mag > 0.05) ? Math.min(1, mag * 1.2) : 0) - vel) * Math.min(1, dt * 9);
    const fasePrima = fase;
    fase += dt * 8.2 * vel;
    // (fase 26) PASSI: il suono parte quando un piede tocca terra nell'animazione. Il piede è alzato finché cos(f) > 0
    // (vedi "alza" più sotto), quindi appoggia quando f passa per π/2 (+ 2kπ): il sinistro ha f = fase, il destro
    // f = fase + π, cioè un appoggio ogni volta che fase - π/2 supera un multiplo di π (sinistro e destro alternati).
    const appoggio = function (x) { return Math.floor((x - Math.PI / 2) / Math.PI); };
    if (vel > 0.2 && appoggio(fase) !== appoggio(fasePrima) && PZ.audio.passoStanza) PZ.audio.passoStanza(vel, appoggio(fase) % 2 === 0 ? -1 : 1);
    chino += ((fermo === 'chino' ? 1 : 0) - chino) * Math.min(1, dt * 6);
    const s = Math.sin(fase), c = Math.cos(fase), respiro = Math.sin(performance.now() / 1000 * 1.6);
    const avanti = new V3(Math.sin(dir), 0, Math.cos(dir)), sinistra = new V3(Math.cos(dir), 0, -Math.sin(dir));

    P.pos.set(pos.x, ALTEZZA - 0.012 + 0.025 * Math.abs(c) * vel - 0.1 * chino, pos.z);
    P.dir = dir; P.dirPiedi = dir;
    P.bacino.x = 0.03 * vel + 0.25 * chino; P.bacino.z = -0.035 * s * vel;
    P.busto.x = 0.06 * vel + 0.012 * respiro + 0.35 * chino; P.busto.y = -0.1 * s * vel; P.busto.z = 0.03 * s * vel;
    P.testa.x = 0.1 + 0.2 * chino; P.testa.y = 0.1 * s * vel; P.testa.z = 0;
    P.sguardo = 0.1; P.giro = 0;
    [['sx', 1, 0], ['dx', -1, Math.PI]].forEach(function (g) {
      const n = g[0], lato = g[1], f = fase + g[2];
      const passo = 0.3 * Math.sin(f) * vel, alza = Math.max(0, Math.cos(f)) * 0.13 * vel;
      P.piedi[n].copy(pos).addScaledVector(avanti, passo + 0.02 * chino).addScaledVector(sinistra, lato * 0.11);
      P.piedi[n].y = CAVIGLIA + alza;
      P.punte[n] = 0.35 * Math.cos(f) * vel;
      // BRACCIA (fase 13: più umane). Da fermo pendono rilassate lungo i fianchi, quasi distese (prima le mani stavano
      // all'altezza del bacino e i gomiti sporgevano in fuori, rigidi), con un'oscillazione lievissima del respiro, un
      // po' diversa tra destra e sinistra. Camminando oscillano opposte alle gambe, con un attimo di ritardo (come un
      // pendolo che segue il passo): la mano che va avanti sale un poco e si avvicina al corpo (il gomito si piega), quella
      // che va indietro resta più distesa e si apre appena. Quando si china, le mani scendono verso la pietra
      const osc = -Math.sin(f - 0.35), avantiM = Math.max(0, osc), indietroM = Math.max(0, -osc);
      const t = performance.now() / 1000, quieto = (1 - vel) * (1 - chino);
      const fianco = 0.215 + 0.012 * Math.sin(t * 0.9 + lato) * quieto;
      P.mani[n].copy(pos)
        .addScaledVector(avanti, 0.035 + (0.2 * avantiM - 0.15 * indietroM) * vel + 0.008 * respiro * quieto + 0.28 * chino)
        .addScaledVector(sinistra, lato * (fianco - 0.03 * avantiM * vel + 0.02 * indietroM * vel - 0.04 * chino));
      P.mani[n].y = ALTEZZA - 0.13 + (0.075 * avantiM + 0.015 * indietroM) * vel + 0.006 * respiro * quieto - 0.2 * chino;
    });
    // (fase 47) il bacino all'altezza che lasciano le gambe quasi tese (sale e scende a ogni passo); mani dietro
    if (PZ.anim && PZ.anim.quotaBacino) {
      const dy = PZ.anim.quotaBacino(P.pos, P.piedi, dir) - 0.1 * chino - P.pos.y;
      P.pos.y += dy; P.mani.sx.y += dy; P.mani.dx.y += dy;
    }
    r.posa(P);
    r.conferma();
  }
  return { pos: pos, aggiorna: aggiorna, ragazzo: r, dir: function () { return dir; } };
};
