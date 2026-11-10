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

/* ---------- sofIA: Asistente Virtual Inteligente de Sistemas UNAL ----------
   Chatbot client-side que indexa y consulta toda la información oficial del portal:
   - Malla curricular completa (93 asignaturas, prerrequisitos, créditos, tipologías)
   - Fechas y calendario académico oficial (adiciones, cancelaciones, notas)
   - Rutas y horarios de transporte intercampus (Robledo, Volador, Río)
   - Convenios y beneficios tecnológicos (Kiro AWS, Coursera, GitHub, JetBrains, etc.)
   - Grupos estudiantiles y semilleros (AtarraIA, UNAlgoritmo, Aperture, etc.)
   - Guías normativas: P.A.P.A., Prelación DNINFOA / Citas SIA, Bolsa de Créditos
   - Búsqueda difusa y semántica tolerante a mayúsculas, minúsculas y tildes.
   100 % en el navegador, sin llamadas externas ni costos de base de datos. */

(function moduloSofia() {
  'use strict';

  // No cargar en la pantalla de descanso nocturno
  if (typeof document === 'undefined') return;
  const esPaginaDescanso = document.body?.dataset?.pagina === 'descanso' || (window.location.pathname || '').endsWith('descanso.html');
  if (esPaginaDescanso) return;

  /* ==========================================================================
     1. BASE DE CONOCIMIENTO Y CACHÉ LOCAL
     ========================================================================== */

  const estadoSofia = {
    cargado: false,
    cargando: false,
    abierto: false,
    mensajes: [],
    datos: {
      asignaturas: [],
      plan: [],
      componentes: null,
      info: null,
      convenios: [],
      grupos: [],
      intercampus: null,
      programa: null,
      perfil: null,
    },
    indices: {
      materiasPorCodigo: new Map(),
      materiasPorNombre: new Map(),
      aliasMaterias: new Map(),
      fechasCalendario: [],
      conveniosPorNombre: new Map(),
      gruposPorNombre: new Map(),
    },
  };

  /* ==========================================================================
     2. UTILIDADES DE TEXTO Y NORMALIZACIÓN DIFUSA
     ========================================================================== */

  function normalizar(texto) {
    if (!texto) return '';
    return texto
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes y diacríticos
      .replace(/[^a-z0-9\s]/g, ' ')   // Solo letras y números
      .replace(/\s+/g, ' ')           // Espacios simples
      .trim();
  }

  const PALABRAS_VACIAS = new Set([
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u',
    'en', 'a', 'para', 'por', 'con', 'sin', 'sobre', 'que', 'como', 'cual', 'cuales',
    'donde', 'cuando', 'quien', 'quienes', 'es', 'son', 'me', 'mi', 'te', 'se', 'su',
    'sus', 'al', 'del', 'dime', 'saber', 'quiero', 'favor', 'hola', 'buenas', 'dias',
    'tardes', 'noches', 'ayuda', 'cuentame', 'explica', 'informacion', 'acerca'
  ]);

  function extraerTerminos(texto) {
    return normalizar(texto)
      .split(' ')
      .filter((palabra) => palabra.length > 1 && !PALABRAS_VACIAS.has(palabra));
  }

  // Similitud de Levenshtein optimizada para palabras cortas / typos
  function distanciaLevenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matriz = [];
    for (let i = 0; i <= b.length; i++) matriz[i] = [i];
    for (let j = 0; j <= a.length; j++) matriz[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matriz[i][j] = matriz[i - 1][j - 1];
        } else {
          matriz[i][j] = Math.min(
            matriz[i - 1][j - 1] + 1, // sustitución
            matriz[i][j - 1] + 1,     // inserción
            matriz[i - 1][j] + 1      // eliminación
          );
        }
      }
    }
    return matriz[b.length][a.length];
  }

  function similitudCadenas(a, b) {
    const na = normalizar(a);
    const nb = normalizar(b);
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.85;

    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 1;
    const dist = distanciaLevenshtein(na, nb);
    return Math.max(0, 1 - dist / maxLen);
  }

  /* ==========================================================================
     3. CARGA E INDEXACIÓN DE DATOS DEL SITIO
     ========================================================================== */

  async function cargarJsonLocal(ruta) {
    if (typeof window.cargarDatos === 'function') {
      try {
        return await window.cargarDatos(ruta);
      } catch (_) {}
    }
    const respuesta = await fetch(`data/${ruta}.json`);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return await respuesta.json();
  }

  async function inicializarBaseConocimiento() {
    if (estadoSofia.cargado || estadoSofia.cargando) return;
    estadoSofia.cargando = true;

    try {
      const [asignaturas, plan, componentes, info, conveniosIndice, grupos, intercampus, perfil, programa] =
        await Promise.allSettled([
          cargarJsonLocal('malla/asignaturas'),
          cargarJsonLocal('malla/plan'),
          cargarJsonLocal('malla/componentes'),
          cargarJsonLocal('info'),
          cargarJsonLocal('convenios/indice'),
          cargarJsonLocal('grupos'),
          cargarJsonLocal('intercampus'),
          cargarJsonLocal('perfil'),
          cargarJsonLocal('programa'),
        ]);

      if (asignaturas.status === 'fulfilled') estadoSofia.datos.asignaturas = asignaturas.value || [];
      if (plan.status === 'fulfilled') estadoSofia.datos.plan = plan.value || [];
      if (componentes.status === 'fulfilled') estadoSofia.datos.componentes = componentes.value || null;
      if (info.status === 'fulfilled') estadoSofia.datos.info = info.value || null;
      if (conveniosIndice.status === 'fulfilled') estadoSofia.datos.convenios = conveniosIndice.value?.convenios || [];
      if (grupos.status === 'fulfilled') estadoSofia.datos.grupos = grupos.value || [];
      if (intercampus.status === 'fulfilled') estadoSofia.datos.intercampus = intercampus.value || null;
      if (perfil.status === 'fulfilled') estadoSofia.datos.perfil = perfil.value || null;
      if (programa.status === 'fulfilled') estadoSofia.datos.programa = programa.value || null;

      indexarConocimiento();
      estadoSofia.cargado = true;
    } catch (error) {
      console.warn('sofIA: No se pudo cargar toda la base de conocimiento local', error);
    } finally {
      estadoSofia.cargando = false;
    }
  }

  function indexarConocimiento() {
    const { indices, datos } = estadoSofia;

    // 1. Indexar asignaturas por código y por nombre
    datos.asignaturas.forEach((asig) => {
      indices.materiasPorCodigo.set(asig.codigo, asig);
      const normNombre = normalizar(asig.nombre);
      indices.materiasPorNombre.set(normNombre, asig);
    });

    // 2. Diccionario de alias y abreviaturas comunes en Sistemas UNAL
    const ALIAS_MATERIAS = [
      [['poo', 'programacion orientada a objetos', 'objetos'], 'Programación Orientada a Objetos'],
      [['eda', 'estructuras de datos', 'algoritmos'], 'Estructuras de Datos y Algoritmos'],
      [['bd', 'bases de datos', 'base de datos', 'bases datos'], 'Bases de Datos'],
      [['so', 'sistemas operativos', 'operativos'], 'Sistemas Operativos'],
      [['ia', 'inteligencia artificial'], 'Inteligencia Artificial'],
      [['redes', 'redes de computadores', 'telecomunicaciones'], 'Redes de Computadores'],
      [['arq', 'arquitectura', 'arquitectura de computadores', 'computadores'], 'Arquitectura de Computadores'],
      [['simulacion', 'simulacion de sistemas'], 'Simulación de Sistemas'],
      [['lenguajes', 'lenguajes de programacion'], 'Lenguajes de Programación'],
      [['ing software', 'ingenieria de software 1', 'software 1', 'is1'], 'Ingeniería de Software I'],
      [['ing software 2', 'ingenieria de software 2', 'software 2', 'is2'], 'Ingeniería de Software II'],
      [['optimizacion'], 'Optimización'],
      [['etica', 'legislacion', 'etica y legislacion'], 'Ética y Legislación en Informática'],
      [['calculo 1', 'calculo diferencial', 'diferencial'], 'Cálculo Diferencial'],
      [['calculo 2', 'calculo integral', 'integral'], 'Cálculo Integral'],
      [['calculo 3', 'varias variables', 'calculo en varias variables'], 'Cálculo en Varias Variables'],
      [['algebra lineal', 'lineal'], 'Álgebra Lineal'],
      [['mate basicas', 'matematicas basicas', 'basicas'], 'Matemáticas Básicas'],
      [['geometria vectorial', 'vectorial'], 'Geometría Vectorial y Analítica'],
      [['fisica 1', 'mecanica', 'fisica mecanica'], 'Física Mecánica'],
      [['fisica 2', 'electricidad', 'electricidad y magnetismo'], 'Física de Electricidad y Magnetismo'],
      [['fisica 3', 'oscilaciones', 'ondas'], 'Física de Oscilaciones y Ondas'],
      [['probabilidad', 'estadistica 1', 'modelos probabilisticos 1'], 'Modelos Probabilísticos y Estadística I'],
      [['estadistica 2', 'modelos probabilisticos 2'], 'Modelos Probabilísticos y Estadística II'],
      [['ing economica', 'ingenieria economica', 'economica'], 'Ingeniería Económica'],
      [['trabajo de grado', 'tesis', 'grado'], 'Trabajo de Grado'],
      [['teoria de computacion', 'automatas'], 'Teoría de la Computación'],
    ];

    ALIAS_MATERIAS.forEach(([aliases, nombreReal]) => {
      const match = datos.asignaturas.find((a) => normalizar(a.nombre) === normalizar(nombreReal));
      if (match) {
        aliases.forEach((alias) => indices.aliasMaterias.set(normalizar(alias), match));
      }
    });

    // 3. Indexar fechas del calendario académico
    if (datos.info?.guias) {
      const guiaCal = datos.info.guias.find((g) => g.id === 'calendario-academico');
      if (guiaCal?.calendario?.grupos) {
        guiaCal.calendario.grupos.forEach((grupo) => {
          if (Array.isArray(grupo.filas)) {
            grupo.filas.forEach((fila) => {
              indices.fechasCalendario.push({
                actividad: fila.actividad,
                aplica: fila.aplica,
                inicio: fila.inicio,
                fin: fila.fin,
                nota: fila.nota || '',
              });
            });
          }
        });
      }
    }

    // 4. Indexar convenios y grupos
    datos.convenios.forEach((c) => indices.conveniosPorNombre.set(normalizar(c.nombre), c));
    datos.grupos.forEach((g) => indices.gruposPorNombre.set(normalizar(g.nombre), g));
  }

  /* ==========================================================================
     4. MOTOR DE RESPUESTAS INTELIGENTES DE sofIA
     ========================================================================== */

  function buscarAsignaturaPorTexto(preguntaNorm) {
    const { indices, datos } = estadoSofia;

    // 1. Coincidencia por alias directo
    for (const [alias, asig] of indices.aliasMaterias.entries()) {
      if (new RegExp(`\\b${alias}\\b`).test(preguntaNorm)) {
        return asig;
      }
    }

    // 2. Coincidencia por código de asignatura (ej: 3007843, 1000004-M)
    for (const [codigo, asig] of indices.materiasPorCodigo.entries()) {
      const codLimpio = normalizar(codigo);
      if (preguntaNorm.includes(codLimpio) || codLimpio.includes(preguntaNorm)) {
        return asig;
      }
    }

    // 3. Coincidencia por nombre exacto o contenido
    for (const asig of datos.asignaturas) {
      const nombreNorm = normalizar(asig.nombre);
      if (preguntaNorm.includes(nombreNorm)) {
        return asig;
      }
    }

    // 4. Coincidencia parcial con palabras clave de la materia
    let mejorMateria = null;
    let mejorScore = 0;
    const terminosPregunta = extraerTerminos(preguntaNorm);

    datos.asignaturas.forEach((asig) => {
      const terminosMateria = extraerTerminos(asig.nombre);
      let matches = 0;
      terminosMateria.forEach((tm) => {
        if (terminosPregunta.some((tp) => tp === tm || similitudCadenas(tp, tm) > 0.82)) {
          matches++;
        }
      });
      const score = matches / Math.max(terminosMateria.length, 1);
      if (score > 0.55 && score > mejorScore) {
        mejorScore = score;
        mejorMateria = asig;
      }
    });

    return mejorMateria;
  }

  function responderPregunta(preguntaUsuario) {
    const preguntaNorm = normalizar(preguntaUsuario);
    const { indices, datos } = estadoSofia;

    // ------------------------------------------------------------------------
    // Caso 1: Saludo, identidad o agradecimiento
    // ------------------------------------------------------------------------
    if (/^(hola|buenos dias|buenas tardes|buenas noches|hey|que tal|buenas)\b/.test(preguntaNorm) && preguntaNorm.split(' ').length <= 4) {
      return {
        texto: `¡Hola! Soy **sofIA**, la asistente virtual de Ingeniería de Sistemas e Informática de la UNAL Medellín.

Estoy conectada a toda la información del portal. Pregúntame sobre:
- ⚡ **Prerrequisitos y materias** de la carrera
- 📅 **Fechas clave del calendario** (cancelaciones, notas)
- 🚌 **Rutas y horarios del bus intercampus**
- 🎁 **Convenios estudiantiles** (Kiro AWS, Coursera, GitHub)
- 👥 **Semilleros y grupos** (AtarraIA, UNAlgoritmo, etc.)
- 🎓 **P.A.P.A., Bolsa de créditos y trámites SIA**

¿Sobre qué tema te gustaría consultar hoy?`,
        chips: ['Prerrequisitos de materias', 'Fechas de cancelación', 'Rutas del bus intercampus', 'Convenio Kiro (AWS)'],
      };
    }

    if (/quien eres|quien te creo|que eres|como te llamas|presentate/.test(preguntaNorm)) {
      return {
        texto: `Soy **sofIA**, la inteligencia de soporte estudiantil para **Ingeniería de Sistemas e Informática** de la Universidad Nacional de Colombia (Sede Medellín).

Fui diseñada y desarrollada por **Santiago Escobar Arias**, Representante Estudiantil de Sistemas, para que no tengas que buscar entre decenas de PDFs o resoluciones: leo y cruzo al instante las mallas, calendarios, convenios y normativas académicas del portal.`,
        chips: ['Ver malla curricular', 'Ver convenios estudiantiles', 'Calendario académico'],
      };
    }

    if (/gracias|muchas gracias|genial|excelente|bacano|super/.test(preguntaNorm) && preguntaNorm.split(' ').length <= 4) {
      return {
        texto: `¡Con mucho gusto! Aquí estaré siempre que necesites consultar asignaturas, fechas o trámites de la U. ¡Muchos éxitos en tu camino académico! 🚀`,
        chips: ['Prerrequisitos de materias', 'Fechas del calendario', 'Semilleros estudiantiles'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 2: Prerrequisitos / Correquisitos de materias
    // ------------------------------------------------------------------------
    const esConsultaPrereq = /prerrequisit|prerequisit|requisito|que pide|que necesito para ver|para matricular|correquisit|abrir|correr/.test(preguntaNorm);
    const materiaEncontrada = buscarAsignaturaPorTexto(preguntaNorm);

    if (materiaEncontrada && (esConsultaPrereq || preguntaNorm.includes(normalizar(materiaEncontrada.nombre)))) {
      const preCodigos = materiaEncontrada.prerrequisitos || [];
      const correqCodigos = materiaEncontrada.correquisitos || [];

      let detallePrereq = '';
      if (preCodigos.length === 0) {
        detallePrereq = `✅ **No tiene prerrequisitos.** La puedes inscribir libremente desde tu primer semestre (siempre que tu cupo de créditos y el SIA lo permitan).`;
      } else {
        const nombresPre = preCodigos.map((cod) => {
          const preMat = indices.materiasPorCodigo.get(cod);
          return preMat ? `• **${preMat.nombre}** (\`${cod}\`)` : `• Asignatura código \`${cod}\``;
        }).join('\n');
        detallePrereq = `📌 **Prerrequisito(s) exigido(s):**\n${nombresPre}`;
      }

      let detalleCorreq = '';
      if (correqCodigos.length > 0) {
        const nombresCorreq = correqCodigos.map((cod) => {
          const cMat = indices.materiasPorCodigo.get(cod);
          return cMat ? `• **${cMat.nombre}** (\`${cod}\`)` : `• Asignatura código \`${cod}\``;
        }).join('\n');
        detalleCorreq = `\n🔄 **Correquisito(s) (simultáneos):**\n${nombresCorreq}`;
      }

      const semestreTxt = materiaEncontrada.semestre ? `Semestre sugerido: **${materiaEncontrada.semestre}°**` : 'Asignatura Optativa / Elegible';
      const obligatoriaTxt = materiaEncontrada.obligatoria ? 'Obligatoria' : 'Optativa';
      const wspTxt = materiaEncontrada.whatsapp
        ? `\n💬 **Comunidad de WhatsApp:** [Unirse al grupo de estudio](${materiaEncontrada.whatsapp})`
        : '';

      const chipsPre = preCodigos
        .map((cod) => indices.materiasPorCodigo.get(cod))
        .filter(Boolean)
        .map((m) => `Prerrequisitos de ${m.nombre}`);

      return {
        texto: `### 📘 ${materiaEncontrada.nombre} (\`${materiaEncontrada.codigo}\`)

${detallePrereq}${detalleCorreq}

📊 **Detalles académicos:**
- **Créditos:** ${materiaEncontrada.creditos}
- **Tipología:** ${obligatoriaTxt} (${materiaEncontrada.agrupacion || 'Plan de estudios'})
- **Nivel:** ${semestreTxt}${wspTxt}`,
        chips: chipsPre.length > 0 ? chipsPre : ['Ver materias de este semestre', 'Otras asignaturas'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 3: Materias por semestre (ej: "qué materias veo en 1er semestre", "materias semestre 4")
    // ------------------------------------------------------------------------
    const matchSemestre = preguntaNorm.match(/semestre\s*([1-9]|10)|primer\s*semestre|segundo\s*semestre|tercer\s*semestre|cuarto\s*semestre|quinto\s*semestre|sexto\s*semestre|septimo\s*semestre|octavo\s*semestre|noveno\s*semestre|decimo\s*semestre/);
    if (matchSemestre && (preguntaNorm.includes('materia') || preguntaNorm.includes('asignatura') || preguntaNorm.includes('veo') || preguntaNorm.includes('curso') || preguntaNorm.includes('plan'))) {
      const mapaOrdinales = {
        'primer semestre': 1, 'segundo semestre': 2, 'tercer semestre': 3, 'cuarto semestre': 4,
        'quinto semestre': 5, 'sexto semestre': 6, 'septimo semestre': 7, 'octavo semestre': 8,
        'noveno semestre': 9, 'decimo semestre': 10
      };
      let numSemestre = matchSemestre[1] ? parseInt(matchSemestre[1], 10) : mapaOrdinales[matchSemestre[0]];

      if (numSemestre && numSemestre >= 1 && numSemestre <= 10) {
        const bloquePlan = datos.plan.find((p) => p.semestre === numSemestre);
        const materiasSemestre = datos.asignaturas.filter((a) => a.semestre === numSemestre);

        let listaTxt = '';
        if (bloquePlan?.items) {
          listaTxt = bloquePlan.items.map((item) => {
            if (item.tipo === 'asignatura') {
              const asig = indices.materiasPorCodigo.get(item.codigo);
              if (asig) {
                const preCount = asig.prerrequisitos?.length || 0;
                const preInfo = preCount > 0 ? ` _(exige ${preCount} prerreq.)_` : ' _(sin prerreq.)_';
                return `• **${asig.nombre}** (${asig.creditos} créditos)${preInfo}`;
              }
              return `• Asignatura \`${item.codigo}\``;
            } else if (item.tipo === 'bolsa') {
              return `• 🧩 **${item.nombre || 'Asignatura Optativa'}** (${item.creditos} créditos)`;
            }
            return '';
          }).filter(Boolean).join('\n');
        } else {
          listaTxt = materiasSemestre.map((m) => {
            const preCount = m.prerrequisitos?.length || 0;
            const preInfo = preCount > 0 ? ` _(exige ${preCount} prerreq.)_` : ' _(sin prerreq.)_';
            return `• **${m.nombre}** (${m.creditos} créditos)${preInfo}`;
          }).join('\n');
        }

        const creditosTotales = bloquePlan?.creditos || materiasSemestre.reduce((acc, m) => acc + (m.creditos || 0), 0);

        return {
          texto: `### 🗓️ Plan sugerido para el Semestre ${numSemestre} (${creditosTotales} créditos totales)

${listaTxt}

Puedes hacer clic en cualquiera de estas materias para ver qué requisitos pide o si tiene grupo de WhatsApp:`,
          chips: materiasSemestre.slice(0, 4).map((m) => `Prerrequisitos de ${m.nombre}`),
        };
      }
    }

    // ------------------------------------------------------------------------
    // Caso 4: Fechas, Calendario Académico, Cancelaciones y Notas
    // ------------------------------------------------------------------------
    if (/fecha|fechas|calendario|cuando empieza|cuando inicia|inicio de clases|fin de clases|termina el semestre|cancelar|cancelacion|adicion|adiciones|reporte de notas|parciales|30 %|60 %|100 %|semana 3|semana 8/.test(preguntaNorm)) {
      const fechas = indices.fechasCalendario;
      const cancelSinDescuento = fechas.find((f) => /sin descuento/.test(normalizar(f.actividad)));
      const cancelConDescuento = fechas.find((f) => /con descuento/.test(normalizar(f.actividad)));
      const reporte60 = fechas.find((f) => /60\s*%/.test(f.actividad));
      const reporte100 = fechas.find((f) => /100\s*%/.test(f.actividad));
      const finClases = fechas.find((f) => /finalizacion de clases/.test(normalizar(f.actividad)));

      let cancelacionResp = '';
      if (preguntaNorm.includes('cancel') || preguntaNorm.includes('adicion')) {
        cancelacionResp = `\n\n📌 **Reglas de Cancelación en la UNAL:**\n- **Hasta Semana 3 (sin pérdida de créditos):** Del ${cancelSinDescuento?.inicio || 'inicio'} al **${cancelSinDescuento?.fin || '10 de septiembre'}**. Los créditos se te devuelven a tu bolsa.\n- **Hasta Semana 8 (con pérdida de créditos):** Del ${cancelConDescuento?.inicio || '15 de septiembre'} al **${cancelConDescuento?.fin || '22 de octubre'}**. No te afecta el P.A.P.A., pero esos créditos se descuentan de tu bolsa.`;
      }

      return {
        texto: `### 📅 Fechas Clave del Periodo Académico (2026-2S)

- 🚀 **Adición y cancelación sin pérdida de créditos:** ${cancelSinDescuento?.inicio || '27-ago'} al **${cancelSinDescuento?.fin || '10-sep'}**
- ⚠️ **Cancelación de asignaturas con pérdida:** ${cancelConDescuento?.inicio || '15-sep'} al **${cancelConDescuento?.fin || '22-oct'}**
- 📝 **Reporte de notas parciales (60 %):** Límite **${reporte60?.fin || '05 de noviembre'}**
- 🏁 **Finalización oficial de clases:** **${finClases?.fin || '17 de diciembre'}**
- 🎓 **Reporte final de calificaciones (100 %):** **${reporte100?.fin || '19 de diciembre'}**${cancelacionResp}`,
        chips: ['¿Cómo funciona la bolsa de créditos?', 'Citas de inscripción SIA', 'Solicitudes GAE'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 5: Rutas y Transporte Intercampus (Buses UNAL)
    // ------------------------------------------------------------------------
    if (/bus|buses|intercampus|transporte|ruta|rutas|horario bus|robledo|volador|rio|minas/.test(preguntaNorm)) {
      return {
        texto: `### 🚌 Transporte Intercampus UNAL Medellín (100 % Gratuito)

El servicio de bus universitario conecta las tres sedes de Medellín:

1. **Ruta Robledo ⇄ Volador:**
   - **Salida Robledo:** Facultad de Minas (Bloque M3).
   - **Llegada Volador:** Bloque 41 / Portería Coca-Cola.
   - **Horario:** Lunes a viernes de 6:00 a. m. a 9:00 p. m. (frecuencia cada 15-20 min en hora pico).

2. **Ruta Río ⇄ Volador:**
   - Conecta la Sede del Río con el Campus Volador.

3. **Conexión Metro de Medellín:**
   - El bus te deja cerca a la estación **Suramericana** o **Floresta** mediante paradas intermedias señalizadas.

💡 **Requisito:** Únicamente debes presentar tu **carnet estudiantil digital o físico** al abordar. No requiere ningún pago.`,
        chips: ['Ver sección Intercampus', 'Fechas del calendario', 'Grupos y semilleros'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 6: Convenios y Beneficios (Kiro, AWS, GitHub, Coursera, etc.)
    // ------------------------------------------------------------------------
    if (/convenio|convenios|beneficio|beneficios|kiro|aws|coursera|github|copilot|jetbrains|office|microsoft|matlab|autodesk|spotify|bienestar|auxilio/.test(preguntaNorm)) {
      if (preguntaNorm.includes('kiro')) {
        return {
          texto: `### 🤖 Convenio Kiro (AWS) · Programación con Inteligencia Artificial

¡La UNAL cuenta con convenio oficial de **Kiro** a través del programa estudiantil de Amazon Web Services (AWS)!

- 🎁 **Beneficio:** **1.000 créditos mensuales GRATIS** durante todo 1 año.
- ⚡ **¿Para qué sirve?** Kiro es un asistente de IA para desarrollo de software que genera especificaciones estructuradas, prototipos y código ejecutable para tus proyectos y materias.
- 🔗 **¿Cómo acceder?** Ingresa a [dned.unal.edu.co](https://dned.unal.edu.co) con tu correo institucional UNAL y activa tu plan estudiantil.`,
          chips: ['Otros convenios estudiantiles', 'GitHub Student Pack', 'Coursera UNAL'],
        };
      }

      if (preguntaNorm.includes('github') || preguntaNorm.includes('copilot')) {
        return {
          texto: `### 🐙 GitHub Student Developer Pack

Con tu correo \`@unal.edu.co\` recibes gratis:
- **GitHub Copilot** (asistente de autocompletado con IA)
- **GitHub Pro** sin costo mientras seas estudiante
- Dominios gratis por 1 año (.me en Namecheap)
- Créditos en la nube (DigitalOcean, Azure, Heroku) y acceso a Canva Pro.
👉 Actívalo en [education.github.com/pack](https://education.github.com/pack).`,
          chips: ['Convenio Kiro (AWS)', 'JetBrains Student Pack', 'Coursera UNAL'],
        };
      }

      if (preguntaNorm.includes('coursera')) {
        return {
          texto: `### 🎓 Coursera for Campus UNAL

Todos los estudiantes activos de la UNAL tienen acceso al catálogo de **Coursera**:
- Cursos y certificaciones profesionales gratis emitidas por universidades como Stanford, Google, IBM y Michigan.
- Se activa iniciando sesión en Coursera con tu cuenta institucional de Google Workspace UNAL.`,
          chips: ['Convenios estudiantiles', 'Microsoft 365', 'Kiro AWS'],
        };
      }

      // Convenios generales
      return {
        texto: `### 🎁 Principales Convenios y Beneficios Estudiantiles UNAL

Como estudiante activo de Sistemas en la UNAL tienes acceso a:
1. **Kiro (AWS):** 1.000 créditos/mes gratis para programar con IA.
2. **GitHub Student Pack:** Copilot gratis, herramientas Pro y dominios.
3. **Coursera for Campus:** Certificaciones internacionales 100 % cubiertas.
4. **JetBrains Student Pack:** Licencias Pro de IntelliJ IDEA, PyCharm, WebStorm, CLion.
5. **Microsoft 365:** Word, Excel, PowerPoint y 1 TB en OneDrive institucional.
6. **MATLAB y Simulink:** Licencia Campus-Wide ilimitada para cálculo numérico.
7. **Spotify:** 50 % de descuento en el plan Premium Estudiantes.
8. **Bienestar Universitario:** Apoyos alimentarios, económicos y residencias.`,
        chips: ['Ver Kiro (AWS)', 'Ver GitHub Pack', 'Ver Coursera UNAL'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 7: Semilleros y Grupos Estudiantiles
    // ------------------------------------------------------------------------
    if (/semillero|semilleros|grupo|grupos|comunidad|atarraia|unalgoritmo|aperture|turing|uneural/.test(preguntaNorm)) {
      if (preguntaNorm.includes('atarraia')) {
        return {
          texto: `### 🕸️ AtarraIA · Semillero de Ciencias de la Computación

**AtarraIA** es un semillero de investigación en ciencias de la computación enfocado en **Inteligencia Artificial**, desarrollo algorítmico y aplicaciones prácticas, promoviendo el aprendizaje colaborativo en la UNAL Medellín.

- 💬 **Grupo de WhatsApp Oficial:** [Unirse al grupo de WhatsApp](https://chat.whatsapp.com/Dd8RnPsMGdg22x3H3s6vIa?mode=ems_copy_t)`,
          chips: ['Ver otros semilleros', 'UNAlgoritmo', 'Aperture'],
        };
      }

      if (preguntaNorm.includes('unalgoritmo')) {
        return {
          texto: `### 🏆 UNAlgoritmo · Grupo de Programación Competitiva

Grupo estudiantil adscrito a la Facultad de Minas dedicado al pensamiento algorítmico, estructuras de datos avanzadas y entrenamiento para maratones de programación (ICPC, Maratón Nacional, MFP).`,
          chips: ['AtarraIA', 'Aperture', 'Turing Box'],
        };
      }

      return {
        texto: `### 👥 Grupos y Semilleros de Ingeniería de Sistemas

En la Facultad de Minas contamos con comunidades muy activas donde puedes investigar y crear proyectos:

1. **AtarraIA:** Semillero de Ciencias de la Computación enfocado en IA y aprendizaje automático.
2. **UNAlgoritmo:** Programación competitiva y preparación para ICPC.
3. **Aperture:** Semillero en ciencia de datos, machine learning e IA colaborativa.
4. **Turing Box:** Grupo enfocado en cultura tecnológica y desarrollo.
5. **UNeural:** Grupo de investigación en redes neuronales y neurocomputación.`,
        chips: ['Semillero AtarraIA', 'UNAlgoritmo', 'Aperture'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 8: P.A.P.A., Citas SIA, Prelación DNINFOA y Bolsa de Créditos
    // ------------------------------------------------------------------------
    if (/papa|pappi|ipa|prelacion|citas|cita sia|sia|bolsa|creditos disponibles|cupo de creditos|corresponsabilidad|horas corresponsabilidad|solicitud|solicitudes|gae|sgs/.test(preguntaNorm)) {
      if (preguntaNorm.includes('prelacion') || preguntaNorm.includes('cita') || preguntaNorm.includes('dninfoa')) {
        return {
          texto: `### 🎯 ¿Cómo se asignan las Citas de Inscripción en el SIA?

¡El **P.A.P.P.I. ya no define tu cita**! La Dirección Nacional de Información Académica (DNINFOA) ahora aplica los **4 Grupos de Prelación**:

1. **Grupo 1:** Estudiantes con reconocimiento académico y distinciones.
2. **Grupo 2:** Estudiantes en permanencia regular con alto avance y buen P.A.P.A. (ordenados por el Índice IPA).
3. **Grupo 3:** Estudiantes con bajo avance o periodos suspendidos.
4. **Grupo 4:** Casos especiales y reservas de cupo.

💡 Dentro de cada grupo, tu cita se ordena mediante el **Índice de Prioridad Académica (IPA)**, que combina tu P.A.P.A. y el ritmo de aprobación de créditos.`,
          chips: ['¿Qué es el P.A.P.A.?', 'Bolsa de créditos', 'Fechas del calendario'],
        };
      }

      if (preguntaNorm.includes('papa') || preguntaNorm.includes('pappi')) {
        return {
          texto: `### 📊 P.A.P.A. vs. P.A.P.P.I. en la UNAL

- **P.A.P.A. (Promedio Académico Ponderado Acumulado):**
  Es el promedio histórico de TODAS las asignaturas que has cursado en la universidad (aprobadas y reprobadas).
  *¿Para qué sirve?* Define tu permanencia en la UNAL (debe ser $\\ge 3.0$ para no caer en pérdida de cupo), dobles titulaciones, becas de posgrado y exenciones de matrícula.

- **P.A.P.P.I. (Promedio del Periodo):**
  Calcula únicamente el rendimiento del último semestre cursado.`,
          chips: ['Citas de inscripción SIA', 'Bolsa de créditos', 'Solicitudes GAE'],
        };
      }

      if (preguntaNorm.includes('bolsa') || preguntaNorm.includes('credito')) {
        return {
          texto: `### 💰 La Bolsa de Créditos en la UNAL

Al entrar a la carrera recibes un **cupo de créditos** equivalente a los créditos del plan más un porcentaje de holgura:
- Si apruebas una materia: se consumen sus créditos.
- Si cancelas en **Semana 3** (sin pérdida): se te reintegran inmediatamente a tu bolsa.
- Si cancelas en **Semana 8** o repruebas: se pierden de tu bolsa de créditos disponibles.
- Si se te acaban los créditos antes de graduarte, debes solicitar créditos adicionales ante el Consejo de Facultad mediante el SGS.`,
          chips: ['Fechas de cancelación', 'Citas SIA', 'Plan de estudios'],
        };
      }
    }

    // ------------------------------------------------------------------------
    // Caso 9: Optativas y Líneas de Profundización
    // ------------------------------------------------------------------------
    if (/optativa|optativas|lineas|profundizacion|libre eleccion|tecnologias/.test(preguntaNorm)) {
      return {
        texto: `### 🧩 Asignaturas Optativas y Líneas de Profundización

El plan de Ingeniería de Sistemas e Informática cuenta con alta flexibilidad:

1. **Tecnologías de Aplicación (Disciplinar Optativa):**
   - Debes cursar **22 créditos** en materias de profundización.
   - Áreas destacadas: Inteligencia Artificial, Ciberseguridad, Desarrollo de Software, Analítica de Datos, Redes y Cómputo en la Nube.

2. **Componente de Libre Elección:**
   - Cuentas con **32 créditos** para matricular libremente asignaturas de cualquier facultad, sede, idiomas o posgrados de la UNAL.`,
        chips: ['Ver malla curricular', 'Semilleros de investigación', 'Convenio Kiro (AWS)'],
      };
    }

    // ------------------------------------------------------------------------
    // Caso 10: Búsqueda difusa universal en FAQs, Guías y Asignaturas
    // ------------------------------------------------------------------------
    const terminosBusqueda = extraerTerminos(preguntaNorm);
    if (terminosBusqueda.length > 0 && datos.info?.faq) {
      let mejorFaq = null;
      let mejorPuntajeFaq = 0;

      datos.info.faq.forEach((f) => {
        const pregNorm = normalizar(f.pregunta);
        const respNorm = normalizar(f.respuesta);
        let matches = 0;

        terminosBusqueda.forEach((t) => {
          if (pregNorm.includes(t)) matches += 2.5;
          else if (respNorm.includes(t)) matches += 1;
          else {
            const sim = similitudCadenas(t, pregNorm);
            if (sim > 0.8) matches += 1.5;
          }
        });

        if (matches > mejorPuntajeFaq) {
          mejorPuntajeFaq = matches;
          mejorFaq = f;
        }
      });

      if (mejorFaq && mejorPuntajeFaq >= 2.5) {
        return {
          texto: `### 💡 ${mejorFaq.pregunta}

${mejorFaq.respuesta}`,
          chips: ['Citas SIA', 'Bolsa de créditos', 'Ver calendario'],
        };
      }
    }

    // ------------------------------------------------------------------------
    // Caso 11: Fallback guiado y amigable
    // ------------------------------------------------------------------------
    return {
      texto: `No encontré una respuesta exacta para esa consulta en la base de datos de la web, pero puedo ayudarte con cualquiera de estos temas:

- ⚡ **Materias y prerrequisitos:** Pregúntame por ejemplo *"¿Qué prerrequisitos pide Simulación?"* o *"Materias de 4to semestre"*.
- 📅 **Calendario:** Pregunta *"¿Cuándo inician las clases?"* o *"Fechas de cancelación"*.
- 🚌 **Bus intercampus:** Pregunta *"¿Cómo funciona el bus a Minas?"*.
- 🎁 **Convenios:** Pregunta *"¿Cómo activo Kiro o GitHub Pack?"*.
- 👥 **Semilleros:** Pregunta por *"AtarraIA, UNAlgoritmo o Aperture"*.`,
      chips: ['Prerrequisitos de materias', 'Fechas de cancelación', 'Rutas del bus intercampus', 'Convenios estudiantiles'],
    };
  }

  /* ==========================================================================
     5. INTERFAZ GRÁFICA Y RENDERIZADO DEL CHAT
     ========================================================================== */

  function renderizarIconoBot() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="3"></rect>
      <circle cx="12" cy="5" r="2"></circle>
      <path d="M12 7v4"></path>
      <line x1="8" y1="15" x2="8.01" y2="15"></line>
      <line x1="16" y1="15" x2="16.01" y2="15"></line>
      <path d="M9 18h6"></path>
    </svg>`;
  }

  function crearElementosDOM() {
    if (document.getElementById('sofia-contenedor-global')) return;

    // Asegurar que la hoja de estilo esté inyectada si no vino en el <head>
    if (!document.getElementById('css-sofia')) {
      const linkCss = document.createElement('link');
      linkCss.id = 'css-sofia';
      linkCss.rel = 'stylesheet';
      linkCss.href = 'css/sofia.css';
      (document.head || document.getElementsByTagName('head')[0] || document.body)?.appendChild(linkCss);
    }

    const wrapGlobal = document.createElement('div');
    wrapGlobal.id = 'sofia-contenedor-global';
    wrapGlobal.innerHTML = `
      <!-- Contenedor del Botón Flotante -->
      <div class="sofia-flotante-wrap" id="sofia-flotante-wrap">
        <div class="sofia-globo-bienvenida" id="sofia-globo" role="tooltip" aria-label="Aviso de sofIA">
          <span class="sofia-globo-texto">👋 ¿Dudas con materias o fechas? <strong>Pregúntale a sofIA</strong></span>
          <button class="sofia-globo-cerrar" id="sofia-globo-cerrar" type="button" aria-label="Cerrar sugerencia">✕</button>
        </div>

        <button class="sofia-boton" id="sofia-btn-toggle" type="button" aria-label="Abrir asistente virtual sofIA" aria-haspopup="dialog" aria-expanded="false">
          <span class="sofia-boton__icono">
            ${renderizarIconoBot()}
          </span>
          <span class="sofia-boton__badge" title="sofIA en línea"></span>
        </button>
      </div>

      <!-- Ventana Principal del Chat -->
      <aside class="sofia-ventana" id="sofia-ventana" role="dialog" aria-label="Ventana de conversación con sofIA" aria-modal="true" hidden>
        <!-- Cabecera -->
        <header class="sofia-cabecera">
          <div class="sofia-cabecera__info">
            <div class="sofia-cabecera__avatar" aria-hidden="true">
              ${renderizarIconoBot()}
            </div>
            <div class="sofia-cabecera__titulos">
              <div class="sofia-cabecera__nombre-wrap">
                <span class="sofia-cabecera__nombre">sofIA</span>
                <span class="sofia-tag-ia">IA UNAL</span>
              </div>
              <span class="sofia-cabecera__subtitulo">
                <span class="sofia-punto-verde" aria-hidden="true"></span>
                En línea · Base oficial
              </span>
            </div>
          </div>
          <div class="sofia-cabecera__acciones">
            <button class="sofia-btn-accion" id="sofia-btn-limpiar" type="button" title="Reiniciar conversación" aria-label="Reiniciar conversación">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button class="sofia-btn-accion" id="sofia-btn-cerrar" type="button" title="Cerrar chat" aria-label="Cerrar ventana de sofIA">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </header>

        <!-- Mensajes -->
        <div class="sofia-mensajes" id="sofia-mensajes" tabindex="0" aria-live="polite"></div>

        <!-- Pie / Formulario -->
        <footer class="sofia-pie">
          <form class="sofia-formulario" id="sofia-form">
            <input
              type="text"
              class="sofia-input"
              id="sofia-input"
              placeholder="Pregúntale a sofIA sobre materias, fechas, convenios..."
              autocomplete="off"
              required
              aria-label="Mensaje para sofIA"
            >
            <button class="sofia-btn-enviar" id="sofia-btn-enviar" type="submit" aria-label="Enviar mensaje">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <p class="sofia-aviso-privacidad">sofIA se alimenta de la información oficial de este portal.</p>
        </footer>
      </aside>
    `;

    document.body.appendChild(wrapGlobal);
    vincularEventos();
    cargarHistorialGuardado();
  }

  function formatearMarkdown(texto) {
    if (!texto) return '';
    return texto
      // Negrita
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Código en línea
      .replace(/`(.*?)`/g, '<code class="sofia-code">$1</code>')
      // Títulos de nivel 3
      .replace(/^### (.*$)/gim, '<div class="sofia-tarjeta-dato__titulo">$1</div>')
      // Enlaces [texto](url)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Listas con viñeta
      .replace(/^\s*• (.*$)/gim, '<li>$1</li>')
      .replace(/^\s*- (.*$)/gim, '<li>$1</li>')
      // Párrafos y saltos
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function agregarMensajeAlDOM(emisor, textoMarkdown, chips = [], animar = true) {
    const contenedor = document.getElementById('sofia-mensajes');
    if (!contenedor) return;

    const ahora = new Date();
    const horaFormateada = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const fila = document.createElement('div');
    fila.className = `sofia-fila sofia-fila--${emisor}`;

    const htmlContenido = formatearMarkdown(textoMarkdown);

    let htmlChips = '';
    if (chips && chips.length > 0) {
      htmlChips = `
        <div class="sofia-chips-contenedor">
          <div class="sofia-chips-titulo">Sugerencias:</div>
          <div class="sofia-chips-rejilla">
            ${chips.map((chip) => `<button type="button" class="sofia-chip" data-consulta="${escapeHtml(chip)}"><span>⚡</span>${escapeHtml(chip)}</button>`).join('')}
          </div>
        </div>`;
    }

    if (emisor === 'bot') {
      fila.innerHTML = `
        <div class="sofia-fila__avatar" aria-hidden="true">
          ${renderizarIconoBot()}
        </div>
        <div class="sofia-burbuja">
          <div class="sofia-burbuja__cuerpo">${htmlContenido}</div>
          ${htmlChips}
          <span class="sofia-burbuja__hora">${horaFormateada}</span>
        </div>`;
    } else {
      fila.innerHTML = `
        <div class="sofia-burbuja">
          <div class="sofia-burbuja__cuerpo">${htmlContenido}</div>
          <span class="sofia-burbuja__hora">${horaFormateada}</span>
        </div>`;
    }

    contenedor.appendChild(fila);
    contenedor.scrollTop = contenedor.scrollHeight;

    // Guardar en sesión
    estadoSofia.mensajes.push({ emisor, texto: textoMarkdown, chips });
    guardarHistorial();
  }

  function mostrarIndicadorEscribiendo() {
    const contenedor = document.getElementById('sofia-mensajes');
    if (!contenedor || document.getElementById('sofia-escribiendo-indicador')) return;

    const indicador = document.createElement('div');
    indicador.id = 'sofia-escribiendo-indicador';
    indicador.className = 'sofia-fila sofia-fila--bot';
    indicador.innerHTML = `
      <div class="sofia-fila__avatar" aria-hidden="true">${renderizarIconoBot()}</div>
      <div class="sofia-escribiendo">
        <span class="sofia-escribiendo__punto"></span>
        <span class="sofia-escribiendo__punto"></span>
        <span class="sofia-escribiendo__punto"></span>
      </div>`;
    contenedor.appendChild(indicador);
    contenedor.scrollTop = contenedor.scrollHeight;
  }

  function removerIndicadorEscribiendo() {
    const el = document.getElementById('sofia-escribiendo-indicador');
    if (el) el.remove();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     6. GESTIÓN DEL HISTORIAL EN SESIÓN
     ========================================================================== */

  function guardarHistorial() {
    try {
      sessionStorage.setItem('sistemasunal.sofia.historial', JSON.stringify(estadoSofia.mensajes.slice(-20)));
    } catch (_) {}
  }

  function cargarHistorialGuardado() {
    const contenedor = document.getElementById('sofia-mensajes');
    if (!contenedor) return;

    try {
      const guardado = sessionStorage.getItem('sistemasunal.sofia.historial');
      if (guardado) {
        const lista = JSON.parse(guardado);
        if (Array.isArray(lista) && lista.length > 0) {
          estadoSofia.mensajes = lista;
          contenedor.innerHTML = '';
          lista.forEach((item) => {
            agregarMensajeAlDOM(item.emisor, item.texto, item.chips, false);
          });
          return;
        }
      }
    } catch (_) {}

    // Mensaje de bienvenida por defecto si no hay historial
    const chipsIniciales = [
      'Prerrequisitos de materias',
      'Fechas del calendario',
      'Rutas del bus intercampus',
      'Convenio Kiro (AWS)',
      'Semilleros y grupos',
      '¿Cómo funciona el PAPA?',
    ];
    agregarMensajeAlDOM(
      'bot',
      `¡Hola! Soy **sofIA**, la asistente virtual de Ingeniería de Sistemas e Informática de la UNAL Medellín.

Estoy conectada a toda la información del portal: malla curricular, fechas del calendario, prerrequisitos, rutas de buses, convenios y más. ¿En qué te puedo ayudar hoy?`,
      chipsIniciales,
      false
    );
  }

  /* ==========================================================================
     7. VINCULACIÓN DE EVENTOS Y CONTROL DE APERTURA / CIERRE
     ========================================================================== */

  function abrirSofia() {
    const ventana = document.getElementById('sofia-ventana');
    const btn = document.getElementById('sofia-btn-toggle');
    const globo = document.getElementById('sofia-globo');
    if (!ventana || !btn) return;

    inicializarBaseConocimiento();

    ventana.hidden = false;
    // Forzar reflow para que la transición CSS anime
    void ventana.offsetWidth;
    ventana.classList.add('is-abierta');
    btn.setAttribute('aria-expanded', 'true');
    estadoSofia.abierto = true;

    if (globo) globo.style.display = 'none';

    setTimeout(() => {
      document.getElementById('sofia-input')?.focus();
      const contenedor = document.getElementById('sofia-mensajes');
      if (contenedor) contenedor.scrollTop = contenedor.scrollHeight;
    }, 200);
  }

  function cerrarSofia() {
    const ventana = document.getElementById('sofia-ventana');
    const btn = document.getElementById('sofia-btn-toggle');
    if (!ventana || !btn) return;

    ventana.classList.remove('is-abierta');
    btn.setAttribute('aria-expanded', 'false');
    estadoSofia.abierto = false;

    setTimeout(() => {
      if (!estadoSofia.abierto) {
        ventana.hidden = true;
      }
    }, 280);
  }

  function procesarConsultaUsuario(texto) {
    const consultaLimpia = (texto || '').trim();
    if (!consultaLimpia) return;

    // Agregar mensaje del usuario al chat
    agregarMensajeAlDOM('usuario', consultaLimpia);

    // Limpiar input
    const input = document.getElementById('sofia-input');
    if (input) input.value = '';

    // Mostrar animación "pensando..."
    mostrarIndicadorEscribiendo();

    // Pequeño retardo natural (280-450ms) para respuesta orgánica
    setTimeout(() => {
      removerIndicadorEscribiendo();
      const respuesta = responderPregunta(consultaLimpia);
      agregarMensajeAlDOM('bot', respuesta.texto, respuesta.chips);
    }, 320);
  }

  function vincularEventos() {
    const btnToggle = document.getElementById('sofia-btn-toggle');
    const btnCerrar = document.getElementById('sofia-btn-cerrar');
    const btnLimpiar = document.getElementById('sofia-btn-limpiar');
    const globoCerrar = document.getElementById('sofia-globo-cerrar');
    const globo = document.getElementById('sofia-globo');
    const formulario = document.getElementById('sofia-form');
    const contenedorMensajes = document.getElementById('sofia-mensajes');

    btnToggle?.addEventListener('click', () => {
      if (estadoSofia.abierto) cerrarSofia();
      else abrirSofia();
    });

    btnCerrar?.addEventListener('click', cerrarSofia);

    globo?.addEventListener('click', (e) => {
      if (e.target.closest('#sofia-globo-cerrar')) return;
      abrirSofia();
    });

    globoCerrar?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (globo) globo.remove();
      sessionStorage.setItem('sistemasunal.sofia.globo_oculto', '1');
    });

    if (sessionStorage.getItem('sistemasunal.sofia.globo_oculto') === '1' && globo) {
      globo.remove();
    }

    btnLimpiar?.addEventListener('click', () => {
      sessionStorage.removeItem('sistemasunal.sofia.historial');
      estadoSofia.mensajes = [];
      cargarHistorialGuardado();
    });

    formulario?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('sofia-input');
      if (input) procesarConsultaUsuario(input.value);
    });

    // Delegación de eventos para chips interactivos de sugerencias
    contenedorMensajes?.addEventListener('click', (e) => {
      const chip = e.target.closest('.sofia-chip');
      if (chip) {
        const consulta = chip.getAttribute('data-consulta');
        if (consulta) procesarConsultaUsuario(consulta);
      }
    });

    // Accesibilidad con teclado: Esc cierra la ventana
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && estadoSofia.abierto) {
        cerrarSofia();
      }
    });
  }

  /* ==========================================================================
     8. INICIALIZACIÓN AUTOMÁTICA
     ========================================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', crearElementosDOM);
  } else {
    crearElementosDOM();
  }

  // Precargar en segundo plano cuando el navegador esté libre
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => inicializarBaseConocimiento(), { timeout: 3000 });
  } else {
    setTimeout(inicializarBaseConocimiento, 1500);
  }

  // Exportar API global limpia por si otros módulos desean interactuar con sofIA
  window.sofIA = {
    abrir: abrirSofia,
    cerrar: cerrarSofia,
    preguntar: procesarConsultaUsuario,
  };
})();
