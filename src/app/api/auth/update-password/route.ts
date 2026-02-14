import { getSession, updatePassword } from "@/app/lib/modules/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z
  .object({
    password: z.string().min(6, "PIN must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "PINs do not match",
    path: ["confirm"],
  });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const msg =
      parsed.error.errors.find((e) => e.path.includes("confirm"))?.message ??
      parsed.error.errors[0]?.message ??
      "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { password } = parsed.data;
  const result = await updatePassword(password);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Update failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
