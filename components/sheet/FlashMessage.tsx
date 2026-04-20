"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { text: string; color: string; bg: string }> = {
  in_table:   { text: "Ce cas est déjà dans le tableau", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  in_history: { text: "Ce cas est déjà dans l'historique", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

export function FlashMessage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState<{ text: string; color: string; bg: string } | null>(null);

  useEffect(() => {
    const key = searchParams.get("msg");
    const cn = searchParams.get("cn");
    if (key && MESSAGES[key]) {
      const m = MESSAGES[key];
      setMsg({ ...m, text: cn ? `${m.text} (n°${cn})` : m.text });
      setVisible(true);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("msg");
      url.searchParams.delete("cn");
      router.replace(url.pathname + url.search, { scroll: false });
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!visible || !msg) return null;

  return (
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
  );
}
