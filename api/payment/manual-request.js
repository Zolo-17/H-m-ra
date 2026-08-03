// api/payment/manual-request.js
//
// Reçoit la déclaration de paiement d'un candidat (après qu'il ait payé
// sur ton numéro Airtel Money ou Moov Money) et l'enregistre dans Supabase
// en statut "pending", en attendant ta vérification manuelle.
// Envoie deux emails via Resend :
//  1. À toi (NOTIFY_EMAIL) — pour que tu saches qu'une demande attend.
//  2. Au candidat — pour le rassurer que sa demande est bien reçue et en cours de vérification.

import { createClient } from "@supabase/supabase-js";

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
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
        subject,
        text,
      }),
    });
  } catch (err) {
    console.error("Erreur envoi email:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { fullName, email, phone, method, offerCode, transactionReference } = req.body;

  if (!fullName || !phone || !method || !offerCode) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from("manual_payment_requests").insert({
    full_name: fullName,
    email: email || null,
    phone,
    method,
    offer_code: offerCode,
    transaction_reference: transactionReference || null,
  });

  if (error) {
    console.error("Erreur Supabase:", error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
  }

  // Email à toi (l'administrateur)
  await sendEmail({
    to: process.env.NOTIFY_EMAIL,
    subject: `Nouvelle demande de paiement — ${fullName}`,
    text: `Un candidat vient de déclarer un paiement.

Nom : ${fullName}
Email : ${email || "non renseigné"}
Téléphone : ${phone}
Méthode : ${method === "airtel_money" ? "Airtel Money" : "Moov Money"}
Offre : ${offerCode}
Référence transaction : ${transactionReference || "non renseignée"}

Va sur ton site, page /admin, pour vérifier et approuver cette demande.`,
  });

  // Email de confirmation au candidat
  if (email) {
    await sendEmail({
      to: email,
      subject: "Héméra — Ta demande de paiement est en cours de vérification",
      text: `Bonjour ${fullName},

Nous avons bien reçu ta déclaration de paiement pour l'offre "${offerCode}".

Notre équipe est en train de vérifier ton paiement. Cette vérification est généralement effectuée sous quelques heures. Tu recevras un second email dès que ton accès sera activé.

Merci de ta confiance,
L'équipe Héméra`,
    });
  }

  return res.status(200).json({ success: true });
}


