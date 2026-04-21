"use client";

import { useEffect, useState, useCallback } from "react";
import {
  loadAnnouncementsAction,
  createAnnouncementAction,
  toggleAnnouncementAction,
  deleteAnnouncementAction,
  type Announcement,
} from "@/app/app/admin/announcement-actions";

const ALL_SECTORS = [
  { code: "design_metal",    label: "Design Métal" },
  { code: "design_resine",   label: "Design Résine" },
  { code: "usinage_titane",  label: "Usinage Titane" },
  { code: "usinage_resine",  label: "Usinage Résine" },
  { code: "finition",        label: "Finition" },
];

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [allSectors, setAllSectors] = useState(true);
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadAnnouncementsAction();
    setAnnouncements(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!title.trim() && !message.trim()) {
      setFormError("Veuillez remplir au moins le titre ou le message.");
      return;
    }
    setCreating(true);
    setFormError("");
    const sectors = allSectors ? null : Array.from(selectedSectors);
    const result = await createAnnouncementAction(title.trim(), message.trim(), sectors);
    if (!result.ok) {
      setFormError(result.error ?? "Erreur");
    } else {
      setTitle("");
      setMessage("");
      setAllSectors(true);
      setSelectedSectors(new Set());
      await load();
    }
    setCreating(false);
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleAnnouncementAction(id, active);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active } : a));
  }

  async function handleDelete(id: string) {
    await deleteAnnouncementAction(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }

  function toggleSector(code: string) {
    setSelectedSectors(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  if (loading) return <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>;

  return (
    <div style={{ padding: "16px 0", overflowY: "auto", flex: 1, minHeight: 0 }}>
      {/* ── Formulaire de création ── */}
      <div style={{
        background: "#161616",
        border: "1px solid #2a2a2a",
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#d0d0d0", marginBottom: 12 }}>
          Nouvelle annonce
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre (ex: Mise à jour des couleurs)"
          style={{
            width: "100%", padding: "8px 12px", fontSize: 13,
            background: "#111", border: "1px solid #2a2a2a", borderRadius: 6,
            color: "white", outline: "none", marginBottom: 8,
            boxSizing: "border-box",
          }}
        />

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message détaillé…"
          rows={3}
          style={{
            width: "100%", padding: "8px 12px", fontSize: 13,
            background: "#111", border: "1px solid #2a2a2a", borderRadius: 6,
            color: "white", outline: "none", resize: "vertical", marginBottom: 10,
            boxSizing: "border-box", fontFamily: "inherit",
          }}
        />

        {/* Ciblage secteur */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Destinataires</div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={allSectors}
              onChange={() => setAllSectors(!allSectors)}
              style={{ accentColor: "#4ade80" }}
            />
            <span style={{ fontSize: 12, color: allSectors ? "#4ade80" : "#888", fontWeight: 600 }}>
              Tous les secteurs
            </span>
          </label>

          {!allSectors && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_SECTORS.map(s => {
                const active = selectedSectors.has(s.code);
                return (
                  <button
                    key={s.code}
                    onClick={() => toggleSector(s.code)}
                    style={{
                      padding: "4px 12px", fontSize: 11, fontWeight: 600,
                      borderRadius: 20, cursor: "pointer", transition: "all 150ms",
                      background: active ? "rgba(74,222,128,0.15)" : "#1a1a1a",
                      border: `1px solid ${active ? "rgba(74,222,128,0.5)" : "#333"}`,
                      color: active ? "#4ade80" : "#888",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {formError && (
          <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>{formError}</div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: "7px 20px", fontSize: 12, fontWeight: 700,
            borderRadius: 6, cursor: creating ? "not-allowed" : "pointer",
            background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)",
            color: "#4ade80", transition: "all 150ms",
          }}
        >
          {creating ? "Publication…" : "Publier l'annonce"}
        </button>
      </div>

      {/* ── Liste des annonces existantes ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#d0d0d0", marginBottom: 10 }}>
        Annonces ({announcements.length})
      </div>

      {announcements.length === 0 && (
        <div style={{ fontSize: 12, color: "#555" }}>Aucune annonce pour l'instant.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {announcements.map(a => (
          <div key={a.id} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "10px 14px",
            background: a.active ? "#161616" : "#111",
            border: `1px solid ${a.active ? "#2a2a2a" : "#1a1a1a"}`,
            borderRadius: 8,
            opacity: a.active ? 1 : 0.5,
          }}>
            {/* Indicateur actif */}
            <span style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
              background: a.active ? "#4ade80" : "#555",
              boxShadow: a.active ? "0 0 6px rgba(74,222,128,0.4)" : "none",
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0" }}>
                {a.title || "(sans titre)"}
              </div>
              {a.message && (
                <div style={{ fontSize: 12, color: "#999", marginTop: 2, whiteSpace: "pre-wrap" }}>
                  {a.message}
                </div>
              )}
              <div style={{ fontSize: 10, color: "#555", marginTop: 4, display: "flex", gap: 8 }}>
                <span>{fmtDate(a.created_at)}</span>
                <span>
                  {a.sectors === null
                    ? "Tous les secteurs"
                    : a.sectors.map(s => ALL_SECTORS.find(x => x.code === s)?.label ?? s).join(", ")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => handleToggle(a.id, !a.active)}
                title={a.active ? "Désactiver" : "Réactiver"}
                style={{
                  width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                  background: "#1a1a1a", border: "1px solid #333",
                  color: a.active ? "#f59e0b" : "#4ade80",
                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {a.active ? "⏸" : "▶"}
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                title="Supprimer"
                style={{
                  width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                  background: "#1a1a1a", border: "1px solid #333",
                  color: "#f87171",
                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
