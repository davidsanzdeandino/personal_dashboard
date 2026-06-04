-- Esquema de Panel para Supabase.
-- Ejecútalo en el SQL Editor de tu proyecto (o con la CLI de Supabase).
--
-- Toda la app guarda su estado (un único JSON por usuario) en esta tabla.
-- Row Level Security garantiza que cada usuario solo puede leer/escribir su fila.

-- 1) Tabla de estado de la aplicación (una fila por usuario)
create table if not exists public.app_state (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) Activar Row Level Security
alter table public.app_state enable row level security;

-- 3) Políticas: cada usuario gestiona únicamente su propia fila.
--    (Idempotentes: se borran antes de crearse, por si reejecutas el script.)
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own"
  on public.app_state for select
  using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own"
  on public.app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_delete_own"
  on public.app_state for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- OPCIONAL — Fotos de progreso (pestaña Entrenamiento → Cuerpo)
-- ----------------------------------------------------------------------------
-- La app guarda las fotos en un bucket de Storage llamado 'progress', en una
-- carpeta por usuario ({user_id}/{fecha}). Crea el bucket (privado) desde
-- Storage en el panel, o descomenta lo siguiente:
--
-- insert into storage.buckets (id, name, public)
--   values ('progress', 'progress', false)
--   on conflict (id) do nothing;
--
-- create policy "progress_rw_own"
--   on storage.objects for all
--   using (bucket_id = 'progress' and owner = auth.uid())
--   with check (bucket_id = 'progress' and owner = auth.uid());
