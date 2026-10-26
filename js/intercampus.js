/* =============================================
   MÓDULO RUTAS INTERCAMPUS
   Muestra los horarios del semestre 2026-2S,
   calcula la próxima salida en tiempo real
   y presenta el funcionamiento de conexión entre campus.
   ============================================= */

let datosIntercampus = null;
let rutaActivaId = 'robledo-volador';
let franjaFiltro = 'todas';
let filtroEstacionMetro = 'todas';

// Convierte 'HH:MM' a minutos desde la medianoche
function horaEnMinutos(cadenaHora) {
  const [h, m] = cadenaHora.split(':').map(Number);
  return h * 60 + m;
}

// Obtiene los minutos actuales del día según la hora local
function minutosActuales() {
  const ahora = new Date();
  return ahora.getHours() * 60 + ahora.getMinutes();
}

// Inicia el módulo cargando los datos
cargarDatos('intercampus')
  .then((datos) => {
    datosIntercampus = datos;
    inicializarModulo();
  })
  .catch((err) => {
    mostrarErrorDeCarga($('#intercampus-contenido'), err);
  });

function inicializarModulo() {
  renderizarBotonesRuta();
  renderizarContenidoRuta();
  iniciarVisorModal();

  // Actualiza la próxima salida periódicamente
  setInterval(() => {
    if (rutaActivaId !== 'guia') {
      actualizarProximaSalida();
    }
  }, 30000);
}

function renderizarBotonesRuta() {
  const contenedorTabs = $('#intercampus-tabs');
  if (!contenedorTabs) return;

  const tabs = [
    { id: 'robledo-volador', texto: 'Robledo ➔ El Volador', icono: 'bus' },
    { id: 'volador-robledo', texto: 'El Volador ➔ Robledo', icono: 'bus' },
    { id: 'rio-volador', texto: 'Río ➔ El Volador', icono: 'bus' },
    { id: 'metro', texto: 'Estaciones Metro', icono: 'metro' },
    { id: 'guia', texto: '¿Cómo funciona?', icono: 'info' }
  ];

  contenedorTabs.innerHTML = tabs.map((t) => `
    <li>
      <button class="intercampus__tab-btn ${t.id === rutaActivaId ? 'activo' : ''}" data-ruta="${t.id}">
        ${t.icono === 'bus'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="15" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 10h14M8 6h.01M16 6h.01"/></svg>`
          : t.icono === 'metro'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M9 15h.01M15 15h.01"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`}
        ${t.texto}
      </button>
    </li>
  `).join('');

  contenedorTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.intercampus__tab-btn');
    if (!btn) return;
    rutaActivaId = btn.dataset.ruta;
    franjaFiltro = 'todas';
    filtroEstacionMetro = 'todas';
    $$('.intercampus__tab-btn', contenedorTabs).forEach((b) => b.classList.toggle('activo', b === btn));
    renderizarContenidoRuta();
  });
}

function renderizarContenidoRuta() {
  const contenedor = $('#intercampus-contenido');
  if (!contenedor || !datosIntercampus) return;

  if (rutaActivaId === 'guia') {
    renderizarGuia(contenedor);
    return;
  }

  if (rutaActivaId === 'metro') {
    renderizarMetro(contenedor);
    return;
  }

  const ruta = datosIntercampus.rutas.find((r) => r.id === rutaActivaId);
  if (!ruta) return;

  // Recopilar todas las horas de la ruta
  const todasLasHoras = ruta.franjas.flatMap((f) => f.horarios);
  const minActual = minutosActuales();

  // Buscar la próxima salida
  let proxima = todasLasHoras.find((h) => horaEnMinutos(h) >= minActual);
  let textoProxima = '';
  let tiempoRestante = '';

  if (proxima) {
    const diff = horaEnMinutos(proxima) - minActual;
    tiempoRestante = diff === 0 ? '¡Saliendo ahora!' : diff === 1 ? 'Sale en 1 minuto' : `Sale en ${diff} minutos`;
  } else {
    proxima = todasLasHoras[0];
    tiempoRestante = 'Servicio finalizado por hoy · Primera salida de mañana';
  }

  // Lista de franjas disponibles para filtrar
  const numerosFranjas = ruta.franjas.map((f) => f.franja);

  contenedor.innerHTML = `
    <!-- PANEL PRÓXIMA SALIDA -->
    <div class="proxima-salida">
      <div class="proxima-salida__meta">
        <span class="proxima-salida__etiqueta">
          <span class="proxima-salida__pulso"></span>
          Horario en tiempo real · Semestre ${esc(datosIntercampus.semestre)}
        </span>
        <h3 class="proxima-salida__titulo">${esc(ruta.titulo)}</h3>
        <p class="proxima-salida__subtitulo">${esc(ruta.subtitulo)}</p>
      </div>
      <div class="proxima-salida__caja">
        <span class="proxima-salida__hora">${proxima}</span>
        <span class="proxima-salida__tiempo">${tiempoRestante}</span>
      </div>
    </div>

    <!-- CABECERA Y FILTROS DE FRANJA -->
    <div class="intercampus__cabecera-ruta">
      <div>
        <h3 class="intercampus__titulo-ruta">Horarios por franja</h3>
        <p class="intercampus__subtitulo-ruta">Selecciona una franja o consulta todas las salidas del día.</p>
      </div>

      <ul class="intercampus__filtros-franja" id="filtros-franja">
        <li>
          <button class="intercampus__filtro-btn ${franjaFiltro === 'todas' ? 'activo' : ''}" data-franja="todas">
            Todas
          </button>
        </li>
        ${numerosFranjas.map((n) => `
          <li>
            <button class="intercampus__filtro-btn ${franjaFiltro === String(n) ? 'activo' : ''}" data-franja="${n}">
              Franja ${n}
            </button>
          </li>
        `).join('')}
      </ul>
    </div>

    <!-- GRILLA DE FRANJAS -->
    <div class="franjas-grid" id="franjas-grid">
      ${renderizarFranjas(ruta, minActual, proxima)}
    </div>
    </div>
  `;

  // Asignar listeners a los botones de filtro de franja
  const contenedorFiltros = $('#filtros-franja');
  if (contenedorFiltros) {
    contenedorFiltros.addEventListener('click', (e) => {
      const btn = e.target.closest('.intercampus__filtro-btn');
      if (!btn) return;
      franjaFiltro = btn.dataset.franja;
      $$('.intercampus__filtro-btn', contenedorFiltros).forEach((b) => b.classList.toggle('activo', b === btn));
      $('#franjas-grid').innerHTML = renderizarFranjas(ruta, minutosActuales(), proxima);
    });
  }
}

function renderizarFranjas(ruta, minActual, proximaHora) {
  const franjasMostrar = franjaFiltro === 'todas'
    ? ruta.franjas
    : ruta.franjas.filter((f) => String(f.franja) === franjaFiltro);

  return franjasMostrar.map((f) => {
    const tieneProxima = f.horarios.includes(proximaHora);
    return `
      <div class="franja-card ${tieneProxima ? 'franja-card--activa' : ''}">
        <div class="franja-card__encabezado">
          <span class="franja-card__numero">Franja ${f.franja}</span>
          <span class="franja-card__tag">${f.horarios.length} salidas</span>
        </div>
        <ul class="franja-card__horarios">
          ${f.horarios.map((h) => {
            const hMin = horaEnMinutos(h);
            const esProxima = h === proximaHora;
            const esPasada = hMin < minActual;
            const clase = esProxima ? 'hora-chip--proxima' : (esPasada ? 'hora-chip--pasada' : '');
            const tituloAttr = esProxima ? 'Próxima salida estimada' : (esPasada ? 'Horario ya transcurrido hoy' : 'Salida programada');
            return `<li class="hora-chip ${clase}" title="${tituloAttr}">${h}</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function renderizarGuia(contenedor) {
  const datos = datosIntercampus;
  contenedor.innerHTML = `
    <div class="guia-intercampus">
      <h3 class="guia-intercampus__titulo">Así funciona el Intercampus</h3>
      <span class="guia-intercampus__semestre">Semestre ${esc(datos.semestre)}</span>

      <!-- DIAGRAMA VISUAL -->
      <div class="diagrama-rutas">
        <div class="diagrama-rutas__flujo">
          <div class="campus-nodo">
            <small>Campus</small>
            <strong>Río</strong>
          </div>
          <span class="flecha-conector">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
          <div class="campus-nodo">
            <small>Campus</small>
            <strong>El Volador</strong>
          </div>
          <span class="flecha-conector">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
          <div class="campus-nodo">
            <small>Campus</small>
            <strong>Robledo</strong>
          </div>
        </div>
        <div class="diagrama-rutas__retorno">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 14-5-5 5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
          Desde Robledo también sale una ruta directa a El Volador
        </div>
      </div>

      <!-- 4 PASOS OFICIALES -->
      <ul class="guia-pasos">
        ${datos.pasos.map((p) => `
          <li class="paso-card">
            <span class="paso-card__num">${p.numero}</span>
            <div class="paso-card__contenido">
              <h4>${esc(p.titulo)}</h4>
              <p>${esc(p.descripcion)}</p>
            </div>
          </li>
        `).join('')}
      </ul>

      <!-- AVISO CONEXIÓN METRO -->
      <div class="metro-aviso">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M9 15h.01M15 15h.01"/></svg>
        <div class="metro-aviso__texto">
          <span>${esc(datos.conexionMetro)}</span>
          <button class="metro-aviso__btn" type="button" data-ir-tab="metro">Ver horarios y paradas de las rutas al Metro ➔</button>
        </div>
      </div>
    </div>

    <!-- TODAS LAS LÁMINAS OFICIALES -->
    <div class="laminas-seccion">
      <div class="seccion-titulo">
        <p class="seccion-titulo__antetitulo">Infografías originales</p>
        <h2>Láminas informativas del semestre ${esc(datos.semestre)}</h2>
        <p class="seccion-titulo__intro">Haz clic sobre cualquier lámina para verla en pantalla completa.</p>
      </div>

      <div class="laminas-grid">
        <div class="lamina-card" data-img="img/intercampus/intercampus-info.png" data-titulo="Así funciona el Intercampus">
          <div class="lamina-card__img-wrap">
            <img src="img/intercampus/intercampus-info.png" alt="Así funciona el Intercampus" loading="lazy">
            <div class="lamina-card__overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
          </div>
          <div class="lamina-card__info">
            <h4 class="lamina-card__titulo">Así funciona</h4>
            <p class="lamina-card__sub">Instrucciones y conexiones</p>
          </div>
        </div>

        <div class="lamina-card" data-img="img/intercampus/robledo-volador.png" data-titulo="Salidas desde Robledo hacia El Volador">
          <div class="lamina-card__img-wrap">
            <img src="img/intercampus/robledo-volador.png" alt="Salidas desde Robledo" loading="lazy">
            <div class="lamina-card__overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
          </div>
          <div class="lamina-card__info">
            <h4 class="lamina-card__titulo">Robledo ➔ El Volador</h4>
            <p class="lamina-card__sub">Horarios franjas 1 a 8</p>
          </div>
        </div>

        <div class="lamina-card" data-img="img/intercampus/rio-volador.png" data-titulo="Salidas desde Río hacia El Volador">
          <div class="lamina-card__img-wrap">
            <img src="img/intercampus/rio-volador.png" alt="Salidas desde Río" loading="lazy">
            <div class="lamina-card__overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
          </div>
          <div class="lamina-card__info">
            <h4 class="lamina-card__titulo">Río ➔ El Volador</h4>
            <p class="lamina-card__sub">Horarios franjas 1 a 8</p>
          </div>
        </div>

        <div class="lamina-card" data-img="img/intercampus/volador-robledo.png" data-titulo="Salidas desde El Volador hacia Robledo">
          <div class="lamina-card__img-wrap">
            <img src="img/intercampus/volador-robledo.png" alt="Salidas desde El Volador" loading="lazy">
            <div class="lamina-card__overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
          </div>
          <div class="lamina-card__info">
            <h4 class="lamina-card__titulo">El Volador ➔ Robledo</h4>
            <p class="lamina-card__sub">Horarios franjas 2 a 8</p>
          </div>
        </div>

        <div class="lamina-card" data-img="img/intercampus/rutas-metro.png" data-titulo="Rutas a las Estaciones Metro (Hospital, Suramericana, Caribe)">
          <div class="lamina-card__img-wrap">
            <img src="img/intercampus/rutas-metro.png" alt="Rutas a las Estaciones Metro" loading="lazy">
            <div class="lamina-card__overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
          </div>
          <div class="lamina-card__info">
            <h4 class="lamina-card__titulo">Estaciones Metro</h4>
            <p class="lamina-card__sub">Hospital · Suramericana · Caribe</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderizarMetro(contenedor) {
  const metroData = datosIntercampus.metro;
  if (!metroData) return;

  const minActual = minutosActuales();

  // Recopilar todas las horas válidas de todas las estaciones y rutas
  const todasLasHorasMetro = [];
  metroData.estaciones.forEach((est) => {
    est.rutas.forEach((r) => {
      Object.values(r.horarios).forEach((h) => {
        if (h && h !== '—' && !todasLasHorasMetro.includes(h)) {
          todasLasHorasMetro.push(h);
        }
      });
    });
  });
  todasLasHorasMetro.sort((a, b) => horaEnMinutos(a) - horaEnMinutos(b));

  let proxima = todasLasHorasMetro.find((h) => horaEnMinutos(h) >= minActual);
  let tiempoRestante = '';

  if (proxima) {
    const diff = horaEnMinutos(proxima) - minActual;
    tiempoRestante = diff === 0 ? '¡Saliendo ahora en ruta activa!' : diff === 1 ? 'Próximo paso en 1 minuto' : `Próximo paso en ${diff} minutos`;
  } else {
    proxima = todasLasHorasMetro[0] || '05:30';
    tiempoRestante = `Servicio finalizado por hoy · Primer paso mañana a las ${proxima}`;
  }

  // Filtrar estaciones
  const estacionesMostrar = filtroEstacionMetro === 'todas'
    ? metroData.estaciones
    : metroData.estaciones.filter((e) => e.id === filtroEstacionMetro);

  const opcionesFiltro = [
    { id: 'todas', texto: 'Todas las estaciones' },
    { id: 'hospital', texto: 'Hospital (Línea A)' },
    { id: 'suramericana', texto: 'Suramericana (Línea B)' },
    { id: 'caribe', texto: 'Caribe (Línea A)' }
  ];

  contenedor.innerHTML = `
    <!-- PANEL PRÓXIMA SALIDA METRO -->
    <div class="proxima-salida">
      <div class="proxima-salida__meta">
        <span class="proxima-salida__etiqueta">
          <span class="proxima-salida__pulso"></span>
          Conexión Sistema Metro · Semestre ${esc(datosIntercampus.semestre)}
        </span>
        <h3 class="proxima-salida__titulo">${esc(metroData.titulo)}</h3>
        <p class="proxima-salida__subtitulo">${esc(metroData.subtitulo)}</p>
      </div>
      <div class="proxima-salida__caja">
        <span class="proxima-salida__hora">${proxima}</span>
        <span class="proxima-salida__tiempo">${tiempoRestante}</span>
      </div>
    </div>

    <!-- CABECERA Y SELECTOR DE ESTACIÓN -->
    <div class="intercampus__cabecera-ruta">
      <div>
        <h3 class="intercampus__titulo-ruta">Hora de paso por cada parada</h3>
        <p class="intercampus__subtitulo-ruta">Consulta las paradas en Hospital, Río, El Volador y Robledo para cada ruta.</p>
      </div>

      <ul class="intercampus__filtros-franja" id="filtros-metro">
        ${opcionesFiltro.map((op) => `
          <li>
            <button class="intercampus__filtro-btn ${filtroEstacionMetro === op.id ? 'activo' : ''}" data-estacion="${op.id}">
              ${op.texto}
            </button>
          </li>
        `).join('')}
      </ul>
    </div>

    <!-- TABLAS DE ESTACIONES METRO -->
    <div class="metro-contenedor">
      <div class="metro-estaciones-grid">
        ${estacionesMostrar.map((est) => `
          <article class="metro-estacion-card" id="estacion-${est.id}">
            <div class="metro-estacion-card__encabezado">
              <div class="metro-estacion-card__meta">
                <span class="metro-estacion-card__linea">${esc(est.linea)}</span>
                <h3 class="metro-estacion-card__nombre">${esc(est.nombre)}</h3>
              </div>
              <span class="metro-estacion-card__rutas-badge">${est.rutas.length} ${est.rutas.length === 1 ? 'ruta disponible' : 'rutas programadas'}</span>
            </div>

            <div class="metro-tabla-wrap">
              <table class="metro-tabla" aria-label="Tabla de horarios para ${esc(est.nombre)}">
                <thead>
                  <tr>
                    <th scope="col">Parada</th>
                    ${est.rutas.map((r) => `
                      <th scope="col" class="metro-th-ruta">
                        <span class="metro-th-ruta__tag">Ruta</span>
                        <strong>${r.ruta}</strong>
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${est.paradas.map((parada) => `
                    <tr>
                      <th scope="row" class="metro-td-parada">
                        <span class="metro-parada-indicador"></span>
                        ${esc(parada)}
                      </th>
                      ${est.rutas.map((r) => {
                        const h = r.horarios[parada];
                        if (!h || h === '—') {
                          return `
                            <td class="metro-td-hora metro-td-hora--vacia">
                              <span class="metro-vacio" title="La ruta ${r.ruta} no pasa por la parada ${parada}">—</span>
                            </td>
                          `;
                        }
                        const hMin = horaEnMinutos(h);
                        const esProxima = (h === proxima && hMin >= minActual);
                        const esPasada = hMin < minActual;
                        const clase = esProxima ? 'hora-chip--proxima' : (esPasada ? 'hora-chip--pasada' : '');
                        const tituloAttr = esProxima ? 'Próximo paso estimado' : (esPasada ? 'Horario ya transcurrido hoy' : 'Hora programada de paso');
                        return `
                          <td class="metro-td-hora">
                            <span class="hora-chip ${clase}" title="${tituloAttr}">${h}</span>
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </article>
        `).join('')}
      </div>

      <!-- PIE Y BANNER LÁMINA OFICIAL -->
      <div class="metro-pie-info">
        <p class="metro-nota">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span><strong>Nota:</strong> El guion (—) significa que esa ruta no pasa por esa parada. Horarios oficiales vigentes semestre ${esc(datosIntercampus.semestre)}.</span>
        </p>

        <div class="metro-banner-lamina lamina-card" data-img="img/intercampus/rutas-metro.png" data-titulo="Infografía oficial de Rutas al Metro · Semestre ${esc(datosIntercampus.semestre)}">
          <div class="metro-banner-lamina__miniatura">
            <img src="img/intercampus/rutas-metro.png" alt="Afiche oficial de rutas a estaciones metro" loading="lazy">
            <div class="lamina-card__overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
          </div>
          <div class="metro-banner-lamina__info">
            <span class="metro-banner-lamina__tag">Infografía oficial</span>
            <h4>¿Quieres ver la lámina gráfica original?</h4>
            <p>Haz clic sobre esta tarjeta para ver en pantalla completa el afiche publicado con los horarios y el diseño universitario original.</p>
            <span class="metro-banner-lamina__link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Ampliar afiche en alta resolución
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Asignar listeners a los filtros de estación metro
  const contFiltros = $('#filtros-metro');
  if (contFiltros) {
    contFiltros.addEventListener('click', (e) => {
      const btn = e.target.closest('.intercampus__filtro-btn');
      if (!btn) return;
      filtroEstacionMetro = btn.dataset.estacion;
      $$('.intercampus__filtro-btn', contFiltros).forEach((b) => b.classList.toggle('activo', b === btn));
      renderizarMetro(contenedor);
    });
  }
}

function actualizarProximaSalida() {
  if (rutaActivaId === 'guia') return;
  renderizarContenidoRuta();
}

// Modal para ampliar láminas
function iniciarVisorModal() {
  const modal = $('#modal-visor');
  const modalImg = $('#modal-visor-img');
  const modalCerrar = $('#modal-visor-cerrar');

  if (!modal || !modalImg) return;

  document.body.addEventListener('click', (e) => {
    const card = e.target.closest('.lamina-card');
    if (!card) return;
    const rutaImg = card.dataset.img;
    const titulo = card.dataset.titulo || 'Lámina oficial';
    modalImg.src = rutaImg;
    modalImg.alt = titulo;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  });

  const cerrarModal = () => {
    modal.setAttribute('hidden', '');
    modalImg.src = '';
    document.body.style.overflow = '';
  };

  if (modalCerrar) modalCerrar.addEventListener('click', cerrarModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      cerrarModal();
    }
  });

  // Atajo para saltar a pestañas desde enlaces o avisos
  document.body.addEventListener('click', (e) => {
    const btnTab = e.target.closest('[data-ir-tab]');
    if (!btnTab) return;
    const destino = btnTab.dataset.irTab;
    const boton = $(`button[data-ruta="${destino}"]`);
    if (boton) {
      boton.click();
      const pos = $('#intercampus-tabs');
      if (pos) window.scrollTo({ top: pos.offsetTop - 60, behavior: 'smooth' });
    }
  });
}
