// api/payment/manual-request.js
//
// Reçoit la déclaration de paiement d'un candidat (après qu'il ait payé
// sur ton numéro Airtel Money ou Moov Money) et l'enregistre dans Supabase
// en statut "pending", en attendant ta vérification manuelle.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { fullName, phone, method, offerCode, transactionReference } = req.body;

  if (!fullName || !phone || !method || !offerCode) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from("manual_payment_requests").insert({
    full_name: fullName,
    phone,
    method,
    offer_code: offerCode,
    transaction_reference: transactionReference || null,
  });

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
  }

  return res.status(200).json({ success: true });
}
