/* ==============================================================================
   AVATAR GEEK PERSONALIZABLE · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL
   5 arquetipos geek definidos con accesorios integrados (Hombre / Mujer) + Escudo Oficial.
   Sin emojis, nombres concisos, selector de color neón y botón de guardado explícito.
   Máximo 2 cambios por semana (hora Colombia UTC-5 / semana ISO).
   Almacenamiento ultra comprimido en localStorage y opcional en Supabase (~12 bytes).
   ============================================================================== */

const AVATAR_SISTEMAS = (() => {
  const CLAVE_AVATAR = 'sistemasunal.avatar.v1';
  // Clave v3 para reiniciar automáticamente el conteo tras las pruebas
  const CLAVE_LIMITE = 'sistemasunal.avatar.limite.v3';
  const MAX_CAMBIOS_SEMANA = 2;

  // Limpiar claves antiguas de prueba en local
  try {
    localStorage.removeItem('sistemasunal.avatar.limite');
    localStorage.removeItem('sistemasunal.avatar.limite.v2');
  } catch {}

  // Paleta de colores neón / acentos
  const COLORES = {
    cian: { id: 'cian', nombre: 'Cyber Cian', hex: '#00e5ff', glow: 'rgba(0, 229, 255, .6)' },
    verde: { id: 'verde', nombre: 'Terminal Verde', hex: '#10b981', glow: 'rgba(16, 185, 129, .6)' },
    ambar: { id: 'ambar', nombre: 'Ámbar Eléctrico', hex: '#f59e0b', glow: 'rgba(245, 158, 11, .6)' },
    purpura: { id: 'purpura', nombre: 'Synthwave', hex: '#d946ef', glow: 'rgba(217, 70, 239, .6)' },
    rojo: { id: 'rojo', nombre: 'Root Hacker', hex: '#ef4444', glow: 'rgba(239, 68, 68, .6)' },
    azul: { id: 'azul', nombre: 'Azul UNAL', hex: '#3b82f6', glow: 'rgba(59, 130, 246, .6)' },
  };

  // 5 Arquetipos geek definidos (accesorios integrados) + Escudo Oficial (sin emojis ni descripciones largas)
  const ARQUETIPOS = [
    { id: 'anon', nombre: 'Cypherpunk Hacker' },
    { id: 'terminal', nombre: 'Terminal Dev' },
    { id: 'netrunner', nombre: 'Netrunner Cyberpunk' },
    { id: 'pixel', nombre: 'Retro 8-Bit Gamer' },
    { id: 'cerebro', nombre: 'Ingeniero/a IA & Circuitos' },
    { id: 'logo', nombre: 'Escudo Oficial Sistemas' },
  ];

  // Semana actual en hora Colombia (UTC-5)
  function obtenerSemanaActual() {
    const ahora = new Date();
    const utc = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const bogota = new Date(utc - (3600000 * 5));
    const anio = bogota.getFullYear();
    const d = new Date(Date.UTC(bogota.getFullYear(), bogota.getMonth(), bogota.getDate()));
    const diaNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - diaNum);
    const anioInicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const semanaNum = Math.ceil((((d - anioInicio) / 86400000) + 1) / 7);
    return `${anio}-W${semanaNum}`;
  }

  // Consulta el límite de cambios semanal
  function obtenerEstadoLimite() {
    const semana = obtenerSemanaActual();
    try {
      const reg = JSON.parse(localStorage.getItem(CLAVE_LIMITE)) || {};
      if (reg.semana !== semana) {
        return { semana, cambios: 0, restantes: MAX_CAMBIOS_SEMANA };
      }
      const cambios = Number(reg.cambios) || 0;
      return { semana, cambios, restantes: Math.max(0, MAX_CAMBIOS_SEMANA - cambios) };
    } catch {
      return { semana, cambios: 0, restantes: MAX_CAMBIOS_SEMANA };
    }
  }

  // Registra un cambio en la semana (solo se llama al hacer clic explícito en Guardar)
  function registrarCambio() {
    const estado = obtenerEstadoLimite();
    estado.cambios += 1;
    estado.restantes = Math.max(0, MAX_CAMBIOS_SEMANA - estado.cambios);
    try {
      localStorage.setItem(CLAVE_LIMITE, JSON.stringify({ semana: estado.semana, cambios: estado.cambios }));
    } catch { /* sin almacenamiento */ }
  }

  // Reinicia el contador de cambios para pruebas
  function reestablecerLimite() {
    try {
      localStorage.removeItem(CLAVE_LIMITE);
    } catch {}
  }

  // Lee el avatar activo: formato compacto "base:genero:color" (ej. "anon:h:cian")
  function leerAvatar() {
    try {
      const raw = localStorage.getItem(CLAVE_AVATAR) || 'logo:h:cian';
      const [b, g, c] = raw.split(':');
      return {
        b: ARQUETIPOS.some(x => x.id === b) ? b : 'logo',
        g: (g === 'm' || g === 'mujer') ? 'm' : 'h',
        c: COLORES[c] ? c : 'cian'
      };
    } catch {
      return { b: 'logo', g: 'h', c: 'cian' };
    }
  }

  // Guarda el avatar activo en formato ultra compacto (~12 a 16 bytes)
  function guardarAvatar(config) {
    const codigo = `${config.b}:${config.g}:${config.c}`;
    try {
      localStorage.setItem(CLAVE_AVATAR, codigo);
    } catch { /* sin almacenamiento */ }

    if (typeof clienteSupabase !== 'undefined' && clienteSupabase) {
      try {
        clienteSupabase.auth.updateUser({ data: { avatar_geek: codigo } }).catch(() => {});
      } catch {}
    }
    return codigo;
  }

  // Genera el SVG del arquetipo seleccionado con su género y accesorios integrados
  function dibujarAvatarSvg(config) {
    if (config.b === 'logo') {
      return `<img src="img/logo-sistemas.jpg" alt="Logo de Sistemas" class="avatar-img-circulo" width="88" height="88">`;
    }

    const col = COLORES[config.c] || COLORES.cian;
    const colorHex = col.hex;
    const colorGlow = col.glow;
    const esMujer = config.g === 'm';

    let contenido = '';

    // 1. CYPHERPUNK / HACKER
    if (config.b === 'anon') {
      contenido = `
        <rect width="100" height="100" fill="#060a12"/>
        <path d="M15 90 C12 38 24 14 50 12 C76 14 88 38 85 90 C78 92 68 84 50 84 C32 84 22 92 15 90 Z" fill="#090e17" stroke="#1e293b" stroke-width="2.5"/>
        <path d="M22 86 C20 46 28 22 50 20 C72 22 80 46 78 86" fill="none" stroke="${colorHex}" stroke-width="1.5" opacity="0.6"/>

        ${esMujer ? `
          <path d="M24 50 C24 70 30 84 34 88" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
          <path d="M76 50 C76 68 72 80 68 86" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
          <path d="M28 36 C28 26 36 22 50 22 C64 22 72 26 72 36 C72 52 64 72 50 80 C36 72 28 52 28 36 Z" fill="#f8fafc" stroke="#334155" stroke-width="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,.7))"/>
          <ellipse cx="40" cy="40" rx="5.5" ry="2" fill="#090d16" stroke="${colorHex}" stroke-width="1.2"/>
          <ellipse cx="60" cy="40" rx="5.5" ry="2" fill="#090d16" stroke="${colorHex}" stroke-width="1.2"/>
          <line x1="34" y1="38" x2="46" y2="40" stroke="${colorHex}" stroke-width="1.2" opacity="0.75"/>
          <line x1="66" y1="38" x2="54" y2="40" stroke="${colorHex}" stroke-width="1.2" opacity="0.75"/>
          <ellipse cx="34" cy="48" rx="4" ry="2.5" fill="${colorHex}" opacity="0.4"/>
          <ellipse cx="66" cy="48" rx="4" ry="2.5" fill="${colorHex}" opacity="0.4"/>
          <path d="M44 60 Q50 63 56 60" fill="none" stroke="#090d16" stroke-width="2" stroke-linecap="round"/>
        ` : `
          <path d="M26 34 C26 24 36 20 50 20 C64 20 74 24 74 34 C74 54 66 74 50 82 C34 74 26 54 26 34 Z" fill="#f8fafc" stroke="#334155" stroke-width="2" filter="drop-shadow(0 4px 10px rgba(0,0,0,.7))"/>
          <ellipse cx="39" cy="40" rx="6" ry="2.5" fill="#090d16" stroke="${colorHex}" stroke-width="1.2"/>
          <ellipse cx="61" cy="40" rx="6" ry="2.5" fill="#090d16" stroke="${colorHex}" stroke-width="1.2"/>
          <path d="M34 56 Q42 50 50 56 Q58 50 66 56 Q50 60 34 56 Z" fill="#090d16"/>
          <polygon points="50,63 46,71 54,71" fill="#090d16"/>
          <ellipse cx="33" cy="48" rx="4" ry="2.5" fill="${colorHex}" opacity="0.35"/>
          <ellipse cx="67" cy="48" rx="4" ry="2.5" fill="${colorHex}" opacity="0.35"/>
        `}
      `;
    }

    // 2. TERMINAL DEV
    else if (config.b === 'terminal') {
      contenido = `
        <rect width="100" height="100" fill="#040812"/>
        <path d="M18 90 C16 42 26 18 50 16 C74 18 84 42 82 90 Z" fill="#0b1320" stroke="#1e293b" stroke-width="2"/>
        ${esMujer ? `
          <path d="M28 42 C24 60 25 80 30 88" fill="none" stroke="#2c3b52" stroke-width="6" stroke-linecap="round"/>
          <path d="M72 42 C76 60 75 80 70 88" fill="none" stroke="#2c3b52" stroke-width="6" stroke-linecap="round"/>
          <ellipse cx="50" cy="53" rx="19" ry="23" fill="#1b2434"/>
        ` : `
          <ellipse cx="50" cy="54" rx="20" ry="24" fill="#1b2434"/>
          <path d="M36 56 C36 72 42 78 50 78 C58 78 64 72 64 56" fill="none" stroke="#0f172a" stroke-width="4" opacity="0.5"/>
        `}
        <rect x="29" y="43" width="42" height="19" rx="4" fill="#020617" stroke="${colorHex}" stroke-width="2" filter="drop-shadow(0 0 6px ${colorGlow})"/>
        <line x1="50" y1="43" x2="50" y2="62" stroke="${colorHex}" stroke-width="1.2" opacity="0.5"/>
        <text x="34" y="57" font-family="monospace" font-size="11" font-weight="900" fill="${colorHex}">>&lowbar;</text>
        <text x="55" y="57" font-family="monospace" font-size="9.5" font-weight="700" fill="${colorHex}">${esMujer ? '&lt;/&gt;' : '$'}</text>
      `;
    }

    // 3. NETRUNNER CYBERPUNK
    else if (config.b === 'netrunner') {
      contenido = `
        <rect width="100" height="100" fill="#080718"/>
        <path d="M10 80 L90 80 M20 90 L80 90 M50 20 L50 85 M30 30 L50 80 M70 30 L50 80" stroke="${colorHex}" stroke-width="0.8" opacity="0.18"/>

        ${esMujer ? `
          <path d="M22 45 C20 25 35 18 50 18 C68 18 78 26 78 45 C78 65 80 82 82 86 C74 78 70 65 70 55 C65 60 55 60 50 60 C40 60 30 65 24 88 C20 75 22 55 22 45 Z" fill="#1e1b4b" stroke="#312e81" stroke-width="1.5"/>
          <path d="M72 30 C76 45 78 65 80 75" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
          <path d="M30 42 C30 28 40 24 50 24 C60 24 70 28 70 42 C70 64 60 76 50 76 C40 76 30 64 30 42 Z" fill="#1e2533"/>
        ` : `
          <path d="M34 16 Q50 10 66 16 L64 28 L36 28 Z" fill="${colorHex}" opacity="0.95" filter="drop-shadow(0 0 6px ${colorHex})"/>
          <path d="M30 42 C30 28 40 24 50 24 C60 24 70 28 70 42 C70 64 60 78 50 78 C40 78 30 64 30 42 Z" fill="#1e2533" stroke="#334155" stroke-width="1.5"/>
        `}

        <path d="M24 38 L76 38 L72 54 L28 54 Z" fill="#020617" stroke="${colorHex}" stroke-width="2" filter="drop-shadow(0 0 8px ${colorGlow})"/>
        <line x1="26" y1="46" x2="74" y2="46" stroke="${colorHex}" stroke-width="1.8" stroke-dasharray="4 2"/>
        <circle cx="28" cy="62" r="3" fill="#0f172a" stroke="${colorHex}" stroke-width="1.5"/>
        <line x1="28" y1="65" x2="28" y2="78" stroke="${colorHex}" stroke-width="1.5" stroke-dasharray="2 2"/>
      `;
    }

    // 4. RETRO 8-BIT GAMER
    else if (config.b === 'pixel') {
      contenido = `
        <rect width="100" height="100" fill="#0d0c18"/>
        <path d="M20 54 A30 30 0 0 1 80 54" fill="none" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
        <path d="M22 52 A28 28 0 0 1 78 52" fill="none" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>

        ${esMujer ? `
          <rect x="18" y="24" width="12" height="12" fill="${colorHex}"/>
          <rect x="70" y="24" width="12" height="12" fill="${colorHex}"/>
          <rect x="28" y="22" width="44" height="10" fill="${colorHex}"/>
          <rect x="26" y="32" width="48" height="38" fill="#fed7aa"/>
          <rect x="22" y="38" width="6" height="34" fill="${colorHex}"/>
          <rect x="72" y="38" width="6" height="34" fill="${colorHex}"/>
        ` : `
          <rect x="30" y="18" width="40" height="8" fill="${colorHex}"/>
          <rect x="26" y="26" width="48" height="8" fill="${colorHex}"/>
          <rect x="28" y="34" width="44" height="38" fill="#fed7aa"/>
        `}

        <rect x="14" y="44" width="10" height="22" rx="4" fill="#0f172a" stroke="${colorHex}" stroke-width="2" filter="drop-shadow(0 0 6px ${colorHex})"/>
        <rect x="76" y="44" width="10" height="22" rx="4" fill="#0f172a" stroke="${colorHex}" stroke-width="2" filter="drop-shadow(0 0 6px ${colorHex})"/>
        <rect x="32" y="42" width="16" height="10" fill="#000"/>
        <rect x="52" y="42" width="16" height="10" fill="#000"/>
        <rect x="46" y="44" width="8" height="4" fill="#000"/>
        <rect x="34" y="44" width="4" height="4" fill="#fff"/>
        <rect x="54" y="44" width="4" height="4" fill="#fff"/>
        <rect x="44" y="60" width="12" height="4" fill="#b91c1c"/>
      `;
    }

    // 5. INGENIERO/A IA & CIRCUITOS
    else if (config.b === 'cerebro') {
      contenido = `
        <rect width="100" height="100" fill="#040a16"/>
        <g stroke="${colorHex}" stroke-width="1.5" fill="none" opacity="0.35">
          <path d="M10 20 L30 20 L40 30"/>
          <path d="M90 20 L70 20 L60 30"/>
          <path d="M10 80 L35 80 L45 70"/>
          <path d="M90 80 L65 80 L55 70"/>
          <circle cx="10" cy="20" r="2.5" fill="${colorHex}"/>
          <circle cx="90" cy="20" r="2.5" fill="${colorHex}"/>
        </g>

        ${esMujer ? `
          <circle cx="50" cy="18" r="14" fill="#1e293b"/>
          <path d="M26 38 C26 24 36 20 50 20 C64 20 74 24 74 38 C74 62 62 76 50 76 C38 76 26 62 26 38 Z" fill="#2d3748"/>
          <path d="M28 42 C26 56 28 72 32 80" fill="none" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
          <path d="M72 42 C74 56 72 72 68 80" fill="none" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        ` : `
          <path d="M26 34 C26 22 36 18 50 18 C64 18 74 22 74 34 C74 42 70 44 70 44 L30 44 Z" fill="#1e293b"/>
          <path d="M28 40 C28 26 38 22 50 22 C62 22 72 26 72 40 C72 64 62 78 50 78 C38 78 28 64 28 40 Z" fill="#2d3748"/>
        `}

        <g stroke="${colorHex}" stroke-width="1.8" fill="none" filter="drop-shadow(0 0 5px ${colorGlow})">
          <path d="M34 50 L40 50 L44 58 L44 72"/>
          <circle cx="34" cy="50" r="2.5" fill="${colorHex}"/>
          <circle cx="44" cy="72" r="2.5" fill="${colorHex}"/>
        </g>

        <circle cx="39" cy="44" r="8" fill="#020617" stroke="${colorHex}" stroke-width="2" filter="drop-shadow(0 0 5px ${colorGlow})"/>
        <circle cx="61" cy="44" r="8" fill="#020617" stroke="${colorHex}" stroke-width="2" filter="drop-shadow(0 0 5px ${colorGlow})"/>
        <line x1="47" y1="44" x2="53" y2="44" stroke="${colorHex}" stroke-width="2"/>
        <circle cx="39" cy="44" r="2.5" fill="${colorHex}"/>
        <circle cx="61" cy="44" r="2.5" fill="${colorHex}"/>
        <rect x="45" y="60" width="10" height="7" rx="1.5" fill="#0f172a" stroke="${colorHex}" stroke-width="1"/>
        <text x="50" y="66" font-family="monospace" font-size="5.5" font-weight="bold" fill="#fff" text-anchor="middle">&lt;/&gt;</text>
      `;
    }

    return `
      <svg class="avatar-svg-circulo" viewBox="0 0 100 100" width="88" height="88" aria-label="Avatar de ${config.b} (${config.g === 'm' ? 'Mujer' : 'Hombre'})">
        <clipPath id="avatar-clip-${config.b}-${config.g}">
          <circle cx="50" cy="50" r="48"/>
        </clipPath>
        <g clip-path="url(#avatar-clip-${config.b}-${config.g})">
          ${contenido}
        </g>
        <circle cx="50" cy="50" r="48" fill="none" stroke="${colorHex}" stroke-width="2" opacity="0.65"/>
      </svg>
    `;
  }

  // Renderiza el avatar activo en la tarjeta del jugador
  function renderAvatarJugador() {
    const config = leerAvatar();
    return `
      <div class="jugador__avatar-cara" id="avatar-cara-activa" data-personalizar-avatar title="Personalizar tu avatar geek (máx. 2 cambios por semana)">
        ${dibujarAvatarSvg(config)}
      </div>
      <button type="button" class="jugador__avatar-editar" data-personalizar-avatar title="Personalizar tu avatar (máx. 2 por semana)" aria-label="Personalizar avatar">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    `;
  }

  // Abre el modal de personalización
  function abrirPersonalizador(contexto, alGuardar) {
    const avatarOriginal = leerAvatar();
    let tempConfig = { ...avatarOriginal };

    let modal = document.getElementById('dialogo-avatar');
    if (!modal) {
      modal = document.createElement('dialog');
      modal.id = 'dialogo-avatar';
      modal.className = 'dialogo-juego dialogo-avatar';
      document.body.appendChild(modal);
    }

    function renderModal() {
      const estadoLimite = obtenerEstadoLimite();
      const colActivo = COLORES[tempConfig.c] || COLORES.cian;
      const esMismo = avatarOriginal.b === tempConfig.b && avatarOriginal.g === tempConfig.g && avatarOriginal.c === tempConfig.c;
      const puedeGuardar = estadoLimite.restantes > 0 || esMismo;

      modal.innerHTML = `
        <button type="button" class="dialogo-juego__cerrar" aria-label="Cerrar">&times;</button>
        <h3 class="dialogo-avatar__titulo">Personalizar Avatar Geek</h3>
        <p class="dialogo-avatar__subtitulo">Ingeniería de Sistemas e Informática · UNAL</p>

        <!-- Previsualización en vivo dentro del anillo -->
        <div class="dialogo-avatar__preview-wrap">
          <div class="dialogo-avatar__preview-anillo" style="--glow: ${colActivo.glow}">
            ${dibujarAvatarSvg(tempConfig)}
          </div>
        </div>

        <!-- Indicador de límite semanal limpio (sin emojis) -->
        <div class="dialogo-avatar__limite ${estadoLimite.restantes > 0 ? 'dialogo-avatar__limite--ok' : 'dialogo-avatar__limite--bloqueado'}">
          <span>
            ${estadoLimite.restantes > 0 
              ? `Tienes <b>${estadoLimite.restantes} de ${MAX_CAMBIOS_SEMANA}</b> cambios disponibles esta semana.` 
              : `Límite alcanzado: máximo ${MAX_CAMBIOS_SEMANA} cambios por semana. Se reinicia el próximo lunes.`}
          </span>
        </div>

        <!-- 1. Arquetipos Geek (Sin emojis ni descripciones largas) -->
        <div class="dialogo-avatar__seccion">
          <label class="dialogo-avatar__label">1. Arquetipo</label>
          <div class="dialogo-avatar__grid-arquetipos">
            ${ARQUETIPOS.map(a => `
              <button type="button" class="dialogo-avatar__btn-arquetipo ${tempConfig.b === a.id ? 'is-activo' : ''}" data-sel-b="${a.id}">
                ${a.nombre}
              </button>
            `).join('')}
          </div>
        </div>

        ${tempConfig.b !== 'logo' ? `
          <!-- 2. Versión de Género (Limpio, sin emojis) -->
          <div class="dialogo-avatar__seccion">
            <label class="dialogo-avatar__label">2. Versión de Género</label>
            <div class="dialogo-avatar__fila-genero">
              <button type="button" class="dialogo-avatar__btn-genero ${tempConfig.g === 'h' ? 'is-activo' : ''}" data-sel-g="h">
                Hombre
              </button>
              <button type="button" class="dialogo-avatar__btn-genero ${tempConfig.g === 'm' ? 'is-activo' : ''}" data-sel-g="m">
                Mujer
              </button>
            </div>
          </div>

          <!-- 3. Selector de Color Neón -->
          <div class="dialogo-avatar__seccion">
            <label class="dialogo-avatar__label">3. Tono Neón / Acento</label>
            <div class="dialogo-avatar__fila-colores">
              ${Object.values(COLORES).map(c => `
                <button type="button" class="dialogo-avatar__btn-color ${tempConfig.c === c.id ? 'is-activo' : ''}" data-sel-c="${c.id}" style="--c: ${c.hex}" title="${c.nombre}" aria-label="${c.nombre}"></button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Botón de Guardar Siempre Visible -->
        <div class="dialogo-avatar__pie">
          <button type="button" class="btn-juego btn-juego--principal dialogo-avatar__btn-guardar" id="btn-guardar-avatar" ${puedeGuardar ? '' : 'disabled'}>
            ${puedeGuardar ? 'Guardar avatar' : 'Límite semanal alcanzado'}
          </button>
        </div>
      `;

      // Eventos del modal
      modal.querySelector('.dialogo-juego__cerrar').onclick = () => modal.close();

      modal.querySelectorAll('[data-sel-b]').forEach(btn => {
        btn.onclick = () => {
          tempConfig.b = btn.dataset.selB;
          renderModal();
        };
      });

      modal.querySelectorAll('[data-sel-g]').forEach(btn => {
        btn.onclick = () => {
          tempConfig.g = btn.dataset.selG;
          renderModal();
        };
      });

      modal.querySelectorAll('[data-sel-c]').forEach(btn => {
        btn.onclick = () => {
          tempConfig.c = btn.dataset.selC;
          renderModal();
        };
      });

      // El botón de guardar es el ÚNICO lugar donde se guarda y se descuenta el intento
      const btnGuardar = modal.querySelector('#btn-guardar-avatar');
      if (btnGuardar && puedeGuardar) {
        btnGuardar.onclick = () => {
          // Solo descuenta intento semanal si realmente cambió respecto al avatar guardado
          if (!esMismo) {
            registrarCambio();
          }
          guardarAvatar(tempConfig);
          modal.close();

          // Refrescar en vivo en la tarjeta del jugador
          const contenedor = document.getElementById('avatar-cara-activa');
          if (contenedor) {
            contenedor.innerHTML = dibujarAvatarSvg(tempConfig);
          }
          if (typeof alGuardar === 'function') alGuardar(tempConfig);
        };
      }
    }

    renderModal();
    if (!modal.open) {
      if (modal.showModal) modal.showModal();
      else modal.setAttribute('open', '');
    }
  }

  return {
    leerAvatar,
    guardarAvatar,
    renderAvatarJugador,
    abrirPersonalizador,
    obtenerEstadoLimite,
    reestablecerLimite,
  };
})();
