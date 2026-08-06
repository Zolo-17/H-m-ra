// api/trial/increment.js
//
// Gère le crédit d'essai gratuit : 2 questions au total, tous modules
// confondus, suivies par numéro de téléphone (pour éviter qu'il suffise
// de vider le navigateur pour recommencer un essai).
//
// Renvoie { allowed: true, questionsUsed } si le candidat peut continuer,
// { allowed: false, questionsUsed } s'il a atteint la limite.

import { createClient } from "@supabase/supabase-js";

const FREE_QUESTIONS_LIMIT = 5;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Numéro de téléphone manquant" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: existing, error: fetchErr } = await supabase
    .from("trial_usage")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (fetchErr) {
    console.error("Erreur Supabase:", fetchErr);
    return res.status(500).json({ error: "Erreur lors de la vérification de l'essai." });
  }

  const currentCount = existing?.questions_used || 0;

  if (currentCount >= FREE_QUESTIONS_LIMIT) {
    return res.status(200).json({ allowed: false, questionsUsed: currentCount });
  }

  const newCount = currentCount + 1;

  const { error: upsertErr } = await supabase
    .from("trial_usage")
    .upsert(
      { phone, questions_used: newCount, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    );

  if (upsertErr) {
    console.error("Erreur Supabase:", upsertErr);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement de l'essai." });
  }

  return res.status(200).json({ allowed: true, questionsUsed: newCount });
}
