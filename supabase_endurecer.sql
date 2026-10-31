-- =========================================================================
-- ENDURECIMIENTO DE SEGURIDAD · INGENIERÍA DE SISTEMAS E INFORMÁTICA UNAL
-- Autor: Santiago Escobar Arias · Firma: SEA-SIS-UNAL-2026-AUTH-F45123
-- =========================================================================

-- 1. Los logros desbloqueados dejan de ser legibles por todo el mundo.
--    Antes, cualquiera con la clave anon podía listar qué usuario (uuid) tenía qué logro.
drop policy if exists "Permitir lectura publica de logros para estadísticas globales" on public.logros_desbloqueados;
drop policy if exists "Cada estudiante ve solo sus logros" on public.logros_desbloqueados;
create policy "Cada estudiante ve solo sus logros"
  on public.logros_desbloqueados for select
  using (auth.uid() = usuario_id);

-- 2. Estadísticas de la comunidad: solo porcentajes agregados, sin filas ni usuarios.
--    Se omiten mientras haya menos de 5 estudiantes para no identificar a nadie.
create or replace function public.estadisticas_logros()
returns table (logro_id text, total bigint, porcentaje numeric)
language sql
stable
security definer
set search_path = public
as $$
  with t as (select count(*)::numeric as n from public.perfiles)
  select l.logro_id,
         count(*) as total,
         round(count(*)::numeric / (select n from t) * 100, 1) as porcentaje
  from public.logros_desbloqueados l
  where (select n from t) >= 5
  group by l.logro_id;
$$;

revoke all on function public.estadisticas_logros() from public, anon;
grant execute on function public.estadisticas_logros() to authenticated;

-- 3. Solo correos institucionales pueden crear cuenta (control en el SERVIDOR,
--    no solo en el formulario, que cualquiera puede saltarse desde la consola).
create or replace function public.solo_correos_unal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or lower(new.email) not like '%@unal.edu.co' then
    raise exception 'Solo se permiten correos institucionales @unal.edu.co';
  end if;
  return new;
end;
$$;

drop trigger if exists exigir_correo_unal on auth.users;
create trigger exigir_correo_unal
  before insert on auth.users
  for each row execute function public.solo_correos_unal();

-- 4. Verificación rápida (opcional): deben salir las tablas con RLS activo
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
