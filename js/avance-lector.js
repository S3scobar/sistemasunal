/* ==============================================================================
   PORTAL WEB OFICIAL · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL SEDE MEDELLÍN
   Arquitectura de software, maquetación y desarrollo integral por:
   Santiago Escobar Arias · Representante Estudiantil de Sistemas e Informática
   Facultad de Minas — Universidad Nacional de Colombia, Sede Medellín
   Contacto: saescobara@unal.edu.co | Instagram: @s_escobar__ | WhatsApp: (+57) 312 377 2091
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c
   Todos los derechos reservados © 2026. Ver LICENSE.
   ============================================================================== */

/* =============================================
   MI AVANCE — LECTOR DE LA HISTORIA ACADÉMICA
   Recibe el texto que se copia del SIA (Ctrl+A, Ctrl+C) y lo convierte en datos.
   Todo ocurre en el navegador: el texto no se envía a ningún servidor.
   Sin dependencias del DOM, para poder probarlo aparte.
   ============================================= */

const CREDITOS_PLAN = 160;

const TIPOLOGIAS = [
  { clave: 'FUND. OBLIGATORIA', nombre: 'Fundamentación obligatoria', grupo: 'fundamentacion' },
  { clave: 'FUND. OPTATIVA', nombre: 'Fundamentación optativa', grupo: 'fundamentacion' },
  { clave: 'DISCIPLINAR OBLIGATORIA', nombre: 'Disciplinar obligatoria', grupo: 'disciplinar' },
  { clave: 'DISCIPLINAR OPTATIVA', nombre: 'Disciplinar optativa', grupo: 'disciplinar' },
  { clave: 'TRABAJO DE GRADO', nombre: 'Trabajo de grado', grupo: 'disciplinar' },
  { clave: 'LIBRE ELECCIÓN', nombre: 'Libre elección', grupo: 'libre' },
];

const quitarTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const entero = (t) => parseInt(t, 10);

// "2026-1S" -> { anio: 2026, num: 1 }
function leerPeriodo(texto) {
  const m = /^(\d{4})-(\d)/.exec(texto);
  return m ? { anio: entero(m[1]), num: entero(m[2]) } : null;
}
const clavePeriodo = (p) => p.anio * 10 + p.num;
const etiquetaPeriodo = (p) => `${p.anio}-${p.num}S`;
function siguientePeriodo(p) { return p.num >= 2 ? { anio: p.anio + 1, num: 1 } : { anio: p.anio, num: 2 }; }
function avanzarPeriodo(p, n) { let r = p; for (let i = 0; i < n; i += 1) r = siguientePeriodo(r); return r; }

// Normaliza el nombre de la tipología que muestra el SIA ("DISCIPLINAR OBLIGAT…", "NIVELACIÓN"…)
function normalizarTipologia(texto) {
  const t = quitarTildes(texto).toUpperCase().replace(/\s+/g, ' ').trim();
  if (t.startsWith('NIVELACION')) return 'NIVELACIÓN';
  if (t.startsWith('LIBRE')) return 'LIBRE ELECCIÓN';
  if (t.startsWith('TRABAJO')) return 'TRABAJO DE GRADO';
  if (t.startsWith('FUND') && t.includes('OPTAT')) return 'FUND. OPTATIVA';
  if (t.startsWith('FUND')) return 'FUND. OBLIGATORIA';
  if (t.startsWith('DISCIPLINAR') && t.includes('OPTAT')) return 'DISCIPLINAR OPTATIVA';
  if (t.startsWith('DISCIPLINAR')) return 'DISCIPLINAR OBLIGATORIA';
  return t;
}

const FILA_MATERIA = /\((\d{6,7}(?:-[A-Z])?)\)\s+(\d{1,2})\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ.\/ ]*?)\s+(\d{4}-\d[A-Z]?)\s+([A-Za-zÁÉÍÓÚáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúñ]+){0,3}?)(?:\s+(\d(?:[.,]\d)?))?\s+(APROBADA|REPROBADA|CANCELADA|[A-ZÁÉÍÓÚ]{4,})/g;

function leerMaterias(texto) {
  const materias = [];
  // Si está el encabezado de la tabla, los nombres empiezan después de él
  const encabezado = /CALIFICACI[ÓO]N/.exec(texto);
  let desde = encabezado ? encabezado.index + encabezado[0].length : 0;
  FILA_MATERIA.lastIndex = 0;
  let m;
  while ((m = FILA_MATERIA.exec(texto)) !== null) {
    const antes = texto.slice(desde, m.index);
    const nombre = antes.split(/[\t\n\r]/).map((s) => s.trim()).filter(Boolean).pop() || '';
    const periodo = leerPeriodo(m[4]);
    if (periodo) {
      materias.push({
        nombre: nombre.replace(/\s+/g, ' '),
        codigo: m[1],
        creditos: entero(m[2]),
        tipologia: normalizarTipologia(m[3]),
        periodo,
        modalidad: m[5],
        nota: m[6] ? parseFloat(m[6].replace(',', '.')) : null,
        estado: m[7].toUpperCase(),
      });
    }
    desde = m.index + m[0].length;
  }
  return materias;
}

const FILA_RESUMEN = /(TOTAL ESTUDIANTE|TOTAL|NIVELACI[ÓO]N|DISCIPLINAR OPTATIVA|DISCIPLINAR OBLIGAT\w*|FUND\. OBLIGATORIA|FUND\. OPTATIVA|LIBRE ELECCI[ÓO]N|TRABAJO DE GRADO)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)(?!\S)/gi;

function leerResumen(texto) {
  const filas = {};
  let m;
  FILA_RESUMEN.lastIndex = 0;
  while ((m = FILA_RESUMEN.exec(texto)) !== null) {
    const clave = m[1].toUpperCase() === 'TOTAL' || /^TOTAL ESTUDIANTE$/i.test(m[1])
      ? m[1].toUpperCase()
      : normalizarTipologia(m[1]);
    if (!filas[clave]) {
      filas[clave] = { exigidos: entero(m[2]), aprobados: entero(m[3]), pendientes: entero(m[4]), inscritos: entero(m[5]), cursados: entero(m[6]) };
    }
  }
  return filas;
}

function leerCifraSuelta(texto, patron) {
  const m = patron.exec(texto);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

/* ---------- Encabezado y conteo de filas (para verificar la historia) ---------- */

function leerEncabezado(texto) {
  const t = quitarTildes(texto).toUpperCase();
  const plan = /(?:^|\n)[ \t]*(\d{4})[ \t]+INGENIERIA DE SISTEMAS E INFORMATICA[ \t]*(?:\r?\n|$)/.exec(t);
  const facultad = /FACULTAD:[ \t]*(FACULTAD DE [A-Z ]+?)[ \t]*(?:\r?\n|$)/.exec(t);
  return {
    plan: plan ? plan[1] : null,
    programaSistemas: Boolean(plan),
    facultad: facultad ? facultad[1] : null,
    facultadMinas: Boolean(facultad && /\bMINAS\b/.test(facultad[1])),
  };
}

// Cuántas filas «Nombre (código) créditos …» hay en el texto, se hayan podido leer o no
function contarFilasDeMaterias(texto) {
  return (texto.match(/\(\d{6,7}(?:-[A-Z])?\)\s+\d{1,2}\s/g) || []).length;
}

function leerHistoria(textoOriginal) {
  const texto = String(textoOriginal || '').replace(/ /g, ' ');
  const materias = leerMaterias(texto);
  const resumen = leerResumen(texto);
  const encabezado = leerEncabezado(texto);

  // Usuario del SIA: la línea que sigue a «Portal de Servicios Académicos» (coincide con el correo institucional)
  let usuarioSia = (/(?:Portal de Servicios Acad[ée]micos\s*\n\s*)([a-z0-9._-]+)/i.exec(texto) || [])[1] || '';
  if (/^(Datos|Informaci|Mi|Proceso|Buscador)/i.test(usuarioSia)) usuarioSia = '';

  let nombre = (/(?:^|\n)\s*(?:Nombre|Estudiante)\s*:?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ ]{6,60})\s*(?:\n|$)/.exec(texto) || [])[1];
  if (!nombre && usuarioSia) nombre = usuarioSia;

  return {
    materias,
    resumen,
    nombre: nombre ? nombre.trim() : '',
    usuarioSia,
    papa: leerCifraSuelta(texto, /(\d\.\d{1,2})\s*\(Acumulado\)\s*Pregrado\s*-\s*P\.A\.P\.A/i),
    promedio: leerCifraSuelta(texto, /(\d\.\d{1,2})\s*\(Acumulado\)\s*Pregrado\s*-\s*Promedio/i),
    cancelados: leerCifraSuelta(texto, /Cancelados\s+en\s+los\s+Periodos\s+Cursados?\s*(\d+)/i),
    excedentes: leerCifraSuelta(texto, /Cr[ée]ditos\s+Excedentes\s*(\d+)/i),
    porcentajeSia: leerCifraSuelta(texto, /Porcentaje\s+de\s+Avance\s*([\d.,]+)\s*%/i),
    cupo: leerCifraSuelta(texto, /Cupo\s+de\s+cr[ée]ditos\s+(\d+)/i),
    disponibles: leerCifraSuelta(texto, /Cr[ée]ditos\s+disponibles\s*(-?\d+)/i),
    adicionales: leerCifraSuelta(texto, /Cr[ée]ditos\s+adicionales\s+(\d+)/i),
    encabezado,
    filasDetectadas: contarFilasDeMaterias(texto),
    // Solo cuenta el encabezado real del SIA (línea «3534 INGENIERÍA DE SISTEMAS E INFORMÁTICA» + Facultad).
    // Nombrar el programa en otra parte del texto (por ejemplo, en el nombre de una asignatura) ya no sirve.
    esSistemas: encabezado.programaSistemas && encabezado.facultadMinas,
  };
}

/* ---------- Cálculos a partir de lo leído ---------- */

const ESTADOS_CERRADOS = ['APROBADA', 'REPROBADA', 'CANCELADA'];

function calcularAvance(historia, ritmoElegido) {
  const { materias, resumen } = historia;
  const delPlan = materias.filter((m) => m.tipologia !== 'NIVELACIÓN');

  // Una materia repetida cuenta una sola vez: gana la aprobada.
  const aprobadasPorCodigo = new Map();
  delPlan.filter((m) => m.estado === 'APROBADA').forEach((m) => aprobadasPorCodigo.set(m.codigo, m));
  const aprobadasCalculo = [...aprobadasPorCodigo.values()].reduce((s, m) => s + m.creditos, 0);

  const total = resumen.TOTAL;
  const aprobados = total ? total.aprobados : aprobadasCalculo;
  const enCursoMaterias = delPlan.filter((m) => !ESTADOS_CERRADOS.includes(m.estado));
  const inscritos = total ? total.inscritos : enCursoMaterias.reduce((s, m) => s + m.creditos, 0);
  const exigidos = total ? total.exigidos : CREDITOS_PLAN;
  const pendientes = total ? total.pendientes : Math.max(0, exigidos - aprobados);

  // Créditos cursados por semestre ordinario (aprobados y reprobados), para medir el ritmo
  const porPeriodo = new Map();
  delPlan.filter((m) => m.modalidad.toLowerCase() === 'ordinaria' && m.estado !== 'CANCELADA').forEach((m) => {
    const k = clavePeriodo(m.periodo);
    const fila = porPeriodo.get(k) || { periodo: m.periodo, aprobados: 0, reprobados: 0, enCurso: 0 };
    if (m.estado === 'APROBADA') fila.aprobados += m.creditos;
    else if (m.estado === 'REPROBADA') fila.reprobados += m.creditos;
    else fila.enCurso += m.creditos;
    porPeriodo.set(k, fila);
  });
  const historial = [...porPeriodo.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);

  const cerrados = historial.filter((f) => f.enCurso === 0);
  const recientes = cerrados.slice(-4);
  const promedio = recientes.length
    ? recientes.reduce((s, f) => s + f.aprobados + f.reprobados, 0) / recientes.length
    : 16;
  const ritmoCalculado = Math.min(24, Math.max(6, Math.round(promedio)));
  const ritmo = ritmoElegido || ritmoCalculado;

  const semestreActual = (new Date().getMonth() >= 6) ? 2 : 1;
  const periodoActualCalendario = { anio: new Date().getFullYear(), num: semestreActual };

  let periodoEnCurso;
  if (enCursoMaterias.length && enCursoMaterias[0].periodo) {
    periodoEnCurso = enCursoMaterias[0].periodo;
  } else if (cerrados.length) {
    // Si ya hay semestres anteriores cerrados (con notas aprobadas/reprobadas),
    // el periodo en curso no puede ser el que ya se aprobó (ej: 2026-1), sino el siguiente (2026-2)
    // o el semestre calendario actual si es mayor.
    const ultimoCerrado = cerrados[cerrados.length - 1].periodo;
    const sig = siguientePeriodo(ultimoCerrado);
    periodoEnCurso = (clavePeriodo(periodoActualCalendario) >= clavePeriodo(sig))
      ? periodoActualCalendario
      : sig;
  } else if (historial.length) {
    periodoEnCurso = historial[historial.length - 1].periodo;
  } else {
    periodoEnCurso = periodoActualCalendario;
  }

  // Proyección: el periodo actual cubre lo inscrito; el resto se reparte según el ritmo
  const proyeccion = [];
  let restante = Math.max(0, pendientes - inscritos);
  let periodo = periodoEnCurso;
  if (inscritos > 0) { proyeccion.push({ periodo, creditos: inscritos, tipo: 'curso' }); periodo = siguientePeriodo(periodo); }
  while (restante > 0) {
    const toma = Math.min(ritmo, restante);
    proyeccion.push({ periodo, creditos: toma, tipo: 'proyectado' });
    restante -= toma;
    periodo = siguientePeriodo(periodo);
  }
  const graduacion = proyeccion.length ? proyeccion[proyeccion.length - 1].periodo : null;
  const semestresFaltantes = proyeccion.length;

  const semestresCursados = cerrados.length;
  const porcentaje = exigidos ? Math.round((aprobados / exigidos) * 1000) / 10 : 0;
  // Nivel 1–100: avanza con el % de créditos aprobados (100 % de la carrera = nivel 100)
  const nivel = Math.max(1, Math.min(100, Math.floor((exigidos ? aprobados / exigidos : 0) * 100)));

  return {
    aprobados, inscritos, pendientes, exigidos, porcentaje, nivel,
    ritmo, ritmoCalculado, historial: cerrados, proyeccion, graduacion, semestresFaltantes,
    semestresCursados, completo: pendientes === 0,
    materiasAprobadas: aprobadasPorCodigo.size,
  };
}

/* ---------- Verificación de que la historia es de Sistemas (plan 3534) ----------
   La historia llega como texto pegado, y un texto se puede editar. Por eso no basta con ver el nombre del
   programa: se comprueba contra la malla que todo lo que figure como Fundamentación, Disciplinar o Trabajo de
   grado exista en Sistemas, con el mismo nombre y los mismos créditos, y que las cifras del «Resumen de créditos»
   cuadren con las asignaturas y con el plan. Quien cambia un código, un nombre o una tipología rompe alguna de
   esas comprobaciones. Las mismas reglas se aplican en el servidor (supabase/promocion.sql) al emitir el código. */

// Tipologías que solo pueden contener asignaturas de la malla de Sistemas, y a qué componente pertenecen
const GRUPO_DE_TIPOLOGIA = {
  'FUND. OBLIGATORIA': 'fundamentacion',
  'FUND. OPTATIVA': 'fundamentacion',
  'DISCIPLINAR OBLIGATORIA': 'disciplinar',
  'DISCIPLINAR OPTATIVA': 'disciplinar',
  'TRABAJO DE GRADO': 'disciplinar',
};
const TIPOLOGIAS_DEL_SIA = [...Object.keys(GRUPO_DE_TIPOLOGIA), 'LIBRE ELECCIÓN', 'NIVELACIÓN'];
const PARECIDO_MINIMO_NOMBRE = 0.5;

const PALABRAS_VACIAS_NOMBRE = new Set(['de', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u', 'en', 'a', 'del', 'al', 'un', 'una', 'para', 'con', 'por']);

function palabrasDeNombre(texto) {
  return new Set(quitarTildes(String(texto || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((w) => w && !PALABRAS_VACIAS_NOMBRE.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)));   // «Base» y «Bases» cuentan como la misma
}

// 0 a 1: qué tanto se parecen dos nombres de asignatura (el SIA y la malla no siempre escriben igual)
function parecidoDeNombres(a, b) {
  const A = palabrasDeNombre(a);
  const B = palabrasDeNombre(b);
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  A.forEach((w) => { if (B.has(w)) comunes += 1; });
  return (2 * comunes) / (A.size + B.size);
}

/* Arma el catálogo de verificación con los JSON de la malla:
   - asignaturas: código -> { nombre, creditos, grupo }
   - exigidos: créditos exigidos por tipología según el plan
   - plan: código del plan («3534»)
   extras (opcional, data/malla/verificacion.json): { plan, codigosAdicionales: [{ codigo, nombre, creditos, grupo }] } */
function construirCatalogo(asignaturas, componentes, extras) {
  const agrupaciones = new Map(componentes.agrupaciones.map((a) => [a.id, a]));
  const mapa = new Map();
  asignaturas.forEach((a) => {
    const agrupacion = agrupaciones.get(a.agrupacion);
    if (!agrupacion || !['fundamentacion', 'disciplinar'].includes(agrupacion.componente)) return;
    mapa.set(a.codigo, { nombre: a.nombre, creditos: a.creditos === undefined ? null : a.creditos, grupo: agrupacion.componente });
  });
  ((extras && extras.codigosAdicionales) || []).forEach((a) => {
    if (a && a.codigo && a.nombre) mapa.set(String(a.codigo), { nombre: a.nombre, creditos: a.creditos === undefined ? null : a.creditos, grupo: a.grupo || 'disciplinar' });
  });

  const suma = (lista, campo) => lista.reduce((s, a) => s + (a[campo] || 0), 0);
  const ciencias = agrupaciones.get('ciencias-basicas') || {};
  const disciplinares = componentes.agrupaciones.filter((a) => a.componente === 'disciplinar' && a.id !== 'trabajo-grado');
  const trabajo = agrupaciones.get('trabajo-grado') || {};
  const exigidos = {
    'FUND. OBLIGATORIA': ciencias.obligatorios || 0,
    'FUND. OPTATIVA': ciencias.optativos || 0,
    'DISCIPLINAR OBLIGATORIA': suma(disciplinares, 'obligatorios'),
    'DISCIPLINAR OPTATIVA': suma(disciplinares, 'optativos'),
    'TRABAJO DE GRADO': trabajo.exigidos || 0,
  };
  exigidos['LIBRE ELECCIÓN'] = CREDITOS_PLAN - Object.values(exigidos).reduce((s, n) => s + n, 0);
  return { asignaturas: mapa, exigidos, plan: String((extras && extras.plan) || '3534') };
}

/* Devuelve { ok, motivos, avisos }.
   - motivos: razones por las que la historia NO se acepta (frases para mostrar a la persona).
   - avisos: detalles raros que no bloquean.
   opciones.correo (opcional): si se conoce el correo institucional, el usuario del SIA de la historia tiene que ser el mismo
   (así una historia ajena, copiada tal cual, no sirve). */
function validarHistoriaSistemas(historia, catalogo, opciones) {
  const motivos = [];
  const avisos = [];
  if (!catalogo || !catalogo.asignaturas) {
    return { ok: false, motivos: ['No se pudo cargar la malla curricular para verificar tu historia. Recarga la página e inténtalo de nuevo.'], avisos };
  }
  const lista = (materias) => materias.slice(0, 3).map((m) => `${m.nombre} (${m.codigo})`).join(', ') + (materias.length > 3 ? ` y ${materias.length - 3} más` : '');

  // 1. Encabezado del SIA
  const enc = historia.encabezado || {};
  if (!enc.programaSistemas || enc.plan !== catalogo.plan) {
    motivos.push(`En el encabezado no aparece el plan ${catalogo.plan} de Ingeniería de Sistemas e Informática.`);
  }
  if (!enc.facultadMinas) motivos.push('En el encabezado no aparece la Facultad de Minas.');

  // 1b. La historia debe ser de quien tiene la sesión: el usuario del SIA es el principio del correo UNAL
  const correo = opciones && opciones.correo ? String(opciones.correo).trim().toLowerCase() : '';
  if (correo) {
    const esperado = correo.split('@')[0];
    if (!historia.usuarioSia) motivos.push('No se encontró tu usuario del SIA al inicio de la página. Copia la página completa (Ctrl + A).');
    else if (historia.usuarioSia.toLowerCase() !== esperado) motivos.push('Esta historia académica pertenece a otro usuario del SIA, no a tu correo institucional.');
  }

  // 2. Que se haya leído todo: una fila que no se pueda leer no se puede verificar
  if (!historia.materias.length) motivos.push('No se leyó ninguna asignatura.');
  if (historia.filasDetectadas > historia.materias.length) {
    motivos.push(`${historia.filasDetectadas - historia.materias.length} fila(s) de asignaturas no se pudieron leer. Copia la historia completa tal como la muestra el SIA.`);
  }

  // 3. Cada asignatura de Fundamentación / Disciplinar / Trabajo de grado tiene que ser de la malla de Sistemas
  const desconocidas = []; const fuera = []; const creditosMal = []; const nombreMal = []; const grupoMal = [];
  let disciplinares = 0;
  historia.materias.forEach((m) => {
    if (!TIPOLOGIAS_DEL_SIA.includes(m.tipologia)) { desconocidas.push(m); return; }
    const grupo = GRUPO_DE_TIPOLOGIA[m.tipologia];
    if (!grupo) return;                                     // libre elección y nivelación: cualquier asignatura
    const enMalla = catalogo.asignaturas.get(m.codigo);
    if (!enMalla) { fuera.push(m); return; }
    if (enMalla.creditos !== null && enMalla.creditos !== m.creditos) creditosMal.push(m);
    if (parecidoDeNombres(enMalla.nombre, m.nombre) < PARECIDO_MINIMO_NOMBRE) nombreMal.push(m);
    if (enMalla.grupo !== grupo) grupoMal.push(m);
    if (grupo === 'disciplinar') disciplinares += 1;
  });
  if (desconocidas.length) motivos.push(`Tipología no reconocida en: ${lista(desconocidas)}.`);
  if (fuera.length) motivos.push(`Estas asignaturas figuran como Fundamentación, Disciplinar o Trabajo de grado, pero no están en la malla de Sistemas: ${lista(fuera)}.`);
  if (nombreMal.length) motivos.push(`El nombre no corresponde al código en: ${lista(nombreMal)}.`);
  if (creditosMal.length) motivos.push(`Los créditos no corresponden a la malla en: ${lista(creditosMal)}.`);
  if (grupoMal.length) avisos.push(`Cambia de componente respecto a la malla: ${lista(grupoMal)}.`);
  if (!fuera.length && !desconocidas.length && disciplinares === 0) {
    motivos.push('No hay ninguna asignatura disciplinar de Sistemas en la historia.');
  }

  // 4. El «Resumen de créditos» tiene que ser el del plan y cuadrar con las asignaturas
  const resumen = historia.resumen || {};
  if (!resumen.TOTAL) {
    motivos.push('No se encontró la tabla «Resumen de créditos». Copia la página completa (Ctrl + A).');
  } else {
    if (resumen.TOTAL.exigidos !== CREDITOS_PLAN) motivos.push(`El total de créditos exigidos es ${resumen.TOTAL.exigidos} y el plan pide ${CREDITOS_PLAN}.`);
    Object.entries(catalogo.exigidos).forEach(([tipologia, esperado]) => {
      const fila = resumen[tipologia];
      if (!fila || fila.exigidos !== esperado) motivos.push(`En ${tipologia} el plan exige ${esperado} créditos y la historia dice ${fila ? fila.exigidos : 'nada'}.`);
    });
    const sumar = (materias) => materias.reduce((s, m) => s + m.creditos, 0);
    TIPOLOGIAS_DEL_SIA.forEach((tipologia) => {
      const propias = historia.materias.filter((m) => m.tipologia === tipologia);
      const cerradas = sumar(propias.filter((m) => m.estado === 'APROBADA' || m.estado === 'REPROBADA'));
      const todas = sumar(propias.filter((m) => m.estado !== 'CANCELADA'));
      const cursados = resumen[tipologia] ? resumen[tipologia].cursados : 0;
      if (cursados !== cerradas && cursados !== todas) {
        motivos.push(`Los créditos cursados en ${tipologia} (${cursados}) no cuadran con las asignaturas listadas (${todas}).`);
      }
    });
  }

  return { ok: motivos.length === 0, motivos, avisos };
}

if (typeof module !== 'undefined') module.exports = { leerHistoria, calcularAvance, etiquetaPeriodo, TIPOLOGIAS, construirCatalogo, validarHistoriaSistemas, parecidoDeNombres };
