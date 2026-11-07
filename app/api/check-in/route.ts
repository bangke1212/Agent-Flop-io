import { NextRequest, NextResponse } from "next/server";
import { addActivity, getSettings, reserveNonce } from "@/lib/db";
import { sendSignedSay, sweepText } from "@/lib/technocore";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const ROOM_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/;

type CheckInInput = { room?: unknown; message?: unknown };

async function runCheckIn(input: CheckInInput = {}) {
  const settings = await getSettings();
  const room = typeof input.room === "string" && input.room.trim() ? input.room.trim() : settings.room;
  const message = typeof input.message === "string" && input.message.trim() ? input.message : settings.message;
  if (!ROOM_RE.test(room)) throw new Error("Nama room tidak valid. Gunakan huruf kecil, angka, tanda minus, atau underscore.");
  const cleanedMessage = sweepText(message);
  const nonce = await reserveNonce();
  const result = await sendSignedSay(room, nonce, cleanedMessage);
  await addActivity({ eventType: "Signed check-in", status: "success", summary: `Check-in berhasil dikirim ke #${room}.`, nonce });
  return { ok: true, did: result.did, room, nonce, status: result.remoteStatus, message: "Check-in berhasil diterima Technocore." };
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json().catch(() => ({}))) as CheckInInput;
    return NextResponse.json(await runCheckIn(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check-in gagal diproses.";
    await addActivity({ eventType: "Signed check-in", status: "error", summary: message.slice(0, 400), nonce: null });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent.includes("vercel-cron")) {
    return NextResponse.json({ ok: false, error: "Endpoint ini hanya menerima POST manual atau panggilan Cron." }, { status: 405 });
  }
  const settings = await getSettings();
  if (!settings.enabled) {
    await addActivity({ eventType: "Scheduled check-in", status: "info", summary: "Jadwal aktif di Vercel, tetapi toggle bot masih nonaktif.", nonce: null });
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }
  try {
    return NextResponse.json(await runCheckIn());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check-in terjadwal gagal.";
    await addActivity({ eventType: "Scheduled check-in", status: "error", summary: message.slice(0, 400), nonce: null });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
