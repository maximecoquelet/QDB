// =====================================================================
// SERRE — Edge Function « acces-collaborateur »  (v54)
// ---------------------------------------------------------------------
// Seule voie de création d'un compte collaborateur. Elle détient la clé
// `service_role`, qui ne doit jamais figurer dans l'application : celle-ci
// est publique, son code est lisible par tout visiteur.
//
// v54 : il n'existe plus de mot de passe provisoire commun. Chaque accès
// est ouvert par un LIEN À USAGE UNIQUE, propre au compte, produit par
// Supabase (`auth.admin.generateLink`). L'administrateur le transmet au
// collaborateur, qui choisit lui-même son mot de passe.
//
// Deux actions :
//   creer         — crée le compte (lien de type « invite ») et le profil
//                   avec le rôle demandé.
//   reinitialiser — rend le mot de passe actuel inutilisable (valeur
//                   aléatoire jamais communiquée) et produit un lien de
//                   type « recovery ».
//
// Dans les deux cas le drapeau `must_change_password` est remis à vrai.
//
// Aucun secret à configurer : SUPABASE_URL, SUPABASE_ANON_KEY et
// SUPABASE_SERVICE_ROLE_KEY sont fournis par la plateforme. Le secret
// MOT_DE_PASSE_PROVISOIRE de la v47 peut être supprimé.
//
// Déploiement :
//   supabase functions deploy acces-collaborateur
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["collaborateur", "manager", "admin"];

function reponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Mot de passe aléatoire de 48 caractères, jamais affiché ni conservé :
// il sert uniquement à rendre l'ancien mot de passe inutilisable.
function motDePasseJetable(): string {
  const octets = new Uint8Array(36);
  crypto.getRandomValues(octets);
  return btoa(String.fromCharCode(...octets));
}

// L'adresse de retour n'est retenue que si elle est en HTTPS (ou locale) ;
// Supabase la refuse de toute façon si elle ne figure pas dans
// Authentication → URL Configuration → Redirect URLs.
function adresseRetour(v: unknown): string | undefined {
  try {
    const u = new URL(String(v ?? ""));
    if (u.protocol === "https:" || u.hostname === "localhost") return u.origin + u.pathname;
  } catch (_) { /* adresse absente ou illisible */ }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reponse({ error: "Méthode non autorisée." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ---------------------------------------------------------------
  // 1. Qui appelle ? On relit le jeton du navigateur côté serveur : le
  //    rôle affiché dans l'application ne prouve rien.
  // ---------------------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return reponse({ error: "Authentification requise." }, 401);

  const appelant = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await appelant.auth.getUser();
  if (userError || !user) return reponse({ error: "Session invalide ou expirée." }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: profilAppelant, error: profilError } = await admin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profilError) return reponse({ error: "Profil appelant illisible : " + profilError.message }, 500);
  if (profilAppelant?.role !== "admin") {
    return reponse({ error: "Action réservée aux administrateurs du cabinet." }, 403);
  }

  // ---------------------------------------------------------------
  // 2. Paramètres
  // ---------------------------------------------------------------
  let corps: Record<string, unknown>;
  try { corps = await req.json(); } catch { return reponse({ error: "Requête illisible." }, 400); }

  const action = String(corps.action ?? "creer");
  const email = String(corps.email ?? "").trim().toLowerCase();
  const role = String(corps.role ?? "collaborateur");
  const redirectTo = adresseRetour(corps.redirectTo);

  if (!["creer", "reinitialiser"].includes(action)) return reponse({ error: "Action inconnue." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reponse({ error: "Adresse e-mail invalide." }, 400);
  if (!ROLES.includes(role)) return reponse({ error: "Rôle inconnu." }, 400);

  const maintenant = new Date().toISOString();

  // ---------------------------------------------------------------
  // 3a. Réinitialisation d'un compte existant
  // ---------------------------------------------------------------
  if (action === "reinitialiser") {
    const { data: cible, error: rechercheError } = await admin
      .from("profiles").select("id,email,role").eq("email", email).maybeSingle();
    if (rechercheError) return reponse({ error: rechercheError.message }, 500);
    if (!cible) return reponse({ error: "Aucun compte ne correspond à cette adresse." }, 404);
    if (cible.id === user.id) {
      return reponse({ error: "Utilisez « Mot de passe oublié ? » pour votre propre compte." }, 400);
    }

    // L'ancien mot de passe cesse immédiatement de fonctionner.
    const { error: majError } = await admin.auth.admin.updateUserById(cible.id, {
      password: motDePasseJetable(),
    });
    if (majError) return reponse({ error: "Réinitialisation impossible : " + majError.message }, 500);

    const { data: lien, error: lienError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (lienError || !lien?.properties?.action_link) {
      return reponse({ error: "Lien de réinitialisation non produit : " + (lienError?.message ?? "réponse vide") }, 500);
    }

    await admin.from("profiles").update({
      must_change_password: true,
      password_set_at: null,
      invited_at: maintenant,
      invited_by: user.id,
      updated_at: maintenant,
    }).eq("id", cible.id);

    return reponse({
      action: "reinitialiser",
      email,
      role: cible.role,
      lien: lien.properties.action_link,
      message: "L'ancien mot de passe ne fonctionne plus. Transmettez le lien ci-dessous au collaborateur : il choisira un nouveau mot de passe en le suivant.",
    });
  }

  // ---------------------------------------------------------------
  // 3b. Création
  // ---------------------------------------------------------------
  const { data: existant } = await admin
    .from("profiles").select("id").eq("email", email).maybeSingle();
  if (existant) return reponse({ error: "Un compte existe déjà pour cette adresse. Utilisez la réinitialisation." }, 409);

  // `generateLink` de type « invite » crée le compte sans mot de passe et
  // renvoie le lien d'acceptation, sans envoyer de courriel.
  const { data: invitation, error: creationError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { cree_par: user.email ?? user.id },
      ...(redirectTo ? { redirectTo } : {}),
    },
  });
  if (creationError || !invitation?.user || !invitation?.properties?.action_link) {
    return reponse({ error: "Création impossible : " + (creationError?.message ?? "réponse vide") }, 500);
  }

  // Le profil existe déjà si le trigger `profil_a_l_inscription` est en
  // place : on remonte donc en upsert plutôt qu'en insert.
  const { error: profilUpsertError } = await admin.from("profiles").upsert({
    id: invitation.user.id,
    email,
    role,
    must_change_password: true,
    password_set_at: null,
    invited_at: maintenant,
    invited_by: user.id,
    updated_at: maintenant,
  }, { onConflict: "id" });

  if (profilUpsertError) {
    // On ne laisse pas un compte d'authentification orphelin derrière nous.
    await admin.auth.admin.deleteUser(invitation.user.id);
    return reponse({ error: "Profil non créé, le compte a été annulé : " + profilUpsertError.message }, 500);
  }

  return reponse({
    action: "creer",
    email,
    role,
    lien: invitation.properties.action_link,
    message: "Compte créé. Transmettez le lien ci-dessous au collaborateur : il choisira son mot de passe en le suivant.",
  });
});
