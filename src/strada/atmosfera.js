// La città che diventa inquietante a poco a poco. k va da 0 (notte normale) a 1 (massima paranoia):
// la foschia e il cielo passano dal blu al viola e poi a un rosso vino innaturale, le luci si abbassano e le ombre
// si fanno più dense, le finestre accese diventano color ambra e poi rossastre, i lampioni sfarfallano sempre di più,
// la luna (quella col volto del videoclip) si gira, mostra il volto e poi il ghigno. Tutto cambia in modo continuo: nessun salto.
// buio (da 0 a 1, il BLACKOUT di eventi.js): sopra a tutto questo si spengono lampioni, finestre e insegne, la luce
// cala, la foschia diventa nera; restano la luna e il cielo, così i palazzi diventano sagome scure. Ogni volta i
// valori si ricalcolano da capo a partire da k, quindi con buio = 0 tutto torna esattamente com'era.
PZ.creaAtmosfera = function (scena, citta) {
  const MAT = citta.materiali, L = citta.luci, cielo = citta.cielo;
  const tappe = {
    nebbia: [0x262d57, 0x2b1f4c, 0x37162e], medio: [0x151a3c, 0x19123a, 0x1e0b20], alto: [0x060818, 0x07061a, 0x080310],
    emi: [0x7480b8, 0x7d66aa, 0x8a4c76], luna: [0xb8c4ff, 0xc6a9ff, 0xff9a6a],
    finestre: [0xffffff, 0xffd9a0, 0xff8a60]
  };
  const forza = { emi: [0.85, 0.7, 0.55], amb: [0.35, 0.28, 0.2], luna: [0.4, 0.36, 0.32], finestre: [1, 0.88, 0.72] };
  const c1 = new THREE.Color(), c2 = new THREE.Color(), cOut = new THREE.Color();
  function col(arr, k, out) {
    const t = k < 0.5 ? k / 0.5 : (k - 0.5) / 0.5, a = k < 0.5 ? arr[0] : arr[1], b = k < 0.5 ? arr[1] : arr[2];
    return out.copy(c1.set(a)).lerp(c2.set(b), t);
  }
  function num(arr, k) { const t = k < 0.5 ? k / 0.5 : (k - 0.5) / 0.5; return k < 0.5 ? arr[0] + (arr[1] - arr[0]) * t : arr[1] + (arr[2] - arr[1]) * t; }
  const liscia = function (a, b, v) { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
  // disturbi della paranoia (paranoia.js): finestre tinte o più forti/spente, lampioni che tremolano a comando
  const dist = { mix: 0, tinta: new THREE.Color(), forza: 1, cambiato: false };
  let insegneBattito = false;
  // (fase 66) PERICOLO: il demone alle tue spalle. Da 0 a 1 la foschia, il cielo e le luci virano a un rosso sangue
  // (sopra a tutto il resto; con 0 tutto torna esattamente com'era)
  let per = 0, ultimoPer = 0;
  const ROSSO = { nebbia: new THREE.Color(0x6e0712), cielo: new THREE.Color(0x3a0208), emi: new THREE.Color(0xff3424), luna: new THREE.Color(0xff5030), finestre: new THREE.Color(0xff2a10) };
  const rossa = function (hex, c, f) { return cOut.set(hex).lerp(c, f).getHex(); };
  let ultimo = -1, ultimoBuio = -1, sfarfallio = 0, prossimo = 0, respiro = 0;
  const scuro = function (hex, f) { return cOut.set(hex).multiplyScalar(f).getHex(); };
  const rnd = PZ.ps1.casuale(66);
  // metri: strada percorsa (la luna si gira solo dopo un tratto lungo, vedi config.js strada.luna)
  const LUNA = PZ.CONFIG.strada.luna;
  function aggiorna(k, dt, buio, metri) {
    buio = buio || 0; metri = metri || 0;
    if (Math.abs(k - ultimo) > 0.004 || buio !== ultimoBuio || dist.cambiato || Math.abs(per - ultimoPer) > 0.004) {
      ultimo = k; ultimoBuio = buio; dist.cambiato = false; ultimoPer = per;
      col(tappe.nebbia, k, scena.fog.color).multiplyScalar(1 - 0.78 * buio);
      if (per > 0) scena.fog.color.lerp(ROSSO.nebbia, 0.65 * per);
      const b = scuro(col(tappe.nebbia, k, new THREE.Color()).getHex(), 1 - 0.55 * buio), m = scuro(col(tappe.medio, k, cOut).getHex(), 1 - 0.4 * buio),
        a = scuro(col(tappe.alto, k, cOut).getHex(), 1 - 0.25 * buio);
      if (per > 0) cielo.colora(rossa(b, ROSSO.nebbia, 0.6 * per), rossa(m, ROSSO.cielo, 0.6 * per), rossa(a, ROSSO.cielo, 0.35 * per));
      else cielo.colora(b, m, a);
      col(tappe.emi, k, L.emi.color); L.emi.intensity = num(forza.emi, k) * (1 - 0.8 * buio);
      if (per > 0) { L.emi.color.lerp(ROSSO.emi, 0.7 * per); L.emi.intensity *= 1 + 0.25 * per; }
      L.amb.intensity = num(forza.amb, k) * (1 - 0.75 * buio);
      col(tappe.luna, k, L.luna.color); L.luna.intensity = num(forza.luna, k) * (1 - 0.3 * buio);
      if (per > 0) L.luna.color.lerp(ROSSO.luna, 0.6 * per);
      col(tappe.finestre, k, MAT.facciate.emissive).multiplyScalar(num(forza.finestre, k) * (1 - 0.94 * buio));
      if (dist.mix > 0) MAT.facciate.emissive.lerp(dist.tinta, dist.mix);     // paranoia: finestre di un colore sbagliato
      MAT.facciate.emissive.multiplyScalar(dist.forza);
      if (per > 0) MAT.facciate.emissive.lerp(ROSSO.finestre, 0.55 * per);
      MAT.negozi.emissive.copy(MAT.facciate.emissive);
      MAT.luci.color.setScalar(1 - 0.93 * buio); MAT.insegne.color.setScalar(1 - 0.85 * buio);
    }
    // la luna: dopo un lungo tratto di strada si gira e mostra il volto, poi il ghigno si allarga fino alla forma
    // finale; il ghigno "respira" (si inarca e si distende piano)
    respiro += dt || 0;
    cielo.luna.volto(liscia(LUNA.gira[0], LUNA.gira[1], metri));
    const gh = liscia(LUNA.ghigno[0], LUNA.ghigno[1], metri);
    cielo.luna.sorriso(gh, gh * (0.5 - 0.5 * Math.cos(respiro * 2 * Math.PI / 5)));
    // i lampioni sfarfallano: a riposo quasi mai, verso la fine spesso
    prossimo -= dt;
    if (prossimo <= 0) { sfarfallio = rnd() < k * 0.9 ? 0.25 + rnd() * 0.15 : 0; prossimo = 0.4 + rnd() * (2.5 - 1.8 * k); }
    if (sfarfallio > 0) sfarfallio -= dt;
    const spento = sfarfallio > 0 && Math.sin(sfarfallio * 70) > 0;
    // (fase 28) A TEMPO DI MUSICA: aloni e pozze di luce dei lampioni e le insegne pulsano sul battito della canzone
    // (più forte sul primo tempo di ogni battuta). Senza musica (o alla morte) restano come prima.
    const mus = PZ.audio.colonna, bt = mus && mus.attiva() ? mus.colpo() : -1;
    MAT.pozze.opacity = (spento ? 0.15 : 0.5) * (1 - 0.25 * k) * (1 - buio) * (bt < 0 ? 1 : 0.82 + 0.45 * bt);
    MAT.aloni.opacity = Math.min(1, (spento ? 0.2 : 0.8) * (1 - buio) * (bt < 0 ? 1 : 0.8 + 0.4 * bt));
    if (bt >= 0 || insegneBattito) { insegneBattito = bt >= 0; MAT.insegne.color.setScalar((1 - 0.85 * buio) * (bt < 0 ? 1 : 0.78 + 0.42 * bt)); }
  }
  aggiorna(0, 0);
  function finestre(tinta, mix, forza) {
    if (mix === dist.mix && forza === dist.forza && (!tinta || dist.tinta.getHex() === tinta)) return;
    if (tinta !== null && tinta !== undefined) dist.tinta.set(tinta);
    dist.mix = mix; dist.forza = forza; dist.cambiato = true;
  }
  function sfarfalla(sec) { sfarfallio = Math.max(sfarfallio, sec); prossimo = Math.max(prossimo, sec + 0.3); }
  function pericolo(v) { per = Math.max(0, Math.min(1, v || 0)); }
  return { aggiorna: aggiorna, finestre: finestre, sfarfalla: sfarfalla, pericolo: pericolo, stato: function () { return { k: ultimo, buio: ultimoBuio }; } };
};
