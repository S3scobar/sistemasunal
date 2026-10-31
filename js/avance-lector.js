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

const FILA_MATERIA = /\((\d{6,7}(?:-[A-Z])?)\)\s+(\d{1,2})\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ.\/ ]*?)\s+(\d{4}-\d[A-Z]?)\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)(?:\s+(\d(?:[.,]\d)?))?\s+(APROBADA|REPROBADA|CANCELADA|[A-ZÁÉÍÓÚ]{4,})/g;

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

function leerHistoria(textoOriginal) {
  const texto = String(textoOriginal || '').replace(/ /g, ' ');
  const materias = leerMaterias(texto);
  const resumen = leerResumen(texto);

  const nombre = (/(?:^|\n)\s*(?:Nombre|Estudiante)\s*:?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ ]{6,60})\s*(?:\n|$)/.exec(texto) || [])[1];

  return {
    materias,
    resumen,
    nombre: nombre ? nombre.trim() : '',
    papa: leerCifraSuelta(texto, /(\d\.\d{1,2})\s*\(Acumulado\)\s*Pregrado\s*-\s*P\.A\.P\.A/i),
    promedio: leerCifraSuelta(texto, /(\d\.\d{1,2})\s*\(Acumulado\)\s*Pregrado\s*-\s*Promedio/i),
    cancelados: leerCifraSuelta(texto, /Cancelados\s+en\s+los\s+Periodos\s+Cursados?\s+(\d+)/i),
    excedentes: leerCifraSuelta(texto, /Cr[ée]ditos\s+Excedentes\s+(\d+)/i),
    porcentajeSia: leerCifraSuelta(texto, /Porcentaje\s+de\s+Avance\s+([\d.,]+)\s*%/i),
    cupo: leerCifraSuelta(texto, /Cupo\s+de\s+cr[ée]ditos\s+(\d+)/i),
    disponibles: leerCifraSuelta(texto, /Cr[ée]ditos\s+disponibles\s+(\d+)/i),
    adicionales: leerCifraSuelta(texto, /Cr[ée]ditos\s+adicionales\s+(\d+)/i),
    esSistemas:
      /SISTEMAS\s+E\s+INFORM/i.test(quitarTildes(texto)) ||
      /INGENIERIA\s+DE\s+SISTEMAS/i.test(quitarTildes(texto)) ||
      /2879\s*-\s*INGENIERIA/i.test(quitarTildes(texto)) ||
      /PROGRAMA:\s*2879/i.test(quitarTildes(texto)),
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

  const ultimo = historial.length ? historial[historial.length - 1].periodo : { anio: new Date().getFullYear(), num: 1 };
  const periodoEnCurso = enCursoMaterias.length ? enCursoMaterias[0].periodo : siguientePeriodo(ultimo);

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
  const nivel = Math.min(10, Math.floor(aprobados / 16) + 1);

  return {
    aprobados, inscritos, pendientes, exigidos, porcentaje, nivel,
    ritmo, ritmoCalculado, historial, proyeccion, graduacion, semestresFaltantes,
    semestresCursados, completo: pendientes === 0,
    materiasAprobadas: aprobadasPorCodigo.size,
  };
}

if (typeof module !== 'undefined') module.exports = { leerHistoria, calcularAvance, etiquetaPeriodo, TIPOLOGIAS };
