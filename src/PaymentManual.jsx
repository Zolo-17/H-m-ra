import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const OFFERS = [
  { code: "full_week", label: "Accès total — 7 jours", price: 2000, scope: "full" },
  { code: "module_month", label: "1 module — 1 mois", price: 3500, scope: "module" },
  { code: "full_month", label: "Accès total — 1 mois", price: 10000, scope: "full" },
];

// Modules réellement vendables à l'unité (le module "complet" n'est accessible
// qu'en accès total, il ne fait pas partie de l'offre "1 module").
const MODULE_OPTIONS = [
  { id: "personnalite", label: "Personnalité & Motivation" },
  { id: "management", label: "Management d'équipe" },
  { id: "technique", label: "Technique Comptable et audit" },
  { id: "OHADA", label: "Réglementation OHADA" },
  { id: "fiscalite", label: "Fiscalité Gabonaise" },
  { id: "social", label: "Sécurité Sociale" },
];

const METHODS = [
  { id: "airtel_money", label: "Airtel Money", number: "077037005", ussd: "*150#" },
  { id: "moov_money", label: "Moov Money", number: "062157318", ussd: "*555#" },
];

const T = {
  noir: "#FBF1E1", charbon: "#F5E6C8", graphite: "#FFFCF5",
  or: "#D9641E", orPale: "#F2A93C", orFond: "#FBE3C4",
  blanc: "#2B1B10", gris: "#8A6F5C", bordure: "#E8D2AC", braise: "#C43E1C",
};

export default function PaymentManual() {
  const [method, setMethod] = useState(METHODS[0]);
  const [offerCode, setOfferCode] = useState(OFFERS[0].code);
  const [moduleSlug, setModuleSlug] = useState(MODULE_OPTIONS[0].id);
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

  const selectedOffer = OFFERS.find(o => o.code === offerCode);
  const isModuleOffer = selectedOffer.scope === "module";

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
          moduleSlug: isModuleOffer ? moduleSlug : null,
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
          <h2 style={{ color: T.or, fontFamily: "'Fraunces', Georgia, serif" }}>Demande envoyée ✅</h2>
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

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: T.or, fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.6rem", marginBottom: 4 }}>
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
                color: method.id === m.id ? "#fff" : T.blanc,
                border: `1px solid ${method.id === m.id ? T.or : T.bordure}`,
                cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", background: "#fff", padding: 16, borderRadius: 8, marginBottom: 12, border: `1px solid ${T.bordure}` }}>
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

          {isModuleOffer && (
            <>
              <label style={labelStyle}>Module choisi</label>
              <select value={moduleSlug} onChange={e => setModuleSlug(e.target.value)} style={inputStyle}>
                {MODULE_OPTIONS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <p style={{ color: T.braise, fontSize: "0.72rem", marginTop: 6, lineHeight: 1.5 }}>
                Cette offre donne accès uniquement au module choisi ci-dessus. Les autres modules
                resteront verrouillés — choisis « Accès total » pour tout débloquer.
              </p>
            </>
          )}

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
            <p style={{ color: T.braise, fontSize: "0.8rem", marginTop: 10 }}>
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
  justifyContent: "center", padding: "40px 16px", fontFamily: "'Manrope', system-ui, sans-serif",
};
const cardStyle = { maxWidth: 420, width: "100%" };
const labelStyle = {
  display: "block", color: T.gris, fontSize: "0.65rem", textTransform: "uppercase",
  letterSpacing: 1, margin: "14px 0 6px",
};
const inputStyle = {
  width: "100%", padding: 10, background: T.graphite, border: `1px solid ${T.bordure}`,
  borderRadius: 4, color: T.blanc, boxSizing: "border-box", fontSize: "0.9rem",
};
const submitStyle = {
  width: "100%", marginTop: 24, padding: 14, background: T.or, border: "none",
  borderRadius: 4, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
};
