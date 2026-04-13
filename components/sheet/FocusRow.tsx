"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function FocusRow({
  rowPrefix = "row-",
  scanInputId = "scan-input",
}: {
  rowPrefix?: string;
  scanInputId?: string;
}) {
  const sp = useSearchParams();
  const focus = sp.get("focus");

  useEffect(() => {
    if (!focus) return;

    const el = document.getElementById(`${rowPrefix}${focus}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    // refocus scan input pour enchaîner les scans
    const input = document.getElementById(scanInputId) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }, [focus, rowPrefix, scanInputId]);

  return null;
}