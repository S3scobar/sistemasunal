/* =============================================
   FUNCIONES COMUNES A TODOS LOS MÓDULOS
   - Carga de datos (cada módulo pide solo los JSON que necesita)
   - Barra superior y pie, iguales en todas las páginas
   ============================================= */

const $ = (selector, raiz = document) => raiz.querySelector(selector);
const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

// Escapa texto antes de meterlo en HTML
const esc = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);


/* ---------- Carga de datos ---------- */

// Cada archivo se pide una sola vez y queda guardado mientras la página esté abierta.
const memoriaDatos = new Map();

function cargarDatos(ruta) {
  if (!memoriaDatos.has(ruta)) {
    const peticion = fetch(`data/${ruta}.json`).then((respuesta) => {
      if (!respuesta.ok) throw new Error(`No se pudo cargar data/${ruta}.json (${respuesta.status})`);
      return respuesta.json();
    });
    memoriaDatos.set(ruta, peticion);
  }
  return memoriaDatos.get(ruta);
}

// Mensaje amable cuando los datos no cargan (por ejemplo, al abrir el HTML con doble clic)
function mostrarErrorDeCarga(contenedor, error) {
  console.error(error);
  contenedor.innerHTML = `
    <div class="aviso">
      <p><strong>No se pudo cargar la información.</strong></p>
      <p>Si abriste el archivo con doble clic, sírvelo con un servidor local:
        <code>python3 -m http.server</code> y entra a <code>http://localhost:8000</code>.</p>
    </div>`;
}


/* ---------- Escudo oficial (pie y barra superior) ---------- */

function dibujarEscudo() {
  return `<img src="img/logo-sistemas.jpg" alt="Logo de Ingeniería de Sistemas e Informática · Facultad de Minas" class="barra__escudo-img">`;
}


/* ---------- Barra superior y pie ---------- */

const PAGINAS = [
  { id: 'inicio', texto: 'Inicio', url: 'index.html' },
  { id: 'malla', texto: 'Malla curricular', url: 'malla.html' },
  { id: 'intercampus', texto: 'Rutas Intercampus', url: 'intercampus.html' },
  { id: 'convenios', texto: 'Convenios', url: 'convenios.html' },
  { id: 'info', texto: 'Información general', url: 'info.html' },
];

function pintarBarra() {
  const actual = document.body.dataset.pagina;
  $('#barra').outerHTML = `
    <header class="barra">
      <div class="contenedor barra__contenido">
        <a class="barra__marca" href="index.html" aria-label="Ingeniería de Sistemas e Informática, inicio">
          <span class="barra__escudo"><img src="img/logo-sistemas.jpg" alt="Logo oficial de Ingeniería de Sistemas e Informática" class="barra__escudo-img"></span>
          <span class="barra__texto">Ingeniería de Sistemas e Informática<small>UNAL · Sede Medellín</small></span>
        </a>
        <nav class="nav" aria-label="Módulos del sitio">
          ${PAGINAS.map((p) => `<a href="${p.url}" ${p.id === actual ? 'aria-current="page"' : ''}>${p.texto}</a>`).join('')}
        </nav>
      </div>
    </header>`;
}

function pintarPie() {
  $('#pie').outerHTML = `
    <footer class="pie">
      <a class="pie__instagram" href="https://www.instagram.com/sistemasunalmed/" target="_blank" rel="noopener"
        title="Instagram de la representación de Ingeniería de Sistemas">
        <span class="pie__escudo"><img src="img/logo-sistemas.jpg" alt="Logo oficial de Ingeniería de Sistemas e Informática" class="pie__escudo-img"></span>
        <span class="pie__usuario">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>
          @sistemasunalmed
        </span>
      </a>
      <p>Ingeniería de Sistemas e Informática · Facultad de Minas · Universidad Nacional de Colombia, Sede Medellín</p>
      <p class="pie__autores">Estilo basado en la web de la Semana de Sistemas, hecha por <strong>Santiago Escobar Arias</strong> y <strong>Jerónimo Hoyos Botero</strong></p>
    </footer>`;
}

pintarBarra();
pintarPie();
