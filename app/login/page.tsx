import { login } from "./actions";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Connexion</h1>
      <div style={{ color: "#aaa", marginBottom: 18 }}>
        Email + mot de passe Supabase Auth
      </div>

      <form action={login} style={{ display: "grid", gap: 10 }}>
        <input
          name="email"
          placeholder="Email"
          type="email"
          required
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #333",
            background: "#111",
            color: "white",
          }}
        />

        <input
          name="password"
          placeholder="Mot de passe"
          type="password"
          required
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #333",
            background: "#111",
            color: "white",
          }}
        />

        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #333",
            background: "white",
            color: "black",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}