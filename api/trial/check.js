// api/trial/check.js
//
// Vérifie le solde d'essai gratuit RESTANT, sans le consommer — utile pour
// autoriser un échange (ex: une tentative de reformulation) sans compter
// cela comme une nouvelle question utilisée. Seul /api/trial/increment
// consomme réellement un crédit, au moment où une question est conclue.

import { createClient } from "@supabase/supabase-js";

const FREE_QUESTIONS_LIMIT = 5;

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

  const { data: existing, error } = await supabase
    .from("trial_usage")
    .select("questions_used")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: "Erreur lors de la vérification de l'essai." });
  }

  const currentCount = existing?.questions_used || 0;
  return res.status(200).json({
    allowed: currentCount < FREE_QUESTIONS_LIMIT,
    questionsUsed: currentCount,
  });
}
