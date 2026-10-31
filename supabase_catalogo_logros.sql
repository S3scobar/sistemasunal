-- =========================================================================
-- CATÁLOGO DE LOGROS VÁLIDOS + LLAVE FORÁNEA
-- Autor: Santiago Escobar Arias · Firma: SEA-SIS-UNAL-2026-AUTH-F45123
-- Evita que alguien inserte desde la consola logros inventados
-- (ej. "hola-escobar-precioso") y que contaminen las estadísticas.
-- Ejecuta UNA VEZ en el SQL Editor de Supabase.
-- OJO: cada logro nuevo que agregues a data/logros.json debes añadirlo también
--      aquí:  insert into public.logros_catalogo (id) values ('nuevo-id');
-- =========================================================================
create table if not exists public.logros_catalogo (id text primary key);
alter table public.logros_catalogo enable row level security;  -- sin políticas: no se lee por la API

insert into public.logros_catalogo (id) values
  ('primer-commit'),
  ('press-start'),
  ('checkpoint-80'),
  ('de-los-errores-se-aprende'),
  ('version-beta'),
  ('polyglot'),
  ('codigo-abierto'),
  ('arbol-de-habilidades'),
  ('build-personalizada'),
  ('overclocking'),
  ('teorema-demostrado'),
  ('senior-developer'),
  ('el-fin-de-la-guerra'),
  ('release-candidate'),
  ('nucleo-del-sistema'),
  ('jefe-final'),
  ('el-elegido'),
  ('uno-en-un-millon'),
  ('big-six'),
  ('modo-ironman'),
  ('the-completionist'),
  ('no-hit-run'),
  ('speedrun')
on conflict (id) do nothing;

-- 1. Borra las filas con ids que no existen en el catálogo
delete from public.logros_desbloqueados
where logro_id not in (select id from public.logros_catalogo);

-- 2. Llave foránea: de ahora en adelante solo se aceptan logros del catálogo
alter table public.logros_desbloqueados
  drop constraint if exists logros_desbloqueados_logro_fk;
alter table public.logros_desbloqueados
  add constraint logros_desbloqueados_logro_fk
  foreign key (logro_id) references public.logros_catalogo (id)
  on update cascade on delete cascade;

-- Prueba: debe fallar con "violates foreign key constraint"
-- insert into public.logros_desbloqueados (usuario_id, logro_id)
--   values (auth.uid(), 'hola-escobar-precioso');
