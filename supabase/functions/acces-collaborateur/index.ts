// =====================================================================
// SERRE — Edge Function « acces-collaborateur »
// ---------------------------------------------------------------------
// Seule voie de création d'un compte collaborateur. Elle détient la clé
// `service_role`, qui ne doit jamais figurer dans l'application : celle-ci
// est publique, son code est lisible par tout visiteur.
//
// Deux actions :
//   creer        — crée le compte Supabase, l'e-mail est auto-confirmé, le
//                  mot de passe est le mot de passe provisoire du cabinet,
//                  et le profil est créé avec le rôle demandé.
//   reinitialiser — replace un compte existant sur le mot de passe
//                  provisoire (collaborateur qui a perdu le sien).
//
// Dans les deux cas le drapeau `must_change_password` est remis à vrai :
// l'application impose l'écran de choix de mot de passe à la connexion
// suivante.
//
// Déploiement :
//   supabase secrets set MOT_DE_PASSE_PROVISOIRE='…'
//   supabase functions deploy acces-collaborateur
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reponse({ error: "Méthode non autorisée." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const motDePasseProvisoire = Deno.env.get("MOT_DE_PASSE_PROVISOIRE") ?? "";

  if (!motDePasseProvisoire || motDePasseProvisoire.length < 10) {
    return reponse({ error: "Le mot de passe provisoire du cabinet n'est pas configuré (secret MOT_DE_PASSE_PROVISOIRE, 10 caractères minimum)." }, 500);
  }

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

    const { error: majError } = await admin.auth.admin.updateUserById(cible.id, {
      password: motDePasseProvisoire,
    });
    if (majError) return reponse({ error: "Réinitialisation impossible : " + majError.message }, 500);

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
      motDePasseProvisoire,
      message: "Le compte est replacé sur le mot de passe provisoire. Le choix d'un nouveau mot de passe sera imposé à la prochaine connexion.",
    });
  }

  // ---------------------------------------------------------------
  // 3b. Création
  // ---------------------------------------------------------------
  const { data: existant } = await admin
    .from("profiles").select("id").eq("email", email).maybeSingle();
  if (existant) return reponse({ error: "Un compte existe déjà pour cette adresse. Utilisez la réinitialisation." }, 409);

  const { data: cree, error: creationError } = await admin.auth.admin.createUser({
    email,
    password: motDePasseProvisoire,
    email_confirm: true, // pas de courriel de confirmation : l'accès est ouvert par le cabinet
    user_metadata: { cree_par: user.email ?? user.id },
  });
  if (creationError || !cree?.user) {
    return reponse({ error: "Création impossible : " + (creationError?.message ?? "réponse vide") }, 500);
  }

  // Le profil peut déjà exister si un trigger `on auth.users` est en place :
  // on remonte donc en upsert plutôt qu'en insert.
  const { error: profilUpsertError } = await admin.from("profiles").upsert({
    id: cree.user.id,
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
    await admin.auth.admin.deleteUser(cree.user.id);
    return reponse({ error: "Profil non créé, le compte a été annulé : " + profilUpsertError.message }, 500);
  }

  return reponse({
    action: "creer",
    email,
    role,
    motDePasseProvisoire,
    message: "Compte créé. Communiquez le mot de passe provisoire au collaborateur : il devra en choisir un autre dès sa première connexion.",
  });
});
