import { signIn as authSignIn } from "@/app/lib/modules/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;
  const result = await authSignIn(email, password);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Sign in failed" },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}
