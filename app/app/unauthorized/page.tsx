export default function UnauthorizedPage() {
  return (
    <div
      style={{
        minHeight: "100%",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0a0a0a",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 24,
          background: "#111",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>
          Accès non autorisé
        </h1>

        <p style={{ color: "#aaa", lineHeight: 1.6, marginBottom: 10 }}>
          Vous êtes bien connecté, mais aucun profil valide n’a été trouvé
          dans la table <strong>profiles</strong>, ou votre profil n’est pas
          accessible.
        </p>

        <p style={{ color: "#888", lineHeight: 1.6 }}>
          Il faut vérifier dans Supabase :
          <br />
          - que votre utilisateur possède bien une ligne dans <strong>profiles</strong>
          <br />
          - que la colonne <strong>user_id</strong> correspond bien à votre utilisateur Auth
          <br />
          - que les règles RLS autorisent la lecture de votre propre profil
        </p>
      </div>
    </div>
  );
}