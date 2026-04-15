"use client";
import { useEffect, useState } from "react";
import { loadOpsDashboardAction, type OpsDashboard } from "@/app/app/admin/dashboard-actions";
import { UserDetailModal } from "@/components/sheet/UserDetailModal";

const SECTOR_META: Record<string, { short: string; label: string; color: string }> = {
  design_metal:   { short: "DM",  label: "Design Métal",   color: "#4ade80" },
  design_resine:  { short: "DR",  label: "Design Résine",  color: "#7c8196" },
  usinage_titane: { short: "UT",  label: "Usinage Titane", color: "#60a5fa" },
  usinage_resine: { short: "UR",  label: "Usinage Résine", color: "#a78bfa" },
  finition:       { short: "FI",  label: "Finition",       color: "#f59e0b" },
};

function sectorLabel(s: string | null): string {
  return s ? SECTOR_META[s]?.label ?? s : "—";
}
function sectorShort(s: string | null): string {
  return s ? SECTOR_META[s]?.short ?? s : "—";
}
function sectorColor(s: string | null): string {
  return (s && SECTOR_META[s]?.color) || "#888";
}

function fmtExp(daysUntil: number | null): { text: string; color: string } {
  if (daysUntil === null) return { text: "—", color: "#888" };
  if (daysUntil < 0)  return { text: `retard ${-daysUntil}j`, color: "#f87171" };
  if (daysUntil === 0) return { text: "aujourd'hui", color: "#f59e0b" };
  if (daysUntil === 1) return { text: "demain", color: "#f59e0b" };
  if (daysUntil <= 2) return { text: `dans ${daysUntil}j`, color: "#fbbf24" };
  return { text: `dans ${daysUntil}j`, color: "#aaa" };
}

export function DashboardView() {
  const [data, setData] = useState<OpsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    loadOpsDashboardAction()
      .then(d => { if (alive) setData(d); })
      .catch(e => { if (alive) setError(e.message ?? "Erreur"); });
    return () => { alive = false; };
  }, [reloadTick]);

  const card: React.CSSProperties = { background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#888", fontWeight: 600, borderBottom: "1px solid #1e1e1e" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#ddd", borderBottom: "1px solid #141414" };

  const kpi = (label: string, value: number | string, color: string, icon: string) => (
    <div style={{ ...card, flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, marginTop: 6, lineHeight: 1 }}>{value}</div>
    </div>
  );

  const badge = (text: string, color: string, filled = false) => (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: filled ? color : `${color}22`, color: filled ? "#0b0b0b" : color,
      border: `1px solid ${color}44`,
    }}>{text}</span>
  );

  return (
    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => setReloadTick(t => t + 1)} style={{
          padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
          border: "1px solid #2a2a2a", background: "transparent", color: "#aaa",
        }}>↻ Rafraîchir</button>
      </div>

      {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
      {!data && !error && <div style={{ color: "#666", fontSize: 12 }}>Chargement…</div>}

      {data && (
        <>
          {/* ── KPIs ───────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {kpi("En retard", data.kpis.late, data.kpis.late > 0 ? "#f87171" : "#4ade80", "⚠️")}
            {kpi("Urgents (≤2j)", data.kpis.urgent, data.kpis.urgent > 0 ? "#f59e0b" : "#4ade80", "🔥")}
            {kpi("Bloqués (≥3j)", data.kpis.stuck, data.kpis.stuck > 0 ? "#f59e0b" : "#4ade80", "⏸️")}
            {kpi("Cas actifs", data.kpis.active, "#e0e0e0", "📦")}
          </div>

          {/* ── Pipeline ───────────────────────────────────────────────── */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 4 }}>Pipeline en direct</div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 14 }}>Répartition des cas actifs par secteur.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.pipeline.map(p => {
                const maxVal = Math.max(1, ...data.pipeline.map(x => x.active));
                const pct = (p.active / maxVal) * 100;
                return (
                  <div key={p.sector} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 130, fontSize: 12, color: "#e0e0e0", fontWeight: 600 }}>
                      <span style={{ color: sectorColor(p.sector), marginRight: 6 }}>●</span>
                      {sectorLabel(p.sector)}
                    </div>
                    <div style={{ flex: 1, minWidth: 100, height: 26, background: "#141414", borderRadius: 5, overflow: "hidden", position: "relative" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: `${sectorColor(p.sector)}30`,
                        borderRight: `2px solid ${sectorColor(p.sector)}`,
                        transition: "width 300ms",
                      }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 10px", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#e0e0e0" }}>{p.active}</span>
                        {p.late > 0 && badge(`${p.late} retard`, "#f87171")}
                        {p.urgent > 0 && badge(`${p.urgent} urgent`, "#f59e0b")}
                        {p.stuck > 0 && badge(`${p.stuck} bloqué`, "#a78bfa")}
                      </div>
                    </div>
                    <div style={{ width: 160, fontSize: 11, color: "#888", textAlign: "right" }}>
                      {p.users.length > 0 ? `👥 ${p.users.join(", ")}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Cas prioritaires ───────────────────────────────────────── */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 4 }}>
              À traiter en priorité
            </div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>Cas en retard, urgents ou bloqués — triés par urgence.</div>
            {data.priorityCases.length === 0 ? (
              <div style={{ color: "#4ade80", fontSize: 13, padding: "12px 0" }}>✓ Rien d'urgent, tout roule.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>N° cas</th>
                  <th style={th}>Nature</th>
                  <th style={th}>Secteur</th>
                  <th style={th}>Expédition</th>
                  <th style={th}>Dernière activité</th>
                  <th style={th}>État</th>
                </tr></thead>
                <tbody>
                  {data.priorityCases.map(c => {
                    const exp = fmtExp(c.daysUntilExp);
                    const act = c.daysSinceActivity === null
                      ? { text: "jamais", color: "#888" }
                      : c.daysSinceActivity === 0
                        ? { text: "aujourd'hui", color: "#4ade80" }
                        : c.daysSinceActivity === 1
                          ? { text: "hier", color: "#aaa" }
                          : { text: `il y a ${c.daysSinceActivity}j`, color: c.daysSinceActivity >= 3 ? "#f87171" : "#aaa" };
                    return (
                      <tr key={c.id}>
                        <td style={{ ...td, fontWeight: 700 }}>{c.caseNumber ?? "—"}</td>
                        <td style={{ ...td, color: "#aaa" }}>{c.nature ?? "—"}</td>
                        <td style={td}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                            background: `${sectorColor(c.sector)}20`, color: sectorColor(c.sector),
                          }}>{sectorShort(c.sector)}</span>
                        </td>
                        <td style={{ ...td, color: exp.color, fontWeight: 600 }}>{exp.text}</td>
                        <td style={{ ...td, color: act.color }}>{act.text}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {c.isLate && badge("retard", "#f87171", true)}
                            {c.isUrgent && badge("urgent", "#f59e0b", true)}
                            {c.isStuck && badge("bloqué", "#a78bfa")}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Cas bloqués ───────────────────────────────────────────── */}
          {data.stuckCases.length > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>
                Cas bloqués ({data.stuckCases.length})
              </div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>Aucune activité depuis 3 jours ou plus.</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>N° cas</th>
                  <th style={th}>Nature</th>
                  <th style={th}>Secteur</th>
                  <th style={th}>Dernière action par</th>
                  <th style={{ ...th, textAlign: "right" }}>Inactivité</th>
                </tr></thead>
                <tbody>
                  {data.stuckCases.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...td, fontWeight: 700 }}>{c.caseNumber ?? "—"}</td>
                      <td style={{ ...td, color: "#aaa" }}>{c.nature ?? "—"}</td>
                      <td style={td}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                          background: `${sectorColor(c.sector)}20`, color: sectorColor(c.sector),
                        }}>{sectorShort(c.sector)}</span>
                      </td>
                      <td style={{ ...td, color: "#aaa" }}>{c.lastActionBy ?? "—"}</td>
                      <td style={{ ...td, textAlign: "right", color: "#a78bfa", fontWeight: 700 }}>
                        {c.daysSinceActivity} j
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Charge par utilisateur ────────────────────────────────── */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 4 }}>Charge par utilisateur</div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>
              Qui déborde, qui galère. Clique sur un utilisateur pour voir son détail.
            </div>
            {data.userLoad.length === 0 ? (
              <div style={{ color: "#666", fontSize: 12, padding: "8px 0" }}>Aucun utilisateur actif.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Utilisateur</th>
                  <th style={th}>Secteurs</th>
                  <th style={{ ...th, textAlign: "right" }}>Cas actifs</th>
                  <th style={{ ...th, textAlign: "right" }}>Urgents</th>
                  <th style={{ ...th, textAlign: "right" }}>Bloqués</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions (7j)</th>
                  <th style={th}>Statut</th>
                </tr></thead>
                <tbody>
                  {data.userLoad.map(u => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser({ id: u.id, name: u.name })}
                      style={{ cursor: "pointer", transition: "background 120ms" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ ...td, fontWeight: 600, color: "#4ade80" }}>{u.name} →</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {u.sectors.map(s => (
                            <span key={s} style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                              background: `${sectorColor(s)}20`, color: sectorColor(s),
                            }}>{sectorShort(s)}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{u.activeCases}</td>
                      <td style={{ ...td, textAlign: "right", color: u.urgentCases > 0 ? "#f59e0b" : "#666" }}>
                        {u.urgentCases || "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: u.stuckCases > 0 ? "#a78bfa" : "#666" }}>
                        {u.stuckCases || "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: "#aaa" }}>{u.actionsLast7d}</td>
                      <td style={td}>
                        {u.flag === "overloaded" && badge("débordé", "#f87171", true)}
                        {u.flag === "struggling" && badge("galère ?", "#f59e0b", true)}
                        {u.flag === "ok" && <span style={{ color: "#4ade80", fontSize: 11 }}>✓ ok</span>}
                      </td>
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
          period="7d"
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
