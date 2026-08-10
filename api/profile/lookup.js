// api/profile/lookup.js
//
// Permet à un candidat déjà inscrit de retrouver son profil (accès actif,
// essai gratuit restant) depuis un nouvel appareil ou après avoir vidé
// son navigateur, simplement avec son numéro de téléphone.
//
// C'est un acte de connexion : ce nouvel appareil devient la seule session
// active pour ce profil, ce qui invalide automatiquement toute session
// ouverte ailleurs (empêche le partage d'un même compte payant).

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone, sessionToken } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Numéro de téléphone manquant" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (!user) {
    return res.status(200).json({ found: false });
  }

  await supabase
    .from("users")
    .update({
      last_seen_at: new Date().toISOString(),
      active_session_token: sessionToken || undefined,
    })
    .eq("id", user.id);

  const { data: grants } = await supabase
    .from("access_grants")
    .select("expires_at, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);

  const { data: trial } = await supabase
    .from("trial_usage")
    .select("questions_used")
    .eq("phone", phone)
    .maybeSingle();

  return res.status(200).json({
    found: true,
    email: user.email || null,
    fullName: user.full_name || null,
    gender: user.gender || null,
    hasActiveAccess: (grants || []).length > 0,
    expiresAt: grants?.[0]?.expires_at || null,
    questionsUsed: trial?.questions_used || 0,
  });
}
