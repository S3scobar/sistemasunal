/* =============================================
   MÓDULO INICIO
   Pide solo sus propios datos: programa.json al abrir,
   perfil.json y grupos.json cuando la persona se acerca a esa sección.
   ============================================= */

const ICONOS_PERFIL = {
  ciencia: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  equipo: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14a4 4 0 0 1 4 4v2"/>',
  gestion: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  empresa: '<path d="M3 21h18M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5M9 11h.01M15 11h.01"/>',
};

const icono = (nombre) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_PERFIL[nombre] || ''}</svg>`;

const ICONO_SELLO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/><path d="m9.5 9 1.8 1.8L15 7.2"/></svg>';


/* ---------- Programa ---------- */

function pintarPrograma(p) {
  $('#portada-cifras').innerHTML = p.cifras
    .map((c) => `<li>${esc(c.valor)}<small>${esc(c.texto)}</small></li>`)
    .join('');

  const acreditacion = p.acreditacion;
  $('#programa-contenido').innerHTML = `
    <div class="seccion-titulo">
      <p class="seccion-titulo__antetitulo">${esc(p.facultad)} · ${esc(p.sede)}</p>
      <h2 id="programa-titulo">El programa</h2>
    </div>

    <div class="programa__rejilla">
      <div class="programa__texto">
        <span class="programa__lema">Lema de la Facultad: ${esc(p.lema)}</span>
        ${p.descripcion.map((parrafo) => `<p>${esc(parrafo)}</p>`).join('')}
      </div>
      <ul class="ficha">
        ${p.ficha.map((f) => `
          <li><span class="ficha__etiqueta">${esc(f.etiqueta)}</span><span class="ficha__valor">${esc(f.valor)}</span></li>`).join('')}
      </ul>
    </div>

    <div class="estrato" id="estrato"></div>

    <div class="acreditacion">
      <div class="acreditacion__cabecera">
        <span class="acreditacion__sello-icono">${ICONO_SELLO}</span>
        <div>
          <span class="acreditacion__antetitulo">Calidad Académica Certificada</span>
          <h3 class="acreditacion__estado">${esc(acreditacion.estado)}</h3>
        </div>
      </div>
      <div class="acreditacion__rejilla">
        ${acreditacion.hitos.map((h, i) => `
          <div class="acreditacion__tarjeta ${String(h.anio).toLowerCase().includes('renova') ? 'acreditacion__tarjeta--renovacion' : ''}">
            <div class="acreditacion__tarjeta-encabezado">
              <span class="acreditacion__anio-badge">${esc(h.anio)}</span>
              <span class="acreditacion__hito-tipo">${i === 0 ? 'Acreditación Inicial' : 'Renovación de Calidad'}</span>
            </div>
            <p class="acreditacion__texto">${esc(h.texto)}</p>
          </div>`).join('')}
      </div>
      <div class="acreditacion__pie">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="acreditacion__info-icono" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p class="acreditacion__nota">${esc(acreditacion.nota)}</p>
      </div>
    </div>

    <p class="fuentes">Fuentes:
      ${p.fuentes.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a>`).join(' · ')}
    </p>`;

  cargarEstrato((p.ficha.find((f) => f.etiqueta === 'Créditos del plan') || {}).valor);
}


/* ---------- Estratigrafía del plan (créditos por componente) ---------- */

// Todo sale de los datos de la malla: fundamentación y disciplinar suman los créditos
// exigidos de sus agrupaciones; libre elección suma las casillas de libre elección del plan.
function pintarEstrato(componentes, plan, total) {
  const exigidos = (id) => componentes.agrupaciones
    .filter((a) => a.componente === id)
    .reduce((suma, a) => suma + (a.exigidos || 0), 0);
  const libres = plan
    .flatMap((semestre) => semestre.items)
    .filter((it) => it.tipo === 'bolsa' && it.agrupacion === 'libre-eleccion')
    .reduce((suma, it) => suma + it.creditos, 0);

  const partes = componentes.componentes.map((c) => ({
    nombre: c.nombre,
    color: c.color,
    creditos: c.id === 'libre-eleccion' ? libres : exigidos(c.id),
  }));
  const suma = partes.reduce((s, p) => s + p.creditos, 0);
  if (!suma || (total && suma !== Number(total))) return;   // si no cuadra con el plan, no se muestra

  $('#estrato').innerHTML = `
    <h3 class="estrato__titulo">Estratigrafía del plan de estudios <span>(${suma} créditos)</span></h3>
    <a class="estrato__enlace" href="malla.html">Explorar malla curricular <span aria-hidden="true">→</span></a>
    <div class="estrato__barra" role="img" aria-label="${partes.map((p) => `${p.nombre}: ${p.creditos} créditos`).join('; ')}">
      ${partes.map((p) => `<span class="estrato__tramo" style="--color: ${esc(p.color)}; flex: ${p.creditos}"><b>${p.creditos} cr</b></span>`).join('')}
    </div>
    <div class="estrato__escala" aria-hidden="true"><span>0</span><span>${suma} cr</span></div>
    <ul class="estrato__leyenda">
      ${partes.map((p) => `<li style="--color: ${esc(p.color)}"><i></i>${esc(p.nombre)} <em>(${p.creditos} cr · ${Math.round(p.creditos / suma * 100)} %)</em></li>`).join('')}
    </ul>`;
}

function cargarEstrato(totalCreditos) {
  Promise.all([cargarDatos('malla/componentes'), cargarDatos('malla/plan')])
    .then(([componentes, plan]) => pintarEstrato(componentes, plan, totalCreditos))
    .catch(() => { const e = $('#estrato'); if (e) e.remove(); });   // es un extra: si falla, la página sigue igual
}


/* ---------- Perfil del egresado ---------- */

function pintarPerfil(perfil) {
  $('#perfil-contenido').innerHTML = `
    <div class="seccion-titulo">
      <p class="seccion-titulo__antetitulo">Quién sale de aquí</p>
      <h2 id="perfil-titulo">${esc(perfil.titulo)}</h2>
      <p class="seccion-titulo__intro">${esc(perfil.intro)}</p>
    </div>
    <ul class="perfil__tarjetas">
      ${perfil.rasgos.map((r) => `
        <li class="rasgo">
          <span class="rasgo__icono">${icono(r.icono)}</span>
          <h3>${esc(r.titulo)}</h3>
          <p>${esc(r.texto)}</p>
        </li>`).join('')}
    </ul>
    <p class="perfil__fuente">${esc(perfil.fuente)}</p>`;
}


/* ---------- Grupos estudiantiles y semilleros ---------- */

// --letras ajusta el tamaño del nombre para que quepa en el banderín.
// Si el grupo tiene logo, va como un parche redondo sobre el palo.
// Si tiene enlace, el banderín es un link que abre su página en otra pestaña.
function pintarGrupos(grupos) {
  const banderines = grupos.map((grupo) => {
    const etiqueta = grupo.enlace ? 'a' : 'span';
    const destino = grupo.enlace ? `href="${esc(grupo.enlace)}" target="_blank" rel="noopener"` : '';
    return `
      <li class="grupo" style="--color: ${esc(grupo.color)}; --letras: ${grupo.nombre.length}">
        <${etiqueta} class="banderin ${grupo.logo ? 'banderin--con-logo' : ''}" ${destino}>
          <span class="banderin__tela"><span class="banderin__nombre">${esc(grupo.nombre)}</span></span>
          ${grupo.logo ? `<img class="banderin__logo" src="${esc(grupo.logo)}" alt="Logo de ${esc(grupo.nombre)}" loading="lazy">` : ''}
        </${etiqueta}>
        <span class="grupo__tipo">${esc(grupo.tipo)}</span>
      </li>`;
  }).join('');

  $('#grupos-contenido').innerHTML = `
    <div class="seccion-titulo">
      <p class="seccion-titulo__antetitulo">Comunidad estudiantil</p>
      <h2 id="grupos-titulo">Grupos y semilleros</h2>
      <p class="seccion-titulo__intro">Espacios donde estudiantes de Ingeniería de Sistemas aprenden haciendo, compiten e investigan.</p>
    </div>
    <ul class="grupos__lista">${banderines}</ul>`;
}


/* ---------- Carga por secciones ---------- */

// Cada sección pide su JSON recién cuando está cerca de la pantalla.
const SECCIONES = {
  perfil: () => cargarDatos('perfil').then(pintarPerfil),
  grupos: () => cargarDatos('grupos').then(pintarGrupos),
};

function cargarSeccion(seccion) {
  const cargar = SECCIONES[seccion.dataset.carga];
  cargar().catch((error) => mostrarErrorDeCarga(seccion.querySelector('.contenedor'), error));
}

cargarDatos('programa')
  .then(pintarPrograma)
  .catch((error) => mostrarErrorDeCarga($('#programa-contenido'), error));

const porCargar = $$('[data-carga]');
if ('IntersectionObserver' in window) {
  const vigilante = new IntersectionObserver((entradas) => {
    entradas.filter((e) => e.isIntersecting).forEach((e) => {
      vigilante.unobserve(e.target);
      cargarSeccion(e.target);
    });
  }, { rootMargin: '400px 0px' });
  porCargar.forEach((seccion) => vigilante.observe(seccion));
} else {
  porCargar.forEach(cargarSeccion);
}
