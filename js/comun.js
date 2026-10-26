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
    <header class="barra" id="encabezado-barra">
      <div class="contenedor barra__contenido">
        <a class="barra__marca" href="index.html" aria-label="Ingeniería de Sistemas e Informática, inicio">
          <span class="barra__escudo"><img src="img/logo-sistemas.jpg" alt="Logo oficial de Ingeniería de Sistemas e Informática" class="barra__escudo-img"></span>
          <span class="barra__texto">Ingeniería de Sistemas e Informática<small>UNAL · Sede Medellín</small></span>
        </a>
        <button class="barra__boton-menu" id="btn-menu" type="button" aria-expanded="false" aria-controls="menu-navegacion" aria-label="Abrir menú de navegación">
          <span class="barra__icono barra__icono--abrir" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </span>
          <span class="barra__icono barra__icono--cerrar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </span>
          <span class="barra__boton-texto">Menú</span>
        </button>
        <nav class="nav" id="menu-navegacion" aria-label="Módulos del sitio">
          ${PAGINAS.map((p) => `<a href="${p.url}" ${p.id === actual ? 'aria-current="page"' : ''}>${p.texto}</a>`).join('')}
        </nav>
      </div>
    </header>`;

  configurarMenuMovil();
}

function configurarMenuMovil() {
  const barra = $('#encabezado-barra');
  const btn = $('#btn-menu');
  const nav = $('#menu-navegacion');
  if (!barra || !btn || !nav) return;

  function toggleMenu(abrir) {
    const estaAbierto = abrir !== undefined ? abrir : !barra.classList.contains('is-menu-abierto');
    barra.classList.toggle('is-menu-abierto', estaAbierto);
    btn.setAttribute('aria-expanded', String(estaAbierto));
    btn.setAttribute('aria-label', estaAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      toggleMenu(false);
    }
  });

  document.addEventListener('click', (e) => {
    if (barra.classList.contains('is-menu-abierto') && !barra.contains(e.target)) {
      toggleMenu(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && barra.classList.contains('is-menu-abierto')) {
      toggleMenu(false);
      btn.focus();
    }
  });
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
      <div class="pie__creditos">
        <p class="pie__autores">Iniciativa creada y desarrollada por <strong>Santiago Escobar Arias</strong> · Representante Estudiantil</p>
        <div class="pie__contacto">
          <a class="pie__contacto-link" href="mailto:saescobara@unal.edu.co" title="Escribir al correo de Santiago">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            saescobara@unal.edu.co
          </a>
          <span class="pie__contacto-sep" aria-hidden="true">·</span>
          <a class="pie__contacto-link" href="https://www.instagram.com/s_escobar__/" target="_blank" rel="noopener noreferrer" title="Instagram de Santiago Escobar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            @s_escobar__
          </a>
        </div>
      </div>
    </footer>`;
}

/* ---------- Mensaje de bienvenida y reconocimiento del creador ---------- */

function mostrarMensajeAutor() {
  if (sessionStorage.getItem('mensaje_autor_cerrado') === '1') return;

  const toast = document.createElement('aside');
  toast.className = 'toast-autor';
  toast.id = 'toast-autor';
  toast.setAttribute('aria-label', 'Mensaje del creador del portal');
  toast.innerHTML = `
    <div class="toast-autor__tarjeta">
      <button class="toast-autor__cerrar" id="toast-autor-cerrar" type="button" aria-label="Cerrar mensaje">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div class="toast-autor__cabecera">
        <div class="toast-autor__avatar" aria-hidden="true">
          <img src="img/logo-sistemas.jpg" alt="" class="toast-autor__avatar-img">
        </div>
        <div class="toast-autor__titulos">
          <span class="toast-autor__nombre">Santiago Escobar Arias</span>
          <span class="toast-autor__cargo">Representante Estudiantil</span>
        </div>
      </div>

      <p class="toast-autor__mensaje">
        ¡Hola! Creé este portal con el propósito de apoyar, guiar y facilitar la vida universitaria de todos los estudiantes de <strong>Ingeniería de Sistemas e Informática</strong>. Seguiré incluyendo más herramientas, funciones y recursos para acompañarte en tu paso por la U.
      </p>

      <div class="toast-autor__pie">
        <div class="toast-autor__redes">
          <a class="toast-autor__enlace" href="https://www.instagram.com/s_escobar__/" target="_blank" rel="noopener noreferrer" title="Instagram de Santiago">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            @s_escobar__
          </a>
          <a class="toast-autor__enlace" href="mailto:saescobara@unal.edu.co" title="Correo de Santiago">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            saescobara@unal.edu.co
          </a>
        </div>
        <button class="toast-autor__btn-ok" id="toast-autor-ok" type="button">¡Entendido!</button>
      </div>
    </div>`;

  document.body.appendChild(toast);

  // Aparece suavemente después de 800ms
  setTimeout(() => {
    toast.classList.add('is-visible');
  }, 800);

  function cerrarToast() {
    toast.classList.remove('is-visible');
    toast.classList.add('is-hiding');
    sessionStorage.setItem('mensaje_autor_cerrado', '1');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  $('#toast-autor-cerrar')?.addEventListener('click', cerrarToast);
  $('#toast-autor-ok')?.addEventListener('click', cerrarToast);
}

pintarBarra();
pintarPie();
mostrarMensajeAutor();
