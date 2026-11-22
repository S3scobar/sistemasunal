/* =============================================================
   MINIJUEGOS · consola retro con Snake y Tetris
   La consola no sabe de qué trata el juego: pone la pantalla, los controles (teclado, cruceta, botones y
   deslizar el dedo) y el sonido. Cada juego trae su cartucho (snake.js, defrag.js).
   Juego libre: no se guardan puntajes ni récords, ni en el navegador ni en el servidor.
   ============================================================= */

import { SNAKE_CARTRIDGE } from './snake.js';
import { DEFRAG_CARTRIDGE } from './defrag.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Los juegos, en orden. "nombre" es lo que se ve en la pestaña y en el letrero.
const JUEGOS = [
  { ...SNAKE_CARTRIDGE, nombre: 'Snake', numero: 1 },
  { ...DEFRAG_CARTRIDGE, nombre: 'Tetris', numero: 2 },
];

const consola = $('#console');
const pantalla = $('#console-screen');
const lienzoBase = $('#console-canvas');
const pad = (n) => String(Math.max(0, n)).padStart(4, '0');

let cartucho = null;
let run = null;
const runs = new Map();
const lienzos = new Map();
let pantallaVisible = false;

/* ---------- Sonido 8-bit con Web Audio ---------- */
const sonido = {
  on: true,
  ctx: null,
  NOTAS: {
    start: [[523, 0.07, 0], [784, 0.1, 0.08]],
    bug: [[880, 0.04, 0], [1320, 0.06, 0.04]],
    over: [[392, 0.12, 0, 'sawtooth'], [294, 0.14, 0.13, 'sawtooth'], [196, 0.32, 0.28, 'sawtooth']],
    record: [[523, 0.08, 0], [659, 0.08, 0.09], [784, 0.08, 0.18], [1047, 0.24, 0.27]],
    paused: [[440, 0.06, 0]],
  },
  play(nombre) {
    if (!this.on || !this.NOTAS[nombre]) return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      for (const [freq, dur, retraso, onda = 'square'] of this.NOTAS[nombre]) {
        const osc = this.ctx.createOscillator();
        const vol = this.ctx.createGain();
        osc.type = onda;
        osc.frequency.value = freq;
        vol.gain.setValueAtTime(0.05, t + retraso);
        vol.gain.exponentialRampToValueAtTime(0.0001, t + retraso + dur);
        osc.connect(vol).connect(this.ctx.destination);
        osc.start(t + retraso);
        osc.stop(t + retraso + dur + 0.02);
      }
    } catch { /* sin Web Audio el juego sigue en silencio */ }
  },
  toggle() {
    this.on = !this.on;
    pintarSonido();
    if (this.on) this.play('paused');
  },
};

function pintarSonido() {
  $('#console-sound').textContent = sonido.on ? '♪ ON' : '♪ OFF';
  runs.forEach((r) => r.setSound?.(sonido.on));
}

/* ---------- Una partida por juego, cada una con su canvas ---------- */
function crearRun(juego) {
  const canvas = lienzos.size ? lienzoBase.cloneNode(false) : lienzoBase;
  if (canvas !== lienzoBase) {
    canvas.removeAttribute('id');
    [...lienzos.values()].at(-1).after(canvas);
  }
  lienzos.set(juego.numero, canvas);

  let creada = null;
  const activa = () => creada !== null && creada === run;
  creada = juego.create(canvas, {
    onScoreChange: (v) => { if (activa()) $('#console-score').textContent = pad(v); },
    onEnd: (v, gano, detalle) => { if (activa()) terminar(v, detalle, gano); },
    onStateChange: () => {
      if (!activa()) { if (creada.state === 'playing') creada.pause(); return; }
      pintarEstado();
      if (run.state === 'playing' && (document.hidden || !pantallaVisible)) pausarSiJuega();
    },
    onLoadProgress: () => {},
    onError: (m) => { if (activa()) avisar(m); },
    requestPause: () => { if (activa()) pausarSiJuega(); },
    playSound: (n) => { if (activa()) sonido.play(n); },
  });
  if ('ResizeObserver' in window) new ResizeObserver(() => creada.resize()).observe(canvas);
  creada.setSound?.(sonido.on);
  return creada;
}

function pintarEstado() { consola.dataset.state = run.state; }
function avisar(m) { const n = $('#start-notice'); n.textContent = m; n.hidden = !m; }

let terminoEn = 0;
const retardoFin = () => cartucho.endDelay ?? 900;

function botonPrincipal() {
  if (run.state === 'loading') return;
  if (run.state === 'over' && performance.now() - terminoEn < retardoFin()) return;
  if (run.state === 'playing') { run.pause(); sonido.play('paused'); }
  else if (run.state === 'paused') run.resume();
  else { avisar(''); run.start(); mostrarConsolaCompleta(); }
  pintarEstado();
}

function mostrarConsolaCompleta() {
  const r = consola.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) {
    consola.scrollIntoView({ block: r.height > window.innerHeight ? 'start' : 'center', behavior: 'smooth' });
  }
  pantalla.focus({ preventScroll: true });
}

function pausarSiJuega() {
  if (run.state !== 'playing') return;
  run.pause();
  soltarControles();
  pintarEstado();
}

function terminar(puntos, detalle = '', gano = true) {
  const perdio = gano ? null : cartucho.end?.lost;
  terminoEn = performance.now();
  soltarControles();
  pintarEstado();
  $('#end-title').textContent = perdio?.title || cartucho.end?.title || 'Fin del juego';
  $('#end-score').textContent = pad(puntos);
  $('#end-detail').textContent = detalle;
  $('#end-detail').hidden = !detalle;
  $('#end-status').textContent = puntos <= 0
    ? (perdio?.status || cartucho.end?.noPoints || 'Sin puntos esta vez. ¡Otra!')
    : 'Juego libre: no se guarda el puntaje.';
}

/* ---------- Cambiar de juego ---------- */
const finales = new Map();
function guardarFinal() {
  finales.set(cartucho.numero, {
    titulo: $('#end-title').textContent, puntos: $('#end-score').textContent,
    detalle: $('#end-detail').textContent, estado: $('#end-status').textContent,
  });
}
function restaurarFinal() {
  const f = finales.get(cartucho.numero);
  $('#end-title').textContent = f?.titulo || cartucho.end?.title || 'Fin del juego';
  $('#end-score').textContent = f?.puntos || '0000';
  $('#end-detail').textContent = f?.detalle || '';
  $('#end-detail').hidden = !f?.detalle;
  $('#end-status').textContent = f?.estado || '';
}

function elegirJuego(juego) {
  if (juego === cartucho) return;
  if (run) { soltarControles(); run.halt?.(); if (run.state === 'playing') run.pause(); guardarFinal(); }
  cartucho = juego;
  if (!runs.has(juego.numero)) runs.set(juego.numero, crearRun(juego));
  run = runs.get(juego.numero);
  lienzos.forEach((c, n) => { c.hidden = n !== juego.numero; });
  vestirConsola();
  restaurarFinal();
  avisar('');
  $('#console-score').textContent = pad(run.score ?? 0);
  pintarSonido();
  pintarEstado();
  pintarPestanas();
  run.resize();
}

function vestirConsola() {
  const { splash = {}, buttons, controls = {} } = cartucho;
  consola.dataset.game = cartucho.id;
  consola.style.setProperty('--end-delay', `${retardoFin()}ms`);
  $('#console-nombre').textContent = cartucho.nombre;
  $('#start-text').textContent = splash.text || '';
  $('#start-items').innerHTML = typeof splash.items === 'function' ? splash.items() : splash.items || '';
  $('#keyboard-help').textContent = splash.keyboardHelp || '';
  $('#touch-help').textContent = splash.touchHelp || '';
  const filas = (rows = []) => rows.map(([k, a]) => `<dt>${k}</dt><dd>${a}</dd>`).join('');
  $('#pause-keyboard').innerHTML = filas(controls.keyboard);
  $('#pause-touch').innerHTML = filas(controls.touch);
  $('#button-a-label').textContent = buttons?.a || 'Jugar';
  $('#button-a').setAttribute('aria-label', buttons ? `A: ${buttons.a.toLowerCase()}` : 'A: jugar o pausar');
  $('#button-b-label').textContent = buttons?.b || 'Sonido';
  $('#button-b').setAttribute('aria-label', buttons ? `B: ${buttons.b.toLowerCase()}` : 'B: sonido');
}

function pintarPestanas() {
  const caja = $('#console-weeks');
  caja.innerHTML = JUEGOS.map((j) => `<button class="console__week" type="button" data-juego="${j.numero}" aria-pressed="${j === cartucho}">${j.nombre}</button>`).join('');
  $$('.console__week', caja).forEach((b) => b.addEventListener('click', () => elegirJuego(JUEGOS.find((j) => String(j.numero) === b.dataset.juego))));
}

/* ---------- Teclado ---------- */
function alTeclaAbajo(e) {
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if ($('dialog[open]')) return;
  const code = e.code;
  const jugando = run.state === 'playing';
  const enfocada = consola.contains(document.activeElement);
  const esInicio = code === 'Space' || code === 'Enter';
  const sinFoco = document.activeElement === document.body || !document.activeElement;
  if (!jugando && !enfocada && !(esInicio && sinFoco && pantallaVisible)) return;

  if (code === 'KeyP' || code === 'Escape') { if (jugando) { e.preventDefault(); botonPrincipal(); } return; }
  if (code === 'KeyM') { sonido.toggle(); return; }
  if (jugando && run.key(code, true)) { e.preventDefault(); return; }
  if (esInicio) {
    if (e.target.closest?.('button')) return;
    if (e.repeat) return;
    e.preventDefault();
    botonPrincipal();
  } else if (enfocada && code.startsWith('Arrow')) {
    e.preventDefault();
  }
}
document.addEventListener('keydown', alTeclaAbajo);
document.addEventListener('keyup', (e) => { if (run.key(e.code, false) && run.state === 'playing') e.preventDefault(); });

/* ---------- Cruceta ---------- */
const cruceta = $('.dpad');
let punteroCruceta = null;
let crucetaPulsada = new Set();

function capturar(el, e) { try { el.setPointerCapture?.(e.pointerId); } catch { /* puntero ya inactivo */ } }

function direcciones(e) {
  const r = cruceta.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const d = new Set();
  if (Math.hypot(dx, dy) < r.width * 0.12) return d;
  if (cartucho.dpad !== 'diagonal') {
    if (Math.abs(dx) > Math.abs(dy)) d.add(dx > 0 ? 'right' : 'left'); else d.add(dy > 0 ? 'down' : 'up');
    return d;
  }
  const a = Math.atan2(dy, dx) * 180 / Math.PI;
  if (a > -67.5 && a < 67.5) d.add('right');
  if (a > 22.5 && a < 157.5) d.add('down');
  if (a > 112.5 || a < -112.5) d.add('left');
  if (a > -157.5 && a < -22.5) d.add('up');
  return d;
}

function pulsarCruceta(sig) {
  for (const d of crucetaPulsada) if (!sig.has(d)) run.press(d, false);
  for (const d of sig) if (!crucetaPulsada.has(d)) run.press(d, true);
  crucetaPulsada = sig;
  $$('.dpad__button').forEach((b) => b.classList.toggle('dpad__button--pressed', sig.has(b.dataset.direction)));
}

cruceta.addEventListener('pointerdown', (e) => {
  if (punteroCruceta !== null) return;
  e.preventDefault();
  punteroCruceta = e.pointerId;
  capturar(cruceta, e);
  pulsarCruceta(direcciones(e));
});
cruceta.addEventListener('pointermove', (e) => { if (e.pointerId === punteroCruceta) pulsarCruceta(direcciones(e)); });
function soltarCruceta(e) { if (e.pointerId !== punteroCruceta) return; punteroCruceta = null; pulsarCruceta(new Set()); }
cruceta.addEventListener('pointerup', soltarCruceta);
cruceta.addEventListener('pointercancel', soltarCruceta);
cruceta.addEventListener('lostpointercapture', soltarCruceta);
$$('.dpad__button').forEach((b) => b.addEventListener('click', (e) => {
  if (e.detail !== 0) return;   // detail 0 = clic hecho con el teclado
  run.press(b.dataset.direction, true);
  run.press(b.dataset.direction, false);
}));

/* ---------- Botones A, B y Start ---------- */
const sueltaBotones = [];
function conectarBoton(el, boton, accion) {
  let sostenido = false;
  const esDelJuego = () => cartucho.buttons && run.state === 'playing';
  const soltar = () => { if (!sostenido) return; sostenido = false; run.press(boton, false); };
  el.addEventListener('pointerdown', (e) => {
    if (!esDelJuego()) return;
    e.preventDefault(); capturar(el, e); sostenido = true; run.press(boton, true);
  });
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('lostpointercapture', soltar);
  el.addEventListener('click', (e) => {
    if (esDelJuego()) { if (e.detail === 0) { run.press(boton, true); run.press(boton, false); } return; }
    accion?.();
  });
  sueltaBotones.push(soltar);
}
conectarBoton($('#button-a'), 'a', botonPrincipal);
conectarBoton($('#button-b'), 'b', () => { if (!cartucho.buttons) sonido.toggle(); });
$('#button-start').addEventListener('click', botonPrincipal);

function soltarControles() {
  if (crucetaPulsada.size) pulsarCruceta(new Set());
  sueltaBotones.forEach((s) => s());
}

consola.addEventListener('contextmenu', (e) => { if (e.target.closest('button, .console__screen')) e.preventDefault(); });

/* ---------- Tocar y deslizar sobre la pantalla ---------- */
let toque = null;
let deslizo = false;
const DISTANCIA = 22;
pantalla.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  toque = { x: e.clientX, y: e.clientY };
  deslizo = false;
});
pantalla.addEventListener('pointermove', (e) => {
  if (!toque || run.state !== 'playing') return;
  const dx = e.clientX - toque.x;
  const dy = e.clientY - toque.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DISTANCIA) return;
  const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  run.press(d, true);
  run.press(d, false);
  toque = { x: e.clientX, y: e.clientY };
  deslizo = true;
});
pantalla.addEventListener('pointerup', (e) => {
  if (toque && !deslizo && !e.target.closest('button')) {
    if (run.state === 'playing') run.tap?.(); else botonPrincipal();
  }
  toque = null;
});
pantalla.addEventListener('pointercancel', () => { toque = null; });

/* Se pausa sola si te vas a otra pestaña o ventana, o si bajas y la pantalla sale de vista */
document.addEventListener('visibilitychange', () => { if (document.hidden) pausarSiJuega(); });
window.addEventListener('blur', pausarSiJuega);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entrada]) => {
    pantallaVisible = entrada.intersectionRatio >= 0.5;
    if (!pantallaVisible) pausarSiJuega();
  }, { threshold: [0, 0.5] }).observe(pantalla);
}
if (typeof ResizeObserver === 'undefined') window.addEventListener('resize', () => run.resize());

// Snake y Tetris escriben con la fuente de píxeles: se redibujan cuando termina de cargar
document.fonts?.load("10px 'Press Start 2P'").then(() => run.draw()).catch(() => {});

elegirJuego(JUEGOS[0]);
