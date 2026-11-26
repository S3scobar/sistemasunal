-- ==============================================================================
-- CÓDIGO ESPECIAL DE PROMOCIÓN (Math con Jean) · Ingeniería de Sistemas e Informática · UNAL Medellín
-- Autoría: Santiago Escobar Arias · SEA-SIS-UNAL-2026-AUTH-F45123
--
-- Cómo instalarlo (una sola vez, en Supabase → SQL Editor):
--   1. Ejecuta este archivo completo.
--   2. Ejecuta supabase/catalogo-malla.sql (lo genera `npm run build:sql` desde data/malla/*.json;
--      hay que volver a ejecutarlo cada vez que cambie la malla).
--
-- Qué hace:
--   · Guarda un código por estudiante (SIS-XXXX-XXXX-XXXX) que SOLO el servidor puede crear.
--   · Antes de entregarlo, el servidor vuelve a verificar la historia académica guardada en `perfiles`
--     con las mismas reglas del navegador (js/avance-lector.js): encabezado del plan, cada asignatura de
--     Fundamentación/Disciplinar/Trabajo de grado dentro de la malla, créditos exigidos y créditos cursados.
--   · El nombre y el correo de la tarjeta salen de la cuenta de Google UNAL (no se pueden escribir a mano).
--   · Cualquiera puede comprobar un código en verificar.html (función verificar_codigo_promocion).
-- ==============================================================================

-- ---------- Tablas ----------

create table if not exists public.malla_catalogo (
  codigo   text primary key,
  nombre   text not null,
  creditos int,
  grupo    text not null check (grupo in ('fundamentacion', 'disciplinar'))
);

create table if not exists public.malla_exigidos (
  tipologia text primary key,
  exigidos  int not null
);

create table if not exists public.codigos_promocion (
  usuario_id          uuid primary key references auth.users (id) on delete cascade,
  codigo              text not null unique,
  correo              text not null,
  nombre              text not null,
  emitido_en          timestamptz not null default now(),
  verificaciones      int not null default 0,
  ultima_verificacion timestamptz,
  revocado            boolean not null default false   -- para desactivar un código a mano desde el panel de Supabase
);

-- Nadie lee ni escribe estas tablas desde el navegador: solo las funciones de abajo (security definer)
alter table public.malla_catalogo    enable row level security;
alter table public.malla_exigidos    enable row level security;
alter table public.codigos_promocion enable row level security;
revoke all on table public.malla_catalogo, public.malla_exigidos, public.codigos_promocion from anon, authenticated;


-- ---------- Verificación de la historia académica (réplica de js/avance-lector.js) ----------
-- Devuelve NULL si la historia es de Sistemas; si no, la razón.

create or replace function public.validar_historia_sistemas(p_texto text, p_correo text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_tipos       constant text := 'DISCIPLINAR OBLIGATORIA|DISCIPLINAR OPTATIVA|FUND\. OBLIGATORIA|FUND\. OPTATIVA|TRABAJO DE GRADO|LIBRE ELECCION|NIVELACION';
  v_sin_malla   constant text[] := array['LIBRE ELECCION', 'NIVELACION'];
  t             text;
  v_fila        record;
  v_cat         record;
  v_usuario     text;
  v_esperado    text;
  v_detectadas  int;
  v_leidas      int := 0;
  v_legadas     int := 0;      -- asignaturas de planes anteriores que ya no están en la malla
  v_vacia       boolean;       -- primíparo: el SIA todavía no lista asignaturas
  v_disciplinar int := 0;
  v_todas       jsonb := '{}'::jsonb;
  v_cerradas    jsonb := '{}'::jsonb;
  v_resumen     jsonb := '{}'::jsonb;
  v_tipo        text;
  v_esp         int;
begin
  if p_texto is null or length(btrim(p_texto)) < 200 then
    return 'La historia académica está vacía o incompleta.';
  end if;

  -- Mayúsculas y sin tildes, igual que hace el navegador
  t := upper(translate(normalize(p_texto, nfc), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));

  -- 1. Encabezado del SIA: Ingeniería de Sistemas e Informática en la Facultad de Minas
  -- El código del plan no siempre se copia con Ctrl + A, así que no se exige
  if t !~ '(^|\n)[[:blank:]]*([0-9]{4}[[:blank:]]+)?INGENIERIA DE SISTEMAS E INFORMATICA[[:blank:]]*(\r?\n|$)' then
    return 'En el encabezado no aparece Ingeniería de Sistemas e Informática.';
  end if;
  if t !~ 'FACULTAD:[[:blank:]]*FACULTAD DE MINAS(HIST|[[:blank:]]*(\r?\n|$))' then
    return 'En el encabezado no aparece la Facultad de Minas.';
  end if;

  -- 1b. La historia es de quien tiene la sesión: el usuario del SIA es el principio del correo UNAL
  v_esperado := upper(split_part(coalesce(p_correo, ''), '@', 1));
  select m[1] into v_usuario
    from regexp_matches(t, '(?:PORTAL DE SERVICIOS ACADEMICOS|LOGO UNIVERSIDAD)[[:space:]]+([A-Z0-9._-]+)[[:space:]]') as m
    limit 1;
  if v_usuario is null or v_esperado = '' or v_usuario <> v_esperado then
    return 'La historia académica no pertenece al usuario del SIA de tu correo institucional.';
  end if;

  -- 2. Que se hayan leído todas las filas de asignaturas
  select count(*) into v_detectadas
    from regexp_matches(t, '\(\d{6,7}(?:-[A-Z])?\)[[:space:]]+\d{1,2}[[:space:]]', 'g') as m;
  v_vacia := v_detectadas = 0;

  -- 3. Cada asignatura de Fundamentación / Disciplinar / Trabajo de grado tiene que ser de la malla de Sistemas
  for v_fila in
    select m[1] as codigo, m[2]::int as creditos, m[3] as tipo
      from regexp_matches(
             t,
             '\((\d{6,7}(?:-[A-Z])?)\)[[:space:]]+(\d{1,2})[[:space:]]+(' || v_tipos || ')[[:space:]]+\d{4}-\d[A-Z]?[[:space:]]',
             'g'
           ) as m
  loop
    v_leidas := v_leidas + 1;
    v_todas := jsonb_set(v_todas, array[v_fila.tipo], to_jsonb(coalesce((v_todas ->> v_fila.tipo)::int, 0) + v_fila.creditos));

    if not (v_fila.tipo = any (v_sin_malla)) then
      select c.creditos, c.grupo into v_cat from public.malla_catalogo c where c.codigo = v_fila.codigo;
      if not found then
        -- Un plan anterior pudo tener asignaturas que hoy no están: se aceptan pocas, nunca como Trabajo de grado
        if v_fila.tipo = 'TRABAJO DE GRADO' then
          return 'La asignatura con código ' || v_fila.codigo || ' figura en el plan pero no está en la malla de Sistemas.';
        end if;
        v_legadas := v_legadas + 1;
        continue;
      end if;
      if v_cat.creditos is not null and v_cat.creditos <> v_fila.creditos then
        return 'Los créditos de la asignatura ' || v_fila.codigo || ' no corresponden a la malla.';
      end if;
      if v_cat.grupo = 'disciplinar' then
        v_disciplinar := v_disciplinar + 1;
      end if;
    end if;
  end loop;

  if v_detectadas > v_leidas then
    return 'Hay filas de asignaturas que no se pudieron leer.';
  end if;
  if v_legadas > 6 then
    return 'Hay asignaturas que figuran en el plan pero no están en la malla de Sistemas.';
  end if;
  if v_disciplinar = 0 and not v_vacia then
    return 'No hay ninguna asignatura disciplinar de Sistemas en la historia.';
  end if;

  -- Créditos de las asignaturas ya cerradas (aprobadas o reprobadas), por tipología
  for v_fila in
    select m[2]::int as creditos, m[3] as tipo
      from regexp_matches(
             t,
             '\((\d{6,7}(?:-[A-Z])?)\)[[:space:]]+(\d{1,2})[[:space:]]+(' || v_tipos || ')[[:space:]]+\d{4}-\d[A-Z]?[^()]*(?:APROBADA|REPROBADA)',
             'g'
           ) as m
  loop
    v_cerradas := jsonb_set(v_cerradas, array[v_fila.tipo], to_jsonb(coalesce((v_cerradas ->> v_fila.tipo)::int, 0) + v_fila.creditos));
  end loop;

  -- 4. «Resumen de créditos»: tiene que ser el del plan y cuadrar con las asignaturas
  for v_fila in
    select m[1] as tipo, m[2]::int as exigidos, m[3]::int as aprobados, m[6]::int as cursados
      from regexp_matches(
             t,
             '(' || v_tipos || '|TOTAL)[[:space:]]+(\d+)[[:space:]]+(\d+)[[:space:]]+(\d+)[[:space:]]+(\d+)[[:space:]]+(\d+)([[:space:]]|$)',
             'g'
           ) as m
  loop
    if not (v_resumen ? v_fila.tipo) then   -- vale la primera aparición de cada fila
      v_resumen := jsonb_set(v_resumen, array[v_fila.tipo], jsonb_build_object('exigidos', v_fila.exigidos, 'aprobados', v_fila.aprobados, 'cursados', v_fila.cursados));
    end if;
  end loop;

  if not (v_resumen ? 'TOTAL') then
    return 'No se encontró la tabla «Resumen de créditos».';
  end if;
  -- Sin asignaturas listadas solo es válido quien aún no ha aprobado nada (primíparo)
  if v_vacia and coalesce((v_resumen -> 'TOTAL' ->> 'aprobados')::int, -1) <> 0 then
    return 'No hay ninguna asignatura disciplinar de Sistemas en la historia.';
  end if;
  if (v_resumen -> 'TOTAL' ->> 'exigidos')::int <> (select coalesce(sum(e.exigidos), 0) from public.malla_exigidos e) then
    return 'El total de créditos exigidos no corresponde al plan.';
  end if;

  for v_fila in select e.tipologia, e.exigidos from public.malla_exigidos e loop
    v_esp := (v_resumen -> v_fila.tipologia ->> 'exigidos')::int;
    if v_esp is distinct from v_fila.exigidos then
      return 'Los créditos exigidos en ' || v_fila.tipologia || ' no corresponden al plan.';
    end if;
  end loop;

  foreach v_tipo in array array['DISCIPLINAR OBLIGATORIA', 'DISCIPLINAR OPTATIVA', 'FUND. OBLIGATORIA', 'FUND. OPTATIVA',
                                'TRABAJO DE GRADO', 'LIBRE ELECCION', 'NIVELACION']
  loop
    v_esp := coalesce((v_resumen -> v_tipo ->> 'cursados')::int, 0);
    if v_esp <> coalesce((v_todas ->> v_tipo)::int, 0) and v_esp <> coalesce((v_cerradas ->> v_tipo)::int, 0) then
      return 'Los créditos cursados en ' || v_tipo || ' no cuadran con las asignaturas listadas.';
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.validar_historia_sistemas(text, text) from public, anon, authenticated;


-- ---------- Sello visual: 8 caracteres que dependen del código, el correo y el nombre ----------
-- La tarjeta lo imprime (y dibuja un icono con él) y verificar.html lo vuelve a calcular en el servidor:
-- si alguien cambia el nombre o el correo en la imagen, el sello deja de coincidir.

create or replace function public.sello_promocion(p_codigo text, p_correo text, p_nombre text)
returns text
language sql
immutable
as $$
  select upper(substr(encode(sha256(convert_to(p_codigo || '|' || lower(p_correo) || '|' || p_nombre, 'UTF8')), 'hex'), 1, 8));
$$;

revoke all on function public.sello_promocion(text, text, text) from public, anon, authenticated;


-- ---------- Emitir (o recuperar) el código de la persona que tiene la sesión ----------

create or replace function public.obtener_codigo_promocion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_correo   text;
  v_historia text;
  v_motivo   text;
  v_nombre   text;
  v_hex      text;
  v_fila     public.codigos_promocion%rowtype;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu código.' using errcode = '28000';
  end if;

  select lower(u.email) into v_correo from auth.users u where u.id = v_uid;
  if v_correo is null or v_correo !~ '^[a-z0-9._-]+@unal\.edu\.co$' then
    raise exception 'Solo las cuentas @unal.edu.co pueden tener un código.' using errcode = '42501';
  end if;

  select p.historia_texto into v_historia from public.perfiles p where p.id = v_uid;
  v_motivo := public.validar_historia_sistemas(v_historia, v_correo);
  if v_motivo is not null then
    raise exception 'No pudimos verificar tu historia académica: %', v_motivo using errcode = 'P0001';
  end if;

  -- El nombre sale de la cuenta de Google UNAL (no de un campo que la persona pueda escribir)
  select nullif(btrim(coalesce(i.identity_data ->> 'full_name', i.identity_data ->> 'name', '')), '')
    into v_nombre
    from auth.identities i
   where i.user_id = v_uid and i.provider = 'google'
   limit 1;
  v_nombre := coalesce(v_nombre, initcap(replace(split_part(v_correo, '@', 1), '.', ' ')));

  v_hex := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.codigos_promocion as c (usuario_id, codigo, correo, nombre)
  values (v_uid, 'SIS-' || substr(v_hex, 1, 4) || '-' || substr(v_hex, 5, 4) || '-' || substr(v_hex, 9, 4), v_correo, v_nombre)
  on conflict (usuario_id) do update set correo = excluded.correo, nombre = excluded.nombre
  returning c.* into v_fila;

  if v_fila.revocado then
    raise exception 'Tu código fue desactivado. Escribe a saescobara@unal.edu.co si crees que es un error.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'codigo', v_fila.codigo,
    'nombre', v_fila.nombre,
    'correo', v_fila.correo,
    'emitido_en', v_fila.emitido_en,
    'sello', public.sello_promocion(v_fila.codigo, v_fila.correo, v_fila.nombre)
  );
end;
$$;

revoke all on function public.obtener_codigo_promocion() from public, anon;
grant execute on function public.obtener_codigo_promocion() to authenticated;


-- ---------- Comprobar un código (lo usa verificar.html; no exige sesión) ----------

create or replace function public.verificar_codigo_promocion(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_fila   public.codigos_promocion%rowtype;
  v_local  text;
begin
  if v_codigo !~ '^SIS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$' then
    return jsonb_build_object('valido', false);
  end if;

  update public.codigos_promocion c
     set verificaciones = c.verificaciones + 1, ultima_verificacion = now()
   where c.codigo = v_codigo and not c.revocado
  returning c.* into v_fila;

  if not found then
    return jsonb_build_object('valido', false);
  end if;

  v_local := split_part(v_fila.correo, '@', 1);
  return jsonb_build_object(
    'valido', true,
    'nombre', v_fila.nombre,
    'correo', left(v_local, 2) || repeat('*', greatest(length(v_local) - 3, 1)) || right(v_local, 1) || '@' || split_part(v_fila.correo, '@', 2),
    'emitido_en', v_fila.emitido_en,
    'verificaciones', v_fila.verificaciones,
    'sello', public.sello_promocion(v_fila.codigo, v_fila.correo, v_fila.nombre)
  );
end;
$$;

revoke all on function public.verificar_codigo_promocion(text) from public;
grant execute on function public.verificar_codigo_promocion(text) to anon, authenticated;
