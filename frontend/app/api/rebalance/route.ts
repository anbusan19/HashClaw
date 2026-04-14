import { NextRequest, NextResponse } from "next/server";
import { runRebalance } from "@/lib/rebalance";

export async function POST(req: NextRequest) {
  const { force = false } = await req.json().catch(() => ({})) as { force?: boolean };
  try {
    const result = await runRebalance(force);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
