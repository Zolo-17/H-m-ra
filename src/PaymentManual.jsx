import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const OFFERS = [
  { code: "full_week", label: "Accès total — 7 jours", price: 2000 },
  { code: "module_month", label: "1 module — 1 mois", price: 3500 },
  { code: "full_month", label: "Accès total — 1 mois", price: 10000 },
];

const METHODS = [
  { id: "airtel_money", label: "Airtel Money", number: "077037005", ussd: "*150#" },
  { id: "moov_money", label: "Moov Money", number: "062157318", ussd: "*555#" },
];

const T = { or: "#C9A84C", noir: "#0A0A0A", graphite: "#1E1E1E", gris: "#8A8A8A", blanc: "#F5F5F0" };

export default function PaymentManual() {
  const [method, setMethod] = useState(METHODS[0]);
  const [offerCode, setOfferCode] = useState(OFFERS[0].code);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  // Pré-remplit email/téléphone si le candidat s'est déjà inscrit sur le site
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hemera_candidate");
      if (saved) {
        const info = JSON.parse(saved);
        if (info.email) setEmail(info.email);
        if (info.phone) setPhone(info.phone);
      }
    } catch {
      // pas grave si rien à pré-remplir
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/payment/manual-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          method: method.id,
          offerCode,
          transactionReference: reference,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: T.or, fontFamily: "Georgia, serif" }}>Demande envoyée ✅</h2>
          <p style={{ color: T.gris, lineHeight: 1.6 }}>
            Ton accès sera activé dès que ton paiement sera vérifié —
            généralement sous quelques heures. Un email de confirmation
            vient de t'être envoyé, et tu recevras un second message dès
            que ton accès sera activé.
          </p>
        </div>
      </div>
    );
  }


  const selectedOffer = OFFERS.find(o => o.code === offerCode);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: T.or, fontFamily: "Georgia, serif", fontSize: "1.6rem", marginBottom: 4 }}>
          Payer par Mobile Money
        </h1>
        <p style={{ color: T.gris, fontSize: "0.85rem", marginBottom: 20 }}>
          Paiement unique, sans reconduction automatique.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {METHODS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m)}
              style={{
                flex: 1, padding: 12, borderRadius: 6,
                background: method.id === m.id ? T.or : "transparent",
                color: method.id === m.id ? T.noir : T.blanc,
                border: `1px solid ${method.id === m.id ? T.or : "#333"}`,
                cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", background: "#fff", padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <QRCodeSVG value={method.number} size={170} />
        </div>
        <p style={{ textAlign: "center", color: T.blanc, fontSize: "1.5rem", fontWeight: 700, letterSpacing: 2, margin: "8px 0" }}>
          {method.number}
        </p>
        <p style={{ color: T.gris, fontSize: "0.78rem", lineHeight: 1.6, marginBottom: 24 }}>
          Scanne le code (ou note le numéro), puis compose <strong style={{ color: T.blanc }}>{method.ussd}</strong> sur
          ton téléphone. Choisis « Envoyer de l'argent » / « Payer un marchand », saisis ce numéro et
          le montant de <strong style={{ color: T.or }}>{selectedOffer.price.toLocaleString("fr-FR")} FCFA</strong>. Tu
          recevras un SMS avec une référence de transaction — garde-la, elle nous aide à vérifier plus vite.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Offre choisie</label>
          <select value={offerCode} onChange={e => setOfferCode(e.target.value)} style={inputStyle}>
            {OFFERS.map(o => (
              <option key={o.code} value={o.code}>
                {o.label} — {o.price.toLocaleString("fr-FR")} FCFA
              </option>
            ))}
          </select>

          <label style={labelStyle}>Nom complet</label>
          <input required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Ton adresse email</label>
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
            style={inputStyle}
          />

          <label style={labelStyle}>Ton numéro de téléphone</label>
          <input
            required
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Ex : 07XXXXXXX"
            style={inputStyle}
          />

          <label style={labelStyle}>
            Référence de transaction reçue par SMS (recommandé)
          </label>
          <input value={reference} onChange={e => setReference(e.target.value)} style={inputStyle} />

          <button type="submit" disabled={status === "sending"} style={submitStyle}>
            {status === "sending" ? "Envoi en cours…" : "J'ai payé — activer mon accès"}
          </button>

          {status === "error" && (
            <p style={{ color: "#D9534F", fontSize: "0.8rem", marginTop: 10 }}>
              Une erreur est survenue. Réessaie dans un instant.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh", background: T.noir, display: "flex",
  justifyContent: "center", padding: "40px 16px", fontFamily: "system-ui, sans-serif",
};
const cardStyle = { maxWidth: 420, width: "100%" };
const labelStyle = {
  display: "block", color: T.gris, fontSize: "0.65rem", textTransform: "uppercase",
  letterSpacing: 1, margin: "14px 0 6px",
};
const inputStyle = {
  width: "100%", padding: 10, background: T.graphite, border: "1px solid #2A2A2A",
  borderRadius: 4, color: T.blanc, boxSizing: "border-box", fontSize: "0.9rem",
};
const submitStyle = {
  width: "100%", marginTop: 24, padding: 14, background: T.or, border: "none",
  borderRadius: 4, color: T.noir, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
};
