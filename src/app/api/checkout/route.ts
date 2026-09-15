import { shopConfig } from "../../../lib/config";
import { quote, validateItems } from "../../../lib/shop";
import { db, connectDatabase } from "../../../prisma/db";
import { mercado, syncPayment } from "../../../lib/payments";
export async function POST(request: Request) {
  const config = await shopConfig();
  if (!config.configured)
    return Response.json(
      {
        error:
          "As vendas ainda não foram abertas. Aguarde a confirmação dos valores.",
      },
      { status: 503 },
    );
  let body;
  let items;
  try {
    body = await request.json();
    items = validateItems(body.items);
    if (
      !["pix", "card"].includes(body.method) ||
      typeof body.customer !== "string" ||
      body.customer.trim().length < 3 ||
      body.customer.length > 100 ||
      typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
      body.email.length > 200 ||
      typeof body.phone !== "string" ||
      !/^\d{10,11}$/.test(body.phone.replace(/\D/g, ""))
    )
      throw new Error("Confira seu nome, e-mail e telefone.");
    if (
      body.method === "card" &&
      (!body.formData?.token ||
        !body.formData?.payment_method_id ||
        Number(body.formData.installments) !== 1)
    )
      throw new Error("Preencha o cartão para pagamento à vista.");
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Dados inválidos." },
      { status: 400 },
    );
  }
  const id = body.id;
  if (
    typeof id !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(id)
  )
    return Response.json(
      { error: "Identificador de pedido inválido." },
      { status: 400 },
    );
  const total = quote(items, body.method, config).total;
  if (body.expectedTotal !== total)
    return Response.json(
      {
        error:
          "Os preços foram atualizados. Recarregue a página para revisar o total antes de pagar.",
      },
      { status: 409 },
    );
  try {
    await connectDatabase();
    const existing = await db.orm.public.ShirtOrder.first({ id });
    if (existing) return Response.json({ id, status: existing.status });
    await db.transaction(async (tx) => {
      await tx.orm.public.ShirtOrder.create({
        id,
        email: body.email,
        customer: body.customer.trim(),
        phone: body.phone,
        items: JSON.stringify(items),
        total,
        method: body.method,
        status: "creating",
      });
      for (const number of new Set(items.map((item) => item.number)))
        await tx.orm.public.ShirtNumber.create({ number, orderId: id });
    });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível reservar. Atualize os números disponíveis e tente novamente.",
      },
      { status: 409 },
    );
  }
  // Stable idempotency key prevents duplicate charges when reconciling an uncertain request.
  try {
    const form = body.formData || {};
    const payment = await mercado("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": id },
      body: JSON.stringify({
        transaction_amount: total / 100,
        description: "Camisa Ministério do Esporte EJC",
        external_reference: id,
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
        payment_method_id:
          body.method === "pix" ? "pix" : form.payment_method_id,
        ...(body.method === "card"
          ? { token: form.token, issuer_id: form.issuer_id, installments: 1 }
          : {
              date_of_expiration: new Date(
                Date.now() + 30 * 60000,
              ).toISOString(),
            }),
        payer: {
          email: body.email,
          ...(form.payer?.identification
            ? { identification: form.payer.identification }
            : {}),
        },
      }),
    });
    const result = await syncPayment(String(payment.id));
    return Response.json({ id, ...result });
  } catch (error) {
    console.error("[checkout] payment step failed:", error);
    return Response.json(
      {
        id,
        status: "processing",
        message:
          "Estamos verificando o pagamento. Guarde este pedido e não refaça a compra.",
      },
      { status: 202 },
    );
  }
}
