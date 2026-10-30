-- Base de données de NextRep sur Supabase. À exécuter une fois dans l'éditeur SQL du projet.
-- Chaque ligne locale de l'app (séance, mesure, planning…) devient une ligne de « records ».
-- Chaque utilisateur ne peut lire et écrire que ses propres lignes (sécurité au niveau des lignes).

create sequence if not exists public.records_seq;

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('workouts', 'measures', 'measureKinds', 'foods', 'plans', 'goals', 'exercises', 'notes', 'templates', 'kv')),
  id text not null check (length(id) between 1 and 80),
  data jsonb check (data is null or pg_column_size(data) < 200000),
  updated_at bigint not null, -- date de modification côté appareil, en millisecondes
  deleted boolean not null default false,
  seq bigint not null default nextval('public.records_seq'), -- ordre des changements, pour ne télécharger que les nouveautés
  primary key (user_id, kind, id)
);

grant usage on sequence public.records_seq to authenticated;

create index if not exists records_user_seq on public.records (user_id, seq);

-- Une modification plus ancienne que celle déjà enregistrée est ignorée (deux appareils hors ligne)
create or replace function public.records_keep_newest() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.seq := nextval('public.records_seq');
  return new;
end $$;

drop trigger if exists records_keep_newest on public.records;
create trigger records_keep_newest before insert or update on public.records
  for each row execute function public.records_keep_newest();

alter table public.records enable row level security;

drop policy if exists "records: lecture" on public.records;
drop policy if exists "records: ajout" on public.records;
drop policy if exists "records: modification" on public.records;
drop policy if exists "records: suppression" on public.records;
create policy "records: lecture" on public.records for select to authenticated using (user_id = (select auth.uid()));
create policy "records: ajout" on public.records for insert to authenticated with check (user_id = (select auth.uid()));
create policy "records: modification" on public.records for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "records: suppression" on public.records for delete to authenticated using (user_id = (select auth.uid()));

-- Consentement explicite au traitement des données de santé, avec la version du texte accepté
create table if not exists public.consents (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('health')),
  version text not null check (length(version) < 20),
  accepted_at timestamptz not null default now(),
  primary key (user_id, kind, version)
);

alter table public.consents enable row level security;

drop policy if exists "consents: lecture" on public.consents;
drop policy if exists "consents: ajout" on public.consents;
create policy "consents: lecture" on public.consents for select to authenticated using (user_id = (select auth.uid()));
create policy "consents: ajout" on public.consents for insert to authenticated with check (user_id = (select auth.uid()));

-- Suppression du compte depuis l'app : efface l'utilisateur, ses lignes et ses consentements (en cascade)
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'non connecté';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
