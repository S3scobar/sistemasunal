-- =========================================================================
-- ESQUEMA SQL PARA SUPABASE · INGENIERÍA DE SISTEMAS E INFORMÁTICA UNAL
-- Ejecuta este script en el SQL Editor de tu proyecto en https://supabase.com
-- =========================================================================

-- 1. Crear tabla de perfiles de estudiantes
create table if not exists public.perfiles (
  id uuid references auth.users on delete cascade not null primary key,
  correo text not null unique,
  nombre text,
  historia_texto text,
  ritmo integer,
  creado_en timestamp with time zone default now(),
  actualizado_en timestamp with time zone default now()
);

-- 2. Habilitar Row Level Security (RLS) para proteger los datos
alter table public.perfiles enable row level security;

-- 3. Políticas de seguridad: cada estudiante solo puede consultar y modificar sus datos
create policy "Los estudiantes pueden ver su propio perfil"
  on public.perfiles for select
  using (auth.uid() = id);

create policy "Los estudiantes pueden insertar su propio perfil"
  on public.perfiles for insert
  with check (auth.uid() = id);

create policy "Los estudiantes pueden actualizar su propio perfil"
  on public.perfiles for update
  using (auth.uid() = id);

-- 4. Tabla para registrar los logros desbloqueados por cada estudiante
-- Esto permite calcular en tiempo real qué porcentaje de la comunidad tiene cada logro
create table if not exists public.logros_desbloqueados (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users on delete cascade not null,
  logro_id text not null,
  desbloqueado_en timestamp with time zone default now(),
  unique (usuario_id, logro_id)
);

-- Habilitar RLS en la tabla de logros
alter table public.logros_desbloqueados enable row level security;

-- Cualquier usuario puede consultar las estadísticas agregadas de la comunidad
create policy "Permitir lectura publica de logros para estadísticas globales"
  on public.logros_desbloqueados for select
  using (true);

-- Cada estudiante solo puede insertar o modificar sus propios logros
create policy "Los estudiantes pueden registrar sus logros desbloqueados"
  on public.logros_desbloqueados for insert
  with check (auth.uid() = usuario_id);

create policy "Los estudiantes pueden eliminar sus logros al reiniciar datos"
  on public.logros_desbloqueados for delete
  using (auth.uid() = usuario_id);
