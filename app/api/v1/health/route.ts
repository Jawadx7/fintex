import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated liveness/warm-up probe. Runs one trivial query so a caller
 * can wake the compute and prime the connection pool before scoring.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "scoring" });
  } catch {
    return NextResponse.json(
      { ok: false, service: "scoring" },
      { status: 503 }
    );
  }
}
