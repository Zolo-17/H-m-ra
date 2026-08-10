// api/access/check.js
//
// Vérifie l'accès payant actif d'un candidat, ET la validité de sa session
// (une seule session active autorisée par profil, pour empêcher qu'un même
// compte payant soit utilisé simultanément sur plusieurs appareils).
//
// Renvoie :
//  { sessionInvalid: true }                                      → session ouverte ailleurs, déconnexion requise
//  { hasActiveAccess: false }                                    → aucun accès payant
//  { hasActiveAccess: true, scope: "full", expiresAt }           → tout débloqué
//  { hasActiveAccess: true, scope: "module", moduleSlug, expiresAt } → un seul module débloqué

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone, sessionToken } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Numéro de téléphone manquant" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: user } = await supabase
    .from("users")
    .select("id, active_session_token")
    .eq("phone", phone)
    .maybeSingle();

  if (!user) {
    return res.status(200).json({ hasActiveAccess: false });
  }

  // Contrôle de session unique : si une autre session a été ouverte depuis
  // (jeton différent), celle-ci est invalidée. Si aucun jeton n'a jamais été
  // réclamé (compte créé avant cette fonctionnalité), on le réclame en
  // douceur pour cet appareil plutôt que de déconnecter injustement.
  if (user.active_session_token && sessionToken && user.active_session_token !== sessionToken) {
    return res.status(200).json({ sessionInvalid: true });
  }
  if (!user.active_session_token && sessionToken) {
    await supabase.from("users").update({ active_session_token: sessionToken }).eq("id", user.id);
  }

  // Toute vérification d'accès = une preuve de connexion active du candidat
  await supabase
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  const { data: grants, error } = await supabase
    .from("access_grants")
    .select("id, expires_at, status, scope, module_slug")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false });

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: "Erreur lors de la vérification." });
  }

  const active = grants || [];
  if (active.length === 0) {
    return res.status(200).json({ hasActiveAccess: false });
  }

  // Si un accès total actif existe, il prime sur tout accès module
  const fullGrant = active.find(g => g.scope === "full");
  if (fullGrant) {
    return res.status(200).json({
      hasActiveAccess: true,
      scope: "full",
      expiresAt: fullGrant.expires_at,
    });
  }

  const moduleGrant = active[0]; // le plus récent accès module actif
  return res.status(200).json({
    hasActiveAccess: true,
    scope: "module",
    moduleSlug: moduleGrant.module_slug,
    expiresAt: moduleGrant.expires_at,
  });
}
