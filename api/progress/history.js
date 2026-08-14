// api/progress/history.js
//
// Renvoie les tentatives précédentes d'un candidat, pour un module donné
// (ou tous les modules si moduleId n'est pas précisé), les plus récentes
// en premier.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { phone, moduleId } = req.query;
  if (!phone) {
    return res.status(400).json({ error: "Numéro de téléphone manquant" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let query = supabase
    .from("session_results")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(20);

  if (moduleId) query = query.eq("module_id", moduleId);

  const { data, error } = await query;

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ results: data || [] });
}
