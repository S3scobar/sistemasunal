/* ==============================================================================
   PORTAL WEB OFICIAL · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL SEDE MEDELLÍN
   Arquitectura de software, maquetación y desarrollo integral por:
   Santiago Escobar Arias · Representante Estudiantil de Sistemas e Informática
   Facultad de Minas — Universidad Nacional de Colombia, Sede Medellín
   Contacto: saescobara@unal.edu.co | Instagram: @s_escobar__ | WhatsApp: (+57) 312 377 2091
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c
   Todos los derechos reservados © 2026. Ver LICENSE.
   ============================================================================== */

/* =============================================
   MI AVANCE · EXTRAS DE EXPERIENCIA
   Progreso hacia cada logro, escasez, detalle, celebración al desbloquear,
   racha de visitas, rangos y tarjetas para compartir (imagen PNG generada en el navegador).
   Todo es local: no envía nada a ningún servidor.
   ============================================= */

const EXTRAS = (() => {
  'use strict';

  const URL_WEB = 'sistemasunal.vercel.app';
  const MONO = "ui-monospace, 'JetBrains Mono', 'Fira Code', SFMono-Regular, Menlo, Consolas, monospace";
  const TEXTO = "'Barlow', system-ui, sans-serif";

  const RAREZAS = {
    bronce: { etiqueta: 'BRONCE', texto: '#fb923c', a: '#f97316', b: '#c2410c', brillo: 'rgba(249,115,22,' },
    plata: { etiqueta: 'PLATA', texto: '#7dd3fc', a: '#38bdf8', b: '#0284c7', brillo: 'rgba(56,189,248,' },
    oro: { etiqueta: 'ORO', texto: '#f7b61a', a: '#fbbf24', b: '#d97706', brillo: 'rgba(247,182,26,' },
    mitico: { etiqueta: 'MÍTICO', texto: '#ff9eb1', a: '#ff4d6d', b: '#ffb703', brillo: 'rgba(255,77,109,' },
    platino: { etiqueta: 'PLATINO', texto: '#f0abfc', a: '#c084fc', b: '#f472b6', brillo: 'rgba(192,132,252,' },
  };
  const rareza = (c) => RAREZAS[c] || RAREZAS.bronce;

  const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const reducirMovimiento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Rangos por nivel ---------- */
  const RANGOS = [
    [1, 'Iniciado en el gran camino'], [10, 'Aprendiz de código'], [25, 'Desarrollador'], [45, 'Ingeniero en formación'],
    [65, 'Arquitecto de software'], [85, 'Líder técnico'], [100, 'Ingeniería de Sistemas'],
  ];
  function rangoNivel(nivel) {
    let r = RANGOS[0][1];
    RANGOS.forEach(([desde, nombre]) => { if (nivel >= desde) r = nombre; });
    return r;
  }

  /* Créditos que faltan para el siguiente nivel (nivel = % de créditos aprobados) */
  function faltanParaSiguienteNivel(avance) {
    if (avance.nivel >= 100 || !avance.exigidos) return null;
    const meta = Math.ceil(((avance.nivel + 1) * avance.exigidos) / 100 - 1e-9);
    return Math.max(1, meta - avance.aprobados);
  }

  /* ---------- Escasez según la comunidad ---------- */
  function escasez(pct) {
    if (pct === null || pct === undefined) return null;
    if (pct <= 0) return { id: 'nadie', texto: 'Nadie lo tiene aún' };
    if (pct < 5) return { id: 'ultra', texto: 'Ultra raro' };
    if (pct < 15) return { id: 'raro', texto: 'Raro' };
    if (pct < 40) return { id: 'poco', texto: 'Poco común' };
    return { id: 'comun', texto: 'Común' };
  }

  /* ---------- Progreso hacia un logro (solo reglas que se pueden medir) ---------- */
  function progresoLogro(l, avance, historia) {
    const r = l.regla || {};
    const min = Number(r.minimo);
    const barra = (actual, meta, texto) => {
      const pct = meta > 0 ? Math.max(0, Math.min(100, (actual / meta) * 100)) : 0;
      return { pct, texto };
    };
    switch (r.tipo) {
      case 'creditos_aprobados': {
        const f = Math.max(0, min - avance.aprobados);
        return barra(avance.aprobados, min, `${avance.aprobados} de ${min} créditos · te faltan ${f}`);
      }
      case 'avance':
        return barra(avance.porcentaje, min, `${fmt(avance.porcentaje, 1)} % de ${fmt(min)} % de avance`);
      case 'componente_completo':
      case 'todas_nota_tipologia': {
        const f = historia.resumen[r.clave];
        if (!f || !f.exigidos) return null;
        const falta = Math.max(0, f.exigidos - f.aprobados);
        return barra(f.aprobados, f.exigidos, `${f.aprobados} de ${f.exigidos} créditos del componente · te faltan ${falta}`);
      }
      case 'materias_aprobadas':
        return barra(avance.materiasAprobadas, min, `${avance.materiasAprobadas} de ${min} asignaturas aprobadas`);
      case 'materias_con_nota': {
        const nota = Number(r.nota || 5);
        const c = historia.materias.filter((m) => m.estado === 'APROBADA' && m.nota !== null && m.nota >= nota).length;
        return barra(c, min, `${c} de ${min} asignaturas con ${fmt(nota, 1)}`);
      }
      case 'papa': {
        if (historia.papa === null) return null;
        const base = 3;
        return barra(historia.papa - base, min - base, `PAPA ${fmt(historia.papa, 1)} · meta ${fmt(min, 1)}`);
      }
      case 'avance_y_papa': {
        const minA = Number(r.minimoAvance || 80); const minP = Number(r.minimoPapa || 4.3);
        const a = Math.min(1, avance.porcentaje / minA);
        const p = historia.papa === null ? 0 : Math.max(0, Math.min(1, (historia.papa - 3) / (minP - 3)));
        return { pct: Math.min(a, p) * 100, texto: `Avance ${fmt(avance.porcentaje, 1)} % de ${minA} % · PAPA ${historia.papa === null ? '—' : fmt(historia.papa, 1)} (más de ${fmt(minP, 1)})` };
      }
      case 'speedrun':
        return barra(avance.porcentaje, 100, `${fmt(avance.porcentaje, 1)} % de la carrera · llevas ${avance.semestresCursados} semestres (meta: menos de 10)`);
      case 'ingles_completo': {
        const c = historia.materias.filter((m) => m.estado === 'APROBADA' && /INGLES|ENGLISH/.test(normalizarTexto(m.nombre))).length;
        return barra(Math.min(c, 4), 4, `${Math.min(c, 4)} de 4 niveles de inglés`);
      }
      case 'semestre_sin_perder': {
        const meta = Number(r.creditos || 20);
        const por = new Map();
        historia.materias.forEach((m) => {
          if (!m.periodo || normalizarTexto(m.modalidad) !== 'ORDINARIA' || m.estado === 'CANCELADA') return;
          const k = clavePeriodo(m.periodo);
          const f = por.get(k) || { c: 0, perdio: false, abierto: false };
          f.c += m.creditos;
          if (m.estado === 'REPROBADA') f.perdio = true;
          if (m.estado !== 'APROBADA' && m.estado !== 'REPROBADA') f.abierto = true;
          por.set(k, f);
        });
        const mejor = Math.max(0, ...[...por.values()].filter((f) => !f.abierto && !f.perdio).map((f) => f.c));
        return barra(mejor, meta, `Tu mejor semestre limpio: ${mejor} de ${meta} créditos`);
      }
      default:
        return null;
    }
  }

  /* ---------- Racha de visitas (solo en este dispositivo) ---------- */
  const CLAVE_RACHA = 'sistemasunal.avance.racha.v1';
  const hoyTexto = () => new Date().toLocaleDateString('en-CA');
  function registrarVisita() {
    let r = { ultimo: null, dias: 0, mejor: 0 };
    try { r = { ...r, ...(JSON.parse(localStorage.getItem(CLAVE_RACHA)) || {}) }; } catch { /* sin almacenamiento */ }
    const hoy = hoyTexto();
    if (r.ultimo !== hoy) {
      const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
      r.dias = r.ultimo === ayer.toLocaleDateString('en-CA') ? r.dias + 1 : 1;
      r.mejor = Math.max(r.mejor || 0, r.dias);
      r.ultimo = hoy;
      try { localStorage.setItem(CLAVE_RACHA, JSON.stringify(r)); } catch { /* sin almacenamiento */ }
    }
    return r;
  }

  /* ---------- Logros ya vistos (para celebrar solo lo nuevo) ---------- */
  const claveVistos = (id) => `sistemasunal.avance.vistos.v1:${id || 'local'}`;
  function leerVistos(id) {
    try { const v = JSON.parse(localStorage.getItem(claveVistos(id))); return Array.isArray(v) ? v : null; } catch { return null; }
  }
  function guardarVistos(id, ids) {
    try { localStorage.setItem(claveVistos(id), JSON.stringify(ids)); } catch { /* sin almacenamiento */ }
  }

  /* ---------- Confeti ligero ---------- */
  function confeti(colores) {
    if (reducirMovimiento()) return;
    const lienzo = document.createElement('canvas');
    lienzo.className = 'confeti';
    lienzo.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lienzo);
    const ctx = lienzo.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = lienzo.width = window.innerWidth * dpr;
    const H = lienzo.height = window.innerHeight * dpr;
    const paleta = colores && colores.length ? colores : ['#2fa8ff', '#8fd2ff', '#f7b61a', '#c084fc', '#f472b6'];
    const piezas = Array.from({ length: 110 }, () => ({
      x: W / 2 + (Math.random() - .5) * W * .25, y: H * .38,
      vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 15 - 4) * dpr,
      g: .42 * dpr, w: (5 + Math.random() * 7) * dpr, h: (3 + Math.random() * 5) * dpr,
      r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: paleta[Math.floor(Math.random() * paleta.length)],
    }));
    const inicio = performance.now();
    (function cuadro(t) {
      const e = t - inicio;
      ctx.clearRect(0, 0, W, H);
      piezas.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= .992;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e / 2600);
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (e < 2600) requestAnimationFrame(cuadro); else lienzo.remove();
    })(inicio);
  }

  /* ---------- Avisos breves ---------- */
  function aviso(texto) {
    let zona = document.getElementById('aviso-juego');
    if (!zona) {
      zona = document.createElement('div');
      zona.id = 'aviso-juego'; zona.className = 'aviso-flotante'; zona.setAttribute('role', 'status'); zona.setAttribute('aria-live', 'polite');
      document.body.appendChild(zona);
    }
    zona.textContent = texto; zona.classList.add('is-visible');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => zona.classList.remove('is-visible'), 3200);
  }

  /* ---------- Diálogo (detalle y celebración) ---------- */
  let dialogo = null;
  let alCerrar = null;
  function obtenerDialogo() {
    if (dialogo) return dialogo;
    dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo-juego';
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });   // clic en el fondo
    dialogo.addEventListener('close', () => { const f = alCerrar; alCerrar = null; if (f) f(); });
    document.body.appendChild(dialogo);
    return dialogo;
  }
  function abrir(html, opciones = {}) {
    const d = obtenerDialogo();
    d.innerHTML = `<button type="button" class="dialogo-juego__cerrar" aria-label="Cerrar">×</button>${html}`;
    d.querySelector('.dialogo-juego__cerrar').addEventListener('click', () => d.close());
    d.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => d.close()));
    alCerrar = opciones.alCerrar || null;
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
    return d;
  }

  const textoRareza = (v) => {
    const e = v.escasez;
    if (!e) return '';
    return e.id === 'nadie' ? 'Nadie lo ha desbloqueado todavía. ¡Sé el primero!' : `Lo tiene el ${fmt(v.pct, 1)} % de los estudiantes · ${e.texto}`;
  };

  /* Tarjeta de un logro dentro del diálogo */
  function cuerpoLogro(v, titulo) {
    const rz = rareza(v.categoria);
    return `
      <div class="dialogo-logro dialogo-logro--${v.categoria} ${v.ok ? 'is-listo' : 'is-bloqueado'}">
        ${titulo ? `<p class="dialogo-logro__titulo">${esc(titulo)}</p>` : ''}
        <span class="dialogo-logro__icono">${v.iconoSvg}</span>
        <span class="logro__rareza logro__rareza--${v.categoria}">${rz.etiqueta}</span>
        <h3 class="dialogo-logro__nombre">${esc(v.nombre)}</h3>
        <p class="dialogo-logro__desc">${esc(v.descripcion)}</p>
        <p class="dialogo-logro__puntos">+${esc(v.puntos)} pts</p>
        ${v.escasez ? `<p class="dialogo-logro__escasez dialogo-logro__escasez--${v.escasez.id}">${esc(textoRareza(v))}</p>` : ''}
        ${v.requisitos ? `<ul class="dialogo-requisitos">${v.requisitos.map((r) => `<li class="${r.ok ? 'is-ok' : ''}"><span aria-hidden="true">${r.ok ? '✔' : '○'}</span>${esc(r.nombre)}</li>`).join('')}</ul>` : ''}
        ${!v.ok && v.progreso ? `<div class="dialogo-logro__progreso"><div class="progreso-barra"><span style="width:${v.progreso.pct}%"></span></div><p>${esc(v.progreso.texto)}</p></div>` : ''}
        ${!v.ok && !v.progreso ? '<p class="dialogo-logro__pista">Aún bloqueado. Cumple lo que dice la descripción para desbloquearlo.</p>' : ''}
      </div>`;
  }

  function abrirDetalle(v, contexto) {
    const d = abrir(`
      ${cuerpoLogro(v)}
      <div class="dialogo-juego__acciones">
        ${v.ok ? '<button type="button" class="btn-juego btn-juego--principal" data-compartir>Compartir este logro</button>' : ''}
        <button type="button" class="btn-juego" data-cerrar>Cerrar</button>
      </div>`);
    const b = d.querySelector('[data-compartir]');
    if (b) b.addEventListener('click', () => compartirLogro(v, contexto, b));
  }

  /* Celebración: logros nuevos o resumen de bienvenida */
  function celebrar(vistas, contexto, tipo, alCerrarFn) {
    const principal = vistas[0];
    const rz = rareza(principal.categoria);
    const lista = vistas.slice(1, 4);
    const titulo = tipo === 'bienvenida'
      ? `Tu historia desbloqueó ${contexto.totalDesbloqueados} logros`
      : (vistas.length === 1 ? '¡Logro desbloqueado!' : `¡${vistas.length} logros nuevos!`);
    const d = abrir(`
      ${cuerpoLogro({ ...principal, ok: true }, titulo)}
      ${lista.length ? `<ul class="dialogo-lista">${lista.map((v) => `<li class="dialogo-lista__item dialogo-lista__item--${v.categoria}"><span class="dialogo-lista__icono">${v.iconoSvg}</span><span>${esc(v.nombre)}</span><b>+${esc(v.puntos)}</b></li>`).join('')}${vistas.length > 4 ? `<li class="dialogo-lista__mas">y ${vistas.length - 4} más en tu lista</li>` : ''}</ul>` : ''}
      <div class="dialogo-juego__acciones">
        <button type="button" class="btn-juego btn-juego--principal" data-compartir>Compartir ${tipo === 'bienvenida' ? 'mi tarjeta' : 'este logro'}</button>
        <button type="button" class="btn-juego" data-cerrar>Ver mis logros</button>
      </div>`, { alCerrar: alCerrarFn });
    d.querySelector('[data-compartir]').addEventListener('click', (e) => {
      if (tipo === 'bienvenida') compartirJugador(contexto, e.currentTarget); else compartirLogro(principal, contexto, e.currentTarget);
    });
    confeti([rz.a, rz.b, '#8fd2ff', '#ffffff']);
    // El logro mítico merece una celebración doble
    if (principal.categoria === 'mitico') {
      setTimeout(() => confeti(['#ff4d6d', '#ffb703', '#ffd166', '#ffffff']), 500);
      setTimeout(() => confeti(['#ff4d6d', '#ffb703', '#ffd166', '#ffffff']), 1100);
    }
  }

  /* ---------- Tarjetas para compartir (canvas) ---------- */
  function cargarImagenSvg(svg, color) {
    return new Promise((ok) => {
      let s = String(svg || '');
      if (!s.trim().startsWith('<svg')) return ok(null);
      s = s.replace(/currentColor/g, color);
      if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      s = s.replace(/<svg([^>]*)>/, (m, a) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, '')} width="256" height="256">`);
      const img = new Image();
      img.onload = () => ok(img); img.onerror = () => ok(null);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
    });
  }

  function rect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function lineas(ctx, texto, x, y, ancho, alto, max) {
    const palabras = String(texto).split(/\s+/);
    let linea = ''; const out = [];
    palabras.forEach((p) => {
      const prueba = linea ? `${linea} ${p}` : p;
      if (ctx.measureText(prueba).width > ancho && linea) { out.push(linea); linea = p; } else linea = prueba;
    });
    if (linea) out.push(linea);
    const rec = out.slice(0, max);
    if (out.length > max) rec[max - 1] = rec[max - 1].replace(/\s*\S*$/, '…');
    rec.forEach((l, i) => ctx.fillText(l, x, y + i * alto));
    return y + rec.length * alto;
  }

  function fondoTarjeta(ctx, W, H, color) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#04101f'); g.addColorStop(.55, '#07182f'); g.addColorStop(1, '#030a15');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // retícula de puntos
    ctx.fillStyle = 'rgba(47,168,255,.13)';
    for (let x = 30; x < W; x += 46) for (let y = 30; y < H; y += 46) ctx.fillRect(x, y, 3, 3);
    // resplandor
    const r = ctx.createRadialGradient(W / 2, 560, 40, W / 2, 560, 620);
    r.addColorStop(0, `${color}.35)`); r.addColorStop(1, `${color}0)`);
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    // marco
    ctx.strokeStyle = 'rgba(47,168,255,.45)'; ctx.lineWidth = 3; rect(ctx, 28, 28, W - 56, H - 56, 34); ctx.stroke();
  }

  function barraTerminal(ctx, W, ruta) {
    ['#ff5d73', '#f7b61a', '#2fd47a'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(86 + i * 34, 92, 10, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#8fd2ff'; ctx.font = `600 28px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(ruta, 200, 102);
  }

  function pieTarjeta(ctx, W, H, ctxJugador) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8fb3d6'; ctx.font = `500 30px ${TEXTO}`;
    ctx.fillText('Ingeniería de Sistemas e Informática · UNAL Medellín', W / 2, H - 112);
    ctx.fillStyle = '#2fa8ff'; ctx.font = `700 34px ${MONO}`;
    ctx.fillText(`${URL_WEB}/avance`, W / 2, H - 64);
    ctx.textAlign = 'left';
  }

  async function esperarFuentes() {
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([document.fonts.load(`500 30px Barlow`), document.fonts.load(`600 30px Barlow`)]);
      }
    } catch { /* se usan las fuentes del sistema */ }
  }

  async function dibujarTarjetaLogro(v, c) {
    await esperarFuentes();
    const W = 1080; const H = 1350;
    const lienzo = document.createElement('canvas'); lienzo.width = W; lienzo.height = H;
    const ctx = lienzo.getContext('2d');
    const rz = rareza(v.categoria);
    fondoTarjeta(ctx, W, H, rz.brillo);
    barraTerminal(ctx, W, '~/sistemas/logros $ ./compartir');

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8fd2ff'; ctx.font = `700 34px ${MONO}`;
    ctx.fillText(v.ok ? 'LOGRO DESBLOQUEADO' : 'LOGRO POR DESBLOQUEAR', W / 2, 205);

    // icono
    const tam = 300; const ix = (W - tam) / 2; const iy = 235;
    const gr = ctx.createLinearGradient(ix, iy, ix + tam, iy + tam);
    gr.addColorStop(0, rz.a); gr.addColorStop(1, rz.b);
    ctx.shadowColor = `${rz.brillo}.7)`; ctx.shadowBlur = 60;
    ctx.fillStyle = gr; rect(ctx, ix, iy, tam, tam, 66); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; rect(ctx, ix, iy, tam, tam, 66); ctx.stroke();
    const img = await cargarImagenSvg(v.iconoSvg, '#04101f');
    if (img) ctx.drawImage(img, ix + 50, iy + 50, tam - 100, tam - 100);

    // rareza
    ctx.font = `700 30px ${MONO}`;
    const etiqueta = rz.etiqueta; const ew = ctx.measureText(etiqueta).width + 56;
    ctx.fillStyle = `${rz.brillo}.18)`; rect(ctx, (W - ew) / 2, 570, ew, 54, 27); ctx.fill();
    ctx.strokeStyle = `${rz.brillo}.7)`; ctx.lineWidth = 2; rect(ctx, (W - ew) / 2, 570, ew, 54, 27); ctx.stroke();
    ctx.fillStyle = rz.texto; ctx.fillText(etiqueta, W / 2, 608);

    // nombre (si es largo se reduce y la descripción pasa a 2 líneas)
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 86px ${MONO}`;
    const largo = ctx.measureText(v.nombre).width > W - 160;
    ctx.font = `700 ${largo ? 70 : 86}px ${MONO}`;
    let y = lineas(ctx, v.nombre, W / 2, 715, W - 160, largo ? 80 : 96, 2);
    ctx.fillStyle = '#d8ecff'; ctx.font = `500 40px ${TEXTO}`;
    y = lineas(ctx, v.descripcion, W / 2, y + 22, W - 220, 52, largo ? 2 : 3);

    // estadística de comunidad
    const baseY = Math.min(Math.max(y + 78, 1020), 1085);
    ctx.fillStyle = rz.texto; ctx.font = `700 96px ${MONO}`;
    if (v.escasez && v.escasez.id !== 'nadie') {
      ctx.fillText(`${fmt(v.pct, 1)} %`, W / 2, baseY);
      ctx.fillStyle = '#8fb3d6'; ctx.font = `500 32px ${TEXTO}`;
      ctx.fillText(`de los estudiantes lo tiene · ${v.escasez.texto}`, W / 2, baseY + 50);
    } else {
      ctx.fillText(`+${v.puntos} pts`, W / 2, baseY);
      ctx.fillStyle = '#8fb3d6'; ctx.font = `500 32px ${TEXTO}`;
      ctx.fillText(v.escasez ? 'Nadie lo ha desbloqueado aún' : 'Logros de Ingeniería de Sistemas', W / 2, baseY + 50);
    }

    // jugador
    if (c && (c.nombre || c.nivel)) {
      ctx.fillStyle = '#ffffff'; ctx.font = `700 34px ${MONO}`;
      ctx.fillText(`${c.nombre ? c.nombre.slice(0, 28) + ' · ' : ''}Nivel ${c.nivel}`, W / 2, H - 178);
    }
    pieTarjeta(ctx, W, H);
    return lienzo;
  }

  async function dibujarTarjetaJugador(c) {
    await esperarFuentes();
    const W = 1080; const H = 1350;
    const lienzo = document.createElement('canvas'); lienzo.width = W; lienzo.height = H;
    const ctx = lienzo.getContext('2d');
    fondoTarjeta(ctx, W, H, 'rgba(47,168,255,');
    barraTerminal(ctx, W, '~/sistemas/jugador $ ./tarjeta');

    // anillo de nivel
    const cx = W / 2; const cy = 385; const R = 160;
    ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(47,168,255,.18)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); g.addColorStop(0, '#8fd2ff'); g.addColorStop(1, '#2fa8ff');
    ctx.strokeStyle = g; ctx.shadowColor = 'rgba(47,168,255,.8)'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, c.porcentaje / 100)); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.fillStyle = '#8fd2ff'; ctx.font = `700 30px ${MONO}`; ctx.fillText('NIVEL', cx, cy - 84);
    ctx.fillStyle = '#ffffff'; ctx.font = `700 140px ${MONO}`; ctx.fillText(String(c.nivel), cx, cy + 56);

    ctx.fillStyle = '#ffffff'; ctx.font = `700 64px ${MONO}`;
    let y = lineas(ctx, c.nombre || 'Estudiante de Sistemas', cx, 640, W - 140, 72, 2);
    ctx.fillStyle = '#8fd2ff'; ctx.font = `600 36px ${MONO}`;
    ctx.fillText(c.rango, cx, y + 6);

    // cifras
    const cifras = [[fmt(c.puntos), 'PUNTOS'], [`${c.totalDesbloqueados}/${c.totalLogros}`, 'LOGROS'], [`${fmt(c.porcentaje, 1)} %`, 'AVANCE']];
    const cw = 290; const gx = (W - cw * 3 - 30 * 2) / 2; const cy2 = 780;
    cifras.forEach(([v, et], i) => {
      const x = gx + i * (cw + 30);
      ctx.fillStyle = 'rgba(47,168,255,.1)'; rect(ctx, x, cy2, cw, 150, 22); ctx.fill();
      ctx.strokeStyle = 'rgba(47,168,255,.4)'; ctx.lineWidth = 2; rect(ctx, x, cy2, cw, 150, 22); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = `700 58px ${MONO}`; ctx.fillText(v, x + cw / 2, cy2 + 80);
      ctx.fillStyle = '#8fb3d6'; ctx.font = `600 24px ${MONO}`; ctx.fillText(et, x + cw / 2, cy2 + 120);
    });

    // logros más raros
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fd2ff'; ctx.font = `700 28px ${MONO}`;
    if (c.raros.length) {
      ctx.fillText('MIS LOGROS MÁS RAROS', 110, 988);
      for (let i = 0; i < Math.min(3, c.raros.length); i++) {
        const v = c.raros[i]; const rz = rareza(v.categoria); const yy = 1010 + i * 60;
        const gi = ctx.createLinearGradient(110, yy, 110 + 52, yy + 52); gi.addColorStop(0, rz.a); gi.addColorStop(1, rz.b);
        ctx.fillStyle = gi; rect(ctx, 110, yy, 52, 52, 14); ctx.fill();
        const img = await cargarImagenSvg(v.iconoSvg, '#04101f');
        if (img) ctx.drawImage(img, 120, yy + 10, 32, 32);
        ctx.fillStyle = '#ffffff'; ctx.font = `700 32px ${MONO}`; ctx.fillText(v.nombre.slice(0, 26), 182, yy + 37);
        ctx.textAlign = 'right'; ctx.fillStyle = rz.texto; ctx.font = `700 28px ${MONO}`;
        ctx.fillText(v.pct === null ? `+${v.puntos} pts` : (v.pct > 0 ? `${fmt(v.pct, 1)} %` : '¡el primero!'), W - 110, yy + 36); ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = '#8fb3d6'; ctx.font = `500 34px ${TEXTO}`; ctx.fillText('Cada semestre desbloquea nuevos logros.', 110, 1050);
    }
    pieTarjeta(ctx, W, H);
    return lienzo;
  }

  async function compartirCanvas(lienzo, archivo, texto, boton) {
    const original = boton ? boton.textContent : '';
    if (boton) { boton.disabled = true; boton.textContent = 'Preparando…'; }
    try {
      const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/png'));
      if (!blob) throw new Error('sin imagen');
      const file = new File([blob], archivo, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: texto, title: 'Mi avance · Sistemas UNAL' }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }   // la persona cerró el menú de compartir
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = archivo; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      try { await navigator.clipboard.writeText(texto); aviso('Imagen descargada y texto copiado. ¡Pégalo en tu publicación!'); }
      catch { aviso('Imagen descargada. ¡Súbela a tus redes!'); }
    } catch (e) {
      aviso('No se pudo crear la imagen en este navegador.');
    } finally {
      if (boton) { boton.disabled = false; boton.textContent = original; }
    }
  }

  const enlace = () => `https://${URL_WEB}/avance.html`;

  async function compartirLogro(v, c, boton) {
    const lienzo = await dibujarTarjetaLogro(v, c);
    const extra = v.escasez && v.escasez.id !== 'nadie' ? ` Solo el ${fmt(v.pct, 1)} % de los estudiantes lo tiene.` : '';
    const texto = `Desbloqueé «${v.nombre}» en la plataforma de Ingeniería de Sistemas de la UNAL Medellín.${extra} ${enlace()}`;
    return compartirCanvas(lienzo, `logro-${v.id}.png`, texto, boton);
  }

  async function compartirJugador(c, boton) {
    const lienzo = await dibujarTarjetaJugador(c);
    const texto = `Voy en nivel ${c.nivel} con ${c.totalDesbloqueados} logros en la plataforma de Ingeniería de Sistemas de la UNAL Medellín. ¿Y tú? ${enlace()}`;
    return compartirCanvas(lienzo, 'mi-tarjeta-sistemas.png', texto, boton);
  }

  return {
    rareza, rangoNivel, faltanParaSiguienteNivel, escasez, progresoLogro, registrarVisita,
    leerVistos, guardarVistos, abrirDetalle, celebrar, compartirLogro, compartirJugador, aviso, confeti,
    dibujarTarjetaLogro, dibujarTarjetaJugador,
  };
})();
