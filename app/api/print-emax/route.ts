import { NextRequest, NextResponse } from "next/server";
import * as net from "net";

export const runtime = "nodejs";

const PRINTER_IP   = "192.168.1.12";
const PRINTER_PORT = 9100;

export async function POST(req: NextRequest) {
  const { zpl } = await req.json();

  return new Promise<NextResponse>((resolve) => {
    const client  = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      resolve(NextResponse.json({ ok: false, error: "Timeout imprimante" }, { status: 500 }));
    }, 5000);

    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      client.write(zpl, "utf8", () => {
        clearTimeout(timeout);
        client.end();
        resolve(NextResponse.json({ ok: true }));
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      resolve(NextResponse.json({ ok: false, error: err.message }, { status: 500 }));
    });
  });
}