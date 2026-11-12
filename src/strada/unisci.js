// Costruttore di geometrie unite. Tanti pezzi semplici (scatole, quadrilateri, cilindri) con un colore per
// vertice diventano UNA sola mesh per materiale: un tratto di strada intero si disegna con poche chiamate alla
// scheda video, ed è la cosa che conta di più sugli smartphone.
//
// Uso: const C = new PZ.Costruttore();  C.scatola('colori', w, h, d, x, y, z, 0xff0000);  ...  C.crea(materiali)
// Ogni pezzo va in un "gruppo" (una chiave), e ogni chiave diventa una mesh con il materiale materiali[chiave].
// C.base(x, y, z, ry) sposta e ruota tutti i pezzi aggiunti dopo (utile per un'auto intera); C.base() la toglie.
window.PZ = window.PZ || {};

PZ.Costruttore = function () {
  const gruppi = {};
  const m4 = new THREE.Matrix4(), mb = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), ab = new THREE.Vector3(), ad = new THREE.Vector3();
  let conBase = false;

  function gruppo(k) { return gruppi[k] || (gruppi[k] = { pos: [], nor: [], uv: [], col: [] }); }

  this.base = function (x, y, z, ry) {
    if (x === undefined) { conBase = false; return this; }
    e.set(0, ry || 0, 0); q.setFromEuler(e); p.set(x, y, z); sc.set(1, 1, 1);
    mb.compose(p, q, sc); conBase = true;
    return this;
  };

  // Una geometria qualsiasi di three.js, spostata (x, y, z), ruotata (rx, ry, rz) e scalata (sx, sy, sz)
  this.geo = function (k, g, x, y, z, rx, ry, rz, colore, sx, sy, sz) {
    const G = gruppo(k), ng = g.index ? g.toNonIndexed() : g;
    e.set(rx || 0, ry || 0, rz || 0); q.setFromEuler(e); p.set(x, y, z);
    sc.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz);
    m4.compose(p, q, sc);
    if (conBase) m4.premultiply(mb);
    nm.getNormalMatrix(m4);
    const P = ng.attributes.position, N = ng.attributes.normal, U = ng.attributes.uv;
    c.set(colore === undefined ? 0xffffff : colore);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m4); G.pos.push(v.x, v.y, v.z);
      if (N) { n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); G.nor.push(n.x, n.y, n.z); } else G.nor.push(0, 1, 0);
      if (U) G.uv.push(U.getX(i), U.getY(i)); else G.uv.push(0, 0);
      G.col.push(c.r, c.g, c.b);
    }
    if (ng !== g) ng.dispose();
    return this;
  };

  const UNO = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  // Scatola: y è la BASE (il punto più basso), non il centro
  this.scatola = function (k, w, h, dd, x, y, z, colore, ry, rx, rz) {
    return this.geo(k, UNO, x, y + h / 2, z, rx || 0, ry || 0, rz || 0, colore, w, h, dd);
  };
  const cilindri = {};
  // Cilindro (o tronco di cono) con "lati" facce: y è la base
  this.cilindro = function (k, r, h, lati, x, y, z, colore, rTop, rx, rz) {
    const chiave = lati + '|' + (rTop === undefined ? 1 : rTop / r);
    const g = cilindri[chiave] || (cilindri[chiave] = new THREE.CylinderGeometry(rTop === undefined ? 1 : rTop / r, 1, 1, lati).toNonIndexed());
    if (rx || rz) return this.geo(k, g, x, y, z, rx || 0, 0, rz || 0, colore, r, h, r);
    return this.geo(k, g, x, y + h / 2, z, 0, 0, 0, colore, r, h, r);
  };
  const sfere = {};
  this.sfera = function (k, r, x, y, z, colore, sx, sy, sz, dettaglio) {
    const dt = dettaglio || 0;
    const g = sfere[dt] || (sfere[dt] = new THREE.IcosahedronGeometry(1, dt));
    return this.geo(k, g, x, y, z, 0, 0, 0, colore, r * (sx || 1), r * (sy || 1), r * (sz || 1));
  };

  // Quadrilatero dai 4 angoli (in senso antiorario visto dal lato che deve essere visibile).
  // uv = [u0, v0, u1, v1]: coordinate della texture agli angoli a (u0, v0) e c (u1, v1)
  this.quad = function (k, A, B, Cc, D, uv, colore) {
    const G = gruppo(k);
    a.fromArray(A); b.fromArray(B); v.fromArray(Cc); d.fromArray(D);
    if (conBase) { a.applyMatrix4(mb); b.applyMatrix4(mb); v.applyMatrix4(mb); d.applyMatrix4(mb); }
    ab.subVectors(b, a); ad.subVectors(d, a); n.crossVectors(ab, ad).normalize();
    c.set(colore === undefined ? 0xffffff : colore);
    const u0 = uv ? uv[0] : 0, v0 = uv ? uv[1] : 0, u1 = uv ? uv[2] : 0, v1 = uv ? uv[3] : 0;
    const vert = [[a, u0, v0], [b, u1, v0], [v, u1, v1], [a, u0, v0], [v, u1, v1], [d, u0, v1]];
    for (let i = 0; i < 6; i++) {
      const w = vert[i];
      G.pos.push(w[0].x, w[0].y, w[0].z); G.nor.push(n.x, n.y, n.z); G.uv.push(w[1], w[2]); G.col.push(c.r, c.g, c.b);
    }
    return this;
  };

  // Crea le mesh (una per chiave). materiali: { chiave: materiale }
  this.crea = function (materiali, ordine) {
    const gr = new THREE.Group();
    Object.keys(gruppi).forEach(function (k) {
      const G = gruppi[k];
      if (!G.pos.length || !materiali[k]) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(G.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(G.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(G.col, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, materiali[k]);
      if (ordine && ordine[k] !== undefined) m.renderOrder = ordine[k];
      m.matrixAutoUpdate = false;
      gr.add(m);
    });
    return gr;
  };
};
