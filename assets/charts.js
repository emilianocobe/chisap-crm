/* CHISAP CRM · charts.js — mini motor de gráficos SVG con animación */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function sv(w, h) { var s = el('svg', { viewBox: '0 0 ' + w + ' ' + h }); return s; }
  function tx(x, y, t, o) {
    o = o || {};
    var e = el('text', { x: x, y: y, 'font-size': o.fs || 10.5, fill: o.f || 'var(--tinta3)',
      'text-anchor': o.a || 'middle', 'font-weight': o.w || 500, 'font-family': "'Inter',sans-serif" });
    e.textContent = t; return e;
  }
  function animarBarra(b, y, h) {
    requestAnimationFrame(function () {
      b.style.transition = 'height .8s cubic-bezier(.2,.75,.25,1), y .8s cubic-bezier(.2,.75,.25,1)';
      b.setAttribute('height', h); b.setAttribute('y', y);
    });
  }
  function animarLinea(l) {
    try {
      var L = l.getTotalLength();
      l.style.strokeDasharray = L; l.style.strokeDashoffset = L;
      l.getBoundingClientRect();
      l.style.transition = 'stroke-dashoffset 1.2s ease';
      l.style.strokeDashoffset = 0;
    } catch (e) {}
  }

  /* barras verticales: data = [{label, valor, color?, destacar?}] */
  function barras(cont, data, opts) {
    opts = opts || {};
    cont.innerHTML = '';
    var W = opts.w || 520, H = opts.h || 220, P = { l: 8, r: 8, t: 20, b: 26 };
    var s = sv(W, H), mx = Math.max.apply(null, data.map(function (d) { return d.valor; })) || 1;
    var bw = (W - P.l - P.r) / data.length;
    data.forEach(function (d, i) {
      var h = (d.valor / mx) * (H - P.t - P.b - 18), x = P.l + i * bw + bw * .16, y = H - P.b - h;
      var b = el('rect', { x: x, y: H - P.b, width: bw * .68, height: 0, rx: 5,
        fill: d.color || (d.destacar ? 'var(--oro)' : 'var(--rojo-vivo)') });
      s.appendChild(b); animarBarra(b, y, h);
      s.appendChild(tx(x + bw * .34, H - 9, d.label, { fs: opts.fsx || 9.5 }));
      if (opts.valores !== false) s.appendChild(tx(x + bw * .34, y - 6, d.fmt || d.valor, { fs: 10, w: 800, f: d.destacar ? 'var(--oro-claro)' : 'var(--tinta3)' }));
    });
    cont.appendChild(s);
  }

  /* línea: serie = [numeros] */
  function linea(cont, serie, opts) {
    opts = opts || {};
    cont.innerHTML = '';
    var W = opts.w || 520, H = opts.h || 170, P = { l: 10, r: 10, t: 14, b: 20 };
    var s = sv(W, H), mx = Math.max.apply(null, serie) || 1;
    var paso = (W - P.l - P.r) / (serie.length - 1 || 1), p = '';
    // área bajo la curva
    serie.forEach(function (v, i) {
      var x = P.l + i * paso, y = P.t + (1 - v / mx) * (H - P.t - P.b);
      p += (i ? 'L' : 'M') + x + ',' + y;
    });
    var area = el('path', { d: p + 'L' + (W - P.r) + ',' + (H - P.b) + 'L' + P.l + ',' + (H - P.b) + 'Z',
      fill: 'url(#gA)', opacity: .35 });
    var df = el('defs', {});
    df.innerHTML = '<linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      (opts.color || '#F2B705') + '" stop-opacity=".55"/><stop offset="1" stop-color="' + (opts.color || '#F2B705') + '" stop-opacity="0"/></linearGradient>';
    s.appendChild(df); s.appendChild(area);
    var ln = el('path', { d: p, fill: 'none', stroke: opts.color || 'var(--oro)', 'stroke-width': 2.6, 'stroke-linejoin': 'round' });
    s.appendChild(ln); animarLinea(ln);
    serie.forEach(function (v, i) {
      var x = P.l + i * paso, y = P.t + (1 - v / mx) * (H - P.t - P.b);
      if (i === serie.length - 1 || v === mx) {
        s.appendChild(el('circle', { cx: x, cy: y, r: 4, fill: opts.color || 'var(--oro)', stroke: 'var(--sup)', 'stroke-width': 2 }));
        s.appendChild(tx(x, y - 9, v, { fs: 10.5, w: 800, f: opts.color || 'var(--oro-claro)' }));
      }
    });
    if (opts.labels) opts.labels.forEach(function (l, i) {
      if (l) s.appendChild(tx(P.l + i * paso, H - 6, l, { fs: 9 }));
    });
    cont.appendChild(s);
  }

  /* donut: items = [{label, valor, color}] */
  function donut(cont, items, opts) {
    opts = opts || {};
    cont.innerHTML = '';
    var W = opts.w || 520, H = opts.h || 210, s = sv(W, H);
    var total = items.reduce(function (a, b) { return a + b.valor; }, 0) || 1;
    var cx = opts.cx || 105, cy = H / 2, R = opts.R || 74, r = opts.r || 46, a0 = -Math.PI / 2;
    items.forEach(function (d) {
      if (!d.valor) return;
      var frac = d.valor / total, a1 = a0 + frac * 2 * Math.PI - .015;
      var large = frac > .5 ? 1 : 0;
      var x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      var xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1), xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
      var path = el('path', { d: 'M' + x0 + ',' + y0 + ' A' + R + ',' + R + ' 0 ' + large + ' 1 ' + x1 + ',' + y1 +
        ' L' + xi1 + ',' + yi1 + ' A' + r + ',' + r + ' 0 ' + large + ' 0 ' + xi0 + ',' + yi0 + ' Z', fill: d.color, opacity: 0 });
      s.appendChild(path);
      requestAnimationFrame(function () { path.style.transition = 'opacity .7s'; path.style.opacity = .92; });
      a0 = a1 + .015;
    });
    s.appendChild(tx(cx, cy - 2, opts.centro || total, { fs: 21, w: 900, f: 'var(--tinta)' }));
    s.appendChild(tx(cx, cy + 15, opts.centroSub || 'total', { fs: 9, f: 'var(--tinta3)' }));
    items.forEach(function (d, i) {
      var y = H / 2 - (items.length * 20) / 2 + i * 20 + 8;
      s.appendChild(el('rect', { x: 225, y: y - 9, width: 11, height: 11, rx: 3.5, fill: d.color }));
      var pct = Math.round(100 * d.valor / total);
      s.appendChild(tx(244, y, d.label + ' · ' + d.valor + ' (' + pct + '%)', { a: 'start', fs: 11.5, w: 600, f: 'var(--tinta2)' }));
    });
    cont.appendChild(s);
  }

  /* funnel horizontal: pasos = [{etapa, n}] */
  function funnel(cont, pasos, opts) {
    opts = opts || {};
    cont.innerHTML = '';
    var W = opts.w || 520, rowH = 34, H = pasos.length * rowH + 8, s = sv(W, H);
    var mx = pasos[0] ? pasos[0].n : 1;
    var colores = ['#7B95FF', '#3FD0D6', '#F2B705', '#FF9636', '#B47CFF', '#25D366'];
    pasos.forEach(function (p, i) {
      var y = i * rowH + 4, w = Math.max(38, (p.n / (mx || 1)) * (W - 190));
      var b = el('rect', { x: 150, y: y, width: 0, height: rowH - 10, rx: 8, fill: colores[i % colores.length], opacity: .88 });
      s.appendChild(b);
      requestAnimationFrame(function () { b.style.transition = 'width .8s cubic-bezier(.2,.75,.25,1) ' + i * 70 + 'ms'; b.setAttribute('width', w); });
      s.appendChild(tx(142, y + 16, p.etapa, { a: 'end', fs: 11, w: 700, f: 'var(--tinta2)' }));
      s.appendChild(tx(158 + w, y + 16, p.n + (i > 0 && mx ? '  (' + Math.round(100 * p.n / mx) + '%)' : ''), { a: 'start', fs: 10.5, w: 800, f: 'var(--tinta3)' }));
    });
    cont.appendChild(s);
  }

  global.Charts = { barras: barras, linea: linea, donut: donut, funnel: funnel };
})(window);
