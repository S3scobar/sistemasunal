/* =============================================================
   PANEL DE ADMINISTRACIÓN · acceso por SmartKey (sin historia académica)
   Quién puede qué lo decide la BASE DE DATOS (RLS + mi_acceso()), no esta página: aunque alguien
   edite este archivo en su navegador, Supabase le niega las lecturas y escrituras.
   Para agregar una función nueva: súmala a PERMISOS y crea su pestaña (ver «strikes»).
   ============================================================= */

(() => {
// Permisos que se pueden dar a un administrador. El creador tiene todos y no depende de esta lista.
const PERMISOS = [
  { id: 'strikes', nombre: 'Strikes del grupo de WhatsApp' },
  { id: 'malla', nombre: 'Malla: prerrequisitos y materias que desbloquea' },
  { id: 'grupos', nombre: 'Grupos de WhatsApp de las materias' },
  { id: 'calendario', nombre: 'Fechas del calendario académico' },
  { id: 'convenios', nombre: 'Convenios: información y botones' },
];
const CREADOR = 'saescobara@unal.edu.co';

// Motivos tomados de las reglas del grupo. Se guarda el texto, así el historial se entiende solo.
const MOTIVOS = {
  strike: [
    'Mismo mensaje repetido en 4 mensajes diferentes',
    'Usar un comando de emergencia sin permiso de un admin',
    'Bugs de WhatsApp para poner lentos los celulares o mensajes de más de 3000 caracteres',
    'Publicidad no autorizada por un admin',
    'Hostilidad o menosprecio',
    'Flooding: más de 6 mensajes seguidos',
    'Desautorizar la moderación en público',
    'Comentarios racistas, machistas, xenófobos u homofóbicos',
    'Usar el grupo para sacar números y acosar o hacer spam por privado',
    'Otro (explicar en el detalle)',
  ],
  ban: [
    'Acumular 3 strikes',
    'Uso excesivo de Meta AI o creación de contenido de mal gusto',
    'Contenido multimedia o links con contenido ilegal o 🔞',
    'Sabotear, destruir o vulnerar recursos de apoyo de la comunidad',
    'No pertenecer al departamento de Ciencias de la Computación y la Decisión',
    'Otro (explicar en el detalle)',
  ],
};
const MAX_STRIKES = 3;
const URL_PORTAL = 'sistemasunal.vercel.app';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
const sinAcentos = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const db = clienteSupabase;
let yo = null;            // { correo, superadmin, permisos }
let miembros = [];
let sanciones = [];
let admins = [];
let objetivo = null;      // miembro al que se le abre el diálogo

/* ---------- Pantallas ---------- */
function mostrar(id) {
  ['admin-cargando', 'admin-entrar', 'admin-denegado', 'admin-panel'].forEach((x) => { $('#' + x).hidden = x !== id; });
}

let temporizador = null;
function avisar(texto) {
  const el = $('#admin-aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { el.hidden = true; }, 3500);
}

function error(id, texto) {
  const el = $('#' + id);
  el.textContent = texto || '';
  el.hidden = !texto;
}

const msg = (e) => (e && e.message) || 'No se pudo completar la acción. Inténtalo de nuevo.';

/* ---------- Acceso ---------- */
async function iniciar() {
  if (!db) { mostrar('admin-entrar'); error('admin-error-entrar', 'El servicio de base de datos no está disponible.'); return; }
  await cierreForzado;
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) { mostrar('admin-entrar'); return; }

  const correo = String(session.user.email || '').trim().toLowerCase();
  if (!correo.endsWith('@unal.edu.co')) {
    await db.auth.signOut();
    mostrar('admin-entrar');
    error('admin-error-entrar', 'Solo se permite el ingreso con correo institucional @unal.edu.co.');
    return;
  }

  const { data, error: e } = await db.rpc('mi_acceso');
  if (e || !data?.admin) {
    $('#admin-correo-denegado').textContent = correo;
    mostrar('admin-denegado');
    return;
  }
  yo = { correo, superadmin: data.superadmin, permisos: data.permisos || [] };
  armarPanel();
}

$('#admin-smartkey').addEventListener('click', async (ev) => {
  ev.currentTarget.disabled = true;
  try { await ServicioAuth.iniciarConSmartKey(); } catch (e) {
    ev.currentTarget.disabled = false;
    error('admin-error-entrar', msg(e));
  }
});

async function salir() {
  await db.auth.signOut();
  localStorage.removeItem(CLAVE_SESION_LOCAL);
  location.reload();
}
$('#admin-salir').addEventListener('click', salir);
$('#admin-salir-denegado').addEventListener('click', salir);

const puede = (p) => yo.superadmin || yo.permisos.includes(p);

function armarPanel() {
  $('#admin-correo').textContent = yo.correo;
  $('#admin-rol').textContent = yo.superadmin ? 'Creador' : 'Administrador';
  $('#tab-strikes').hidden = !puede('strikes');
  $('#tab-malla').hidden = !(puede('malla') || puede('grupos'));
  $('#tab-calendario').hidden = !puede('calendario');
  $('#tab-convenios').hidden = !puede('convenios');
  $('#tab-admins').hidden = !yo.superadmin;
  mostrar('admin-panel');
  const primera = $$('[role="tab"]').find((t) => !t.hidden);
  if (!primera) { avisar('Tu cuenta es administradora pero todavía no tiene secciones activas.'); return; }
  abrirPestana(primera);
  if (puede('strikes')) cargarStrikes();
  if (yo.superadmin) cargarAdmins();
  if (puede('malla') || puede('grupos')) cargarMalla();
  if (puede('calendario')) cargarCalendario();
  if (puede('convenios')) cargarConvenios();
}

/* ---------- Pestañas (flechas para moverse, como pide el patrón ARIA) ---------- */
function abrirPestana(tab) {
  $$('[role="tab"]').forEach((t) => {
    const activa = t === tab;
    t.setAttribute('aria-selected', activa);
    t.tabIndex = activa ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !activa;
  });
}
$$('[role="tab"]').forEach((t) => t.addEventListener('click', () => abrirPestana(t)));
$('.admin__pestanas').addEventListener('keydown', (e) => {
  const visibles = $$('[role="tab"]').filter((t) => !t.hidden);
  const i = visibles.indexOf(document.activeElement);
  if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  const sig = visibles[(i + (e.key === 'ArrowRight' ? 1 : visibles.length - 1)) % visibles.length];
  sig.focus();
  abrirPestana(sig);
});

/* =============================================================
   STRIKES
   ============================================================= */
const activas = (m) => sanciones.filter((s) => s.miembro_id === m.id && !s.anulada_en);
const strikesDe = (m) => activas(m).filter((s) => s.tipo === 'strike').length;
const baneado = (m) => activas(m).some((s) => s.tipo === 'ban');

async function cargarStrikes() {
  const [a, b] = await Promise.all([
    db.from('miembros_wpp').select('*'),
    db.from('sanciones').select('*').order('creado_en', { ascending: false }),
  ]);
  if (a.error || b.error) { error('strikes-error', msg(a.error || b.error)); return; }
  miembros = a.data;
  sanciones = b.data;
  pintarStrikes();
}

function pintarStrikes() {
  const total = miembros.length;
  const conStrikes = miembros.filter((m) => strikesDe(m) > 0 && !baneado(m)).length;
  const bans = miembros.filter(baneado).length;
  $('#strikes-resumen').innerHTML = [
    ['Miembros', total], ['Con strikes', conStrikes], ['Baneados', bans],
  ].map(([n, v]) => `<div class="admin__dato"><b>${v}</b><span>${n}</span></div>`).join('');

  const q = sinAcentos($('#strikes-buscar').value).replace(/[\s+\-()]/g, '');
  const filtro = $('#strikes-filtro').value;
  const pasa = (m) => {
    const s = strikesDe(m); const ban = baneado(m);
    if (filtro === 'strikes' && !(s > 0 && !ban)) return false;
    if (filtro === 'riesgo' && !(s === MAX_STRIKES - 1 && !ban)) return false;
    if (filtro === 'ban' && !ban) return false;
    if (filtro === 'limpios' && (s > 0 || ban)) return false;
    return !q || sinAcentos(`${m.contacto}${m.clave}${m.nota || ''}`).replace(/[\s+\-()]/g, '').includes(q);
  };

  // Ranking: baneados primero, luego por strikes y, a igualdad, por contacto
  const lista = miembros.filter(pasa).sort((x, y) =>
    (baneado(y) - baneado(x)) || (strikesDe(y) - strikesDe(x)) || x.contacto.localeCompare(y.contacto));

  $('#strikes-lista').innerHTML = lista.length ? lista.map(tarjetaMiembro).join('')
    : `<li class="admin__vacio">${total ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay miembros.'}</li>`;
}

function tarjetaMiembro(m, i) {
  const s = strikesDe(m); const ban = baneado(m);
  const pips = Array.from({ length: MAX_STRIKES }, (_, k) => `<i class="${k < s ? 'on' : ''}"></i>`).join('');
  const historial = sanciones.filter((x) => x.miembro_id === m.id);
  const estado = ban ? '<span class="admin__chip admin__chip--ban">Baneado</span>'
    : s >= MAX_STRIKES ? '<span class="admin__chip admin__chip--ban">3 strikes: corresponde ban</span>'
    : s === MAX_STRIKES - 1 ? '<span class="admin__chip admin__chip--riesgo">En riesgo</span>'
    : s ? '<span class="admin__chip">Con strikes</span>' : '<span class="admin__chip admin__chip--ok">Limpio</span>';
  const nivel = ban || s >= MAX_STRIKES ? 'ban' : s === MAX_STRIKES - 1 ? 'riesgo' : s ? 'strikes' : 'limpio';
  return `<li class="admin__miembro ${ban ? 'is-ban' : ''}" data-nivel="${nivel}" data-id="${esc(m.id)}">
    <div class="admin__miembro-fila">
      <div class="admin__miembro-id">
        ${s || ban ? `<span class="admin__puesto" aria-label="Puesto ${i + 1}">#${i + 1}</span>` : ''}
        <strong>${esc(m.contacto)}</strong>
        <span class="admin__pips" role="img" aria-label="${s} de ${MAX_STRIKES} strikes activos">${pips}</span>
        ${estado}
      </div>
      <button class="admin__boton admin__boton--peligro" data-accion="sancionar" type="button">Sancionar</button>
    </div>
    ${historial.length ? `<details class="admin__historial"><summary>Historial (${historial.length})</summary>
      <ul>${historial.map((h) => `<li class="${h.anulada_en ? 'is-anulada' : ''}">
        <span class="admin__chip ${h.tipo === 'ban' ? 'admin__chip--ban' : ''}">${h.tipo === 'ban' ? 'Ban' : 'Strike'}</span>
        <div><b>${esc(h.motivo)}</b>${h.detalle ? `<p>${esc(h.detalle)}</p>` : ''}
          <small>${fecha(h.creado_en)} · ${esc(h.creado_por || '')}${h.anulada_en ? ` · anulada ${fecha(h.anulada_en)} por ${esc(h.anulada_por || '')}` : ''}</small></div>
        ${h.anulada_en ? '' : `<div class="admin__historial-acciones">
          <button class="admin__boton admin__boton--suave admin__boton--chico" data-accion="aviso" data-sancion="${esc(h.id)}" type="button">Aviso</button>
          <button class="admin__boton admin__boton--suave admin__boton--chico" data-accion="anular" data-sancion="${esc(h.id)}" type="button">Anular</button></div>`}
      </li>`).join('')}</ul></details>` : ''}
  </li>`;
}

$('#strikes-buscar').addEventListener('input', pintarStrikes);
$('#strikes-filtro').addEventListener('change', pintarStrikes);

// Número o @usuario -> { clave, contacto }. Teléfonos colombianos de 10 dígitos (3xx…) llevan +57.
function normalizarContacto(texto) {
  const t = String(texto || '').trim();
  if (t.startsWith('@')) {
    const u = t.slice(1);
    if (!/^[\p{L}\p{N}._-]{1,40}$/u.test(u)) return null;
    return { clave: '@' + u.toLowerCase(), contacto: '@' + u };
  }
  let d = t.replace(/[\s+\-().]/g, '');
  if (!/^\d+$/.test(d)) return null;
  if (d.length === 10 && d.startsWith('3')) d = '57' + d;
  if (d.length < 8 || d.length > 15) return null;
  const bonito = d.startsWith('57') && d.length === 12 ? `+57 ${d.slice(2, 5)} ${d.slice(5)}` : `+${d}`;
  return { clave: d, contacto: bonito };
}

$('#strikes-agregar').addEventListener('submit', async (e) => {
  e.preventDefault();
  error('strikes-error', '');
  const c = normalizarContacto($('#strikes-nuevo').value);
  if (!c) { error('strikes-error', 'Escribe un número (con o sin +57) o un usuario que empiece por @.'); return; }
  if (miembros.some((m) => m.clave === c.clave)) { error('strikes-error', `${c.contacto} ya está en la lista.`); return; }
  const { data, error: err } = await db.from('miembros_wpp').insert(c).select().single();
  if (err) { error('strikes-error', msg(err)); return; }
  miembros.push(data);
  $('#strikes-nuevo').value = '';
  $('#strikes-buscar').value = '';
  $('#strikes-filtro').value = 'todos';
  pintarStrikes();
  avisar(`${data.contacto} agregado`);
});

// Un solo manejador para los botones de las tarjetas
$('#strikes-lista').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-accion]');
  if (!b) return;
  if (b.dataset.accion === 'aviso') {
    const s = sanciones.find((x) => x.id === b.dataset.sancion);
    abrirAviso(miembros.find((m) => m.id === s.miembro_id), s);
  } else if (b.dataset.accion === 'sancionar') {
    objetivo = miembros.find((m) => m.id === b.closest('[data-id]').dataset.id);
    abrirDialogo();
  } else if (b.dataset.accion === 'anular') {
    if (!confirm('¿Anular esta sanción? Queda en el historial como anulada.')) return;
    b.disabled = true;
    const cambio = { anulada_en: new Date().toISOString(), anulada_por: yo.correo };
    const { error: err } = await db.from('sanciones').update(cambio).eq('id', b.dataset.sancion);
    if (err) { b.disabled = false; error('strikes-error', msg(err)); return; }
    Object.assign(sanciones.find((s) => s.id === b.dataset.sancion), cambio);
    pintarStrikes();
    avisar('Sanción anulada');
  }
});

/* ---------- Diálogo de sanción ---------- */
const dlg = $('#dlg-sancion');
const tipoElegido = () => $('input[name="tipo"]:checked', dlg).value;

function llenarMotivos() {
  $('#dlg-motivo').innerHTML = MOTIVOS[tipoElegido()].map((m) => `<option>${esc(m)}</option>`).join('');
  // Con 2 strikes activos, el tercero se anota como ban por «Acumular 3 strikes»
  if (tipoElegido() === 'ban' && strikesDe(objetivo) >= MAX_STRIKES) $('#dlg-motivo').value = 'Acumular 3 strikes';
}

function abrirDialogo() {
  error('dlg-error', '');
  $('#dlg-titulo').textContent = `Sancionar a ${objetivo.contacto}`;
  $('#dlg-detalle').value = '';
  $('input[name="tipo"][value="strike"]', dlg).checked = true;
  const s = strikesDe(objetivo);
  const aviso = baneado(objetivo) ? 'Este miembro ya está baneado.'
    : s === MAX_STRIKES - 1 ? 'Ya tiene 2 strikes: el próximo llega a 3 y, según las reglas, corresponde ban.'
    : s >= MAX_STRIKES ? 'Ya tiene 3 strikes: según las reglas corresponde ban.' : '';
  $('#dlg-aviso').textContent = aviso;
  $('#dlg-aviso').hidden = !aviso;
  llenarMotivos();
  if (s >= MAX_STRIKES && !baneado(objetivo)) { $('input[name="tipo"][value="ban"]', dlg).checked = true; llenarMotivos(); }
  dlg.showModal();
}

$$('input[name="tipo"]', dlg).forEach((r) => r.addEventListener('change', llenarMotivos));
// Cerrar tocando fuera del cuadro
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

$('#dlg-confirmar').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  error('dlg-error', '');
  const motivo = $('#dlg-motivo').value;
  const detalle = $('#dlg-detalle').value.trim();
  if (motivo.startsWith('Otro') && !detalle) { error('dlg-error', 'Con «Otro» explica el motivo en el detalle.'); return; }
  b.disabled = true;
  const fila = { miembro_id: objetivo.id, tipo: tipoElegido(), motivo, detalle: detalle || null };
  const { data, error: err } = await db.from('sanciones').insert(fila).select().single();
  b.disabled = false;
  if (err) { error('dlg-error', msg(err)); return; }
  sanciones.unshift(data);
  dlg.close();
  pintarStrikes();
  avisar(`${data.tipo === 'ban' ? 'Ban' : 'Strike'} aplicado a ${objetivo.contacto}`);
  abrirAviso(objetivo, data);
});


/* ---------- Aviso al grupo ----------
   WhatsApp no permite enviar mensajes solo desde una página: se abre con el texto listo (wa.me) y la persona
   que sancionó elige el grupo y toca Enviar, así sale desde SU número. */
const grupo = $('#dlg-grupo');

// «@» + número (sin +) o el usuario, que ya trae su @ (así no queda @@)
const mencion = (m) => (m.clave.startsWith('@') ? m.contacto : '@' + m.clave);

function mensajeAviso(m, s) {
  const motivo = s.motivo.startsWith('Otro') ? (s.detalle || 'consulta con un admin') : s.motivo;
  if (s.tipo === 'ban') {
    return `🪪 ${mencion(m)} recibiste un permaban.\n📌 Motivo: ${motivo}\n🧭 Si crees que es un error, escríbele a un admin.`;
  }
  // Strikes activos hasta esta sanción: el aviso dice el número correcto aunque se reenvíe después
  const n = sanciones.filter((x) => x.miembro_id === m.id && x.tipo === 'strike' && !x.anulada_en && x.creado_en <= s.creado_en).length;
  const barras = '●'.repeat(Math.min(n, MAX_STRIKES)) + '○'.repeat(Math.max(MAX_STRIKES - n, 0));
  return `🧾 ${mencion(m)} incumpliste la regla: ${motivo}.\n🔖 Llevas ${n}/${MAX_STRIKES} strikes ${barras}\n`
    + (n >= MAX_STRIKES ? '🪪 Con 3 strikes corresponde permaban.' : '🧭 Al llegar a 3 strikes, el siguiente paso es el permaban.')
    + `\n📎 Reglas y recursos: ${URL_PORTAL}`;
}

function abrirAviso(m, s) {
  $('#grupo-texto').value = mensajeAviso(m, s);
  grupo.showModal();
}

$('#grupo-abrir').addEventListener('click', () => {
  window.open('https://wa.me/?text=' + encodeURIComponent($('#grupo-texto').value), '_blank', 'noopener');
});
$('#grupo-copiar').addEventListener('click', async () => {
  const caja = $('#grupo-texto');
  try { await navigator.clipboard.writeText(caja.value); } catch { caja.select(); document.execCommand('copy'); }
  avisar('Mensaje copiado');
});
grupo.addEventListener('click', (e) => { if (e.target === grupo) grupo.close(); });

// Reglas a la vista, para consultarlas sin salir del panel
$('#strikes-reglas').innerHTML = `
  <h3>Strikes</h3><ul>${MOTIVOS.strike.slice(0, -1).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
  <h3>Permaban</h3><ul>${MOTIVOS.ban.slice(0, -1).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;

/* =============================================================
   ADMINISTRADORES (solo el creador)
   ============================================================= */
async function cargarAdmins() {
  const { data, error: err } = await db.from('admins').select('*').order('creado_en');
  if (err) { error('admins-error', msg(err)); return; }
  admins = data;
  pintarAdmins();
}

function pintarAdmins() {
  const creador = `<li class="admin__admin">
    <div class="admin__admin-id"><strong>${CREADOR}</strong><span class="admin__chip admin__chip--ok">Creador · todos los permisos</span></div></li>`;
  const filas = admins.map((a) => `<li class="admin__admin" data-correo="${esc(a.correo)}">
    <div class="admin__admin-id"><strong>${esc(a.correo)}</strong><small>Agregado ${fecha(a.creado_en)}${a.creado_por ? ' por ' + esc(a.creado_por) : ''}</small></div>
    <div class="admin__permisos" role="group" aria-label="Permisos de ${esc(a.correo)}">
      ${PERMISOS.map((p) => `<label><input type="checkbox" data-permiso="${p.id}" ${a.permisos.includes(p.id) ? 'checked' : ''}> <span>${esc(p.nombre)}</span></label>`).join('')}
    </div>
    <button class="admin__boton admin__boton--suave admin__boton--chico" data-accion="quitar" type="button">Quitar</button>
  </li>`).join('');
  $('#admins-lista').innerHTML = creador + filas;
}

$('#admins-agregar').addEventListener('submit', async (e) => {
  e.preventDefault();
  error('admins-error', '');
  const correo = $('#admins-correo').value.trim().toLowerCase();
  if (!/^[a-z0-9._-]+@unal\.edu\.co$/.test(correo)) { error('admins-error', 'Escribe un correo institucional que termine en @unal.edu.co.'); return; }
  if (correo === CREADOR || admins.some((a) => a.correo === correo)) { error('admins-error', 'Esa persona ya es administradora.'); return; }
  const { data, error: err } = await db.from('admins').insert({ correo, permisos: [] }).select().single();
  if (err) { error('admins-error', msg(err)); return; }
  admins.push(data);
  $('#admins-correo').value = '';
  pintarAdmins();
  avisar(`${correo} agregado. Actívale los permisos que necesite.`);
});

$('#admins-lista').addEventListener('change', async (e) => {
  const caja = e.target.closest('input[data-permiso]');
  if (!caja) return;
  const fila = caja.closest('[data-correo]');
  const a = admins.find((x) => x.correo === fila.dataset.correo);
  const permisos = $$('input[data-permiso]:checked', fila).map((c) => c.dataset.permiso);
  caja.disabled = true;
  const { error: err } = await db.from('admins').update({ permisos }).eq('correo', a.correo);
  caja.disabled = false;
  if (err) { caja.checked = !caja.checked; error('admins-error', msg(err)); return; }
  a.permisos = permisos;
  avisar('Permisos actualizados');
});

$('#admins-lista').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-accion="quitar"]');
  if (!b) return;
  const correo = b.closest('[data-correo]').dataset.correo;
  if (!confirm(`¿Quitar a ${correo} como administrador?`)) return;
  const { error: err } = await db.from('admins').delete().eq('correo', correo);
  if (err) { error('admins-error', msg(err)); return; }
  admins = admins.filter((a) => a.correo !== correo);
  pintarAdmins();
  avisar(`${correo} ya no es administrador`);
});


/* =============================================================
   CONTENIDO EDITABLE: malla, calendario y convenios
   La web sigue leyendo data/*.json y les aplica encima la tabla «contenido»
   (ver aplicarCambios en comun.js). Borrar una fila = volver al archivo original.
   Cada versión reemplazada queda en contenido_historial.
   ============================================================= */
const archivo = (ruta) => fetch(`data/${ruta}.json`, { cache: 'no-cache' }).then((r) => {
  if (!r.ok) throw new Error(`No se pudo leer data/${ruta}.json`);
  return r.json();
});
async function publicado(ruta) {
  const { data, error: e } = await db.from('contenido').select('*').eq('ruta', ruta);
  if (e) throw e;
  return Object.fromEntries(data.map((f) => [f.seccion, f]));
}
async function guardarContenido(ruta, seccion, datos) {
  const { error: e } = datos === null
    ? await db.from('contenido').delete().eq('ruta', ruta).eq('seccion', seccion)
    : await db.from('contenido').upsert({ ruta, seccion, datos });
  if (e) throw e;
}
const pieCambio = (fila) => (fila
  ? `Publicado ${fecha(fila.editado_en)} por ${esc(fila.editado_por || '¿?')}`
  : 'Sin cambios publicados: se muestra el archivo original.');
const copia = (x) => JSON.parse(JSON.stringify(x));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const URL_OK = /^(https:\/\/|mailto:|tel:)\S+$/;
const WPP_OK = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,}(\?\S*)?$/;

/* ---------- Malla ---------- */
const malla = { base: [], prer: {}, wpp: {}, filas: {}, codigo: null, sucio: false };
const RUTA_MALLA = 'malla/asignaturas';

async function cargarMalla() {
  try {
    const [base, pub] = await Promise.all([archivo(RUTA_MALLA), publicado(RUTA_MALLA)]);
    malla.base = base;
    malla.filas = pub;
    const p = pub.prerrequisitos?.datos || {};
    const w = pub.whatsapp?.datos || {};
    base.forEach((a) => {
      malla.prer[a.codigo] = [...(p[a.codigo] ?? a.prerrequisitos)];
      malla.wpp[a.codigo] = a.codigo in w ? w[a.codigo] : (a.whatsapp || '');
    });
    pintarMaterias();
  } catch (e) { error('malla-error', msg(e)); }
}

const materia = (c) => malla.base.find((a) => a.codigo === c);
const nombreDe = (c) => materia(c)?.nombre || c;
const desbloquea = (c) => Object.keys(malla.prer).filter((x) => malla.prer[x].includes(c));
const distinta = (c) => !igual(malla.prer[c], materia(c).prerrequisitos) || malla.wpp[c] !== (materia(c).whatsapp || '');
// ¿«a» necesita (directa o indirectamente) a «b»? Sirve para no crear ciclos imposibles de cursar.
function requiere(a, b, visto = new Set()) {
  if (visto.has(a)) return false;
  visto.add(a);
  return (malla.prer[a] || []).some((p) => p === b || requiere(p, b, visto));
}

function pintarMaterias() {
  const q = sinAcentos($('#malla-buscar').value.trim());
  const f = $('#malla-filtro').value;
  const lista = malla.base.filter((a) => (!q || sinAcentos(a.nombre + ' ' + a.codigo).includes(q))
    && (f !== 'sin-wpp' || !malla.wpp[a.codigo]) && (f !== 'editadas' || distinta(a.codigo)));
  $('#malla-sugeridas').innerHTML = lista.length ? lista.map((a) => `<li><button class="admin__materia ${a.codigo === malla.codigo ? 'is-activa' : ''}" data-codigo="${esc(a.codigo)}" type="button" aria-pressed="${a.codigo === malla.codigo}">
      ${malla.wpp[a.codigo] ? '<i class="admin__punto admin__punto--wpp" title="Tiene grupo de WhatsApp"></i>' : '<i class="admin__punto" title="Sin grupo de WhatsApp"></i>'}
      <span>${esc(a.nombre)}</span><small>${esc(a.codigo)}</small></button></li>`).join('')
    : '<li class="admin__vacio">Ninguna materia coincide.</li>';
}

function fichas(codigos, tipo) {
  return codigos.length ? `<ul class="admin__fichas">${codigos.map((c) => `<li><span>${esc(nombreDe(c))} <small>${esc(c)}</small></span>
      <button type="button" data-quitar-${tipo}="${esc(c)}" aria-label="Quitar ${esc(nombreDe(c))}">×</button></li>`).join('')}</ul>`
    : `<p class="admin__ayuda">${tipo === 'pre' ? 'No tiene prerrequisitos.' : 'No es prerrequisito de ninguna materia.'}</p>`;
}
const opciones = (excluir) => `<option value="">Elegir materia…</option>` + malla.base
  .filter((a) => !excluir.includes(a.codigo)).map((a) => `<option value="${esc(a.codigo)}">${esc(a.nombre)} · ${esc(a.codigo)}</option>`).join('');

function pintarEditorMalla() {
  const c = malla.codigo;
  const caja = $('#malla-editor');
  if (!c) { caja.hidden = true; return; }
  const pre = malla.prer[c];
  const des = desbloquea(c);
  const fila = [malla.filas.prerrequisitos, malla.filas.whatsapp].filter(Boolean).sort((a, b) => (a.editado_en < b.editado_en ? 1 : -1))[0];
  caja.hidden = false;
  caja.innerHTML = `<div class="admin__editor-cabeza"><h2>${esc(nombreDe(c))}</h2><span class="admin__chip">${esc(c)}</span>${malla.sucio ? '<span class="admin__chip admin__chip--riesgo">Sin guardar</span>' : ''}</div>
    ${puede('malla') ? `
    <div class="admin__bloque"><h3>Prerrequisitos <small>lo que hay que aprobar antes</small></h3>${fichas(pre, 'pre')}
      <div class="admin__sumar"><select id="malla-sumar-pre" aria-label="Agregar prerrequisito">${opciones([c, ...pre])}</select>
      <button class="admin__boton admin__boton--suave" data-accion="sumar-pre" type="button">Agregar</button></div></div>
    <div class="admin__bloque"><h3>Desbloquea <small>materias que la piden como prerrequisito</small></h3>${fichas(des, 'des')}
      <div class="admin__sumar"><select id="malla-sumar-des" aria-label="Agregar materia que desbloquea">${opciones([c, ...des])}</select>
      <button class="admin__boton admin__boton--suave" data-accion="sumar-des" type="button">Agregar</button></div></div>` : ''}
    ${puede('grupos') ? `
    <div class="admin__bloque"><h3>Grupo de WhatsApp</h3>
      <label class="admin__campo"><span>Enlace de invitación</span>
        <input id="malla-wpp" type="url" inputmode="url" placeholder="https://chat.whatsapp.com/…" value="${esc(malla.wpp[c])}"></label>
      <p class="admin__ayuda">Déjalo vacío para quitar el grupo. En WhatsApp: info del grupo → Invitar con enlace → Copiar.</p></div>` : ''}
    <div class="admin__acciones admin__acciones--editor">
      <small class="admin__pie">${pieCambio(fila)}</small>
      ${distinta(c) ? '<button class="admin__boton admin__boton--suave" data-accion="restaurar" type="button">Volver al original</button>' : ''}
      <button class="admin__boton" data-accion="guardar" type="button">Guardar y publicar</button>
    </div>`;
}

$('#malla-buscar').addEventListener('input', pintarMaterias);
$('#malla-filtro').addEventListener('change', pintarMaterias);
$('#malla-sugeridas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-codigo]');
  if (!b) return;
  if (malla.sucio && !confirm('Tienes cambios sin guardar en esta materia. ¿Descartarlos?')) return;
  if (malla.sucio) { malla.sucio = false; cargarMalla().then(() => abrirMateria(b.dataset.codigo)); return; }
  abrirMateria(b.dataset.codigo);
});
function abrirMateria(c) {
  malla.codigo = c;
  error('malla-error', '');
  pintarMaterias();
  pintarEditorMalla();
  $('#malla-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cambiar(fn) { fn(); malla.sucio = true; pintarEditorMalla(); }
$('#malla-editor').addEventListener('input', (e) => {
  if (e.target.id === 'malla-wpp') malla.sucio = true;
});
$('#malla-editor').addEventListener('click', async (e) => {
  const c = malla.codigo;
  const b = e.target.closest('button');
  if (!b) return;
  error('malla-error', '');
  if (b.dataset.quitarPre) cambiar(() => { malla.prer[c] = malla.prer[c].filter((x) => x !== b.dataset.quitarPre); });
  else if (b.dataset.quitarDes) cambiar(() => { const d = b.dataset.quitarDes; malla.prer[d] = malla.prer[d].filter((x) => x !== c); });
  else if (b.dataset.accion === 'sumar-pre') {
    const p = $('#malla-sumar-pre').value;
    if (!p) return;
    if (requiere(p, c)) { error('malla-error', `«${nombreDe(p)}» ya depende de «${nombreDe(c)}»: se formaría un ciclo imposible de cursar.`); return; }
    cambiar(() => malla.prer[c].push(p));
  } else if (b.dataset.accion === 'sumar-des') {
    const d = $('#malla-sumar-des').value;
    if (!d) return;
    if (requiere(c, d)) { error('malla-error', `«${nombreDe(c)}» ya depende de «${nombreDe(d)}»: se formaría un ciclo imposible de cursar.`); return; }
    cambiar(() => malla.prer[d].push(c));
  } else if (b.dataset.accion === 'restaurar') {
    if (!confirm('¿Volver esta materia a como está en el archivo original?')) return;
    cambiar(() => {
      if (puede('malla')) malla.prer[c] = [...materia(c).prerrequisitos];
      if (puede('grupos')) malla.wpp[c] = materia(c).whatsapp || '';
    });
  } else if (b.dataset.accion === 'guardar') guardarMalla(b);
});

async function guardarMalla(boton) {
  const c = malla.codigo;
  const caja = $('#malla-wpp');
  if (caja) {
    const v = caja.value.trim();
    if (v && !WPP_OK.test(v)) { error('malla-error', 'El enlace debe ser una invitación de grupo: https://chat.whatsapp.com/…'); caja.focus(); return; }
    malla.wpp[c] = v;
  }
  // Se publica solo lo que difiere del archivo; si nada difiere se borra la fila (vuelve al original)
  const difPre = {};
  const difWpp = {};
  malla.base.forEach((a) => {
    if (!igual(malla.prer[a.codigo], a.prerrequisitos)) difPre[a.codigo] = malla.prer[a.codigo];
    if (malla.wpp[a.codigo] !== (a.whatsapp || '')) difWpp[a.codigo] = malla.wpp[a.codigo];
  });
  const o = (x) => (Object.keys(x).length ? x : null);
  boton.disabled = true;
  try {
    if (puede('malla')) await guardarContenido(RUTA_MALLA, 'prerrequisitos', o(difPre));
    if (puede('grupos')) await guardarContenido(RUTA_MALLA, 'whatsapp', o(difWpp));
    malla.sucio = false;
    malla.filas = await publicado(RUTA_MALLA);
    pintarMaterias();
    pintarEditorMalla();
    avisar(`Publicado: ${nombreDe(c)}`);
  } catch (e) { error('malla-error', msg(e)); boton.disabled = false; }
}

/* ---------- Editor de documentos (calendario y convenios) ----------
   Dibuja un formulario a partir del JSON: textos, enlaces, fechas, listas con «Agregar» y «Quitar». */
const ETIQUETAS = {
  queEs: 'Qué es', quienes: 'Quién puede usarlo', incluye: 'Qué incluye', requisitos: 'Qué necesitas', pasos: 'Pasos',
  enlaces: 'Botones y enlaces', soporte: 'Soporte', consejos: 'Consejos', porConfirmar: 'Por confirmar', fuentes: 'Fuentes',
  texto: 'Texto', url: 'Enlace', principal: 'Botón principal', titulo: 'Título', nombre: 'Nombre', descripcion: 'Descripción',
  resumen: 'Resumen', actividad: 'Actividad', aplica: 'Aplica a', inicio: 'Inicio', fin: 'Fin (fecha límite)', nota: 'Nota',
  periodo: 'Periodo', grupos: 'Grupos de fechas', filas: 'Fechas', fuente: 'Fuente oficial', color: 'Color', categoria: 'Categoría',
  tipo: 'Tipo', icono: 'Icono', cinta: 'Cinta', lema: 'Lema', cursos: 'Cursos', materias: 'Materias', area: 'Área', datos: 'Datos',
  convenios: 'Convenios', tipos: 'Tipos', destacado: 'Aliado destacado', correo: 'Correo', telefono: 'Teléfono',
};
const etiqueta = (k) => (typeof k === 'number' ? `#${k + 1}` : ETIQUETAS[k] || String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (x) => x.toUpperCase()));
const esFecha = (k, v) => ['inicio', 'fin'].includes(k) || /^\d{4}-\d{2}-\d{2}$/.test(v ?? '');
const esUrl = (k) => /^(url|enlace|href|link|web)$/i.test(k);
const oculto = (k) => typeof k === 'string' && (k.startsWith('_') || k === 'id');
const vacio = (v) => (Array.isArray(v) ? [] : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, oculto(k) ? x : vacio(x)]))
  : typeof v === 'boolean' ? false : typeof v === 'number' ? 0 : v === null || /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : '');

function campoJSON(v, ruta, k) {
  const r = esc(JSON.stringify(ruta));
  const lab = esc(etiqueta(k));
  if (typeof v === 'boolean') return `<label class="admin__check"><input type="checkbox" data-ruta="${r}" ${v ? 'checked' : ''}> <span>${lab}</span></label>`;
  let input;
  if (esFecha(k, v)) input = `<input type="date" data-ruta="${r}" data-nulo value="${esc(v || '')}">`;
  else if (typeof v === 'number') input = `<input type="number" data-ruta="${r}" data-numero value="${v}">`;
  else if (esUrl(k)) input = `<input type="url" inputmode="url" data-ruta="${r}" data-url placeholder="https://…" value="${esc(v ?? '')}">`;
  else if (String(v ?? '').length > 70) input = `<textarea rows="3" data-ruta="${r}">${esc(v ?? '')}</textarea>`;
  else input = `<input type="text" data-ruta="${r}" ${v === null ? 'data-nulo' : ''} value="${esc(v ?? '')}">`;
  const ancho = !esFecha(k, v) && typeof v !== 'number' && (String(v ?? '').length > 30 || ['actividad', 'texto', 'titulo', 'descripcion', 'resumen', 'nota'].includes(k));
  return `<label class="admin__campo ${ancho ? 'admin__campo--ancho' : ''}"><span>${lab}</span>${input}</label>`;
}
function bloqueJSON(v, ruta, k) {
  if (Array.isArray(v)) {
    return `<fieldset class="admin__grupo"><legend>${esc(etiqueta(k))}</legend>
      ${v.map((x, i) => `<div class="admin__item">${bloqueJSON(x, [...ruta, i], i)}
        <button type="button" class="admin__boton admin__boton--suave admin__boton--chico" data-quitar="${esc(JSON.stringify([...ruta, i]))}" aria-label="Quitar ${esc(etiqueta(k))} ${i + 1}">Quitar</button></div>`).join('')}
      ${v[0] && typeof v[0] === 'object' && 'id' in v[0] ? '' // elementos con id (convenios, grupos) necesitan su propio archivo: no se crean desde aquí
        : `<button type="button" class="admin__boton admin__boton--suave admin__boton--chico admin__agregar-item" data-agregar="${esc(JSON.stringify(ruta))}">+ Agregar</button>`}</fieldset>`;
  }
  if (v && typeof v === 'object') {
    const hijos = Object.entries(v).filter(([kk]) => !oculto(kk)).map(([kk, x]) => bloqueJSON(x, [...ruta, kk], kk)).join('');
    if (!ruta.length) return hijos;
    return typeof k === 'number' ? `<div class="admin__objeto">${hijos}</div>` : `<fieldset class="admin__grupo"><legend>${esc(etiqueta(k))}</legend>${hijos}</fieldset>`;
  }
  return campoJSON(v, ruta, k);
}
const leerRuta = (doc, ruta) => ruta.reduce((o, k) => o[k], doc);

// Monta el editor en «caja». cfg = { ruta, seccion, errorId, original, fila }
function montarEditor(caja, cfg) {
  caja._ed = { ...cfg, doc: copia(cfg.fila ? cfg.fila.datos : cfg.original), sucio: false };
  pintarEditor(caja);
  if (caja._escucha) return;
  caja._escucha = true;
  caja.addEventListener('input', (e) => {
    const el = e.target.closest('[data-ruta]');
    if (!el) return;
    const ed = caja._ed;
    const ruta = JSON.parse(el.dataset.ruta);
    const padre = leerRuta(ed.doc, ruta.slice(0, -1));
    const val = el.type === 'checkbox' ? el.checked : 'numero' in el.dataset ? Number(el.value) : el.value;
    padre[ruta.at(-1)] = 'nulo' in el.dataset && val === '' ? null : val;
    ed.sucio = true;
  });
  caja.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const ed = caja._ed;
    error(ed.errorId, '');
    if (b.dataset.quitar) {
      const ruta = JSON.parse(b.dataset.quitar);
      leerRuta(ed.doc, ruta.slice(0, -1)).splice(ruta.at(-1), 1);
      ed.sucio = true;
      pintarEditor(caja);
    } else if (b.dataset.agregar) {
      const ruta = JSON.parse(b.dataset.agregar);
      const lista = leerRuta(ed.doc, ruta);
      lista.push(lista.length ? vacio(lista.at(-1)) : '');
      ed.sucio = true;
      pintarEditor(caja);
      caja.querySelector(`[data-ruta^="${esc(JSON.stringify([...ruta, lista.length - 1]).slice(0, -1))}"]`)?.focus();
    } else if (b.dataset.accion === 'restaurar') {
      if (!confirm('¿Volver al archivo original? Lo publicado se guarda en el historial.')) return;
      b.disabled = true;
      try {
        await guardarContenido(ed.ruta, ed.seccion, null);
        montarEditor(caja, { ...ed, fila: null });
        avisar('Se restauró el original');
      } catch (er) { error(ed.errorId, msg(er)); b.disabled = false; }
    } else if (b.dataset.accion === 'guardar') {
      const malo = [...caja.querySelectorAll('[data-url]')].find((i) => i.value.trim() && !URL_OK.test(i.value.trim()));
      if (malo) { error(ed.errorId, 'Hay un enlace que no empieza por https:// (también se aceptan mailto: y tel:).'); malo.focus(); return; }
      b.disabled = true;
      try {
        const datos = igual(ed.doc, ed.original) ? null : ed.doc;
        await guardarContenido(ed.ruta, ed.seccion, datos);
        const fila = (await publicado(ed.ruta))[ed.seccion] || null;
        montarEditor(caja, { ...ed, fila });
        avisar(datos ? 'Cambios publicados' : 'Quedó igual al original');
      } catch (er) { error(ed.errorId, msg(er)); b.disabled = false; }
    }
  });
}
function pintarEditor(caja) {
  const ed = caja._ed;
  caja.innerHTML = `<div class="admin__form-json">${bloqueJSON(ed.doc, [], '')}</div>
    <div class="admin__acciones admin__acciones--editor">
      <small class="admin__pie">${pieCambio(ed.fila)}</small>
      ${ed.fila ? '<button class="admin__boton admin__boton--suave" data-accion="restaurar" type="button">Volver al original</button>' : ''}
      <button class="admin__boton" data-accion="guardar" type="button">Guardar y publicar</button>
    </div>`;
}

/* ---------- Calendario ---------- */
async function cargarCalendario() {
  try {
    const [info, pub] = await Promise.all([archivo('info'), publicado('info')]);
    const original = info.guias.find((g) => g.id === 'calendario-academico')?.calendario;
    if (!original) throw new Error('No se encontró el calendario en data/info.json');
    montarEditor($('#calendario-editor'), { ruta: 'info', seccion: 'calendario', errorId: 'calendario-error', original, fila: pub.calendario || null });
  } catch (e) { error('calendario-error', msg(e)); }
}

/* ---------- Convenios ---------- */
async function cargarConvenios() {
  try {
    const indice = await archivo('convenios/indice');
    $('#convenios-elegir').innerHTML = `<option value="indice">Lista de convenios y aliado destacado</option>`
      + indice.convenios.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
    await abrirConvenio('indice');
  } catch (e) { error('convenios-error', msg(e)); }
}
async function abrirConvenio(id) {
  const ruta = `convenios/${id}`;
  error('convenios-error', '');
  try {
    const [original, pub] = await Promise.all([archivo(ruta), publicado(ruta)]);
    montarEditor($('#convenios-editor'), { ruta, seccion: 'documento', errorId: 'convenios-error', original, fila: pub.documento || null });
  } catch (e) { error('convenios-error', msg(e)); }
}
let convenioActual = 'indice';
$('#convenios-elegir').addEventListener('change', (e) => {
  if ($('#convenios-editor')._ed?.sucio && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) { e.target.value = convenioActual; return; }
  convenioActual = e.target.value;
  abrirConvenio(convenioActual);
});

window.addEventListener('beforeunload', (e) => {
  if (malla.sucio || $$('.admin__editor').some((c) => c._ed?.sucio)) e.preventDefault();
});

iniciar();
})();
