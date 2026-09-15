import { createHmac, timingSafeEqual } from "node:crypto";
import { syncPayment } from "../../../../lib/payments";
export async function POST(request: Request) {
  const id = new URL(request.url).searchParams.get("data.id");
  const requestId = request.headers.get("x-request-id");
  const parts = Object.fromEntries(
    (request.headers.get("x-signature") || "")
      .split(",")
      .map((p) => p.trim().split("=")),
  );
  if (
    !id ||
    !/^\d+$/.test(id) ||
    !requestId ||
    !parts.ts ||
    !/^[a-f0-9]{64}$/i.test(parts.v1 || "") ||
    !process.env.MP_WEBHOOK_SECRET
  )
    return new Response("Invalid signature", { status: 401 });
  const expected = createHmac("sha256", process.env.MP_WEBHOOK_SECRET)
    .update(`id:${id};request-id:${requestId};ts:${parts.ts};`)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(parts.v1, "hex")))
    return new Response("Invalid signature", { status: 401 });
  try {
    await syncPayment(id);
    return Response.json({ received: true });
  } catch {
    return new Response("Retry later", { status: 503 });
  }
}
