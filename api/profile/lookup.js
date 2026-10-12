// api/profile/lookup.js
//
// Permet à un candidat déjà inscrit de retrouver son profil depuis un nouvel appareil ou après avoir vidé
// son navigateur, simplement avec son numéro de téléphone.
//
// C'est un acte de connexion : ce nouvel appareil devient la seule session
// active pour ce profil, ce qui invalide automatiquement toute session
// ouverte ailleurs (empêche le partage d'un même profil).

import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "../../lib/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`lookup:${ip}`, 10, 10);
  if (!allowed) {
    return res.status(429).json({ error: "Trop de tentatives. Merci de patienter quelques minutes." });
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

  return res.status(200).json({
    found: true,
    email: user.email || null,
    fullName: user.full_name || null,
    gender: user.gender || null,
  });
}
