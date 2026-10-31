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

const estado = { texto: '', nombre: '', ritmo: null, historia: null, logros: [], usuarioId: null, statsLogros: null };

const GRUPOS_COMPONENTE = {
  fundamentacion: { nombre: 'Fundamentación', color: 'var(--fundamentacion)' },
  disciplinar: { nombre: 'Formación disciplinar o profesional', color: 'var(--disciplinar)' },
  libre: { nombre: 'Libre elección', color: 'var(--libre)' },
};

const formatear = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });


/* ---------- Iconos y Logros (definidos en data/logros.json) ---------- */

const normalizarTexto = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const ICONOS_LOGRO = {
  gamepad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="6"/></svg>`,
  'git-commit': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>`,
  codigo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  cohete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
  bandera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  fenix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
  globo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  arbol: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="3"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><path d="M12 8v4"/><path d="M6 16v-1a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1"/></svg>`,
  engranaje: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  rayo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  teorema: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 4H6l7 8-7 8h12"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  espada: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`,
  'escudo-check': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  calavera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M8 20v2h8v-2"/><path d="M12.5 17l-.5-1-.5 1"/><path d="M16 20a3 3 0 0 0 3-3v-4a7 7 0 1 0-14 0v4a3 3 0 0 0 3 3z"/></svg>`,
  corona: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`,
  dado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>`,
  fuego: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  armadura: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M5 10v3a7 7 0 0 0 14 0v-3"/><path d="M9 14h6"/><path d="M12 14v4"/><path d="M7 21h10"/></svg>`,
  'trofeo-platino': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/><polygon points="12 4 13.5 7.5 17 8 14.5 10.5 15 14 12 12.2 9 14 9.5 10.5 7 8 10.5 7.5 12 4"/></svg>`,
  'corazon-intacto': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v16"/></svg>`,
  reloj: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M22 6l-3-3"/><path d="M6 19l-2 2"/></svg>`,
  trofeo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  candado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

function renderIconoLogro(logro, ok) {
  const clave = logro.icono || logro.id;
  if (clave && ICONOS_LOGRO[clave]) return ICONOS_LOGRO[clave];
  if (typeof clave === 'string' && clave.trim().startsWith('<svg')) return clave;
  if (typeof clave === 'string' && clave.length <= 4) {
    return `<span class="logro__emoji" aria-hidden="true">${esc(clave)}</span>`;
  }
  if (clave && clave.includes('commit')) return ICONOS_LOGRO['git-commit'];
  if (clave && clave.includes('gamepad')) return ICONOS_LOGRO.gamepad;
  if (clave && clave.includes('codigo')) return ICONOS_LOGRO.codigo;
  if (clave && (clave.includes('beta') || clave.includes('cohete'))) return ICONOS_LOGRO.cohete;
  if (clave && (clave.includes('teorema') || clave.includes('math'))) return ICONOS_LOGRO.teorema;
  if (clave && (clave.includes('rayo') || clave.includes('overclock'))) return ICONOS_LOGRO.rayo;
  if (clave && (clave.includes('corona') || clave.includes('honor') || clave.includes('elegido'))) return ICONOS_LOGRO.corona;
  if (clave && (clave.includes('cpu') || clave.includes('nucleo'))) return ICONOS_LOGRO.cpu;
  if (clave && (clave.includes('escudo') || clave.includes('candidate'))) return ICONOS_LOGRO['escudo-check'];
  if (clave && (clave.includes('bandera') || clave.includes('checkpoint'))) return ICONOS_LOGRO.bandera;
  if (clave && (clave.includes('espada') || clave.includes('guerra'))) return ICONOS_LOGRO.espada;
  if (clave && (clave.includes('arbol') || clave.includes('habilidad'))) return ICONOS_LOGRO.arbol;
  if (clave && (clave.includes('engranaje') || clave.includes('build'))) return ICONOS_LOGRO.engranaje;
  if (clave && (clave.includes('jefe') || clave.includes('calavera'))) return ICONOS_LOGRO.calavera;
  if (clave && (clave.includes('fuego') || clave.includes('combo'))) return ICONOS_LOGRO.fuego;
  if (clave && (clave.includes('reloj') || clave.includes('speedrun'))) return ICONOS_LOGRO.reloj;
  if (clave && (clave.includes('corazon') || clave.includes('no-hit'))) return ICONOS_LOGRO['corazon-intacto'];
  if (clave && (clave.includes('armadura') || clave.includes('ironman'))) return ICONOS_LOGRO.armadura;
  if (clave && (clave.includes('dado') || clave.includes('millon'))) return ICONOS_LOGRO.dado;
  if (clave && (clave.includes('fenix') || clave.includes('error'))) return ICONOS_LOGRO.fenix;
  if (clave && (clave.includes('globo') || clave.includes('polyglot') || clave.includes('ingles'))) return ICONOS_LOGRO.globo;
  if (clave && (clave.includes('terminal') || clave.includes('senior') || clave.includes('dev'))) return ICONOS_LOGRO.terminal;
  if (clave && (clave.includes('platino') || clave.includes('completionist'))) return ICONOS_LOGRO['trofeo-platino'];

  return ICONOS_LOGRO.trofeo;
}

function logroDesbloqueado(logro, avance, historia) {
  const regla = logro.regla || {};
  const minimo = Number(regla.minimo);
  switch (regla.tipo) {
    case 'creditos_aprobados':
      return avance.aprobados >= minimo;

    case 'avance':
      return avance.porcentaje >= minimo;

    case 'componente_completo': {
      const fila = historia.resumen[regla.clave];
      return Boolean(fila) && fila.exigidos > 0 && (fila.pendientes === 0 || fila.aprobados >= fila.exigidos);
    }

    case 'nota_en_grupo': {
      const claves = TIPOLOGIAS.filter((t) => t.grupo === regla.grupo).map((t) => t.clave);
      return historia.materias.some((m) => m.estado === 'APROBADA' && claves.includes(m.tipologia) && m.nota !== null && m.nota > minimo);
    }

    case 'papa':
      return historia.papa !== null && historia.papa >= minimo;

    case 'materias_aprobadas':
      return avance.materiasAprobadas >= minimo;

    case 'speedrun':
      // Graduado en menos de 10 semestres
      return Boolean((avance.completo || avance.porcentaje >= 100) && avance.semestresCursados > 0 && avance.semestresCursados < 10);

    case 'materias_con_nota': {
      const notaMeta = Number(regla.nota || 5.0);
      const cuenta = historia.materias.filter((m) => m.estado === 'APROBADA' && m.nota !== null && m.nota >= notaMeta).length;
      return cuenta >= minimo;
    }

    case 'sin_perder_materias': {
      // Carrera terminada y 0 materias reprobadas
      const terminada = avance.completo || avance.porcentaje >= 100;
      const huboReprobada = historia.materias.some((m) => m.estado === 'REPROBADA' || (m.nota !== null && m.nota < 3.0 && m.estado !== 'CANCELADA'));
      return terminada && !huboReprobada;
    }

    case 'sin_cancelar': {
      // Carrera terminada y 0 asignaturas canceladas
      const terminada = avance.completo || avance.porcentaje >= 100;
      const canceloAsignatura = historia.materias.some((m) => m.estado === 'CANCELADA' || normalizarTexto(m.estado).includes('CANCELAD'));
      return terminada && !canceloAsignatura;
    }

    case 'ingles_completo': {
      const materiasIngles = historia.materias.filter((m) => {
        const nom = normalizarTexto(m.nombre);
        return m.estado === 'APROBADA' && (nom.includes('INGLES') || nom.includes('ENGLISH'));
      });
      const tieneNivel4 = materiasIngles.some((m) => {
        const nom = normalizarTexto(m.nombre);
        return /\b(4|IV)\b/.test(nom) || nom.includes('SUFICIENCIA') || nom.includes('ACREDITACION') || nom.includes('CLASIFICACION');
      });
      return tieneNivel4 || materiasIngles.length >= 4;
    }

    case 'materia_especifica': {
      // Valida si la aprobó, la cursó o la tiene matriculada/inscrita en este momento
      const patron = regla.patron ? normalizarTexto(regla.patron) : 'DATOS ESTAD';
      const enMaterias = historia.materias.some((m) => {
        const nom = normalizarTexto(m.nombre);
        return nom.includes(patron) || (nom.includes('MANEJO DE DATOS') && nom.includes('ESTAD'));
      });
      if (enMaterias) return true;

      // Por si aparece como materia matriculada en el periodo vigente en el texto pegado del SIA
      const textoRaw = normalizarTexto(estado.texto || '');
      return (textoRaw.includes('MANEJO DE DATOS') && textoRaw.includes('ESTAD')) ||
             textoRaw.includes('DATOS ESTADISTICOS') ||
             textoRaw.includes('3006913');
    }

    case 'reprobada_luego_aprobada': {
      const porMateria = new Map();
      historia.materias.forEach((m) => {
        const clave = m.codigo || normalizarTexto(m.nombre);
        const arr = porMateria.get(clave) || [];
        arr.push(m);
        porMateria.set(clave, arr);
      });
      for (const [, intentos] of porMateria) {
        const huboReprobada = intentos.some((m) => m.estado === 'REPROBADA' || (m.nota !== null && m.nota < 3.0 && m.estado !== 'CANCELADA'));
        const huboAprobada = intentos.some((m) => m.estado === 'APROBADA');
        if (huboReprobada && huboAprobada) return true;
      }
      return false;
    }

    case 'avance_y_papa': {
      const minAvance = Number(regla.minimoAvance || 80);
      const minPapa = Number(regla.minimoPapa || 4.3);
      return avance.porcentaje >= minAvance && historia.papa !== null && historia.papa > minPapa;
    }

    default:
      return false;
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
      <section class="panel logros" aria-label="Logros y Desafíos">
        <p class="panel__titulo">Logros y Desafíos</p>
        <ul class="logros__rejilla">
          ${Array.from({ length: 6 }, () => `<li class="logro logro--bloqueado"><span class="logro__icono">${ICONOS_LOGRO.candado}</span><span class="logro__nombre">???</span></li>`).join('')}
        </ul>
        <p class="logros__proximamente">Muy pronto: los logros que desbloquearás con tu avance y que sumarán a tus puntos.</p>
      </section>`;
  }

  const desbloqueados = lista.filter((l) => logroDesbloqueado(l, avance, historia));
  const puntosLogros = desbloqueados.reduce((s, l) => s + (Number(l.puntos) || 0), 0);

  const conteoRareza = {
    platino: { total: lista.filter((l) => l.categoria === 'platino').length, listos: desbloqueados.filter((l) => l.categoria === 'platino').length },
    oro: { total: lista.filter((l) => l.categoria === 'oro').length, listos: desbloqueados.filter((l) => l.categoria === 'oro').length },
    plata: { total: lista.filter((l) => l.categoria === 'plata').length, listos: desbloqueados.filter((l) => l.categoria === 'plata').length },
    bronce: { total: lista.filter((l) => l.categoria === 'bronce').length, listos: desbloqueados.filter((l) => l.categoria === 'bronce').length },
  };

  return `
    <section class="panel logros" aria-label="Logros y Desafíos">
      <div class="logros__cabecera">
        <div>
          <p class="panel__titulo">Logros y Desafíos</p>
          <p class="logros__progreso-texto"><b>${desbloqueados.length}</b> de <b>${lista.length}</b> desbloqueados <span class="separador-punto">·</span> <b>${puntosLogros}</b> puntos acumulados</p>
        </div>
        <div class="logros__chips-resumen">
          <span class="chip-rareza chip-rareza--platino" title="Logros Platino">Platino: ${conteoRareza.platino.listos}/${conteoRareza.platino.total}</span>
          <span class="chip-rareza chip-rareza--oro" title="Logros Oro">Oro: ${conteoRareza.oro.listos}/${conteoRareza.oro.total}</span>
          <span class="chip-rareza chip-rareza--plata" title="Logros Plata">Plata: ${conteoRareza.plata.listos}/${conteoRareza.plata.total}</span>
          <span class="chip-rareza chip-rareza--bronce" title="Logros Bronce">Bronce: ${conteoRareza.bronce.listos}/${conteoRareza.bronce.total}</span>
        </div>
      </div>

      <div class="logros__filtros" role="toolbar" aria-label="Filtrar logros">
        <button type="button" class="logros__filtro is-activo" data-filtro="todos">Todos (${lista.length})</button>
        <button type="button" class="logros__filtro" data-filtro="desbloqueados">Completados (${desbloqueados.length})</button>
        <button type="button" class="logros__filtro" data-filtro="platino">Platino (${conteoRareza.platino.listos}/${conteoRareza.platino.total})</button>
        <button type="button" class="logros__filtro" data-filtro="oro">Oro (${conteoRareza.oro.listos}/${conteoRareza.oro.total})</button>
        <button type="button" class="logros__filtro" data-filtro="plata">Plata (${conteoRareza.plata.listos}/${conteoRareza.plata.total})</button>
        <button type="button" class="logros__filtro" data-filtro="bronce">Bronce (${conteoRareza.bronce.listos}/${conteoRareza.bronce.total})</button>
      </div>

      <ul class="logros__rejilla">
        ${lista.map((l) => {
          const ok = logroDesbloqueado(l, avance, historia);
          const cat = l.categoria || 'bronce';
          const pct = (estado.statsLogros && estado.statsLogros[l.id] !== undefined)
            ? estado.statsLogros[l.id]
            : (l.porcentaje !== undefined ? l.porcentaje : 25.0);
          const pctTexto = formatear(pct, 1) + '%';

          return `<li class="logro logro--${cat} ${ok ? 'logro--listo' : 'logro--bloqueado'}" data-categoria="${cat}" title="${esc(l.nombre)}: ${esc(l.descripcion)} · Desbloqueado por el ${pctTexto} de los usuarios">
            <div class="logro__cabecera-meta">
              <span class="logro__rareza logro__rareza--${cat}">${cat.toUpperCase()}</span>
              <span class="logro__pct-badge" title="${pctTexto} de los usuarios tienen este logro">${pctTexto}</span>
            </div>
            <span class="logro__icono">${renderIconoLogro(l, ok)}</span>
            <span class="logro__nombre">${esc(l.nombre)}</span>
            <span class="logro__desc">${esc(l.descripcion)}</span>
            <div class="logro__meta-pie">
              <span class="logro__pts">+${esc(l.puntos)} pts</span>
              <span class="logro__estado-tag">${ok ? 'Desbloqueado' : 'Bloqueado'}</span>
            </div>
            <div class="logro__comunidad" title="Desbloqueado por el ${pctTexto} de los usuarios">
              <div class="logro__comunidad-barra-track" aria-hidden="true">
                <div class="logro__comunidad-barra" style="width: ${Math.min(100, Math.max(3, pct))}%;"></div>
              </div>
              <span class="logro__comunidad-texto">${pctTexto} de los usuarios lo tienen</span>
            </div>
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

  // Sincronizar logros con Supabase para estadísticas globales si el usuario está autenticado
  if (typeof ServicioAuth !== 'undefined' && ServicioAuth.sincronizarLogrosDesbloqueados && estado.usuarioId) {
    const ids = desbloqueados.map((l) => l.id).filter(Boolean);
    ServicioAuth.sincronizarLogrosDesbloqueados(estado.usuarioId, ids).catch(() => {});
  }

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

  const botonesFiltro = $$('.logros__filtro', juego);
  botonesFiltro.forEach((btn) => {
    btn.addEventListener('click', () => {
      botonesFiltro.forEach((b) => b.classList.remove('is-activo'));
      btn.classList.add('is-activo');
      const filtro = btn.dataset.filtro;
      const items = $$('.logro', juego);
      items.forEach((item) => {
        let visible = true;
        if (filtro === 'desbloqueados') visible = item.classList.contains('logro--listo');
        else if (filtro === 'bloqueados') visible = item.classList.contains('logro--bloqueado');
        else if (['platino', 'oro', 'plata', 'bronce'].includes(filtro)) visible = item.dataset.categoria === filtro;
        item.hidden = !visible;
      });
    });
  });
}

function persistir() {
  guardado.escribir({ texto: estado.texto, nombre: estado.nombre, ritmo: estado.ritmo });
  if (typeof ServicioAuth !== 'undefined' && ServicioAuth.actualizarHistoria) {
    ServicioAuth.actualizarHistoria(estado.texto, estado.ritmo).catch((e) => {
      console.warn('Error al sincronizar con el perfil:', e);
    });
  }
}

function mostrarError(mensaje) {
  const caja = $('#entrada-error');
  if (caja) {
    caja.textContent = mensaje;
    caja.hidden = !mensaje;
  }
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
  const btnBorrar = $('#btn-borrar');
  if (btnBorrar) btnBorrar.hidden = false;
  dibujar();
  const entrada = $('#entrada');
  if (entrada) entrada.open = false;
  return true;
}

/* ---------- Control de Autenticación y Vistas ---------- */

function aplicarSesion(usuario) {
  const tarjetaAuth = $('#tarjeta-auth');
  const barraSesion = $('#barra-sesion');
  const sesionCorreo = $('#sesion-correo');
  const zonaAvance = $('#zona-avance');

  if (tarjetaAuth) tarjetaAuth.hidden = true;
  if (barraSesion) barraSesion.hidden = false;
  if (sesionCorreo) sesionCorreo.textContent = usuario.correo || 'Estudiante Sistemas UNAL';
  if (zonaAvance) zonaAvance.hidden = false;

  estado.usuarioId = usuario.id || null;
  estado.nombre = usuario.nombre || '';
  estado.ritmo = usuario.ritmo || null;

  // Consultar estadísticas globales de la comunidad si Supabase está activo
  if (typeof ServicioAuth !== 'undefined' && ServicioAuth.obtenerEstadisticasLogros) {
    ServicioAuth.obtenerEstadisticasLogros().then((stats) => {
      if (stats) {
        estado.statsLogros = stats;
        if (estado.historia) dibujar();
      }
    }).catch(() => {});
  }

  const textoAProcesar = usuario.historiaTexto || (guardado.leer()?.texto) || '';
  if (textoAProcesar) {
    $('#historia-texto').value = textoAProcesar;
    procesar(textoAProcesar, true);
  } else {
    const entrada = $('#entrada');
    if (entrada) entrada.open = true;
  }
}

function aplicarSinSesion() {
  const tarjetaAuth = $('#tarjeta-auth');
  const barraSesion = $('#barra-sesion');
  const zonaAvance = $('#zona-avance');

  if (barraSesion) barraSesion.hidden = true;
  if (zonaAvance) zonaAvance.hidden = true;
  if (tarjetaAuth) tarjetaAuth.hidden = false;

  estado.texto = '';
  estado.nombre = '';
  estado.ritmo = null;
  estado.historia = null;

  const juego = $('#avance-juego');
  if (juego) juego.innerHTML = '';
  const historiaTexto = $('#historia-texto');
  if (historiaTexto) historiaTexto.value = '';
}

function mostrarAlertaAuth(el, mensaje, tipo = 'error') {
  if (!el) return;
  el.className = 'tarjeta-auth__alerta' + (tipo === 'exito' ? ' tarjeta-auth__alerta--exito' : '');
  el.textContent = mensaje;
  el.hidden = !mensaje;
}

function configurarTabsAuth() {
  const tabLogin = $('#tab-login');
  const tabRegistro = $('#tab-registro');
  const formLogin = $('#form-login');
  const formRegistro = $('#form-registro');
  const loginAlerta = $('#login-alerta');
  const registroAlerta = $('#registro-alerta');

  if (!tabLogin || !tabRegistro || !formLogin || !formRegistro) return;

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('is-activa');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegistro.classList.remove('is-activa');
    tabRegistro.setAttribute('aria-selected', 'false');
    formLogin.hidden = false;
    formRegistro.hidden = true;
    mostrarAlertaAuth(loginAlerta, '');
  });

  tabRegistro.addEventListener('click', () => {
    tabRegistro.classList.add('is-activa');
    tabRegistro.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('is-activa');
    tabLogin.setAttribute('aria-selected', 'false');
    formRegistro.hidden = false;
    formLogin.hidden = true;
    mostrarAlertaAuth(registroAlerta, '');
  });
}

function configurarFormulariosAuth() {
  const formLogin = $('#form-login');
  const formRegistro = $('#form-registro');
  const loginAlerta = $('#login-alerta');
  const registroAlerta = $('#registro-alerta');
  const btnLogin = $('#btn-login-enviar');
  const btnRegistro = $('#btn-registro-enviar');

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      mostrarAlertaAuth(loginAlerta, '');
      const email = $('#login-email').value.trim();
      const password = $('#login-password').value;

      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = 'Iniciando sesión...';
      }

      try {
        const usuario = await ServicioAuth.iniciarSesion(email, password);
        aplicarSesion(usuario);
      } catch (err) {
        mostrarAlertaAuth(loginAlerta, err.message || 'Error al iniciar sesión.');
      } finally {
        if (btnLogin) {
          btnLogin.disabled = false;
          btnLogin.textContent = 'Iniciar Sesión';
        }
      }
    });
  }

  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      mostrarAlertaAuth(registroAlerta, '');
      const email = $('#registro-email').value.trim();
      const password = $('#registro-password').value;
      const passConf = $('#registro-password-confirma').value;
      const histTexto = $('#registro-historia').value;

      if (password !== passConf) {
        mostrarAlertaAuth(registroAlerta, 'Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }

      if (btnRegistro) {
        btnRegistro.disabled = true;
        btnRegistro.textContent = 'Verificando y registrando...';
      }

      try {
        const res = await ServicioAuth.registrar(email, password, histTexto);
        if (res.necesitaConfirmarEmail) {
          mostrarAlertaAuth(
            registroAlerta,
            '¡Registro exitoso! Se ha enviado un correo de confirmación a tu dirección institucional. Por favor verifica tu bandeja para activar el acceso.',
            'exito'
          );
        } else {
          aplicarSesion(res.usuario);
        }
      } catch (err) {
        mostrarAlertaAuth(registroAlerta, err.message || 'Error en el registro.');
      } finally {
        if (btnRegistro) {
          btnRegistro.disabled = false;
          btnRegistro.textContent = 'Verificar programa y Registrarme';
        }
      }
    });
  }

  const btnCerrar = $('#btn-cerrar-sesion');
  if (btnCerrar) {
    btnCerrar.addEventListener('click', async () => {
      await ServicioAuth.cerrarSesion();
      guardado.borrar();
      aplicarSinSesion();
    });
  }
}

async function inicializarAutenticacion() {
  configurarTabsAuth();
  configurarFormulariosAuth();

  const estadoDbTexto = $('#estado-db-texto');
  if (estadoDbTexto) {
    const conectado = typeof estaSupabaseConfigurado === 'function' && estaSupabaseConfigurado();
    if (conectado) {
      estadoDbTexto.innerHTML = '<strong>Base de datos:</strong> Supabase conectado exitosamente.';
    } else {
      estadoDbTexto.innerHTML = '<strong>Modo de prueba local:</strong> Para conectar tu base de datos en la nube de Supabase, agrega tus credenciales en <code>js/supabase-config.js</code>.';
    }
  }

  const sesion = await ServicioAuth.obtenerSesion();
  if (sesion && sesion.usuario) {
    aplicarSesion(sesion.usuario);
  } else {
    aplicarSinSesion();
  }
}

async function iniciar() {
  try {
    const d = await cargarDatos('logros');
    estado.logros = d.logros || [];
  } catch {
    estado.logros = [];
  }

  await inicializarAutenticacion();

  $('#btn-guardar')?.addEventListener('click', () => {
    const texto = $('#historia-texto').value.trim();
    if (!texto) { mostrarError('Pega primero tu historia académica.'); return; }
    if (procesar(texto, false)) {
      persistir();
      $('#avance-juego').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  $('#btn-borrar')?.addEventListener('click', () => {
    guardado.borrar();
    if (typeof ServicioAuth !== 'undefined' && ServicioAuth.actualizarHistoria) {
      ServicioAuth.actualizarHistoria('', null);
    }
    estado.texto = ''; estado.nombre = ''; estado.ritmo = null; estado.historia = null;
    $('#historia-texto').value = '';
    const juego = $('#avance-juego');
    if (juego) {
      juego.hidden = true;
      juego.innerHTML = '';
    }
    const btnBorrar = $('#btn-borrar');
    if (btnBorrar) btnBorrar.hidden = true;
    const entrada = $('#entrada');
    if (entrada) entrada.open = true;
  });
}

iniciar();
