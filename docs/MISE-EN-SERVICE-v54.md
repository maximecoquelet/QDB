# SERRE v54 — mise en service

L'ordre compte : chaque étape suppose la précédente.

| # | Où | Action | Durée |
|---|----|--------|-------|
| 1 | Supabase → Authentication → Sign In / Providers | Décocher **Allow new users to sign up** | 1 min |
| 2 | Supabase → Authentication → URL Configuration | Site URL et Redirect URLs = adresse Netlify de l'application | 2 min |
| 3 | Supabase → SQL Editor | Exécuter `supabase/sql/v54-securite.sql` | 1 min |
| 4 | Terminal | `supabase functions deploy acces-collaborateur` | 2 min |
| 5 | Netlify | Déployer le contenu du dépôt (glisser le dossier, ou relier Netlify au dépôt GitHub) | 2 min |
| 6 | Render | Appliquer `serveur-render/LISEZMOI.md` | 10 min |
| 7 | Supabase → Edge Functions → Secrets | Supprimer `MOT_DE_PASSE_PROVISOIRE` | 1 min |
| 8 | Application → Réglages → Utilisateurs | Cliquer **Réinitialiser** pour tout compte encore « En attente » : il était ouvert avec l'ancien mot de passe commun | — |

## Contrôles après mise en service

- SQL Editor : `select * from public.verifier_journal();` → aucune ligne.
- SQL Editor : `select table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';` → aucune ligne.
- Se connecter avec un compte collaborateur : l'application s'ouvre normalement.
- Ouvrir un dossier, générer un PDF : fonctionne (le jeton est accepté par Render).
- `curl -i https://serre-yousign-server.onrender.com/api/signature-requests/test` → 401.

## Ce que change la v54

**Supabase**
- La vue `acces_en_attente` ne contourne plus les règles d'accès (elle était lisible sans connexion).
- Aucun droit pour un visiteur non connecté (rôle `anon`).
- Identité du cabinet et paramètres de signature : modifiables par un administrateur seulement ; modèles et lettres de mission : manager ou administrateur. L'interface appliquait déjà ces règles, la base les impose désormais.
- Journal des erreurs : lisible par les administrateurs seulement.
- Journal des actions : auteur et date fixés par la base ; chaînage SHA-256 ; modification et suppression bloquées ; contrôle par `verifier_journal()`.

**Comptes**
- Fin du mot de passe provisoire commun : liens à usage unique (invitation, réinitialisation).
- « Mot de passe oublié ? » mène désormais à l'écran de choix d'un nouveau mot de passe. Avant, le lien ouvrait l'application sans faire changer le mot de passe.

**Application**
- Bibliothèques hébergées avec l'application, versions figées : supabase-js 2.118.0 ; SheetJS 0.20.3, qui corrige CVE-2023-30533 (pollution de prototype) et CVE-2024-22363 (ReDoS), exploitables par un fichier Excel importé.
- Content-Security-Policy dans `netlify.toml`. **Si l'URL du service Render change**, l'ajouter à `connect-src`.
- Chaque appel au service Render porte le jeton de session.
- Restauration d'une sauvegarde : l'import de l'historique d'audit échouait (auteur vide refusé par la base). Il fonctionne désormais ; l'auteur et la date d'origine sont conservés dans le détail.

## Points restant à traiter (hors code)

- **Sauvegardes** : vérifier le plan Supabase. Sur le plan gratuit, il n'y a pas de sauvegarde restaurable et le projet est suspendu après 7 jours d'inactivité. Faire un export régulier (Outils internes → Sauvegardes).
- **Render gratuit** : mise en veille après inactivité, avec jusqu'à 50 s d'attente au premier appel (PDF, signature).
- **RGPD / secret professionnel** : région d'hébergement Supabase (UE ?) et accords de sous-traitance (art. 28 RGPD) avec Supabase, Render et Yousign. Les fiches clients contiennent les questionnaires LCB-FT.
- **Formules de tarification** : elles sont exécutées comme du code JavaScript (`20-pricing.js`). Un manager peut donc y placer du code qui s'exécutera chez les autres utilisateurs. Risque limité aux managers de confiance ; une réécriture par un interpréteur de formules supprimerait ce risque et permettrait de retirer `'unsafe-eval'` de la CSP.
- **Accès aux dossiers** : tout utilisateur connecté lit et modifie tous les dossiers et toutes les fiches clients. C'est un choix d'organisation (petit cabinet, travail en équipe). Un cloisonnement par responsable de dossier est possible si nécessaire.
