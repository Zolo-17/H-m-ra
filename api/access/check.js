// api/access/check.js
//
// Vérifie si le numéro de téléphone donné a un accès payant actif
// (créé automatiquement quand tu approuves une demande de paiement
// dans /admin). Renvoie { hasActiveAccess: true|false }.

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
    .select("id, expires_at, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: "Erreur lors de la vérification." });
  }

  return res.status(200).json({ hasActiveAccess: (grants || []).length > 0 });
}
