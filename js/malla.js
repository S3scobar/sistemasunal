/* =============================================
   MÓDULO MALLA CURRICULAR
   Datos (carpeta data/malla):
   - componentes.json: componentes y agrupaciones (con sus créditos)
   - plan.json: qué va en cada semestre (códigos o casillas de optativa / libre elección)
   - asignaturas.json: catálogo con créditos, prerrequisitos y agrupación
   Las relaciones se calculan aquí a partir de los códigos: nada está repetido en los datos.
   ============================================= */

const POR_PAGINA = 12;
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

let hoverCodigoActual = null;

const estado = {
  componentes: [],
  agrupaciones: [],
  plan: [],
  asignaturas: new Map(),   // codigo -> asignatura
  dependientes: new Map(),  // codigo -> códigos que lo piden como prerrequisito
  seleccion: null,          // código de la asignatura abierta en el detalle
  componente: null,         // pestaña activa del catálogo
  agrupacion: null,         // agrupación activa del catálogo
  tipo: 'todas',            // todas | obligatorias | optativas
  pagina: 1,
};

const buscarComponente = (id) => estado.componentes.find((c) => c.id === id);
const buscarAgrupacion = (id) => estado.agrupaciones.find((a) => a.id === id);
const colorDe = (asignatura) => buscarComponente(buscarAgrupacion(asignatura.agrupacion).componente).color;
const creditosTexto = (creditos) => (creditos ?? '—');


/* ---------- Carga ---------- */

function prepararDatos([componentes, plan, asignaturas]) {
  estado.componentes = componentes.componentes;
  estado.agrupaciones = componentes.agrupaciones;
  estado.plan = plan;
  asignaturas.forEach((a) => estado.asignaturas.set(a.codigo, a));

  // Inverso de "prerrequisitos": de qué materias es requisito cada una
  asignaturas.forEach((a) => a.prerrequisitos.forEach((p) => {
    if (!estado.dependientes.has(p)) estado.dependientes.set(p, []);
    estado.dependientes.get(p).push(a.codigo);
  }));

  const totalCreditos = plan.reduce((suma, s) => suma + s.creditos, 0);
  $('#malla-antetitulo').textContent = `${plan.length} semestres · ${totalCreditos} créditos`;
}

Promise.all([cargarDatos('malla/componentes'), cargarDatos('malla/plan'), cargarDatos('malla/asignaturas')])
  .then((datos) => {
    prepararDatos(datos);
    pintarLeyenda();
    pintarMalla();
    iniciarCatalogo();
    leerDireccion();
  })
  .catch((error) => mostrarErrorDeCarga($('#malla-rejilla'), error));


/* ---------- Convenciones ---------- */

function pintarLeyenda() {
  const componentes = estado.componentes
    .map((c) => `<li><span class="leyenda__punto" style="--color: ${c.color}"></span>${esc(c.nombre)}</li>`)
    .join('');
  $('#leyenda').innerHTML = `
    ${componentes}
    <li><span class="leyenda__aro" style="--color: var(--libre)"></span>Prerrequisito (te pide)</li>
    <li><span class="leyenda__aro" style="--color: var(--azul-brillante)"></span>Te abre (se abre después)</li>`;
}


/* ---------- Malla ---------- */

function casillaAsignatura(codigo) {
  const a = estado.asignaturas.get(codigo);
  return `
    <li>
      <button class="materia" type="button" data-codigo="${esc(codigo)}" data-agrupacion="${esc(a.agrupacion)}"
        style="--color: ${colorDe(a)}" aria-label="${esc(a.nombre)}, ${a.creditos} créditos">
        <span class="materia__nombre">${esc(a.nombre)}</span>
        <span class="materia__cred">${a.creditos}</span>
        <span class="materia__codigo">${esc(a.codigo)}</span>
      </button>
    </li>`;
}

function casillaBolsa(bolsa, semestre, posicion) {
  const agrupacion = buscarAgrupacion(bolsa.agrupacion);
  const color = buscarComponente(agrupacion.componente).color;
  return `
    <li>
      <button class="materia materia--bolsa" type="button" data-bolsa="${esc(bolsa.agrupacion)}"
        data-id="b-${semestre}-${posicion}" data-agrupacion="${esc(bolsa.agrupacion)}"
        data-creditos="${bolsa.creditos}" data-nombre="${esc(bolsa.nombre)}"
        style="--color: ${color}" aria-label="${esc(bolsa.nombre)}, ${bolsa.creditos} créditos">
        <span class="materia__nombre">${esc(bolsa.nombre)}</span>
        <span class="materia__cred">${bolsa.creditos}</span>
        <span class="materia__codigo">${bolsa.agrupacion === 'libre-eleccion' ? 'a tu elección' : 'ver opciones'}</span>
      </button>
    </li>`;
}

function pintarMalla() {
  $('#malla-rejilla').innerHTML = `
    <div class="rejilla" id="rejilla">
      ${estado.plan.map((semestre) => `
        <section class="semestre" aria-label="Semestre ${ROMANOS[semestre.semestre - 1]}">
          <div class="semestre__cabeza">
            <h3>Semestre ${ROMANOS[semestre.semestre - 1]}</h3>
            <p>Créditos ${semestre.creditos}</p>
          </div>
          <ul class="semestre__lista">
            ${semestre.items.map((item, i) => item.tipo === 'asignatura'
              ? casillaAsignatura(item.codigo)
              : casillaBolsa(item, semestre.semestre, i)).join('')}
          </ul>
        </section>`).join('')}
    </div>`;

  const rejilla = $('#rejilla');

  rejilla.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.materia');
    if (!boton) return;
    if (boton.dataset.codigo) seleccionar(boton.dataset.codigo);
    else seleccionarBolsa(boton);
  });

  // Al pasar el cursor por encima de cualquier asignatura, marca sus prerrequisitos y lo que te abre
  rejilla.addEventListener('pointerover', (evento) => {
    const boton = evento.target.closest('.materia[data-codigo]');
    if (!boton) return;
    const codigo = boton.dataset.codigo;
    if (codigo === hoverCodigoActual) return;
    hoverCodigoActual = codigo;
    marcarRelaciones(codigo);
  });

  rejilla.addEventListener('pointerout', (evento) => {
    const boton = evento.target.closest('.materia[data-codigo]');
    if (!boton) return;
    const proximoBoton = evento.relatedTarget?.closest?.('.materia[data-codigo]');
    if (proximoBoton) {
      if (proximoBoton.dataset.codigo !== hoverCodigoActual) {
        hoverCodigoActual = proximoBoton.dataset.codigo;
        marcarRelaciones(hoverCodigoActual);
      }
      return;
    }
    // Salió del botón o pasó a un espacio no interactivo
    hoverCodigoActual = null;
    marcarRelaciones(estado.seleccion);
  });

  rejilla.addEventListener('pointerleave', () => {
    hoverCodigoActual = null;
    marcarRelaciones(estado.seleccion);
  });
}

// Marca en la malla la materia elegida o sobre la que está el cursor, sus prerrequisitos y las materias que abre
function marcarRelaciones(codigo) {
  const rejilla = $('#rejilla');
  if (!rejilla) return;
  rejilla.classList.toggle('hay-seleccion', Boolean(codigo));
  $$('.materia', rejilla).forEach((boton) => boton.classList.remove('es-seleccion', 'es-prerreq', 'es-dependiente'));
  if (!codigo) return;

  const asignatura = estado.asignaturas.get(codigo);
  if (!asignatura) return;

  const marcar = (cod, clase) => $$(`.materia[data-codigo="${CSS.escape(cod)}"]`, rejilla).forEach((b) => b.classList.add(clase));
  marcar(codigo, 'es-seleccion');
  asignatura.prerrequisitos.forEach((p) => marcar(p, 'es-prerreq'));
  (estado.dependientes.get(codigo) || []).forEach((d) => marcar(d, 'es-dependiente'));
}


/* ---------- Detalle ---------- */

const fichaMateria = (codigo, clase = '') => {
  const a = estado.asignaturas.get(codigo);
  return `
    <li><button class="ficha-materia ${clase}" type="button" data-ir="${esc(codigo)}" style="--color: ${colorDe(a)}">
      ${esc(a.nombre)} <small>${esc(a.codigo)}</small>
    </button></li>`;
};

function textoAvance(requisito) {
  const nombre = requisito.componente === 'fundamentacion' ? 'Fundamentación' : 'Formación Disciplinar o Profesional';
  return `${requisito.porcentaje} % de avance en el componente de ${nombre}`;
}

function pintarDetalle(contenidoHtml, color) {
  const detalle = $('#detalle');
  detalle.style.setProperty('--color', color);
  detalle.innerHTML = `<button class="detalle__cerrar" type="button" aria-label="Cerrar detalle">✕</button>${contenidoHtml}`;
  detalle.hidden = false;
  document.body.classList.add('con-detalle');
}

function cerrarDetalle() {
  estado.seleccion = null;
  hoverCodigoActual = null;
  $('#detalle').hidden = true;
  document.body.classList.remove('con-detalle');
  if ($('#rejilla')) marcarRelaciones(null);
  guardarDireccion();
}

function seleccionar(codigo, { desplazar = false } = {}) {
  const a = estado.asignaturas.get(codigo);
  if (!a) return;
  estado.seleccion = codigo;

  const agrupacion = buscarAgrupacion(a.agrupacion);
  const componente = buscarComponente(agrupacion.componente);
  const dependientes = estado.dependientes.get(codigo) || [];
  const semestre = a.semestre ? `Semestre ${ROMANOS[a.semestre - 1]}` : 'Optativa · sin semestre fijo';

  pintarDetalle(`
    <div class="detalle__cabeza">
      <p class="detalle__codigo">Código ${esc(a.codigo)}</p>
      <h3>${esc(a.nombre)}</h3>
      <ul class="etiquetas">
        <li class="etiqueta etiqueta--cred">${creditosTexto(a.creditos)} ${a.creditos === 1 ? 'crédito' : 'créditos'}</li>
        <li class="etiqueta etiqueta--comp">${esc(componente.nombre)}</li>
        <li class="etiqueta">${esc(agrupacion.nombre)}</li>
        <li class="etiqueta">${a.obligatoria ? 'Obligatoria' : 'Optativa'}</li>
        <li class="etiqueta">${esc(semestre)}</li>
      </ul>
    </div>
    <div class="detalle__cuerpo">
      <div class="detalle__bloque">
        <h4>Prerrequisitos</h4>
        ${a.prerrequisitos.length
          ? `<ul class="fichas">${a.prerrequisitos.map((p) => fichaMateria(p, 'ficha-materia--prerreq')).join('')}</ul>`
          : '<p class="detalle__vacio">No tiene prerrequisitos.</p>'}
        ${a.requisitosAvance ? `<ul class="detalle__avance">${a.requisitosAvance.map((r) => `<li>${esc(textoAvance(r))}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="detalle__bloque">
        <h4>Es prerrequisito de</h4>
        ${dependientes.length
          ? `<ul class="fichas">${dependientes.map((d) => fichaMateria(d)).join('')}</ul>`
          : '<p class="detalle__vacio">No es prerrequisito de otra asignatura.</p>'}
      </div>
      ${a.porConfirmar ? `<p class="detalle__confirmar"><strong>Dato por confirmar.</strong> ${esc(a.porConfirmar)}</p>` : ''}
    </div>`, colorDe(a));

  marcarRelaciones(codigo);
  if (desplazar) {
    $(`.materia[data-codigo="${CSS.escape(codigo)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  guardarDireccion();
}

// Casilla de "Optativa de…" o "Libre elección": explica de qué se trata y lleva a la lista de opciones
function seleccionarBolsa(boton) {
  const agrupacion = buscarAgrupacion(boton.dataset.bolsa);
  const componente = buscarComponente(agrupacion.componente);
  const esLibre = agrupacion.id === 'libre-eleccion';

  estado.seleccion = null;
  marcarRelaciones(null);
  $$('.materia--bolsa.es-seleccion').forEach((b) => b.classList.remove('es-seleccion'));
  boton.classList.add('es-seleccion');

  pintarDetalle(`
    <div class="detalle__cabeza">
      <p class="detalle__codigo">Casilla de la malla</p>
      <h3>${esc(boton.dataset.nombre)}</h3>
      <ul class="etiquetas">
        <li class="etiqueta etiqueta--cred">${esc(boton.dataset.creditos)} créditos</li>
        <li class="etiqueta etiqueta--comp">${esc(componente.nombre)}</li>
        ${esLibre ? '' : `<li class="etiqueta">${esc(agrupacion.nombre)}</li>`}
      </ul>
    </div>
    <div class="detalle__cuerpo">
      <p class="detalle__vacio">${esLibre
        ? 'Esta casilla corresponde al componente de libre elección: no tiene una asignatura fija en la malla.'
        : `Aquí se cursa una optativa de la agrupación «${esc(agrupacion.nombre)}». El programa exige ${agrupacion.exigidos} créditos en total en esta agrupación; la lista con sus prerrequisitos está más abajo.`}</p>
      ${esLibre ? '' : '<button class="detalle__boton" type="button" data-ver-opciones>Ver las opciones</button>'}
    </div>`, componente.color);

  $('#detalle').dataset.bolsa = boton.dataset.bolsa;
  guardarDireccion();
}

$('#detalle').addEventListener('click', (evento) => {
  if (evento.target.closest('.detalle__cerrar')) return cerrarDetalle();

  const ir = evento.target.closest('[data-ir]');
  if (ir) return seleccionar(ir.dataset.ir, { desplazar: true });

  if (evento.target.closest('[data-ver-opciones]')) {
    const agrupacion = buscarAgrupacion($('#detalle').dataset.bolsa);
    estado.componente = agrupacion.componente;
    estado.agrupacion = agrupacion.id;
    estado.tipo = 'optativas';
    estado.pagina = 1;
    pintarCatalogo();
    $('#asignaturas').scrollIntoView({ behavior: 'smooth' });
    guardarDireccion();
  }
});

document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && !$('#detalle').hidden) cerrarDetalle();
});


/* ---------- Catálogo por componente (paginado) ---------- */

function iniciarCatalogo() {
  estado.componente = estado.componentes[0].id;
  estado.agrupacion = null;

  $('#pestanas').setAttribute('role', 'tablist');
  $('#pestanas').addEventListener('click', (evento) => {
    const pestana = evento.target.closest('[data-componente]');
    if (!pestana) return;
    estado.componente = pestana.dataset.componente;
    estado.agrupacion = null;
    estado.tipo = 'todas';
    estado.pagina = 1;
    pintarCatalogo();
    guardarDireccion();
  });

  $('#agrupaciones').addEventListener('click', (evento) => {
    const pildora = evento.target.closest('[data-agrupacion]');
    if (!pildora) return;
    estado.agrupacion = pildora.dataset.agrupacion;
    estado.tipo = 'todas';
    estado.pagina = 1;
    pintarCatalogo();
    guardarDireccion();
  });

  $('#resumen-agrupacion').addEventListener('click', (evento) => {
    const filtro = evento.target.closest('[data-tipo]');
    if (!filtro) return;
    estado.tipo = filtro.dataset.tipo;
    estado.pagina = 1;
    pintarCatalogo();
    guardarDireccion();
  });

  $('#catalogo').addEventListener('click', (evento) => {
    const tarjeta = evento.target.closest('[data-codigo]');
    if (tarjeta) seleccionar(tarjeta.dataset.codigo);
  });

  $('#paginacion').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-pagina]');
    if (!boton || boton.disabled) return;
    estado.pagina = Number(boton.dataset.pagina);
    pintarCatalogo();
    $('#asignaturas-titulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    guardarDireccion();
  });

  pintarCatalogo();
}

// Obligatorias primero (por semestre) y luego las optativas por nombre
function ordenar(a, b) {
  if (a.obligatoria !== b.obligatoria) return a.obligatoria ? -1 : 1;
  if (a.obligatoria) return (a.semestre ?? 99) - (b.semestre ?? 99) || a.nombre.localeCompare(b.nombre, 'es');
  return a.nombre.localeCompare(b.nombre, 'es');
}

function pintarCatalogo() {
  // Pestañas de componente
  $('#pestanas').innerHTML = estado.componentes.map((c) => `
    <button class="pestana" type="button" role="tab" data-componente="${esc(c.id)}"
      aria-selected="${c.id === estado.componente}" style="--color: ${c.color}">${esc(c.nombre)}</button>`).join('');

  // Agrupaciones del componente elegido
  const delComponente = estado.agrupaciones.filter((a) => a.componente === estado.componente);
  if (!delComponente.some((a) => a.id === estado.agrupacion)) estado.agrupacion = delComponente[0].id;
  $('#agrupaciones').innerHTML = delComponente.length > 1
    ? delComponente.map((a) => `
        <button class="pildora" type="button" data-agrupacion="${esc(a.id)}"
          aria-pressed="${a.id === estado.agrupacion}">${esc(a.nombre)}</button>`).join('')
    : '';

  const agrupacion = buscarAgrupacion(estado.agrupacion);
  const todas = [...estado.asignaturas.values()].filter((a) => a.agrupacion === agrupacion.id).sort(ordenar);
  const hayAmbas = todas.some((a) => a.obligatoria) && todas.some((a) => !a.obligatoria);
  if (!hayAmbas) estado.tipo = 'todas';
  const filtradas = todas.filter((a) =>
    estado.tipo === 'todas' || (estado.tipo === 'obligatorias' ? a.obligatoria : !a.obligatoria));

  // Resumen de créditos de la agrupación (los números del programa curricular)
  const filtro = hayAmbas ? `
    <span class="filtro" role="group" aria-label="Tipo de asignatura">
      ${[['todas', 'Todas'], ['obligatorias', 'Obligatorias'], ['optativas', 'Optativas']].map(([id, texto]) =>
        `<button type="button" data-tipo="${id}" aria-pressed="${estado.tipo === id}">${texto}</button>`).join('')}
    </span>` : '';
  $('#resumen-agrupacion').innerHTML = agrupacion.exigidos === undefined ? '' : `
    <div class="resumen">
      <span><strong>${esc(agrupacion.nombre)}</strong> · créditos exigidos: <strong>${agrupacion.exigidos}</strong></span>
      <span class="resumen__oblig">Obligatorios: ${agrupacion.obligatorios}</span>
      <span class="resumen__optat">Optativos: ${agrupacion.optativos}</span>
      ${filtro}
    </div>`;

  // Página actual
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  estado.pagina = Math.min(Math.max(1, estado.pagina), totalPaginas);
  const inicio = (estado.pagina - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  $('#catalogo').innerHTML = agrupacion.id === 'libre-eleccion'
    ? `<li class="catalogo__vacio">El componente de libre elección no tiene asignaturas fijas: se cursa en las casillas «Libre elección» de la malla.</li>`
    : visibles.map((a) => `
        <li>
          <button class="tarjeta" type="button" data-codigo="${esc(a.codigo)}" style="--color: ${colorDe(a)}">
            <span class="tarjeta__nombre">${esc(a.nombre)}</span>
            <span class="tarjeta__pie">
              <span><span class="tarjeta__tipo">${a.obligatoria ? 'Obligatoria' : 'Optativa'}</span> · ${esc(a.codigo)}</span>
              <span class="tarjeta__cred" title="Créditos">${creditosTexto(a.creditos)}</span>
            </span>
          </button>
        </li>`).join('');

  pintarPaginacion(totalPaginas, filtradas.length, inicio, visibles.length);
}

// 1 … 4 5 [6] 7 8 … 12
function paginasVisibles(actual, total) {
  const conjunto = new Set([1, total, actual - 1, actual, actual + 1]);
  const ordenadas = [...conjunto].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  ordenadas.forEach((n, i) => {
    const hueco = i ? n - ordenadas[i - 1] : 1;
    if (hueco === 2) salida.push(n - 1);     // si falta una sola página, se muestra en vez de "…"
    else if (hueco > 2) salida.push('…');
    salida.push(n);
  });
  return salida;
}

function pintarPaginacion(total, cantidad, inicio, enPagina) {
  const nav = $('#paginacion');
  if (!cantidad || estado.agrupacion === 'libre-eleccion') { nav.innerHTML = ''; return; }

  const info = `<p class="pag__info">Mostrando ${inicio + 1}–${inicio + enPagina} de ${cantidad} asignaturas</p>`;
  if (total === 1) { nav.innerHTML = info; return; }

  nav.innerHTML = `
    <button class="pag__boton" type="button" data-pagina="${estado.pagina - 1}" ${estado.pagina === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
    ${paginasVisibles(estado.pagina, total).map((n) => n === '…'
      ? '<span class="pag__puntos" aria-hidden="true">…</span>'
      : `<button class="pag__boton" type="button" data-pagina="${n}" ${n === estado.pagina ? 'aria-current="page"' : ''} aria-label="Página ${n}">${n}</button>`).join('')}
    <button class="pag__boton" type="button" data-pagina="${estado.pagina + 1}" ${estado.pagina === total ? 'disabled' : ''} aria-label="Página siguiente">›</button>
    ${info}`;
}


/* ---------- Dirección (para compartir el estado de la página) ---------- */

function guardarDireccion() {
  const parametros = new URLSearchParams();
  if (estado.seleccion) parametros.set('materia', estado.seleccion);
  parametros.set('componente', estado.componente);
  parametros.set('agrupacion', estado.agrupacion);
  if (estado.tipo !== 'todas') parametros.set('tipo', estado.tipo);
  if (estado.pagina > 1) parametros.set('pagina', estado.pagina);
  history.replaceState(null, '', `#${parametros}`);
}

function leerDireccion() {
  const parametros = new URLSearchParams(location.hash.slice(1));
  const agrupacion = buscarAgrupacion(parametros.get('agrupacion'));
  if (agrupacion) {
    estado.componente = agrupacion.componente;
    estado.agrupacion = agrupacion.id;
    estado.tipo = ['obligatorias', 'optativas'].includes(parametros.get('tipo')) ? parametros.get('tipo') : 'todas';
    estado.pagina = Number(parametros.get('pagina')) || 1;
    pintarCatalogo();
  }
  const materia = parametros.get('materia');
  if (materia && estado.asignaturas.has(materia)) seleccionar(materia, { desplazar: true });
}
