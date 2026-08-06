// api/admin/users.js
//
// Liste tous les profils mémorisés (inscrits, payants ou non), avec leur
// statut d'accès actuel et leur dernière connexion — protégé par ADMIN_SECRET.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const adminSecret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: users, error } = await supabase
    .from("users")
    .select("id, phone, email, full_name, last_seen_at, created_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: error.message });
  }

  const { data: grants } = await supabase
    .from("access_grants")
    .select("user_id, scope, module_slug, expires_at")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  const grantsByUser = {};
  (grants || []).forEach(g => {
    if (!grantsByUser[g.user_id]) grantsByUser[g.user_id] = g; // le plus pertinent suffit
    if (g.scope === "full") grantsByUser[g.user_id] = g; // priorité à l'accès total
  });

  const enriched = (users || []).map(u => ({
    ...u,
    access: grantsByUser[u.id] || null,
  }));

  return res.status(200).json({ users: enriched });
}
