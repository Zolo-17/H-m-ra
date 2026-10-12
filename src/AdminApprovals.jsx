import React, { useState } from "react";

export default function AdminApprovals() {
  const [secret, setSecret] = useState("");
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadUsers(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", { headers: { "x-admin-secret": secret } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setUsers(data.users || []);
    } catch (err) {
      setUsers(null);
      setError(err.message === "Non autorisé" ? "Mot de passe incorrect." : err.message);
    }
    setLoading(false);
  }

  const page = { minHeight: "100vh", background: "#FFF8EC", color: "#2B1D0E", fontFamily: "'Manrope', system-ui, sans-serif", padding: 24 };

  if (!users) {
    return (
      <div style={page}>
        <form onSubmit={loadUsers} style={{ maxWidth: 360, margin: "80px auto", textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>Administration Héméra</h1>
          <input
            type="password" value={secret} onChange={e => setSecret(e.target.value)}
            placeholder="Mot de passe administrateur"
            style={{ width: "100%", padding: 12, boxSizing: "border-box", border: "1px solid #E8D2AC", borderRadius: 4, marginBottom: 12 }}
          />
          <button type="submit" disabled={loading || !secret} style={{ padding: "12px 28px", background: "#C8791A", color: "#fff", border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Connexion…" : "Entrer"}
          </button>
          {error && <p style={{ color: "#C43E1C", fontSize: "0.85rem" }}>{error}</p>}
        </form>
      </div>
    );
  }

  const fmt = d => (d ? new Date(d).toLocaleString("fr-FR") : "—");

  return (
    <div style={page}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>Profils inscrits ({users.length})</h1>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #E8D2AC" }}>
                <th style={{ padding: 8 }}>Nom</th><th style={{ padding: 8 }}>Email</th>
                <th style={{ padding: 8 }}>Téléphone</th><th style={{ padding: 8 }}>Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #E8D2AC" }}>
                  <td style={{ padding: 8 }}>{u.full_name || "—"}</td>
                  <td style={{ padding: 8 }}>{u.email || "—"}</td>
                  <td style={{ padding: 8 }}>{u.phone || "—"}</td>
                  <td style={{ padding: 8 }}>{fmt(u.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
