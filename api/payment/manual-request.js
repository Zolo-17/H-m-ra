// api/payment/manual-request.js
//
// Reçoit la déclaration de paiement d'un candidat (après qu'il ait payé
// sur ton numéro Airtel Money ou Moov Money) et l'enregistre dans Supabase
// en statut "pending", en attendant ta vérification manuelle.
// Envoie aussi un email de notification (via Resend) pour que tu sois
// prévenu sans avoir à vérifier /admin manuellement.

import { createClient } from "@supabase/supabase-js";

async function sendNotificationEmail({ fullName, phone, method, offerCode, transactionReference }) {
  const to = process.env.NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) {
    console.warn("Notification email non envoyée : NOTIFY_EMAIL ou RESEND_API_KEY manquant.");
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Héméra <onboarding@resend.dev>",
        to: [to],
        subject: `Nouvelle demande de paiement — ${fullName}`,
        text: `Un candidat vient de déclarer un paiement.

Nom : ${fullName}
Téléphone : ${phone}
Méthode : ${method === "airtel_money" ? "Airtel Money" : "Moov Money"}
Offre : ${offerCode}
Référence transaction : ${transactionReference || "non renseignée"}

Va sur ton site, https://h-m-ra-8vu2.vercel.app/admin , pour vérifier et approuver cette demande.`,
      }),
    });
  } catch (err) {
    // On ne bloque jamais l'enregistrement de la demande à cause d'un souci d'email
    console.error("Erreur envoi email de notification:", err);
  }
}

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

  await sendNotificationEmail({ fullName, phone, method, offerCode, transactionReference });

  return res.status(200).json({ success: true });
}

