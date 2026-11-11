-- =====================================================================
-- TRAVAIL À PLUSIEURS — fiches clients en table, révision des dossiers
-- ---------------------------------------------------------------------
-- Deux corrections de fond, à exécuter UNE FOIS par projet Supabase.
-- Le script est idempotent : le relancer ne perd ni fiche ni révision.
--
--   1. Les fiches clients vivaient dans une seule ligne `app_state`
--      contenant tout le tableau. Deux collaborateurs qui créaient
--      chacun un client au même moment : le second enregistrement
--      écrasait le premier, et le dossier du premier pointait vers une
--      fiche disparue. Une ligne par fiche supprime le problème.
--
--   2. Les dossiers n'avaient aucun numéro de révision. Le dernier qui
--      enregistrait écrasait le travail de l'autre, en silence. La
--      colonne `rev` permet à l'application de refuser l'écriture et de
--      prévenir au lieu d'écraser.
--
-- L'application fonctionne avant comme après : tant que ce script n'est
-- pas passé, elle détecte l'absence de la table et de la colonne et
-- retombe sur l'ancien fonctionnement, en le signalant à l'écran.
-- =====================================================================


-- =====================================================================
-- 0. FONCTION D'ENCADREMENT (prérequis)
-- ---------------------------------------------------------------------
-- La politique de suppression des fiches clients s'appuie sur
-- `public.est_manager()`. Si cette fonction n'existe pas encore dans le
-- projet, l'éditeur SQL de Supabase exécutant tout le script dans une
-- seule transaction, TOUT le script échoue et rien n'est appliqué.
--
-- On la crée donc si elle manque, et seulement si elle manque : une
-- définition déjà en place n'est pas touchée.
--
-- SECURITY DEFINER et verrouillage sur `auth.uid()` : la fonction répond
-- uniquement pour l'appelant, et ne permet à personne de lire le rôle
-- d'un autre compte. Hiérarchie identique à celle de l'application :
-- collaborateur < manager < admin.
-- =====================================================================
do $migration$
begin
  if not exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'est_manager'
       and p.pronargs = 0
  ) then
    execute $creation$
      create function public.est_manager()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $corps$
        select coalesce(
          (select role in ('manager','admin')
             from public.profiles
            where id = auth.uid()),
          false);
      $corps$;
    $creation$;
    execute 'revoke all     on function public.est_manager() from public';
    execute 'grant  execute on function public.est_manager() to authenticated';
  end if;
end
$migration$;


-- =====================================================================
-- 1. RÉVISION DES DOSSIERS
-- =====================================================================
alter table public.devis add column if not exists rev integer not null default 1;

comment on column public.devis.rev is
  'Numéro de révision. L''application n''écrit que si la révision qu''elle détient est encore celle de la base ; sinon elle prévient au lieu d''écraser.';


-- =====================================================================
-- 2. FICHES CLIENTS
-- =====================================================================
create table if not exists public.clients (
  id          text primary key,
  raison      text,
  siren       text,
  email       text,
  ville       text,
  archive     boolean not null default false,
  data        jsonb not null,
  rev         integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.clients is
  'Une fiche client par ligne. Les colonnes en clair servent aux listes et aux recherches ; `data` porte la fiche complète, notes internes et questionnaires compris.';

create index if not exists clients_raison_idx on public.clients (raison);
create index if not exists clients_siren_idx  on public.clients (siren);

alter table public.clients enable row level security;

drop policy if exists clients_lecture  on public.clients;
drop policy if exists clients_ajout    on public.clients;
drop policy if exists clients_ecriture on public.clients;
drop policy if exists clients_suppr    on public.clients;

create policy clients_lecture on public.clients
  for select to authenticated using (true);
create policy clients_ajout on public.clients
  for insert to authenticated with check (true);
create policy clients_ecriture on public.clients
  for update to authenticated using (true) with check (true);

-- Supprimer définitivement une fiche reste une décision d'encadrement.
create policy clients_suppr on public.clients
  for delete to authenticated using (public.est_manager());

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.clients to service_role;


-- =====================================================================
-- 3. REPRISE DES FICHES EXISTANTES
-- ---------------------------------------------------------------------
-- Le tableau JSON de `app_state` est éclaté en lignes. Les fiches déjà
-- présentes en table ne sont pas touchées : relancer le script est sans
-- effet, et une reprise partielle se termine proprement.
-- =====================================================================
insert into public.clients (id, raison, siren, email, ville, archive, data)
select  fiche->>'id',
        nullif(fiche->>'raison',''),
        nullif(fiche->>'siren',''),
        nullif(fiche->>'email',''),
        nullif(fiche->>'ville',''),
        coalesce((fiche->>'archive')::boolean, false),
        fiche
  from  public.app_state a
        cross join lateral jsonb_array_elements(a.data) as fiche
 where  a.key = 'cab:clients'
   and  jsonb_typeof(a.data) = 'array'
   and  coalesce(fiche->>'id','') <> ''
    on conflict (id) do nothing;


-- =====================================================================
-- 4. L'ANCIEN EMPLACEMENT EST CONSERVÉ, MARQUÉ COMME DÉPASSÉ
-- ---------------------------------------------------------------------
-- La ligne `cab:clients` n'est pas supprimée : elle sert de filet si la
-- reprise devait être rejouée. L'application ne l'écrit plus une fois la
-- table en place. Après quelques semaines de fonctionnement normal, elle
-- peut être retirée :
--     delete from public.app_state where key = 'cab:clients';
-- =====================================================================


-- =====================================================================
-- 5. CONTRÔLE
-- ---------------------------------------------------------------------
-- À exécuter séparément. Les deux nombres doivent coïncider.
-- =====================================================================
-- select
--   (select count(*) from public.clients)                                as fiches_en_table,
--   (select jsonb_array_length(data) from public.app_state
--     where key = 'cab:clients')                                         as fiches_dans_l_ancien_bloc,
--   (select count(*) from public.devis where rev is null)                as dossiers_sans_revision;
