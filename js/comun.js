/* ==============================================================================
   PORTAL WEB OFICIAL · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL SEDE MEDELLÍN
   Arquitectura de software, maquetación y desarrollo integral por:
   Santiago Escobar Arias
   Representante Estudiantil de Ingeniería de Sistemas e Informática
   Facultad de Minas — Universidad Nacional de Colombia, Sede Medellín
   Email: saescobara@unal.edu.co | Instagram: @s_escobar__ | WhatsApp: (+57) 312 377 2091
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c
   Todos los derechos reservados © 2026. Ver LICENSE.
   ============================================================================== */

/* ---------- Huella digital y verificación de autoría ----------
   1. Sello visible en la consola del navegador (al abrir las herramientas de desarrollador).
   2. Datos de autoría congelados en `window` y atributos en <html> que se restauran si los quitan.
   3. Huella SHA-256 verificable: se recalcula en el navegador y se compara con la publicada.
   4. Marca invisible (caracteres de ancho cero) en textos visibles: sobrevive al copiar y pegar.
   Para comprobar una copia sospechosa: `node tools/verificar-huella.js <carpeta>`. */
const _SEA = Object.freeze({
  autor: 'Santiago Escobar Arias',
  rol: 'Representante Estudiantil de Sistemas e Informática',
  facultad: 'Facultad de Minas · Universidad Nacional de Colombia, Sede Medellín',
  email: 'saescobara@unal.edu.co',
  instagram: '@s_escobar__',
  wpp: '+573123772091',
  firma: 'SEA-SIS-UNAL-2026-AUTH-F45123',
  identidad: 'Santiago Escobar Arias|saescobara@unal.edu.co|sistemasunal|UNAL-MEDELLIN|2026',
  sha256: 'f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c',
  marca: 'SEA-SIS-2026',
});

// Convierte un texto en caracteres invisibles (ancho cero) para esconderlo en cadenas visibles
function marcaInvisible(texto = _SEA.marca) {
  const bits = [...texto].map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  return '‍' + [...bits].map((b) => (b === '0' ? '​' : '‌')).join('') + '‍';
}

(function registrarHuellaDigital() {
  try {
    Object.defineProperty(window, '__AUTOR_PLATAFORMA__', { value: _SEA, writable: false, configurable: false, enumerable: false });
    Object.defineProperty(window, '__SEA_FINGERPRINT__', { value: 'SEA-AUTH-SANTIAGO-ESCOBAR-ARIAS-UNAL-2026', writable: false, configurable: false, enumerable: false });
  } catch (_) { /* ya registrado */ }

  const sello = () => {
    if (typeof console === 'undefined' || !console.log) return;
    const encabezado = 'background:#0a2c52;color:#5cc8ff;font-family:monospace;font-size:13px;font-weight:bold;padding:7px 12px;border-radius:6px 6px 0 0;border:1.5px solid #2fa8ff;border-bottom:none;';
    const cuerpo = 'background:#eaf3fd;color:#0a2c52;font-family:sans-serif;font-size:11px;padding:10px 14px;border-radius:0 0 6px 6px;border:1.5px solid #bcdbfb;line-height:1.7;';
    console.log(
      '%c⌘  INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL MEDELLÍN%c\n' +
      '✦ Arquitectura y desarrollo: ' + _SEA.autor + '\n' +
      '✦ Cargo: ' + _SEA.rol + '\n' +
      '✦ Contacto: ' + _SEA.email + ' · Instagram: ' + _SEA.instagram + '\n' +
      '✦ Firma de autoría: ' + _SEA.firma + '\n' +
      '✦ Código protegido contra plagio, distribución o uso no autorizado (ver LICENSE).',
      encabezado, cuerpo
    );
  };
  sello();

  // Verificación real: SHA-256 de la identidad frente a la huella publicada
  try {
    const datos = new TextEncoder().encode(_SEA.identidad);
    window.crypto.subtle.digest('SHA-256', datos).then((buf) => {
      const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (hex === _SEA.sha256) console.log('%c✔ Huella de autoría verificada · ' + _SEA.sha256.slice(0, 16) + '…', 'color:#1a8f55;font-weight:bold;');
      else console.warn('⚠ La huella de autoría no coincide: el código fue alterado. Autor original: ' + _SEA.autor + ' (' + _SEA.email + ')');
    }).catch(() => {});
  } catch (_) { /* sin Web Crypto (p. ej. file://) */ }

  // Atributos de autoría en <html>: si alguien los borra, se restauran
  const poner = () => {
    const raiz = document.documentElement;
    if (raiz.getAttribute('data-author') !== _SEA.autor) raiz.setAttribute('data-author', _SEA.autor);
    if (raiz.getAttribute('data-developer') !== _SEA.email) raiz.setAttribute('data-developer', _SEA.email);
    if (raiz.getAttribute('data-auth-token') !== _SEA.firma) raiz.setAttribute('data-auth-token', _SEA.firma);
  };
  try {
    poner();
    new MutationObserver(poner).observe(document.documentElement, { attributes: true, attributeFilter: ['data-author', 'data-developer', 'data-auth-token'] });
  } catch (_) { /* sin DOM */ }

  // Si abren las herramientas de desarrollador con la página ya cargada, el sello se vuelve a mostrar
  let abiertas = false;
  setInterval(() => {
    const hay = (window.outerWidth - window.innerWidth > 160) || (window.outerHeight - window.innerHeight > 160);
    if (hay && !abiertas) sello();
    abiertas = hay;
  }, 1200);
})();
/* ---------- Control de horario de descanso nocturno (12:00 a. m. a 6:00 a. m. Colombia) ---------- */
(function verificarHorarioDescanso() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('bypass') === '1' || params.get('dev') === '1') {
      sessionStorage.setItem('sistemasunal.descanso.bypass', '1');
    }
    if (sessionStorage.getItem('sistemasunal.descanso.bypass') === '1') return;

    const ruta = (window.location.pathname || '').toLowerCase();
    const esPaginaDescanso = document.body?.dataset?.pagina === 'descanso' || ruta.endsWith('descanso.html');

    // Hora exacta en Colombia (America/Bogota, UTC-5)
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());

    let h = 0;
    for (const p of partes) {
      if (p.type === 'hour') h = parseInt(p.value, 10);
    }
    // Formato 24h: 0 a 5 corresponden a las 12:00 a. m. hasta las 5:59 a. m.
    const enDescanso = h >= 0 && h < 6;

    if (enDescanso && !esPaginaDescanso) {
      window.location.replace('descanso.html');
    } else if (!enDescanso && esPaginaDescanso) {
      window.location.replace('index.html');
    }
  } catch (_) {}
})();



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
  { id: 'avance', texto: 'Mi avance', url: 'avance.html' },
  { id: 'malla', texto: 'Malla curricular', url: 'malla.html' },
  { id: 'intercampus', texto: 'Rutas Intercampus', url: 'intercampus.html' },
  { id: 'convenios', texto: 'Convenios', url: 'convenios.html' },
  { id: 'info', texto: 'Información general', url: 'info.html' },
];

function pintarBarra() {
  const actual = document.body.dataset.pagina;
  $('#barra').outerHTML = `
    <header class="barra" id="encabezado-barra">
      <div class="barra__bus-laser" aria-hidden="true"></div>
      <div class="contenedor barra__contenido">
        <a class="barra__marca" href="index.html" aria-label="Ingeniería de Sistemas e Informática, inicio">
          <span class="barra__escudo">
            <img src="img/logo-sistemas.jpg" alt="Logo oficial de Ingeniería de Sistemas e Informática" class="barra__escudo-img">
            <span class="barra__nodo-led" title="Sistema online" aria-hidden="true"></span>
          </span>
          <span class="barra__texto">
            <span class="barra__texto-titulo">Ingeniería de Sistemas e Informática</span>
            <small class="barra__texto-sub"><span class="barra__prompt-sig">&gt;</span> UNAL · Sede Medellín</small>
          </span>
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
          <div class="nav__bus-linea" aria-hidden="true"></div>
          <div class="nav__glider" id="nav-glider" aria-hidden="true"></div>
          <div class="nav__particulas" id="nav-particulas" aria-hidden="true"></div>
          ${PAGINAS.map((p) => {
            const esActual = p.id === actual;
            const esAvance = p.id === 'avance';
            return `
              <a href="${p.url}" data-id="${p.id}" ${esActual ? 'aria-current="page"' : ''} class="nav__enlace ${esAvance ? 'nav__enlace--avance' : ''}">
                <span class="nav__label">${p.texto}</span>
                ${esAvance ? '<span class="nav__chip-exp" aria-hidden="true">EXP</span>' : ''}
              </a>`;
          }).join('')}
        </nav>
      </div>
    </header>`;

  configurarMenuMovil();
  configurarNavegacionBits();
}

function configurarNavegacionBits() {
  const nav = $('#menu-navegacion');
  if (!nav) return;
  const glider = $('#nav-glider');
  const contenedorParticulas = $('#nav-particulas');
  const enlaces = Array.from(nav.querySelectorAll('.nav__enlace'));
  const actualBtn = nav.querySelector('[aria-current="page"]');

  function posicionarGlider(enlace, suave = true) {
    if (!glider || !enlace || window.innerWidth <= 1140) {
      if (glider) glider.style.opacity = '0';
      return;
    }
    const rectNav = nav.getBoundingClientRect();
    const rectEl = enlace.getBoundingClientRect();
    const x = rectEl.left - rectNav.left;
    const w = rectEl.width;

    glider.style.transition = suave
      ? 'transform .22s cubic-bezier(0.2, 0.8, 0.2, 1), width .22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity .15s ease'
      : 'none';
    glider.style.transform = `translateX(${x}px)`;
    glider.style.width = `${w}px`;
    glider.style.opacity = '1';
  }

  if (actualBtn) {
    requestAnimationFrame(() => posicionarGlider(actualBtn, false));
  }

  window.addEventListener('resize', () => {
    const act = nav.querySelector('[aria-current="page"]');
    if (act) posicionarGlider(act, false);
  }, { passive: true });

  // Efecto de llegada al cargar la página si venimos de otra
  try {
    const raw = sessionStorage.getItem('sistemasunal.nav.transmision');
    if (raw) {
      const datos = JSON.parse(raw);
      sessionStorage.removeItem('sistemasunal.nav.transmision');
      if (Date.now() - datos.tiempo < 3500 && datos.destino === document.body.dataset.pagina && actualBtn) {
        actualBtn.classList.add('nav__enlace--llegada');
        crearChispasLlegada(actualBtn);
        setTimeout(() => actualBtn.classList.remove('nav__enlace--llegada'), 600);
      }
    }
  } catch (_) {}

  enlaces.forEach((enlace) => {
    enlace.addEventListener('pointerenter', () => {
      posicionarGlider(enlace, true);
    });

    enlace.addEventListener('click', (e) => {
      const destinoId = enlace.getAttribute('data-id');
      const actualId = document.body.dataset.pagina;

      if (destinoId === actualId) {
        e.preventDefault();
        actualBtn?.classList.add('nav__enlace--pulso');
        setTimeout(() => actualBtn?.classList.remove('nav__enlace--pulso'), 350);
        return;
      }

      // Si el usuario presiona Ctrl, Cmd, Shift o clic rueda, navegación estándar nativa
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      e.preventDefault();
      const urlDestino = enlace.href;

      let redirigido = false;
      const redirigir = () => {
        if (redirigido) return;
        redirigido = true;
        window.location.href = urlDestino;
      };

      // SEGURO A PRUEBA DE FALLOS: NUNCA se queda trabado; pase lo que pase redirige a los 200ms
      const fallbackTimer = setTimeout(redirigir, 200);

      try {
        sessionStorage.setItem('sistemasunal.nav.transmision', JSON.stringify({
          origen: actualId,
          destino: destinoId,
          tiempo: Date.now()
        }));

        dispararTransmisionBits(actualBtn || enlace, enlace, () => {
          clearTimeout(fallbackTimer);
          redirigir();
        });
      } catch (_) {
        clearTimeout(fallbackTimer);
        redirigir();
      }
    });
  });

  nav.addEventListener('pointerleave', () => {
    if (actualBtn) posicionarGlider(actualBtn, true);
  });

  function crearChispasLlegada(boton) {
    if (!contenedorParticulas) return;
    const rectNav = nav.getBoundingClientRect();
    const rectB = boton.getBoundingClientRect();
    const cx = rectB.left + rectB.width / 2 - rectNav.left;
    const cy = rectNav.height - 4;
    const bits = ['1', '0', '1', '0', '1', '0'];

    bits.forEach((char, i) => {
      const ang = (i / bits.length) * Math.PI * 2;
      const dist = 14 + Math.random() * 8;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist * 0.5;

      const p = document.createElement('span');
      p.className = 'bit-particula';
      p.textContent = char;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.setProperty('--cx', `${dx}px`);
      p.style.setProperty('--cy', `${dy}px`);
      p.style.animation = 'bitChispa 240ms ease-out forwards';
      contenedorParticulas.appendChild(p);

      setTimeout(() => p.remove(), 260);
    });
  }

  function dispararTransmisionBits(origen, destino, onComplete) {
    if (!contenedorParticulas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    const rectNav = nav.getBoundingClientRect();
    const rectA = origen.getBoundingClientRect();
    const rectB = destino.getBoundingClientRect();

    const x1 = rectA.left + rectA.width / 2 - rectNav.left;
    const x2 = rectB.left + rectB.width / 2 - rectNav.left;
    // La transmisión viaja por el riel inferior (NO corta el texto de las palabras)
    const yRail = rectNav.height - 4;

    posicionarGlider(destino, true);

    // Segmento láser en el riel inferior
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const segmento = document.createElement('div');
    segmento.className = 'nav__bus-segmento-activo';
    segmento.style.left = `${minX}px`;
    segmento.style.width = `${maxX - minX}px`;
    segmento.style.top = `${yRail}px`;
    contenedorParticulas.appendChild(segmento);

    // Ráfaga de bits a lo largo del riel
    const NUM_BITS = 8;
    const chars = ['1', '0', '1', '1', '0', '1', '0', '1'];
    const dx = x2 - x1;

    for (let i = 0; i < NUM_BITS; i++) {
      const bit = document.createElement('span');
      bit.className = 'bit-particula';
      bit.textContent = chars[i];
      bit.style.left = `${x1}px`;
      bit.style.top = `${yRail}px`;
      bit.style.setProperty('--dx', `${dx}px`);
      bit.style.setProperty('--dy', '0px');
      bit.style.animation = `bitVuelo 160ms ${i * 12}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`;
      contenedorParticulas.appendChild(bit);

      setTimeout(() => bit.remove(), 300);
    }

    // Impacto
    setTimeout(() => {
      destino.classList.add('is-recibiendo-bits');
    }, 120);

    // Finalizar transición y redirigir
    setTimeout(() => {
      segmento.remove();
      onComplete();
    }, 180);
  }
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

// Contacto de una persona: chips de WhatsApp, correo e Instagram (solo iconos accesibles)
const ICONO_PIE = {
  wpp: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.07 7.71C8.89 7.71 8.6 7.78 8.36 8.04C8.11 8.3 7.41 8.96 7.41 10.3C7.41 11.63 8.38 12.92 8.52 13.1C8.66 13.29 10.42 16 13.12 17.17C15.36 18.14 15.82 17.95 16.31 17.9C16.8 17.86 17.88 17.26 18.11 16.63C18.33 16 18.33 15.46 18.26 15.35C18.2 15.24 18.01 15.18 17.73 15.04C17.45 14.9 16.08 14.23 15.83 14.13C15.57 14.04 15.39 13.99 15.2 14.27C15.02 14.55 14.49 15.18 14.33 15.36C14.17 15.55 14.01 15.57 13.73 15.43C13.45 15.29 12.27 14.9 10.87 13.65C9.78 12.68 9.05 11.48 8.84 11.12C8.63 10.76 8.82 10.56 8.96 10.42C9.09 10.29 9.25 10.08 9.39 9.92C9.53 9.76 9.58 9.64 9.67 9.46C9.76 9.27 9.72 9.11 9.65 8.97C9.58 8.83 9.07 7.58 8.86 7.07C8.66 6.58 8.45 6.64 8.3 6.63C8.15 6.63 7.97 6.63 7.78 6.63"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
};

function chipsContacto({ wpp, wppTexto, correo, ig, igTexto }) {
  const chips = [];
  if (wpp) chips.push(`<a class="pie__contacto-link pie__contacto-link--wpp" href="${wpp}" target="_blank" rel="noopener noreferrer" title="WhatsApp: ${wppTexto}" aria-label="WhatsApp: ${wppTexto}">${ICONO_PIE.wpp}</a>`);
  if (correo) chips.push(`<a class="pie__contacto-link pie__contacto-link--mail" href="mailto:${correo}" title="Correo: ${correo}" aria-label="Correo institucional: ${correo}">${ICONO_PIE.mail}</a>`);
  if (ig) chips.push(`<a class="pie__contacto-link pie__contacto-link--ig" href="${ig}" target="_blank" rel="noopener noreferrer" title="Instagram: ${igTexto}" aria-label="Instagram: ${igTexto}">${ICONO_PIE.ig}</a>`);
  return `<div class="pie__contacto">${chips.join('')}</div>`;
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
            <p class="pie__persona"><strong>Catalina Arango Sierra</strong> · Representante Estudiantil</p>
            ${catalina}
          </div>
        </section>
        <section class="pie__tarjeta pie__tarjeta--web" aria-label="Creación y desarrollo web">
          <h3 class="pie__tarjeta-titulo">Creación y desarrollo web</h3>
          <p class="pie__persona">Iniciativa y plataforma desarrollada por <strong>Santiago Escobar Arias</strong> · Representante de Sistemas${marcaInvisible()}</p>
          ${santiago}
                </section>
      </div>

      <div class="pie__legal">
        <p class="pie__legal-texto">Proyecto estudiantil sin ánimo de lucro · Iniciativa académica e informativa para la comunidad universitaria de la Universidad Nacional de Colombia — Sede Medellín.</p>
        <p class="pie__legal-aviso"><strong>Aviso de Propiedad Intelectual y Seguridad:</strong> El diseño, arquitectura de software, código fuente, experiencia de usuario (UX/UI), herramientas interactivas e imágenes de vista previa están protegidos por la Ley 23 de 1982, Decisión Andina 351 y Arts. 270 y 271 del Código Penal Colombiano. Queda prohibida la reproducción parcial o total, plagio, copia de funcionalidades o ingeniería inversa sin autorización previa y por escrito del autor. Los logotipos e identidad visual son obra de la representación estudiantil y su uso requiere autorización expresa de la misma. Cualquier intento de vulneración o alteración informática será sancionado conforme a la Ley 1273 de 2009 (Delitos Informáticos).</p>
        <p class="pie__legal-enlaces"><a href="politica-datos.html">Política de tratamiento de datos personales</a></p>
        <p class="pie__copyright">© 2026 · Todos los derechos reservados.</p>
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


// Efecto bug / glitch cyber al presionar enlaces del pie
document.addEventListener('click', (e) => {
  const link = e.target.closest('.pie__contacto-link, .pie__red');
  if (!link) return;
  link.classList.remove('is-glitching');
  void link.offsetWidth; // retrigger reflow
  link.classList.add('is-glitching');
  setTimeout(() => link.classList.remove('is-glitching'), 450);
});

pintarBarra();
pintarPie();
mostrarMensajeAutor();
