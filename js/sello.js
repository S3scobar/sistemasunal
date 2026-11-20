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
   SELLO VISUAL DEL CÓDIGO DE PROMOCIÓN
   El servidor entrega un sello de 8 caracteres hexadecimales (supabase/promocion.sql). De él sale un icono
   de 5 × 5 celdas que se imprime en la tarjeta (avance-extras.js) y se vuelve a dibujar en verificar.html,
   para comparar a simple vista que la tarjeta y la verificación son de la misma persona.
   ============================================= */

const SELLO = (() => {
  'use strict';

  const valido = (sello) => /^[0-9A-F]{8}$/i.test(String(sello || ''));

  // Matriz 5 × 5 (simétrica) de true/false, o null si el sello no es válido
  function celdas(sello) {
    if (!valido(sello)) return null;
    const n = parseInt(sello, 16);
    const filas = [];
    for (let f = 0; f < 5; f += 1) {
      const fila = [];
      for (let c = 0; c < 3; c += 1) fila.push(((n >>> (f * 3 + c)) & 1) === 1);
      filas.push([fila[0], fila[1], fila[2], fila[1], fila[0]]);
    }
    return filas;
  }

  // Tono (0–359) entre cian y violeta, según el sello
  const tono = (sello) => (valido(sello) ? 190 + (((parseInt(sello, 16) >>> 15) & 0xff) % 120) : 200);
  const color = (sello) => `hsl(${tono(sello)}, 85%, 66%)`;

  // Icono como SVG (para páginas HTML)
  function svg(sello, tam = 72) {
    const m = celdas(sello);
    if (!m) return '';
    const cuadros = [];
    m.forEach((fila, y) => fila.forEach((on, x) => { if (on) cuadros.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }));
    return `<svg viewBox="-0.5 -0.5 6 6" width="${tam}" height="${tam}" fill="${color(sello)}" role="img" aria-label="Sello ${String(sello).toUpperCase()}"><rect x="-0.5" y="-0.5" width="6" height="6" rx=".6" fill="#04101f"/>${cuadros.join('')}</svg>`;
  }

  // Icono dibujado en un canvas (para la tarjeta que se comparte)
  function dibujar(ctx, sello, x, y, tam) {
    const m = celdas(sello);
    if (!m) return;
    const celda = tam / 6;
    ctx.fillStyle = '#04101f';
    ctx.fillRect(x, y, tam, tam);
    ctx.fillStyle = color(sello);
    m.forEach((fila, f) => fila.forEach((on, c) => { if (on) ctx.fillRect(x + celda * (c + 0.5), y + celda * (f + 0.5), celda, celda); }));
  }

  return { valido, celdas, color, svg, dibujar };
})();

if (typeof module !== 'undefined') module.exports = { SELLO };
