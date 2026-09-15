import Store from "./store";
import { shopConfig } from "../lib/config";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Store config={await shopConfig()} />;
}
