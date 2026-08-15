// lib/rateLimit.js
//
// Limitation de fréquence simple, basée sur Supabase (pas de service tiers
// à configurer). Chaque appel autorisé enregistre un jeton horodaté ;
// on compte les jetons récents pour la même "clé" (endpoint + IP) avant
// de laisser passer une nouvelle requête.

import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Récupère l'adresse IP du visiteur depuis les en-têtes transmis par Vercel.
export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Vérifie et enregistre une tentative pour une "clé" donnée.
 * @param {string} bucket - identifiant unique (ex: "register:1.2.3.4")
 * @param {number} maxRequests - nombre maximum d'appels autorisés
 * @param {number} windowMinutes - fenêtre de temps glissante, en minutes
 * @returns {Promise<{allowed: boolean}>}
 */
export async function checkRateLimit(bucket, maxRequests, windowMinutes) {
  try {
    const supabase = supabaseAdmin();
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();

    const { count, error } = await supabase
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("bucket_key", bucket)
      .gt("created_at", since);

    if (error) {
      console.error("Erreur rate limit:", error);
      return { allowed: true }; // un souci technique ne doit jamais bloquer un candidat légitime
    }

    if ((count || 0) >= maxRequests) {
      return { allowed: false };
    }

    await supabase.from("rate_limits").insert({ bucket_key: bucket });
    return { allowed: true };
  } catch (err) {
    console.error("Erreur rate limit:", err);
    return { allowed: true };
  }
}
