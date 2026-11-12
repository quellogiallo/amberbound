// Strumenti per l'estetica PlayStation 1.
window.PZ = window.PZ || {};

PZ.ps1 = (function () {
  // Risoluzione interna dell'immagine, condivisa da tutti i materiali (la aggiorna main.js)
  const risoluzione = { value: new THREE.Vector2(478, 200) };

  // Numeri casuali ripetibili: stesso seme = stessa scena, ogni volta
  function casuale(seme) {
    let a = seme >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Valore casuale legato a un punto dello spazio: stesso punto = stesso valore (così la roccia non si spacca)
  function hash(x, y, z) {
    const s = Math.sin(Math.round(x * 100) * 12.9898 + Math.round(y * 100) * 78.233 + Math.round(z * 100) * 37.719) * 43758.5453;
    return s - Math.floor(s);
  }

  // Texture a pixel: pochi colori sparsi a caso (dal più scuro al più chiaro), nessuna sfumatura
  function texture(colori, lato, ripetiX, ripetiY, seme) {
    const rnd = casuale(seme);
    const c = document.createElement('canvas');
    c.width = c.height = lato;
    const g = c.getContext('2d');
    for (let y = 0; y < lato; y++) {
      for (let x = 0; x < lato; x++) {
        const i = Math.min(colori.length - 1, Math.floor(Math.pow(rnd(), 1.6) * colori.length));
        g.fillStyle = '#' + colori[i].toString(16).padStart(6, '0');
        g.fillRect(x, y, 1, 1);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.repeat.set(ripetiX, ripetiY);
    return t;
  }

  // Alone luminoso a fasce (usato per la luna e il lampione). r, g, b da 0 a 255
  function alone(r, g, b, fasce) {
    const lato = 128;
    const c = document.createElement('canvas');
    c.width = c.height = lato;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(lato, lato);
    for (let y = 0; y < lato; y++) {
      for (let x = 0; x < lato; x++) {
        const d = Math.hypot(x + 0.5 - lato / 2, y + 0.5 - lato / 2) / (lato / 2);
        let a = Math.max(0, 1 - d);
        a = Math.floor(a * a * fasce) / fasce;
        const k = (y * lato + x) * 4;
        img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }

  // Effetto PS1: ogni vertice si aggancia alla griglia dei pixel, quindi le forme "ballano" un poco
  function aggancia(materiale) {
    if (!PZ.CONFIG.tremolioVertici || /senza-tremolio/.test(location.search)) return materiale;
    materiale.onBeforeCompile = function (shader) {
      shader.uniforms.uRis = risoluzione;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uRis;')
        .replace('#include <project_vertex>',
          '#include <project_vertex>\n' +
          'if (gl_Position.w > 0.0) {\n' +
          '  vec2 gr = uRis * 0.5;\n' +
          '  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * gr + 0.5) / gr * gl_Position.w;\n' +
          '}');
    };
    return materiale;
  }

  return { risoluzione: risoluzione, casuale: casuale, hash: hash, texture: texture, alone: alone, aggancia: aggancia };
})();
