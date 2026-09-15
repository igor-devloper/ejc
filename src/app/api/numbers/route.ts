import { RESERVED } from "../../../lib/shop";
import { db, connectDatabase } from "../../../prisma/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await connectDatabase();
    const rows = await db.orm.public.ShirtNumber.select("number").all();
    return Response.json({
      numbers: [...new Set([...RESERVED, ...rows.map((r) => r.number)])],
      live: true,
    });
  } catch {
    return Response.json({ numbers: RESERVED, live: false });
  }
}
