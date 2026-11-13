-- =====================================================================
-- SERRE v57 — SUIVI DES ENREGISTREMENTS AUX IMPÔTS (ACCÈS RÉSERVÉ)
-- ---------------------------------------------------------------------
-- À exécuter dans Supabase → SQL Editor, APRÈS v55. Idempotent.
-- Ajoute une table ; ne modifie rien d'existant.
--
-- Même cloisonnement que la facturation juridique : seuls les comptes
-- inscrits dans facturation_juridique_acces lisent ou écrivent.
-- =====================================================================

create table if not exists public.enregistrements (
  id                     uuid primary key default gen_random_uuid(),
  dossier                text not null,
  motif                  text,
  montant                numeric(12,2),          -- droits d'enregistrement
  date_demande_virement  date,
  date_virement          date,
  date_envoi_sie         date,
  sie                    text,                   -- service des impôts destinataire
  date_retour            date,                   -- acte enregistré revenu
  commentaires           text,
  fj_id                  uuid references public.facturation_juridique(id) on delete set null,
  client_id              text,
  created_by             uuid default auth.uid() references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.enregistrements is
  'Actes présentés à l''enregistrement : droits, virement, envoi au SIE, retour. Accès limité aux comptes de facturation_juridique_acces.';

-- v57.2 — mode d'envoi au SIE : papier ou courriel.
alter table public.enregistrements add column if not exists mode_envoi text;
do $m$
begin
  if not exists (select 1 from pg_constraint where conname = 'enr_mode_envoi_valide') then
    alter table public.enregistrements add constraint enr_mode_envoi_valide check (mode_envoi is null or mode_envoi in ('papier','courriel'));
  end if;
end
$m$;

create index if not exists enr_fj_idx on public.enregistrements (fj_id);

-- Accès propre aux enregistrements : les comptes de la facturation
-- juridique y ont accès, plus ceux inscrits ici (ex. la personne qui
-- effectue les virements), SANS voir la facturation juridique.
create table if not exists public.enregistrements_acces (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  accorde_le  timestamptz not null default now()
);
alter table public.enregistrements_acces enable row level security;
revoke all on public.enregistrements_acces from anon, authenticated;
grant select, insert, delete on public.enregistrements_acces to service_role;

create or replace function public.a_acces_enregistrements()
returns boolean language sql stable security definer set search_path = public as $$
  select public.a_acces_facturation_juridique()
      or exists (select 1 from public.enregistrements_acces where user_id = auth.uid());
$$;
revoke all on function public.a_acces_enregistrements() from public, anon;
grant execute on function public.a_acces_enregistrements() to authenticated;

alter table public.enregistrements enable row level security;

drop policy if exists enr_acces on public.enregistrements;
create policy enr_acces on public.enregistrements
  for all to authenticated
  using (public.a_acces_enregistrements())
  with check (public.a_acces_enregistrements());

revoke all on public.enregistrements from anon;
grant select, insert, update, delete on public.enregistrements to authenticated, service_role;

drop trigger if exists enr_horodatage on public.enregistrements;
create trigger enr_horodatage
  before update on public.enregistrements
  for each row execute function public.fj_horodatage();

-- ---------------------------------------------------------------------
-- Donner l'accès aux seuls enregistrements (à exécuter séparément) :
-- insert into public.enregistrements_acces (user_id)
-- select id from auth.users where email = 'prenom.nom@cabinetserre.fr'
-- on conflict do nothing;
