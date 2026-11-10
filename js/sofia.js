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
   - Grupos de WhatsApp oficiales de estudio por materia
   - Unidad Compartida de Google Drive (material de estudio, parciales, talleres)
   - Fechas y calendario académico oficial (adiciones, cancelaciones, notas)
   - Rutas y horarios de transporte intercampus (Robledo, Volador, Río)
   - Convenios tecnológicos y de bienestar (Kiro AWS, Coursera, GitHub, JetBrains, auxilios UNAL)
   - Grupos estudiantiles y semilleros (AtarraIA, UNAlgoritmo, Aperture, Turing Box, UNeural)
   - Guías normativas: P.A.P.A., Prelación DNINFOA / Citas SIA, Bolsa de Créditos
   - Redirecciones asistidas a SGS Minas, SIA y contacto directo con la Representación.
   Tono: Amiga de la juventud, cercana, clara, empática y sin excesos de emojis. */

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
     3. UTILIDADES DE TEXTO
     ========================================================================== */

  function normalizar(texto) {
    if (!texto) return '';
    return texto
      .toString()
      .toLowerCase()
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
      console.warn('sofIA: no se pudo cargar toda la base local', error);
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
      [['ing economica', 'ingenieria economica', 'economica'], 'Ingeniería Económica'],
      [['trabajo de grado', 'tesis', 'grado', 'pasantia', 'practica'], 'Trabajo de Grado'],
      [['teoria de computacion', 'automatas'], 'Teoría de la Computación'],
    ];

    ALIAS_MATERIAS.forEach(([aliases, nombreReal]) => {
      const match = datos.asignaturas.find((a) => normalizar(a.nombre) === normalizar(nombreReal));
      if (match) {
        aliases.forEach((alias) => indices.aliasMaterias.set(normalizar(alias), match));
      }
    });

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

    datos.convenios.forEach((c) => indices.conveniosPorId.set(normalizar(c.id || c.nombre), c));
    datos.grupos.forEach((g) => indices.gruposPorNombre.set(normalizar(g.nombre), g));
  }

  /* ==========================================================================
     5. MOTOR DE INTENCIONES Y BÚSQUEDA
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
    // A. Saludo y presentación
    // ------------------------------------------------------------------------
    if (/^(hola|buenos dias|buenas tardes|buenas noches|hey|que tal|buenas|holi|hola sofia)\b/.test(preguntaNorm) && preguntaNorm.split(' ').length <= 4) {
      return {
        texto: `¡Hola! Qué gusto saludarte. Soy sofIA, tu compañera virtual de la carrera.

Pregúntame con confianza lo que necesites sobre materias, prerrequisitos, grupos de WhatsApp de estudio, fechas clave del calendario, la Unidad Compartida de Drive, convenios o trámites de la Facultad. ¿En qué te doy una mano hoy?`,
        chips: ['Prerrequisitos de materias', 'Drive de material de estudio', 'Fechas de cancelación', 'Convenios estudiantiles'],
      };
    }

    if (/quien eres|quien te creo|que eres|como te llamas|presentate/.test(preguntaNorm)) {
      return {
        texto: `Soy sofIA, asistente virtual estudiantil de Ingeniería de Sistemas e Informática de la UNAL Medellín.

Fui creada por Santiago Escobar Arias (nuestro Representante Estudiantil) para ayudarte a navegar la carrera sin rodeos: consulto en segundos los datos oficiales de la malla, fechas del calendario, convenios, rutas de transporte y normativas académicas.`,
        chips: ['Ver malla curricular', 'Unidad de Drive de estudio', 'Calendario académico'],
      };
    }

    if (/gracias|muchas gracias|genial|excelente|bacano|super|te quiero|vale gracias/.test(preguntaNorm) && preguntaNorm.split(' ').length <= 4) {
      return {
        texto: `¡De nada! Recuerda que aquí estoy para cualquier duda que tengas con el semestre. ¡Mucho ánimo en las materias!`,
        chips: ['Prerrequisitos de materias', 'Calendario académico', 'Material de estudio'],
      };
    }

    // ------------------------------------------------------------------------
    // B. Grupos de WhatsApp de materias (distinto a semilleros)
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
            chips: [`Prerrequisitos de ${materiaWpp.nombre}`, 'Ver malla curricular', 'Drive de material de estudio'],
          };
        } else {
          return {
            texto: `Actualmente **${materiaWpp.nombre}** (\`${materiaWpp.codigo}\`) no tiene un enlace de WhatsApp registrado en la web.

Si tú o tus compañeros tienen el grupo de este semestre, escríbele a Santiago para que lo añadamos al portal:
- WhatsApp del repre: [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre})`,
            chips: [`Prerrequisitos de ${materiaWpp.nombre}`, 'Ver malla curricular', 'Drive de material de estudio'],
          };
        }
      }

      // Pregunta general sobre grupos de WhatsApp de materias
      return {
        texto: `Los grupos de WhatsApp de estudio están organizados por materia dentro de nuestra [Malla Curricular](malla.html). 

Al hacer clic sobre cualquier asignatura que tenga el ícono de WhatsApp podrás unirte directamente a su comunidad. Si buscas una materia en específico, solo dime por ejemplo: *"pásame el wpp de Simulación"* o *"grupo de Cálculo Diferencial"*.`,
        chips: ['WhatsApp de Simulación', 'WhatsApp de POO', 'WhatsApp de Cálculo Diferencial', 'Ver malla curricular'],
      };
    }

    // ------------------------------------------------------------------------
    // C. Banco de Recursos / Drive / Parciales anteriores / Material de estudio
    // ------------------------------------------------------------------------
    if (/drive|material de estudio|materiales|parciales|parciales viejos|parciales anteriores|talleres|apuntes|guias|banco de recursos|unidad compartida/.test(preguntaNorm)) {
      return {
        texto: `Todo el banco de material de estudio de la carrera está centralizado en la **Unidad Compartida de Google Drive de Sistemas**:

📁 **[Abrir la Unidad Compartida de Sistemas en Google Drive](${ENLACES_OFICIALES.driveSistemas})**

Allí encuentras carpetas por materia con:
- Parciales y quices de semestres anteriores
- Talleres resueltos y guías de laboratorio
- Libros guía, diapositivas y apuntes comunitarios

Si al ingresar con tu correo \`@unal.edu.co\` no tienes permisos de acceso todavía, pide tu alta en este formulario:
👉 [Formulario para solicitar acceso al Drive](${ENLACES_OFICIALES.solicitudAccesoDrive})`,
        chips: ['Ver malla curricular', 'Grupos de WhatsApp', 'Fechas del calendario'],
      };
    }

    // ------------------------------------------------------------------------
    // D. Cancelación de materias o cancelación de semestre (con empatía y contacto repre)
    // ------------------------------------------------------------------------
    const esCancelacionSemestre = /cancelar semestre|cancelacion de semestre|cancelar el periodo|cancelacion de periodo|retirar semestre/.test(preguntaNorm);
    const esCancelacionMaterias = /cancelar materia|cancelar materias|cancelacion de asignatura|cancelacion de asignaturas|hasta cuando puedo cancelar/.test(preguntaNorm);

    if (esCancelacionSemestre || esCancelacionMaterias) {
      const fechas = indices.fechasCalendario;
      const cancelSin = fechas.find((f) => /sin descuento/.test(normalizar(f.actividad)));
      const cancelCon = fechas.find((f) => /con descuento/.test(normalizar(f.actividad)));
      const finClases = fechas.find((f) => /finalizacion de clases/.test(normalizar(f.actividad)));

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
    // E. Materias de último semestre / Décimo semestre
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
    // F. Prerrequisitos y materias específicas
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
        chips: chipsPre.length > 0 ? chipsPre : ['Ver en la malla interactiva', 'Drive de material de estudio'],
      };
    }

    // ------------------------------------------------------------------------
    // G. Materias por semestre (ej: materias de 1er semestre, 4 semestre)
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
    // H. Auxilios de Bienestar Universitario
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
    // I. Convenios según necesidad ("convenio para X")
    // ------------------------------------------------------------------------
    const esConvenio = /convenio|convenios|beneficio|beneficios/.test(preguntaNorm);

    if (esConvenio || /kiro|aws|coursera|github|copilot|jetbrains|pycharm|intellij|office|microsoft|matlab|autodesk|revit|autocad|spotify|sapiencia|icetex/.test(preguntaNorm)) {
      // 1. Kiro (AWS)
      if (preguntaNorm.includes('kiro') || preguntaNorm.includes('programar con ia') || preguntaNorm.includes('ia para programar')) {
        return {
          texto: `**Convenio Kiro (AWS) · Programación con IA:**
- **Beneficio:** 1.000 créditos mensuales gratis durante 1 año.
- **¿Qué hace?** Es un entorno de IA desarrollado sobre Amazon Web Services que convierte ideas y especificaciones en código real ejecutable para tus proyectos y materias.
- **¿Cómo activarlo?** Entra a [dned.unal.edu.co](https://dned.unal.edu.co) con tu cuenta de correo institucional de la UNAL.`,
          chips: ['GitHub Student Pack', 'Coursera UNAL', 'Ver todos los convenios'],
        };
      }

      // 2. Cursos / Certificaciones gratis
      if (preguntaNorm.includes('coursera') || preguntaNorm.includes('curso') || preguntaNorm.includes('certificacion') || preguntaNorm.includes('diplomado')) {
        return {
          texto: `**Coursera for Campus UNAL:**
- **Beneficio:** Cursos y certificaciones profesionales gratis con universidades internacionales (Google, IBM, Stanford, Michigan, etc.).
- **¿Cómo activarlo?** Inicia sesión en [coursera.org](https://www.coursera.org/) seleccionando "Iniciar sesión con la organización" usando tu correo \`@unal.edu.co\`.`,
          chips: ['Convenio Kiro (AWS)', 'GitHub Student Pack', 'Ver convenios'],
        };
      }

      // 3. GitHub / Copilot
      if (preguntaNorm.includes('github') || preguntaNorm.includes('copilot') || preguntaNorm.includes('autocompletar')) {
        return {
          texto: `**GitHub Student Developer Pack:**
- **Beneficio:** GitHub Copilot gratis, cuenta GitHub Pro sin costo, dominios gratuitos por un año (.me), créditos en la nube (Azure, DigitalOcean) y herramientas de desarrollo.
- **¿Cómo activarlo?** Postúlate en [education.github.com/pack](https://education.github.com/pack) subiendo tu carnet o certificado de matrícula.`,
          chips: ['JetBrains Student Pack', 'Convenio Kiro (AWS)', 'Ver convenios'],
        };
      }

      // 4. JetBrains / IDEs
      if (preguntaNorm.includes('jetbrains') || preguntaNorm.includes('intellij') || preguntaNorm.includes('pycharm') || preguntaNorm.includes('webstorm') || preguntaNorm.includes('ide')) {
        return {
          texto: `**JetBrains Student Pack:**
- **Beneficio:** Licencias educativas profesionales para IntelliJ IDEA Ultimate, PyCharm Professional, WebStorm, CLion, DataGrip, etc.
- **¿Cómo activarlo?** Regístrate en [jetbrains.com/community/education](https://www.jetbrains.com/community/education/) con tu correo \`@unal.edu.co\`.`,
          chips: ['GitHub Student Pack', 'Microsoft 365', 'Ver convenios'],
        };
      }

      // 5. Office / Word / Excel / Almacenamiento
      if (preguntaNorm.includes('office') || preguntaNorm.includes('microsoft') || preguntaNorm.includes('word') || preguntaNorm.includes('excel') || preguntaNorm.includes('onedrive') || preguntaNorm.includes('almacenamiento')) {
        return {
          texto: `**Microsoft 365 Educación:**
- **Beneficio:** Suite completa de Office (Word, Excel, PowerPoint, Teams) para descargar en hasta 5 dispositivos y 1 TB de almacenamiento en la nube en OneDrive.
- **¿Cómo activarlo?** Inicia sesión en [portal.office.com](https://portal.office.com) con tu usuario y contraseña del correo UNAL.`,
          chips: ['MATLAB y Simulink', 'Coursera UNAL', 'Ver convenios'],
        };
      }

      // 6. MATLAB / Simulink
      if (preguntaNorm.includes('matlab') || preguntaNorm.includes('simulink') || preguntaNorm.includes('calculo numerico')) {
        return {
          texto: `**MATLAB y Simulink (Campus-Wide License):**
- **Beneficio:** Acceso ilimitado a todas las toolboxes de MATLAB, Simulink y cursos de MATLAB Academy.
- **¿Cómo activarlo?** Entra al portal de MathWorks UNAL y crea tu cuenta con tu correo institucional.`,
          chips: ['Convenios de Sistemas', 'Autodesk UNAL'],
        };
      }

      // 7. Autodesk / CAD / 3D
      if (preguntaNorm.includes('autodesk') || preguntaNorm.includes('autocad') || preguntaNorm.includes('revit') || preguntaNorm.includes('cad') || preguntaNorm.includes('3d')) {
        return {
          texto: `**Autodesk Education:**
- **Beneficio:** Licencias educativas de 1 año renovables para AutoCAD, Revit, 3ds Max, Maya e Inventor.
- **¿Cómo activarlo?** Regístrate en [autodesk.com/education](https://www.autodesk.com/education/) verificando tu calidad de estudiante.`,
          chips: ['Ver convenios de software'],
        };
      }

      // 8. Música / Spotify
      if (preguntaNorm.includes('spotify') || preguntaNorm.includes('musica')) {
        return {
          texto: `**Spotify Premium Estudiantes:**
- **Beneficio:** 50 % de descuento en la suscripción mensual de Spotify Premium verificando tu estatus estudiantil a través de SheerID con tu correo UNAL.`,
          chips: ['Ver todos los convenios'],
        };
      }

      // Resumen general de convenios
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
    // J. Semilleros y Grupos de Investigación
    // ------------------------------------------------------------------------
    if (esConsultaSemillero) {
      if (preguntaNorm.includes('atarraia')) {
        return {
          texto: `**AtarraIA · Semillero de Ciencias de la Computación:**
Es un semillero de investigación enfocado en inteligencia artificial, modelos de aprendizaje automático y soluciones colaborativas en la Facultad de Minas.

- WhatsApp oficial de AtarraIA: [Unirme al grupo de WhatsApp](https://chat.whatsapp.com/Dd8RnPsMGdg22x3H3s6vIa?mode=ems_copy_t)`,
          chips: ['Ver otros semilleros', 'UNAlgoritmo', 'Aperture'],
        };
      }

      if (preguntaNorm.includes('unalgoritmo')) {
        return {
          texto: `**UNAlgoritmo · Programación Competitiva:**
Grupo estudiantil dedicado a estructuras de datos, algoritmia y preparación para competencias de programación (ICPC, Maratón Nacional, MFP). Entrenan semanalmente en resolución de problemas en equipo.`,
          chips: ['AtarraIA', 'Aperture', 'Turing Box'],
        };
      }

      if (preguntaNorm.includes('aperture')) {
        return {
          texto: `**Aperture Systems Lab:**
Semillero de investigación estudiantil enfocado en ciencia de datos, machine learning e inteligencia artificial aplicada con proyectos prácticos.`,
          chips: ['AtarraIA', 'UNAlgoritmo', 'UNeural'],
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
    // K. Dónde está cada cosa en la página / Cómo funciona la web
    // ------------------------------------------------------------------------
    if (/donde esta|donde veo|donde encuentro|como funciona la pagina|como funciona la web|tour|secciones/.test(preguntaNorm)) {
      return {
        texto: `Te enseño qué encuentras en cada rincón del portal:

- **[Inicio](index.html):** Información general del programa, decanatura, perfil del egresado y los grupos estudiantiles y semilleros.
- **[Malla Curricular](malla.html):** Malla interactiva de 10 semestres. Al hacer clic en una materia ves sus prerrequisitos en semáforo, el enlace a su WhatsApp de estudio y el botón para entrar a la **Unidad Compartida de Drive**.
- **[Mi Avance](avance.html):** Subes o pegas tu historia académica del SIA. Te calcula tu P.A.P.A. real, créditos pendientes por tipología, desbloquea logros, tu carnet digital oficial y tu arquetipo geek.
- **[Info y Guías](info.html):** Fechas del calendario académico oficial, explicación de los 4 grupos de prelación DNINFOA para citas SIA, bolsa de créditos y trámites de solicitudes SGS.
- **[Convenios](convenios.html):** Guías para reclamar Kiro AWS, Coursera, GitHub Pack, JetBrains, Microsoft 365 y apoyos de Bienestar.
- **[Intercampus](intercampus.html):** Rutas y horarios de los buses gratuitos entre Robledo, Volador y Río.`,
        chips: ['Ver Malla Curricular', 'Ir a Mi Avance', 'Ver Convenios', 'Ver Calendario'],
      };
    }

    // ------------------------------------------------------------------------
    // L. Citas SIA, Prelación DNINFOA y P.A.P.A.
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
        chips: ['¿Qué es el P.A.P.A.?', 'Bolsa de créditos', 'Fechas del calendario'],
      };
    }

    if (/que es el papa|como se calcula el papa|promedio acumulado/.test(preguntaNorm)) {
      return {
        texto: `El **P.A.P.A. (Promedio Académico Ponderado Acumulado)** es el promedio ponderado de todas las asignaturas que has cursado en la universidad (tanto aprobadas como reprobadas), ponderadas por el número de créditos de cada una.

- Es el promedio que rige tu permanencia (debes mantenerlo en 3.0 o más para no perder el cupo).
- Es el que se toma en cuenta para estímulos de matrícula de honor, dobles titulaciones y admisiones automáticas a posgrados.
- Puedes calcular y simular tu P.A.P.A. en nuestra herramienta [Mi Avance](avance.html).`,
        chips: ['Ir a Mi Avance', 'Citas SIA', 'Bolsa de créditos'],
      };
    }

    // ------------------------------------------------------------------------
    // M. Rutas de Bus Intercampus
    // ------------------------------------------------------------------------
    if (/bus|buses|intercampus|transporte|horario bus|robledo|volador|rio/.test(preguntaNorm)) {
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
        chips: ['Ver sección Intercampus', 'Fechas del calendario', 'Grupos estudiantiles'],
      };
    }

    // ------------------------------------------------------------------------
    // N. Trámites administrativos y Solicitudes GAE
    // ------------------------------------------------------------------------
    if (/tramite|tramites|solicitud|solicitudes|gae|sgs|reingreso|traslado|reserva de cupo|doble titulacion/.test(preguntaNorm)) {
      return {
        texto: `Las solicitudes académicas en la Facultad de Minas se radican a través del **Sistema de Gestión de Solicitudes (SGS)** ante la Gestión de Asuntos Estudiantiles (GAE).

Para conocer los requisitos, soportes necesarios y radicar tu caso, entra al portal oficial:
👉 [Portal de Solicitudes Estudiantiles de Minas (SGS)](${ENLACES_OFICIALES.sgsMinas})

Si se trata de un caso complejo o necesitas asesoría antes de radicar, Santiago (el Repre de Sistemas) te puede orientar personalmente:
- WhatsApp: [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre})`,
        chips: ['Calendario de solicitudes', 'P.A.P.A. y permanencia', 'Bolsa de créditos'],
      };
    }

    // ------------------------------------------------------------------------
    // O. Horas de corresponsabilidad
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
    // P. Fallback guiado: si es sobre materias -> SIA; si es trámites -> SGS; si no -> Repre
    // ------------------------------------------------------------------------
    if (preguntaNorm.includes('profesor') || preguntaNorm.includes('docente') || preguntaNorm.includes('horario de clase') || preguntaNorm.includes('cupo') || preguntaNorm.includes('salon')) {
      return {
        texto: `Para consultar horarios específicos de clases, profesores asignados, aulas o cupos disponibles en tiempo real, debes revisar directamente en el buscador de la universidad:

👉 [Buscador de Cursos del SIA](${ENLACES_OFICIALES.sia})

Si necesitas material de estudio de la materia o parciales anteriores, los encuentras en nuestra [Unidad Compartida de Drive](${ENLACES_OFICIALES.driveSistemas}).`,
        chips: ['Drive de material de estudio', 'Malla curricular', 'Prerrequisitos de materias'],
      };
    }

    // Búsqueda en FAQs existentes en info.json
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
          chips: ['Citas SIA', 'Bolsa de créditos', 'Ver calendario'],
        };
      }
    }

    // Respuesta final empática redirigiendo a fuentes y al representante
    return {
      texto: `No tengo el dato exacto de esa consulta en la base del portal, pero no te quedes con la duda:

- Si es sobre trámites o solicitudes de la Facultad, revísalo en el [Portal SGS de Minas](${ENLACES_OFICIALES.sgsMinas}).
- Si es sobre cupos o profesores específicos, consulta en el [Buscador del SIA](${ENLACES_OFICIALES.sia}).
- Para cualquier otra duda personal o académica, escríbele con toda confianza a Santiago (Representante Estudiantil de Sistemas):
  👉 WhatsApp: [${ENLACES_OFICIALES.telefonoRepre}](${ENLACES_OFICIALES.wppRepre}) · Correo: \`${ENLACES_OFICIALES.correoRepre}\``,
      chips: ['Drive de material de estudio', 'Prerrequisitos de materias', 'Fechas de cancelación', 'Convenios estudiantiles'],
    };
  }

  /* ==========================================================================
     6. INTERFAZ GRÁFICA
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
            ${renderizarIconoBot()}
          </span>
          <span class="sofia-boton__badge" title="sofIA en línea"></span>
        </button>
      </div>

      <aside class="sofia-ventana" id="sofia-ventana" role="dialog" aria-label="Ventana de conversación con sofIA" aria-modal="true" hidden>
        <header class="sofia-cabecera">
          <div class="sofia-cabecera__info">
            <div class="sofia-cabecera__avatar" aria-hidden="true">
              ${renderizarIconoBot()}
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
     7. HISTORIAL Y SESIÓN
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
      'Convenio Kiro (AWS)',
      'Auxilios de Bienestar',
      'WhatsApp de una materia',
    ];
    agregarMensajeAlDOM(
      'bot',
      `¡Hola! Soy **sofIA**, tu asistente de Ingeniería de Sistemas e Informática de la UNAL Medellín.

Estoy conectada a toda la información del portal: malla, fechas del calendario, Unidad de Drive con parciales y talleres, grupos de WhatsApp de estudio, convenios y trámites. ¿En qué te doy una mano?`,
      chipsIniciales,
      false
    );
  }

  /* ==========================================================================
     8. CONTROL Y EVENTOS
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
  };
})();
