import { NextResponse } from "next/server";
import { getActivities, getSettings } from "@/lib/db";
import { checkTechnocore, getIdentity } from "@/lib/technocore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, activities, technocore] = await Promise.all([
    getSettings(),
    getActivities(8),
    checkTechnocore(),
  ]);
  const identity = getIdentity();
  return NextResponse.json({
    configured: Boolean(identity),
    did: identity?.did ?? null,
    technocore,
    settings: {
      enabled: settings.enabled,
      schedule: settings.schedule,
      room: settings.room,
      message: settings.message,
      lastNonce: settings.lastNonce || null,
      updatedAt: settings.updatedAt,
    },
    activities,
    warning: "DID adalah identitas agen, bukan alamat wallet. Check-in tidak menjamin airdrop.",
  });
}
