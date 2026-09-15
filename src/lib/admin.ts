import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export function validSecret(value: string) {
  const secret = process.env.DASH_SECRET;
  return (
    !!secret &&
    secret.length >= 4 &&
    timingSafeEqual(
      createHash("sha256").update(value).digest(),
      createHash("sha256").update(secret).digest(),
    )
  );
}
export function sessionToken(expires: string) {
  return createHmac("sha256", process.env.DASH_SECRET || "")
    .update(`dash:${expires}`)
    .digest("hex");
}
export async function isAdmin() {
  const token = (await cookies()).get("ejc-admin")?.value || "";
  const [expires, signature] = token.split(".");
  return (
    !!process.env.DASH_SECRET &&
    Number(expires) > Date.now() &&
    /^[a-f0-9]{64}$/.test(signature || "") &&
    timingSafeEqual(
      Buffer.from(sessionToken(expires), "hex"),
      Buffer.from(signature, "hex"),
    )
  );
}
