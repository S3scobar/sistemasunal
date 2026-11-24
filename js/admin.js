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
  $('#tab-admins').hidden = !yo.superadmin;
  mostrar('admin-panel');
  const primera = $$('[role="tab"]').find((t) => !t.hidden);
  if (!primera) { avisar('Tu cuenta es administradora pero todavía no tiene secciones activas.'); return; }
  abrirPestana(primera);
  if (puede('strikes')) cargarStrikes();
  if (yo.superadmin) cargarAdmins();
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
  return `<li class="admin__miembro ${ban ? 'is-ban' : ''}" data-id="${esc(m.id)}">
    <div class="admin__miembro-fila">
      <div class="admin__miembro-id">
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
        ${h.anulada_en ? '' : `<button class="admin__boton admin__boton--suave admin__boton--chico" data-accion="anular" data-sancion="${esc(h.id)}" type="button">Anular</button>`}
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
  if (b.dataset.accion === 'sancionar') {
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
});

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

iniciar();
})();
