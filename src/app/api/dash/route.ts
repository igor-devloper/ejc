import { cookies } from "next/headers";
import { isAdmin, sessionToken, validSecret } from "../../../lib/admin";
import { db, connectDatabase } from "../../../prisma/db";
import { shopConfig } from "../../../lib/config";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response("Forbidden", { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.secret !== "string" || !validSecret(body.secret)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return Response.json(
      {
        error:
          "Senha inválida ou DASH_SECRET não configurado (mínimo 24 caracteres).",
      },
      { status: 401 },
    );
  }
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set("ejc-admin", `${expires}.${sessionToken(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return Response.json({ ok: true });
}
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  return Response.json(await shopConfig());
}
export async function PUT(request: Request) {
  if (
    !(await isAdmin()) ||
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return new Response("Forbidden", { status: 403 });
  try {
    const body = await request.json();
    if (
      ![body.short, body.long].every(
        (v) => Number.isInteger(v) && v > 0 && v <= 1000000,
      ) ||
      ![body.pixRate, body.cardRate].every(
        (v) => Number.isInteger(v) && v >= 0 && v < 10000,
      )
    )
      return Response.json(
        { error: "Preços ou taxas inválidos." },
        { status: 400 },
      );
    await connectDatabase();
    await db.orm.public.ShopSettings.upsert({
      create: {
        id: "main",
        short: body.short,
        long: body.long,
        pixRate: body.pixRate,
        cardRate: body.cardRate,
      },
      update: {
        short: body.short,
        long: body.long,
        pixRate: body.pixRate,
        cardRate: body.cardRate,
      },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível salvar. Verifique a conexão e as migrações do banco.",
      },
      { status: 503 },
    );
  }
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response("Forbidden", { status: 403 });
  (await cookies()).delete("ejc-admin");
  return Response.json({ ok: true });
}
