#!/usr/bin/env node
/* ==============================================================================
   PORTAL WEB OFICIAL · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL SEDE MEDELLÍN
   Genera supabase/catalogo-malla.sql a partir de data/malla/*.json
   Autor: Santiago Escobar Arias · saescobara@unal.edu.co
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c

   Uso:  npm run build:sql
   El servidor (supabase/promocion.sql) verifica la historia académica con el mismo catálogo que usa el
   navegador. Cada vez que cambie la malla (o data/malla/verificacion.json), vuelve a generar este archivo
   y ejecútalo en Supabase → SQL Editor.
   ============================================================================== */
const fs = require('fs');
const path = require('path');
const { construirCatalogo } = require('../js/avance-lector.js');

const leer = (ruta) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', ruta), 'utf8'));
const asignaturas = leer('data/malla/asignaturas.json');
const componentes = leer('data/malla/componentes.json');
const verificacion = leer('data/malla/verificacion.json');

const catalogo = construirCatalogo(asignaturas, componentes, verificacion);
const literal = (t) => `'${String(t).replace(/'/g, "''")}'`;
// El servidor compara el texto sin tildes y en mayúsculas (así lo normaliza validar_historia_sistemas)
const sinTildes = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const filasCatalogo = [...catalogo.asignaturas.entries()]
  .map(([codigo, a]) => `  (${literal(codigo.toUpperCase())}, ${literal(a.nombre)}, ${a.creditos === null ? 'null' : a.creditos}, ${literal(a.grupo)})`);
const filasExigidos = Object.entries(catalogo.exigidos)
  .map(([tipologia, exigidos]) => `  (${literal(sinTildes(tipologia).toUpperCase())}, ${exigidos})`);

const sql = `-- ==============================================================================
-- CATÁLOGO DE LA MALLA · GENERADO por tools/generar-sql-malla.js (npm run build:sql). No editar a mano.
-- Plan ${catalogo.plan} · ${catalogo.asignaturas.size} asignaturas · requiere haber ejecutado supabase/promocion.sql
-- Autor: Santiago Escobar Arias · SEA-SIS-UNAL-2026-AUTH-F45123
-- ==============================================================================

begin;

delete from public.malla_catalogo;
insert into public.malla_catalogo (codigo, nombre, creditos, grupo) values
${filasCatalogo.join(',\n')};

delete from public.malla_exigidos;
insert into public.malla_exigidos (tipologia, exigidos) values
${filasExigidos.join(',\n')};

commit;
`;

const salida = path.resolve(__dirname, '..', 'supabase', 'catalogo-malla.sql');
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, sql, 'utf8');
console.log(`✔ supabase/catalogo-malla.sql generado (${catalogo.asignaturas.size} asignaturas, ${filasExigidos.length} tipologías)`);
