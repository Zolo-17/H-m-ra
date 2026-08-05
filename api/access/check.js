// api/access/check.js
//
// Vérifie l'accès payant actif d'un candidat (créé automatiquement quand tu
// approuves une demande de paiement dans /admin).
//
// Renvoie :
//  { hasActiveAccess: false }                                    → aucun accès payant
//  { hasActiveAccess: true, scope: "full", expiresAt }           → tout débloqué
//  { hasActiveAccess: true, scope: "module", moduleSlug, expiresAt } → un seul module débloqué

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Numéro de téléphone manquant" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (!user) {
    return res.status(200).json({ hasActiveAccess: false });
  }

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
