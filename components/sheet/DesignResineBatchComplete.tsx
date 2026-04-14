"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  completeDesignResineBatchAction,
  type BatchResult as BatchCompleteResult,
} from "@/app/app/design-resine/actions";

export function DesignResineBatchComplete({
  rows,
}: {
  rows: { id: string; case_number: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, action, pending] = useActionState(
    completeDesignResineBatchAction,
    null as BatchCompleteResult | null
  );

  const idToCaseNumber = new Map(rows.map((r) => [r.id, r.case_number]));

  useEffect(() => {
    if (!state) return;
    router.refresh();
    formRef.current?.reset();
  }, [state, router]);

  const formId = "design-resine-batch-form";

  return (
    <div style={{ marginTop: 10 }}>
      <form id={formId} ref={formRef} action={action}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: "8px 14px",
              border: "1px solid #4ade80",
              background: "rgba(74,222,128,0.08)",
              color: "#4ade80",
              cursor: pending ? "not-allowed" : "pointer",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {pending ? "Envoi..." : "Terminer la sélection →  Usinage Résine"}
          </button>

          {state && (
            <div style={{ fontSize: 13 }}>
              {state.okIds.length > 0 && <span>✅ {state.okIds.length} envoyés</span>}
              {state.errors.length > 0 && (
                <span style={{ marginLeft: 10 }}>❌ {state.errors.length} erreurs</span>
              )}
            </div>
          )}
        </div>

        {state && state.errors.length > 0 && (
          <div style={{
            marginTop: 10, border: "1px solid #5a2a2a",
            background: "rgba(120,40,40,0.15)", padding: 10, borderRadius: 8,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Dossiers non envoyés</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {state.errors.map((e: { case_id: string | null; error_message: string }, i: number) => (
                <li key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>
                    {e.case_id ? idToCaseNumber.get(e.case_id) ?? e.case_id : "Sélection"}
                  </span>
                  <span style={{ opacity: 0.8 }}> — {e.error_message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* Checkboxes rendues dans le tableau, liées à ce form via form= */}
      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        Sélectionner les dossiers à terminer dans le tableau ↓
      </div>

      {/* Export de formId pour le tableau */}
      <input type="hidden" data-batch-form-id={formId} />
    </div>
  );
}

export const BATCH_FORM_ID = "design-resine-batch-form";
