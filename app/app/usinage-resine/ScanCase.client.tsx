"use client";

import { useState } from "react";
import { rpcScanCase } from "@/app/actions/rpc-scan-case";
import { useRouter } from "next/navigation";

export function ScanCase() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleScan() {
    const trimmed = value.trim();
    if (!trimmed) return;

    setError(null);

    try {
      const caseId = await rpcScanCase("usinage_resine", trimmed);
      setValue("");
      router.push(`/app/usinage-resine?focus=${caseId}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="scan-input-usinage-resine"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleScan(); }}
          placeholder="Scanner / saisir le numéro du cas"
          autoFocus
          style={{
            padding: "10px 12px",
            border: "1px solid #444",
            background: "transparent",
            color: "white",
            width: 320,
          }}
        />
        <button
          onClick={() => void handleScan()}
          style={{
            padding: "10px 14px",
            border: "1px solid #666",
            background: "transparent",
            color: "white",
            cursor: "pointer",
          }}
        >
          SCAN
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 6, color: "salmon", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
