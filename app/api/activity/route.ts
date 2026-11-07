import { NextRequest, NextResponse } from "next/server";
import { getActivities } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  return NextResponse.json({ ok: true, activities: await getActivities(Number.isFinite(limit) ? limit : 20) });
}
