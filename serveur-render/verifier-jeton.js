/* =====================================================================
   SERRE — Contrôle d'accès du service Render (v54)
   ---------------------------------------------------------------------
   Jusqu'à la v53, le service acceptait toute requête : son adresse étant
   lisible dans le code public de l'application, n'importe qui pouvait
   créer des demandes de signature Yousign au nom du cabinet, télécharger
   des documents signés ou utiliser le rendu PDF et la recherche RNE.

   Ce module exige désormais un jeton de session Supabase valide, que
   l'application v54 joint à chaque appel (en-tête Authorization). Le jeton
   est vérifié auprès de Supabase lui-même (GET /auth/v1/user).

   Variables d'environnement FACULTATIVES (valeurs par défaut intégrées) :
     SUPABASE_URL       https://ueuhedaqpzxmjrcjktmw.supabase.co
     SUPABASE_ANON_KEY  la clé « publishable » (sb_publishable_…), la même
                        que dans assets/js/00-core.js — elle n'est pas secrète.

   Branchement dans server.js (Express), AVANT les routes /api :
       const { verifierJeton } = require("./verifier-jeton");
       app.use(verifierJeton);
   Placer `app.use(cors(...))` AVANT cette ligne, pour que les requêtes
   de contrôle CORS (OPTIONS) reçoivent leur réponse.

   Aucune dépendance : Node 18 ou plus (fetch intégré).
   ===================================================================== */
"use strict";

const crypto = require("crypto");

/* Valeurs par défaut : celles du projet SERRE. Elles sont publiques (déjà
   présentes dans le code de l'application) ; les variables d'environnement
   Render, si elles sont déclarées, les remplacent. */
const SUPABASE_URL = String(process.env.SUPABASE_URL || "https://ueuhedaqpzxmjrcjktmw.supabase.co").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_QH-5FvLviSJJZD3Fne_CPQ_KeYWDrGm";

/* Seule la route de santé de base reste publique : Render l'interroge pour
   savoir si le service est en vie. Elle ne révèle rien. */
const ROUTES_PUBLIQUES = new Set(["/", "/health"]);

/* Un jeton validé est gardé en mémoire 60 secondes, pour ne pas solliciter
   Supabase à chaque appel. On ne conserve que son empreinte. */
const CACHE_MS = 60 * 1000;
const cache = new Map();

function empreinte(jeton) {
  return crypto.createHash("sha256").update(jeton).digest("hex");
}

async function utilisateurDuJeton(jeton) {
  const cle = empreinte(jeton);
  const connu = cache.get(cle);
  if (connu && connu.expire > Date.now()) return connu.utilisateur;

  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + jeton },
  });
  if (!r.ok) return null;
  const utilisateur = await r.json().catch(() => null);
  if (!utilisateur || !utilisateur.id) return null;

  cache.set(cle, { utilisateur, expire: Date.now() + CACHE_MS });
  if (cache.size > 500) {
    const maintenant = Date.now();
    for (const [k, v] of cache) if (v.expire <= maintenant) cache.delete(k);
  }
  return utilisateur;
}

async function verifierJeton(req, res, next) {
  if (req.method === "OPTIONS") return next();
  if (ROUTES_PUBLIQUES.has(req.path)) return next();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("verifier-jeton : SUPABASE_URL ou SUPABASE_ANON_KEY absent — accès refusé.");
    return res.status(503).json({ error: "Service mal configuré : contrôle d'accès indisponible." });
  }

  const entete = String(req.headers.authorization || "");
  const m = /^Bearer\s+(.+)$/i.exec(entete);
  if (!m) return res.status(401).json({ error: "Authentification requise." });

  try {
    const utilisateur = await utilisateurDuJeton(m[1].trim());
    if (!utilisateur) return res.status(401).json({ error: "Session invalide ou expirée. Reconnectez-vous." });
    req.utilisateur = { id: utilisateur.id, email: utilisateur.email || "" };
    return next();
  } catch (e) {
    console.error("verifier-jeton :", e && e.message);
    return res.status(503).json({ error: "Contrôle d'accès momentanément indisponible." });
  }
}

module.exports = { verifierJeton };
