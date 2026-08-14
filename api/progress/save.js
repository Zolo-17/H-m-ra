// api/progress/save.js
//
// Enregistre le résultat d'une simulation terminée (note moyenne, nombre
// de questions), pour permettre au candidat de suivre sa progression
// d'une tentative à l'autre sur un même module.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone, moduleId, moduleLabel, averageScore, questionsCount, mode } = req.body;
  if (!phone || !moduleId) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from("session_results").insert({
    phone,
    module_id: moduleId,
    module_label: moduleLabel || null,
    average_score: averageScore ?? null,
    questions_count: questionsCount ?? null,
    mode: mode || null,
  });

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
