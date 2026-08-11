/* ═══════════════════════════════════════════════════════════════════
   CHISAP CRM · store.js — capa de datos compartida (demo)
   Persistencia: localStorage. La landing crea leads; el backoffice
   los gestiona. El scoring es un motor de reglas EDITABLES: cambiar
   una regla recalcula el score de todos los leads al instante.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var LS_KEY = 'chisap_crm_v1';

  /* ── Catálogo del wizard (preguntas filtro) ── */
  var PREGUNTAS = {
    motivo: {
      titulo: '¿Qué te trae a Chisap Fiesta?',
      opciones: [
        { t: 'Quiero un negocio propio, en serio', e: '🚀' },
        { t: 'Un ingreso adicional a mi empleo', e: '💼' },
        { t: 'Diversificar lo que ya tengo', e: '📈' },
        { t: 'Estoy curioseando', e: '👀' }
      ]
    },
    capital: {
      titulo: '¿Cuánto podés invertir para arrancar?',
      opciones: [
        { t: 'Menos de USD 10.000', e: '🪙' },
        { t: 'USD 10.000 – 15.000', e: '💵' },
        { t: 'USD 15.000 – 25.000', e: '💰' },
        { t: 'Más de USD 25.000', e: '🏆' }
      ]
    },
    timeline: {
      titulo: '¿Para cuándo querés arrancar?',
      opciones: [
        { t: 'Ya — este mes', e: '🔥' },
        { t: 'En 1 a 3 meses', e: '📆' },
        { t: 'En 3 a 6 meses', e: '🗓️' },
        { t: 'Todavía investigando', e: '🧭' }
      ]
    },
    dedicacion: {
      titulo: '¿Cómo pensás involucrarte?',
      opciones: [
        { t: 'Full time: va a ser mi actividad principal', e: '💪' },
        { t: 'Part time, en paralelo a mi empleo', e: '⏱️' },
        { t: 'Con mi pareja o familia', e: '👨‍👩‍👧' },
        { t: 'Pondría a alguien a cargo', e: '🧑‍💼' }
      ]
    },
    experiencia: {
      titulo: '¿Tenés experiencia gestionando?',
      opciones: [
        { t: 'Sí, manejé equipos o negocios', e: '✅' },
        { t: 'Algo, lo básico', e: '🙂' },
        { t: 'No, pero tengo muchas ganas', e: '🌱' }
      ]
    }
  };
  var NECESITA = ['Números reales / la proyección', 'Hablar con un franquiciado actual',
                  'Visitar un punto de venta', 'Leer el contrato en detalle'];
  var ZONAS = ['AMBA – CABA', 'AMBA – Zona Norte', 'AMBA – Zona Sur', 'AMBA – Zona Oeste',
               'La Plata', 'Córdoba', 'Rosario', 'Mar del Plata', 'Interior / otra provincia'];
  var ORIGENES = ['Instagram', 'Google Ads', 'Meta Ads', 'Referido', 'Feria', 'Orgánico'];

  /* ── Pipeline ── */
  var ETAPAS = [
    { id: 'nuevo',      nombre: 'Nuevo',        emoji: '✨', color: '#7B95FF' },
    { id: 'contactado', nombre: 'Contactado',   emoji: '📞', color: '#3FD0D6' },
    { id: 'reunion',    nombre: 'Reunión',      emoji: '🤝', color: '#F2B705' },
    { id: 'visita',     nombre: 'Visita a local', emoji: '🏪', color: '#FF9636' },
    { id: 'propuesta',  nombre: 'Propuesta',    emoji: '📄', color: '#B47CFF' },
    { id: 'firmado',    nombre: 'Firmado',      emoji: '🏆', color: '#25D366' }
  ];
  var SLA_DIAS = 5; // sin actividad > SLA => lead "enfriándose" (patrón Pipedrive rotting)

  /* ── Reglas de scoring por defecto (EDITABLES desde el backoffice) ── */
  var REGLAS_DEFAULT = {
    motivo:      [25, 22, 20, 6],
    capital:     [4, 16, 25, 28],
    timeline:    [25, 22, 14, 7],
    dedicacion:  [25, 20, 22, 12],
    experiencia: [25, 18, 14],
    necesitaBonus: 2,           // puntos por cada "necesito ver…" (intención concreta)
    escala: 1.3,                // divisor final (score = suma / escala, tope 100)
    umbralCaliente: 72,
    umbralTibio: 48
  };

  /* ── Gamificación del equipo ── */
  var LOGROS = [
    { id: 'primer_lead',   nombre: 'Primera sangre',    desc: 'Gestionaste tu primer lead',              emoji: '🩸', xp: 10 },
    { id: 'racha_3',       nombre: 'En racha',          desc: '3 días seguidos con actividad',           emoji: '🔥', xp: 25 },
    { id: 'primera_firma', nombre: 'Primera firma',     desc: 'Llevaste un lead hasta Firmado',          emoji: '🏆', xp: 100 },
    { id: 'cinco_reuniones', nombre: 'Agenda llena',    desc: '5 leads llegaron a Reunión',              emoji: '🤝', xp: 40 },
    { id: 'cero_frios',    nombre: 'Nada se enfría',    desc: 'Ningún lead fuera de SLA en el pipeline', emoji: '🧊', xp: 50 },
    { id: 'meta_mes',      nombre: 'Meta del mes',      desc: 'Alcanzaste la meta mensual de firmas',    emoji: '🎯', xp: 150 },
    { id: 'scoring_pro',   nombre: 'Afinador',          desc: 'Ajustaste las reglas de scoring',         emoji: '🎛️', xp: 15 },
    { id: 'explorador',    nombre: 'Explorador',        desc: 'Visitaste todas las secciones del CRM',   emoji: '🧭', xp: 20 }
  ];
  var NIVELES = [
    { nombre: 'Aprendiz',   min: 0,   emoji: '🌱' },
    { nombre: 'Vendedor',   min: 50,  emoji: '💼' },
    { nombre: 'Cerrador',   min: 150, emoji: '🎯' },
    { nombre: 'Franquiciero', min: 300, emoji: '🏪' },
    { nombre: 'Leyenda',    min: 500, emoji: '👑' }
  ];
  var EQUIPO = [
    { id: 'vale',  nombre: 'Valentina R.', emoji: '🦊', rol: 'Asesora senior' },
    { id: 'marco', nombre: 'Marco D.',     emoji: '🐺', rol: 'Asesor comercial' },
    { id: 'flor',  nombre: 'Florencia G.', emoji: '🦉', rol: 'Franquicias' }
  ];

  /* ═══════════════ MOTOR DE SCORING ═══════════════ */
  function calcularScore(respuestas, reglas) {
    var r = reglas || state.reglas, suma = 0, detalle = [];
    ['motivo', 'capital', 'timeline', 'dedicacion', 'experiencia'].forEach(function (k) {
      var idx = respuestas[k];
      if (idx == null || !r[k] || r[k][idx] == null) return;
      suma += r[k][idx];
      detalle.push({ campo: k, opcion: PREGUNTAS[k].opciones[idx].t, puntos: r[k][idx] });
    });
    var bonus = (respuestas.necesita || []).length * r.necesitaBonus;
    if (bonus) detalle.push({ campo: 'necesita', opcion: (respuestas.necesita || []).length + ' señales de intención', puntos: bonus });
    suma += bonus;
    var score = Math.min(100, Math.round(suma / (r.escala || 1)));
    return { score: score, detalle: detalle, bruto: suma };
  }
  function segmento(score, reglas) {
    var r = reglas || state.reglas;
    if (score >= r.umbralCaliente) return { id: 'caliente', nombre: 'Caliente', emoji: '🔥', color: '#25D366' };
    if (score >= r.umbralTibio)    return { id: 'tibio',    nombre: 'Tibio',    emoji: '🌤️', color: '#F2B705' };
    return { id: 'frio', nombre: 'Frío', emoji: '🧊', color: '#7B95FF' };
  }

  /* ═══════════════ SEED de demo ═══════════════ */
  var NOMBRES = [
    ['Diego Méndez', 'AMBA – Zona Sur'], ['Sofía Aguirre', 'La Plata'], ['Martín Aliaga', 'AMBA – Zona Oeste'],
    ['Carla Ibáñez', 'Córdoba'], ['Pablo Gutiérrez', 'AMBA – Zona Norte'], ['Lucía Fernández', 'Rosario'],
    ['Hernán Soto', 'Mar del Plata'], ['Valeria Paz', 'AMBA – CABA'], ['Gonzalo Ríos', 'AMBA – Zona Sur'],
    ['Romina Vega', 'Rosario'], ['Andrés Coll', 'Córdoba'], ['Patricia Suárez', 'AMBA – CABA'],
    ['Federico Lamas', 'La Plata'], ['Julieta Mora', 'AMBA – Zona Oeste'], ['Nicolás Pared', 'Interior / otra provincia'],
    ['Brenda Luna', 'AMBA – Zona Norte'], ['Osvaldo Pinto', 'Mar del Plata'], ['Camila Duarte', 'AMBA – Zona Sur'],
    ['Ramiro Núñez', 'Córdoba'], ['Antonella Bruno', 'AMBA – CABA'], ['Sergio Maldonado', 'La Plata'],
    ['Daniela Prieto', 'Rosario'], ['Matías Herrera', 'AMBA – Zona Oeste'], ['Gabriela Toledo', 'Interior / otra provincia'],
    ['Leandro Quiroga', 'AMBA – Zona Norte'], ['Mariana Celiz', 'Mar del Plata'], ['Rodrigo Páez', 'AMBA – Zona Sur'],
    ['Elena Vidal', 'AMBA – CABA']
  ];
  function rnd(seed) { // pseudo-random determinista para un seed estable
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function seedLeads() {
    var rand = rnd(20260806), leads = [], hoy = Date.now(), DIA = 86400000;
    var etapasDist = ['nuevo','nuevo','nuevo','nuevo','nuevo','contactado','contactado','contactado','contactado',
                      'contactado','reunion','reunion','reunion','reunion','visita','visita','visita','propuesta',
                      'propuesta','firmado','firmado','firmado','nuevo','contactado','reunion','perdido','perdido','nuevo'];
    NOMBRES.forEach(function (n, i) {
      var creado = hoy - Math.floor(rand() * 88 + 1) * DIA;
      var resp = {
        motivo: Math.floor(rand() * 4), capital: Math.floor(rand() * 4),
        timeline: Math.floor(rand() * 4), dedicacion: Math.floor(rand() * 4),
        experiencia: Math.floor(rand() * 3),
        necesita: [0, 1, 2, 3].filter(function () { return rand() > 0.55; })
      };
      // sesgo: los que avanzaron en el pipeline tienden a tener mejor perfil
      var etapa = etapasDist[i % etapasDist.length];
      if (['visita', 'propuesta', 'firmado'].indexOf(etapa) >= 0) { resp.capital = 2 + Math.floor(rand() * 2); resp.timeline = Math.floor(rand() * 2); }
      var ultAct = creado + Math.floor(rand() * Math.max(1, (hoy - creado) / DIA)) * DIA;
      if (i % 5 === 0) ultAct = hoy - Math.floor(rand() * 3) * DIA; // algunos recientes
      var lead = {
        id: 'L' + (1000 + i),
        nombre: n[0], zona: n[1],
        whatsapp: '11 ' + (4000 + Math.floor(rand() * 5999)) + ' ' + (1000 + Math.floor(rand() * 8999)),
        email: n[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/\.$/, '') + '@gmail.com',
        origen: ORIGENES[Math.floor(rand() * ORIGENES.length)],
        respuestas: resp,
        etapa: etapa,
        asignado: EQUIPO[i % 3].id,
        creadoEl: creado,
        ultimaActividad: Math.min(ultAct, hoy),
        actividad: [{ t: creado, tipo: 'alta', texto: 'Completó el wizard de la landing' }],
        notas: [], tareas: []
      };
      if (etapa !== 'nuevo') lead.actividad.push({ t: creado + DIA, tipo: 'llamada', texto: 'Primer contacto por WhatsApp' });
      if (['reunion','visita','propuesta','firmado'].indexOf(etapa) >= 0) lead.actividad.push({ t: creado + 3 * DIA, tipo: 'reunion', texto: 'Reunión inicial por videollamada' });
      if (['visita','propuesta','firmado'].indexOf(etapa) >= 0) lead.actividad.push({ t: creado + 7 * DIA, tipo: 'visita', texto: 'Visitó el local de Castelar' });
      if (['propuesta','firmado'].indexOf(etapa) >= 0) lead.actividad.push({ t: creado + 10 * DIA, tipo: 'propuesta', texto: 'Se envió la proyección y la propuesta' });
      if (etapa === 'firmado') lead.actividad.push({ t: creado + 16 * DIA, tipo: 'firma', texto: '🏆 ¡Firmó el contrato de franquicia!' });
      if (etapa === 'perdido') { lead.motivoPerdida = rand() > .5 ? 'Sin capital por ahora' : 'Eligió otro rubro'; lead.actividad.push({ t: creado + 6 * DIA, tipo: 'perdido', texto: 'Se marcó como perdido: ' + lead.motivoPerdida }); }
      lead.actividad.sort(function(a,b){return a.t-b.t});
      lead.ultimaActividad = lead.actividad[lead.actividad.length - 1].t;
      leads.push(lead);
    });
    return leads;
  }

  /* ═══════════════ ESTADO ═══════════════ */
  var state = null;
  function defaults() {
    return {
      leads: seedLeads(),
      reglas: JSON.parse(JSON.stringify(REGLAS_DEFAULT)),
      config: { metaMensualFirmas: 4, slaDias: SLA_DIAS, usuario: 'vale' },
      gam: { xp: 120, logros: ['primer_lead', 'racha_3', 'cinco_reuniones'], racha: 4, seccionesVistas: [] },
      _v: 1
    };
  }
  function load() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      state = raw ? JSON.parse(raw) : defaults();
    } catch (e) { state = defaults(); }
    if (!state || !Array.isArray(state.leads) || !state.leads.length) state = defaults();
    /* migración defensiva: estados de versiones viejas completan claves faltantes */
    var base = defaults();
    ['reglas', 'config', 'gam'].forEach(function (k) {
      if (!state[k]) state[k] = base[k];
      else for (var kk in base[k]) if (state[k][kk] == null) state[k][kk] = base[k][kk];
    });
    return state;
  }
  function save() {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    try { global.dispatchEvent(new CustomEvent('crm:cambio')); } catch (e) {}
  }
  function reset() { state = defaults(); save(); }

  /* ═══════════════ API ═══════════════ */
  function conScore(lead) {
    var s = calcularScore(lead.respuestas);
    lead.score = s.score; lead.scoreDetalle = s.detalle; lead.segmento = segmento(s.score);
    return lead;
  }
  function leads(filtro) {
    var out = state.leads.map(conScore);
    if (filtro && filtro.etapa) out = out.filter(function (l) { return l.etapa === filtro.etapa; });
    return out;
  }
  function lead(id) { var l = state.leads.find(function (x) { return x.id === id; }); return l ? conScore(l) : null; }
  function agregarLead(datos) {
    var id = 'L' + (1000 + state.leads.length) + '-' + Math.floor(Math.random() * 999);
    var l = {
      id: id, nombre: datos.nombre, zona: datos.zona, whatsapp: datos.whatsapp, email: datos.email,
      origen: datos.origen || 'Landing demo', respuestas: datos.respuestas,
      etapa: 'nuevo', asignado: EQUIPO[state.leads.length % 3].id,
      creadoEl: Date.now(), ultimaActividad: Date.now(),
      actividad: [{ t: Date.now(), tipo: 'alta', texto: 'Completó el wizard de la landing' }],
      notas: [], tareas: [], nuevoDemo: true
    };
    state.leads.unshift(l); save();
    return conScore(l);
  }
  function moverLead(id, etapa) {
    var l = state.leads.find(function (x) { return x.id === id; }); if (!l) return null;
    var desde = l.etapa; l.etapa = etapa; l.ultimaActividad = Date.now();
    var nombreEtapa = etapa === 'perdido' ? 'Perdido' : (ETAPAS.find(function (e) { return e.id === etapa; }) || {}).nombre;
    l.actividad.push({ t: Date.now(), tipo: etapa === 'firmado' ? 'firma' : 'movimiento', texto: 'Pasó de ' + etiquetaEtapa(desde) + ' a ' + nombreEtapa });
    if (etapa === 'firmado' && !l.xpFirmaDado) { l.xpFirmaDado = true; sumarXP(100, 'primera_firma'); }
    save(); return conScore(l);
  }
  function etiquetaEtapa(id) {
    if (id === 'perdido') return 'Perdido';
    var e = ETAPAS.find(function (x) { return x.id === id; }); return e ? e.nombre : id;
  }
  function agregarActividad(id, tipo, texto) {
    var l = state.leads.find(function (x) { return x.id === id; }); if (!l) return;
    l.actividad.push({ t: Date.now(), tipo: tipo, texto: texto });
    l.ultimaActividad = Date.now(); sumarXP(5); save();
  }
  function agregarNota(id, texto) {
    var l = state.leads.find(function (x) { return x.id === id; }); if (!l) return;
    l.notas.push({ t: Date.now(), texto: texto }); l.ultimaActividad = Date.now(); sumarXP(5); save();
  }
  function setReglas(nuevas) {
    state.reglas = nuevas; sumarXP(0, 'scoring_pro'); save();
  }
  function diasSinActividad(l) { return Math.floor((Date.now() - l.ultimaActividad) / 86400000); }
  function enSLA(l) { return diasSinActividad(l) <= state.config.slaDias; }

  /* gamificación */
  function sumarXP(xp, logroId) {
    state.gam.xp += xp || 0;
    if (logroId && state.gam.logros.indexOf(logroId) < 0) {
      var lg = LOGROS.find(function (x) { return x.id === logroId; });
      if (lg) { state.gam.logros.push(logroId); state.gam.xp += lg.xp; state.gam.ultimoLogro = logroId; }
    }
  }
  function nivel() {
    var n = NIVELES[0];
    NIVELES.forEach(function (x) { if (state.gam.xp >= x.min) n = x; });
    var idx = NIVELES.indexOf(n), sig = NIVELES[idx + 1];
    return { actual: n, siguiente: sig, progreso: sig ? Math.round(100 * (state.gam.xp - n.min) / (sig.min - n.min)) : 100 };
  }
  function marcarSeccion(id) {
    if (state.gam.seccionesVistas.indexOf(id) < 0) {
      state.gam.seccionesVistas.push(id);
      if (state.gam.seccionesVistas.length >= 7) sumarXP(0, 'explorador');
      save();
    }
  }

  /* logros que dependen del estado global */
  function evaluarLogros() {
    var m = metricas();
    if (m.firmadosMes >= state.config.metaMensualFirmas) sumarXP(0, 'meta_mes');
    var activos = state.leads.filter(function (l) { return l.etapa !== 'firmado' && l.etapa !== 'perdido'; });
    if (activos.length && m.fueraSLA === 0) sumarXP(0, 'cero_frios');
  }
  /* métricas para dashboard */
  function metricas() {
    var ls = leads(), hoy = new Date(), mesActual = hoy.getFullYear() + '-' + (hoy.getMonth() + 1);
    var m = {
      total: ls.length,
      porEtapa: {}, porSegmento: { caliente: 0, tibio: 0, frio: 0 },
      porOrigen: {}, porZona: {},
      nuevosMes: 0, firmadosMes: 0, perdidos: 0,
      fueraSLA: 0, scoreProm: 0,
      serieSemanal: [], funnel: []
    };
    ETAPAS.forEach(function (e) { m.porEtapa[e.id] = 0; });
    m.porEtapa.perdido = 0;
    var sumScore = 0;
    ls.forEach(function (l) {
      m.porEtapa[l.etapa] = (m.porEtapa[l.etapa] || 0) + 1;
      m.porSegmento[l.segmento.id]++;
      m.porOrigen[l.origen] = (m.porOrigen[l.origen] || 0) + 1;
      m.porZona[l.zona] = (m.porZona[l.zona] || 0) + 1;
      sumScore += l.score;
      var d = new Date(l.creadoEl);
      if ((d.getFullYear() + '-' + (d.getMonth() + 1)) === mesActual) m.nuevosMes++;
      if (l.etapa === 'perdido') m.perdidos++;
      if (l.etapa === 'firmado') {
        var f = l.actividad.filter(function (a) { return a.tipo === 'firma'; }).pop();
        if (f) { var df = new Date(f.t); if ((df.getFullYear() + '-' + (df.getMonth() + 1)) === mesActual) m.firmadosMes++; }
      }
      if (l.etapa !== 'firmado' && l.etapa !== 'perdido' && !enSLA(l)) m.fueraSLA++;
    });
    m.scoreProm = ls.length ? Math.round(sumScore / ls.length) : 0;
    // serie: leads creados por semana (últimas 10)
    for (var w = 9; w >= 0; w--) {
      var ini = Date.now() - (w + 1) * 7 * 86400000, fin = Date.now() - w * 7 * 86400000;
      m.serieSemanal.push(ls.filter(function (l) { return l.creadoEl >= ini && l.creadoEl < fin; }).length);
    }
    // funnel acumulado: cuántos llegaron al menos a cada etapa
    var orden = ['nuevo', 'contactado', 'reunion', 'visita', 'propuesta', 'firmado'];
    orden.forEach(function (et, i) {
      var n = ls.filter(function (l) {
        if (l.etapa === 'perdido') return false;
        return orden.indexOf(l.etapa) >= i;
      }).length;
      m.funnel.push({ etapa: etiquetaEtapa(et), n: n });
    });
    return m;
  }

  /* export CSV del pipeline */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function exportCSV() {
    var s = 'ID;Nombre;Zona;Origen;Etapa;Score;Segmento;Capital;Timeline;Creado;Asignado\r\n';
    leads().forEach(function (l) {
      s += [l.id, l.nombre, l.zona, l.origen, etiquetaEtapa(l.etapa), l.score, l.segmento.nombre,
            (PREGUNTAS.capital.opciones[l.respuestas.capital] || {}).t || '',
            (PREGUNTAS.timeline.opciones[l.respuestas.timeline] || {}).t || '',
            new Date(l.creadoEl).toISOString().slice(0, 10),
            (EQUIPO.find(function (e) { return e.id === l.asignado; }) || {}).nombre || ''].map(csvCell).join(';') + '\r\n';
    });
    return s;
  }

  load();

  /* Sincronización entre pestañas: si la landing escribe un lead en otra pestaña,
     esta recarga el estado antes de pisarlo con un save propio. */
  try {
    global.addEventListener('storage', function (e) {
      if (e && e.key === LS_KEY) {
        load();
        try { global.dispatchEvent(new CustomEvent('crm:cambio')); } catch (err) {}
      }
    });
  } catch (e) {}

  global.CRM = {
    PREGUNTAS: PREGUNTAS, NECESITA: NECESITA, ZONAS: ZONAS, ORIGENES: ORIGENES,
    ETAPAS: ETAPAS, LOGROS: LOGROS, NIVELES: NIVELES, EQUIPO: EQUIPO,
    REGLAS_DEFAULT: REGLAS_DEFAULT,
    state: function () { return state; },
    leads: leads, lead: lead, agregarLead: agregarLead, moverLead: moverLead,
    agregarActividad: agregarActividad, agregarNota: agregarNota,
    calcularScore: calcularScore, segmento: segmento, setReglas: setReglas,
    diasSinActividad: diasSinActividad, enSLA: enSLA, etiquetaEtapa: etiquetaEtapa,
    metricas: metricas, exportCSV: exportCSV, evaluarLogros: function(){ evaluarLogros(); save(); },
    nivel: nivel, sumarXP: function (x, l) { sumarXP(x, l); save(); }, marcarSeccion: marcarSeccion,
    save: save, reset: reset
  };
})(window);
