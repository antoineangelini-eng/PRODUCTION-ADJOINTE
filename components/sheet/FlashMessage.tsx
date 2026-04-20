"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { reopenCaseAction } from "@/app/app/design-metal/actions";

const MESSAGES: Record<string, { text: string; color: string; bg: string }> = {
  in_table:   { text: "Ce cas est déjà dans le tableau", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  in_history: { text: "Ce cas est déjà dans l'historique", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

export function FlashMessage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState<{ text: string; color: string; bg: string } | null>(null);

  // Confirmation "réactiver depuis historique"
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmCn, setConfirmCn] = useState("");
  const [confirmCaseId, setConfirmCaseId] = useState("");
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    const key = searchParams.get("msg");
    const cn = searchParams.get("cn");
    const caseId = searchParams.get("case_id");

    if (key === "in_history_confirm" && cn && caseId) {
      setConfirmCn(cn);
      setConfirmCaseId(caseId);
      setConfirmVisible(true);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("msg");
      url.searchParams.delete("cn");
      url.searchParams.delete("case_id");
      router.replace(url.pathname + url.search, { scroll: false });
      return;
    }

    if (key && MESSAGES[key]) {
      const m = MESSAGES[key];
      setMsg({ ...m, text: cn ? `${m.text} (n°${cn})` : m.text });
      setVisible(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("msg");
      url.searchParams.delete("cn");
      url.searchParams.delete("case_id");
      router.replace(url.pathname + url.search, { scroll: false });
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  async function handleReopen() {
    setReopening(true);
    try {
      const res = await reopenCaseAction(confirmCaseId);
      if (res?.error) {
        alert(res.error);
      } else {
        setConfirmVisible(false);
        router.refresh();
      }
    } catch (e: any) {
      alert(e.message ?? "Erreur");
    } finally {
      setReopening(false);
    }
  }

  return (
    <>
      {/* Flash simple (auto-dismiss) */}
      {visible && msg && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "10px 24px", borderRadius: 10,
          background: msg.bg, border: `1px solid ${msg.color}44`,
          backdropFilter: "blur(12px)",
          color: msg.color, fontSize: 13, fontWeight: 700,
          boxShadow: `0 4px 20px ${msg.color}22`,
          animation: "flash-in 300ms ease-out",
          pointerEvents: "none",
        }}>
          {msg.text}
          <style>{`@keyframes flash-in { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
        </div>
      )}

      {/* Confirmation réactivation depuis historique */}
      {confirmVisible && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "14px 24px", borderRadius: 10,
          background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)",
          backdropFilter: "blur(12px)",
          color: "#f87171", fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(248,113,113,0.2)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <span>Le cas n°{confirmCn} existe dans l'historique. Réactiver ?</span>
          <button
            onClick={handleReopen}
            disabled={reopening}
            style={{
              padding: "5px 14px", borderRadius: 6, cursor: "pointer",
              background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.5)",
              color: "#4ade80", fontSize: 12, fontWeight: 700,
            }}
          >
            {reopening ? "..." : "Oui"}
          </button>
          <button
            onClick={() => setConfirmVisible(false)}
            style={{
              padding: "5px 14px", borderRadius: 6, cursor: "pointer",
              background: "transparent", border: "1px solid #444",
              color: "#888", fontSize: 12, fontWeight: 700,
            }}
          >
            Non
          </button>
        </div>
      )}
    </>
  );
}
