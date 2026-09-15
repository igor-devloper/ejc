import type { ShopConfig } from "./shop";
import { db, connectDatabase } from "../prisma/db";
export async function shopConfig(): Promise<ShopConfig> {
  const settings = await connectDatabase()
    .then(() => db.orm.public.ShopSettings.first({ id: "main" }))
    .catch(() => null);
  const short = settings?.short ?? Number(process.env.SHIRT_SHORT_CENTS || 0);
  const long = settings?.long ?? Number(process.env.SHIRT_LONG_CENTS || 0);
  const pixRate = settings
    ? settings.pixRate / 100
    : Number(process.env.MP_PIX_RATE || 0);
  const cardRate = settings
    ? settings.cardRate / 100
    : Number(process.env.MP_CARD_RATE || 0);
  return {
    short,
    long,
    pixRate,
    cardRate,
    passFee: true,
    publicKey: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "",
    configured:
      short > 0 &&
      long > 0 &&
      [short, long].every(Number.isSafeInteger) &&
      [pixRate, cardRate].every(
        (v) => Number.isFinite(v) && v >= 0 && v < 100,
      ) &&
      !!(
        settings ||
        (process.env.MP_PIX_RATE !== undefined &&
          process.env.MP_CARD_RATE !== undefined)
      ) &&
      !!process.env.MP_ACCESS_TOKEN &&
      !!process.env.NEXT_PUBLIC_MP_PUBLIC_KEY &&
      !!process.env.MP_WEBHOOK_SECRET &&
      !!process.env.APP_URL,
  };
}
