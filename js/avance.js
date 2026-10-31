/* =============================================
   MÓDULO MI AVANCE — interfaz
   Lee la historia académica pegada (avance-lector.js), la guarda en el navegador
   y dibuja la "pantalla de jugador": nivel, XP, graduación estimada, misiones y logros.
   ============================================= */

const CLAVE_GUARDADO = 'sistemasunal.avance.v1';

const guardado = {
  leer() { try { return JSON.parse(localStorage.getItem(CLAVE_GUARDADO)) || null; } catch (e) { return null; } },
  escribir(datos) { try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos)); return true; } catch (e) { return false; } },
  borrar() { try { localStorage.removeItem(CLAVE_GUARDADO); } catch (e) { /* sin almacenamiento */ } },
};

const estado = { texto: '', nombre: '', ritmo: null, historia: null, logros: [] };

const GRUPOS_COMPONENTE = {
  fundamentacion: { nombre: 'Fundamentación', color: 'var(--fundamentacion)' },
  disciplinar: { nombre: 'Formación disciplinar o profesional', color: 'var(--disciplinar)' },
  libre: { nombre: 'Libre elección', color: 'var(--libre)' },
};

const formatear = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });


/* ---------- Logros (se irán añadiendo en data/logros.json) ---------- */

function logroDesbloqueado(logro, avance, historia) {
  const regla = logro.regla || {};
  const minimo = Number(regla.minimo);
  switch (regla.tipo) {
    case 'creditos_aprobados': return avance.aprobados >= minimo;
    case 'avance': return avance.porcentaje > minimo;
    case 'componente_completo': {
      const fila = historia.resumen[regla.clave];
      return Boolean(fila) && fila.exigidos > 0 && fila.pendientes === 0;
    }
    case 'nota_en_grupo': {
      const claves = TIPOLOGIAS.filter((t) => t.grupo === regla.grupo).map((t) => t.clave);
      return historia.materias.some((m) => m.estado === 'APROBADA' && claves.includes(m.tipologia) && m.nota !== null && m.nota > minimo);
    }
    case 'papa': return historia.papa !== null && historia.papa >= minimo;
    case 'materias_aprobadas': return avance.materiasAprobadas >= minimo;
    default: return false;
  }
}


/* ---------- Pintura ---------- */

function pintarJugador(avance, historia, puntos, totalLogros, desbloqueados) {
  const pasoXp = (avance.aprobados / avance.exigidos) * 100;
  const pasoCurso = Math.min(100 - pasoXp, (avance.inscritos / avance.exigidos) * 100);
  return `
    <section class="jugador" aria-label="Jugador">
      <div class="jugador__avatar">
        <img src="img/logo-sistemas.jpg" alt="" width="88" height="88">
        <span class="jugador__nivel"><small>NIVEL</small><b data-cuenta="${avance.nivel}">${avance.nivel}</b></span>
      </div>
      <div class="jugador__datos">
        <p class="etiqueta-hud">JUGADOR 1</p>
        <label class="jugador__nombre-wrap">
          <span class="visualmente-oculto">Tu nombre</span>
          <input class="jugador__nombre" id="nombre-jugador" type="text" maxlength="40" value="${esc(estado.nombre)}" placeholder="Escribe tu nombre">
        </label>
        <p class="jugador__programa">Ingeniería de Sistemas e Informática · UNAL Medellín</p>
        <div class="xp" role="img" aria-label="${avance.aprobados} de ${avance.exigidos} créditos aprobados">
          <div class="xp__barra">
            <span class="xp__relleno" style="--ancho: ${pasoXp}%"></span>
            <span class="xp__curso" style="--inicio: ${pasoXp}%; --ancho: ${pasoCurso}%"></span>
          </div>
          <div class="xp__texto"><span><b>${avance.aprobados}</b> / ${avance.exigidos} cr · XP</span><span>${formatear(avance.porcentaje, 1)} %</span></div>
        </div>
      </div>
      <div class="jugador__puntos">
        <p class="etiqueta-hud">PUNTOS</p>
        <p class="puntos__valor" data-cuenta="${puntos}">${puntos}</p>
        <p class="puntos__logros">${desbloqueados} / ${totalLogros} logros</p>
      </div>
    </section>`;
}

function pintarEstadisticas(avance, historia) {
  const casillas = [
    { etiqueta: 'Créditos aprobados', valor: avance.aprobados, sufijo: `/${avance.exigidos}`, tono: 'azul' },
    { etiqueta: 'Por cursar', valor: avance.pendientes, tono: 'ambar' },
    { etiqueta: 'Inscritos ahora', valor: avance.inscritos, tono: 'cian' },
    { etiqueta: 'PAPA', valor: historia.papa, decimales: 1, tono: 'azul' },
    { etiqueta: 'Materias aprobadas', valor: avance.materiasAprobadas, tono: 'cian' },
    { etiqueta: 'Semestres cursados', valor: avance.semestresCursados, tono: 'ambar' },
  ].filter((c) => c.valor !== null && c.valor !== undefined);
  return `
    <ul class="estadisticas" aria-label="Estadísticas">
      ${casillas.map((c) => `
        <li class="estadistica estadistica--${c.tono}">
          <span class="estadistica__valor"><b data-cuenta="${c.valor}" data-decimales="${c.decimales || 0}">${formatear(c.valor, c.decimales || 0)}</b>${c.sufijo ? `<small>${c.sufijo}</small>` : ''}</span>
          <span class="estadistica__etiqueta">${esc(c.etiqueta)}</span>
        </li>`).join('')}
    </ul>`;
}

function pintarGraduacion(avance) {
  const etiqueta = avance.graduacion ? etiquetaPeriodo(avance.graduacion) : '';
  const cuerpo = avance.completo
    ? `<p class="meta__valor meta__valor--listo">¡Créditos completos!</p>
       <p class="meta__texto">Ya cubriste los créditos exigidos del plan. Revisa con tu facultad los requisitos de grado.</p>`
    : `<p class="meta__valor">${esc(etiqueta)}</p>
       <p class="meta__texto">Según tu ritmo de <b id="ritmo-valor">${avance.ritmo}</b> créditos por semestre, te faltan <b>${avance.semestresFaltantes}</b> semestre${avance.semestresFaltantes === 1 ? '' : 's'} (contando el que tienes inscrito).</p>
       <label class="meta__ritmo" for="ritmo">
         <span>Cambia el ritmo y mira qué pasa</span>
         <input type="range" id="ritmo" min="6" max="24" step="1" value="${avance.ritmo}">
         <span class="meta__ritmo-escala"><span>6 cr</span><span>24 cr</span></span>
       </label>
       ${avance.ritmo !== avance.ritmoCalculado ? `<button type="button" class="boton-juego boton-juego--suave boton-juego--mini" id="ritmo-reiniciar">Volver a mi ritmo (${avance.ritmoCalculado} cr)</button>` : ''}`;
  return `
    <section class="panel meta" aria-label="Graduación estimada">
      <p class="panel__titulo">Meta final · graduación estimada</p>
      ${cuerpo}
      <p class="meta__aviso">Es una estimación con tu ritmo reciente. Depende de prerrequisitos, oferta de cursos y del trabajo de grado.</p>
    </section>`;
}

function pintarMapa(avance) {
  const maximo = Math.max(24, avance.ritmo, ...avance.historial.map((h) => h.aprobados + h.reprobados), ...avance.proyeccion.map((p) => p.creditos));
  const alto = (c) => `${Math.max(4, (c / maximo) * 100)}%`;
  const columnas = [
    ...avance.historial.map((h) => ({ periodo: h.periodo, tipo: 'hecho', aprobados: h.aprobados, reprobados: h.reprobados })),
    ...avance.proyeccion.map((p) => ({ periodo: p.periodo, tipo: p.tipo, aprobados: p.creditos, reprobados: 0 })),
  ];
  return `
    <section class="panel mapa" aria-label="Mapa de semestres">
      <p class="panel__titulo">Mapa de niveles · créditos por semestre</p>
      <div class="mapa__scroll" tabindex="0">
        <ol class="mapa__lista" style="--columnas: ${columnas.length}">
          ${columnas.map((c) => `
            <li class="mapa__col mapa__col--${c.tipo}">
              <span class="mapa__cr">${c.aprobados + c.reprobados} cr</span>
              <span class="mapa__barra">
                <span class="mapa__tramo mapa__tramo--ok" style="height: ${alto(c.aprobados)}"></span>
                ${c.reprobados ? `<span class="mapa__tramo mapa__tramo--mal" style="height: ${alto(c.reprobados)}"></span>` : ''}
              </span>
              <span class="mapa__periodo">${esc(etiquetaPeriodo(c.periodo))}</span>
              <span class="mapa__marca">${c.tipo === 'hecho' ? '✓' : c.tipo === 'curso' ? '▶' : '◇'}</span>
            </li>`).join('')}
        </ol>
      </div>
      <ul class="mapa__leyenda">
        <li><i class="l-ok"></i>Aprobados</li><li><i class="l-mal"></i>Reprobados</li><li><i class="l-curso"></i>En curso</li><li><i class="l-proy"></i>Proyección</li>
      </ul>
    </section>`;
}

function pintarMisiones(historia) {
  const r = historia.resumen;
  const filas = TIPOLOGIAS.map((t) => ({ ...t, datos: r[t.clave] })).filter((f) => f.datos);
  if (!filas.length) return '';
  return `
    <section class="panel misiones" aria-label="Misiones por componente">
      <p class="panel__titulo">Misiones · avance por componente</p>
      <ul class="misiones__lista">
        ${filas.map((f) => {
          const d = f.datos;
          const completa = d.pendientes === 0 && d.exigidos > 0;
          const pa = d.exigidos ? (d.aprobados / d.exigidos) * 100 : 0;
          const pi = d.exigidos ? Math.min(100 - pa, (d.inscritos / d.exigidos) * 100) : 0;
          return `
            <li class="mision" style="--color: ${GRUPOS_COMPONENTE[f.grupo].color}">
              <div class="mision__cabecera">
                <span class="mision__nombre">${esc(f.nombre)}</span>
                <span class="mision__estado ${completa ? 'mision__estado--lista' : ''}">${completa ? '¡COMPLETA!' : `${d.pendientes} cr por cursar`}</span>
              </div>
              <div class="mision__barra"><span class="mision__relleno" style="--ancho: ${pa}%"></span><span class="mision__curso" style="--inicio: ${pa}%; --ancho: ${pi}%"></span></div>
              <p class="mision__detalle"><b>${d.aprobados}</b> / ${d.exigidos} cr aprobados${d.inscritos ? ` · ${d.inscritos} inscritos` : ''}</p>
            </li>`;
        }).join('')}
      </ul>
    </section>`;
}

function pintarLogros(avance, historia) {
  const lista = estado.logros;
  if (!lista.length) {
    return `
      <section class="panel logros" aria-label="Logros">
        <p class="panel__titulo">Logros</p>
        <ul class="logros__rejilla">
          ${Array.from({ length: 6 }, () => '<li class="logro logro--bloqueado"><span class="logro__icono">?</span><span class="logro__nombre">???</span></li>').join('')}
        </ul>
        <p class="logros__proximamente">Muy pronto: los logros que desbloquearás con tu avance y que sumarán a tus puntos.</p>
      </section>`;
  }
  return `
    <section class="panel logros" aria-label="Logros">
      <p class="panel__titulo">Logros</p>
      <ul class="logros__rejilla">
        ${lista.map((l) => {
          const ok = logroDesbloqueado(l, avance, historia);
          return `<li class="logro ${ok ? 'logro--listo' : 'logro--bloqueado'}">
            <span class="logro__icono">${ok ? '★' : '🔒'}</span>
            <span class="logro__nombre">${esc(l.nombre)}</span>
            <span class="logro__desc">${esc(l.descripcion)}</span>
            <span class="logro__pts">+${esc(l.puntos)} pts</span>
          </li>`;
        }).join('')}
      </ul>
    </section>`;
}

function pintarHistorial(historia) {
  const materias = [...historia.materias].sort((a, b) => clavePeriodo(b.periodo) - clavePeriodo(a.periodo));
  return `
    <details class="panel historial">
      <summary class="panel__titulo panel__titulo--resumen">Bitácora · ${materias.length} materias leídas</summary>
      <div class="historial__tabla-wrap">
        <table class="historial__tabla">
          <thead><tr><th>Materia</th><th>Cr</th><th>Tipo</th><th>Periodo</th><th>Nota</th></tr></thead>
          <tbody>
            ${materias.map((m) => `<tr class="${m.estado === 'REPROBADA' ? 'es-mala' : ''}">
              <td>${esc(m.nombre)} <small>${esc(m.codigo)}</small></td><td>${m.creditos}</td><td>${esc(m.tipologia)}</td>
              <td>${esc(etiquetaPeriodo(m.periodo))}</td><td>${m.nota !== null ? formatear(m.nota, 1) : '—'} <small>${esc(m.estado)}</small></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </details>`;
}

function animarCifras(contenedor) {
  const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  contenedor.querySelectorAll('[data-cuenta]').forEach((el) => {
    const meta = parseFloat(el.dataset.cuenta);
    const dec = parseInt(el.dataset.decimales || '0', 10);
    if (reducido || Number.isNaN(meta) || meta === 0) return;
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      el.textContent = formatear(meta * (1 - (1 - k) ** 3), dec);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

function dibujar() {
  const historia = estado.historia;
  const avance = calcularAvance(historia, estado.ritmo);
  const desbloqueados = estado.logros.filter((l) => logroDesbloqueado(l, avance, historia));
  const puntos = desbloqueados.reduce((s, l) => s + (Number(l.puntos) || 0), 0);

  const juego = $('#avance-juego');
  juego.hidden = false;
  juego.innerHTML = `
    ${historia.esSistemas ? '' : '<p class="aviso-juego">Ojo: no veo «Ingeniería de Sistemas e Informática» en lo que pegaste. Las cuentas usan el plan de 160 créditos.</p>'}
    ${pintarJugador(avance, historia, puntos, estado.logros.length, desbloqueados.length)}
    ${pintarEstadisticas(avance, historia)}
    <div class="avance__dos">
      ${pintarGraduacion(avance)}
      ${pintarMisiones(historia)}
    </div>
    ${pintarMapa(avance)}
    ${pintarLogros(avance, historia)}
    ${pintarHistorial(historia)}`;
  animarCifras(juego);

  $('#nombre-jugador').addEventListener('input', (e) => { estado.nombre = e.target.value; persistir(); });
  const ritmo = $('#ritmo');
  if (ritmo) {
    ritmo.addEventListener('input', (e) => { $('#ritmo-valor').textContent = e.target.value; });
    ritmo.addEventListener('change', (e) => { estado.ritmo = Number(e.target.value); persistir(); dibujar(); });
  }
  const reiniciar = $('#ritmo-reiniciar');
  if (reiniciar) reiniciar.addEventListener('click', () => { estado.ritmo = null; persistir(); dibujar(); });
}

function persistir() { guardado.escribir({ texto: estado.texto, nombre: estado.nombre, ritmo: estado.ritmo }); }

function mostrarError(mensaje) {
  const caja = $('#entrada-error');
  caja.textContent = mensaje;
  caja.hidden = !mensaje;
}

function procesar(texto, esCargaInicial) {
  const historia = leerHistoria(texto);
  if (!historia.materias.length) {
    mostrarError('No encontré materias en lo que pegaste. Abre la Historia Académica en el SIA, selecciona todo (Ctrl + A), copia (Ctrl + C) y pega de nuevo.');
    return false;
  }
  mostrarError('');
  estado.texto = texto;
  estado.historia = historia;
  if (!esCargaInicial || !estado.nombre) estado.nombre = estado.nombre || historia.nombre || '';
  $('#btn-borrar').hidden = false;
  dibujar();
  $('#entrada').open = false;
  return true;
}

function iniciar() {
  cargarDatos('logros').then((d) => { estado.logros = d.logros || []; }).catch(() => { estado.logros = []; })
    .then(() => {
      const previo = guardado.leer();
      if (previo && previo.texto) {
        estado.nombre = previo.nombre || '';
        estado.ritmo = previo.ritmo || null;
        $('#historia-texto').value = previo.texto;
        procesar(previo.texto, true);
      }
    });

  $('#btn-guardar').addEventListener('click', () => {
    const texto = $('#historia-texto').value.trim();
    if (!texto) { mostrarError('Pega primero tu historia académica.'); return; }
    if (procesar(texto, false)) {
      persistir();
      $('#avance-juego').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  $('#btn-borrar').addEventListener('click', () => {
    guardado.borrar();
    estado.texto = ''; estado.nombre = ''; estado.ritmo = null; estado.historia = null;
    $('#historia-texto').value = '';
    $('#avance-juego').hidden = true;
    $('#avance-juego').innerHTML = '';
    $('#btn-borrar').hidden = true;
    $('#entrada').open = true;
  });
}

iniciar();
