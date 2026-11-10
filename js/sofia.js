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
   Avatar: Versión holográfica inspirada en Cortana de HALO (IA cibernética UNAL).
   Consultas integradas:
   - Calendario académico completo (todas las actividades y fechas oficiales)
   - Malla curricular y prerrequisitos de las 93 asignaturas
   - Grupos de WhatsApp de estudio por materia
   - Unidad Compartida de Google Drive con material de estudio y parciales
   - Convenios y auxilios de Bienestar Universitario
   - Rutas de transporte intercampus
   - Semilleros y comunidades estudiantiles (AtarraIA, UNAlgoritmo, etc.)
   - Normativas: P.A.P.A., Citas SIA (4 Grupos DNINFOA), Bolsa de créditos
   - Redirecciones a SGS Minas, SIA y contacto directo con la Representación.
   Tono: Amiga de la juventud, empática, clara, sin rodeos y sin exceso de emojis. */

(function moduloSofia() {
  'use strict';

  if (typeof document === 'undefined') return;
  const esPaginaDescanso = document.body?.dataset?.pagina === 'descanso' || (window.location.pathname || '').endsWith('descanso.html');
  if (esPaginaDescanso) return;

  /* ==========================================================================
     1. CONSTANTES Y ENLACES OFICIALES
     ========================================================================== */

  const ENLACES_OFICIALES = {
    driveSistemas: 'https://drive.google.com/drive/folders/0AEk8YJGqI3OvUk9PVA?hl=es',
    solicitudAccesoDrive: 'https://docs.google.com/spreadsheets/d/1ixIitudn7GLZ9z99Vl9hFM9cmgE48aZV85Zkgqe_ARc',
    sia: 'https://sia.unal.edu.co/',
    sgsMinas: 'https://minas.medellin.unal.edu.co/estudiantes/gestion-de-asuntos-estudiantiles/gae-solicitudes-estudiantiles',
    bienestarMinas: 'https://bienestaruniversitario.medellin.unal.edu.co/secciones/gestion-y-fomento',
    wppRepre: 'https://wa.me/573123772091',
    telefonoRepre: '(+57) 312 377 2091',
    correoRepre: 'saescobara@unal.edu.co',
  };

  /* ==========================================================================
     2. ESTADO Y CACHÉ LOCAL
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
      conveniosPorId: new Map(),
      gruposPorNombre: new Map(),
    },
  };

  /* ==========================================================================
     3. UTILIDADES DE TEXTO Y NORMALIZACIÓN ROBUSTA
     ========================================================================== */

  function normalizar(texto) {
    if (!texto) return '';
    return texto
      .toString()
      .toLowerCase()
      // Normalizar acrónimos con puntos para que no queden separados
      .replace(/p\.a\.p\.a\.?/gi, 'papa')
      .replace(/p\.a\.p\.p\.i\.?/gi, 'pappi')
      .replace(/i\.p\.a\.?/gi, 'ipa')
      .replace(/p\s+a\s+p\s+a\b/gi, 'papa')
      .replace(/p\s+a\s+p\s+p\s+i\b/gi, 'pappi')
      .replace(/i\s+p\s+a\b/gi, 'ipa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const PALABRAS_VACIAS = new Set([
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u',
    'en', 'a', 'para', 'por', 'con', 'sin', 'sobre', 'que', 'como', 'cual', 'cuales',
    'donde', 'cuando', 'quien', 'quienes', 'es', 'son', 'me', 'mi', 'te', 'se', 'su',
    'sus', 'al', 'del', 'dime', 'saber', 'quiero', 'favor', 'cuentame', 'explica'
  ]);

  function extraerTerminos(texto) {
    return normalizar(texto)
      .split(' ')
      .filter((palabra) => palabra.length > 1 && !PALABRAS_VACIAS.has(palabra));
  }

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
            matriz[i - 1][j - 1] + 1,
            matriz[i][j - 1] + 1,
            matriz[i - 1][j] + 1
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
     4. CARGA E INDEXACIÓN
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
      console.warn('sofIA: no se pudo cargar la base local', error);
    } finally {
      estadoSofia.cargando = false;
    }
  }

  function indexarConocimiento() {
    const { indices, datos } = estadoSofia;

    datos.asignaturas.forEach((asig) => {
      indices.materiasPorCodigo.set(asig.codigo, asig);
      const normNombre = normalizar(asig.nombre);
      indices.materiasPorNombre.set(normNombre, asig);
    });

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
      [['investigacion de operaciones 1', 'io1', 'operaciones 1'], 'Investigación de Operaciones I'],
      [['investigacion de operaciones 2', 'io2', 'operaciones 2'], 'Investigación de Operaciones II'],
      [['trabajo de grado', 'tesis', 'grado', 'pasantia', 'practica'], 'Trabajo de Grado'],
      [['teoria de computacion', 'automatas'], 'Teoría de la Computación'],
    ];

    ALIAS_MATERIAS.forEach(([aliases, nombreReal]) => {
      const match = datos.asignaturas.find((a) => normalizar(a.nombre) === normalizar(nombreReal));
      if (match) {
        aliases.forEach((alias) => indices.aliasMaterias.set(normalizar(alias), match));
      }
    });

    // Indexar todas las filas del calendario
    if (datos.info?.guias) {
      const guiaCal = datos.info.guias.find((g) => g.id === 'calendario-academico');
      if (guiaCal?.calendario?.grupos) {
        guiaCal.calendario.grupos.forEach((grupo) => {
          if (Array.isArray(grupo.filas)) {
            grupo.filas.forEach((fila) => {
              indices.fechasCalendario.push({
                actividad: fila.actividad,
                actividadNorm: normalizar(fila.actividad),
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

    datos.convenios.forEach((c) => indices.conveniosPorId.set(normalizar(c.id || c.nombre), c));
    datos.grupos.forEach((g) => indices.gruposPorNombre.set(normalizar(g.nombre), g));
  }

  /* ==========================================================================
     5. MOTOR DE INTENCIONES
     ========================================================================== */

  function buscarAsignaturaPorTexto(preguntaNorm) {
    const { indices, datos } = estadoSofia;

    for (const [alias, asig] of indices.aliasMaterias.entries()) {
      if (new RegExp(`\\b${alias}\\b`).test(preguntaNorm)) {
        return asig;
      }
    }

    for (const [codigo, asig] of indices.materiasPorCodigo.entries()) {
      const codLimpio = normalizar(codigo);
      if (preguntaNorm.includes(codLimpio) || codLimpio.includes(preguntaNorm)) {
        return asig;
      }
    }

    for (const asig of datos.asignaturas) {
      const nombreNorm = normalizar(asig.nombre);
      if (preguntaNorm.includes(nombreNorm)) {
        return asig;
      }
    }

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
    // 1. Saludos y Presentación
    // ------------------------------------------------------------------------
    if (/^(hola|buenos dias|buenas tardes|buenas noches|hey|que tal|buenas|holi|hola sofia)\b/.test(preguntaNorm) && preguntaNorm.split(' ').length <= 4) {
      return {
        texto: `¡Hola! Qué gusto saludarte. Soy sofIA, tu compañera virtual de la carrera.

Pregúntame con confianza lo que necesites sobre materias, prerrequisitos, grupos de WhatsApp de estudio, fechas clave del calendario, la Unidad Compartida de Drive, convenios o trámites de la Facultad. ¿En qué te doy una mano hoy?`,
        chips: ['Prerrequisitos de materias', 'Drive de material de estudio', 'Fechas de cancelación', 'Convenio Kiro (AWS)'],
      };
    }

    if (/quien eres|quien te creo|que eres|como te llamas|presentate/.test(preguntaNorm)) {
      return {
        texto: `Soy sofIA, tu asistente virtual estudiantil de Ingeniería de Sistemas e Informática de la UNAL Medellín.

Mi avatar es una versión holográfica inspirada en la inteligencia de Cortana, diseñada para darte respuestas precisas al instante. Fui creada por Santiago Escobar Arias (nuestro Representante Estudiantil) para ayudarte a consultar mallas, fechas, convenios, rutas de transporte y normativas académicas sin rodeos.`,
        chips: ['Ver Malla Curricular', 'Drive de material de estudio', 'Calendario académico'],
      };
    }

    if (/gracias|muchas gracias|genial|excelente|bacano|super|te quiero|vale gracias/.test(preguntaNorm) && preguntaNorm.split(' ').length <= 4) {
      return {
        texto: `¡De nada! Recuerda que aquí estoy para cualquier duda que tengas en el semestre. ¡Mucho ánimo con las materias!`,
        chips: ['Prerrequisitos de materias', 'Calendario académico', 'Drive de material de estudio'],
      };
    }

    // ------------------------------------------------------------------------
    // 2. Malla Curricular en general / "Malla curricular" / "Otras asignaturas"
    // ------------------------------------------------------------------------
    if (preguntaNorm === 'malla curricular' || preguntaNorm === 'ver malla curricular' || preguntaNorm === 'ver en la malla interactiva' || preguntaNorm === 'otras asignaturas') {
      return {
        texto: `En nuestra [Malla Curricular](malla.html) interactiva puedes explorar los 10 semestres del plan de estudios:

- **Semáforo de prerrequisitos:** Al hacer clic en cualquier asignatura se iluminan en amarillo sus requisitos previos y en verde las materias que te abre a futuro.
- **Grupos de WhatsApp:** Cada materia tiene un botón para unirte a su grupo de estudio.
- **Unidad Compartida de Drive:** En la parte superior de la malla está el acceso directo al banco de parciales y talleres.

¿Deseas consultar los prerrequisitos de alguna materia en específico? Solo dime su nombre (ej: *"Prerrequisitos de Simulación"* o *"Prerrequisitos de POO"*).`,
        chips: ['Prerrequisitos de Simulación', 'Prerrequisitos de POO', 'Materias de primer semestre', 'Drive de material de estudio'],
      };
    }

    // ------------------------------------------------------------------------
    // 3. Grupos de WhatsApp de estudio por materia
    // ------------------------------------------------------------------------
    const esConsultaWpp = /whatsapp|wpp|chat|chats|grupo de estudio|comunidad de estudio/.test(preguntaNorm);
    const esConsultaSemillero = /semillero|semilleros|grupo estudiantil|grupos estudiantiles|atarraia|unalgoritmo|aperture|turing|uneural/.test(preguntaNorm);

    if (esConsultaWpp && !esConsultaSemillero) {
      const materiaWpp = buscarAsignaturaPorTexto(preguntaNorm);

      if (materiaWpp) {
        if (materiaWpp.whatsapp) {
          return {
            texto: `Aquí tienes el grupo de estudio de WhatsApp para **${materiaWpp.nombre}** (\`${materiaWpp.codigo}\`):

👉 [Entrar al grupo de WhatsApp de ${materiaWpp.nombre}](${materiaWpp.whatsapp})

Recuerda que también puedes ver todas las materias con grupo de estudio directamente en la [Malla Curricular](malla.html).`,
            chips: [`Prerrequisitos de ${materiaWpp.nombre}`, 'Ver Malla Curricular', 'Drive de material de estudio'],
          };
        } else {
          return {
            texto: `Actualmente **${materiaWpp.nombre}** (\`${materiaWpp.codigo}\`) no tiene un enlace de WhatsApp registrado en la web.

Si tú o tus compañeros tienen el grupo de este semestre, escríbele a Santiago para que lo añadamos al portal:
- WhatsApp del repre: [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre})`,
            chips: [`Prerrequisitos de ${materiaWpp.nombre}`, 'Ver Malla Curricular', 'Drive de material de estudio'],
          };
        }
      }

      return {
        texto: `Los grupos de WhatsApp de estudio están organizados por materia dentro de nuestra [Malla Curricular](malla.html). 

Al hacer clic sobre cualquier asignatura que tenga el ícono de WhatsApp podrás unirte directamente a su comunidad. Si buscas una materia en específico, solo dime por ejemplo: *"pásame el wpp de Simulación"* o *"grupo de Cálculo Diferencial"*.`,
        chips: ['WhatsApp de Simulación', 'WhatsApp de POO', 'WhatsApp de Cálculo Diferencial', 'Ver Malla Curricular'],
      };
    }

    // ------------------------------------------------------------------------
    // 4. Drive / Banco de Recursos / Parciales anteriores
    // ------------------------------------------------------------------------
    const esReporteONotas = /reporte|calificaciones|notas parciales|30\s*%|60\s*%|100\s*%/.test(preguntaNorm);
    if (!esReporteONotas && (/drive|material de estudio|materiales|parciales viejos|parciales anteriores|talleres|apuntes|guias|banco de recursos|unidad compartida/.test(preguntaNorm) || preguntaNorm === 'parciales')) {
      return {
        texto: `Todo el banco de material de estudio de la carrera está centralizado en la **Unidad Compartida de Google Drive de Sistemas**:

📁 **[Abrir la Unidad Compartida de Sistemas en Google Drive](${ENLACES_OFICIALES.driveSistemas})**

Allí encuentras carpetas por materia con:
- Parciales y quices de semestres anteriores
- Talleres resueltos y guías de laboratorio
- Libros guía, diapositivas y apuntes comunitarios

Si al ingresar con tu correo institucional de la UNAL te pide acceso, solicita tu alta en este formulario:
👉 [Formulario para solicitar acceso al Drive](${ENLACES_OFICIALES.solicitudAccesoDrive})`,
        chips: ['Ver Malla Curricular', 'WhatsApp de una materia', 'Fechas del calendario'],
      };
    }

    // ------------------------------------------------------------------------
    // 5. Cancelación de materias o cancelación de semestre (empático con repre)
    // ------------------------------------------------------------------------
    const esCancelacionSemestre = /cancelar semestre|cancelacion de semestre|cancelar el periodo|cancelacion de periodo|retirar semestre/.test(preguntaNorm);
    const esCancelacionMaterias = /cancelar materia|cancelar materias|cancelacion de asignatura|cancelacion de asignaturas|hasta cuando puedo cancelar|fechas? de cancelaci(on|ones)|cancelar una materia|como cancelo/.test(preguntaNorm) || (preguntaNorm.includes('cancelar') && !esCancelacionSemestre);

    if (esCancelacionSemestre || esCancelacionMaterias) {
      const fechas = indices.fechasCalendario;
      const cancelSin = fechas.find((f) => /sin descuento/.test(f.actividadNorm));
      const cancelCon = fechas.find((f) => /con descuento/.test(f.actividadNorm));
      const finClases = fechas.find((f) => /finalizacion de clases/.test(f.actividadNorm));

      let fechasTxt = '';
      if (esCancelacionSemestre) {
        fechasTxt = `**Cancelación de Periodo Académico (Semestre completo):**
- Se solicita ante el Consejo de Facultad mediante el [Portal de Solicitudes Estudiantiles SGS](${ENLACES_OFICIALES.sgsMinas}).
- La fecha límite oficial del calendario (2026-2S) es el **${finClases?.fin || '17 de diciembre de 2026'}** (último día de clases).
- No requiere haber aprobado un porcentaje mínimo y te permite solicitar reingreso o reserva según tu situación.`;
      } else {
        fechasTxt = `**Plazos para Cancelar Asignaturas (2026-2S):**
- **Semana 3 (sin pérdida de créditos):** Del ${cancelSin?.inicio || '27 de agosto'} al **${cancelSin?.fin || '10 de septiembre'}**. Los créditos vuelven completos a tu bolsa.
- **Semana 8 (con pérdida de créditos):** Del ${cancelCon?.inicio || '15 de septiembre'} al **${cancelCon?.fin || '22 de octubre'}**. No afecta tu P.A.P.A., pero los créditos de la materia se descuentan de tu bolsa disponible.
- **Cancelación extemporánea (después de semana 8):** Solo procede por fuerza mayor, caso fortuito o motivos de salud justificados a través del [Portal SGS de Minas](${ENLACES_OFICIALES.sgsMinas}).`;
      }

      return {
        texto: `${fechasTxt}

---

💙 **Un mensaje importante de compañera a compañero:**
Si estás pensando en cancelar porque estás pasando por un momento personal difícil, problemas de salud o la carga te está superando, **no estás solo ni tienes que resolverlo en silencio**. 

Santiago (nuestro Representante Estudiantil) te puede orientar de forma confidencial para ver si conviene radicar una solicitud extraordinaria, aplazar o buscar un apoyo académico. Escríbele directo a su WhatsApp:
👉 [Escribirle a Santiago: ${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre})`,
        chips: ['Bolsa de créditos', 'Portal SGS Minas', 'Calendario académico'],
      };
    }

    // ------------------------------------------------------------------------
    // 5.1 Contacto del Representante Estudiantil (Santiago Escobar Arias)
    // ------------------------------------------------------------------------
    if (/contacto del representante|contacto del repre|representante estudiantil|hablar con el repre|hablar con santiago|contacto santiago|quien es el representante|\brepre\b/.test(preguntaNorm)) {
      return {
        texto: `¡Hola! Santiago Escobar Arias es nuestro **Representante Estudiantil de Ingeniería de Sistemas e Informática** ante el Comité Asesor y el Consejo de Facultad.

Puedes escribirle con total confianza para:
- Orientación personalizada en trámites ante el Consejo de Facultad o la Vicedecanatura.
- Solicitudes extemporáneas, cancelación por enfermedad o situaciones imprevistas.
- Apoyo y mediación académica o situaciones personales que te estén afectando.
- Proponer ideas, eventos o mejoras para nuestra carrera.

📱 **WhatsApp directo:** [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre})
📧 **Correo institucional:** \`${ENLACES_OFICIALES.correoRepre}\`

_Recuerda que no estás solo en tu camino por la universidad._`,
        chips: ['Portal SGS Minas', 'Calendario académico', 'Ver Malla Curricular'],
      };
    }

    // ------------------------------------------------------------------------
    // 6. Consultas del Calendario Académico (fechas específicas o generales)
    // ------------------------------------------------------------------------
    const esFinDeClases = /finalizan las clases|finalizacion de clases|terminan las clases|fin de clases|acaban las clases|termina el semestre|acaba el semestre|fin del semestre|ultimo dia de clases|hasta cuando hay clases|cuando terminan|cuando finalizan|fecha de finalizacion/.test(preguntaNorm);
    const esInicioDeClases = /inicio de clases|inician las clases|empiezan las clases|arranque de clases|comienzo de clases|primer dia de clases|cuando empiezan|cuando inician/.test(preguntaNorm);
    const esReporteNotas = /reporte.*notas|notas parciales|cierre de notas|calificaciones|30\s*%|60\s*%|100\s*%/.test(preguntaNorm);
    const esSemanaUniversitaria = /semana universitaria/.test(preguntaNorm);
    const esConsolidacion = /consolidaci(on|ones).*matr(i|i)cula/.test(preguntaNorm);
    const esGeneralCalendario = /calendario|calendario academico|fechas del calendario|fechas clave|\bfechas\b/.test(preguntaNorm);

    const resolverFilaCalendario = () => {
      for (const f of indices.fechasCalendario) {
        if (f.actividadNorm && (preguntaNorm.includes(f.actividadNorm) || (preguntaNorm.length >= 6 && f.actividadNorm.includes(preguntaNorm)))) {
          return f;
        }
      }
      const tramitesMap = [
        { regex: /cambio de tutor/, norm: 'cambio de tutor' },
        { regex: /cancelaci(on|onar).*50|posterior al 50/, norm: 'cancelacion de asignatura(s) posterior al 50 % de avance del periodo' },
        { regex: /cancelaci(on|onar).*periodo|cancelar semestre/, norm: 'cancelacion de periodo academico' },
        { regex: /carga (inferior|minima)|carga academica minima/, norm: 'carga inferior a la minima' },
        { regex: /devoluci(on|onar).*dinero/, norm: 'devolucion de dinero' },
        { regex: /doble titulaci(on|onar) internacional/, norm: 'doble titulacion internacional' },
        { regex: /doble titulaci(on|onar)/, norm: 'doble titulacion' },
        { regex: /no oportuna.*tdg|extemporanea.*tdg/, norm: 'autorizacion de inscripcion/adicion no oportuna de tdg o actividades academicas' },
        { regex: /no oportuna|extemporanea/, norm: 'autorizacion de inscripcion/adicion no oportuna de asignatura(s)' },
        { regex: /modificaci(on|onar).*tdg|modificaci(on|onar).*trabajo de grado/, norm: 'modificacion de trabajo de grado (tdg)' },
        { regex: /movilidad.*(sede|interna)|intercampus entre sedes/, norm: 'movilidad interna entre sedes' },
        { regex: /practica academica|\bpae\b/, norm: 'practica academica especial (pae)' },
        { regex: /reconocimiento.*asignatura|homologaci(on|onar)/, norm: 'reconocimiento de asignatura(s)' },
        { regex: /reposici(on|onar)|apelaci(on|onar)/, norm: 'recurso de reposicion y/o apelacion' },
        { regex: /\breingreso\b/, norm: 'reingreso' },
        { regex: /reserva.*cupo/, norm: 'reserva de cupo adicional' },
        { regex: /retiro.*universidad|retiro definitivo/, norm: 'retiro de la universidad' },
        { regex: /trabajo de grado.*modalidad|inscripcion.*tdg/, norm: 'trabajo de grado (tdg), en cualquiera de sus modalidades' },
        { regex: /\btraslado\b/, norm: 'traslado' },
      ];
      for (const t of tramitesMap) {
        if (t.regex.test(preguntaNorm)) {
          const match = indices.fechasCalendario.find((f) => f.actividadNorm.includes(t.norm));
          if (match) return match;
        }
      }
      return null;
    };

    const filaCal = resolverFilaCalendario();

    if (esFinDeClases) {
      const filaFin = indices.fechasCalendario.find((f) => /finalizacion de clases/.test(f.actividadNorm));
      return {
        texto: `Las clases del periodo académico 2026-2S finalizan oficialmente el **${filaFin?.fin || '17 de diciembre de 2026'}**.

Posterior a esta fecha:
- El reporte del 100 % de calificaciones tiene como límite el **19 de diciembre de 2026**.`,
        chips: ['Reporte de notas parciales', 'Fechas de cancelación', 'Calendario académico'],
      };
    }

    if (esInicioDeClases) {
      const cancelSin = indices.fechasCalendario.find((f) => /sin descuento/.test(f.actividadNorm));
      return {
        texto: `Las clases del periodo académico 2026-2S iniciaron el **${cancelSin?.inicio || '27 de agosto de 2026'}**.

Puedes consultar los plazos restantes del semestre en la sección [Info y Guías](info.html#calendario).`,
        chips: ['Cuándo finalizan las clases', 'Fechas de cancelación', 'Reporte de notas parciales'],
      };
    }

    if (esReporteNotas) {
      const r30 = indices.fechasCalendario.find((f) => /30\s*%/.test(f.actividadNorm));
      const r60 = indices.fechasCalendario.find((f) => /60\s*%/.test(f.actividadNorm));
      const r100 = indices.fechasCalendario.find((f) => /100\s*%/.test(f.actividadNorm));

      return {
        texto: `**Fechas límite para el reporte de calificaciones (2026-2S):**

- **Reporte de notas parciales (30 %):** Límite **${r30?.fin || '1 de octubre de 2026'}**
- **Reporte de notas parciales (60 %):** Límite **${r60?.fin || '5 de noviembre de 2026'}**
- **Reporte final de notas (100 %):** Límite **${r100?.fin || '19 de diciembre de 2026'}**

Recuerda que antes del reporte del 60 % de notas tienes derecho a conocer oportunamente tus evaluaciones previas.`,
        chips: ['Cuándo finalizan las clases', 'Fechas de cancelación', 'Bolsa de créditos'],
      };
    }

    if (esSemanaUniversitaria) {
      return {
        texto: `La **Semana Universitaria** en la UNAL Sede Medellín es un espacio institucional de receso de actividades evaluativas con jornadas culturales, deportivas y académicas especiales en los campus Volador, Robledo y Río.`,
        chips: ['Calendario académico', 'Ver sección Intercampus', 'Contacto del Representante'],
      };
    }

    if (esConsolidacion) {
      const filaCons = indices.fechasCalendario.find((f) => /consolidacion/.test(f.actividadNorm));
      return {
        texto: `La **Consolidación de matrícula** para el periodo 2026-2S tuvo como fecha límite el **${filaCons?.fin || '14 de septiembre de 2026'}**. A partir de este hito tu matrícula queda en firme y se consolidan tus asignaturas en el SIA.`,
        chips: ['Calendario académico', 'Bolsa de créditos', 'Portal SGS Minas'],
      };
    }

    if (filaCal) {
      const rangoTxt = filaCal.inicio ? `desde el **${filaCal.inicio}** hasta el **${filaCal.fin}**` : `límite el **${filaCal.fin}**`;
      const notaTxt = filaCal.nota ? `\n_Nota: ${filaCal.nota}_` : '';
      return {
        texto: `**${filaCal.actividad} (Periodo ${filaCal.aplica || '2026-2S'}):**
El plazo oficial según el calendario de la Facultad de Minas es ${rangoTxt}.${notaTxt}

Este trámite se radica ante la Gestión de Asuntos Estudiantiles (GAE) a través del [Portal SGS de Minas](${ENLACES_OFICIALES.sgsMinas}).`,
        chips: ['Portal SGS Minas', 'Calendario académico', 'Contacto del Representante'],
      };
    }

    if (esGeneralCalendario) {
      const cancelSin = indices.fechasCalendario.find((f) => /sin descuento/.test(f.actividadNorm));
      const cancelCon = indices.fechasCalendario.find((f) => /con descuento/.test(f.actividadNorm));
      const r60 = indices.fechasCalendario.find((f) => /60\s*%/.test(f.actividadNorm));
      const finClases = indices.fechasCalendario.find((f) => /finalizacion de clases/.test(f.actividadNorm));
      const r100 = indices.fechasCalendario.find((f) => /100\s*%/.test(f.actividadNorm));

      return {
        texto: `**Calendario Académico Oficial de Pregrado (2026-2S):**

- **Adición y cancelación sin descuento de créditos:** ${cancelSin?.inicio || '27-ago'} al **${cancelSin?.fin || '10 de septiembre'}**
- **Cancelación con descuento de créditos:** ${cancelCon?.inicio || '15-sep'} al **${cancelCon?.fin || '22 de octubre'}**
- **Reporte de notas parciales (60 %):** Límite **${r60?.fin || '5 de noviembre'}**
- **Finalización oficial de clases:** **${finClases?.fin || '17 de diciembre'}**
- **Reporte final de notas (100 %):** Límite **${r100?.fin || '19 de diciembre'}**

Puedes ver el calendario interactivo completo con todas las solicitudes estudiantiles en la sección [Info y Guías](info.html#calendario).`,
        chips: ['Fechas de cancelación', 'Cuándo finalizan las clases', 'Reporte de notas parciales'],
      };
    }

    // ------------------------------------------------------------------------
    // 7. Materias de último semestre / Décimo semestre
    // ------------------------------------------------------------------------
    if (/ultimo semestre|ultimos semestres|decimo semestre|semestre 10|10 semestre|materias para graduarme|terminar la carrera/.test(preguntaNorm)) {
      return {
        texto: `En el **10° y último semestre** de Ingeniería de Sistemas e Informática el plan está estructurado para que culmines tu formación con:

1. **Trabajo de Grado (\`3007850\` - 6 créditos):**
   Es la asignatura central. Tienes varias modalidades para realizarla:
   - **Práctica de extensión / Pasantía empresarial** en una empresa del sector tecnológico.
   - **Proyecto de investigación** vinculado a un grupo o semillero.
   - **Asignaturas de posgrado** (cursar materias de especialización o maestría en Minas).

2. **Créditos pendientes de Tecnologías de Aplicación (Optativas):**
   Completar el acumulado exigido de **22 créditos** en asignaturas disciplinares optativas.

3. **Créditos de Libre Elección:**
   Completar los **32 créditos** de libre elección en materias que te gusten, idiomas o posgrados.

4. **Requisitos de Grado:**
   - Cumplir el requisito de idioma extranjero (Inglés B1/B2 según tu año de admisión).
   - Tener aprobados los 160 créditos exigidos del plan (más nivelaciones si aplicaban).

Si tienes dudas sobre tu cupo de créditos restante, revisa tu avance en la sección [Mi Avance](avance.html).`,
        chips: ['Prerrequisitos de Trabajo de Grado', 'Optativas de Sistemas', 'Ir a Mi Avance'],
      };
    }

    // ------------------------------------------------------------------------
    // 7.1 Optativas de Sistemas / Tecnologías de Aplicación
    // ------------------------------------------------------------------------
    if (/optativas de sistemas|materias optativas|asignaturas optativas|disciplinar optativa|tecnologias de aplicacion|\boptativas\b/.test(preguntaNorm)) {
      return {
        texto: `En el plan de estudios de Ingeniería de Sistemas e Informática debes cursar **22 créditos en asignaturas Disciplinares Optativas** (agrupadas como Tecnologías de Aplicación).

Entre las optativas disciplinares que ofrece el programa se encuentran:
- **Inteligencia Artificial** (\`3007842\` - 3 cr)
- **Sistemas Distribuidos** (\`3007844\` - 3 cr)
- **Bases de Datos Avanzadas** (\`3007841\` - 3 cr)
- **Arquitectura de Software** (\`3007840\` - 3 cr)
- **Criptografía y Seguridad en Redes** (\`3007843\` - 3 cr)
- **Métodos Numéricos** (\`3007851\` - 4 cr)
- **Cálculo en Varias Variables** (\`1000006\` - 4 cr)
- **Ecuaciones Diferenciales** (\`1000007\` - 4 cr)

Puedes consultar la oferta completa y sus créditos en la sección interactiva de la [Malla Curricular](malla.html), y revisar tu avance actual en [Mi Avance](avance.html).`,
        chips: ['Prerrequisitos de materias', 'Ir a Mi Avance', 'Ver Malla Curricular'],
      };
    }

    // ------------------------------------------------------------------------
    // 8. Prerrequisitos de materias específicas
    // ------------------------------------------------------------------------
    const esConsultaPrereq = /prerrequisit|prerequisit|requisito|que pide|que necesito para ver|para matricular|correquisit|abrir|correr/.test(preguntaNorm);
    const materiaEncontrada = buscarAsignaturaPorTexto(preguntaNorm);

    if (materiaEncontrada && (esConsultaPrereq || preguntaNorm.includes(normalizar(materiaEncontrada.nombre)))) {
      const preCodigos = materiaEncontrada.prerrequisitos || [];
      const correqCodigos = materiaEncontrada.correquisitos || [];

      let detallePrereq = '';
      if (preCodigos.length === 0) {
        detallePrereq = `No tiene prerrequisitos. La puedes matricular desde tu primer semestre (según tu cupo de créditos y cita del SIA).`;
      } else {
        const nombresPre = preCodigos.map((cod) => {
          const preMat = indices.materiasPorCodigo.get(cod);
          return preMat ? `• **${preMat.nombre}** (\`${cod}\`)` : `• Asignatura código \`${cod}\``;
        }).join('\n');
        detallePrereq = `**Prerrequisito(s) necesario(s):**\n${nombresPre}`;
      }

      let detalleCorreq = '';
      if (correqCodigos.length > 0) {
        const nombresCorreq = correqCodigos.map((cod) => {
          const cMat = indices.materiasPorCodigo.get(cod);
          return cMat ? `• **${cMat.nombre}** (\`${cod}\`)` : `• Asignatura código \`${cod}\``;
        }).join('\n');
        detalleCorreq = `\n\n**Correquisito(s) (simultáneos):**\n${nombresCorreq}`;
      }

      const semestreTxt = materiaEncontrada.semestre ? `Semestre sugerido: **${materiaEncontrada.semestre}°**` : 'Asignatura Optativa / Elegible';
      const obligatoriaTxt = materiaEncontrada.obligatoria ? 'Obligatoria' : 'Optativa';
      const wspTxt = materiaEncontrada.whatsapp
        ? `\n\n👉 [Unirte al grupo de WhatsApp de estudio](${materiaEncontrada.whatsapp})`
        : '\n\n*(Esta materia no tiene grupo de WhatsApp registrado actualmente en la web).*';

      const chipsPre = preCodigos
        .map((cod) => indices.materiasPorCodigo.get(cod))
        .filter(Boolean)
        .map((m) => `Prerrequisitos de ${m.nombre}`);

      return {
        texto: `### ${materiaEncontrada.nombre} (\`${materiaEncontrada.codigo}\`)

${detallePrereq}${detalleCorreq}

- **Créditos:** ${materiaEncontrada.creditos}
- **Tipología:** ${obligatoriaTxt} (${materiaEncontrada.agrupacion || 'Plan de estudios'})
- **Nivel:** ${semestreTxt}${wspTxt}`,
        chips: chipsPre.length > 0 ? chipsPre : ['Ver Malla Curricular', 'Drive de material de estudio'],
      };
    }

    // ------------------------------------------------------------------------
    // 9. Materias por semestre
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
                const preInfo = preCount > 0 ? ` _(pide ${preCount} prerreq.)_` : ' _(sin prerreq.)_';
                return `• **${asig.nombre}** (${asig.creditos} créditos)${preInfo}`;
              }
              return `• Asignatura código \`${item.codigo}\``;
            } else if (item.tipo === 'bolsa') {
              return `• **${item.nombre || 'Asignatura Optativa'}** (${item.creditos} créditos)`;
            }
            return '';
          }).filter(Boolean).join('\n');
        } else {
          listaTxt = materiasSemestre.map((m) => {
            const preCount = m.prerrequisitos?.length || 0;
            const preInfo = preCount > 0 ? ` _(pide ${preCount} prerreq.)_` : ' _(sin prerreq.)_';
            return `• **${m.nombre}** (${m.creditos} créditos)${preInfo}`;
          }).join('\n');
        }

        const creditosTotales = bloquePlan?.creditos || materiasSemestre.reduce((acc, m) => acc + (m.creditos || 0), 0);

        return {
          texto: `### Plan de estudios para Semestre ${numSemestre} (${creditosTotales} créditos sugeridos)

${listaTxt}

Si quieres ver el semáforo de prerrequisitos o unirte al WhatsApp de alguna, puedes pulsar abajo o abrir la [Malla Curricular](malla.html).`,
          chips: materiasSemestre.slice(0, 4).map((m) => `Prerrequisitos de ${m.nombre}`),
        };
      }
    }

    // ------------------------------------------------------------------------
    // 10. Auxilios de Bienestar Universitario
    // ------------------------------------------------------------------------
    if (/auxilio|auxilios|bienestar|apoyo alimentario|apoyo economico|bono de transporte|alojamiento|residencias|almuerzo|almuerzos|subsidio|comida|pbm/.test(preguntaNorm)) {
      return {
        texto: `El Área de Gestión y Fomento Socioeconómico de Bienestar Universitario ofrece varios apoyos para estudiantes de pregrado:

1. **Apoyo Alimentario:**
   Almuerzo diario durante el semestre en los restaurantes universitarios del Campus El Volador y Robledo.
2. **Apoyo Económico Estudiantil:**
   Subsidio monetario semestral para gastos de sostenimiento académico.
3. **Auxilio o Tarifa Estudiantil de Transporte:**
   Tarifa preferencial en la Tarjeta Cívica del Metro de Medellín y auxilios de movilidad.
4. **Alojamiento y Residencias Estudiantiles:**
   Subsidio o cupo de vivienda para estudiantes que provienen de fuera del Área Metropolitana.

**Requisitos principales:**
- Estar matriculado en el semestre vigente.
- Tener evaluado el Puntaje Básico de Matrícula (PBM).
- Postularte dentro de las fechas fijadas en la convocatoria oficial (a inicio de cada semestre).
- Cumplir el compromiso de **Horas de Corresponsabilidad** (mínimo 16 horas semestrales en dependencias de la universidad).

👉 Más información y convocatorias abiertas: [Bienestar UNAL Medellín](${ENLACES_OFICIALES.bienestarMinas})`,
        chips: ['Horas de corresponsabilidad', 'Convenios estudiantiles', 'Calendario académico'],
      };
    }

    // ------------------------------------------------------------------------
    // 11. Convenios y Beneficios
    // ------------------------------------------------------------------------
    const esConvenio = /convenio|convenios|beneficio|beneficios/.test(preguntaNorm);

    if (esConvenio || /kiro|aws|coursera|github|copilot|jetbrains|pycharm|intellij|office|microsoft|matlab|autodesk|revit|autocad|spotify|sapiencia|icetex/.test(preguntaNorm)) {
      if (preguntaNorm.includes('kiro') || preguntaNorm.includes('programar con ia') || preguntaNorm.includes('ia para programar')) {
        return {
          texto: `**Convenio Kiro (AWS) · Programación con IA:**
- **Beneficio:** 1.000 créditos mensuales gratis durante 1 año.
- **¿Qué hace?** Es un entorno de IA desarrollado sobre Amazon Web Services que convierte ideas y especificaciones en código real ejecutable para tus proyectos y materias.
- **¿Cómo activarlo?** Entra a [dned.unal.edu.co](https://dned.unal.edu.co) con tu cuenta de correo institucional de la UNAL.`,
          chips: ['GitHub Student Pack', 'Coursera UNAL', 'Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('coursera') || preguntaNorm.includes('curso') || preguntaNorm.includes('certificacion') || preguntaNorm.includes('diplomado')) {
        return {
          texto: `**Coursera for Campus UNAL:**
- **Beneficio:** Cursos y certificaciones profesionales gratis con universidades internacionales (Google, IBM, Stanford, Michigan, etc.).
- **¿Cómo activarlo?** Inicia sesión en [coursera.org](https://www.coursera.org/) seleccionando "Iniciar sesión con la organización" usando tu correo \`@unal.edu.co\`.`,
          chips: ['Convenio Kiro (AWS)', 'GitHub Student Pack', 'Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('github') || preguntaNorm.includes('copilot') || preguntaNorm.includes('autocompletar')) {
        return {
          texto: `**GitHub Student Developer Pack:**
- **Beneficio:** GitHub Copilot gratis, cuenta GitHub Pro sin costo, dominios gratuitos por un año (.me), créditos en la nube (Azure, DigitalOcean) y herramientas de desarrollo.
- **¿Cómo activarlo?** Postúlate en [education.github.com/pack](https://education.github.com/pack) subiendo tu carnet o certificado de matrícula.`,
          chips: ['JetBrains Student Pack', 'Convenio Kiro (AWS)', 'Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('jetbrains') || preguntaNorm.includes('intellij') || preguntaNorm.includes('pycharm') || preguntaNorm.includes('webstorm') || preguntaNorm.includes('ide')) {
        return {
          texto: `**JetBrains Student Pack:**
- **Beneficio:** Licencias educativas profesionales para IntelliJ IDEA Ultimate, PyCharm Professional, WebStorm, CLion, DataGrip, etc.
- **¿Cómo activarlo?** Regístrate en [jetbrains.com/community/education](https://www.jetbrains.com/community/education/) con tu correo \`@unal.edu.co\`.`,
          chips: ['GitHub Student Pack', 'Microsoft 365', 'Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('office') || preguntaNorm.includes('microsoft') || preguntaNorm.includes('word') || preguntaNorm.includes('excel') || preguntaNorm.includes('onedrive') || preguntaNorm.includes('almacenamiento')) {
        return {
          texto: `**Microsoft 365 Educación:**
- **Beneficio:** Suite completa de Office (Word, Excel, PowerPoint, Teams) para descargar en hasta 5 dispositivos y 1 TB de almacenamiento en la nube en OneDrive.
- **¿Cómo activarlo?** Inicia sesión en [portal.office.com](https://portal.office.com) con tu usuario y contraseña del correo UNAL.`,
          chips: ['MATLAB y Simulink', 'Coursera UNAL', 'Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('matlab') || preguntaNorm.includes('simulink') || preguntaNorm.includes('calculo numerico')) {
        return {
          texto: `**MATLAB y Simulink (Campus-Wide License):**
- **Beneficio:** Acceso ilimitado a todas las toolboxes de MATLAB, Simulink y cursos de MATLAB Academy.
- **¿Cómo activarlo?** Entra al portal de MathWorks UNAL y crea tu cuenta con tu correo institucional.`,
          chips: ['Convenio Kiro (AWS)', 'Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('autodesk') || preguntaNorm.includes('autocad') || preguntaNorm.includes('revit') || preguntaNorm.includes('cad') || preguntaNorm.includes('3d')) {
        return {
          texto: `**Autodesk Education:**
- **Beneficio:** Licencias educativas de 1 año renovables para AutoCAD, Revit, 3ds Max, Maya e Inventor.
- **¿Cómo activarlo?** Regístrate en [autodesk.com/education](https://www.autodesk.com/education/) verificando tu calidad de estudiante.`,
          chips: ['Ver todos los convenios'],
        };
      }

      if (preguntaNorm.includes('spotify') || preguntaNorm.includes('musica')) {
        return {
          texto: `**Spotify Premium Estudiantes:**
- **Beneficio:** 50 % de descuento en la suscripción mensual de Spotify Premium verificando tu estatus estudiantil a través de SheerID con tu correo UNAL.`,
          chips: ['Ver todos los convenios'],
        };
      }

      return {
        texto: `En la sección de [Convenios](convenios.html) tenemos recopilados los principales beneficios a los que tienes derecho:

- **Programación e IA:** Kiro (AWS) con 1.000 créditos/mes y GitHub Copilot.
- **Cursos y certificación:** Coursera for Campus con acceso gratuito.
- **IDEs y herramientas:** JetBrains Student Pack (IntelliJ, PyCharm, WebStorm).
- **Productividad:** Microsoft 365 con 1 TB de OneDrive y MATLAB Campus-Wide.
- **Bienestar:** Almuerzos estudiantiles, tarifa Metro Cívica y Spotify al 50 %.

Si buscas un beneficio para algo en particular (por ejemplo *"convenio para cursos"*, *"para office"* o *"para programar con IA"*), dímelo y te paso los pasos exactos.`,
        chips: ['Kiro AWS', 'GitHub Student Pack', 'Coursera UNAL', 'Auxilios de Bienestar'],
      };
    }

    // ------------------------------------------------------------------------
    // 12. Semilleros y Grupos de Investigación
    // ------------------------------------------------------------------------
    if (esConsultaSemillero) {
      if (preguntaNorm.includes('atarraia')) {
        return {
          texto: `**AtarraIA · Semillero de Ciencias de la Computación:**
Es un semillero de investigación enfocado en inteligencia artificial, modelos de aprendizaje automático y soluciones colaborativas en la Facultad de Minas.

- WhatsApp oficial de AtarraIA: [Unirme al grupo de WhatsApp](https://chat.whatsapp.com/Dd8RnPsMGdg22x3H3s6vIa?mode=ems_copy_t)`,
          chips: ['UNAlgoritmo', 'Aperture', 'Ver otros semilleros'],
        };
      }

      if (preguntaNorm.includes('unalgoritmo')) {
        return {
          texto: `**UNAlgoritmo · Programación Competitiva:**
Grupo estudiantil dedicado a estructuras de datos, algoritmia y preparación para competencias de programación (ICPC, Maratón Nacional, MFP). Entrenan semanalmente en resolución de problemas en equipo.`,
          chips: ['Semillero AtarraIA', 'Aperture', 'Turing Box'],
        };
      }

      if (preguntaNorm.includes('aperture')) {
        return {
          texto: `**Aperture Systems Lab:**
Semillero de investigación estudiantil enfocado en ciencia de datos, machine learning e inteligencia artificial aplicada con proyectos prácticos.`,
          chips: ['Semillero AtarraIA', 'UNAlgoritmo', 'UNeural'],
        };
      }

      return {
        texto: `En Ingeniería de Sistemas contamos con semilleros y grupos estudiantiles muy activos:

1. **AtarraIA:** Semillero de Ciencias de la Computación enfocado en Inteligencia Artificial.
2. **UNAlgoritmo:** Programación competitiva y maratones algorítmicas (ICPC).
3. **Aperture:** Ciencia de datos y machine learning colaborativo.
4. **Turing Box:** Cultura tecnológica, desarrollo de proyectos y comunidad.
5. **UNeural:** Redes neuronales y neurocomputación.

Puedes conocer más de ellos y sus redes en la sección [Grupos y Semilleros](index.html#grupos).`,
        chips: ['Semillero AtarraIA', 'UNAlgoritmo', 'Aperture'],
      };
    }

    // ------------------------------------------------------------------------
    // 13. P.A.P.A., Citas SIA, Prelación DNINFOA y Bolsa de Créditos
    // ------------------------------------------------------------------------
    if (/citas|cita sia|prelacion|dninfoa|ipa|pappi/.test(preguntaNorm)) {
      return {
        texto: `**¿Cómo se asignan las Citas de Inscripción del SIA?**

La DNINFOA ya no usa el PAPPI para dar citas. Ahora rigen los **4 Grupos de Prelación**:

1. **Grupo 1:** Estudiantes con reconocimientos y distinciones académicas.
2. **Grupo 2:** Estudiantes en permanencia regular ordenados por el **Índice IPA** (que combina tu P.A.P.A. histórico con tu ritmo de créditos aprobados).
3. **Grupo 3:** Estudiantes con bajo avance o periodos suspendidos.
4. **Grupo 4:** Casos especiales y reservas de cupo.

💡 Para consultar tu cita o inscribir materias cuando abra tu turno, ingresa al [Portal SIA](${ENLACES_OFICIALES.sia}).`,
        chips: ['¿Qué es el P.A.P.A.?', 'Bolsa de créditos', 'Calendario académico'],
      };
    }

    if (/papa|promedio acumulado|permanencia/.test(preguntaNorm)) {
      return {
        texto: `El **P.A.P.A. (Promedio Académico Ponderado Acumulado)** es el promedio ponderado de todas las asignaturas que has cursado en la universidad (tanto aprobadas como reprobadas), ponderadas por el número de créditos de cada una.

- Es el promedio que rige tu permanencia (debes mantenerlo en 3.0 o más para no perder el cupo).
- Es el que se toma en cuenta para estímulos de matrícula de honor, dobles titulaciones y admisiones automáticas a posgrados.
- Puedes calcular y simular tu P.A.P.A. en nuestra herramienta [Mi Avance](avance.html).`,
        chips: ['Ir a Mi Avance', 'Citas de inscripción SIA', 'Bolsa de créditos'],
      };
    }

    if (/bolsa|cupo de creditos|creditos disponibles/.test(preguntaNorm)) {
      return {
        texto: `**La Bolsa de Créditos en la UNAL:**

Al ingresar a la carrera recibes un cupo de créditos para cursar tu plan:
- Si apruebas una materia: se consumen sus créditos correspondientes.
- Si cancelas en **Semana 3** (sin pérdida): los créditos se te reintegran inmediatamente a tu bolsa.
- Si cancelas en **Semana 8** o repruebas: los créditos se descuentan de tu bolsa disponible.
- Si se te acaban los créditos antes de graduarte, debes solicitar créditos adicionales ante el Consejo de Facultad en el [Portal SGS](${ENLACES_OFICIALES.sgsMinas}).`,
        chips: ['Fechas de cancelación', 'Ir a Mi Avance', 'Portal SGS Minas'],
      };
    }

    // ------------------------------------------------------------------------
    // 14. Dónde está cada cosa en la página / Tour de la web
    // ------------------------------------------------------------------------
    if (/donde esta|donde veo|donde encuentro|como funciona la pagina|como funciona la web|tour|secciones|ir a mi avance/.test(preguntaNorm)) {
      return {
        texto: `Te enseño qué encuentras en cada rincón del portal:

- **[Inicio](index.html):** Información general del programa, decanatura, perfil del egresado y los grupos estudiantiles y semilleros.
- **[Malla Curricular](malla.html):** Malla interactiva de 10 semestres. Al hacer clic en una materia ves sus prerrequisitos en semáforo, el enlace a su WhatsApp de estudio y el botón para entrar a la **Unidad Compartida de Drive**.
- **[Mi Avance](avance.html):** Subes o pegas tu historia académica del SIA. Te calcula tu P.A.P.A. real, créditos pendientes por tipología, desbloquea logros, tu carnet digital oficial y tu arquetipo geek.
- **[Info y Guías](info.html):** Fechas del calendario académico oficial, explicación de los 4 grupos de prelación DNINFOA para citas SIA, bolsa de créditos y trámites de solicitudes SGS.
- **[Convenios](convenios.html):** Guías para reclamar Kiro AWS, Coursera, GitHub Pack, JetBrains, Microsoft 365 y apoyos de Bienestar.
- **[Intercampus](intercampus.html):** Rutas y horarios de los buses gratuitos entre Robledo, Volador y Río.`,
        chips: ['Ver Malla Curricular', 'Ir a Mi Avance', 'Ver todos los convenios', 'Calendario académico'],
      };
    }

    // ------------------------------------------------------------------------
    // 15. Rutas de Bus Intercampus
    // ------------------------------------------------------------------------
    if (/\b(bus|buses|intercampus|transporte|horario bus|robledo|volador)\b|campus del rio|sede del rio|\bel rio\b/.test(preguntaNorm)) {
      return {
        texto: `**Transporte Intercampus UNAL Medellín (100 % Gratuito):**

1. **Ruta Robledo ⇄ Volador:**
   - Sale de la Facultad de Minas (Bloque M3) y llega al Bloque 41 / Portería Coca-Cola en Volador.
   - Opera de lunes a viernes entre las 6:00 a. m. y las 9:00 p. m.
2. **Ruta Río ⇄ Volador:**
   - Conecta la Sede del Río con Campus Volador.
3. **Metro de Medellín:**
   - Cuenta con paradas intermedias de conexión rápida a las estaciones Floresta y Suramericana.

💡 Para subirte solo debes mostrar tu **carnet estudiantil físico o digital**. Puedes revisar paradas y detalles en [Intercampus](intercampus.html).`,
        chips: ['Ver sección Intercampus', 'Calendario académico', 'Semilleros y grupos'],
      };
    }

    // ------------------------------------------------------------------------
    // 16. Trámites administrativos y Solicitudes GAE
    // ------------------------------------------------------------------------
    if (/tramite|tramites|solicitud|solicitudes|gae|sgs|reingreso|traslado|reserva de cupo|doble titulacion/.test(preguntaNorm)) {
      return {
        texto: `Las solicitudes académicas en la Facultad de Minas se radican a través del **Sistema de Gestión de Solicitudes (SGS)** ante la Gestión de Asuntos Estudiantiles (GAE).

Para conocer los requisitos, soportes necesarios y radicar tu caso, entra al portal oficial:
👉 [Portal de Solicitudes Estudiantiles de Minas (SGS)](${ENLACES_OFICIALES.sgsMinas})

Si se trata de un caso complejo o necesitas asesoría antes de radicar, Santiago (el Repre de Sistemas) te puede orientar personalmente:
- WhatsApp: [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre})`,
        chips: ['Calendario académico', '¿Qué es el P.A.P.A.?', 'Bolsa de créditos'],
      };
    }

    // ------------------------------------------------------------------------
    // 17. Horas de corresponsabilidad
    // ------------------------------------------------------------------------
    if (/corresponsabilidad|horas de corresponsabilidad|horas bienestar/.test(preguntaNorm)) {
      return {
        texto: `Las **Horas de Corresponsabilidad** son un compromiso formativo y solidario obligatorio para estudiantes beneficiarios de apoyos de Bienestar Universitario (alimentario, económico, residencias).

- Son mínimo **16 horas semestrales**.
- Se pueden pagar apoyando en Bibliotecas (Efe Gómez o Minas), salas de cómputo (bloques M3 y M8), eventos de bienestar o actividades de la facultad.
- Las plazas se publican al inicio de cada periodo por correo o en Bienestar Minas (Bloque M4).`,
        chips: ['Auxilios de Bienestar', 'Calendario académico'],
      };
    }

    // ------------------------------------------------------------------------
    // 18. Profesores / Horarios / Salones en tiempo real
    // ------------------------------------------------------------------------
    if (preguntaNorm.includes('profesor') || preguntaNorm.includes('docente') || preguntaNorm.includes('horario de clase') || preguntaNorm.includes('cupo') || preguntaNorm.includes('salon')) {
      return {
        texto: `Para consultar horarios específicos de clases, profesores asignados, aulas o cupos disponibles en tiempo real, debes revisar directamente en el buscador de la universidad:

👉 [Buscador de Cursos del SIA](${ENLACES_OFICIALES.sia})

Si necesitas material de estudio de la materia o parciales anteriores, los encuentras en nuestra [Unidad Compartida de Drive](${ENLACES_OFICIALES.driveSistemas}).`,
        chips: ['Drive de material de estudio', 'Ver Malla Curricular', 'Prerrequisitos de materias'],
      };
    }

    // ------------------------------------------------------------------------
    // 19. Búsqueda en FAQs
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
          texto: `**${mejorFaq.pregunta}**

${mejorFaq.respuesta}`,
          chips: ['Citas de inscripción SIA', 'Bolsa de créditos', 'Calendario académico'],
        };
      }
    }

    // ------------------------------------------------------------------------
    // 20. Fallback final
    // ------------------------------------------------------------------------
    return {
      texto: `No tengo el dato exacto de esa consulta en la base del portal, pero no te quedes con la duda:

- Si es sobre trámites o solicitudes de la Facultad, revísalo en el [Portal SGS de Minas](${ENLACES_OFICIALES.sgsMinas}).
- Si es sobre cupos o profesores específicos, consulta en el [Buscador del SIA](${ENLACES_OFICIALES.sia}).
- Para cualquier otra duda personal o académica, escríbele con toda confianza a Santiago (Representante Estudiantil de Sistemas):
  👉 WhatsApp: [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre}) · Correo: \`${ENLACES_OFICIALES.correoRepre}\``,
      chips: ['Drive de material de estudio', 'Prerrequisitos de materias', 'Fechas de cancelación', 'Convenio Kiro (AWS)'],
    };
  }

  /* ==========================================================================
     6. AVATAR HOLOGRÁFICO DE CORTANA (HALO REIMAGINADO)
     ========================================================================== */

  function renderizarAvatarCortana() {
    return `<svg class="sofia-cortana-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <!-- Gradiente holográfico Cortana: Cian a Violeta Neón -->
        <linearGradient id="holoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f6ff" />
          <stop offset="45%" stop-color="#0088ff" />
          <stop offset="100%" stop-color="#b026ff" />
        </linearGradient>
        <linearGradient id="holoFace" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="60%" stop-color="#a6e3e9" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#71c4ef" stop-opacity="0.65" />
        </linearGradient>
        <radialGradient id="holoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00f6ff" stop-opacity="0.4" />
          <stop offset="70%" stop-color="#7928ca" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Aura holográfica de fondo -->
      <circle cx="50" cy="50" r="48" fill="url(#holoGlow)" />

      <!-- Anillo exterior con segmentos de interfaz digital -->
      <circle cx="50" cy="50" r="46" stroke="url(#holoGradient)" stroke-width="1.8" stroke-dasharray="8 4 14 3 6 4" opacity="0.85" />
      <circle cx="50" cy="50" r="41" stroke="#00f6ff" stroke-width="0.8" stroke-dasharray="2 6" opacity="0.6" />

      <!-- Líneas de datos / Escaneo holográfico -->
      <path d="M15 50 H24 M76 50 H85 M50 15 V24 M50 76 V85" stroke="#00f6ff" stroke-width="1.2" opacity="0.6" />
      <circle cx="50" cy="12" r="1.5" fill="#00f6ff" />
      <circle cx="88" cy="50" r="1.5" fill="#b026ff" />

      <!-- Silueta holográfica estilizada de Cortana (cabello y perfil digital) -->
      <!-- Pelo corto angular icónico de Cortana -->
      <path d="M30 46 C28 32 38 23 50 23 C62 23 72 32 70 46 C69 49 68 53 66 56 C64 47 62 39 52 38 C42 39 36 47 34 56 C32 53 31 49 30 46 Z" fill="url(#holoGradient)" opacity="0.95" />
      
      <!-- Rostro elegante holográfico -->
      <path d="M36 46 C36 40 42 36 50 36 C58 36 64 40 64 46 C64 55 58 65 50 69 C42 65 36 55 36 46 Z" fill="url(#holoFace)" />
      
      <!-- Cuello y hombros digitales -->
      <path d="M44 67 L42 77 L31 82 C43 85 57 85 69 82 L58 77 L56 67 Z" fill="url(#holoGradient)" opacity="0.8" />

      <!-- Ojos / Visor de IA brillante -->
      <ellipse cx="44" cy="48" rx="2.5" ry="1.2" fill="#003366" />
      <ellipse cx="56" cy="48" rx="2.5" ry="1.2" fill="#003366" />
      <circle cx="44.8" cy="47.6" r="0.8" fill="#00f6ff" />
      <circle cx="56.8" cy="47.6" r="0.8" fill="#00f6ff" />

      <!-- Líneas de circuito neuronal en el rostro de Cortana -->
      <path d="M50 38 V44 M47 54 H53 M50 58 V62" stroke="#0088ff" stroke-width="1" stroke-linecap="round" opacity="0.75" />
      <path d="M38 52 L42 55 M62 52 L58 55" stroke="#7928ca" stroke-width="0.9" opacity="0.7" />

      <!-- Nodo de activación en la frente (chispa de IA) -->
      <circle cx="50" cy="33" r="1.6" fill="#ffffff" />
      <circle cx="50" cy="33" r="3.2" stroke="#00f6ff" stroke-width="0.8" opacity="0.9" />
    </svg>`;
  }

  /* ==========================================================================
     7. INTERFAZ GRÁFICA
     ========================================================================== */

  function crearElementosDOM() {
    if (document.getElementById('sofia-contenedor-global')) return;

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
      <div class="sofia-flotante-wrap" id="sofia-flotante-wrap">
        <div class="sofia-globo-bienvenida" id="sofia-globo" role="tooltip" aria-label="Aviso de sofIA">
          <span class="sofia-globo-texto">👋 ¿Dudas con materias o fechas? <strong>Pregúntale a sofIA</strong></span>
          <button class="sofia-globo-cerrar" id="sofia-globo-cerrar" type="button" aria-label="Cerrar sugerencia">✕</button>
        </div>

        <button class="sofia-boton" id="sofia-btn-toggle" type="button" aria-label="Abrir asistente virtual sofIA" aria-haspopup="dialog" aria-expanded="false">
          <span class="sofia-boton__icono">
            ${renderizarAvatarCortana()}
          </span>
          <span class="sofia-boton__badge" title="sofIA en línea"></span>
        </button>
      </div>

      <aside class="sofia-ventana" id="sofia-ventana" role="dialog" aria-label="Ventana de conversación con sofIA" aria-modal="true" hidden>
        <header class="sofia-cabecera">
          <div class="sofia-cabecera__info">
            <div class="sofia-cabecera__avatar" aria-hidden="true">
              ${renderizarAvatarCortana()}
            </div>
            <div class="sofia-cabecera__titulos">
              <div class="sofia-cabecera__nombre-wrap">
                <span class="sofia-cabecera__nombre">sofIA</span>
                <span class="sofia-tag-ia">UNAL</span>
              </div>
              <span class="sofia-cabecera__subtitulo">
                <span class="sofia-punto-verde" aria-hidden="true"></span>
                En línea · Asistente de Sistemas
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

        <div class="sofia-mensajes" id="sofia-mensajes" tabindex="0" aria-live="polite"></div>

        <footer class="sofia-pie">
          <form class="sofia-formulario" id="sofia-form">
            <input
              type="text"
              class="sofia-input"
              id="sofia-input"
              placeholder="Pregúntale a sofIA sobre materias, fechas, WhatsApps..."
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
          <p class="sofia-aviso-privacidad">sofIA consulta la base oficial del portal de Sistemas UNAL.</p>
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
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="sofia-code">$1</code>')
      .replace(/^### (.*$)/gim, '<div class="sofia-tarjeta-dato__titulo">$1</div>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^\s*• (.*$)/gim, '<li>$1</li>')
      .replace(/^\s*- (.*$)/gim, '<li>$1</li>')
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
            ${chips.map((chip) => `<button type="button" class="sofia-chip" data-consulta="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`).join('')}
          </div>
        </div>`;
    }

    if (emisor === 'bot') {
      fila.innerHTML = `
        <div class="sofia-fila__avatar" aria-hidden="true">
          ${renderizarAvatarCortana()}
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
      <div class="sofia-fila__avatar" aria-hidden="true">${renderizarAvatarCortana()}</div>
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
     8. HISTORIAL Y SESIÓN
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

    const chipsIniciales = [
      'Drive de material de estudio',
      'Prerrequisitos de materias',
      'Fechas de cancelación',
      'Cuándo finalizan las clases',
      'Convenio Kiro (AWS)',
      'Auxilios de Bienestar',
      'WhatsApp de una materia',
    ];
    agregarMensajeAlDOM(
      'bot',
      `¡Hola! Soy **sofIA**, tu asistente holográfica de Ingeniería de Sistemas e Informática de la UNAL Medellín.

Estoy conectada a toda la información del portal: malla, fechas del calendario, Unidad de Drive con parciales y talleres, grupos de WhatsApp de estudio, convenios y trámites. ¿En qué te doy una mano?`,
      chipsIniciales,
      false
    );
  }

  /* ==========================================================================
     9. CONTROL Y EVENTOS
     ========================================================================== */

  function abrirSofia() {
    const ventana = document.getElementById('sofia-ventana');
    const btn = document.getElementById('sofia-btn-toggle');
    const globo = document.getElementById('sofia-globo');
    if (!ventana || !btn) return;

    inicializarBaseConocimiento();

    ventana.hidden = false;
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

    agregarMensajeAlDOM('usuario', consultaLimpia);

    const input = document.getElementById('sofia-input');
    if (input) input.value = '';

    mostrarIndicadorEscribiendo();

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

    contenedorMensajes?.addEventListener('click', (e) => {
      const chip = e.target.closest('.sofia-chip');
      if (chip) {
        const consulta = chip.getAttribute('data-consulta');
        if (consulta) procesarConsultaUsuario(consulta);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && estadoSofia.abierto) {
        cerrarSofia();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', crearElementosDOM);
  } else {
    crearElementosDOM();
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => inicializarBaseConocimiento(), { timeout: 3000 });
  } else {
    setTimeout(inicializarBaseConocimiento, 1500);
  }

  window.sofIA = {
    abrir: abrirSofia,
    cerrar: cerrarSofia,
    preguntar: procesarConsultaUsuario,
    responder: responderPregunta,
    inicializar: inicializarBaseConocimiento,
  };
})();
