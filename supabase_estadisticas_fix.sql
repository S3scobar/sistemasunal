-- =========================================================================
-- CORRECCIÓN · Porcentajes dinámicos de logros
-- Autor: Santiago Escobar Arias · Firma: SEA-SIS-UNAL-2026-AUTH-F45123
-- Ejecuta este script en el SQL Editor de Supabase (reemplaza la función anterior).
-- Cambio: el total de estudiantes ya NO depende de la tabla "perfiles" (donde
-- solo hay fila si la persona guardó su historia); se toma el mayor entre
-- cuentas registradas, perfiles y personas con al menos un logro.
-- =========================================================================
drop function if exists public.estadisticas_logros();

create or replace function public.estadisticas_logros()
returns table (logro_id text, total bigint, porcentaje numeric)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select greatest(
      (select count(*) from auth.users),
      (select count(*) from public.perfiles),
      (select count(distinct usuario_id) from public.logros_desbloqueados)
    )::numeric as n
  )
  select l.logro_id::text,
         count(*)::bigint,
         round(count(*)::numeric / (select n from t) * 100, 1)
  from public.logros_desbloqueados l
  where (select n from t) >= 5
  group by l.logro_id;
$$;

revoke all on function public.estadisticas_logros() from public, anon;
grant execute on function public.estadisticas_logros() to authenticated;

-- Prueba (debe devolver filas con porcentajes; ej. primer-commit ≈ 100):
-- select * from public.estadisticas_logros() order by porcentaje desc;
