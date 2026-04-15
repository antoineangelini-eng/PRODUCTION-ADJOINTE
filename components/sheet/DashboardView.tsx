"use client";
import { useEffect, useState } from "react";
import { loadDashboardDataAction, loadSectorDelaysAction, type DashboardData, type SectorDelays, type Period } from "@/app/app/admin/dashboard-actions";
import { UserDetailModal } from "@/components/sheet/UserDetailModal";

function fmtDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} j`;
}

function periodLabel(p: Period): string {
  return p === "today" ? "Aujourd'hui" : p === "7d" ? "7 derniers jours" : "30 derniers jours";
}

function fmtSector(s: string | null): string {
  switch (s) {
    case "design_metal": return "Design Métal";
    case "design_resine": return "Design Résine";
    case "usinage_titane": return "Usinage Titane";
    case "usinage_resine": return "Usinage Résine";
    case "finition": return "Finition";
    case "admin": return "Admin";
    default: return s ?? "—";
  }
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("fr-FR");
}

export function DashboardView() {
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [delays, setDelays] = useState<SectorDelays | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([
      loadDashboardDataAction(period),
      loadSectorDelaysAction(period),
    ])
      .then(([d, del]) => { if (alive) { setData(d); setDelays(del); } })
      .catch(e => { if (alive) setError(e.message ?? "Erreur"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  const card: React.CSSProperties = { background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#888", fontWeight: 600, borderBottom: "1px solid #1e1e1e" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#ddd", borderBottom: "1px solid #141414" };

  const kpi = (label: string, value: number | string, color: string) => (
    <div style={{ ...card, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["today", "7d", "30d"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: period === p ? "1px solid #4ade80" : "1px solid #2a2a2a",
              background: period === p ? "rgba(74,222,128,0.12)" : "transparent",
              color: period === p ? "#4ade80" : "#888",
            }}>{periodLabel(p)}</button>
          ))}
        </div>
      </div>

      {loading && !data && <div style={{ color: "#666", fontSize: 12 }}>Chargement…</div>}
      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, opacity: loading ? 0.6 : 1 }}>
            {kpi("Cas créés", data.kpi.created, "#60a5fa")}
            {kpi("Cas validés", data.kpi.completed, "#4ade80")}
            {kpi("Cas actifs", data.kpi.active, "#e0e0e0")}
            {kpi("Cas en retard", data.kpi.late, data.kpi.late > 0 ? "#f87171" : "#4ade80")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 10 }}>Activité par secteur</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Secteur</th>
                  <th style={{ ...th, textAlign: "right" }}>Modifications</th>
                  <th style={{ ...th, textAlign: "right" }}>Validations</th>
                  <th style={{ ...th, textAlign: "right" }}>Total</th>
                </tr></thead>
                <tbody>
                  {data.bySector.length === 0 && <tr><td colSpan={4} style={{ ...td, color: "#666", textAlign: "center" }}>Aucune activité</td></tr>}
                  {data.bySector.map(s => (
                    <tr key={s.code}>
                      <td style={td}>{fmtSector(s.code)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{s.updates}</td>
                      <td style={{ ...td, textAlign: "right", color: "#4ade80" }}>{s.completions}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 10 }}>Activité par utilisateur</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Utilisateur</th>
                  <th style={th}>Secteur</th>
                  <th style={{ ...th, textAlign: "right" }}>Créés</th>
                  <th style={{ ...th, textAlign: "right" }}>Modifications</th>
                  <th style={{ ...th, textAlign: "right" }}>Validations</th>
                  <th style={{ ...th, textAlign: "right" }}>Total</th>
                </tr></thead>
                <tbody>
                  {data.byUser.length === 0 && <tr><td colSpan={6} style={{ ...td, color: "#666", textAlign: "center" }}>Aucune activité</td></tr>}
                  {data.byUser.slice(0, 20).map(u => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser({ id: u.id, name: u.name })}
                      style={{ cursor: "pointer", transition: "background 120ms" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ ...td, fontWeight: 600, color: "#4ade80" }}>{u.name} →</td>
                      <td style={{ ...td, color: "#888" }}>{fmtSector(u.sector)}</td>
                      <td style={{ ...td, textAlign: "right", color: "#60a5fa" }}>{u.created || ""}</td>
                      <td style={{ ...td, textAlign: "right" }}>{u.updates || ""}</td>
                      <td style={{ ...td, textAlign: "right", color: "#4ade80" }}>{u.completions || ""}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{u.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Délais par secteur ───────────────────────────────────────── */}
          {delays && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 4 }}>
                Délais moyens par secteur
              </div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>
                Temps qu'un cas passe dans un secteur, de la première action jusqu'à la validation.
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Secteur</th>
                  <th style={{ ...th, textAlign: "right" }}>Global (moyenne)</th>
                  <th style={{ ...th, textAlign: "right" }}>Nb cas (global)</th>
                  <th style={{ ...th, textAlign: "right" }}>Sur la période</th>
                  <th style={{ ...th, textAlign: "right" }}>Nb cas (période)</th>
                </tr></thead>
                <tbody>
                  {delays.global.length === 0 && (
                    <tr><td colSpan={5} style={{ ...td, color: "#666", textAlign: "center" }}>Pas encore assez de données</td></tr>
                  )}
                  {delays.global.map(g => {
                    const p = delays.period.find(x => x.sector === g.sector);
                    return (
                      <tr key={g.sector}>
                        <td style={td}>{fmtSector(g.sector)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#e0e0e0" }}>{fmtDuration(g.avgHours)}</td>
                        <td style={{ ...td, textAlign: "right", color: "#888" }}>{g.count}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#4ade80" }}>
                          {p ? fmtDuration(p.avgHours) : "—"}
                        </td>
                        <td style={{ ...td, textAlign: "right", color: "#888" }}>{p?.count ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 10 }}>
              Cas en retard ({data.kpi.late})
            </div>
            {data.lateCases.length === 0 ? (
              <div style={{ color: "#666", fontSize: 12, padding: "8px 0" }}>Aucun cas en retard 🎉</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>N° cas</th>
                  <th style={th}>Nature</th>
                  <th style={th}>Date expédition</th>
                  <th style={{ ...th, textAlign: "right" }}>Retard</th>
                </tr></thead>
                <tbody>
                  {data.lateCases.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...td, fontWeight: 700 }}>{c.case_number ?? "—"}</td>
                      <td style={{ ...td, color: "#aaa" }}>{c.nature_du_travail ?? "—"}</td>
                      <td style={td}>{fmtDate(c.date_expedition)}</td>
                      <td style={{ ...td, textAlign: "right", color: "#f87171", fontWeight: 700 }}>{c.delay} j</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {selectedUser && (
        <UserDetailModal
          userId={selectedUser.id}
          period={period}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
