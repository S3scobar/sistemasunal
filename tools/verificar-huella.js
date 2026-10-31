#!/usr/bin/env node
/* ==============================================================================
   Verificador de huella de autoría — Ingeniería de Sistemas e Informática · UNAL Medellín
   Autor: Santiago Escobar Arias · saescobara@unal.edu.co
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c

   Uso:  node tools/verificar-huella.js <carpeta-o-archivo>
   Revisa una copia del proyecto y muestra qué marcas del autor conserva:
   firma, huella SHA-256, nombre, atributos en <html> y la marca invisible
   (caracteres de ancho cero) escondida en los textos.
   ============================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FIRMA = 'SEA-SIS-UNAL-2026-AUTH-F45123';
const SHA = 'f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c';
const IDENTIDAD = 'Santiago Escobar Arias|saescobara@unal.edu.co|sistemasunal|UNAL-MEDELLIN|2026';
const EXT = new Set(['.html', '.js', '.css', '.json', '.md', '.txt']);
const IGNORAR = new Set(['node_modules', '.git']);

const raiz = process.argv[2];
if (!raiz) { console.error('Uso: node tools/verificar-huella.js <carpeta-o-archivo>'); process.exit(1); }

// 1. La huella publicada corresponde a la identidad del autor
const calculada = crypto.createHash('sha256').update(IDENTIDAD).digest('hex');
console.log(`Huella publicada vs. calculada: ${calculada === SHA ? 'COINCIDE ✔' : 'NO COINCIDE ✘'}`);

// 2. Recorrer archivos
function archivos(ruta) {
  const st = fs.statSync(ruta);
  if (st.isFile()) return EXT.has(path.extname(ruta)) ? [ruta] : [];
  return fs.readdirSync(ruta).flatMap((n) => (IGNORAR.has(n) ? [] : archivos(path.join(ruta, n))));
}

// 3. Decodificar marcas invisibles: ‍ + bits (​=0, ‌=1) + ‍
function marcasInvisibles(texto) {
  const hallazgos = [];
  const re = /‍([​‌]{8,})‍/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const bits = [...m[1]].map((c) => (c === '​' ? '0' : '1')).join('');
    const bytes = bits.match(/.{8}/g) || [];
    hallazgos.push(bytes.map((b) => String.fromCharCode(parseInt(b, 2))).join(''));
  }
  return hallazgos;
}

const lista = archivos(raiz);
const res = { firma: [], sha: [], nombre: [], atributo: [], invisible: [] };
for (const f of lista) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes(FIRMA)) res.firma.push(f);
  if (t.includes(SHA)) res.sha.push(f);
  if (t.includes('Santiago Escobar Arias')) res.nombre.push(f);
  if (/data-author="Santiago Escobar Arias"/.test(t)) res.atributo.push(f);
  const inv = marcasInvisibles(t);
  if (inv.length) res.invisible.push(`${f}  →  "${inv[0]}"`);
}

const linea = (titulo, arr) => console.log(`\n${titulo}: ${arr.length} archivo(s)${arr.length ? '\n  - ' + arr.slice(0, 12).join('\n  - ') + (arr.length > 12 ? `\n  … y ${arr.length - 12} más` : '') : ''}`);
console.log(`\nArchivos revisados: ${lista.length}`);
linea('Firma de autoría', res.firma);
linea('Huella SHA-256', res.sha);
linea('Nombre del autor', res.nombre);
linea('Atributos data-author en <html>', res.atributo);
linea('Marca invisible (ancho cero) decodificada', res.invisible);
console.log(res.firma.length || res.invisible.length
  ? '\nResultado: esta copia CONSERVA marcas del autor original.'
  : '\nResultado: no se encontraron marcas (pudieron ser eliminadas).');
