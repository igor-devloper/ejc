import { db, connectDatabase } from "../prisma/db";
export async function mercado(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[mercado] ${init?.method || "GET"} ${path} -> ${response.status}`,
      body,
    );
    throw new Error(
      "Não foi possível confirmar o pagamento. Consulte novamente antes de tentar outra compra.",
    );
  }
  return response.json();
}
export async function syncPayment(id: string) {
  const payment = await mercado(`/v1/payments/${encodeURIComponent(id)}`);
  await connectDatabase();
  const order = await db.orm.public.ShirtOrder.first({
    id: String(payment.external_reference),
  });
  if (
    !order ||
    Math.round(Number(payment.transaction_amount) * 100) !== order.total ||
    payment.currency_id !== "BRL" ||
    (order.paymentId && order.paymentId !== String(payment.id))
  )
    throw new Error("Pagamento não corresponde ao pedido.");
  await db.transaction(async (tx) => {
    await tx.orm.public.ShirtOrder.where({ id: order.id }).update({
      status: payment.status,
      paymentId: String(payment.id),
    });
    // Only terminal unsuccessful payments release numbers. Never expire a possibly paid order locally.
    if (["rejected", "cancelled"].includes(payment.status))
      await tx.orm.public.ShirtNumber.where({ orderId: order.id }).delete();
  });
  return {
    status: payment.status as string,
    qr: payment.point_of_interaction?.transaction_data?.qr_code as
      string | undefined,
    qrImage: payment.point_of_interaction?.transaction_data?.qr_code_base64 as
      string | undefined,
  };
}
