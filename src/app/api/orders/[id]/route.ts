import { db, connectDatabase } from "../../../../prisma/db";
import { mercado, syncPayment } from "../../../../lib/payments";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[\da-f-]{36}$/.test(id))
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  try {
    await connectDatabase();
    const order = await db.orm.public.ShirtOrder.first({ id });
    if (!order)
      return Response.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    let paymentId = order.paymentId;
    if (!paymentId) {
      const search = await mercado(
        `/v1/payments/search?external_reference=${id}`,
      );
      paymentId = search.results?.[0]?.id ? String(search.results[0].id) : null;
    }
    return Response.json(
      paymentId ? await syncPayment(paymentId) : { status: "processing" },
    );
  } catch (error) {
    console.error("[orders/:id] lookup failed:", error);
    return Response.json(
      { error: "Não foi possível consultar. Tente novamente em instantes." },
      { status: 503 },
    );
  }
}
