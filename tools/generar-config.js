#!/usr/bin/env node
/* ==============================================================================
   PORTAL WEB OFICIAL · INGENIERÍA DE SISTEMAS E INFORMÁTICA · UNAL SEDE MEDELLÍN
   Genera js/config.js a partir de variables de entorno (.env o process.env)
   Autor: Santiago Escobar Arias · saescobara@unal.edu.co
   Firma de autoría: SEA-SIS-UNAL-2026-AUTH-F45123
   Huella SHA-256: f45123e9c6328f942d84c447bcbfbc58f68513a98ed11862fca064413f831c2c
   ============================================================================== */
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const env = {};

if (fs.existsSync(envPath)) {
  const lineas = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const linea of lineas) {
    const m = linea.match(/^\s*([\w]+)\s*=\s*(.*)?\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const url = (process.env.SUPABASE_URL || env.SUPABASE_URL || '').trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();

// Validación de seguridad: rechazar claves service_role o secretas
if (anonKey.startsWith('sb_secret_')) {
  console.error('✘ Error de seguridad: Clave secreta detectada. Usa únicamente la clave anon pública.');
  process.exit(1);
}

try {
  const partes = anonKey.split('.');
  if (partes.length === 3) {
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    if (payload.role && payload.role !== 'anon') {
      console.error(`✘ Error de seguridad: Rol "${payload.role}" detectado. No uses service_role en el cliente.`);
      process.exit(1);
    }
  }
} catch (_) {}

const contenido = `/* ==============================================================================
   Configuración generada automáticamente desde variables de entorno (.env)
   NO editar manualmente este archivo ni incluirlo en el control de versiones.
   ============================================================================== */
window.CONFIG_SUPABASE = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
};
`;

const outputPath = path.resolve(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outputPath, contenido, 'utf8');
console.log('✔ js/config.js generado exitosamente');
