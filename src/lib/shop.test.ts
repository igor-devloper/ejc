import assert from "node:assert/strict";
import { test } from "node:test";
import {
  quote,
  RESERVED,
  validateItems,
  type Item,
  type ShopConfig,
} from "./shop";
const shirt: Item = { name: "João", number: 7, size: "G", sleeve: "curta" };
const config: ShopConfig = {
  short: 8000,
  long: 10000,
  pixRate: 1,
  cardRate: 5,
  passFee: true,
  publicKey: "",
  configured: true,
};
test("bloqueia todos os números históricos inclusive com nome igual", () => {
  for (const number of RESERVED)
    assert.throws(() => validateItems([{ ...shirt, number }]));
});
test("permite mesmo nome e número nas duas mangas", () => {
  assert.equal(
    validateItems([shirt, { ...shirt, name: " JOÃO ", sleeve: "longa" }])
      .length,
    2,
  );
});
test("impede duplicação em outra pessoa ou na mesma manga", () => {
  assert.throws(() =>
    validateItems([shirt, { ...shirt, name: "Maria", sleeve: "longa" }]),
  );
  assert.throws(() => validateItems([shirt, shirt]));
});
test("rejeita números inválidos, tamanho e nome fora dos limites", () => {
  for (const number of [-1, 100, 1.5, "07", null])
    assert.throws(() => validateItems([{ ...shirt, number }]));
  assert.throws(() => validateItems([{ ...shirt, size: "bad" }]));
  assert.throws(() => validateItems([{ ...shirt, name: "<script>" }]));
});
test("gross-up garante o valor líquido com arredondamento em centavos", () => {
  const result = quote([shirt], "card", config);
  assert.deepEqual(result, { subtotal: 8000, fee: 422, total: 8422 });
  assert.ok(result.total * 0.95 >= 8000);
  assert.ok((result.total - 1) * 0.95 < 8000);
  assert.equal(quote([shirt], "pix", config).total, 8081);
});
test("calcula mangas distintas e rejeita taxa inválida", () => {
  assert.equal(
    quote([shirt, { ...shirt, sleeve: "longa" }], "card", config).subtotal,
    18000,
  );
  assert.throws(() => quote([shirt], "pix", { ...config, pixRate: 100 }));
});
