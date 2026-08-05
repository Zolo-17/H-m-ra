// api/admin/requests.js
//
// Endpoint protégé par un mot de passe (ADMIN_SECRET) que TOI seul connais.
// GET  → liste toutes les demandes de paiement
// POST → approuve ou rejette une demande. En cas d'approbation, crée
//        automatiquement l'utilisateur, le paiement et l'accès dans Supabase.

import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

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
  const adminSecret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const supabase = supabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("manual_payment_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ requests: data });
  }

  if (req.method === "POST") {
    const { requestId, action } = req.body; // action: "approve" | "reject"

    const { data: request, error: reqErr } = await supabase
      .from("manual_payment_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    if (action === "reject") {
      await supabase
        .from("manual_payment_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      return res.status(200).json({ success: true });
    }

    if (action === "approve") {
      // 1. Trouver ou créer l'utilisateur
      let { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("phone", request.phone)
        .maybeSingle();

      if (!user) {
        const { data: newUser, error: userErr } = await supabase
          .from("users")
          .insert({ phone: request.phone, full_name: request.full_name, email: request.email || null })
          .select()
          .single();
        if (userErr) return res.status(500).json({ error: userErr.message });
        user = newUser;
      }

      // 2. Trouver l'offre correspondante
      const { data: offer, error: offerErr } = await supabase
        .from("offers")
        .select("*")
        .eq("code", request.offer_code)
        .single();
      if (offerErr || !offer) {
        return res.status(400).json({ error: "Offre introuvable" });
      }

      // 3. Enregistrer le paiement
      const { data: payment, error: paymentErr } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          offer_id: offer.id,
          cinetpay_transaction_id: `MANUEL-${requestId}`,
          amount_fcfa: offer.price_fcfa,
          status: "accepted",
          raw_response: {
            manual: true,
            method: request.method,
            reference: request.transaction_reference,
          },
        })
        .select()
        .single();
      if (paymentErr) return res.status(500).json({ error: paymentErr.message });

      // 4. Créer l'accès actif
      const expiresAt = new Date(
        Date.now() + offer.duration_days * 86400000
      ).toISOString();

      const { error: grantErr } = await supabase.from("access_grants").insert({
        user_id: user.id,
        payment_id: payment.id,
        scope: offer.scope,
        module_slug: offer.scope === "module" ? (request.module_slug || null) : null,
        expires_at: expiresAt,
        status: "active",
      });
      if (grantErr) return res.status(500).json({ error: grantErr.message });

      // 5. Marquer la demande comme approuvée
      await supabase
        .from("manual_payment_requests")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", requestId);

      // 6. Confirmer au candidat que son accès est actif
      const candidateEmail = request.email || user.email;
      if (candidateEmail) {
        const expiresDate = new Date(expiresAt).toLocaleDateString("fr-FR");
        const accessLine = offer.scope === "module" && request.module_slug
          ? `ton accès au module "${request.module_slug}" est maintenant actif jusqu'au ${expiresDate}.`
          : `ton accès complet est maintenant actif jusqu'au ${expiresDate}.`;
        await sendEmail({
          to: candidateEmail,
          subject: "Héméra — Ton accès est activé ✅",
          text: `Bonjour ${request.full_name},

Bonne nouvelle : ton paiement a été vérifié et ${accessLine}

Tu peux te reconnecter dès maintenant sur Héméra et commencer tes simulations d'entretien.

Bonne préparation,
L'équipe Héméra`,
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Action invalide" });
  }

  return res.status(405).json({ error: "Méthode non autorisée" });
}
