import { signOut as authSignOut } from "@/app/lib/modules/auth";
import { NextResponse } from "next/server";

export async function POST() {
  await authSignOut();
  return NextResponse.json({ ok: true });
}
