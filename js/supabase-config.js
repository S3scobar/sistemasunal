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

/* =========================================================================
   CONFIGURACIÓN Y CLIENTE DE SUPABASE
   Ingeniería de Sistemas e Informática · UNAL Medellín
   =========================================================================
   INSTRUCCIONES PARA CONECTAR TU BASE DE DATOS DE SUPABASE:
   1. Crea tu proyecto gratuito en https://supabase.com
   2. Configura SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env
   3. Genera la configuración cliente con: node tools/generar-config.js (o npm run build)
   Nunca uses la clave service_role en el navegador.
   ========================================================================= */

const SUPABASE_CONFIG = (() => {
  if (typeof window !== 'undefined' && window.CONFIG_SUPABASE) {
    return {
      url: window.CONFIG_SUPABASE.url || '',
      anonKey: window.CONFIG_SUPABASE.anonKey || ''
    };
  }
  return { url: '', anonKey: '' };
})();

// Verifica si el usuario ya configuró sus credenciales de Supabase
function estaSupabaseConfigurado() {
  return Boolean(
    SUPABASE_CONFIG.url &&
    !SUPABASE_CONFIG.url.includes('TU_PROYECTO') &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.anonKey.includes('TU_SUPABASE_ANON_KEY')
  );
}

// Inicializa el cliente oficial de Supabase si la librería está disponible
let clienteSupabase = null;
if (typeof window !== 'undefined' && window.supabase && estaSupabaseConfigurado()) {
  try {
    clienteSupabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  } catch (err) {
    console.warn('No se pudo inicializar el cliente de Supabase:', err);
  }
}

/* ---------- Servicio de Autenticación y Perfil ---------- */

const CLAVE_SESION_LOCAL = 'sistemasunal.auth.sesion.v1';
const CLAVE_USUARIOS_LOCAL = 'sistemasunal.auth.usuarios.v1';

// Cierre de sesión forzado: al cambiar este valor, TODAS las personas deben iniciar sesión de nuevo
// (se ejecuta una sola vez por navegador). Cámbialo cuando quieras volver a forzar el cierre.
const VERSION_SESION = '2026-11-01-a';
const CLAVE_VERSION_SESION = 'sistemasunal.auth.version';

// Política de tratamiento de datos: si cambia el texto, se sube esta versión y se vuelve a pedir la autorización
const VERSION_POLITICA = '2026-11-09';
const CLAVE_POLITICA_LOCAL = 'sistemasunal.datos.autorizacion:';

const cierreForzado = (async () => {
  try {
    if (localStorage.getItem(CLAVE_VERSION_SESION) === VERSION_SESION) return;
    if (clienteSupabase) await clienteSupabase.auth.signOut({ scope: 'local' });
    localStorage.removeItem(CLAVE_SESION_LOCAL);
    localStorage.setItem(CLAVE_VERSION_SESION, VERSION_SESION);
  } catch (e) {
    console.warn('No se pudo completar el cierre de sesión forzado:', e);
  }
})();

const ServicioAuth = {
  // Obtiene la sesión activa
  async obtenerSesion() {
    await cierreForzado;
    if (clienteSupabase) {
      try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error) throw error;
        if (session && session.user) {
          const correo = String(session.user.email || '').trim().toLowerCase();

          // 1. RESTRICCIÓN ESTRICTA: Solo correo institucional @unal.edu.co
          if (!correo.endsWith('@unal.edu.co')) {
            await clienteSupabase.auth.signOut();
            localStorage.removeItem(CLAVE_SESION_LOCAL);
            localStorage.removeItem('sistemasunal.registro_pendiente');
            return {
              error: 'Acceso denegado: Solo se permite el ingreso con correo institucional @unal.edu.co.',
              noPermitido: true,
            };
          }

          let perfil = await this.obtenerPerfil(session.user.id, correo);

          // 2. Si hay un registro pendiente verificado desde la pestaña Registrarse
          let registroPendiente = null;
          try {
            registroPendiente = JSON.parse(localStorage.getItem('sistemasunal.registro_pendiente') || 'null');
          } catch (_) {}

          if (registroPendiente && registroPendiente.historiaTexto) {
            const nombreFinal = perfil?.nombre || registroPendiente.nombre || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
            await this.guardarPerfil(session.user.id, correo, {
              nombre: nombreFinal,
              historiaTexto: registroPendiente.historiaTexto,
            });
            // La autorización se marcó en el formulario de registro (casilla obligatoria): se deja constancia
            if (registroPendiente.aceptaPolitica) {
              await this.registrarAutorizacion(session.user.id);
            }
            localStorage.removeItem('sistemasunal.registro_pendiente');
            perfil = await this.obtenerPerfil(session.user.id, correo);
          }

          // 3. RESTRICCIÓN ESTRICTA DE SISTEMAS:
          // Si no tiene perfil registrado o no tiene historia académica guardada, NO puede acceder.
          if (!perfil || !perfil.historia_texto) {
            await clienteSupabase.auth.signOut();
            localStorage.removeItem(CLAVE_SESION_LOCAL);
            return {
              error: 'Cuenta no registrada o sin verificar. Por favor ve a la pestaña Registrarse y pega tu historia académica del SIA para verificar que perteneces a Ingeniería de Sistemas e Informática.',
              noRegistrado: true,
            };
          }

          return {
            usuario: {
              id: session.user.id,
              correo,
              nombre: perfil.nombre || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              historiaTexto: perfil.historia_texto,
              ritmo: perfil.ritmo || null,
              aceptoPolitica: this.politicaAceptada(session.user.id, perfil),
            },
            proveedor: 'supabase',
          };
        }
      } catch (e) {
        console.warn('Error consultando sesión en Supabase:', e);
      }
    }

    // Con Supabase configurado, sin sesión real NO se usa el usuario guardado en local: sin token no podría
    // guardar nada en la base (era la causa de logros que no se registraban).
    if (clienteSupabase) {
      localStorage.removeItem(CLAVE_SESION_LOCAL);
      return null;
    }

    // Respaldo / modo local si no hay Supabase configurado
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_SESION_LOCAL));
      return guardado ? { usuario: guardado, proveedor: 'local' } : null;
    } catch {
      return null;
    }
  },

  // Consulta el perfil en la tabla 'perfiles' de Supabase
  // Consulta el perfil en la tabla 'perfiles' de Supabase (por ID o por correo institucional para normalizar existentes)
  async obtenerPerfil(userId, correo) {
    if (!clienteSupabase) return null;
    try {
      // 1. Buscar por ID de usuario
      if (userId) {
        const { data, error } = await clienteSupabase
          .from('perfiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (data) return data;
      }

      // 2. Si no se encuentra por ID, buscar por correo para normalizar cuentas existentes
      if (correo) {
        const emailLimpio = String(correo).trim().toLowerCase();
        const { data: porCorreo, error: errCorreo } = await clienteSupabase
          .from('perfiles')
          .select('*')
          .eq('correo', emailLimpio)
          .maybeSingle();

        if (porCorreo) {
          // Normalizar el ID en Supabase para vincular el registro anterior con la sesión actual de SmartKey
          if (userId && porCorreo.id !== userId) {
            try {
              await clienteSupabase
                .from('perfiles')
                .update({ id: userId, actualizado_en: new Date().toISOString() })
                .eq('correo', emailLimpio);
              porCorreo.id = userId;
            } catch (errActualizar) {
              console.warn('No se pudo actualizar ID en perfiles:', errActualizar);
            }
          }
          return porCorreo;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  // ¿Esta persona ya autorizó la versión vigente de la política de datos?
  // Vale la constancia guardada en la base (perfiles.acepto_datos_version) o, mientras esa columna no exista, la local.
  politicaAceptada(userId, perfil) {
    if (perfil && perfil.acepto_datos_version === VERSION_POLITICA) return true;
    try { return localStorage.getItem(CLAVE_POLITICA_LOCAL + userId) === VERSION_POLITICA; } catch (_) { return false; }
  },

  // Deja constancia de la autorización (versión y fecha). Devuelve true si quedó guardada en la base.
  async registrarAutorizacion(userId) {
    try { localStorage.setItem(CLAVE_POLITICA_LOCAL + userId, VERSION_POLITICA); } catch (_) {}
    if (!clienteSupabase || !userId) return false;
    try {
      const { error } = await clienteSupabase.from('perfiles')
        .update({ acepto_datos_version: VERSION_POLITICA, acepto_datos_en: new Date().toISOString() })
        .eq('id', userId);
      if (error) { console.warn('No se pudo guardar la autorización de datos en la base:', error.message); return false; }
      return true;
    } catch (err) {
      console.warn('No se pudo guardar la autorización de datos:', err);
      return false;
    }
  },

  // Guarda o actualiza el perfil en Supabase
  async guardarPerfil(userId, correo, datos) {
    if (clienteSupabase) {
      try {
        const emailLimpio = String(correo || '').trim().toLowerCase();
        await clienteSupabase.from('perfiles').upsert({
          id: userId,
          correo: emailLimpio,
          nombre: datos.nombre || '',
          historia_texto: datos.historiaTexto || '',
          ritmo: datos.ritmo || null,
          actualizado_en: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('No se pudo sincronizar la tabla perfiles en Supabase:', err);
      }
    }
  },

  // Iniciar sesión o registrarse con SmartKey (Google Workspace UNAL)
  async iniciarConSmartKey() {
    if (!clienteSupabase) {
      throw new Error('El servicio de base de datos no está disponible.');
    }

    const { error } = await clienteSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          hd: 'unal.edu.co',
          prompt: 'select_account',
        },
        redirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (error) throw new Error(error.message);
  },

  // Iniciar sesión con correo UNAL y contraseña
  async iniciarSesion(correo, password) {
    const emailLimpio = String(correo || '').trim().toLowerCase();

    if (!emailLimpio.endsWith('@unal.edu.co')) {
      throw new Error('Solo se permite el ingreso con correo institucional @unal.edu.co.');
    }

    if (clienteSupabase) {
      const { data, error } = await clienteSupabase.auth.signInWithPassword({
        email: emailLimpio,
        password,
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Correo o contraseña incorrectos.');
        }
        throw new Error(error.message);
      }

      const perfil = await this.obtenerPerfil(data.user.id);
      if (!perfil || !perfil.historia_texto) {
        await clienteSupabase.auth.signOut();
        throw new Error('Cuenta no registrada o sin verificar. Ve a la pestaña Registrarse y pega tu historia académica del SIA para verificar tu programa de Sistemas.');
      }
      const usuario = {
        id: data.user.id,
        correo: data.user.email,
        nombre: perfil?.nombre || data.user.user_metadata?.nombre || '',
        historiaTexto: perfil?.historia_texto || data.user.user_metadata?.historia_texto || '',
        ritmo: perfil?.ritmo || data.user.user_metadata?.ritmo || null,
      };

      // Cache local para navegación rápida
      localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuario));
      return usuario;
    }

    // Modo local para pruebas previas a la configuración de Supabase
    const usuarios = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_LOCAL) || '{}');
    const user = usuarios[emailLimpio];
    if (!user || user.password !== password) {
      throw new Error('Correo o contraseña incorrectos (modo local).');
    }

    const usuario = {
      id: user.id,
      correo: user.correo,
      nombre: user.nombre,
      historiaTexto: user.historiaTexto,
      ritmo: user.ritmo,
    };
    localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuario));
    return usuario;
  },

  // Registro con correo UNAL, contraseña y verificación obligatoria de Sistemas
  async registrar(correo, password, historiaTexto) {
    const emailLimpio = String(correo || '').trim().toLowerCase();

    // 1. Verificación de correo UNAL
    if (!emailLimpio.endsWith('@unal.edu.co')) {
      throw new Error('Debes ingresar tu correo institucional de la Universidad Nacional (@unal.edu.co).');
    }

    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    // 2. Verificación estricta de Historia Académica
    if (!historiaTexto || !historiaTexto.trim()) {
      throw new Error('Debes pegar tu historia académica del SIA para verificar que eres estudiante de Ingeniería de Sistemas e Informática.');
    }

    if (typeof leerHistoria !== 'function') {
      throw new Error('No se encontró el lector de historia académica.');
    }

    const historia = leerHistoria(historiaTexto);
    if (!historia.materias.length) {
      throw new Error('No se encontraron materias en el texto pegado. Abre Historia Académica en el SIA, presiona Ctrl + A, Ctrl + C y pega de nuevo.');
    }

    if (!historia.esSistemas) {
      throw new Error('ACCESO DENEGADO: El registro está reservado exclusivamente para estudiantes de Ingeniería de Sistemas e Informática de la UNAL. En tu historia académica no se detectó este programa.');
    }

    const nombre = historia.nombre || '';

    // 3. Registro en Supabase
    if (clienteSupabase) {
      const { data, error } = await clienteSupabase.auth.signUp({
        email: emailLimpio,
        password,
        options: {
          data: {
            nombre,
            historia_texto: historiaTexto,
          },
        },
      });

      if (error) throw new Error(error.message);

      const userId = data.user?.id || 'id-' + Date.now();
      await this.guardarPerfil(userId, emailLimpio, {
        nombre,
        historiaTexto,
      });

      const usuario = {
        id: userId,
        correo: emailLimpio,
        nombre,
        historiaTexto,
      };

      localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuario));
      return { usuario, necesitaConfirmarEmail: data.session === null };
    }

    // 4. Registro en modo local (si aún no ponen credenciales de Supabase)
    const usuarios = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_LOCAL) || '{}');
    if (usuarios[emailLimpio]) {
      throw new Error('Este correo ya se encuentra registrado.');
    }

    const nuevoUsuario = {
      id: 'local-' + Date.now(),
      correo: emailLimpio,
      password,
      nombre,
      historiaTexto,
      ritmo: null,
      creadoEn: new Date().toISOString(),
    };

    usuarios[emailLimpio] = nuevoUsuario;
    localStorage.setItem(CLAVE_USUARIOS_LOCAL, JSON.stringify(usuarios));
    localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(nuevoUsuario));

    return { usuario: nuevoUsuario, necesitaConfirmarEmail: false };
  },

  // Sincronizar actualización de historia académica
  async actualizarHistoria(historiaTexto, ritmo = null, nombreEscrito = null) {
    const sesion = await this.obtenerSesion();
    if (!sesion || !sesion.usuario) return;

    const historia = leerHistoria(historiaTexto);
    // El nombre que la persona escribió manda sobre el que sale del SIA
    const nombre = (nombreEscrito !== null && nombreEscrito !== undefined) ? nombreEscrito : (historia.nombre || sesion.usuario.nombre);

    sesion.usuario.historiaTexto = historiaTexto;
    sesion.usuario.nombre = nombre;
    if (ritmo !== null) sesion.usuario.ritmo = ritmo;

    localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(sesion.usuario));

    if (clienteSupabase && sesion.usuario.id) {
      await this.guardarPerfil(sesion.usuario.id, sesion.usuario.correo, {
        nombre,
        historiaTexto,
        ritmo: sesion.usuario.ritmo,
      });
    } else {
      const usuarios = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_LOCAL) || '{}');
      if (usuarios[sesion.usuario.correo]) {
        usuarios[sesion.usuario.correo].historiaTexto = historiaTexto;
        usuarios[sesion.usuario.correo].nombre = nombre;
        if (ritmo !== null) usuarios[sesion.usuario.correo].ritmo = ritmo;
        localStorage.setItem(CLAVE_USUARIOS_LOCAL, JSON.stringify(usuarios));
      }
    }
  },

  // Obtiene estadísticas agregadas de la comunidad (porcentaje de usuarios que desbloquearon cada logro)
  // Última estadística real conocida (se usa si el servidor no responde, en vez de mostrar valores de referencia)
  estadisticasEnCache() {
    try {
      const c = JSON.parse(localStorage.getItem('sistemasunal.stats.logros.v1') || 'null');
      return c && c.datos ? c.datos : null;
    } catch { return null; }
  },

  async obtenerEstadisticasLogros() {
    const guardar = (datos) => {
      try { localStorage.setItem('sistemasunal.stats.logros.v1', JSON.stringify({ t: Date.now(), datos })); } catch { /* sin almacenamiento */ }
      return datos;
    };
    if (!clienteSupabase) return this.estadisticasEnCache();
    try {
      // Función del servidor: devuelve solo porcentajes agregados, sin filas ni usuarios
      const { data: agregados, error: errRpc } = await clienteSupabase.rpc('estadisticas_logros');
      if (errRpc) {
        console.warn('[estadisticas_logros] la función del servidor falló:', errRpc.message || errRpc);
        return this.estadisticasEnCache();
      }
      if (Array.isArray(agregados) && agregados.length) {
        const porcentajes = {};
        agregados.forEach((f) => { porcentajes[f.logro_id] = Number(f.porcentaje); });
        return guardar(porcentajes);
      }
      console.warn('[estadisticas_logros] devolvió 0 filas (¿menos de 5 estudiantes o función antigua?)');
      return this.estadisticasEnCache();
    } catch (err) {
      console.warn('[estadisticas_logros] error inesperado:', err);
      return this.estadisticasEnCache();
    }
  },


  // Sincroniza los logros desbloqueados del usuario actual en Supabase.
  // Usa "ignorar duplicados" (ON CONFLICT DO NOTHING): los logros ya guardados no se tocan, así no hace falta
  // una política de UPDATE y un logro ya existente no hace fallar el envío de los nuevos.
  async sincronizarLogrosDesbloqueados(userId, listaIdsDesbloqueados) {
    if (!clienteSupabase || !userId || !Array.isArray(listaIdsDesbloqueados)) return false;
    const filas = listaIdsDesbloqueados.map((id) => ({ usuario_id: userId, logro_id: id }));
    if (!filas.length) return true;
    try {
      const { error } = await clienteSupabase
        .from('logros_desbloqueados')
        .upsert(filas, { onConflict: 'usuario_id,logro_id', ignoreDuplicates: true });
      if (error) {
        console.warn('[logros] no se pudieron guardar los logros:', error.message || error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[logros] error inesperado al guardar logros:', err);
      return false;
    }
  },


  // Cerrar sesión
  async cerrarSesion() {
    if (clienteSupabase) {
      try {
        await clienteSupabase.auth.signOut();
      } catch (e) {
        console.warn('Error cerrando sesión en Supabase:', e);
      }
    }
    localStorage.removeItem(CLAVE_SESION_LOCAL);
  },
};

// Exportación global para acceso en otros módulos
if (typeof window !== 'undefined') {
  window.ServicioAuth = ServicioAuth;
  window.estaSupabaseConfigurado = estaSupabaseConfigurado;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ServicioAuth = ServicioAuth;
  globalThis.estaSupabaseConfigurado = estaSupabaseConfigurado;
}
