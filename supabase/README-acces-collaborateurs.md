# Accès collaborateurs — mise en service (v54)

Depuis la v54, il n'existe plus de mot de passe provisoire commun. Chaque accès
est ouvert par un **lien à usage unique**, propre au compte, que l'administrateur
transmet au collaborateur.

## 1. Réglages Supabase (une fois)

Supabase → **Authentication** :

- **Sign In / Providers** → décocher **« Allow new users to sign up »**.
  Sans cela, n'importe qui peut se créer un compte avec la clé publique de
  l'application et lire tous les dossiers.
- **URL Configuration** → **Site URL** = l'adresse Netlify de l'application ;
  **Redirect URLs** : ajouter la même adresse. Les liens d'invitation et de
  réinitialisation ramènent à cette adresse ; une adresse non déclarée est refusée.
- **Providers → Email → Email OTP Expiration** : durée de validité des liens
  (3 600 s par défaut ; 86 400 s au maximum).

## 2. Migration SQL

SQL Editor → coller `sql/v54-securite.sql` → Run (après 00, v47, v49 et v50).

## 3. Déploiement de la fonction

```bash
supabase functions deploy acces-collaborateur
```

Aucun secret à fournir. L'ancien secret peut être supprimé :

```bash
supabase secrets unset MOT_DE_PASSE_PROVISOIRE
```

---

## Usage courant

**Ouvrir un accès.** Réglages → *Utilisateurs* → **Ouvrir un accès collaborateur**.
Saisir l'e-mail et le rôle. L'application affiche un lien à usage unique, à copier
et à transmettre au seul collaborateur concerné. En le suivant, il choisit son mot
de passe (12 caractères, trois types de caractères au minimum).

**Mot de passe perdu.** Le collaborateur utilise « Mot de passe oublié ? » sur
l'écran de connexion (nécessite l'envoi de courriels par Supabase, voir ci-dessous),
ou un administrateur clique **Réinitialiser** en face de son nom : l'ancien mot de
passe cesse immédiatement de fonctionner et un nouveau lien est produit.

**Lien expiré ou égaré.** Cliquer **Réinitialiser** : un nouveau lien est produit,
l'ancien ne fonctionne plus.

**Départ d'un collaborateur.** Supabase → Authentication → Users → supprimer le
compte.

## Courriels Supabase

La création d'accès n'envoie aucun courriel : le lien est remis par l'administrateur.
En revanche, « Mot de passe oublié ? » envoie un courriel. Le service d'envoi
intégré de Supabase est limité à quelques messages par heure et réservé aux adresses
des membres du projet ; pour un usage réel, configurer un SMTP du cabinet
(Authentication → Emails → SMTP Settings).
Source : https://supabase.com/docs/guides/auth/auth-smtp

## Portée du blocage

L'écran de choix du mot de passe est imposé par l'application. Après la v54,
il n'existe plus de mot de passe connu de plusieurs personnes : un compte en
attente ne peut être ouvert que par celui qui détient son lien.
