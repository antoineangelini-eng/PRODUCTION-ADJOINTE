export default function Loading() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      color: "#555",
      fontSize: 13,
      letterSpacing: "0.04em",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 14,
          height: 14,
          border: "2px solid #2a2a2a",
          borderTopColor: "#4ade80",
          borderRadius: "50%",
          animation: "spin 700ms linear infinite",
        }} />
        <span>Chargement…</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
