# Accès collaborateurs — mise en service

Trois opérations, une seule fois. Ensuite tout se fait depuis l'application.

## 1. Migration SQL

Supabase → **SQL Editor** → coller `sql/v47-acces-collaborateurs.sql` → Run.

Le script ajoute à `profiles` les colonnes `must_change_password`, `password_set_at`,
`invited_at`, `invited_by`, et crée la fonction `finish_password_change()`.
Les comptes déjà en service ne sont pas affectés : ils gardent leur mot de passe.

## 2. Mot de passe provisoire du cabinet

C'est un secret de la fonction, jamais une valeur écrite dans l'application.

```bash
supabase secrets set MOT_DE_PASSE_PROVISOIRE='ChoisissezUneChaine2026!'
```

Dix caractères minimum. Pour le changer plus tard, relancer la même commande :
aucun redéploiement n'est nécessaire, et les comptes déjà ouverts ne sont pas touchés.

Depuis l'interface : Supabase → Edge Functions → `acces-collaborateur` → Secrets.

## 3. Déploiement de la fonction

```bash
supabase functions deploy acces-collaborateur
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis
automatiquement par la plateforme : il n'y a rien à configurer pour eux.

---

## Usage courant

**Ouvrir un accès.** Identité du cabinet → Réglages → *Droits utilisateurs* →
**Ouvrir un accès collaborateur**. Saisir l'e-mail et le rôle. L'application affiche
le mot de passe provisoire, à communiquer de vive voix ou par SMS — pas par le même
canal que l'identifiant.

**Première connexion du collaborateur.** L'application ne s'ouvre pas : un écran
lui demande de choisir son mot de passe (12 caractères, trois types de caractères
au minimum). Tant qu'il n'a pas validé, aucune donnée du cabinet n'est chargée.

**Mot de passe perdu.** Soit le collaborateur utilise « Mot de passe oublié ? » sur
l'écran de connexion, soit un administrateur clique **Réinitialiser** en face de son
nom : le compte repart sur le mot de passe provisoire et l'écran de choix réapparaît.

**Départ d'un collaborateur.** Supabase → Authentication → Users → supprimer le
compte. C'est la seule opération qui reste hors de l'application, volontairement.

---

## Le point de vigilance

Le mot de passe provisoire est **commun à tous les nouveaux accès**. Entre la
création d'un compte et la première connexion du collaborateur, ce compte est
ouvert à toute personne qui connaît cette chaîne — y compris pour y fixer un
mot de passe et en prendre le contrôle.

La page des droits affiche donc, en permanence, la liste des comptes encore dans
cet état et depuis combien de jours. Deux réflexes : créer le compte le jour de
l'arrivée plutôt qu'à l'avance, et réinitialiser tout accès qui traîne.

Si vous préférez supprimer ce risque, la même fonction peut être basculée sur
`inviteUserByEmail` : le collaborateur reçoit un lien à usage unique et choisit
son mot de passe sans qu'aucun secret partagé n'existe. Changement d'une dizaine
de lignes dans `functions/acces-collaborateur/index.ts`.

## Portée du blocage

L'écran de choix du mot de passe est appliqué par l'application. Il arrête un
collaborateur, pas quelqu'un qui manipulerait le navigateur : une fois
authentifié, le compte reste autorisé côté base par les politiques RLS.

Pour un verrouillage réellement opposable, il faut porter le drapeau dans
`app_metadata` (donc dans le jeton) et ajouter à chaque politique RLS une
condition `coalesce((auth.jwt() -> 'app_metadata' ->> 'must_change_password')::boolean, false) = false`.
Cela suppose de reprendre l'ensemble des politiques existantes et une seconde
fonction pour lever le drapeau — à faire si des données sensibles justifient
cette rigueur.
