-- =====================================================================
-- SERRE v55 — SUIVI DE LA FACTURATION JURIDIQUE (ACCÈS RÉSERVÉ)
-- ---------------------------------------------------------------------
-- À exécuter dans Supabase → SQL Editor. Idempotent : le relancer (par
-- exemple pour la mise à jour v55.1) ne perd aucune ligne.
--
-- Ce script AJOUTE deux tables et une fonction. Il ne modifie aucune
-- table, aucune politique ni aucun compte existants.
--
-- Le cloisonnement est assuré par la BASE, pas par l'écran : un compte
-- absent de la liste d'accès ne peut ni lire, ni modifier, ni même
-- compter les lignes, quel que soit son rôle dans l'application
-- (administrateur compris) et même en manipulant son navigateur.
--
-- Seules exceptions : les personnes ayant accès au tableau de bord
-- Supabase du projet (propriétaire du compte Supabase), qui voient
-- toutes les tables.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Liste des comptes autorisés
-- ---------------------------------------------------------------------
-- Aucune politique RLS : la table n'est lisible par aucun utilisateur de
-- l'application. Seule la fonction ci-dessous la consulte.
create table if not exists public.facturation_juridique_acces (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  accorde_le  timestamptz not null default now()
);

alter table public.facturation_juridique_acces enable row level security;
revoke all on public.facturation_juridique_acces from anon, authenticated;
grant select, insert, delete on public.facturation_juridique_acces to service_role;

create or replace function public.a_acces_facturation_juridique()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.facturation_juridique_acces where user_id = auth.uid());
$$;

revoke all on function public.a_acces_facturation_juridique() from public, anon;
grant execute on function public.a_acces_facturation_juridique() to authenticated;


-- ---------------------------------------------------------------------
-- 2. Lignes de suivi
-- ---------------------------------------------------------------------
create table if not exists public.facturation_juridique (
  id                  uuid primary key default gen_random_uuid(),
  dossier             text not null,
  type_operation      text,
  mission             text,
  honoraires          numeric(12,2),
  date_projet         date,
  date_signature      date,
  date_depot_gtc      date,
  date_fin_formalite  date,
  mois_facturation    date,   -- premier jour du mois de facturation
  commentaires        text,
  devis_id            text references public.devis(id) on delete set null,
  created_by          uuid default auth.uid() references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.facturation_juridique is
  'Suivi des missions juridiques jusqu''à facturation. Accès limité aux comptes de facturation_juridique_acces.';

create index if not exists fj_facturation_idx on public.facturation_juridique (mois_facturation);
create index if not exists fj_devis_idx       on public.facturation_juridique (devis_id);

alter table public.facturation_juridique enable row level security;

drop policy if exists fj_acces on public.facturation_juridique;
create policy fj_acces on public.facturation_juridique
  for all to authenticated
  using (public.a_acces_facturation_juridique())
  with check (public.a_acces_facturation_juridique());

revoke all on public.facturation_juridique from anon;
grant select, insert, update, delete on public.facturation_juridique to authenticated;
grant select, insert, update, delete on public.facturation_juridique to service_role;

-- v55.1 — Transfert automatique depuis l'outil de devis.
-- `ecarte` : ligne retirée du suivi par l'utilisateur. Elle est conservée,
-- invisible, pour que le dossier de devis correspondant ne soit pas
-- transféré à nouveau.
alter table public.facturation_juridique
  add column if not exists ecarte boolean not null default false;

-- Un même dossier de devis peut être scindé à la main en plusieurs lignes
-- (une par opération) : pas d'unicité sur devis_id.
drop index if exists public.fj_devis_unique;


-- Réglages du suivi : liste fermée des types d'opération, modèles de devis
-- dont les dossiers reclassés sont transférés. Même cloisonnement.
create table if not exists public.facturation_juridique_reglages (
  cle         text primary key,
  valeur      jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.facturation_juridique_reglages enable row level security;

drop policy if exists fj_reglages_acces on public.facturation_juridique_reglages;
create policy fj_reglages_acces on public.facturation_juridique_reglages
  for all to authenticated
  using (public.a_acces_facturation_juridique())
  with check (public.a_acces_facturation_juridique());

revoke all on public.facturation_juridique_reglages from anon;
grant select, insert, update, delete on public.facturation_juridique_reglages to authenticated, service_role;


create or replace function public.fj_horodatage()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fj_horodatage on public.facturation_juridique;
create trigger fj_horodatage
  before update on public.facturation_juridique
  for each row execute function public.fj_horodatage();


-- ---------------------------------------------------------------------
-- 3. VOTRE ACCÈS — à exécuter SÉPARÉMENT, après avoir remplacé l'adresse
--    par celle de VOTRE compte dans l'application.
-- ---------------------------------------------------------------------
-- insert into public.facturation_juridique_acces (user_id)
-- select id from auth.users where email = 'votre.adresse@cabinetserre.fr'
-- on conflict do nothing;
--
-- Contrôle (doit afficher une seule adresse, la vôtre) :
-- select u.email, a.accorde_le
--   from public.facturation_juridique_acces a join auth.users u on u.id = a.user_id;
--
-- Retirer un accès :
-- delete from public.facturation_juridique_acces
--  where user_id = (select id from auth.users where email = '…');
