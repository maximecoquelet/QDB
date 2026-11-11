-- =====================================================================
-- SOCLE D'UN NOUVEAU PROJET — Grille & Mission
-- ---------------------------------------------------------------------
-- À exécuter UNE FOIS, dans le SQL Editor d'un projet Supabase VIERGE,
-- avant toute utilisation de l'application. Le script est idempotent :
-- le relancer ne détruit rien.
--
-- Il crée les cinq tables dont l'application a besoin, leurs politiques
-- de sécurité, et les fonctions d'appui.
--
-- Ordre de mise en service :
--   1. ce script ;
--   2. créer votre compte dans Authentication → Users ;
--   3. le passer en administrateur (dernière section, en bas) ;
--   4. le script v47 des accès collaborateurs, puis l'Edge Function.
-- =====================================================================


-- =====================================================================
-- 1. PROFILS ET RÔLES
-- =====================================================================
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text,
  role                  text not null default 'collaborateur'
                          check (role in ('collaborateur','manager','admin')),
  must_change_password  boolean not null default false,
  password_set_at       timestamptz,
  invited_at            timestamptz,
  invited_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is
  'Rôle applicatif de chaque compte. Collaborateur < manager < administrateur.';

-- Une politique posée sur `profiles` ne doit jamais interroger `profiles`
-- directement : la politique se rappellerait elle-même. Ces deux fonctions
-- s'exécutent avec les droits de leur propriétaire et coupent la récursion.
create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.est_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('manager','admin'));
$$;

revoke all on function public.est_admin()   from public;
revoke all on function public.est_manager() from public;
grant execute on function public.est_admin()   to authenticated;
grant execute on function public.est_manager() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_lecture       on public.profiles;
drop policy if exists profiles_ecriture_admin on public.profiles;
drop policy if exists profiles_ajout_admin    on public.profiles;
drop policy if exists profiles_suppr_admin    on public.profiles;

-- Chacun voit l'annuaire interne : c'est ce qui alimente la page des droits
-- et l'affichage du responsable sur les dossiers.
create policy profiles_lecture on public.profiles
  for select to authenticated using (true);

-- Seul un administrateur modifie un rôle. Un collaborateur ne peut donc pas
-- s'élever lui-même ; il lève uniquement son drapeau de mot de passe, par la
-- fonction dédiée du script v47.
create policy profiles_ecriture_admin on public.profiles
  for update to authenticated using (public.est_admin()) with check (public.est_admin());
create policy profiles_ajout_admin on public.profiles
  for insert to authenticated with check (public.est_admin());
create policy profiles_suppr_admin on public.profiles
  for delete to authenticated using (public.est_admin());

-- Tout compte créé dans Authentication reçoit son profil, à défaut de quoi
-- l'application le verrait comme un utilisateur sans rôle.
create or replace function public.creer_profil_a_l_inscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists profil_a_l_inscription on auth.users;
create trigger profil_a_l_inscription
  after insert on auth.users
  for each row execute function public.creer_profil_a_l_inscription();


-- =====================================================================
-- 2. RÉFÉRENTIEL DU CABINET
-- ---------------------------------------------------------------------
-- Identité, modèles de devis, lettres de mission, fiches clients et
-- réglages : tout tient dans ce magasin clé / valeur.
-- =====================================================================
create table if not exists public.app_state (
  key         text primary key,
  data        jsonb not null,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

comment on table public.app_state is
  'Référentiel partagé du cabinet, une ligne par domaine (cab:identite, cab:modeles, cab:lettres, cab:clients, cab:reglages…).';

alter table public.app_state enable row level security;

drop policy if exists app_state_lecture  on public.app_state;
drop policy if exists app_state_ajout    on public.app_state;
drop policy if exists app_state_ecriture on public.app_state;

create policy app_state_lecture on public.app_state
  for select to authenticated using (true);
create policy app_state_ajout on public.app_state
  for insert to authenticated with check (true);
create policy app_state_ecriture on public.app_state
  for update to authenticated using (true) with check (true);


-- =====================================================================
-- 3. DOSSIERS
-- =====================================================================
create table if not exists public.devis (
  id                     text primary key,
  reference              text,
  reference_lm           text,
  statut                 text,
  client_nom             text,
  client_email           text,
  signature_provider     text,
  signature_request_id   text,
  signature_status       text,
  data                   jsonb not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists devis_cree_idx   on public.devis (created_at desc);
create index if not exists devis_statut_idx on public.devis (statut);

comment on table public.devis is
  'Un dossier par ligne. Les colonnes en clair servent au portefeuille et aux recherches ; `data` porte le dossier complet.';

alter table public.devis enable row level security;

drop policy if exists devis_lecture  on public.devis;
drop policy if exists devis_ajout    on public.devis;
drop policy if exists devis_ecriture on public.devis;
drop policy if exists devis_suppr    on public.devis;

create policy devis_lecture on public.devis
  for select to authenticated using (true);
create policy devis_ajout on public.devis
  for insert to authenticated with check (true);
create policy devis_ecriture on public.devis
  for update to authenticated using (true) with check (true);

-- La suppression d'un dossier reste une décision d'encadrement.
create policy devis_suppr on public.devis
  for delete to authenticated using (public.est_manager());


-- =====================================================================
-- 4. JOURNAL DES ACTIONS
-- ---------------------------------------------------------------------
-- Volontairement en ajout seul : ni modification, ni suppression, pas même
-- par un administrateur. C'est ce qui lui donne sa valeur probante.
-- =====================================================================
create table if not exists public.serre_audit_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  actor_id     uuid references auth.users(id) on delete set null,
  actor_email  text,
  action       text not null,
  detail       text,
  entity_type  text,
  entity_id    text
);

create index if not exists audit_date_idx on public.serre_audit_log (created_at desc);

alter table public.serre_audit_log enable row level security;

drop policy if exists audit_lecture on public.serre_audit_log;
drop policy if exists audit_ajout   on public.serre_audit_log;

create policy audit_lecture on public.serre_audit_log
  for select to authenticated using (true);
create policy audit_ajout on public.serre_audit_log
  for insert to authenticated with check (auth.uid() = actor_id);


-- =====================================================================
-- 5. JOURNAL DES ERREURS
-- =====================================================================
create table if not exists public.serre_error_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete set null,
  user_email  text,
  context     text,
  view_name   text,
  devis_id    text,
  message     text not null,
  stack       text
);

create index if not exists erreurs_date_idx on public.serre_error_log (created_at desc);

alter table public.serre_error_log enable row level security;

drop policy if exists erreurs_lecture on public.serre_error_log;
drop policy if exists erreurs_ajout   on public.serre_error_log;

create policy erreurs_lecture on public.serre_error_log
  for select to authenticated using (true);
create policy erreurs_ajout on public.serre_error_log
  for insert to authenticated with check (true);


-- =====================================================================
-- 6. DROITS DE LA CLÉ D'ADMINISTRATION
-- ---------------------------------------------------------------------
-- `service_role` contourne les politiques RLS mais pas les autorisations de
-- table. Sans ces lignes, l'Edge Function de création des comptes échoue sur
-- « permission denied for table profiles ».
-- =====================================================================
grant usage on schema public to service_role, authenticated;

grant select, insert, update, delete on public.profiles         to service_role;
grant select, insert, update, delete on public.app_state        to service_role;
grant select, insert, update, delete on public.devis            to service_role;
grant select, insert                 on public.serre_audit_log  to service_role;
grant select, insert                 on public.serre_error_log  to service_role;

grant select                         on public.profiles         to authenticated;
grant select, insert, update         on public.app_state        to authenticated;
grant select, insert, update, delete on public.devis            to authenticated;
grant select, insert                 on public.serre_audit_log  to authenticated;
grant select, insert                 on public.serre_error_log  to authenticated;
grant update                         on public.profiles         to authenticated;


-- =====================================================================
-- 7. VOTRE COMPTE ADMINISTRATEUR
-- ---------------------------------------------------------------------
-- À lancer APRÈS avoir créé votre compte dans Authentication → Users.
-- Remplacez l'adresse par la vôtre, puis exécutez ces deux instructions
-- SÉPARÉMENT du reste : l'éditeur n'affiche que le résultat de la dernière.
-- =====================================================================

-- insert into public.profiles (id, email, role)
-- select id, email, 'admin' from auth.users
--  where email = 'prenom.nom@exemple.fr'
--     on conflict (id) do update set role = 'admin';

-- select u.email as compte, p.role, p.must_change_password
--   from auth.users u
--   left join public.profiles p on p.id = u.id
--  order by u.email;
