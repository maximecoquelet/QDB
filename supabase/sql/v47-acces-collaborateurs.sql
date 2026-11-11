-- =====================================================================
-- SERRE v47 — Accès collaborateurs : mot de passe provisoire imposé
-- ---------------------------------------------------------------------
-- À exécuter une fois dans Supabase → SQL Editor.
-- Le script est idempotent : le relancer ne casse rien.
--
-- Ce qu'il met en place :
--   1. trois colonnes sur `profiles` pour suivre l'état du mot de passe ;
--   2. une fonction `finish_password_change()` que le collaborateur appelle
--      lui-même, et qui est la SEULE écriture qu'il peut faire sur son
--      profil — il ne peut donc pas s'attribuer un rôle au passage ;
--   3. une vue de contrôle pour repérer les comptes encore ouverts avec le
--      mot de passe provisoire.
-- =====================================================================

-- 1. ------------------------------------------------------- colonnes
alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_set_at      timestamptz,
  add column if not exists invited_at           timestamptz,
  add column if not exists invited_by           uuid references auth.users(id) on delete set null;

comment on column public.profiles.must_change_password is
  'Vrai tant que le collaborateur n''a pas remplacé le mot de passe provisoire. L''application affiche alors un écran bloquant.';
comment on column public.profiles.password_set_at is
  'Horodatage du dernier mot de passe choisi par le collaborateur lui-même.';

-- Les comptes déjà en service ne doivent pas se voir imposer l'écran :
-- on considère qu'ils ont choisi leur mot de passe.
update public.profiles
   set must_change_password = false,
       password_set_at = coalesce(password_set_at, created_at, now())
 where must_change_password is null
    or (must_change_password = true and password_set_at is null and invited_at is null);


-- 2. ------------------------------------- levée du drapeau par l'intéressé
-- SECURITY DEFINER : la fonction s'exécute avec les droits de son
-- propriétaire, mais elle est verrouillée sur `auth.uid()`. Un collaborateur
-- ne peut donc lever le drapeau que pour lui-même, et ne touche à aucune
-- autre colonne — en particulier pas à `role`.
create or replace function public.finish_password_change()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set must_change_password = false,
         password_set_at      = now(),
         updated_at           = now()
   where id = auth.uid();
$$;

revoke all      on function public.finish_password_change() from public;
grant  execute  on function public.finish_password_change() to authenticated;


-- 3. --------------------------------------- droits de la clé d'administration
-- La clé `service_role`, sous laquelle tourne l'Edge Function, contourne les
-- politiques RLS mais PAS les autorisations de table. Selon la façon dont
-- `profiles` a été créée, ces autorisations peuvent lui manquer : la fonction
-- échoue alors sur « permission denied for table profiles ».
-- Ces droits ne créent aucune ouverture : `service_role` est par conception la
-- clé à accès total, jamais exposée au navigateur.
grant select, insert, update, delete on public.profiles to service_role;


-- 4. ------------------------------------------------ contrôle administratif
-- Comptes créés mais jamais ouverts : ils tournent encore sur le mot de
-- passe provisoire, qui est commun à tous. À surveiller et à relancer.
create or replace view public.acces_en_attente as
  select id,
         email,
         role,
         invited_at,
         now() - invited_at as anciennete
    from public.profiles
   where must_change_password = true
   order by invited_at nulls last;

comment on view public.acces_en_attente is
  'Comptes dont le mot de passe provisoire n''a pas encore été remplacé.';
