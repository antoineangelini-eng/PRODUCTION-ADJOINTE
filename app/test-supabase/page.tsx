"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CaseRow = {
  id: string;
  case_number: string;
  nature_du_travail: string;
  created_at: string;
};

export default function TestSupabasePage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [info, setInfo] = useState<string>("Chargement...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error, count } = await supabase
        .from("cases")
        .select("id, case_number, nature_du_travail, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        setError(`${error.message}\ncode=${error.code ?? ""}\ndetails=${error.details ?? ""}`);
        setInfo("Erreur.");
        return;
      }

      setRows((data as CaseRow[]) ?? []);
      setInfo(`OK. count=${count ?? "null"} rows=${(data ?? []).length}`);
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Test Supabase</h1>

      <pre style={{ color: "#aaa" }}>{info}</pre>

      {error && (
        <pre style={{ color: "salmon", whiteSpace: "pre-wrap" }}>{error}</pre>
      )}

      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <b>{r.case_number}</b> — {r.nature_du_travail} — {r.created_at}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { rpcUpdateUsinageResine } from "@/app/actions/rpc-update-usinage-resine";

export default function Page() {
  const caseId = "887ab252-e27c-4939-bc78-ccf8dd1e3ec8"; // ton vrai ID

  return (
    <button
      onClick={async () => {
        try {
          await rpcUpdateUsinageResine(caseId);
          alert("OK");
        } catch (e: any) {
          alert(e.message);
        }
      }}
    >
      Test RPC Usinage Résine
    </button>
  );
}