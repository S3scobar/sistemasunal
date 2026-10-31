#!/usr/bin/env node
/* ==============================================================================
   Genera el bloque cifrado (ofuscado) de js/supabase-config.js
   Autor: Santiago Escobar Arias · saescobara@unal.edu.co
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Uso: node tools/cifrar-config.js <url-del-proyecto> <anon-key>
   ADVERTENCIA: esto NO es seguridad real (el navegador debe poder descifrarlo).
   Solo evita que la URL y la clave se lean a simple vista. La protección real
   son las políticas RLS de Supabase. Usa SIEMPRE la clave "anon", nunca "service_role".
   ============================================================================== */
const [url, anonKey] = process.argv.slice(2);
if (!url || !anonKey) { console.error('Uso: node tools/cifrar-config.js <url> <anonKey>'); process.exit(1); }

// Se rechaza la clave service_role: daría control total de la base de datos a cualquiera
try {
  const rol = JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64url').toString()).role;
  if (rol && rol !== 'anon') { console.error(`✘ Esta clave tiene el rol "${rol}". No debe ir en el navegador. Usa la clave "anon".`); process.exit(1); }
} catch (_) { /* clave con otro formato */ }

const K = 'SEA-SIS-UNAL-2026';
const crudo = Buffer.from(JSON.stringify({ url, anonKey }));
const cif = Buffer.from(crudo.map((b, i) => b ^ K.charCodeAt(i % K.length)));
const b64 = cif.toString('base64');
const trozos = b64.match(/.{1,60}/g).map((t) => `'${t}'`).join(',\n  ');
console.log(`const _p = [\n  ${trozos},\n].join('');`);
