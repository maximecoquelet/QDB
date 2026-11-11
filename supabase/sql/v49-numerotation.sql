-- =====================================================================
-- NUMÉROTATION PARTAGÉE DES DEVIS ET LETTRES DE MISSION
-- ---------------------------------------------------------------------
-- L'application appelle `next_references(p_year)` pour attribuer les
-- références définitives. Sans cette fonction, le bouton « Attribuer les
-- références » échoue avec « Numérotation partagée indisponible » et le
-- parcours est bloqué : pas de référence, donc pas de signature.
--
-- À exécuter UNE FOIS par projet Supabase, dans le SQL Editor.
-- Le script est idempotent : le relancer ne perd aucun compteur.
--
-- Format produit : DEV-2026-0001 et LM-2026-0001, même rang pour les deux
-- documents d'un dossier, ce qui correspond au repli local `refsLocales`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Compteurs, une ligne par année
-- ---------------------------------------------------------------------
create table if not exists public.compteurs_references (
  annee       integer primary key,
  valeur      integer not null default 0,
  updated_at  timestamptz not null default now()
);

comment on table public.compteurs_references is
  'Dernier rang attribué par année. Un seul compteur pour le devis et sa lettre : les deux documents d''un dossier portent le même rang.';

alter table public.compteurs_references enable row level security;

-- Personne n''écrit dans cette table directement : tout passe par la
-- fonction ci-dessous, qui s''exécute avec les droits de son propriétaire.
drop policy if exists compteurs_lecture on public.compteurs_references;
create policy compteurs_lecture on public.compteurs_references
  for select to authenticated using (true);

grant select on public.compteurs_references to authenticated;
grant select, insert, update on public.compteurs_references to service_role;


-- ---------------------------------------------------------------------
-- 2. Reprise de l'existant
-- ---------------------------------------------------------------------
-- Si des dossiers portent déjà des références, le compteur démarre après
-- le plus haut rang constaté, année par année. Sans cela, la numérotation
-- repartirait à 0001 et produirait des doublons.
insert into public.compteurs_references (annee, valeur)
select  annee, max(rang)
  from (
    select substring(reference from 'DEV-(\d{4})-')::int  as annee,
           substring(reference from 'DEV-\d{4}-(\d+)')::int as rang
      from public.devis
     where reference ~ '^DEV-\d{4}-\d+$'
  ) t
 group by annee
    on conflict (annee) do update
   set valeur = greatest(public.compteurs_references.valeur, excluded.valeur),
       updated_at = now();


-- ---------------------------------------------------------------------
-- 3. La fonction appelée par l'application
-- ---------------------------------------------------------------------
-- `update ... returning` pose un verrou de ligne : deux collaborateurs qui
-- valident au même instant obtiennent deux rangs distincts, sans collision
-- et sans trou.
create or replace function public.next_references(p_year integer)
returns table (devis_ref text, lm_ref text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rang integer;
begin
  if p_year is null or p_year < 2000 or p_year > 2999 then
    raise exception 'Année de numérotation invalide : %', p_year;
  end if;

  insert into public.compteurs_references (annee, valeur)
       values (p_year, 0)
  on conflict (annee) do nothing;

  update public.compteurs_references
     set valeur = valeur + 1, updated_at = now()
   where annee = p_year
  returning valeur into v_rang;

  return query
    select format('DEV-%s-%s', p_year, lpad(v_rang::text, 4, '0')),
           format('LM-%s-%s',  p_year, lpad(v_rang::text, 4, '0'));
end;
$$;

revoke all on function public.next_references(integer) from public;
grant execute on function public.next_references(integer) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Contrôle
-- ---------------------------------------------------------------------
-- À exécuter séparément pour vérifier. Chaque appel consomme un rang :
-- ne le lancez qu'une fois, le rang obtenu sera simplement sauté.
--
-- select * from public.next_references(extract(year from now())::int);
-- select * from public.compteurs_references order by annee desc;
