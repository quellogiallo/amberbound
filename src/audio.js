// Suoni semplici generati dal browser (nessun file necessario). Parte solo dopo il primo tocco, come vogliono i telefoni.
PZ.audio = (function () {
  let ctx = null, master = null, ovatta = null, limite = null, limiteDopo = null;
  function avvia() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      // (fase 30) latencyHint 'playback': buffer audio più grandi, così sul telefono (grafica pesante) il suono non
      // gracchia per i buchi di elaborazione
      try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { ctx = new AC(); }
      master = ctx.createGain(); master.gain.value = PZ.CONFIG.audio.volume;
      // filtro su tutto: normalmente aperto; durante i sensi di colpa i suoni arrivano ovattati, come sott'acqua
      ovatta = ctx.createBiquadFilter(); ovatta.type = 'lowpass'; ovatta.frequency.value = 20000; ovatta.Q.value = 0.5;
      // (fase 29) LIMITATORE su tutta l'uscita: musica ed effetti sommati non superano mai il massimo (niente distorsione)
      // (fase 30) agisce solo sui picchi (-1 dB). Il compressore del browser aggiunge da solo un guadagno di compensazione:
      // "dopo" lo riporta indietro, così il limitatore non alza il volume (in fase 29 lo alzava di ~2,7 dB)
      limite = ctx.createDynamicsCompressor();
      limite.threshold.value = -1; limite.knee.value = 0; limite.ratio.value = 20; limite.attack.value = 0.003; limite.release.value = 0.25;
      const dopo = ctx.createGain(); dopo.gain.value = 0.9;   // picco massimo in uscita ~0.93 (misurato)
      limite.connect(dopo); dopo.connect(ctx.destination); limiteDopo = dopo;
      master.connect(ovatta); ovatta.connect(limite);
    } catch (e) { ctx = null; }
    caricaStinger();
    aveMaria.carica();              // (fase 31) il pezzo della O Ave Maria
    pezziFinale.carica();           // (fase 36) Pezzidicarne per il finale
    colonna.carica();               // (fase 28) la colonna sonora si scarica subito: è pronta quando si apre la porta
  }
  // ---- (fase 14) STINGER DEL DEMONE: un file vero (PZ.CONFIG.audio.stingerDemone), caricato appena parte l'audio così
  // è pronto quando serve. Suona dritto all'uscita (non lo abbassano gli altri effetti né lo zittisce la morte: è il
  // suono del jumpscare); lo ferma solo fermaStinger (RIPROVA, riavvio). Se il browser non lo carica con fetch (pagina
  // aperta come file dal computer) usa un elemento <audio>.
  let bufStinger = null, voceStinger = null, elStinger = null;
  function caricaStinger() {
    const url = PZ.CONFIG.audio.stingerDemone;
    if (!url || bufStinger || !ctx) return;
    bufStinger = 'carica';
    const riserva = function () { bufStinger = false; try { elStinger = new Audio(url); elStinger.preload = 'auto'; elStinger.load(); } catch (e) { elStinger = null; } };
    if (location.protocol === 'file:') { riserva(); return; }   // aperta dal computer: fetch non può leggere i file
    try {
      fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (ok, ko) { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); }); })
        .then(function (buf) { bufStinger = buf; }).catch(riserva);
    } catch (e) { riserva(); }
  }
  function fermaStinger(sec) {
    if (voceStinger && ctx) { const g = voceStinger.g.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + (sec || 0.15)); try { voceStinger.s.stop(t + (sec || 0.15) + 0.05); } catch (e) {} voceStinger = null; }
    if (elStinger && !elStinger.paused) { try { elStinger.pause(); } catch (e) {} }
  }
  function stingerDemone() {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    fermaStinger(0.05);
    colonna.abbassa(0.3, 1.6);      // (fase 28) la musica si fa da parte per il colpo del demone
    const vol = PZ.CONFIG.audio.volume * (PZ.CONFIG.audio.volumeStinger || 1);
    if (bufStinger && bufStinger !== 'carica') {
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufStinger; g.gain.value = vol;
      s.connect(g); g.connect(limite); s.start(); voceStinger = { s: s, g: g };
      s.onended = function () { if (voceStinger && voceStinger.s === s) voceStinger = null; };
    } else if (elStinger) {
      try { elStinger.currentTime = 0; elStinger.volume = Math.min(1, vol); const p = elStinger.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    } else { nota(55, 2.2, 'sawtooth', 0.14, 0, 0.7); nota(1900, 0.9, 'sawtooth', 0.04, 0.05, 1.3); }   // non ancora caricato
  }
  // una nota: frequenza, durata, forma d'onda, volume, ritardo, e quanto scende di tono (in rapporto)
  function nota(f, dur, tipo, vol, quando, scivola) {
    if (!ctx) return;
    const t = ctx.currentTime + (quando || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
    if (scivola) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * scivola), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  let carillon = null;
  // ---- suoni della strada ----
  let bufRumore = null, vento = null, volo = null;
  function rumore() {
    if (!bufRumore && ctx) {
      bufRumore = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = bufRumore.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return bufRumore;
  }
  // soffio di rumore filtrato: frequenza del filtro da f0 a f1, durata, volume
  function soffio(f0, f1, dur, vol, quando) {
    if (!ctx) return;
    const t = ctx.currentTime + (quando || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = rumore(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  // un tic d'orologio suonato al contrario: cresce dal silenzio e si interrompe di netto
  function ticRovescio(t, dur, vol, f) {
    const o = ctx.createOscillator(), b = ctx.createBiquadFilter(), g = ctx.createGain(), s = ctx.createBufferSource(), gs = ctx.createGain();
    o.type = 'square'; o.frequency.value = f; b.type = 'bandpass'; b.frequency.value = f * 1.3; b.Q.value = 3;
    s.buffer = rumore();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.004);
    gs.gain.value = 0.6;
    o.connect(b); s.connect(gs); gs.connect(b); b.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const strada = {
    scarto: function () { soffio(900, 2400, 0.18, 0.12); },
    urto: function () { soffio(600, 120, 0.35, 0.5); nota(90, 0.3, 'sine', 0.35, 0, 0.45); },
    // (fase 19) auto sbalzata in Furia: schianto secco, lamiera che si piega, vetri in frantumi, tonfo quando ricade
    distruzione: function () {
      soffio(5000, 300, 0.25, 0.8); nota(48, 1.1, 'sine', 0.6, 0, 0.35); nota(95, 0.5, 'sawtooth', 0.22, 0, 0.3);
      soffio(2200, 120, 0.9, 0.45, 0.05);
      nota(140, 0.7, 'square', 0.14, 0.04, 0.55); nota(205, 0.6, 'sawtooth', 0.1, 0.1, 0.5); nota(310, 0.45, 'square', 0.07, 0.18, 0.6);
      soffio(9000, 3000, 0.35, 0.3, 0.08);
      [0.1, 0.16, 0.24, 0.31, 0.4, 0.52, 0.63].forEach(function (q, i) { nota(2800 + (i % 3) * 700, 0.09, 'triangle', 0.06, q); });
      nota(60, 0.5, 'sine', 0.45, 1.0, 0.5); soffio(900, 80, 0.4, 0.45, 1.0);
    },
    clacson: function () { nota(392, 0.32, 'square', 0.06, 0.04); nota(466, 0.32, 'square', 0.05, 0.04); },
    // CLACSON DI PROSSIMITÀ: un'auto che suona mentre viene incontro. Un suono continuo (due trombe stonate, come un
    // clacson vero) di cui la corsa cambia volume, posizione destra/sinistra e un po' di tono (più alto mentre si
    // avvicina, più basso dopo che è passata: l'effetto Doppler). imposta(volume 0..1, pan -1..1, tono ~1); ferma(sec).
    clacsonVicino: function () {
      if (!ctx) return null;
      const t = ctx.currentTime, p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'square'; o2.type = 'square'; o1.frequency.value = 392; o2.frequency.value = 474;
      f.type = 'lowpass'; f.frequency.value = 1800; f.Q.value = 0.7; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(p); p.connect(master);
      o1.start(t); o2.start(t);
      let ultimo = { v: -1, pan: 9, k: 0 }, finito = false;
      return {
        imposta: function (v, pan, k) {
          if (finito) return;
          const now = ctx.currentTime, vv = Math.round(Math.max(0, Math.min(1, v)) * 40) / 40, pp = Math.round(Math.max(-1, Math.min(1, pan || 0)) * 10) / 10, kk = Math.round((k || 1) * 100) / 100;
          if (vv !== ultimo.v) { g.gain.setTargetAtTime(0.11 * vv * vv, now, 0.06); ultimo.v = vv; }
          if (p.pan && pp !== ultimo.pan) { p.pan.setTargetAtTime(pp, now, 0.08); ultimo.pan = pp; }
          if (kk !== ultimo.k) { o1.frequency.setTargetAtTime(392 * kk, now, 0.1); o2.frequency.setTargetAtTime(474 * kk, now, 0.1); f.frequency.setTargetAtTime(1200 + 900 * vv, now, 0.1); ultimo.k = kk; }
        },
        ferma: function (sec) {
          if (finito) return; finito = true;
          const now = ctx.currentTime, d = Math.max(0.05, sec || 0.3);
          g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, d / 3);
          try { o1.stop(now + d + 0.1); o2.stop(now + d + 0.1); } catch (e) {}
        }
      };
    },
    bip: function (via) { nota(via ? 988 : 660, via ? 0.35 : 0.14, 'square', 0.07); },
    // fruscio del vento in corsa: k da 0 (fermo) a 1 (veloce); un solo suono continuo, solo il volume cambia
    vento: function (k) {
      if (!ctx) return;
      if (!vento) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = rumore(); s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0;
        s.connect(f); f.connect(g); g.connect(master); s.start();
        vento = { g: g, f: f };
      }
      // (solo quando cambia davvero: un comando al suono a ogni fotogramma, su Safari, si accumula e appesantisce)
      const kk = Math.round(Math.max(0, Math.min(1, k)) * 50) / 50;
      if (vento.k === kk) return; vento.k = kk;
      vento.g.gain.setTargetAtTime(0.05 * kk, ctx.currentTime, 0.2);
      vento.f.frequency.setTargetAtTime(380 + 500 * kk, ctx.currentTime, 0.2);
    }
  };
  // ---- scena iniziale, salto, demone (suoni di prova generati dal gioco) ----
  const demoni = {
    portaApre: function () { nota(150, 0.7, 'sawtooth', 0.04, 0, 0.6); nota(152, 0.7, 'square', 0.025, 0.05, 0.55); soffio(300, 900, 0.6, 0.03); },
    portaChiude: function () { soffio(400, 80, 0.25, 0.35); nota(70, 0.25, 'sine', 0.3, 0, 0.6); },
    demoneAppare: function () { nota(55, 2.6, 'sawtooth', 0.09, 0, 0.8); nota(58.3, 2.6, 'sawtooth', 0.08, 0.05, 0.8); nota(110, 1.8, 'triangle', 0.05, 0.3, 0.5); soffio(2000, 200, 1.6, 0.05); },
    battito: function () { nota(58, 0.14, 'sine', 0.35, 0, 0.7); nota(52, 0.16, 'sine', 0.28, 0.2, 0.7); },
    clic: function () { nota(1800, 0.03, 'square', 0.04); nota(900, 0.04, 'square', 0.03, 0.05); },
    scappa: function () { [330, 392, 494].forEach(function (f, i) { nota(f, 0.25, 'square', 0.06, i * 0.09); }); nota(55, 0.6, 'sawtooth', 0.08, 0, 0.7); },
    salto: function () { soffio(500, 1800, 0.22, 0.12); nota(300, 0.16, 'triangle', 0.06, 0, 2); },
    atterraggio: function () { soffio(500, 90, 0.16, 0.25); nota(80, 0.14, 'sine', 0.22, 0, 0.7); },
    transenna: function () { nota(330, 0.25, 'square', 0.08); nota(495, 0.18, 'square', 0.05, 0.02); soffio(1200, 300, 0.3, 0.3); },
    sagomaUrto: function () { soffio(3000, 120, 0.45, 0.4); nota(220, 0.5, 'sawtooth', 0.08, 0, 0.3); nota(233, 0.5, 'sawtooth', 0.07, 0, 0.32); },
    cattura: function () { soffio(4000, 60, 0.9, 0.5); nota(300, 0.9, 'sawtooth', 0.1, 0, 0.25); nota(47, 1.2, 'sawtooth', 0.12, 0, 0.8); },
    // frammento d'ambra raccolto: un rintocco cristallino; serie = quanti presi di fila (la nota sale, fino a un'ottava)
    // (fase 46) in chiave con la colonna (sol maggiore): la serie sale sulla scala di sol (sol5 -> sol6) e la seconda
    // nota è la quinta DELLA SCALA (re sopra sol, mi sopra la... mai fuori tonalità)
    ambra: function (serie) {
      const SC = [0, 2, 4, 5, 7, 9, 11], g = Math.min(serie || 0, 7);
      const semi = function (k) { return 12 * Math.floor(k / 7) + SC[k % 7]; };
      const f = 783.99 * Math.pow(2, semi(g) / 12), q = 783.99 * Math.pow(2, semi(g + 4) / 12);
      nota(f, 0.16, 'triangle', 0.08); nota(q, 0.24, 'sine', 0.05, 0.035);
    }
  };
  // ---- LA VOCE DEL FANTASMA (sintetizzata: una voce di ragazza fatta di un'onda e di un soffio passati per tre
  // "formanti", i filtri che danno il suono delle vocali) ----
  let eco = null;
  function bus() {                    // eco comune a tutte le voci: ripete, sempre più cupo
    if (!eco) {
      const d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), out = ctx.createGain();
      d.delayTime.value = 0.29; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 1800; out.gain.value = 0.55;
      d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out); out.connect(master);
      eco = d;
    }
    return eco;
  }
  // chiavi: [tempo, F1, F2, F3] (le vocali); src: la sorgente (già collegata ai suoi volumi); dest: dove va la voce
  function formanti(src, dest, t, chiavi, vol) {
    [[1, 6, 1], [2, 11, 0.55], [3, 13, 0.28]].forEach(function (f) {
      const b = ctx.createBiquadFilter(), g = ctx.createGain();
      b.type = 'bandpass'; b.Q.value = f[1]; g.gain.value = f[2] * vol;
      chiavi.forEach(function (c, i) { if (i === 0) b.frequency.setValueAtTime(c[f[0]], t + c[0]); else b.frequency.linearRampToValueAtTime(c[f[0]], t + c[0]); });
      src.connect(b); b.connect(g); g.connect(dest);
    });
  }
  function inviluppo(param, t, punti) {          // punti: [tempo, valore]
    param.setValueAtTime(0.0001, t);
    punti.forEach(function (p) { param.linearRampToValueAtTime(Math.max(0.0001, p[1]), t + p[0]); });
  }
  function onda(tipo, t, fine) { const o = ctx.createOscillator(); o.type = tipo; o.start(t); o.stop(t + fine); return o; }
  function soffioLungo(t, fine) { const s = ctx.createBufferSource(); s.buffer = rumore(); s.loop = true; s.start(t, Math.random() * 0.5); s.stop(t + fine); return s; }
  // "hel-lo-o": posa 'piedi' cantilena, 'fissa' sussurrato, 'braccia' lungo e più basso, con un'ombra di voce sotto
  function hello(dest, t, posa) {
    // (k: altezza della voce; 1,12 = due semitoni sopra la prima versione)
    const sussurro = posa === 'fissa', lungo = posa === 'braccia', D = lungo ? 2.0 : 1.5, k = (lungo ? 0.85 : 1) * 1.12;
    const v = onda('sawtooth', t, D + 0.1), n = soffioLungo(t, D + 0.1), gv = ctx.createGain(), gn = ctx.createGain(), mix = ctx.createGain();
    // intonazione: sale su "hel", scende su "lo-o" (come chi chiama qualcuno), con un tremolio
    v.frequency.setValueAtTime(290 * k, t); v.frequency.linearRampToValueAtTime(345 * k, t + 0.3);
    v.frequency.linearRampToValueAtTime(300 * k, t + 0.55); v.frequency.exponentialRampToValueAtTime(205 * k, t + D);
    const lfo = onda('sine', t, D + 0.1), lg = ctx.createGain(); lfo.frequency.value = 5.3; lg.gain.value = 7; lfo.connect(lg); lg.connect(v.frequency);
    v.connect(gv); n.connect(gn); gv.connect(mix); gn.connect(mix);
    const sv = sussurro ? 0.12 : 1;
    inviluppo(gv.gain, t, [[0.09, 0], [0.17, sv], [0.33, sv], [0.41, 0.45 * sv], [0.55, sv], [D * 0.7, 0.7 * sv], [D, 0]]);
    inviluppo(gn.gain, t, [[0.03, 0.9], [0.1, 0.8], [0.16, sussurro ? 0.85 : 0.2], [D * 0.7, sussurro ? 0.6 : 0.14], [D, 0]]);
    formanti(mix, dest, t, [[0, 500, 1700, 2500], [0.12, 560, 1850, 2550], [0.3, 560, 1850, 2550], [0.39, 380, 1000, 2600],
      [0.48, 400, 950, 2600], [0.62, 480, 820, 2450], [D * 0.7, 430, 760, 2400], [D, 340, 650, 2300]], 3.2);
    if (lungo) {                                  // un'ottava sotto, appena udibile: non è solo lei
      const b = onda('sawtooth', t + 0.05, D), gb = ctx.createGain();
      b.frequency.setValueAtTime(140, t); b.frequency.exponentialRampToValueAtTime(98, t + D); b.detune.value = -18;
      b.connect(gb); inviluppo(gb.gain, t, [[0.2, 0], [0.6, 0.35], [D, 0]]);
      formanti(gb, dest, t, [[0, 480, 820, 2450], [D, 340, 650, 2300]], 2.2);
    }
    return D;
  }
  // un singhiozzo: due-quattro sussulti brevi, a volte un lamento che scende e trema, a volte un respiro rotto
  // f: altezza della voce (la ragazza circa 420 Hz; il ragazzo nei sensi di colpa molto più basso)
  function singhiozzo(dest, t, f, rnd) {
    let u = t;
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const d = 0.1 + rnd() * 0.05, v = onda('sawtooth', u, d + 0.05), r = soffioLungo(u, d + 0.05), g = ctx.createGain(), gr = ctx.createGain(), m = ctx.createGain();
      v.frequency.setValueAtTime(f * (1.05 - i * 0.04), u); v.frequency.linearRampToValueAtTime(f * (0.9 - i * 0.04), u + d);
      v.connect(g); r.connect(gr); g.connect(m); gr.connect(m);
      inviluppo(g.gain, u, [[0.015, 0.9], [d * 0.6, 0.6], [d, 0]]); inviluppo(gr.gain, u, [[0.01, 0.6], [d, 0]]);
      formanti(m, dest, u, [[0, 650, 1150, 2600], [d, 560, 1000, 2500]], 2.6);
      u += d + 0.05 + rnd() * 0.06;
    }
    if (rnd() < 0.55) {                           // il lamento
      const d = 0.7 + rnd() * 0.6, v = onda('sawtooth', u, d + 0.1), r = soffioLungo(u, d + 0.1), g = ctx.createGain(), gr = ctx.createGain(), m = ctx.createGain();
      v.frequency.setValueAtTime(f * 1.15, u); v.frequency.exponentialRampToValueAtTime(f * 0.72, u + d);
      const lfo = onda('sine', u, d + 0.1), lg = ctx.createGain(); lfo.frequency.value = 6.5; lg.gain.value = f * 0.035; lfo.connect(lg); lg.connect(v.frequency);
      v.connect(g); r.connect(gr); g.connect(m); gr.connect(m);
      inviluppo(g.gain, u, [[0.08, 0.8], [d * 0.5, 0.7], [d, 0]]); inviluppo(gr.gain, u, [[0.05, 0.35], [d, 0]]);
      formanti(m, dest, u, [[0, 700, 1220, 2600], [d * 0.6, 600, 1000, 2500], [d, 400, 800, 2400]], 2.6);
      u += d + 0.1;
    }
    if (rnd() < 0.45) {                           // il respiro che si spezza
      const d = 0.32, r = soffioLungo(u, d + 0.05), b = ctx.createBiquadFilter(), g = ctx.createGain();
      b.type = 'bandpass'; b.Q.value = 3; b.frequency.setValueAtTime(1300, u); b.frequency.linearRampToValueAtTime(2600, u + d);
      r.connect(b); b.connect(g); g.connect(dest); inviluppo(g.gain, u, [[0.2, 0.22], [d, 0]]);
      u += d;
    }
    return u - t;
  }
  // una voce del fantasma: tipo 'hello' o 'pianto'. imposta(volume 0..1, pan -1..1) a ogni fotogramma;
  // svanisci(secondi): si spegne chiudendosi (resta l'eco); ferma(): zitta subito.
  // f (facoltativo): altezza del pianto (la ragazza circa 420 Hz; il ragazzo alla scogliera circa 160)
  function voce(tipo, posa, f) {
    if (!ctx) return null;
    const rnd = Math.random, uscita = ctx.createGain(), lp = ctx.createBiquadFilter(), corpo = ctx.createGain(), invio = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    uscita.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 5200; invio.gain.value = 0.7;
    corpo.connect(uscita); uscita.connect(lp); lp.connect(pan); pan.connect(master); pan.connect(invio); invio.connect(bus());
    const t0 = ctx.currentTime + 0.03;
    let prossimo = tipo === 'pianto' ? t0 + rnd() * 0.4 : t0, via = false, detti = 0;
    const VOL = tipo === 'pianto' ? 0.32 : 0.42;
    return {
      imposta: function (v, p) {
        if (via) return;
        const ora = ctx.currentTime, vq = Math.round(v * 40) / 40, pq = Math.round(p * 40) / 40;
        if (vq !== this.vq) { this.vq = vq; uscita.gain.setTargetAtTime(VOL * vq, ora, 0.08); }     // solo se cambia
        if (pan.pan && pq !== this.pq) { this.pq = pq; pan.pan.setTargetAtTime(pq, ora, 0.1); }
        if (ora + 0.05 >= prossimo) {
          if (tipo === 'pianto') prossimo = ora + 0.05 + singhiozzo(corpo, ora + 0.05, (f || 400) + rnd() * (f ? 25 : 50), rnd) + 0.25 + rnd() * 0.7;
          else if (detti < 1) { hello(corpo, ora + 0.05, posa); detti++; prossimo = Infinity; }      // una volta sola
        }
      },
      svanisci: function (sec) {
        if (via) return; via = true;
        const ora = ctx.currentTime;
        uscita.gain.cancelScheduledValues(ora); uscita.gain.setTargetAtTime(0, ora, sec / 3);
        lp.frequency.setTargetAtTime(260, ora, sec / 2.5);
      },
      ferma: function () {
        via = true; const ora = ctx.currentTime;
        uscita.gain.cancelScheduledValues(ora); uscita.gain.setTargetAtTime(0, ora, 0.03);
      }
    };
  }
  // ---- MUSICA DEL FINALE: un carillon malinconico (la minore, con il sol diesis che fa male), ma qualcosa non va:
  // il nastro ondeggia di intonazione, ogni tanto una nota è stonata di un quarto di tono o raddoppiata appena
  // sbagliata, e sotto c'è un bordone con un tritono che batte. musica.passo() a ogni fotogramma programma le note
  // del secondo successivo (niente timer). musica.data(): dopo la data cambia (più cupa, più lenta);
  // musica.spegni(sec): il carillon si scarica (rallenta e cala di tono) e sfuma.
  function musicaFinale() {
    if (!ctx) return null;
    const out = ctx.createGain(), lp = ctx.createBiquadFilter(), invio = ctx.createGain();
    out.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 3800; invio.gain.value = 0.5;
    out.connect(lp); lp.connect(master); lp.connect(invio); invio.connect(bus());
    const t0 = ctx.currentTime + 0.1;
    out.gain.setValueAtTime(0.0001, t0); out.gain.linearRampToValueAtTime(0.55, t0 + 3);
    const LA = 220, st = function (n) { return LA * Math.pow(2, n / 12); };
    // accordi (semitoni da la3): la minore, fa maggiore, do maggiore, mi maggiore (con il sol#)
    const ACC = [[0, 3, 7, 12], [-4, 0, 3, 8], [3, 7, 10, 15], [-5, -1, 2, 7]];
    const MEL = [[12, 15, 14, 12], [12, 8, 7, 8], [10, 12, 15, 14], [11, 7, 8, 11]];   // una nota per mezza battuta
    let battuta = 0, nota8 = 0, prossima = t0, bpm = 64, dopoData = false, spenta = false, scala = 1;
    const rnd = Math.random;
    // bordone: la grave e re# (tritono) che battono piano
    const bord = [onda("sine", t0, 1800), onda("sine", t0, 1800), onda("triangle", t0, 1800)], gb = ctx.createGain();
    bord[0].frequency.value = 55; bord[1].frequency.value = 77.8 * 1.004; bord[2].frequency.value = 110.6;
    bord.forEach(function (o) { o.connect(gb); }); gb.gain.value = 0; gb.connect(out);
    gb.gain.setValueAtTime(0.0001, t0); gb.gain.linearRampToValueAtTime(0.12, t0 + 6);
    function carillon(f, t, vol, dur) {
      const o = onda('triangle', t, dur + 0.05), o2 = onda('sine', t, dur + 0.05), g = ctx.createGain(), g2 = ctx.createGain();
      // il nastro: intonazione che ondeggia lenta (e scende quando il carillon si scarica)
      const ond = 1 + 0.012 * Math.sin(t * 0.7) + 0.006 * Math.sin(t * 2.3);
      o.frequency.value = f * ond * scala; o2.frequency.value = f * 2.01 * ond * scala;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.4);
      o.connect(g); o2.connect(g2); g.connect(out); g2.connect(out);
    }
    function passo() {
      if (spenta && scala < 0.5) return;
      const ora = ctx.currentTime;
      while (prossima < ora + 1.0) {
        const t = prossima, acc = ACC[battuta % 4], dur8 = 60 / bpm / 2;
        // arpeggio a crome
        let n = acc[[0, 1, 2, 3, 2, 1, 2, 1][nota8]];
        let f = st(n + 12);
        if (rnd() < (dopoData ? 0.16 : 0.08)) f *= Math.pow(2, (rnd() < 0.5 ? 0.5 : -0.5) / 12);    // un quarto di tono sbagliato
        carillon(f, t, 0.09, 1.6);
        if (rnd() < 0.05) carillon(f * Math.pow(2, 1 / 12), t + 0.03, 0.04, 1.0);                     // la stessa nota, un semitono sopra
        // melodia lenta (sopra), ogni mezza battuta
        if (nota8 % 4 === 0) {
          let m = MEL[battuta % 4][nota8 / 4 + (battuta % 2) * 2];
          if (dopoData && nota8 === 4 && rnd() < 0.5) m += 1;                                         // non si risolve
          carillon(st(m + 12), t, 0.075, 2.6);
          if (battuta % 4 === 3 && nota8 === 4) carillon(st(m + 13), t + 0.4, 0.045, 2.2);           // seconda minore che stride
        }
        // un colpo grave sul primo tempo
        if (nota8 === 0) carillon(st(acc[0] - 12), t, 0.06, 2.4);
        prossima += dur8 * (1 + (rnd() - 0.5) * 0.08);                                                 // un tempo che zoppica appena
        if (spenta) { bpm *= 0.93; scala *= 0.985; }
        if (++nota8 === 8) { nota8 = 0; battuta++; }
      }
    }
    return {
      passo: passo,
      data: function () {           // la data: un accordo stonato che resta sospeso, poi tutto più lento e cupo
        dopoData = true; bpm = 52; lp.frequency.setTargetAtTime(2200, ctx.currentTime, 1);
        const t = ctx.currentTime + 0.05;
        [0, 6, 11, 13].forEach(function (n) { carillon(st(n), t, 0.07, 4.5); carillon(st(n + 12) * 1.003, t + 0.02, 0.04, 4); });
        gb.gain.setTargetAtTime(0.2, t, 1.5);
      },
      spegni: function (sec) {
        spenta = true; const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + sec);
        gb.gain.setTargetAtTime(0, t, sec / 3);
        bord.forEach(function (o) { o.frequency.setTargetAtTime(o.frequency.value * 0.8, t, sec); });
      },
      ferma: function () { spenta = true; scala = 0; const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.05); bord.forEach(function (o) { try { o.stop(t + 0.3); } catch (e) {} }); }
    };
  }
  // ---- PARANOIA: suoni SINTETICI (rumore filtrato e onde: non sono voci registrate) con il punto per usare file veri ----
  // Ogni suono passa per un panner stereo (da che parte arriva), un filtro (lontano = più cupo, "da dietro" = ovattato)
  // e l'eco comune. Le sorgenti attive sono tenute in un elenco: zittisciParanoia() le spegne tutte (morte, riavvio).
  const attiviP = [], campioni = {};
  function catenaP(pan, vol, cupo) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), invio = ctx.createGain();
    g.gain.value = vol; lp.type = 'lowpass'; lp.frequency.value = cupo ? 900 : 5000; invio.gain.value = cupo ? 0.9 : 0.5;
    if (p.pan) p.pan.value = Math.max(-1, Math.min(1, pan || 0));
    g.connect(lp); lp.connect(p); p.connect(master); p.connect(invio); invio.connect(bus());
    const voce = { g: g, fine: 0 }; attiviP.push(voce);
    return voce;
  }
  function pulisciP() { const ora = ctx.currentTime; for (let i = attiviP.length - 1; i >= 0; i--) if (attiviP[i].fine < ora) attiviP.splice(i, 1); }
  // un file vero (se configurato): caricato una volta e poi riusato
  function campione(url, pan, vol, cupo) {
    if (!ctx || !url) return false;
    const c = campioni[url];
    if (c === undefined) {
      campioni[url] = null;
      try { fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return ctx.decodeAudioData(b); }).then(function (buf) { campioni[url] = buf; }).catch(function () { campioni[url] = false; }); } catch (e) { campioni[url] = false; }
      return false;
    }
    if (!c) return false;
    const s = ctx.createBufferSource(), v = catenaP(pan, vol, cupo); s.buffer = c; s.connect(v.g); s.start(); v.fine = ctx.currentTime + c.duration + 0.1;
    return true;
  }
  function daFile(tipo) { const L = (PZ.CONFIG.audio.paranoia || {})[tipo]; return L && L.length ? L[Math.floor(Math.random() * L.length)] : null; }
  // L'URLO del fantasma (sintetico): una voce di ragazza che strilla. Due onde a dente di sega un po' stonate fra loro
  // (la voce che si spezza) che salgono di colpo verso i 1200 Hz, tremano e poi crollano; distorte un poco e passate
  // per i formanti di una "A" aperta, con un soffio rauco sopra. Va dritto all'uscita (non passa dal volume generale
  // che il jumpscare abbassa subito dopo), forte, e lascia una coda nell'eco.
  function urlo() {
    const t = ctx.currentTime + 0.005, D = 1.15;
    const uscita = ctx.createGain(); uscita.gain.value = 2.4 * PZ.CONFIG.audio.volume; uscita.connect(limite);   // (fase 65) +50%
    attiviP.push({ g: uscita, fine: t + D + 0.2 });                         // così la morte e RIPROVA lo zittiscono
    const invio = ctx.createGain(); invio.gain.value = 0.5; uscita.connect(invio); invio.connect(bus());
    const voce = ctx.createGain(); inviluppo(voce.gain, t, [[0.025, 1], [0.18, 0.85], [D - 0.3, 0.75], [D, 0]]);
    const dist = ctx.createWaveShaper(), curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curva[i] = Math.tanh(2.6 * x); }
    dist.curve = curva;
    [[1, 0.5], [1.013, 0.35], [0.497, 0.18]].forEach(function (o) {       // due voci quasi uguali + un'ottava sotto, ruvida
      const w = onda('sawtooth', t, D + 0.05), f = w.frequency;
      f.setValueAtTime(620 * o[0], t); f.exponentialRampToValueAtTime(1180 * o[0], t + 0.09);
      f.linearRampToValueAtTime(1260 * o[0], t + 0.45); f.linearRampToValueAtTime(1150 * o[0], t + D - 0.3); f.exponentialRampToValueAtTime(700 * o[0], t + D);
      const vib = onda('sine', t, D + 0.05), vg = ctx.createGain(); vib.frequency.value = 7.5 + Math.random(); vg.gain.value = 38 * o[0];
      vib.connect(vg); vg.connect(f);                                           // il tremito della voce
      const g = ctx.createGain(); g.gain.value = o[1]; w.connect(g); g.connect(dist);
    });
    const sf = soffioLungo(t, D + 0.05), hp = ctx.createBiquadFilter(), sg = ctx.createGain();
    hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.8; sg.gain.value = 0.55; sf.connect(hp); hp.connect(sg); sg.connect(dist);
    dist.connect(voce);
    formanti(voce, uscita, t, [[0, 900, 1450, 2850], [0.3, 1050, 1600, 3000], [D, 850, 1350, 2700]], 1.4);
    const brillo = ctx.createBiquadFilter(), bg = ctx.createGain(); brillo.type = 'highpass'; brillo.frequency.value = 2500; bg.gain.value = 0.18;
    voce.connect(brillo); brillo.connect(bg); bg.connect(uscita);
  }
  const paranoia = {
    // bisbiglio: sillabe sussurrate (rumore passato per filtri che si spostano come le consonanti e le vocali)
    bisbiglio: function (pan, vol, cupo) {
      if (!ctx) return; pulisciP();
      if (attiviP.length > 5) return;                       // mai troppi insieme
      if (campione(daFile('bisbigli'), pan, vol, cupo)) return;
      const v = catenaP(pan, vol, cupo), t = ctx.currentTime + 0.02;
      const n = 3 + Math.floor(Math.random() * 5);
      let u = t;
      for (let i = 0; i < n; i++) {
        const d = 0.08 + Math.random() * 0.16, s = soffioLungo(u, d + 0.05), b = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain();
        const sib = Math.random() < 0.35;                     // "s", "sc": sibilanti acute; altrimenti vocali sussurrate
        b.type = 'bandpass'; b.Q.value = sib ? 2 : 7; b2.type = 'bandpass'; b2.Q.value = 9;
        const f1 = sib ? 5200 + Math.random() * 2500 : 500 + Math.random() * 400, f2 = sib ? 7000 : 1100 + Math.random() * 900;
        b.frequency.setValueAtTime(f1, u); b.frequency.linearRampToValueAtTime(f1 * (0.8 + Math.random() * 0.4), u + d);
        b2.frequency.setValueAtTime(f2, u); b2.frequency.linearRampToValueAtTime(f2 * (0.85 + Math.random() * 0.3), u + d);
        s.connect(b); s.connect(b2); b.connect(g); b2.connect(g); g.connect(v.g);
        inviluppo(g.gain, u, [[d * 0.25, sib ? 0.6 : 1.4], [d * 0.7, sib ? 0.4 : 1.0], [d, 0]]);
        u += d + (Math.random() < 0.25 ? 0.12 + Math.random() * 0.2 : 0.02);
      }
      v.fine = u + 0.6;
    },
    // un respiro lento e vicino (di solito "da dietro": ovattato)
    respiro: function (pan, vol, cupo) {
      if (!ctx) return; pulisciP();
      if (campione(daFile('respiri'), pan, vol, cupo)) return;
      const v = catenaP(pan, vol, cupo), t = ctx.currentTime + 0.02;
      [[0, 0.9, 700, 1400], [1.05, 1.2, 1100, 500]].forEach(function (r) {           // dentro, fuori
        const s = soffioLungo(t + r[0], r[1] + 0.05), b = ctx.createBiquadFilter(), g = ctx.createGain();
        b.type = 'bandpass'; b.Q.value = 1.6; b.frequency.setValueAtTime(r[2], t + r[0]); b.frequency.linearRampToValueAtTime(r[3], t + r[0] + r[1]);
        s.connect(b); b.connect(g); g.connect(v.g); inviluppo(g.gain, t + r[0], [[r[1] * 0.4, 1.2], [r[1], 0]]);
      });
      v.fine = t + 2.6;
    },
    // una risatina corta che rallenta e cala di tono (onda + formanti "e")
    risata: function (pan, vol) {
      if (!ctx) return; pulisciP();
      if (campione(daFile('risate'), pan, vol, true)) return;
      const v = catenaP(pan, vol, true), t = ctx.currentTime + 0.02;
      let u = t;
      for (let i = 0; i < 4; i++) {
        const d = 0.09 + i * 0.03, o = onda('sawtooth', u, d + 0.05), g = ctx.createGain(), f = 560 * Math.pow(0.86, i);
        o.frequency.setValueAtTime(f, u); o.frequency.linearRampToValueAtTime(f * 0.8, u + d);
        o.connect(g); inviluppo(g.gain, u, [[0.01, 0.8], [d, 0]]);
        formanti(g, v.g, u, [[0, 520, 1900, 2600], [d, 450, 1700, 2500]], 1.6);
        u += d + 0.05 + i * 0.03;
      }
      v.fine = u + 0.5;
    },
    // il jumpscare: uno strappo acuto, un colpo grave, poi per un attimo il mondo sonoro si abbassa
    jumpscare: function () {
      if (!ctx) return;
      if (!campione(PZ.CONFIG.audio.paranoia && PZ.CONFIG.audio.paranoia.jumpscare, 0, 0.9, false)) {
        urlo();
        nota(48, 0.7, 'sine', 0.45, 0, 0.6); nota(97, 0.4, 'square', 0.06, 0, 0.5);   // il colpo grave sotto
      }
      if (colonna.abbassa) colonna.abbassa(0.25, 1.1);                  // (fase 65) la colonna si scansa: l'urlo spicca
      // dopo l'urlo, per un attimo, tutti gli altri suoni si abbassano (l'urlo non passa di qui: non viene abbassato)
      const t = ctx.currentTime, g = master.gain, v = PZ.CONFIG.audio.volume;
      g.cancelScheduledValues(t); g.setValueAtTime(v, t); g.linearRampToValueAtTime(v * 0.3, t + 0.08); g.setValueAtTime(v * 0.3, t + 1.1); g.linearRampToValueAtTime(v, t + 2.2);
    },
    // il bordone grave della paranoia (continuo, un solo suono: cambia solo il volume). k da 0 a 1
    bordone: function (k) {
      if (!ctx) return;
      if (!bordoneP) {
        const g = ctx.createGain(), lp = ctx.createBiquadFilter(); g.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 220;
        const a = onda('sine', ctx.currentTime, 1e6), b = onda('sine', ctx.currentTime, 1e6), r = soffioLungo(ctx.currentTime, 1e6);
        a.frequency.value = 41; b.frequency.value = 43.7; a.connect(g); b.connect(g); r.connect(lp); const gr = ctx.createGain(); gr.gain.value = 0.35; lp.connect(gr); gr.connect(g);
        g.connect(master); bordoneP = g;
      }
      const kk = Math.round(Math.max(0, Math.min(1, k)) * 50) / 50;
      if (bordoneP.k === kk) return; bordoneP.k = kk;
      bordoneP.gain.setTargetAtTime(0.16 * kk, ctx.currentTime, 0.4);
    },
    // morte, riavvio, finale: tutto sfuma subito
    zittisci: function () {
      if (!ctx) return; const t = ctx.currentTime;
      attiviP.forEach(function (v) { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.08); v.fine = 0; });
      attiviP.length = 0;
      if (bordoneP) { bordoneP.gain.setTargetAtTime(0, t, 0.2); bordoneP.k = 0; }
      master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(PZ.CONFIG.audio.volume, t, 0.05);
    },
    attivi: function () { if (ctx) pulisciP(); return attiviP.length; }
  };
  let bordoneP = null;
  // il filtro "ovattato" su tutto ha due cause: i sensi di colpa e l'orologio daliniano; vince la più forte
  let ovattaColpa = 0, ovattaTempo = 0;
  function applicaOvatta() {
    if (!ovatta) return;
    const k = Math.round(Math.max(0, Math.min(1, Math.max(ovattaColpa, ovattaTempo))) * 50) / 50;
    if (k === applicaOvatta.k) return; applicaOvatta.k = k;
    ovatta.frequency.setTargetAtTime(20000 * Math.pow(900 / 20000, k), ctx.currentTime, 0.12);
  }
  // quando la scheda del browser non è visibile l'audio si ferma (e riparte quando si torna)
  // (fase 41) PAUSA: sospendi(true) ferma tutto l'audio (musica compresa) finché non si continua
  let sospeso = false;
  PZ.audioSospendi = function (si) { sospeso = !!si; if (!ctx) return; if (sospeso) ctx.suspend(); else if (!document.hidden) ctx.resume(); };
  document.addEventListener('visibilitychange', function () { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (!sospeso) ctx.resume(); });
  const eventi = {
    // BLACKOUT: scatto dei relè, la corrente che muore (un ronzio che crolla), un tonfo
    blackout: function () {
      [0, 0.07, 0.16].forEach(function (q) { nota(1400 - q * 2000, 0.025, 'square', 0.05, q); });
      nota(120, 0.9, 'sawtooth', 0.09, 0.02, 0.18); nota(60, 0.9, 'square', 0.05, 0.02, 0.3);
      soffio(4000, 300, 0.45, 0.18, 0.02); nota(42, 0.7, 'sine', 0.4, 0.1, 0.7);
    },
    // (fase 32) SCOSSA ELETTRICA: schiocco secco, ronzio che frigge (rete a 50 Hz e armoniche) e crepitio di scintille.
    // forte: la prima, quando parte il blackout; le altre più brevi, a ogni scatto delle luci che si spengono
    scossa: function (forte) {
      if (!ctx) return;
      const k = forte ? 1 : 0.6, d = forte ? 0.32 : 0.14;
      soffio(7000, 2500, 0.03, 0.5 * k);                                           // lo schiocco
      nota(100, d, 'sawtooth', 0.11 * k, 0, 0.9); nota(150, d, 'square', 0.07 * k, 0, 0.92); nota(50, d * 1.2, 'square', 0.09 * k, 0, 0.95);
      soffio(4500, 1800, d, 0.22 * k, 0.01);                                       // frigge
      const n = forte ? 7 : 3; for (let i = 0; i < n; i++) soffio(5000 + Math.random() * 4000, 2000, 0.02, 0.2 * k, 0.02 + Math.random() * d);   // scintille
    },
    // la luce torna: ronzio dei neon che si riaccendono a scatti
    luceTorna: function () {
      [0, 0.22, 0.38].forEach(function (q, i) { nota(100, 0.12 + i * 0.05, 'square', 0.03, q); nota(200, 0.12 + i * 0.05, 'sawtooth', 0.015, q); });
      nota(100, 1.3, 'sine', 0.03, 0.5);
    },
    // SENSI DI COLPA: un singhiozzo del ragazzo, un fischio nelle orecchie, il cuore
    colpa: function () {
      if (!ctx) return;
      const g = ctx.createGain(); g.gain.value = 0.9; g.connect(master);
      singhiozzo(g, ctx.currentTime + 0.05, 150, Math.random);
      nota(3600, 2.4, 'sine', 0.018, 0.1); nota(58, 0.14, 'sine', 0.35, 0.3, 0.7); nota(52, 0.16, 'sine', 0.28, 0.5, 0.7);
    },
    // k da 0 (normale) a 1 (tutto ovattato)
    ovatta: function (k) { ovattaColpa = k; applicaOvatta(); colonna.sensiDiColpa(k / 0.5); },
    // (fase 59) SENSI DI COLPA: accordi di pianoforte in Sol maggiore sopra la colonna (che intanto è ovattata)
    pianoColpa: function (durata) { pianoColpa(durata); }, pianoFerma: function () { pianoFerma(); }
  };

  // ---- (fase 59c) IL PIANOFORTE DEI SENSI DI COLPA, FUSO CON LA BASE ----
  // La colonna (analizzata battuta per battuta) gira su due battute: le battute PARI sono un Do maj7 (Do Mi Sol), le
  // DISPARI un Mi minore con Fa# e La (Mi minore 9 / 11). Il pianoforte suona in ogni momento lo STESSO accordo della
  // base: sul primo battito di ogni battuta l'accordo pieno, arpeggiato piano dal basso; sul terzo battito solo le due
  // note in alto, più piano. Così non è una musica sopra: è la base che si apre e lascia sentire un pianoforte.
  // Fusione: entra nello STESSO filtro della colonna (quando i sensi di colpa la ovattano, ovatta un po' anche lui),
  // segue il rallentamento a nastro (stessa velocità: più lento e più grave) e "respira" con la cassa: su ogni battito
  // si abbassa un attimo e risale (come un compressore legato alla cassa).
  const ACCORDI_BASE = [
    [36, 48, 55, 59, 64, 67],   // battute pari: Do maj7 (Do - Sol - Si - Mi - Sol)
    [40, 52, 59, 62, 66, 67]    // battute dispari: Mi minore 9 (Mi - Si - Re - Fa# - Sol): il Fa# stretto contro il Sol
  ];
  let pianoBus = null, pianoRiv = null, pianoNote = [], pianoLivello = 0;
  function pianoPrepara() {
    if (pianoBus) return;
    pianoBus = ctx.createGain(); pianoBus.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    pianoRiv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4), imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4); }
    pianoRiv.buffer = imp;
    const secco = ctx.createGain(); secco.gain.value = 0.75; const bagnato = ctx.createGain(); bagnato.gain.value = 0.5;
    pianoBus.connect(lp); lp.connect(secco); lp.connect(pianoRiv); pianoRiv.connect(bagnato);
    const dove = colonna.ingresso ? colonna.ingresso() : null;          // il filtro della colonna (se c'è)
    secco.connect(dove || limite); bagnato.connect(dove || limite);
  }
  function pianoNota(midi, t, forza, lunga, r) {
    const f = 440 * Math.pow(2, (midi - 69) / 12) * (r || 1);           // a nastro: più grave come la base
    [[1, 1, 1], [2, 0.38, 0.7], [3, 0.13, 0.5], [4, 0.05, 0.35]].forEach(function (a) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = a[0] === 1 ? 'triangle' : 'sine'; o.frequency.value = f * a[0] * (1 + 0.0007 * a[0] * a[0]); o.detune.value = (Math.random() - 0.5) * 5;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(forza * a[1], t + 0.008);
      g.gain.setTargetAtTime(forza * a[1] * 0.35, t + 0.008, 0.3 * a[2]);
      g.gain.setTargetAtTime(0, t + 0.6, lunga * a[2] * (midi < 50 ? 1.3 : 1));
      o.connect(g); g.connect(pianoBus); o.start(t); o.stop(t + 0.6 + lunga * 6);
      pianoNote.push(o);
    });
  }
  function pianoColpa(durata) {
    if (!ctx) return;
    pianoPrepara();
    const BATTITO = 60 / ((PZ.CONFIG.audio.colonna && PZ.CONFIG.audio.colonna.bpm) || 75);
    const ora = ctx.currentTime, attiva = colonna.attiva() && colonna.battiti, b = attiva ? colonna.battiti() : -1;
    const r = colonna.rate ? Math.max(0.3, colonna.rate()) : 1, sec = BATTITO / r;    // secondi veri per battito
    pianoLivello = 0.2 * (PZ.CONFIG.audio.volume || 0.8) / 0.8;
    pianoBus.gain.cancelScheduledValues(ora); pianoBus.gain.setTargetAtTime(pianoLivello, ora, 0.08);
    const fine = ora + (durata || 4) + 0.3;
    let n0 = b >= 0 ? Math.ceil(b + 0.02) : 0, t0 = b >= 0 ? ora + (n0 - b) * sec : ora + 0.05;
    // senza musica (prove, o la base non è partita): l'accordo pieno subito, poi come se fossimo in battuta
    let primo = true;
    for (let n = n0, t = t0; t < fine; n++, t += sec) {
      const battuta = Math.floor(n / 4), nel = ((n % 4) + 4) % 4, acc = ACCORDI_BASE[((battuta % 2) + 2) % 2];
      // la cassa: sul battito il pianoforte si abbassa un attimo e risale
      pianoBus.gain.setTargetAtTime(pianoLivello * 0.55, t - 0.005, 0.01); pianoBus.gain.setTargetAtTime(pianoLivello, t + 0.05, 0.16);
      if (nel === 0 || primo) {
        acc.forEach(function (m, j) { pianoNota(m, t + j * (0.07 + Math.random() * 0.03), j === 0 ? 0.36 : 0.28 - 0.02 * j, 1.4, r); });
        primo = false;
      } else if (nel === 2) {
        acc.slice(-2).forEach(function (m, j) { pianoNota(m, t + j * 0.09, 0.16, 1.0, r); });
      }
    }
  }
  function pianoFerma() {
    if (!pianoBus) return;
    const t = ctx.currentTime;
    pianoBus.gain.cancelScheduledValues(t); pianoBus.gain.setTargetAtTime(0, t, 0.5);
    pianoNote.forEach(function (o) { try { o.stop(t + 2.5); } catch (e) {} }); pianoNote = [];
  }

  // ---- (fase 28) COLONNA SONORA DELLA CORSA: "AMBRA e OCCHI ADDOSSO" (versione videogioco) di Genos ----
  // Il file (PZ.CONFIG.audio.colonna.file) parte da 3:52 della canzone: attacca quando il ragazzo apre la porta, poi
  // gira in un loop perfetto da 4:02.290 a 7:27.090 (esattamente 64 battute a 75 BPM: la canzone si ferma di colpo su
  // quel battere e il loop rientra sul colpo di 4:02.290). Il loop lo fa la scheda audio (AudioBufferSourceNode con
  // loopStart/loopEnd): nessun salto udibile. Catena: sorgente -> volume -> passa-basso (sensi di colpa: come
  // sott'acqua; morte: ovattata) -> glitch (blackout: il segnale salta) -> uscita.
  // colonna.colpo() dà il battito (da 0 a 1, un colpo che decade): lampioni, insegne e frammenti pulsano a tempo.
  const colonna = (function () {
    const C = function () { return PZ.CONFIG.audio.colonna || {}; };
    let buf = null, el = null, carica = false, src = null, gVol = null, lp = null, gGl = null, nodi = false;
    let attiva = false, tPartenza = 0, offPartenza = 0, attesa = null, morto = false, duck = 1, lpColpa = 0;
    let prossimoGlitch = 0;
    function prepara() {
      if (nodi || !ctx) return;
      nodi = true;
      gVol = ctx.createGain(); gVol.gain.value = 0;
      lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.7;
      gGl = ctx.createGain(); gGl.gain.value = 1;
      gVol.connect(lp); lp.connect(gGl); gGl.connect(limite);
    }
    function caricaFile() {
      const url = C().file;
      if (!url || carica || !ctx) return;
      carica = true; prepara();
      const riserva = function () {      // pagina aperta come file dal computer: un <audio> (il loop non è perfetto)
        try {
          el = new Audio(url); el.preload = 'auto';
          el.addEventListener('timeupdate', function () { if (el.currentTime >= C().loopA) el.currentTime = C().loopDa + (el.currentTime - C().loopA); });
          el.addEventListener('ended', function () { el.currentTime = C().loopDa; el.play(); });
          if (attesa !== null) parti(attesa);
        } catch (e) { el = null; }
      };
      if (location.protocol === 'file:') { riserva(); return; }
      try {
        fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, ko) { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); }); })
          .then(function (b) {
            buf = b;
            if (attesa !== null) {                         // la corsa era già partita: si entra al punto giusto
              const off = attesa + (ctx.currentTime - tPartenza); attesa = null; parti(off);
            }
          }).catch(riserva);
      } catch (e) { riserva(); }
    }
    function volume() { return PZ.CONFIG.audio.volume * (C().volume == null ? 1 : C().volume); }
    function fermaSorgente() {
      if (src) { try { src.stop(); } catch (e) {} src.disconnect(); src = null; }
      if (el) { try { el.pause(); } catch (e) {} }
    }
    function parti(off) {
      fermaSorgente();
      if (buf) {
        src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = C().loopDa; src.loopEnd = C().loopA;
        src.playbackRate.value = rate; src.connect(gVol); src.start(ctx.currentTime, Math.min(off, C().loopA - 0.01));
      } else if (el) {
        try { el.playbackRate = rate; el.currentTime = off; el.volume = Math.min(1, volume()); const p = el.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      } else { attesa = off; }
      tPartenza = ctx.currentTime; offPartenza = off;
    }
    // avvia(off): parte da quel secondo del file (0 = 3:52, la porta; C().loopDa = 4:02.290, RIPROVA e arcade)
    // (fase 37) secco = true: niente dissolvenza d'ingresso, così il primo colpo (il kick a 4:02.290) arriva pieno
    function avvia(off, secco) {
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      prepara(); caricaFile();
      attiva = true; morto = false; duck = 1; attesa = null; inPausa = -1; rate = 1;
      gVol.gain.cancelScheduledValues(ctx.currentTime);
      if (secco) gVol.gain.setValueAtTime(volume(), ctx.currentTime);
      else { gVol.gain.setValueAtTime(0.0001, ctx.currentTime); gVol.gain.linearRampToValueAtTime(volume(), ctx.currentTime + 0.08); }
      parti(off || 0);
      if (!buf && !el) { attesa = off || 0; tPartenza = ctx.currentTime; }
      filtro();
    }
    // ferma(sec): sfuma e si ferma (la scogliera)
    function ferma(sec) {
      if (!attiva || !ctx) return;
      attiva = false; attesa = null; inPausa = -1;
      const t = ctx.currentTime, d = sec || 1;
      gVol.gain.cancelScheduledValues(t); gVol.gain.setValueAtTime(gVol.gain.value, t); gVol.gain.linearRampToValueAtTime(0.0001, t + d);
      const s = src, e = el; src = null;
      setTimeout(function () { if (s) { try { s.stop(); } catch (x) {} } if (e && !attiva) { try { e.pause(); } catch (x) {} } }, d * 1000 + 100);
      if (e) { const v0 = e.volume, t0 = performance.now(); const f = function () { const k = Math.min(1, (performance.now() - t0) / (d * 1000)); e.volume = v0 * (1 - k); if (k < 1 && !attiva) requestAnimationFrame(f); }; requestAnimationFrame(f); }
    }
    // (fase 31) pausa/riprendi: durante la O Ave Maria la colonna si ferma e poi riparte da dove era
    let inPausa = -1;
    function pausa() {
      if (!attiva || !ctx || inPausa >= 0) return;
      inPausa = posizione();
      const t = ctx.currentTime; gVol.gain.cancelScheduledValues(t); gVol.gain.setValueAtTime(gVol.gain.value, t); gVol.gain.linearRampToValueAtTime(0.0001, t + 0.12);
      const s = src, e = el; src = null; setTimeout(function () { if (s) { try { s.stop(); } catch (x) {} } if (e && inPausa >= 0) { try { e.pause(); } catch (x) {} } }, 150);
    }
    function riprendi(sec) {
      if (inPausa < 0 || !attiva || !ctx) { inPausa = -1; return; }
      const p = inPausa; inPausa = -1;
      parti(p);
      const t = ctx.currentTime; gVol.gain.cancelScheduledValues(t); gVol.gain.setValueAtTime(0.0001, t);
      gVol.gain.linearRampToValueAtTime(volume() * (morto ? 0.35 : 1), t + (sec || 0.6));
    }
    // dove siamo nel file (in secondi), tenendo conto del loop
    function posizione() {
      if (!attiva || !ctx) return -1;
      if (inPausa >= 0) return inPausa;
      if (el && !buf) return el.currentTime;
      const c = C(); let p = offPartenza + (ctx.currentTime - tPartenza) * rate;
      if (p >= c.loopA) p = c.loopDa + (p - c.loopDa) % (c.loopA - c.loopDa);
      return p;
    }
    // (fase 51) OROLOGIO DALINIANO: la musica rallenta come un nastro (r < 1: più lenta e più grave). Si ancora la
    // posizione a ogni cambio, così battiti e luci a tempo seguono la musica rallentata
    let rate = 1;
    function velocita(r) {
      r = Math.max(0.25, Math.min(1, r)); if (Math.abs(r - rate) < 0.002 && r !== 1) return; if (r === rate) return;
      if (attiva && ctx && inPausa < 0 && !(el && !buf)) { const p = posizione(); offPartenza = p; tPartenza = ctx.currentTime; }
      rate = r;
      if (src) { try { src.playbackRate.setValueAtTime(r, ctx.currentTime); } catch (e) {} }
      else if (el) { try { el.preservesPitch = false; el.mozPreservesPitch = false; el.webkitPreservesPitch = false; el.playbackRate = r; } catch (e) {} }
    }
    // il battito: 1 sul colpo, poi decade; i primi tempi della battuta (ogni 4) più forti
    function colpo() {
      if (inPausa >= 0) return 0;
      const p = posizione(); if (p < 0 || morto) return 0;
      const c = C(), P = 60 / (c.bpm || 75), u = (p - (c.battito0 || 0)) / P, n = Math.floor(u), f = (u - n) * P;
      return Math.exp(-f / 0.14) * (((n % 4) + 4) % 4 === 0 ? 1 : 0.6);
    }
    // (fase 34) dove siamo nei battiti: 3.25 = un quarto dopo il quarto colpo. -1 se la musica non va
    function battiti() {
      if (inPausa >= 0 || morto) return -1;
      const p = posizione(); if (p < 0) return -1;
      const c = C(); return (p - (c.battito0 || 0)) / (60 / (c.bpm || 75));
    }
    // filtro: sensi di colpa (k da 0 a 1) e morte
    function filtro() {
      if (!lp) return;
      // (fase 59c) i sensi di colpa ovattano meno di prima (fino a 1.300 Hz invece di 320); la morte come prima
      const f = morto ? 20000 * Math.pow(320 / 20000, Math.max(0.75, lpColpa)) : 20000 * Math.pow(1300 / 20000, lpColpa);
      lp.frequency.setTargetAtTime(f, ctx.currentTime, 0.15);
    }
    function sensiDiColpa(k) { const v = Math.round(Math.max(0, Math.min(1, k)) * 40) / 40; if (v === lpColpa) return; lpColpa = v; filtro(); }
    // morte: ovattata e più bassa; abbassa(k, sec): per un attimo più bassa (lo stinger del demone)
    function morte(si) {
      morto = !!si; if (!gVol) return; filtro();
      const t = ctx.currentTime; gVol.gain.cancelScheduledValues(t); gVol.gain.setTargetAtTime(attiva ? volume() * (morto ? 0.35 : 1) : 0.0001, t, 0.3);
    }
    function abbassa(k, sec) {
      if (!attiva || !gVol) return;
      const t = ctx.currentTime, v = volume() * (morto ? 0.35 : 1);
      gVol.gain.cancelScheduledValues(t); gVol.gain.setTargetAtTime(v * k, t, 0.05); gVol.gain.setTargetAtTime(v, t + (sec || 1), 0.5);
    }
    // ---- BLACKOUT: il segnale salta. Ogni tanto (più spesso quanto più è buio) uno di questi:
    //  - un buco: la musica sparisce per qualche centesimo di secondo
    //  - un inceppamento: lo stesso frammento ripetuto 3-6 volte, come un CD che salta (la musica sotto tace)
    //  - un crepitio: rumore secco ad alta frequenza
    function glitch(buio) {
      const t = ctx.currentTime, r = Math.random();
      if (r < 0.4) {
        const d = 0.04 + Math.random() * 0.12 * (0.5 + buio);
        gGl.gain.setValueAtTime(0, t); gGl.gain.setValueAtTime(1, t + d);
      } else if (r < 0.8 && buf) {
        const len = 0.045 + Math.random() * 0.06, nn = 3 + Math.floor(Math.random() * 4), p = posizione();
        gGl.gain.setValueAtTime(0, t); gGl.gain.setValueAtTime(1, t + len * nn);
        for (let i = 0; i < nn; i++) {
          const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = volume() * (1 - i * 0.08);
          s.connect(g); g.connect(limite); s.start(t + i * len, Math.max(0, p - len), len);
        }
      } else {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = rumore(); f.type = 'highpass'; f.frequency.value = 3000 + Math.random() * 3000;
        g.gain.setValueAtTime(0.18 * buio, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.08);
        s.connect(f); f.connect(g); g.connect(limite); s.start(t, Math.random() * 0.5, 0.15);
      }
    }
    // a ogni fotogramma della corsa: dt, buio (0-1, il blackout). (fase 34) Il glitch nel blackout è tolto: la
    // funzione glitch() resta qui sopra ma non viene più chiamata.
    function aggiorna(dt, buio) { }
    return { pausa: pausa, riprendi: riprendi, inPausa: function () { return inPausa >= 0; }, avvia: avvia, ferma: ferma, morte: morte, abbassa: abbassa, sensiDiColpa: sensiDiColpa, aggiorna: aggiorna, colpo: colpo, battiti: battiti, velocita: velocita,
      posizione: posizione, carica: function () { caricaFile(); }, attiva: function () { return attiva; },
      ingresso: function () { prepara(); return lp; }, rate: function () { return rate; },
      loopDa: function () { return C().loopDa; } };
  })();


  // ---- (fase 36) PEZZIDICARNE NEL FINALE (PZ.CONFIG.audio.finale: il brano da 2:44 alla fine, 23,3 s). Parte quando
  // si arriva sulla scogliera al posto del carillon sintetico. velocita(r): come un nastro (r < 1 = più lento e più
  // grave), così il pezzo copre tutta la scena; restano(): secondi di pezzo ancora da suonare a velocità normale.
  // Se il file non c'è (o il browser non lo carica) suona il carillon sintetico di prima.
  const pezziFinale = (function () {
    let buf = null, el = null, carica = false;
    function caricaFile() {
      const url = PZ.CONFIG.audio.finale; if (!url || carica || !ctx) return; carica = true;
      const riserva = function () { try { el = new Audio(url); el.preload = 'auto'; el.preservesPitch = false; el.mozPreservesPitch = false; el.webkitPreservesPitch = false; } catch (e) { el = null; } };
      if (location.protocol === 'file:') { riserva(); return; }
      try {
        fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, ko) { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); }); })
          .then(function (b) { buf = b; }).catch(riserva);
      } catch (e) { riserva(); }
    }
    function vol() { return PZ.CONFIG.audio.volume * (PZ.CONFIG.audio.volumeFinale == null ? 0.6 : PZ.CONFIG.audio.volumeFinale); }
    function suona() {
      if (!ctx || (!buf && !el)) return null;
      if (ctx.state === 'suspended') ctx.resume();
      let s = null, g = null, pos = 0, rate = 1, tUltimo = ctx.currentTime, fermo = false;
      const durata = buf ? buf.duration : (el.duration || 23.3);
      if (buf) {
        s = ctx.createBufferSource(); g = ctx.createGain(); s.buffer = buf;
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.linearRampToValueAtTime(vol(), ctx.currentTime + 0.4);
        s.connect(g); g.connect(limite); s.start();
      } else { try { el.currentTime = 0; el.playbackRate = 1; el.volume = Math.min(1, vol()); const p = el.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      function avanza() { const t = ctx.currentTime; pos += (t - tUltimo) * rate; tUltimo = t; }
      function chiudi(d) {
        if (fermo) return; fermo = true;
        if (s) { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + d); try { s.stop(t + d + 0.05); } catch (e) {} }
        else if (el) { const e = el, v0 = e.volume, t0 = performance.now(); const f = function () { const k = Math.min(1, (performance.now() - t0) / (d * 1000)); e.volume = v0 * (1 - k); if (k < 1) requestAnimationFrame(f); else e.pause(); }; requestAnimationFrame(f); }
      }
      return {
        passo: function () {},
        velocita: function (r) {
          if (fermo) return; avanza(); rate = r;
          if (s) s.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.05); else if (el) { try { el.playbackRate = r; } catch (e) {} }
        },
        restano: function () { if (el && !s) return Math.max(0, durata - el.currentTime); avanza(); return Math.max(0, durata - pos); },
        velocitaOra: function () { return rate; },
        ferma: function () { chiudi(0.05); },
        spegni: function (sec) { chiudi(sec || 2); }
      };
    }
    return { carica: caricaFile, suona: suona };
  })();

  // ---- (fase 31) IL PEZZO DELLA O AVE MARIA (PZ.CONFIG.audio.aveMaria, da 1:39 del brano): parte quando prendi il
  // power-up e sfuma quando atterri. Caricato appena parte l'audio, come lo stinger.
  const aveMaria = (function () {
    let buf = null, el = null, carica = false, voce = null, tVia = -1;
    function caricaFile() {
      const url = PZ.CONFIG.audio.aveMaria; if (!url || carica || !ctx) return; carica = true;
      const riserva = function () { try { el = new Audio(url); el.preload = 'auto'; } catch (e) { el = null; } };
      if (location.protocol === 'file:') { riserva(); return; }
      try {
        fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, ko) { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); }); })
          .then(function (b) { buf = b; }).catch(riserva);
      } catch (e) { riserva(); }
    }
    function vol() { return PZ.CONFIG.audio.volume * (PZ.CONFIG.audio.volumeAveMaria == null ? 0.5 : PZ.CONFIG.audio.volumeAveMaria); }
    function ferma(sec) {
      const d = sec || 0.05;
      if (voce && ctx) { const g = voce.g.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + d); try { voce.s.stop(t + d + 0.05); } catch (e) {} voce = null; }
      if (el && !el.paused) { const e = el, v0 = e.volume, t0 = performance.now(); const f = function () { const k = Math.min(1, (performance.now() - t0) / (d * 1000)); e.volume = v0 * (1 - k); if (k < 1) requestAnimationFrame(f); else e.pause(); }; requestAnimationFrame(f); }
    }
    function suona() {
      if (!ctx) return; if (ctx.state === 'suspended') ctx.resume();
      ferma(0.05);
      if (buf) {
        const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf;
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.linearRampToValueAtTime(vol(), ctx.currentTime + 0.05);
        s.connect(g); g.connect(limite); s.start(); voce = { s: s, g: g }; tVia = ctx.currentTime;
        s.onended = function () { if (voce && voce.s === s) voce = null; };
      } else if (el) { tVia = -1; try { el.currentTime = 0; el.volume = Math.min(1, vol()); const p = el.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    }
    // secondi dall'inizio del pezzo (per il colpo del basso), -1 se non sta suonando
    function tempo() { if (voce && tVia >= 0) return ctx.currentTime - tVia; if (el && !el.paused) return el.currentTime; return -1; }
    return { carica: caricaFile, suona: suona, ferma: ferma, tempo: tempo };
  })();

  return {
    colonna: colonna,
    aveMaria: aveMaria.suona, fermaAveMaria: aveMaria.ferma, aveMariaTempo: aveMaria.tempo,
    // (fase 37) quanto ritarda l'uscita audio rispetto allo schermo (secondi): serve per far cadere il kick sull'immagine
    latenza: function () { if (!ctx) return 0; const l = (ctx.baseLatency || 0) + (ctx.outputLatency || 0); return Math.max(0, Math.min(0.3, l)); },
    voce: voce, musicaFinale: function () { return pezziFinale.suona() || musicaFinale(); }, musicaCarillonFinale: musicaFinale, paranoia: paranoia,
    // OROLOGIO DALINIANO, appena lo tocchi: un ticchettio rapidissimo AL CONTRARIO (ogni tic cresce dal nulla e si tronca di colpo, come un
    // nastro che gira all'indietro, e i tic si fanno sempre più fitti), sopra un soffio che sale al contrario; alla
    // fine un colpo metallico profondo e una campana che scivola giù di tono (il tempo che cola).
    orologio: function () {
      if (!ctx) return;
      const t0 = ctx.currentTime + 0.01, N = 22, D = 0.62;
      let u = 0;
      for (let i = 0; i < N; i++) {
        const passo = (D / N) * (1.7 - 1.4 * i / N);                     // sempre più fitti
        ticRovescio(t0 + u, 0.045 + 0.02 * (1 - i / N), 0.05 + 0.08 * i / N, i % 2 ? 2900 : 2300);
        u += passo;
      }
      // il soffio "risucchiato" (rumore che cresce e si tronca)
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = rumore(); f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(6000, t0 + u);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + u); g.gain.linearRampToValueAtTime(0.0001, t0 + u + 0.015);
      s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + u + 0.05);
      // il colpo metallico profondo (parziali non armoniche, come una lastra) e la campana che cola
      const q = u + 0.02;
      [[73, 0.32, 2.4], [191, 0.12, 1.6], [278, 0.08, 1.2], [413, 0.05, 0.9]].forEach(function (p) { nota(p[0], p[2], 'sine', p[1], q, 0.82); });
      soffio(1800, 120, 0.5, 0.12, q);
      nota(1568, 1.6, 'sine', 0.07, q + 0.05, 0.5); nota(523, 1.8, 'sine', 0.06, q + 0.08, 0.6);
    },
    // mentre il tempo è sciolto: un tic-tac lento, grave, stirato
    tic: function (lento) { nota(700 + 900 * (lento || 1), 0.05, 'square', 0.03, 0, 0.7); nota(120, 0.12, 'sine', 0.06, 0, 0.8); },
    // il tempo sciolto attutisce i suoni (k da 0 a 1)
    tempoOvatta: function (k) { ovattaTempo = k; applicaOvatta(); },
    // 100 FRAMMENTI: una fanfara breve e luminosa (arpeggio maggiore che sale, accordo pieno) che però si chiude
    // scivolando appena giù, con un battito grave stonato sotto: vittoria, ma qualcosa non va
    vittoria: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { nota(f, 0.5, 'triangle', 0.11, i * 0.075); nota(f * 2, 0.25, 'square', 0.025, i * 0.075); });
      [523, 659, 784, 1046].forEach(function (f) { nota(f, 1.9, 'triangle', 0.075, 0.42, 0.94); nota(f * 1.006, 1.9, 'sine', 0.05, 0.42, 0.93); });
      nota(65, 1.6, 'sawtooth', 0.06, 0.42, 0.97); nota(92.5, 1.6, 'sine', 0.07, 0.5);
      soffio(7000, 1200, 1.2, 0.05, 0.4);
    },
    // la data appare sulla pietra: un colpo sordo, un riverbero metallico che stride
    // LA MANATA DEL DEMONE. avviso: un ringhio grave che sale e un rombo sotto l'asfalto (da dove arriverà);
    // colpo: un colpo sordo enorme, l'asfalto che si spacca, i detriti; urto: quando la mano ti prende
    manataAvviso: function (pan) {
      if (!ctx) return;
      const t = ctx.currentTime, p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), g = ctx.createGain();
      if (p.pan) p.pan.value = pan || 0; g.gain.value = 1; g.connect(p); p.connect(master);
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), go = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(72, t + 1.1);
      o2.frequency.setValueAtTime(49.5, t); o2.frequency.linearRampToValueAtTime(74, t + 1.1);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(180, t); lp.frequency.linearRampToValueAtTime(520, t + 1); lp.Q.value = 4;
      go.gain.setValueAtTime(0.0001, t); go.gain.exponentialRampToValueAtTime(0.32, t + 0.5); go.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      o.connect(lp); o2.connect(lp); lp.connect(go); go.connect(g); o.start(t); o2.start(t); o.stop(t + 1.35); o2.stop(t + 1.35);
      const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), gs = ctx.createGain();
      s.buffer = rumore(); s.loop = true; b.type = 'lowpass'; b.frequency.value = 140;
      gs.gain.setValueAtTime(0.0001, t); gs.gain.exponentialRampToValueAtTime(0.5, t + 0.8); gs.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      s.connect(b); b.connect(gs); gs.connect(g); s.start(t); s.stop(t + 1.35);
    },
    manataColpo: function (pan) {
      if (!ctx) return;
      nota(38, 1.1, 'sine', 0.75, 0, 0.5); nota(62, 0.5, 'triangle', 0.35, 0, 0.4); nota(110, 0.18, 'square', 0.08, 0, 0.3);
      soffio(900, 90, 0.7, 0.55); soffio(3200, 600, 0.35, 0.18, 0.02);
      for (let i = 0; i < 6; i++) nota(700 + Math.random() * 1600, 0.04, 'square', 0.03, 0.12 + i * 0.07 + Math.random() * 0.05, 0.5);   // detriti
    },
    // FOGLIA DI SALVIA: una vampata (soffio che sale, nota grave che si alza, un luccichio di note alte) e poi, per tutto
    // il volo, un rombo d'aria morbido e caldo con un bordone che respira. salviaFine lo spegne (subito = senza coda).
    salvia: function (durata) {
      if (!ctx) return;
      const t = ctx.currentTime;
      soffio(220, 2600, 0.9, 0.5); soffio(120, 900, 1.4, 0.3, 0.1);
      nota(55, 1.3, 'sawtooth', 0.12, 0, 2.0); nota(110, 1.1, 'sine', 0.3, 0, 2.0);
      [880, 1175, 1480, 1760, 2350].forEach(function (f, i) { nota(f, 0.5, 'triangle', 0.035, 0.05 + i * 0.07, 1.02); });
      if (volo) { try { volo.s.stop(); volo.o.stop(); } catch (e) {} volo = null; }
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), o = ctx.createOscillator(), go = ctx.createGain(), lfo = ctx.createOscillator(), gl = ctx.createGain();
      s.buffer = rumore(); s.loop = true; f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.7;
      lfo.frequency.value = 0.6; gl.gain.value = 160; lfo.connect(gl); gl.connect(f.frequency);
      o.type = 'triangle'; o.frequency.value = 73.4; go.gain.value = 0.06;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.6);
      s.connect(f); f.connect(g); o.connect(go); go.connect(g); g.connect(master);
      const fine = t + (durata || 6) + 6;            // al più tardi (la discesa può aspettare): lo ferma salviaFine
      s.start(t); o.start(t); lfo.start(t); s.stop(fine); o.stop(fine); lfo.stop(fine);
      volo = { s: s, o: o, g: g };
    },
    salviaFine: function (subito) {
      if (!ctx || !volo) return;
      const t = ctx.currentTime, v = volo; volo = null;
      v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), t);
      v.g.gain.exponentialRampToValueAtTime(0.0001, t + (subito ? 0.08 : 0.7));
      try { v.s.stop(t + (subito ? 0.1 : 0.75)); v.o.stop(t + (subito ? 0.1 : 0.75)); } catch (e) {}
    },
    // LA PIETRA POSSEDUTA (finale): un ronzio grave che sale (due onde a dente di sega quasi uguali che battono tra
    // loro), crepitii elettrici e un fischio alto che ondeggia. imposta(k 0..1): quanto è "viva"; ferma(sec)
    pietraViva: function () {
      if (!ctx) return null;
      const t = ctx.currentTime, g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 6; lp.connect(g);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), g3 = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 55; o2.frequency.value = 57.3; o1.connect(lp); o2.connect(lp);
      o3.type = 'sine'; o3.frequency.value = 1480; g3.gain.value = 0.05; o3.connect(g3); g3.connect(g);
      const lfo = ctx.createOscillator(), gl = ctx.createGain(); lfo.frequency.value = 5.5; gl.gain.value = 60; lfo.connect(gl); gl.connect(o3.frequency);
      const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), gn = ctx.createGain();
      n.buffer = rumore(); n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 3; gn.gain.value = 0;
      n.connect(bp); bp.connect(gn); gn.connect(g);
      [o1, o2, o3, lfo, n].forEach(function (x) { x.start(t); });
      let fine = false, kv = -1;
      return {
        imposta: function (k) {
          if (fine) return; const kk = Math.round(Math.max(0, Math.min(1, k)) * 30) / 30; if (kk === kv) return; kv = kk;
          const now = ctx.currentTime;
          g.gain.setTargetAtTime(0.17 * kk, now, 0.12); lp.frequency.setTargetAtTime(300 + 900 * kk, now, 0.2);
          gn.gain.setTargetAtTime(0.3 * kk * kk, now, 0.1);
        },
        crepita: function () { if (!fine) soffio(5000, 1200, 0.07, 0.12); },
        ferma: function (sec) {
          if (fine) return; fine = true;
          const now = ctx.currentTime, d = Math.max(0.05, sec || 0.5);
          g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, d / 3);
          [o1, o2, o3, lfo, n].forEach(function (x) { try { x.stop(now + d + 0.2); } catch (e) {} });
        }
      };
    },
    // AVVISO (disclaimer): un graffio elettrico breve e un tonfo basso, come un cabinato che si inceppa
    avviso: function () {
      if (!ctx) return;
      soffio(3000, 900, 0.12, 0.18); nota(55, 0.35, 'sine', 0.35, 0, 0.7); nota(880, 0.05, 'square', 0.05, 0.02, 0.5); nota(660, 0.05, 'square', 0.04, 0.09, 0.5);
    },
    manataUrto: function () { if (!ctx) return; nota(45, 0.6, 'sine', 0.6, 0, 0.6); soffio(500, 80, 0.4, 0.45); nota(160, 0.25, 'sawtooth', 0.08, 0, 0.4); },
    // IL CAMPANILE DISTORTO (fine del gioco, quando compare la data): tre rintocchi di una campana grave. Ogni rintocco
    // ha le parziali di una campana vera (non armoniche: la "terza minore" che rende cupe le campane) che calano di tono
    // mentre suonano, come un nastro che rallenta; passano per una distorsione e un filtro scuro e restano nell'eco.
    // Ogni rintocco è un po' più basso e più stonato del precedente.
    campanile: function () {
      if (!ctx) return;
      const t0 = ctx.currentTime + 0.02;
      const dist = ctx.createWaveShaper(), curva = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curva[i] = Math.tanh(3.2 * x) * 0.9; }
      dist.curve = curva;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 0.7;
      const out = ctx.createGain(); out.gain.value = 0.9;
      dist.connect(lp); lp.connect(out); out.connect(master);
      const invio = ctx.createGain(); invio.gain.value = 0.7; out.connect(invio); invio.connect(bus());
      const P = [[0.5, 0.55, 7], [1, 0.45, 5], [1.19, 0.38, 4.2], [1.5, 0.2, 3], [2, 0.36, 3.2], [2.52, 0.14, 2], [3.01, 0.12, 1.6], [4.07, 0.08, 1.1], [5.4, 0.05, 0.7]];
      [[0, 174, 1], [2.3, 168, 0.85], [4.6, 159, 0.7]].forEach(function (r) {
        const t = t0 + r[0], f = r[1], v = r[2];
        P.forEach(function (p, i) {
          const o = ctx.createOscillator(), g = ctx.createGain(), dec = p[2] * 1.2;
          o.type = 'sine'; o.frequency.setValueAtTime(f * p[0] * (1 + (i % 2 ? 0.004 : -0.003)), t);
          o.frequency.exponentialRampToValueAtTime(f * p[0] * 0.93, t + dec);              // il tono che cala
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1] * v * 0.5, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
          o.connect(g); g.connect(dist); o.start(t); o.stop(t + dec + 0.05);
        });
        // il colpo del batacchio
        const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), gs = ctx.createGain();
        s.buffer = rumore(); b.type = 'bandpass'; b.frequency.value = 1700; b.Q.value = 2;
        gs.gain.setValueAtTime(0.25 * v, t); gs.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        s.connect(b); b.connect(gs); gs.connect(dist); s.start(t); s.stop(t + 0.1);
      });
    },
    data: function () { nota(41, 2.5, 'sine', 0.4, 0, 0.8); nota(1318, 2.2, 'sine', 0.04); nota(1396, 2.2, 'sine', 0.035, 0.03); soffio(6000, 400, 1.8, 0.06); },
    blackout: eventi.blackout, scossa: eventi.scossa, luceTorna: eventi.luceTorna, colpa: eventi.colpa, ovatta: eventi.ovatta, pianoColpa: eventi.pianoColpa, pianoFerma: eventi.pianoFerma,
    portaApre: demoni.portaApre, portaChiude: demoni.portaChiude, demoneAppare: demoni.demoneAppare, battito: demoni.battito, clic: demoni.clic,
    scappa: demoni.scappa, ambra: demoni.ambra, salto: demoni.salto, atterraggio: demoni.atterraggio, transenna: demoni.transenna, sagomaUrto: demoni.sagomaUrto, cattura: demoni.cattura,
    passoStanza: strada.passoStanza, passoStrada: strada.passoStrada, passoTerra: strada.passoTerra, scarto: strada.scarto, urto: strada.urto, distruzione: strada.distruzione, clacson: strada.clacson, clacsonVicino: strada.clacsonVicino, bip: strada.bip, vento: strada.vento,
    avvia: avvia, stingerDemone: stingerDemone, fermaStinger: fermaStinger,
    tocco: function () { nota(660, 0.08, 'square', 0.05); },
    messaggio: function () { nota(880, 0.12, 'triangle', 0.12); nota(1320, 0.18, 'triangle', 0.1, 0.1); },
    specchio: function () { nota(120, 0.9, 'sawtooth', 0.12, 0, 0.5); nota(121.5, 0.9, 'sawtooth', 0.1, 0, 0.5); },
    // (fase 27) STRIDIO DELLO SPECCHIO: due note acute e stonate che salgono come un violino graffiato, con un tremolio
    // nervoso, più un fruscio metallico (unghia sul vetro). Dura circa un secondo e si spegne di colpo.
    stridioSpecchio: function () {
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime, D = 1.0, vol = 0.09;
      const uscita = ctx.createGain(); uscita.gain.setValueAtTime(0.0001, t);
      uscita.gain.exponentialRampToValueAtTime(1, t + 0.05); uscita.gain.setValueAtTime(1, t + D - 0.06); uscita.gain.linearRampToValueAtTime(0.0001, t + D);
      const filtro = ctx.createBiquadFilter(); filtro.type = 'highpass'; filtro.frequency.value = 700;
      const trem = ctx.createGain(); trem.gain.value = 0.65;                         // tremolio: il volume sbatte ~17 volte al secondo
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 17; lfoG.gain.value = 0.35;
      lfo.connect(lfoG); lfoG.connect(trem.gain);
      trem.connect(filtro); filtro.connect(uscita); uscita.connect(master);
      [[1480, 2350, 'sawtooth', 1], [1565, 2210, 'square', 0.55], [2960, 4400, 'sawtooth', 0.3]].forEach(function (n) {
        const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vibG = ctx.createGain();
        o.type = n[2]; o.frequency.setValueAtTime(n[0], t); o.frequency.exponentialRampToValueAtTime(n[1], t + D);
        vib.frequency.value = 7.5 + Math.random() * 3; vibG.gain.value = n[0] * 0.025;      // vibrato storto, diverso per ogni voce
        vib.connect(vibG); vibG.connect(o.frequency);
        g.gain.value = vol * n[3]; o.connect(g); g.connect(trem);
        o.start(t); vib.start(t); o.stop(t + D + 0.05); vib.stop(t + D + 0.05);
      });
      lfo.start(t); lfo.stop(t + D + 0.05);
      soffio(6000, 9000, D * 0.9, 0.12, 0.02);                                         // unghia sul vetro
      soffio(3800, 5200, 0.35, 0.08, 0.45);
    },
    sigaretta: function () { nota(90, 0.25, 'square', 0.12, 0, 0.4); },
    // (fase 60) l'armadio che si apre: un cigolio lungo di legno (un'onda ruvida che sale e scende, filtrata) e un colpo sordo
    armadio: function () {
      if (!ctx) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t);
      for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(170 + Math.random() * 120, t + i * 0.1);
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.08); g.gain.setTargetAtTime(0, t + 0.75, 0.08);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3);
      nota(70, 0.18, 'sine', 0.2, 0.85);
    },
    pietra: function () { [523, 659, 784, 1046, 1568].forEach(function (f, i) { nota(f, 0.9, 'triangle', 0.14, i * 0.07); }); nota(60, 1.4, 'sawtooth', 0.15, 0, 0.5); },
    errore: function () { nota(180, 0.15, 'square', 0.08); },
    // (fase 22) il carillon sfuma in sec secondi e si ferma
    // (fase 44) un elemento <audio> passato nel mixer del gioco: il volume lo fa un GainNode (su iPhone il volume degli
    // elementi audio non si può cambiare da codice). Da file:// il browser non lo permette: si usa el.volume.
    collega: function (el) {
      let g = null;
      if (ctx && location.protocol !== 'file:') {
        try { const src = ctx.createMediaElementSource(el); g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(limite); el.volume = 1; } catch (e) { g = null; }
      }
      return { imposta: function (v) { v = Math.max(0, Math.min(1, v)); if (g) g.gain.setTargetAtTime(v, ctx.currentTime, 0.02); else { try { el.volume = v; } catch (e) {} } } };
    },
    // (fase 42) vero mentre il carillon sta suonando (la musica della cameretta si abbassa)
    carillonSuona: function () { return !!(carillon && !carillon.paused && !carillon.ended); },
    fermaCarillon: function (sec) {
      const c = carillon; if (!c || c.paused) return;
      const v0 = c.volume, t0 = performance.now(), d = (sec || 1) * 1000;
      const passo = function () { const k = Math.min(1, (performance.now() - t0) / d); try { c.volume = v0 * (1 - k); } catch (e) {}
        if (k < 1 && !c.paused) requestAnimationFrame(passo); else { try { c.pause(); c.volume = v0; } catch (e) {} } };
      requestAnimationFrame(passo);
    },
    // SCATOLA MUSICALE: se in config c'è un tuo file lo usa, altrimenti una melodia di prova che stona e rallenta
    // (fase 26) PASSO SUL PARQUET: il tacco secco sul legno, il rimbombo cavo delle assi, ogni tanto uno scricchiolio.
    // vel: quanto cammina veloce (0-1), lato: -1 sinistro, 1 destro (appena diversi, come due piedi veri)
    passoStanza: function (vel, lato) {
      if (!ctx) return;
      const v = (0.55 + 0.45 * Math.min(1, vel || 1)) * PZ.CONFIG.audio.volume, j = (lato > 0 ? 1.06 : 0.95) * (0.96 + Math.random() * 0.08);
      soffio(3200 * j, 900, 0.045, 0.55 * v);                       // tacco: un clic secco
      nota(120 * j, 0.11, 'sine', 0.5 * v, 0, 0.55);                 // il colpo sul pavimento
      nota(240 * j, 0.07, 'triangle', 0.16 * v, 0.004, 0.7);         // le assi cave che risuonano
      soffio(1400 * j, 500, 0.08, 0.22 * v, 0.03);                   // la punta che appoggia subito dopo
      if (Math.random() < 0.18) nota(380 + Math.random() * 160, 0.22, 'sawtooth', 0.025 * v, 0.06, 1.25);   // scricchiolio
    },
    // (fase 33) PASSO SULL'ASFALTO (scena prima della bici): suola di gomma sul marciapiede, secco e corto; di corsa più forte
    passoStrada: function (corsa, lato) {
      if (!ctx) return;
      const v = (corsa ? 1 : 0.7) * PZ.CONFIG.audio.volume, j = (lato > 0 ? 1.05 : 0.95) * (0.95 + Math.random() * 0.1);
      soffio(2600 * j, 700, 0.04, 0.45 * v);                         // la suola che batte
      nota(95 * j, 0.08, 'sine', 0.42 * v, 0, 0.6);                  // il colpo sul pavimento
      soffio(5200 * j, 2200, corsa ? 0.07 : 0.05, 0.16 * v, 0.02);   // lo strisciare sulla grana dell'asfalto
    },
    // (fase 33) PASSO SU TERRA E ROCCIA (finale sulla scogliera): sordo, con un po' di ghiaia che scricchiola
    passoTerra: function (vel) {
      if (!ctx) return;
      const v = (0.6 + 0.4 * (vel || 1)) * PZ.CONFIG.audio.volume, j = 0.93 + Math.random() * 0.14;
      soffio(900 * j, 250, 0.09, 0.4 * v);                           // il piede nella terra
      nota(70 * j, 0.1, 'sine', 0.38 * v, 0, 0.6);
      for (let i = 0; i < 4; i++) soffio(3500 + Math.random() * 3000, 1800, 0.025, 0.1 * v, 0.02 + Math.random() * 0.1);   // ghiaia
    },
    scatolaMusicale: function () {
      const file = PZ.CONFIG.audio.scatolaMusicale;
      const vol = PZ.CONFIG.audio.volume * (PZ.CONFIG.audio.volumeCarillon == null ? 1 : PZ.CONFIG.audio.volumeCarillon);
      if (file) {
        try {
          if (carillon && !carillon.paused && !carillon.ended) { carillon.pause(); return 'pausa'; }      // (fase 24) pausa
          if (carillon && carillon.paused && !carillon.ended && carillon.currentTime > 0) { carillon.volume = vol; carillon.play(); return 'riprende'; }
          carillon = new Audio(file); carillon.volume = vol; carillon.play(); return 'suona';
        } catch (e) {}
      }
      if (!ctx) return;
      const melodia = [659, 622, 659, 622, 659, 494, 587, 523, 440];   // frammento in minore
      let t = 0;
      melodia.forEach(function (f, i) {
        const stona = 1 + i * 0.004 * (i % 2 ? 1 : -1);
        nota(f * stona, 0.9, 'triangle', 0.16, t); nota(f * 2 * stona, 0.5, 'sine', 0.05, t);
        t += 0.34 + i * 0.045;                         // rallenta
      });
      nota(55, 3, 'sawtooth', 0.08, t - 0.2, 0.6);
    }
  };
})();
