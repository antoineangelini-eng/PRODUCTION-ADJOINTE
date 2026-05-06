"use client";
import React, { useRef } from "react";
import { DesignMetalCreateBar } from "@/components/sheet/DesignMetalCreateBar";
import { DesignMetalTable } from "@/components/sheet/DesignMetalTable";

export function DesignMetalProductionWrapper({
  focusId,
  currentUserId,
  currentSector,
  isAdmin,
}: {
  focusId: string | null;
  currentUserId: string;
  currentSector: string;
  isAdmin: boolean;
}) {
  const reloadRef = useRef<(() => void) | null>(null);

  return (
    <>
      <div style={{ flexShrink: 0, background: "#0b0b0b", padding: "10px 20px 8px", borderBottom: "1px solid #1a1a1a" }}>
        <DesignMetalCreateBar onCreated={() => reloadRef.current?.()} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DesignMetalTable
          focusId={focusId}
          currentUserId={currentUserId}
          currentSector={currentSector}
          isAdmin={isAdmin}
          onReload={(fn) => { reloadRef.current = fn; }}
        />
      </div>
    </>
  );
}
