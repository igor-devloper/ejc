export const RESERVED = [5, 8, 9, 10, 11, 17, 90, 93];
export const SIZES = ["P", "M", "G", "GG", "XGG"] as const;
export type Item = {
  name: string;
  number: number;
  size: string;
  sleeve: "curta" | "longa";
};
export type ShopConfig = {
  short: number;
  long: number;
  pixRate: number;
  cardRate: number;
  passFee: boolean;
  configured: boolean;
  publicKey: string;
};
export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function validateItems(value: unknown): Item[] {
  if (!Array.isArray(value) || !value.length || value.length > 10)
    throw new Error("Adicione de 1 a 10 camisas.");
  const numbers = new Map<number, { name: string; sleeves: string[] }>();
  return value.map((item) => {
    if (
      !item ||
      typeof item.name !== "string" ||
      !/^[\p{L} .'-]{2,18}$/u.test(item.name.trim())
    )
      throw new Error("O nome da camisa deve ter de 2 a 18 letras.");
    const previous = numbers.get(item.number);
    if (
      !Number.isInteger(item.number) ||
      item.number < 0 ||
      item.number > 99 ||
      RESERVED.includes(item.number) ||
      (previous &&
        (previous.name !== item.name.trim().toUpperCase() ||
          previous.sleeves.includes(item.sleeve)))
    )
      throw new Error(
        "Número indisponível. Só é permitido repetir para o mesmo nome em mangas diferentes.",
      );
    if (
      !(SIZES as readonly string[]).includes(item.size) ||
      !["curta", "longa"].includes(item.sleeve)
    )
      throw new Error("Confira o tamanho e a manga.");
    numbers.set(item.number, {
      name: item.name.trim().toUpperCase(),
      sleeves: [...(previous?.sleeves || []), item.sleeve],
    });
    return {
      name: item.name.trim().toUpperCase(),
      number: item.number,
      size: item.size,
      sleeve: item.sleeve,
    };
  });
}
export function quote(
  items: Item[],
  method: "pix" | "card",
  config: ShopConfig,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.sleeve === "curta" ? config.short : config.long),
    0,
  );
  const rate = method === "pix" ? config.pixRate : config.cardRate;
  if (
    !Number.isSafeInteger(subtotal) ||
    subtotal < 0 ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate >= 100
  )
    throw new Error("Configuração de preço inválida.");
  const total = config.passFee
    ? Math.ceil((subtotal * 10000) / Math.round(10000 - rate * 100))
    : subtotal;
  return { subtotal, fee: total - subtotal, total };
}
