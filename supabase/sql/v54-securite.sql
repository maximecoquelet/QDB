-- =====================================================================
-- SERRE v54 — DURCISSEMENT DE LA SÉCURITÉ
-- ---------------------------------------------------------------------
-- À exécuter UNE FOIS, dans Supabase → SQL Editor, après les scripts
-- 00-socle, v47, v49 et v50. Le script est idempotent : le relancer ne
-- perd aucune donnée.
--
-- Ce qu'il corrige :
--   1. la vue `acces_en_attente` ignorait les politiques RLS et pouvait
--      être lue par un visiteur non connecté (rôle `anon`) ;
--   2. aucun droit n'est plus accordé au rôle `anon` : l'application
--      exige une connexion, rien ne doit être lisible sans elle ;
--   3. l'identité du cabinet, les modèles et les lettres de mission ne
--      sont plus modifiables par un simple collaborateur ;
--   4. le journal des erreurs (traces techniques) n'est plus lisible que
--      par les administrateurs ;
--   5. le journal des actions est renseigné CÔTÉ BASE (auteur, date) et
--      chaîné par empreintes SHA-256 : une ligne modifiée, insérée après
--      coup ou supprimée est détectée par `verifier_journal()`.
--
-- Il ne touche ni aux dossiers, ni aux fiches clients, ni aux comptes.
-- =====================================================================


-- =====================================================================
-- 0. FONCTIONS DE RÔLE (prérequis, redéfinies à l'identique)
-- =====================================================================
create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.est_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('manager','admin') from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.est_admin()   from public, anon;
revoke all on function public.est_manager() from public, anon;
grant execute on function public.est_admin()   to authenticated;
grant execute on function public.est_manager() to authenticated;


-- =====================================================================
-- 1. VUE DES ACCÈS EN ATTENTE
-- ---------------------------------------------------------------------
-- Une vue Postgres s'exécute par défaut avec les droits de son
-- propriétaire et contourne donc les politiques RLS de `profiles`.
-- `security_invoker` lui fait appliquer les droits de l'utilisateur qui
-- l'interroge.
-- Source : https://supabase.com/docs/guides/database/postgres/row-level-security
-- =====================================================================
do $vue$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'acces_en_attente') then
    execute 'alter view public.acces_en_attente set (security_invoker = true)';
    execute 'revoke all on public.acces_en_attente from anon, public';
    execute 'grant select on public.acces_en_attente to authenticated';
  end if;
end
$vue$;


-- =====================================================================
-- 2. AUCUN ACCÈS SANS CONNEXION
-- ---------------------------------------------------------------------
-- Supabase accorde par défaut au rôle `anon` (la clé publique, visible
-- dans le code de l'application) des droits sur les objets du schéma
-- `public`. Les politiques RLS les neutralisaient ; on les retire en plus,
-- par précaution, y compris pour les objets créés à l'avenir.
-- =====================================================================
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Les fonctions appelées par l'application restent ouvertes aux
-- utilisateurs connectés (le `revoke ... from anon` ci-dessus ne les
-- concerne pas, mais on le réaffirme pour lever toute ambiguïté).
do $fonctions$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'finish_password_change') then
    execute 'grant execute on function public.finish_password_change() to authenticated';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'next_references') then
    execute 'grant execute on function public.next_references(integer) to authenticated';
  end if;
end
$fonctions$;


-- =====================================================================
-- 3. RÉFÉRENTIEL DU CABINET : ÉCRITURE SELON LE RÔLE
-- ---------------------------------------------------------------------
-- Mêmes règles que l'interface (canView / canRole) :
--   - identité du cabinet, paramètres de signature : administrateur ;
--   - modèles de devis, lettres de mission : manager ou administrateur ;
--   - le reste (réglages partagés — dont la fréquence d'usage des clauses,
--     mise à jour par tous —, corbeille, anciens emplacements) : tout
--     utilisateur connecté, comme avant.
-- =====================================================================
create or replace function public.peut_ecrire_referentiel(p_cle text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_cle in ('cab:identite', 'user:yousign') then public.est_admin()
    when p_cle in ('cab:modeles', 'cab:lettres')   then public.est_manager()
    else true
  end;
$$;

revoke all on function public.peut_ecrire_referentiel(text) from public, anon;
grant execute on function public.peut_ecrire_referentiel(text) to authenticated;

drop policy if exists app_state_ajout    on public.app_state;
drop policy if exists app_state_ecriture on public.app_state;

create policy app_state_ajout on public.app_state
  for insert to authenticated
  with check (public.peut_ecrire_referentiel(key));

create policy app_state_ecriture on public.app_state
  for update to authenticated
  using (public.peut_ecrire_referentiel(key))
  with check (public.peut_ecrire_referentiel(key));


-- =====================================================================
-- 4. JOURNAL DES ERREURS : LECTURE RÉSERVÉE AUX ADMINISTRATEURS
-- ---------------------------------------------------------------------
-- Les traces techniques peuvent contenir des extraits de données. Chacun
-- continue d'y écrire ; seuls les administrateurs les lisent. L'auteur et
-- la date sont fixés par la base.
-- =====================================================================
drop policy if exists erreurs_lecture on public.serre_error_log;
create policy erreurs_lecture on public.serre_error_log
  for select to authenticated using (public.est_admin());

create or replace function public.erreur_avant_ajout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id    := auth.uid();
    new.user_email := coalesce(auth.jwt() ->> 'email', new.user_email);
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists erreur_avant_ajout on public.serre_error_log;
create trigger erreur_avant_ajout
  before insert on public.serre_error_log
  for each row execute function public.erreur_avant_ajout();


-- =====================================================================
-- 5. JOURNAL DES ACTIONS : AUTEUR FIXÉ PAR LA BASE, CHAÎNAGE SHA-256
-- ---------------------------------------------------------------------
-- Chaque nouvelle ligne porte l'empreinte de la précédente et la sienne,
-- calculée sur son contenu. La « tête » de la chaîne est tenue dans une
-- table à part, verrouillée pendant l'ajout : deux ajouts simultanés
-- s'enchaînent sans bifurcation.
--
-- Ce que cela prouve : toute modification, insertion a posteriori ou
-- suppression d'une ligne chaînée est signalée par `verifier_journal()`.
-- Ce que cela ne prouve pas : un administrateur de la plateforme Supabase
-- (accès au propriétaire de la base) pourrait recalculer toute la chaîne.
-- Pour une preuve opposable à ce niveau, exporter périodiquement
-- l'empreinte de tête (`select * from serre_audit_tete`) hors de
-- Supabase — par exemple dans un courriel daté à soi-même.
-- =====================================================================
alter table public.serre_audit_log
  add column if not exists empreinte_precedente text,
  add column if not exists empreinte            text;

comment on column public.serre_audit_log.empreinte is
  'SHA-256 (hex) du contenu de la ligne et de l''empreinte précédente. Lignes antérieures à la v54 : non chaînées.';

create table if not exists public.serre_audit_tete (
  id          boolean primary key default true check (id),
  empreinte   text not null,
  ligne_id    bigint,
  updated_at  timestamptz not null default now()
);

comment on table public.serre_audit_tete is
  'Dernière empreinte de la chaîne du journal des actions. Une seule ligne.';

insert into public.serre_audit_tete (id, empreinte, ligne_id)
values (true, 'GENESE-SERRE-V54', null)
on conflict (id) do nothing;

alter table public.serre_audit_tete enable row level security;
drop policy if exists audit_tete_lecture on public.serre_audit_tete;
create policy audit_tete_lecture on public.serre_audit_tete
  for select to authenticated using (true);
revoke all on public.serre_audit_tete from anon, authenticated;
grant select on public.serre_audit_tete to authenticated;

create or replace function public.journal_empreinte(
  p_id bigint, p_created_at timestamptz, p_actor_id uuid, p_actor_email text,
  p_action text, p_detail text, p_entity_type text, p_entity_id text, p_precedente text)
returns text language sql immutable set search_path = public, pg_catalog as $$
  select encode(sha256(convert_to(concat_ws('|',
           quote_nullable(p_id),
           quote_nullable(extract(epoch from p_created_at)),
           quote_nullable(p_actor_id),
           quote_nullable(p_actor_email),
           quote_nullable(p_action),
           quote_nullable(p_detail),
           quote_nullable(p_entity_type),
           quote_nullable(p_entity_id),
           quote_nullable(p_precedente)), 'UTF8')), 'hex');
$$;

create or replace function public.journal_avant_ajout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_precedente text;
begin
  -- L'auteur et la date ne sont plus déclarés par le navigateur.
  if auth.uid() is not null then
    new.actor_id    := auth.uid();
    new.actor_email := coalesce(auth.jwt() ->> 'email', new.actor_email);
  end if;
  new.created_at := now();

  -- Verrou sur la tête : les ajouts concurrents s'enchaînent un par un.
  select empreinte into v_precedente from public.serre_audit_tete where id for update;
  if v_precedente is null then
    v_precedente := 'GENESE-SERRE-V54';
    insert into public.serre_audit_tete (id, empreinte) values (true, v_precedente)
    on conflict (id) do nothing;
  end if;

  new.empreinte_precedente := v_precedente;
  new.empreinte := public.journal_empreinte(new.id, new.created_at, new.actor_id, new.actor_email,
                     new.action, new.detail, new.entity_type, new.entity_id, v_precedente);

  update public.serre_audit_tete
     set empreinte = new.empreinte, ligne_id = new.id, updated_at = now()
   where id;
  return new;
end;
$$;

drop trigger if exists journal_avant_ajout on public.serre_audit_log;
create trigger journal_avant_ajout
  before insert on public.serre_audit_log
  for each row execute function public.journal_avant_ajout();

-- Aucune modification ni suppression, quel que soit le rôle, y compris
-- depuis l'éditeur SQL. (Retirer ce trigger exige un acte délibéré.)
create or replace function public.journal_inalterable()
returns trigger language plpgsql as $$
begin
  raise exception 'Le journal des actions est en ajout seul : % refusé.', tg_op;
end;
$$;

drop trigger if exists journal_inalterable on public.serre_audit_log;
create trigger journal_inalterable
  before update or delete on public.serre_audit_log
  for each row execute function public.journal_inalterable();

drop trigger if exists journal_inalterable_vidage on public.serre_audit_log;
create trigger journal_inalterable_vidage
  before truncate on public.serre_audit_log
  for each statement execute function public.journal_inalterable();

-- La politique d'ajout reste : `auth.uid() = actor_id`. Elle est évaluée
-- APRÈS le trigger, qui vient de fixer actor_id : elle passe pour tout
-- utilisateur connecté et bloque toujours les appels anonymes.

-- Vérification : aucune ligne renvoyée = chaîne intacte.
create or replace function public.verifier_journal()
returns table (ligne_id bigint, anomalie text)
language sql stable security definer set search_path = public as $$
  with chaine as (
    select * from public.serre_audit_log where empreinte is not null
  )
  -- a) contenu modifié
  select c.id, 'Contenu modifié : l''empreinte ne correspond plus.'
    from chaine c
   where c.empreinte <> public.journal_empreinte(c.id, c.created_at, c.actor_id, c.actor_email,
                          c.action, c.detail, c.entity_type, c.entity_id, c.empreinte_precedente)
  union all
  -- b) maillon manquant (ligne supprimée avant celle-ci)
  select c.id, 'Maillon précédent introuvable : une ligne a été supprimée.'
    from chaine c
   where c.empreinte_precedente <> 'GENESE-SERRE-V54'
     and not exists (select 1 from chaine p where p.empreinte = c.empreinte_precedente)
  union all
  -- c) bifurcation (deux lignes revendiquent le même prédécesseur)
  select c.id, 'Bifurcation : plusieurs lignes suivent le même maillon.'
    from chaine c
   where (select count(*) from chaine x where x.empreinte_precedente = c.empreinte_precedente) > 1
  union all
  -- d) dernière ligne supprimée
  select t.ligne_id, 'Tête de chaîne introuvable : la dernière ligne a été supprimée.'
    from public.serre_audit_tete t
   where t.empreinte <> 'GENESE-SERRE-V54'
     and not exists (select 1 from chaine c where c.empreinte = t.empreinte);
$$;

revoke all on function public.verifier_journal() from public, anon;
grant execute on function public.verifier_journal() to authenticated;


-- =====================================================================
-- 6. CONTRÔLES (à exécuter séparément)
-- =====================================================================
-- Aucun droit restant pour `anon` (résultat attendu : aucune ligne) :
--   select table_name, privilege_type from information_schema.role_table_grants
--    where grantee = 'anon' and table_schema = 'public';
--
-- Intégrité du journal (résultat attendu : aucune ligne) :
--   select * from public.verifier_journal();
--
-- Empreinte de tête, à conserver hors de Supabase :
--   select empreinte, ligne_id, updated_at from public.serre_audit_tete;
