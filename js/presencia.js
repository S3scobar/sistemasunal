/* ==============================================================================
   PORTAL WEB OFICIAL · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL SEDE MEDELLÍN
   Arquitectura de software, maquetación y desarrollo integral por:
   Santiago Escobar Arias
   Representante Estudiantil de Ingeniería de Sistemas e Informática
   Facultad de Minas — Universidad Nacional de Colombia, Sede Medellín
   Email: saescobara@unal.edu.co | Instagram: @s_escobar__ | WhatsApp: (+57) 312 377 2091
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c

/* =========================================================================
   PRESENCIA · "¿Cuántas personas hay conectadas?"
   Usa Supabase Realtime Presence: no escribe nada en la base de datos ni guarda
   datos personales; cada pestaña abierta es un identificador aleatorio que
   desaparece al cerrarla. Solo el inicio muestra el contador, pero todas las
   páginas cuentan como "conectado".
   ========================================================================= */
(function () {
  'use strict';
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const CANAL = 'presencia-sistemas-unal';
  const caja = document.getElementById('en-linea');

  function cargar(src) {
    return new Promise((ok, fallo) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = fallo;
      document.head.appendChild(s);
    });
  }

  async function obtenerCliente() {
    if (typeof clienteSupabase !== 'undefined' && clienteSupabase) return clienteSupabase;
    if (!window.supabase) await cargar(SUPABASE_JS);
    if (typeof estaSupabaseConfigurado === 'undefined') await cargar('js/supabase-config.js');
    return (typeof clienteSupabase !== 'undefined') ? clienteSupabase : null;
  }

  function pintar(n) {
    if (!caja) return;
    const num = caja.querySelector('.en-linea__num');
    const txt = caja.querySelector('.en-linea__txt');
    if (num) num.textContent = String(n);
    if (txt) txt.textContent = n === 1 ? 'conectado' : 'conectados';
    caja.hidden = false;
  }

  async function iniciar() {
    let cliente = null;
    try { cliente = await obtenerCliente(); } catch (_) { return; }
    if (!cliente || !cliente.channel) return; // sin conexión: el contador simplemente no aparece

    const clave = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
    const canal = cliente.channel(CANAL, { config: { presence: { key: clave } } });
    let unido = false;

    const contar = () => pintar(Math.max(1, Object.keys(canal.presenceState()).length));
    canal.on('presence', { event: 'sync' }, contar);

    canal.subscribe(async (estadoCanal) => {
      if (estadoCanal === 'SUBSCRIBED') {
        unido = true;
        if (!document.hidden) await canal.track({ en: Date.now() });
      } else if (estadoCanal === 'CHANNEL_ERROR' || estadoCanal === 'TIMED_OUT' || estadoCanal === 'CLOSED') {
        if (caja && !unido) caja.hidden = true;
      }
    });

    // Una pestaña en segundo plano no cuenta como "conectada"
    document.addEventListener('visibilitychange', () => {
      if (!unido) return;
      if (document.hidden) canal.untrack(); else canal.track({ en: Date.now() });
    });
    window.addEventListener('pagehide', () => { try { canal.untrack(); } catch (_) {} });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
