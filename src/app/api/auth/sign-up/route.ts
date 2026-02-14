import { signUp as authSignUp } from "@/app/lib/modules/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "PIN must be at least 6 characters"),
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
  const result = await authSignUp(email, password);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Sign up failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
