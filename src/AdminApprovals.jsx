import React, { useState } from "react";

const T = { or: "#C9A84C", noir: "#0A0A0A", graphite: "#1E1E1E", gris: "#8A8A8A", blanc: "#F5F5F0" };

export default function AdminApprovals() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadRequests(s) {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/requests", {
        headers: { "x-admin-secret": s },
      });
      if (!res.ok) {
        setErrorMsg("Code incorrect.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRequests(data.requests || []);
      setUnlocked(true);
    } catch {
      setErrorMsg("Erreur de connexion.");
    }
    setLoading(false);
  }

  async function act(requestId, action) {
    await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ requestId, action }),
    });
    loadRequests(secret);
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: T.noir, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: T.or, fontFamily: "Georgia, serif", fontSize: "1.3rem", marginBottom: 16 }}>
            Accès administrateur
          </p>
          <input
            type="password"
            placeholder="Code admin"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadRequests(secret)}
            style={{ padding: 10, borderRadius: 4, border: "1px solid #333", background: T.graphite, color: T.blanc }}
          />
          <button
            onClick={() => loadRequests(secret)}
            disabled={loading}
            style={{ marginLeft: 8, padding: "10px 16px", background: T.or, border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
          >
            {loading ? "…" : "Entrer"}
          </button>
          {errorMsg && <p style={{ color: "#D9534F", marginTop: 10, fontSize: "0.85rem" }}>{errorMsg}</p>}
        </div>
      </div>
    );
  }

  const pending = requests.filter(r => r.status === "pending");
  const others = requests.filter(r => r.status !== "pending");

  return (
    <div style={{ minHeight: "100vh", background: T.noir, color: T.blanc, padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: T.or, fontFamily: "Georgia, serif" }}>Demandes de paiement</h1>

      <h3 style={{ color: T.gris, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1, marginTop: 24 }}>
        En attente ({pending.length})
      </h3>
      {pending.length === 0 && <p style={{ color: T.gris, fontSize: "0.85rem" }}>Aucune demande en attente.</p>}
      {pending.map(r => (
        <RequestCard key={r.id} r={r} onApprove={() => act(r.id, "approve")} onReject={() => act(r.id, "reject")} />
      ))}

      <h3 style={{ color: T.gris, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1, marginTop: 32 }}>
        Historique
      </h3>
      {others.map(r => <RequestCard key={r.id} r={r} />)}
    </div>
  );
}

function RequestCard({ r, onApprove, onReject }) {
  const statusColor = r.status === "approved" ? "#4A7B6B" : r.status === "rejected" ? "#8B4545" : T.or;
  return (
    <div style={{ border: "1px solid #333", borderRadius: 6, padding: 16, marginBottom: 12, maxWidth: 480 }}>
      <p style={{ margin: 0 }}><strong>{r.full_name}</strong> — {r.phone}</p>
      <p style={{ margin: "4px 0", color: T.gris, fontSize: "0.85rem" }}>
        {r.method === "airtel_money" ? "Airtel Money" : "Moov Money"} · {r.offer_code}{r.module_slug ? ` · module: ${r.module_slug}` : ""} · réf : {r.transaction_reference || "—"}
      </p>
      <p style={{ margin: "4px 0", color: statusColor, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
        {r.status}
      </p>
      {r.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={onApprove} style={{ padding: "6px 14px", background: "#4A7B6B", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}>
            Approuver
          </button>
          <button onClick={onReject} style={{ padding: "6px 14px", background: "#8B4545", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}>
            Rejeter
          </button>
        </div>
      )}
    </div>
  );
}
