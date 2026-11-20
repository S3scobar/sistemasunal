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
   VERIFICADOR DE TARJETAS DE PROMOCIÓN
   Consulta el código en la base de datos (función verificar_codigo_promocion) y muestra el nombre, el correo
   (con parte oculta) y el sello reales. Quien recibe la tarjeta los compara con lo que dice la imagen.
   ============================================= */

const FORMATO_CODIGO = /^SIS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

// Acepta el código con espacios, minúsculas o sin guiones y lo deja como SIS-XXXX-XXXX-XXXX
function normalizarCodigo(texto) {
  const limpio = String(texto || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const m = /^SIS([0-9A-F]{4})([0-9A-F]{4})([0-9A-F]{4})$/.exec(limpio);
  return m ? `SIS-${m[1]}-${m[2]}-${m[3]}` : String(texto || '').trim().toUpperCase();
}

function fechaLarga(iso) {
  try { return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; }
}

function mostrar(html, tipo) {
  const caja = $('#resultado');
  caja.className = `verificar__resultado ${tipo ? `verificar__resultado--${tipo}` : ''}`;
  caja.innerHTML = html;
}

function pintarValido(d) {
  mostrar(`
    <p class="resultado__estado">Código válido</p>
    <div class="resultado__cuerpo">
      <span class="resultado__sello">${SELLO.svg(d.sello, 84)}</span>
      <dl class="resultado__datos">
        <div><dt>Nombre</dt><dd>${esc(d.nombre)}</dd></div>
        <div><dt>Correo</dt><dd class="resultado__mono">${esc(d.correo)}</dd></div>
        <div><dt>Sello</dt><dd class="resultado__mono">${esc(String(d.sello || '').toUpperCase())}</dd></div>
        <div><dt>Emitido</dt><dd>${esc(fechaLarga(d.emitido_en))}</dd></div>
        <div><dt>Veces consultado</dt><dd>${esc(d.verificaciones)}</dd></div>
      </dl>
    </div>
    <p class="resultado__nota">El código es auténtico. Falta comparar el nombre, el correo y el sello con los de la tarjeta, y confirmar que quien te escribe es esa persona.</p>`, 'ok');
}

async function comprobarCodigo(texto) {
  const codigo = normalizarCodigo(texto);
  $('#codigo').value = codigo;
  if (!FORMATO_CODIGO.test(codigo)) {
    mostrar('<p class="resultado__estado">Código mal escrito</p><p class="resultado__nota">Tiene que verse así: <code>SIS-XXXX-XXXX-XXXX</code> (letras de la A a la F y números).</p>', 'mal');
    return;
  }
  const boton = $('#btn-verificar');
  boton.disabled = true;
  mostrar('<p class="resultado__nota" role="status">Verificando…</p>');
  try {
    const r = await ServicioAuth.verificarCodigoPromocion(codigo);
    if (!r.ok) mostrar(`<p class="resultado__estado">No se pudo verificar</p><p class="resultado__nota">${esc(r.mensaje)}</p>`, 'aviso');
    else if (!r.datos.valido) mostrar('<p class="resultado__estado">Código no válido</p><p class="resultado__nota">Ese código no existe o fue desactivado. No apliques el descuento.</p>', 'mal');
    else pintarValido(r.datos);
  } finally {
    boton.disabled = false;
  }
}

$('#form-verificar').addEventListener('submit', (e) => { e.preventDefault(); comprobarCodigo($("#codigo").value); });

// Si llegó con ?c=CODIGO (enlace del mensaje de WhatsApp), se verifica solo
const desdeEnlace = new URLSearchParams(location.search).get('c');
if (desdeEnlace) comprobarCodigo(desdeEnlace);
