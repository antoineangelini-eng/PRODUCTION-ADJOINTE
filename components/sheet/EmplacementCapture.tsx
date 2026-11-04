"use client";
import { useState, useRef, useCallback } from "react";

/**
 * EmplacementCapture — capture l'écran PrograMill, détecte le disque vert
 * et les badges bleu/cyan, produit un bitmap 80×80 noir & blanc (base64 PNG).
 */

type EmplacementResult = { png: string; hex: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: EmplacementResult) => void;
};

export function EmplacementCapture({ open, onClose, onSave }: Props) {
  const [preview, setPreview] = useState<EmplacementResult | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const doCapture = useCallback(async () => {
    setCapturing(true);
    setError(null);
    setPreview(null);
    try {
      let imageData: ImageData;
      let imgW: number;
      let imgH: number;

      // ── Essayer le service local d'abord (pas de popup navigateur) ──
      let usedLocalService = false;
      try {
        const resp = await fetch("http://localhost:9098/capture", { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const json = await resp.json();
          if (json.image) {
            // Charger l'image base64 dans un canvas
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = reject;
              i.src = json.image;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            imageData = ctx.getImageData(0, 0, img.width, img.height);
            imgW = img.width;
            imgH = img.height;
            usedLocalService = true;
          }
        }
      } catch {
        // Service local indisponible, on continue avec getDisplayMedia
      }

      // ── Fallback : getDisplayMedia (popup navigateur) ──
      if (!usedLocalService) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" } as any,
        });
        const track = stream.getVideoTracks()[0];
        const imgCapture = new (window as any).ImageCapture(track);
        const bitmap = await imgCapture.grabFrame();
        track.stop();

        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imgW = canvas.width;
        imgH = canvas.height;
      }

      const result = processImage(imageData!, imgW!, imgH!);

      if (!result) {
        setError("Impossible de détecter le disque vert. Assurez-vous que PrograMill est visible.");
        setCapturing(false);
        return;
      }

      setPreview(result);
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setError("Capture annulée.");
      } else {
        setError("Erreur : " + (e?.message ?? "inconnue"));
      }
    }
    setCapturing(false);
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#1a1a1a", border: "1px solid #333", borderRadius: 14,
        padding: 24, width: 360, maxHeight: "80vh", overflow: "auto",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "white" }}>
          Capture d'emplacement
        </h3>

        {!preview && (
          <>
            <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 16px", lineHeight: 1.5 }}>
              Cliquez sur <strong style={{ color: "#4ade80" }}>Capturer</strong> pour détecter
              automatiquement le disque et les éléments sur l'écran PrograMill.
            </p>
            <button
              onClick={doCapture}
              disabled={capturing}
              style={{
                width: "100%", padding: "10px 0",
                background: capturing ? "#333" : "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.4)",
                borderRadius: 8, color: "#4ade80",
                fontSize: 13, fontWeight: 700, cursor: capturing ? "wait" : "pointer",
              }}
            >
              {capturing ? "Capture en cours…" : "📸 Capturer l'écran"}
            </button>
          </>
        )}

        {error && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 6,
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
            fontSize: 12, color: "#f87171",
          }}>
            {error}
          </div>
        )}

        {preview && (
          <>
            <div style={{
              display: "flex", justifyContent: "center", padding: 16,
              background: "#111", borderRadius: 8, marginBottom: 16,
            }}>
              <img
                src={preview.png}
                alt="Aperçu emplacement"
                style={{ width: 160, height: 160, imageRendering: "pixelated" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setPreview(null); setError(null); }}
                style={{
                  flex: 1, padding: "8px 0",
                  background: "#252525", border: "1px solid #444",
                  borderRadius: 8, color: "#ccc", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Recapturer
              </button>
              <button
                onClick={() => { onSave(preview); onClose(); }}
                style={{
                  flex: 1, padding: "8px 0",
                  background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)",
                  borderRadius: 8, color: "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                ✓ Enregistrer
              </button>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 12, width: "100%", padding: "6px 0",
            background: "transparent", border: "none",
            color: "#666", fontSize: 11, cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Image processing : détecter le disque vert + badges bleu/cyan
// ──────────────────────────────────────────────────────────────────────

function processImage(imageData: ImageData, w: number, h: number): EmplacementResult | null {
  const { data } = imageData;

  // 1) Trouver les pixels verts (le disque)
  const greenMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    // Vert PrograMill : forte composante verte, pas trop de rouge/bleu
    if (g > 100 && g > r * 1.3 && g > b * 1.2 && r < 200) {
      greenMask[i] = 1;
    }
  }

  // 2) Trouver le bounding box du plus grand amas vert = le disque
  const disc = findLargestBlob(greenMask, w, h);
  if (!disc) return null;

  const cx = disc.cx;
  const cy = disc.cy;
  const radius = disc.radius;
  if (radius < 50) return null; // trop petit, pas un disque

  // 3) Dans la zone du disque, détecter les éléments foncés (gris foncé)
  //    ET les badges bleu/cyan (marqueurs de position)
  const OUT = 80; // taille du bitmap de sortie
  const outCanvas = document.createElement("canvas");
  outCanvas.width = OUT;
  outCanvas.height = OUT;
  const outCtx = outCanvas.getContext("2d")!;

  // Fond blanc
  outCtx.fillStyle = "white";
  outCtx.fillRect(0, 0, OUT, OUT);

  // Dessiner le cercle du disque (contour noir)
  const margin = 4;
  const outR = (OUT / 2) - margin;
  const outCx = OUT / 2;
  const outCy = OUT / 2;

  outCtx.beginPath();
  outCtx.arc(outCx, outCy, outR, 0, Math.PI * 2);
  outCtx.strokeStyle = "black";
  outCtx.lineWidth = 2;
  outCtx.stroke();

  // 4) Scanner le disque et marquer les éléments du cas
  //    On cherche les pixels bleu/cyan (badges numérotés) ET gris foncé (éléments)
  //    Stratégie : trouver les clusters de pixels bleu/cyan dans le disque
  const cyanPoints: { x: number; y: number }[] = [];

  for (let py = cy - radius; py <= cy + radius; py++) {
    for (let px = cx - radius; px <= cx + radius; px++) {
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy > radius * radius) continue;

      const idx = (py * w + px) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      // Détection badge cyan/bleu : bleu dominant, composante bleue forte
      // Les badges PrograMill sont cyan (R~50-120, G~180-255, B~220-255)
      // ou bleu foncé (cercles numérotés)
      if (b > 150 && b > r * 1.5 && g > 120 && g < 255) {
        cyanPoints.push({ x: px, y: py });
      }
    }
  }

  // 5) Cluster les points cyan pour trouver les centres des badges
  const badgeCenters = clusterPoints(cyanPoints, radius * 0.08);

  // Si on n'a pas trouvé de badges cyan, chercher les éléments gris foncé
  if (badgeCenters.length === 0) {
    // Fallback : détecter les éléments gris foncé (différents du fond vert et du gris clair)
    const darkPoints: { x: number; y: number }[] = [];
    for (let py = cy - radius; py <= cy + radius; py++) {
      for (let px = cx - radius; px <= cx + radius; px++) {
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const dx = px - cx, dy = py - cy;
        if (dx * dx + dy * dy > radius * radius) continue;

        const idx = (py * w + px) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const gray = (r + g + b) / 3;

        // Gris foncé : pas vert, pas trop clair, pas trop sombre (texte)
        if (gray > 60 && gray < 140 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && g < r * 1.3) {
          darkPoints.push({ x: px, y: py });
        }
      }
    }
    const darkCenters = clusterPoints(darkPoints, radius * 0.06);
    drawElements(outCtx, darkCenters, cx, cy, radius, outCx, outCy, outR);
  } else {
    drawElements(outCtx, badgeCenters, cx, cy, radius, outCx, outCy, outR);
  }

  // Générer le hex bitmap monochrome pour ZPL (en plus du PNG pour l'aperçu)
  const outData = outCtx.getImageData(0, 0, OUT, OUT);
  let hexStr = "";
  for (let row = 0; row < OUT; row++) {
    for (let byteIdx = 0; byteIdx < Math.ceil(OUT / 8); byteIdx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const px = byteIdx * 8 + bit;
        if (px < OUT) {
          const idx = (row * OUT + px) * 4;
          // Pixel noir = bit à 1 (imprimé)
          const gray = (outData.data[idx] + outData.data[idx + 1] + outData.data[idx + 2]) / 3;
          if (gray < 128) byte |= (0x80 >> bit);
        }
      }
      hexStr += byte.toString(16).toUpperCase().padStart(2, "0");
    }
  }

  return { png: outCanvas.toDataURL("image/png"), hex: hexStr };
}

function drawElements(
  ctx: CanvasRenderingContext2D,
  centers: { x: number; y: number; size: number }[],
  srcCx: number, srcCy: number, srcR: number,
  outCx: number, outCy: number, outR: number,
) {
  ctx.fillStyle = "black";
  for (const c of centers) {
    // Convertir les coordonnées source en coordonnées de sortie
    const relX = (c.x - srcCx) / srcR;
    const relY = (c.y - srcCy) / srcR;

    // Vérifier que c'est bien dans le disque
    if (relX * relX + relY * relY > 1) continue;

    const ox = outCx + relX * outR;
    const oy = outCy + relY * outR;
    const or = Math.max(3, Math.min(8, (c.size / srcR) * outR * 0.7));

    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, Math.PI * 2);
    ctx.fill();
  }
}

function findLargestBlob(mask: Uint8Array, w: number, h: number) {
  // BFS pour trouver le plus grand amas de pixels verts
  const visited = new Uint8Array(w * h);
  let bestBlob: { pixels: number[]; count: number } | null = null;

  for (let i = 0; i < w * h; i++) {
    if (mask[i] && !visited[i]) {
      const blob: number[] = [];
      const queue = [i];
      visited[i] = 1;
      while (queue.length > 0) {
        const p = queue.pop()!;
        blob.push(p);
        const px = p % w, py = Math.floor(p / w);
        // 4-connectivity, avec pas de 2 pour aller plus vite sur grandes images
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]) {
          const nx = px + dx, ny = py + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
            const ni = ny * w + nx;
            if (mask[ni] && !visited[ni]) {
              visited[ni] = 1;
              queue.push(ni);
            }
          }
        }
      }
      if (!bestBlob || blob.length > bestBlob.count) {
        bestBlob = { pixels: blob, count: blob.length };
      }
    }
  }

  if (!bestBlob || bestBlob.count < 100) return null;

  // Calculer le centre et le rayon
  let sumX = 0, sumY = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (const p of bestBlob.pixels) {
    const px = p % w, py = Math.floor(p / w);
    sumX += px; sumY += py;
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  const cx = sumX / bestBlob.count;
  const cy = sumY / bestBlob.count;
  const radius = Math.max(maxX - minX, maxY - minY) / 2;

  return { cx: Math.round(cx), cy: Math.round(cy), radius: Math.round(radius) };
}

function clusterPoints(points: { x: number; y: number }[], minDist: number) {
  if (points.length === 0) return [];

  // Simple clustering par grille
  const gridSize = Math.max(1, Math.round(minDist));
  const grid = new Map<string, { sx: number; sy: number; count: number }>();

  for (const p of points) {
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);
    const key = `${gx},${gy}`;
    const cell = grid.get(key);
    if (cell) {
      cell.sx += p.x;
      cell.sy += p.y;
      cell.count++;
    } else {
      grid.set(key, { sx: p.x, sy: p.y, count: 1 });
    }
  }

  // Merger les cellules proches et filtrer les trop petits clusters
  const clusters: { x: number; y: number; size: number }[] = [];
  const minCount = Math.max(3, points.length * 0.005); // au moins quelques pixels

  for (const cell of grid.values()) {
    if (cell.count >= minCount) {
      clusters.push({
        x: cell.sx / cell.count,
        y: cell.sy / cell.count,
        size: Math.sqrt(cell.count),
      });
    }
  }

  // Merger les clusters qui sont trop proches
  const merged: typeof clusters = [];
  const used = new Set<number>();
  for (let i = 0; i < clusters.length; i++) {
    if (used.has(i)) continue;
    let sx = clusters[i].x * clusters[i].size;
    let sy = clusters[i].y * clusters[i].size;
    let totalSize = clusters[i].size;
    for (let j = i + 1; j < clusters.length; j++) {
      if (used.has(j)) continue;
      const dx = clusters[i].x - clusters[j].x;
      const dy = clusters[i].y - clusters[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist * 2) {
        sx += clusters[j].x * clusters[j].size;
        sy += clusters[j].y * clusters[j].size;
        totalSize += clusters[j].size;
        used.add(j);
      }
    }
    merged.push({ x: sx / totalSize, y: sy / totalSize, size: totalSize });
    used.add(i);
  }

  return merged;
}
