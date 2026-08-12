import React, { useState } from "react";

const T = {
  noir: "#FBF1E1", charbon: "#F5E6C8", graphite: "#FFFCF5",
  or: "#D9641E", orPale: "#F2A93C", orFond: "#FBE3C4",
  blanc: "#2B1B10", gris: "#8A6F5C", bordure: "#E8D2AC", braise: "#C43E1C",
};

export default function AdminApprovals() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState("requests"); // "requests" | "users"
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
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

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // silencieux, l'onglet affichera juste une liste vide
    }
    setLoading(false);
  }

  function switchTab(t) {
    setTab(t);
    if (t === "users" && users.length === 0) loadUsers();
  }

  async function act(requestId, action) {
    try {
      const res = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Échec de l'action "${action}" :\n${data.error || `Erreur ${res.status}`}`);
        return;
      }
    } catch (err) {
      alert(`Erreur de connexion pendant l'action "${action}". Réessaie.`);
      return;
    }
    loadRequests(secret);
    if (action === "approve") loadUsers(); // le nouvel accès doit apparaître côté utilisateurs
  }

  function formatDate(d) {
    if (!d) return "Jamais";
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: T.noir, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: T.or, fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.3rem", marginBottom: 16 }}>
            Accès administrateur
          </p>
          <input
            type="password"
            placeholder="Code admin"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadRequests(secret)}
            style={{ padding: 10, borderRadius: 4, border: `1px solid ${T.bordure}`, background: T.graphite, color: T.blanc }}
          />
          <button
            onClick={() => loadRequests(secret)}
            disabled={loading}
            style={{ marginLeft: 8, padding: "10px 16px", background: T.or, border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, color: "#fff" }}
          >
            {loading ? "…" : "Entrer"}
          </button>
          {errorMsg && <p style={{ color: T.braise, marginTop: 10, fontSize: "0.85rem" }}>{errorMsg}</p>}
        </div>
      </div>
    );
  }

  const pending = requests.filter(r => r.status === "pending");
  const others = requests.filter(r => r.status !== "pending");

  return (
    <div style={{ minHeight: "100vh", background: T.noir, color: T.blanc, padding: 24, fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <h1 style={{ color: T.or, fontFamily: "'Fraunces', Georgia, serif" }}>Espace administrateur</h1>

      <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 24 }}>
        <button onClick={() => switchTab("requests")} style={tabStyle(tab === "requests")}>
          Demandes de paiement
        </button>
        <button onClick={() => switchTab("users")} style={tabStyle(tab === "users")}>
          Utilisateurs
        </button>
      </div>

      {tab === "requests" && (
        <>
          <h3 style={sectionTitle}>En attente ({pending.length})</h3>
          {pending.length === 0 && <p style={{ color: T.gris, fontSize: "0.85rem" }}>Aucune demande en attente.</p>}
          {pending.map(r => (
            <RequestCard key={r.id} r={r} onApprove={() => act(r.id, "approve")} onReject={() => act(r.id, "reject")} />
          ))}

          <h3 style={{ ...sectionTitle, marginTop: 32 }}>Historique</h3>
          {others.map(r => <RequestCard key={r.id} r={r} />)}
        </>
      )}

      {tab === "users" && (
        <>
          <h3 style={sectionTitle}>
            Profils mémorisés ({users.length}) {loading && "— chargement…"}
          </h3>
          <p style={{ color: T.gris, fontSize: "0.78rem", marginBottom: 16, maxWidth: 520 }}>
            Tous les candidats qui se sont inscrits, qu'ils aient payé ou non, avec leur accès actuel et leur dernière connexion.
          </p>
          {users.map(u => (
            <div key={u.id} style={{ border: `1px solid ${T.bordure}`, borderRadius: 6, padding: 16, marginBottom: 10, maxWidth: 520, background: T.charbon }}>
              <p style={{ margin: 0 }}><strong>{u.full_name || u.email || u.phone}</strong></p>
              <p style={{ margin: "4px 0", color: T.gris, fontSize: "0.82rem" }}>
                {u.phone}{u.email ? ` · ${u.email}` : ""}
              </p>
              <p style={{ margin: "4px 0", fontSize: "0.78rem", color: T.gris }}>
                Dernière connexion : {formatDate(u.last_seen_at)}
              </p>
              <p style={{ margin: "4px 0", fontSize: "0.78rem", fontWeight: 700 }}>
                {u.access
                  ? (
                    <span style={{ color: "#4A7B4A" }}>
                      ✅ {u.access.scope === "full" ? "Accès complet" : `Module : ${u.access.module_slug}`} — expire le {formatDate(u.access.expires_at)}
                    </span>
                  )
                  : <span style={{ color: T.gris }}>Aucun accès payant actif</span>}
              </p>
            </div>
          ))}
          {!loading && users.length === 0 && (
            <p style={{ color: T.gris, fontSize: "0.85rem" }}>Aucun profil enregistré pour le moment.</p>
          )}
        </>
      )}
    </div>
  );
}

const sectionTitle = {
  color: T.gris, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1,
};

function tabStyle(active) {
  return {
    padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
    background: active ? T.or : "transparent",
    color: active ? "#fff" : T.gris,
    border: `1px solid ${active ? T.or : T.bordure}`,
  };
}

function RequestCard({ r, onApprove, onReject }) {
  const statusColor = r.status === "approved" ? "#4A7B4A" : r.status === "rejected" ? T.braise : T.or;
  return (
    <div style={{ border: `1px solid ${T.bordure}`, borderRadius: 6, padding: 16, marginBottom: 12, maxWidth: 480, background: T.charbon }}>
      <p style={{ margin: 0 }}><strong>{r.full_name}</strong> — {r.phone}</p>
      <p style={{ margin: "4px 0", color: T.gris, fontSize: "0.85rem" }}>
        {r.method === "airtel_money" ? "Airtel Money" : "Moov Money"} · {r.offer_code}{r.module_slug ? ` · module: ${r.module_slug}` : ""} · réf : {r.transaction_reference || "—"}
      </p>
      <p style={{ margin: "4px 0", color: statusColor, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
        {r.status}
      </p>
      {r.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={onApprove} style={{ padding: "6px 14px", background: "#4A7B4A", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}>
            Approuver
          </button>
          <button onClick={onReject} style={{ padding: "6px 14px", background: T.braise, border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}>
            Rejeter
          </button>
        </div>
      )}
    </div>
  );
}
