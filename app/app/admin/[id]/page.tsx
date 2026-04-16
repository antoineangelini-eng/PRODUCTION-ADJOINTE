import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* ---------- Types ---------- */

type CaseRow = {
  id: string;
  case_number: string | null;
  nature_du_travail: string | null;
  created_at: string;
  updated_at: string | null;
  date_expedition: string | null;
};

type SectorDesignMetalRow = {
  case_id: string;
  reception_metal: boolean | null;
  reception_metal_date: string | null; // date
  type_de_dents: string | null;
  modele_a_faire: string | null;
  modele_a_faire_ok: boolean | null;
  teintes_associees: string | null;
  design_chassis: boolean | null;
  design_chassis_at: string | null; // timestamptz
  dental1_case_number: string | null;
  envoye_dentall: boolean | null;
  updated_at: string | null;
  updated_by: string | null;
};

type SectorDesignResineRow = {
  case_id: string;
  design_dents_resine: boolean | null;
  design_dents_resine_at: string | null; // timestamptz
  type_de_dents: string | null;
  nb_blocs: number | null;
  nb_blocs_de_dents: string | null;
  modele_a_resiner: string | null;
  modele_a_realiser_ok: boolean | null;
  teintes_associees: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

type SectorUsinageTitaneRow = {
  case_id: string;
  envoye_usinage: boolean | null;
  envoye_usinage_at: string | null; // timestamptz
  delai_j1_date: string | null; // date
  updated_at: string | null;
  updated_by: string | null;
};

type SectorUsinageResineRow = {
  case_id: string;
  usinage_dents_resine: boolean | null;
  usinage_dents_resine_at: string | null; // timestamptz
  delai_j1_date: string | null; // date
  updated_at: string | null;
  updated_by: string | null;
};

/* ---------- Page ---------- */

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return (
      <div style={{ padding: 24, color: "salmon", whiteSpace: "pre-wrap" }}>
        <h1>Erreur session</h1>
        <div>{userError.message}</div>
      </div>
    );
  }

  if (!user) redirect("/login");

  // 1) Dossier central (cases)
  const { data: c, error: caseError } = await supabase
    .from("cases")
    .select(
      "id, case_number, nature_du_travail, created_at, updated_at, date_expedition"
    )
    .eq("id", id)
    .maybeSingle<CaseRow>();

  if (caseError) {
    return (
      <div style={{ padding: 24, color: "salmon", whiteSpace: "pre-wrap" }}>
        <h1>Erreur SELECT cases</h1>
        <div>
          <b>id</b> = {id}
        </div>
        <div>
          <b>message</b> = {caseError.message}
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div style={{ padding: 24, color: "salmon" }}>
        Dossier introuvable (id: {id})
      </div>
    );
  }

  // 2) Secteurs
  const { data: dm, error: dmError } = await supabase
    .from("sector_design_metal")
    .select("*")
    .eq("case_id", id)
    .maybeSingle<SectorDesignMetalRow>();

  const [
    { data: dr, error: drError },
    { data: ut, error: utError },
    { data: ur, error: urError },
  ] = await Promise.all([
    supabase
      .from("sector_design_resine")
      .select("*")
      .eq("case_id", id)
      .maybeSingle<SectorDesignResineRow>(),
    supabase
      .from("sector_usinage_titane")
      .select("*")
      .eq("case_id", id)
      .maybeSingle<SectorUsinageTitaneRow>(),
    supabase
      .from("sector_usinage_resine")
      .select("*")
      .eq("case_id", id)
      .maybeSingle<SectorUsinageResineRow>(),
  ]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ marginBottom: 0 }}>Dossier : {c.case_number ?? c.id}</h1>

      {/* Bloc central */}
      <Section title="Données dossier (cases)">
        <Grid2>
          <Field label="ID" value={c.id} />
          <Field label="Numéro" value={c.case_number ?? "-"} />
          <Field label="Nature" value={c.nature_du_travail ?? "-"} />
          <Field label="Créé le" value={fmtDateTime(c.created_at)} />
          <Field label="Modifié le" value={c.updated_at ? fmtDateTime(c.updated_at) : "-"} />
          <Field
            label="Expédition"
            value={c.date_expedition ? fmtDate(c.date_expedition) : "-"}
          />
        </Grid2>
      </Section>

      {/* DESIGN METAL (ordre + libellés sheet) */}
      <Section title="DESIGN MÉTAL">
        {dmError ? (
          <ErrorBox where="sector_design_metal" message={dmError.message} />
        ) : dm ? (
          <SheetTable
            columns={[
              {
                key: "created_at",
                label: "Date de création",
                render: () => fmtDateTime(c.created_at),
              },
              {
                key: "case_number",
                label: "Numéro du cas",
                render: () => val(c.case_number),
              },
              {
                key: "date_expedition",
                label: "Date d’expedition",
                render: () => (c.date_expedition ? fmtDate(c.date_expedition) : "—"),
              },
              {
                key: "nature",
                label: "Nature du travail",
                render: () => val(c.nature_du_travail),
              },
              {
                key: "design_chassis",
                label: "Design Chassis",
                render: () => fmtBool(dm.design_chassis),
              },
              {
                key: "design_chassis_at",
                label: "Date et Heure Design Chassis Terminé",
                render: () => (dm.design_chassis_at ? fmtDateTime(dm.design_chassis_at) : "—"),
              },
              {
                key: "dental1_case_number",
                label: "Numéro du cas (Dent All Groupe)",
                render: () => val(dm.dental1_case_number),
              },
              {
                key: "envoye_dentall",
                label: "Envoyé DentAll",
                render: () => fmtBool(dm.envoye_dentall),
              },
              {
                key: "reception_metal_date",
                label: "RÉCEPTION MÉTAL",
                render: () =>
                  dm.reception_metal_date ? fmtDate(dm.reception_metal_date) : "—",
              },
              {
                key: "type_de_dents",
                label: "Type de dents",
                render: () => val(dm.type_de_dents),
              },
              {
                key: "modele_a_faire",
                label: "Modèle à faire ?",
                render: () => val(dm.modele_a_faire),
              },
              {
                key: "teintes_associees",
                label: "Teintes associées",
                render: () => val(dm.teintes_associees),
              },
            ]}
          />
        ) : (
          <Muted>Aucune donnée.</Muted>
        )}
      </Section>

      {/* DESIGN RESINE (ordre + libellés sheet) */}
      <Section title="DESIGN RÉSINE">
        {drError ? (
          <ErrorBox where="sector_design_resine" message={drError.message} />
        ) : dr ? (
          <SheetTable
            columns={[
              {
                key: "created_at",
                label: "Date de création",
                render: () => fmtDateTime(c.created_at),
              },
              {
                key: "case_number",
                label: "Numéro du cas",
                render: () => val(c.case_number),
              },
              {
                key: "date_expedition",
                label: "Date d’expedition",
                render: () => (c.date_expedition ? fmtDate(c.date_expedition) : "—"),
              },
              {
                key: "nature",
                label: "Nature du travail",
                render: () => val(c.nature_du_travail),
              },

              // dans ta sheet, ces colonnes existent sur Design Résine
              // mais les données proviennent du Design Métal
              {
                key: "design_chassis_from_dm",
                label: "Design chassis",
                render: () => (dm ? fmtBool(dm.design_chassis) : "—"),
              },
              {
                key: "design_chassis_at_from_dm",
                label: "Date et heure — Design châssis terminé",
                render: () => (dm?.design_chassis_at ? fmtDateTime(dm.design_chassis_at) : "—"),
              },

              {
                key: "type_de_dents",
                label: "Type de dents",
                render: () => val(dr.type_de_dents),
              },
              {
                key: "design_dents_resine",
                label: "Design dents résine",
                render: () => fmtBool(dr.design_dents_resine),
              },
              {
                key: "design_dents_resine_at",
                label: "Date et heure — Design dents résine",
                render: () =>
                  dr.design_dents_resine_at ? fmtDateTime(dr.design_dents_resine_at) : "—",
              },
              {
                key: "nb_blocs_de_dents",
                label: "Nombre de blocs de dents",
                render: () => val(dr.nb_blocs_de_dents),
              },
              {
                key: "modele_a_resiner",
                label: "Modèle à réaliser",
                render: () => val(dr.modele_a_resiner),
              },
              {
                key: "teintes_associees",
                label: "Teintes associées",
                render: () => val(dr.teintes_associees),
              },
            ]}
          />
        ) : (
          <Muted>Aucune donnée.</Muted>
        )}
      </Section>

      {/* USINAGE TITANE (ordre + libellés sheet ; placeholders pour colonnes non DB) */}
      <Section title="USINAGE TITANE">
        {utError ? (
          <ErrorBox where="sector_usinage_titane" message={utError.message} />
        ) : ut ? (
          <SheetTable
            columns={[
              {
                key: "created_at",
                label: "Date de création",
                render: () => fmtDateTime(c.created_at),
              },
              {
                key: "case_number",
                label: "Numéro du cas",
                render: () => val(c.case_number),
              },
              {
                key: "date_expedition",
                label: "Date d’expedition",
                render: () => (c.date_expedition ? fmtDate(c.date_expedition) : "—"),
              },
              {
                key: "nature",
                label: "Nature du travail",
                render: () => val(c.nature_du_travail),
              },
              {
                key: "design_chassis_from_dm",
                label: "Design Chassis",
                render: () => (dm ? fmtBool(dm.design_chassis) : "—"),
              },
              {
                key: "design_chassis_at_from_dm",
                label: "Date et Heure Design Chassis Terminé",
                render: () => (dm?.design_chassis_at ? fmtDateTime(dm.design_chassis_at) : "—"),
              },
              {
                key: "envoye_usinage",
                label: "Envoyé Usinage (que titane)",
                render: () => fmtBool(ut.envoye_usinage),
              },

              // non présent en DB (placeholders)
              {
                key: "lot_metal",
                label: "N° De Lots Métal",
                render: () => "—",
              },
              {
                key: "calcul",
                label: "N° De Calcul",
                render: () => "—",
              },

              {
                key: "reception_metal_from_dm",
                label: "RÉCEPTION MÉTAL",
                render: () =>
                  dm?.reception_metal_date ? fmtDate(dm.reception_metal_date) : "—",
              },
              {
                key: "modele_a_faire_from_dm",
                label: "Modèle à faire ?",
                render: () => (dm ? val(dm.modele_a_faire) : "—"),
              },
            ]}
          />
        ) : (
          <Muted>Aucune donnée.</Muted>
        )}
      </Section>

      {/* USINAGE RESINE (ordre + libellés sheet ; placeholders pour colonnes non DB) */}
      <Section title="USINAGE RÉSINE">
        {urError ? (
          <ErrorBox where="sector_usinage_resine" message={urError.message} />
        ) : ur ? (
          <SheetTable
            columns={[
              {
                key: "created_at",
                label: "Date de création",
                render: () => fmtDateTime(c.created_at),
              },
              {
                key: "case_number",
                label: "Numéro du cas",
                render: () => val(c.case_number),
              },
              {
                key: "date_expedition",
                label: "Date d’expedition",
                render: () => (c.date_expedition ? fmtDate(c.date_expedition) : "—"),
              },

              {
                key: "design_dents_resine_from_dr",
                label: "Design Dents Résines",
                render: () => (dr ? fmtBool(dr.design_dents_resine) : "—"),
              },
              {
                key: "design_dents_resine_at_from_dr",
                label: "Date et Heure Design Dents Résines",
                render: () =>
                  dr?.design_dents_resine_at ? fmtDateTime(dr.design_dents_resine_at) : "—",
              },
              {
                key: "nb_blocs_de_dents_from_dr",
                label: "Nombre de blocs de dents ?",
                render: () => (dr ? val(dr.nb_blocs_de_dents) : "—"),
              },
              {
                key: "modele_a_faire_from_dr",
                label: "Modèle à faire ?",
                render: () => (dr ? val(dr.modele_a_resiner) : "—"),
              },

              {
                key: "usinage_dents_resine",
                label: "Usinage Dents Résines",
                render: () => fmtBool(ur.usinage_dents_resine),
              },

              // non présent en DB (placeholders)
              { key: "identites_machine", label: "Identités de la machine", render: () => "—" },
              { key: "numero_disque", label: "Numéro du disque", render: () => "—" },
              { key: "tr", label: "Tr", render: () => "—" },

              {
                key: "teintes_associees_from_dr",
                label: "Teintes associées",
                render: () => (dr ? val(dr.teintes_associees) : "—"),
              },

              { key: "lot_pmma", label: "N° De Lots PMMA", render: () => "—" },
              { key: "reception_resine", label: "RÉCEPTION RÉSINE", render: () => "—" },

              {
                key: "nature_right",
                label: "Nature du travail",
                render: () => val(c.nature_du_travail),
              },
            ]}
          />
        ) : (
          <Muted>Aucune donnée.</Muted>
        )}
      </Section>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #222",
        background: "#0f0f0f",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 12 }}>{title}</div>
      {children}
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 12,
        border: "1px solid #222",
        background: "#111",
      }}
    >
      <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
      <div style={{ marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ErrorBox({ where, message }: { where: string; message: string }) {
  return (
    <div style={{ color: "salmon", whiteSpace: "pre-wrap" }}>
      Erreur {where}: {message}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#888" }}>{children}</div>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderBottom: "1px solid #222",
        color: "#bbb",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid #151515",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function SheetTable({
  columns,
}: {
  columns: { key: string; label: string; render: () => string }[];
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c.key}>{c.label}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((c) => (
              <Td key={c.key}>{c.render()}</Td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- formatting ---------- */

function fmtBool(v: boolean | null | undefined) {
  if (v === true) return "Oui";
  if (v === false) return "Non";
  return "—";
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function val(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}