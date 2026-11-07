import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const CRON_RE = /^(\*|[0-9]+|\*\/[0-9]+) (\*|[0-9]+|\*\/[0-9]+) (\*|[0-9]+|\*\/[0-9]+) (\*|[0-9]+|\*\/[0-9]+) (\*|[0-6])$/;

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const enabled = Boolean(body.enabled);
    const schedule = typeof body.schedule === "string" ? body.schedule.trim() : "*/30 * * * *";
    const room = typeof body.room === "string" ? body.room.trim() : "lobby";
    const message = typeof body.message === "string" ? body.message.trim() : "FLOP agent check-in";
    if (!CRON_RE.test(schedule)) throw new Error("Format jadwal belum didukung. Contoh: */30 * * * *.");
    if (!ROOM_RE.test(room)) throw new Error("Nama room tidak valid.");
    if (!message || message.length > 4096) throw new Error("Pesan harus diisi dan maksimal 4096 karakter.");
    const settings = await updateSettings({ enabled, schedule, room, message });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Pengaturan gagal disimpan." }, { status: 400 });
  }
}
