import { isAdmin } from "../../../lib/admin";
import { db, connectDatabase } from "../../../prisma/db";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  try {
    await connectDatabase();
    const orders = await db.orm.public.ShirtOrder.all();
    return Response.json(
      orders
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((order) => ({
          id: order.id,
          email: order.email,
          customer: order.customer,
          phone: order.phone,
          items: JSON.parse(order.items),
          total: order.total,
          method: order.method,
          status: order.status,
          paymentId: order.paymentId,
          createdAt: order.createdAt,
        })),
    );
  } catch (error) {
    console.error("[orders] list failed:", error);
    return Response.json(
      { error: "Não foi possível carregar os pedidos." },
      { status: 503 },
    );
  }
}
