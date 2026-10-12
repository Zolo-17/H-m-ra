// api/access/check.js
//
// Vérifie uniquement que la session du candidat est toujours la session
// active de son profil (un seul appareil à la fois). Plus aucun paiement.
// GET ?phone=&sessionToken=  →  { sessionInvalid: true | false }

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

  if (!user) return res.status(200).json({ sessionInvalid: false });

  if (user.active_session_token && sessionToken && user.active_session_token !== sessionToken) {
    return res.status(200).json({ sessionInvalid: true });
  }

  if (!user.active_session_token && sessionToken) {
    await supabase.from("users").update({ active_session_token: sessionToken }).eq("id", user.id);
  }

  await supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
  return res.status(200).json({ sessionInvalid: false });
}
