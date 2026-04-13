"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export function SearchBar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  function handleSearch() {
    const val = ref.current?.value.trim();
    if (!val) return;
    router.push(`${basePath}?focus=${encodeURIComponent(val)}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 11, color: "white", letterSpacing: 0.5 }}>Rechercher un cas</span>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={ref}
          placeholder="N° du cas..."
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{
            padding: "7px 10px", border: "1px solid #ffffff",
            background: "transparent", color: "white", fontSize: 12,
            width: 160, outline: "none", borderRadius: 4,
          }}
        />
        <button onClick={handleSearch} style={{
          padding: "7px 12px", border: "1px solid #ffffff",
          background: "transparent", color: "white",
          cursor: "pointer", fontSize: 12, borderRadius: 4,
        }}>Rechercher</button>
      </div>
    </div>
  );
}
