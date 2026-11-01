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
   2. En tu panel de Supabase ve a: Project Settings -> Configuration -> API
   3. Copia "Project URL" y "anon public key" y genera el bloque cifrado con:
        node tools/cifrar-config.js <url> <anonKey>
      Pega el resultado en SUPABASE_CONFIG (abajo). Nunca uses la clave service_role en el navegador.
   ========================================================================= */

const SUPABASE_CONFIG = (() => {
  // Configuración cifrada (ofuscada) para que no aparezca en texto plano al inspeccionar el código.
  // OJO: es solo un freno para curiosos; la seguridad real está en las políticas RLS de la base de datos.
  // Para regenerar este bloque: node tools/cifrar-config.js <url> <anonKey>
  const _p = [
  'KGc0Xz9raQ89OjU8XggfHU4mKTRJISAgTiU2LjVKV0peXCQxb14mOTJPND0k',
  'Yk5dEh4UMisuQxgsKg9vbCQ1Z1pSdVU6CihnGhwpZGQAKAVee15gAzAGCBsa',
  'IiN1Aw0LdQNXSXhGMHYMRBwgGVcxFgMkdF92SGwADDJkPQM/dzwHdwVDWgFQ',
  'fgUuIkA/MwoeF3ojf0FcampGICQvSWMAOlo8LSx1XmhjewAaKAdYMXtnRBkN',
  'Czx0amFbeTkAcmIHBClgESl1Aml7Q3tbBXEibhp/HkcQOQ4ISgZ+dlFjCC8d',
  'fXsRQxsBMRhPU1xeBzs1AkJnDGNrZyoDHHREBkJbEBElazxxCRo+HRR6WEUS',
  'Tw==',
  ].join('');
  const _k = 'SEA-SIS-UNAL-2026';
  try {
    const bin = atob(_p);
    const bytes = Uint8Array.from(bin, (c, i) => c.charCodeAt(0) ^ _k.charCodeAt(i % _k.length));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) {
    return { url: '', anonKey: '' };
  }
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

const ServicioAuth = {
  // Obtiene la sesión activa
  async obtenerSesion() {
    if (clienteSupabase) {
      try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error) throw error;
        if (session && session.user) {
          const perfil = await this.obtenerPerfil(session.user.id);
          return {
            usuario: {
              id: session.user.id,
              correo: session.user.email,
              nombre: perfil?.nombre || session.user.user_metadata?.nombre || '',
              historiaTexto: perfil?.historia_texto || session.user.user_metadata?.historia_texto || '',
              ritmo: perfil?.ritmo || session.user.user_metadata?.ritmo || null,
            },
            proveedor: 'supabase',
          };
        }
      } catch (e) {
        console.warn('Error consultando sesión en Supabase:', e);
      }
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
  async obtenerPerfil(userId) {
    if (!clienteSupabase) return null;
    try {
      const { data, error } = await clienteSupabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // Guarda o actualiza el perfil en Supabase
  async guardarPerfil(userId, correo, datos) {
    if (clienteSupabase) {
      try {
        await clienteSupabase.from('perfiles').upsert({
          id: userId,
          correo,
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
