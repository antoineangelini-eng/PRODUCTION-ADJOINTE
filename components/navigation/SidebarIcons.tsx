/** Initiales pour la sidebar */

const base: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
  lineHeight: 1,
  userSelect: "none",
};

export function IconHome() {
  return <span style={base}>A</span>;
}

export function IconAdmin() {
  return <span style={base}>AD</span>;
}

export function IconDesignMetal() {
  return <span style={base}>DM</span>;
}

export function IconDesignResine() {
  return <span style={base}>DR</span>;
}

export function IconUsinageTitane() {
  return <span style={base}>UT</span>;
}

export function IconUsinageResine() {
  return <span style={base}>UR</span>;
}

export function IconFinition() {
  return <span style={base}>FI</span>;
}

export function IconSector() {
  return <span style={base}>S</span>;
}

export function IconGlobal() {
  return <span style={base}>VG</span>;
}
