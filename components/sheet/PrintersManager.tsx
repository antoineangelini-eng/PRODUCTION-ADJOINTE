"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  loadUserPrintersAction,
  saveUserPrinterAction,
  type UserPrinter,
} from "@/app/app/admin/printer-actions";

export function PrintersManager() {
  const [users, setUsers] = useState<UserPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadUserPrintersAction();
    setUsers(data);
    const vals: Record<string, string> = {};
    for (const u of data) vals[u.user_id] = u.printer_ip;
    setEditValues(vals);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(userId: string) {
    const ip = editValues[userId] ?? "";
    setSaving(userId);
    const res = await saveUserPrinterAction(userId, ip);
    setSaving(null);
    if (res.ok) {
      setSaved(userId);
      setTimeout(() => setSaved(null), 2000);
    }
  }

  function displayName(u: UserPrinter) {
    if (u.display_name) return u.display_name;
    const local = u.email.split("@")[0] ?? "";
    return local.split(".").map(p => p ? p[0].toUpperCase() + p.slice(1) : "").join(" ");
  }

  if (loading) return <div style={{ padding: 40, color: "#555", fontSize: 13, textAlign: "center" }}>Chargement...</div>;

  return (
    <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "16px 0" }}>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
        Associez une adresse IP d'imprimante Zebra à chaque utilisateur. L'étiquette sera imprimée automatiquement lors de la validation dans UR. Si aucune IP n'est configurée, aucune impression n'aura lieu.
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#888" }}>Utilisateur</th>
            <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#888" }}>Email</th>
            <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#888" }}>IP Imprimante</th>
            <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#888", width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => {
            const changed = (editValues[u.user_id] ?? "") !== u.printer_ip;
            const isSaving = saving === u.user_id;
            const isSaved = saved === u.user_id;
            return (
              <tr key={u.user_id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "white" }}>
                  {displayName(u)}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>
                  {u.email}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <input
                    type="text"
                    value={editValues[u.user_id] ?? ""}
                    onChange={e => setEditValues(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                    placeholder="ex: 192.168.1.12"
                    onKeyDown={e => { if (e.key === "Enter" && changed) handleSave(u.user_id); }}
                    style={{
                      background: "#111",
                      border: changed ? "1px solid #f59e0b" : "1px solid #333",
                      borderRadius: 6,
                      color: "white",
                      fontSize: 13,
                      padding: "6px 10px",
                      width: 180,
                      outline: "none",
                      fontFamily: "monospace",
                      transition: "border-color 150ms",
                    }}
                  />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  {isSaved ? (
                    <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>✓</span>
                  ) : changed ? (
                    <button
                      onClick={() => handleSave(u.user_id)}
                      disabled={isSaving}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 6,
                        border: "1px solid #4ade80",
                        background: "rgba(74,222,128,0.08)",
                        color: "#4ade80",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isSaving ? "not-allowed" : "pointer",
                        opacity: isSaving ? 0.5 : 1,
                      }}
                    >
                      {isSaving ? "..." : "Sauvegarder"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
