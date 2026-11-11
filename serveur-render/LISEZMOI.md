# Service Render — contrôle d'accès (v54)

## Le problème

Le service `serre-yousign-server.onrender.com` (dépôt GitHub
`maximecoquelet/serre-yousign-server`) accepte toute requête, sans aucune
identification. Son adresse est lisible dans le code public de l'application.
Vérifié le 11/11/2026 : une requête anonyme, envoyée depuis un serveur tiers,
a été relayée jusqu'à l'API Yousign.

Le filtrage CORS par origine, qui est en place, ne protège pas : il ne
contraint que les navigateurs, pas un script ou un serveur.

Conséquences possibles : envoi de demandes de signature au nom du cabinet,
téléchargement de documents signés si l'identifiant de la demande est connu,
utilisation du rendu PDF et de l'accès RNE/INPI du cabinet aux frais de celui-ci.

## La correction

1. Copier `verifier-jeton.js` à la racine du dépôt `serre-yousign-server`.
2. Dans `server.js`, juste après `app.use(cors(...))` et avant les routes :
   ```js
   const { verifierJeton } = require("./verifier-jeton");
   app.use(verifierJeton);
   ```
   (Si le projet est en modules ES — `import` au lieu de `require` — remplacer
   la dernière ligne du module par `export { verifierJeton };` et
   `require("crypto")` par `import crypto from "crypto";`.)
3. Facultatif — l'adresse et la clé publique du projet sont intégrées au module ; les déclarer dans Render → **Environment** seulement si le projet Supabase change :
   - `SUPABASE_URL` = `https://ueuhedaqpzxmjrcjktmw.supabase.co`
   - `SUPABASE_ANON_KEY` = la clé `sb_publishable_…` (celle de `assets/js/00-core.js`)
4. Déployer **après** la mise en ligne de l'application v54 sur Netlify :
   l'application v54 envoie le jeton ; l'ancienne ne l'envoie pas et serait
   refusée.

## Ce qui reste public

Seules `/` et `/health` (sonde de Render, sans information sensible).
`/health/rne` et `/health/yousign`, qui interrogent les services tiers,
exigent le jeton.

## Contrôle

```bash
curl -i https://serre-yousign-server.onrender.com/api/signature-requests/test
# attendu : HTTP 401 {"error":"Authentification requise."}
```
