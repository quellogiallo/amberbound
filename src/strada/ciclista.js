// Il protagonista in bicicletta: gli stessi modelli del videoclip (PZ.creaRagazzo e PZ.creaBici, file in
// src/personaggi/, non modificati) con la stessa posa in sella: bacino sulla sella, mani sulle manopole, piedi sui
// pedali che girano con la pedivella. Il corpo ondeggia a ogni pedalata, come nel videoclip.
// Oltre alla posa in sella, qui si possono mettere bici e ragazzo in pose qualsiasi (serve alla scena iniziale).
PZ.creaCiclista = function (scena) {
  const V3 = THREE.Vector3;
  const bici = PZ.creaBici(scena);
  const ragazzo = PZ.creaRagazzo(scena);
  function nuovaPosa() {
    return { pos: new V3(), dir: 0, dirPiedi: 0, bacino: { x: 0, z: 0 }, busto: { x: 0, y: 0, z: 0 }, testa: { x: 0, y: 0, z: 0 },
      sguardo: 0, giro: 0, mani: { sx: new V3(), dx: new V3() }, piedi: { sx: new V3(), dx: new V3() }, punte: { sx: 0, dx: 0 } };
  }
  const P = nuovaPosa();
  const d = new V3(), pos = new V3();
  const AVANTI = Math.PI;   // la bici guarda verso -z: la direzione di marcia
  const B = { dir: AVANTI, inclina: 0, pendenza: 0 };

  // bici in una posa qualsiasi: (x, y, z) punto a terra tra le ruote, direzione, pendenza (+ muso su), inclinazione
  function mettiBici(x, y, z, dir, pendenza, inclina, ruote, pedivella) {
    pos.set(x, y, z); B.dir = dir; B.inclina = inclina; B.pendenza = pendenza;
    bici.aggiorna(pos, dir, pendenza, inclina, ruote, pedivella);
  }
  // posa in sella ricavata dalla bici (come PZ.fasi.inSella del videoclip). alzato: 0 seduto, 1 in piedi sui pedali
  function inSella(Q, pedivella, t, sforzo, alzato) {
    alzato = alzato || 0;
    bici.locale(0, 1.05 + 0.08 * alzato, -0.24 + 0.14 * alzato, Q.pos);
    Q.dir = B.dir; Q.dirPiedi = B.dir;
    Q.bacino.x = 0.3 - B.pendenza + 0.2 * alzato; Q.bacino.z = B.inclina;
    const s = Math.sin(pedivella);
    Q.busto.x = 0.42 + 0.06 * (sforzo || 0) + 0.12 * alzato; Q.busto.y = 0.045 * s; Q.busto.z = 0.035 * s;
    Q.testa.x = -0.18 - 0.1 * alzato + 0.03 * Math.cos(2 * pedivella); Q.testa.y = -0.04 * s + 0.05 * Math.sin(t * 0.37); Q.testa.z = -0.3 * B.inclina;
    bici.punto('manopolaSx', Q.mani.sx).add(bici.direzione(0, 0.045, -0.03, d));
    bici.punto('manopolaDx', Q.mani.dx).add(bici.direzione(0, 0.045, -0.03, d));
    bici.punto('pedaleSx', Q.piedi.sx).add(bici.direzione(0, 0.077, -0.11, d));
    bici.punto('pedaleDx', Q.piedi.dx).add(bici.direzione(0, 0.077, -0.11, d));
    Q.punte.sx = Q.punte.dx = B.pendenza;
    return Q;
  }
  function posa(Q) { ragazzo.posa(Q); ragazzo.conferma(); }
  function mostra(v) { bici.gruppo.visible = v; ragazzo.gruppo.visible = v; }

  // In corsa. x = posizione laterale, inclina = inclinazione laterale (+ verso destra), ruote e pedivella in radianti,
  // t = tempo, visibile = per il lampeggio dopo un urto, sforzo = 0..1, o = { y, pendenza, alzato, dir } per il salto
  function aggiorna(x, inclina, ruote, pedivella, t, visibile, sforzo, o) {
    o = o || {};
    mettiBici(x, o.y || 0, 0, o.dir === undefined ? AVANTI : o.dir, o.pendenza || 0, inclina, ruote, pedivella);
    inSella(P, pedivella, t, sforzo, o.alzato || 0);
    posa(P);
    mostra(visibile);
  }
  return { aggiorna: aggiorna, mettiBici: mettiBici, inSella: inSella, posa: posa, mostra: mostra, nuovaPosa: nuovaPosa,
    bici: bici, ragazzo: ragazzo, raggioRuota: bici.raggioRuota, AVANTI: AVANTI };
};
