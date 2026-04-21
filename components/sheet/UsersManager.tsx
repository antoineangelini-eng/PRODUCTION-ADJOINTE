"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  loadUsersAction,
  createUserAction,
  updateUserSectorsAction,
  deleteUserAction,
  adminResetPasswordAction,
  updatePasswordHintAction,
  updateDisplayNameAction,
  type AdminUser,
} from "@/app/app/admin/actions";

const PROTECTED_ADMIN_EMAIL = "antoine.angelini@labo-argoat.fr";

const SECTORS = [
  { code: "design_metal",   label: "Design Métal",   short: "DM", color: "#4ade80" },
  { code: "design_resine",  label: "Design Résine",  short: "DR", color: "#7c8196" },
  { code: "usinage_titane", label: "Usinage Titane", short: "UT", color: "#f59e0b" },
  { code: "usinage_resine", label: "Usinage Résine", short: "UR", color: "#9487a8" },
  { code: "finition",       label: "Finition",       short: "FI", color: "#f59e0b" },
  { code: "admin",          label: "Admin",          short: "AD", color: "#4ade80" },
];

function getSectorMeta(code: string) {
  return SECTORS.find((s) => s.code === code) ?? { code, label: code, short: "?", color: "#666" };
}

function initials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(".");
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function displayNameFromEmail(email: string, fallback: string) {
  const local = email.split("@")[0] ?? "";
  if (!local) return fallback;
  return local.split(".").map((p) => (p ? p[0].toUpperCase() + p.slice(1) : "")).join(" ");
}

function generatePassword(): string {
  const words = ["Soleil","Lune","Étoile","Nuage","Arbre","Pierre","Fleuve","Forêt","Fleur","Vague","Mouette","Granit","Brume","Falaise","Rivière"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = String(Math.floor(Math.random() * 90) + 10);
  return word + num;
}

/* ── Chip multi-select pour les secteurs ── */
function SectorChips({
  selected,
  onChange,
  locked = [],
  size = "normal",
}: {
  selected: string[];
  onChange: (sectors: string[]) => void;
  locked?: string[];
  size?: "normal" | "small";
}) {
  function toggle(code: string) {
    // Ne pas toucher aux secteurs verrouillés
    if (locked.includes(code)) return;
    if (selected.includes(code)) {
      // Ne pas enlever le dernier
      if (selected.length <= 1) return;
      onChange(selected.filter((s) => s !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  const isSmall = size === "small";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: isSmall ? 5 : 6 }}>
      {SECTORS.map((s) => {
        const active = selected.includes(s.code);
        const isLocked = locked.includes(s.code);
        return (
          <button
            key={s.code}
            onClick={() => toggle(s.code)}
            title={s.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: isSmall ? "4px 10px" : "5px 12px",
              minWidth: isSmall ? 42 : "auto",
              borderRadius: isSmall ? 999 : 6,
              border: `1px solid ${active ? s.color + "55" : "#262626"}`,
              background: active ? s.color + "12" : "transparent",
              color: active ? s.color : "#4a4a4a",
              fontSize: isSmall ? 10 : 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: isLocked ? "not-allowed" : "pointer",
              opacity: isLocked ? 0.6 : 1,
              transition: "all 150ms",
              outline: "none",
            }}
          >
            {isSmall ? (
              s.short
            ) : (
              <>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: active ? s.color + "25" : "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: active ? s.color : "#444",
                  transition: "all 150ms",
                }}>
                  {s.short}
                </span>
                {s.label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Password cell ── */
function PasswordCell({ password, onReset }: { password: string | null; onReset: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!password) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>non renseigné</span>
        <button onClick={onReset} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, border: "1px solid #333", background: "#1a1a1a", color: "#888", cursor: "pointer" }}>
          Définir
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", letterSpacing: visible ? "0.06em" : "0.12em", minWidth: 80, fontFamily: "monospace" }}>
        {visible ? password : "••••••••"}
      </div>
      <button onClick={() => setVisible((v) => !v)} style={{ width: 26, height: 22, borderRadius: 5, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#777", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }} title={visible ? "Masquer" : "Afficher"}>
        {visible ? "○" : "●"}
      </button>
      <button onClick={copy} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid #2a2a2a", background: copied ? "rgba(74,222,128,0.08)" : "#1a1a1a", color: copied ? "#4ade80" : "#777", cursor: "pointer", transition: "all 150ms" }}>
        {copied ? "✓ Copié" : "Copier"}
      </button>
      <button onClick={onReset} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#666", cursor: "pointer" }}>
        Changer
      </button>
    </div>
  );
}

/* ── Inline display name editor ── */
function DisplayNameEditor({ userId, currentName, emailName, onSaved }: {
  userId: string; currentName: string | null; emailName: string; onSaved: (name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const trimmed = value.trim();
    await updateDisplayNameAction(userId, trimmed);
    onSaved(trimmed || null);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>
          {currentName || emailName}
        </div>
        <button onClick={() => { setValue(currentName ?? ""); setEditing(true); }}
          title="Modifier le nom affiché"
          style={{ background: "none", border: "1px solid #2a2a2a", color: "#555", width: 22, height: 22, borderRadius: 5, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, transition: "all 150ms" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4ade80"; e.currentTarget.style.color = "#4ade80"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#555"; }}
        >✎</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input value={value} onChange={e => setValue(e.target.value)} autoFocus
        placeholder={emailName}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        style={{ background: "#141414", border: "1px solid #4ade80", borderRadius: 5, color: "white", fontSize: 12, fontWeight: 700, padding: "3px 8px", width: 160, outline: "none" }} />
      <button onClick={save} disabled={saving}
        style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, cursor: "pointer" }}>
        {saving ? "…" : "✓"}
      </button>
      <button onClick={() => setEditing(false)}
        style={{ background: "none", border: "1px solid #333", color: "#888", fontSize: 10, padding: "3px 8px", borderRadius: 5, cursor: "pointer" }}>
        ✕
      </button>
    </div>
  );
}

/* ── Main component ── */
export function UsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [email, setEmail] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [genPassword, setGenPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadUsersAction();
      setUsers(data);
    } catch (e: any) {
      console.error("Erreur Users:", e);
      setUsers([]);
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal() {
    setShowModal(true);
    setCreateError(null);
    setCreatedInfo(null);
    setCopied(false);
    setEmail("");
    setSelectedSectors([]);
    setGenPassword(generatePassword());
  }

  async function handleCreate() {
    if (!email.trim() || selectedSectors.length === 0) return;
    setCreating(true);
    setCreateError(null);
    const result = await createUserAction(email.trim(), selectedSectors, genPassword);
    setCreating(false);
    if (!result.ok) { setCreateError(result.error ?? "Erreur"); return; }
    setCreatedInfo({ email: email.trim(), password: genPassword });
    await load();
  }

  async function handleSectorsChange(userId: string, newSectors: string[]) {
    const result = await updateUserSectorsAction(userId, newSectors);
    if (!result.ok) {
      setError("Erreur sauvegarde secteurs: " + (result.error ?? "inconnue"));
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, sectors: newSectors, sector: newSectors[0] ?? u.sector } : u))
    );
  }

  async function handleDelete(userId: string) {
    const result = await deleteUserAction(userId);
    if (!result.ok) { alert(result.error); return; }
    setConfirmDeleteId(null);
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }

  function openReset(userId: string) {
    setResetId(userId);
    setResetPassword(generatePassword());
    setResetDone(false);
  }

  async function handleResetPassword(userId: string) {
    setResetSaving(true);
    try {
      await adminResetPasswordAction(userId, resetPassword);
      await updatePasswordHintAction(userId, resetPassword);
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, password_hint: resetPassword } : u));
      setResetDone(true);
      setTimeout(() => { setResetId(null); setResetPassword(""); setResetDone(false); }, 1800);
    } catch (e: any) { alert(e.message); }
    finally { setResetSaving(false); }
  }

  const inp = (): React.CSSProperties => ({
    background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6,
    color: "white", fontSize: 12, padding: "6px 9px", width: "100%", outline: "none", boxSizing: "border-box",
  });
  const lbl: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
    color: "#666", display: "block", marginBottom: 4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 12px", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "#ccc", padding: "4px 12px", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 20, fontWeight: 600 }}>
          {users.length} utilisateur{users.length > 1 ? "s" : ""}
        </span>
        <button onClick={openModal} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Ajouter un utilisateur
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 13 }}>
          Erreur : {error}
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: 12, padding: 18, marginBottom: 14, flexShrink: 0 }}>
          {!createdInfo ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 14 }}>Nouvel utilisateur</div>

              <div style={{ marginBottom: 14 }}>
                <span style={lbl}>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@labo-argoat.fr" style={inp()} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <span style={lbl}>Secteurs</span>
                <SectorChips selected={selectedSectors} onChange={setSelectedSectors} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <span style={lbl}>Mot de passe généré</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 12px", fontSize: 15, fontWeight: 700, color: "#4ade80", letterSpacing: "0.06em", fontFamily: "monospace" }}>
                    {genPassword}
                  </div>
                  <button onClick={() => setGenPassword(generatePassword())} style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#aaa", fontSize: 11, padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
                    ↻ Régénérer
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Stocké dans le profil — visible dans la liste des comptes.</div>
              </div>

              {createError && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>✕ {createError}</div>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)} style={{ background: "#1e1e1e", border: "1px solid #2e2e2e", color: "#ccc", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Annuler
                </button>
                <button onClick={handleCreate} disabled={creating || !email.trim() || selectedSectors.length === 0} style={{
                  background: !email.trim() || selectedSectors.length === 0 ? "#1e1e1e" : "rgba(74,222,128,0.1)",
                  border: !email.trim() || selectedSectors.length === 0 ? "1px solid #2e2e2e" : "1px solid rgba(74,222,128,0.4)",
                  color: !email.trim() || selectedSectors.length === 0 ? "#555" : "#4ade80",
                  padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer",
                }}>
                  {creating ? "Création…" : "Créer le compte"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8, color: "#4ade80" }}>✓</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 16 }}>Compte créé — note ces informations</div>
              <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 8, padding: "14px 18px", marginBottom: 16, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={lbl}>Email</span>
                  <span style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 500 }}>{createdInfo.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={lbl}>Mot de passe</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#4ade80", letterSpacing: "0.08em", fontFamily: "monospace" }}>{createdInfo.password}</span>
                    <button onClick={() => { navigator.clipboard.writeText(createdInfo.password); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      style={{ background: copied ? "rgba(74,222,128,0.1)" : "#1e1e1e", border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid #2e2e2e", color: copied ? "#4ade80" : "#aaa", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 150ms" }}>
                      {copied ? "✓ Copié" : "Copier"}
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", padding: "8px 24px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                J&apos;ai noté, fermer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 32, color: "#555", fontSize: 13 }}>Chargement…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 32, color: "#333", fontSize: 13, textAlign: "center" }}>Aucun utilisateur.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {users.map((user) => {
              const primaryMeta = getSectorMeta(user.sectors[0] ?? user.sector);
              const ini = initials(user.email);
              const isResetting = resetId === user.user_id;
              const name = displayNameFromEmail(user.email, user.user_id);
              const isProtected = user.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL;

              return (
                <div key={user.user_id}>
                  <div style={{
                    background: "#1a1a1a",
                    border: `1px solid ${isResetting ? "#2a2a2a" : "#272727"}`,
                    borderRadius: isResetting ? "10px 10px 0 0" : 10,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    transition: "border-color 150ms",
                  }}>
                    {/* Ligne principale : avatar + nom + password + delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%",
                        background: `${primaryMeta.color}18`, border: `1px solid ${primaryMeta.color}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: primaryMeta.color, flexShrink: 0,
                      }}>
                        {ini || "?"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DisplayNameEditor
                          userId={user.user_id}
                          currentName={user.custom_display_name}
                          emailName={name}
                          onSaved={(newName) => setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, custom_display_name: newName, display_name: newName || name } : u))}
                        />
                        <div style={{ fontSize: 11, color: "#555" }}>{user.email || user.user_id}</div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <PasswordCell password={user.password_hint} onReset={() => (isResetting ? setResetId(null) : openReset(user.user_id))} />
                      </div>

                      {isProtected ? (
                        <span title="Compte administrateur protégé — non supprimable" style={{ flexShrink: 0, fontSize: 10, color: "#4ade80", padding: "3px 8px", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 5, background: "rgba(74,222,128,0.06)", fontWeight: 700, letterSpacing: "0.04em" }}>🔒 Admin</span>
                      ) : confirmDeleteId === user.user_id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "#f87171" }}>Supprimer ?</span>
                          <button onClick={() => handleDelete(user.user_id)} style={{ padding: "3px 8px", border: "1px solid #f87171", background: "rgba(239,68,68,0.15)", color: "#f87171", cursor: "pointer", fontSize: 10, fontWeight: 700, borderRadius: 4 }}>Oui</button>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "3px 7px", border: "1px solid #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: 10, borderRadius: 4 }}>Non</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(user.user_id)}
                          style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#555", width: 28, height: 28, borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 150ms" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Chips des secteurs — "admin" verrouillé uniquement pour le compte protégé */}
                    <SectorChips
                      selected={user.sectors?.length ? user.sectors : [user.sector]}
                      onChange={(newSectors) => handleSectorsChange(user.user_id, newSectors)}
                      locked={isProtected ? ["admin"] : []}
                      size="small"
                    />
                  </div>

                  {/* Panel reset password */}
                  {isResetting && (
                    <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap" }}>Nouveau MDP</span>
                      <div style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 10px", fontSize: 14, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em", fontFamily: "monospace" }}>
                        {resetPassword}
                      </div>
                      <button onClick={() => setResetPassword(generatePassword())} style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#666", fontSize: 10, padding: "5px 9px", borderRadius: 5, cursor: "pointer" }}>↻</button>
                      <button onClick={() => { navigator.clipboard.writeText(resetPassword); }} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 10, padding: "5px 9px", borderRadius: 5, cursor: "pointer" }}>Copier</button>
                      <button onClick={() => handleResetPassword(user.user_id)} disabled={resetSaving}
                        style={{ background: resetDone ? "rgba(74,222,128,0.1)" : "rgba(245,158,11,0.1)", border: resetDone ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(245,158,11,0.4)", color: resetDone ? "#4ade80" : "#f59e0b", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {resetSaving ? "…" : resetDone ? "✓ Appliqué" : "Appliquer"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
