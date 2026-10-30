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

// Contacto de una persona: chips de WhatsApp, correo e Instagram
const ICONO_PIE = {
  wpp: `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.07 7.71C8.89 7.71 8.6 7.78 8.36 8.04C8.11 8.3 7.41 8.96 7.41 10.3C7.41 11.63 8.38 12.92 8.52 13.1C8.66 13.29 10.42 16 13.12 17.17C15.36 18.14 15.82 17.95 16.31 17.9C16.8 17.86 17.88 17.26 18.11 16.63C18.33 16 18.33 15.46 18.26 15.35C18.2 15.24 18.01 15.18 17.73 15.04C17.45 14.9 16.08 14.23 15.83 14.13C15.57 14.04 15.39 13.99 15.2 14.27C15.02 14.55 14.49 15.18 14.33 15.36C14.17 15.55 14.01 15.57 13.73 15.43C13.45 15.29 12.27 14.9 10.87 13.65C9.78 12.68 9.05 11.48 8.84 11.12C8.63 10.76 8.82 10.56 8.96 10.42C9.09 10.29 9.25 10.08 9.39 9.92C9.53 9.76 9.58 9.64 9.67 9.46C9.76 9.27 9.72 9.11 9.65 8.97C9.58 8.83 9.07 7.58 8.86 7.07C8.66 6.58 8.45 6.64 8.3 6.63C8.15 6.63 7.97 6.63 7.78 6.63"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
};

function chipsContacto({ wpp, wppTexto, correo, ig, igTexto }) {
  const chips = [];
  if (wpp) chips.push(`<a class="pie__contacto-link pie__contacto-link--wpp" href="${wpp}" target="_blank" rel="noopener noreferrer">${ICONO_PIE.wpp}${wppTexto}</a>`);
  if (correo) chips.push(`<a class="pie__contacto-link" href="mailto:${correo}">${ICONO_PIE.mail}${correo}</a>`);
  if (ig) chips.push(`<a class="pie__contacto-link" href="${ig}" target="_blank" rel="noopener noreferrer">${ICONO_PIE.ig}${igTexto}</a>`);
  return `<div class="pie__contacto">${chips.join('<span class="pie__contacto-sep" aria-hidden="true">·</span>')}</div>`;
}

function pintarPie() {
  const santiago = chipsContacto({
    wpp: 'https://wa.me/573123772091', wppTexto: '(+57) 312 377 2091',
    correo: 'saescobara@unal.edu.co',
    ig: 'https://www.instagram.com/s_escobar__/', igTexto: '@s_escobar__',
  });
  const catalina = chipsContacto({
    wpp: 'https://wa.me/573044286946', wppTexto: '(+57) 304 428 6946',
    correo: 'carangosi@unal.edu.co',
    ig: 'https://www.instagram.com/_im.cata_', igTexto: '@_im.cata_',
  });

  $('#pie').outerHTML = `
    <footer class="pie">
      <div class="pie__marca">
        <span class="pie__escudo"><img src="img/logo-sistemas.jpg" alt="Logo oficial de Ingeniería de Sistemas e Informática" class="pie__escudo-img"></span>
        <div class="pie__redes">
          <a class="pie__red" href="https://www.instagram.com/sistemasunalmed/" target="_blank" rel="noopener noreferrer" title="Instagram de la representación de Ingeniería de Sistemas">
            ${ICONO_PIE.ig}@sistemasunalmed
          </a>
          <span class="pie__contacto-sep" aria-hidden="true">·</span>
          <a class="pie__red pie__red--wpp" href="https://whatsapp.com/channel/0029VbDdOLj7tkj9JIz27H1O" target="_blank" rel="noopener noreferrer" title="Canal de WhatsApp de la representación de Ingeniería de Sistemas">
            ${ICONO_PIE.wpp}Canal de WhatsApp
          </a>
        </div>
        <p class="pie__facultad"><strong>Ingeniería de Sistemas e Informática</strong> · Facultad de Minas · Universidad Nacional de Colombia, Sede Medellín</p>
      </div>

      <div class="pie__tarjetas">
        <section class="pie__tarjeta pie__tarjeta--repre" aria-label="Representación estudiantil">
          <h3 class="pie__tarjeta-titulo">Representación estudiantil · Ing. de Sistemas</h3>
          <div class="pie__bloque">
            <p class="pie__persona"><strong>Santiago Escobar Arias</strong> · Representante Estudiantil</p>
            ${santiago}
          </div>
          <div class="pie__bloque">
            <p class="pie__persona"><strong>Catalina Arango Sierra</strong> · Representante Suplente</p>
            ${catalina}
          </div>
        </section>
        <section class="pie__tarjeta pie__tarjeta--web" aria-label="Creación y desarrollo web">
          <h3 class="pie__tarjeta-titulo">Creación y desarrollo web</h3>
          <p class="pie__persona">Iniciativa y plataforma desarrollada por <strong>Santiago Escobar Arias</strong> · Representante de Sistemas</p>
          ${santiago}
        </section>
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
          <a class="toast-autor__enlace toast-autor__enlace--wpp" href="https://wa.me/573123772091" target="_blank" rel="noopener noreferrer" title="WhatsApp de la Representación de Sistemas">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.07 7.71C8.89 7.71 8.6 7.78 8.36 8.04C8.11 8.3 7.41 8.96 7.41 10.3C7.41 11.63 8.38 12.92 8.52 13.1C8.66 13.29 10.42 16 13.12 17.17C15.36 18.14 15.82 17.95 16.31 17.9C16.8 17.86 17.88 17.26 18.11 16.63C18.33 16 18.33 15.46 18.26 15.35C18.2 15.24 18.01 15.18 17.73 15.04C17.45 14.9 16.08 14.23 15.83 14.13C15.57 14.04 15.39 13.99 15.2 14.27C15.02 14.55 14.49 15.18 14.33 15.36C14.17 15.55 14.01 15.57 13.73 15.43C13.45 15.29 12.27 14.9 10.87 13.65C9.78 12.68 9.05 11.48 8.84 11.12C8.63 10.76 8.82 10.56 8.96 10.42C9.09 10.29 9.25 10.08 9.39 9.92C9.53 9.76 9.58 9.64 9.67 9.46C9.76 9.27 9.72 9.11 9.65 8.97C9.58 8.83 9.07 7.58 8.86 7.07C8.66 6.58 8.45 6.64 8.3 6.63C8.15 6.63 7.97 6.63 7.78 6.63"/></svg>
            312 377 2091
          </a>
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
