// api/profile/register.js
//
// Appelé à chaque inscription (ou reconnaissance d'un profil existant) pour
// que le profil du candidat soit mémorisé côté serveur, avec sa dernière
// connexion — pas seulement dans le navigateur local du candidat.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone, email, fullName, gender, sessionToken } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Numéro de téléphone manquant" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  // S'inscrire est un acte de connexion : ce nouvel appareil devient la
  // seule session active pour ce profil, invalidant toute autre session.
  if (existing) {
    await supabase
      .from("users")
      .update({
        email: email || undefined,
        full_name: fullName || undefined,
        gender: gender || undefined,
        last_seen_at: now,
        active_session_token: sessionToken || undefined,
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("users")
      .insert({
        phone, email: email || null, full_name: fullName || null, gender: gender || null,
        last_seen_at: now, active_session_token: sessionToken || null,
      });
  }

  return res.status(200).json({ success: true });
}
