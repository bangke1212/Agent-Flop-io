import { NextResponse } from "next/server";
import { fetchLobby } from "@/lib/technocore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await fetchLobby();
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lobby tidak dapat dimuat." }, { status: 502 });
  }
}
