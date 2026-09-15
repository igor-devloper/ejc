"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Shirt from "./shirt";
import Card from "./card";
import {
  Item,
  money,
  quote,
  RESERVED,
  ShopConfig,
  SIZES,
  validateItems,
} from "../lib/shop";
type Result = { id: string; status: string; qr?: string; qrImage?: string };
const pendingStatuses = [
  "creating",
  "processing",
  "pending",
  "in_process",
  "authorized",
];
export default function Store({ config }: { config: ShopConfig }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [size, setSize] = useState("G");
  const sleeve = "curta" as const;
  const [cart, setCart] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [numbers, setNumbers] = useState(RESERVED);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const submitting = useRef(false);
  const orderId = result?.id;
  const paymentPending = !!result && pendingStatuses.includes(result.status);
  useEffect(() => {
    if (!orderId || !paymentPending) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let again = true;
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(25000),
          ]),
        });
        const data = await response.json();
        if (!response.ok || typeof data.status !== "string")
          throw new Error("Consulta indisponível");
        if (controller.signal.aborted) return;
        again = pendingStatuses.includes(data.status);
        setResult((previous) =>
          previous && previous.id === orderId
            ? {
                id: previous.id,
                status: data.status,
                ...(again
                  ? {
                      qr: data.qr ?? previous.qr,
                      qrImage: data.qrImage ?? previous.qrImage,
                    }
                  : {}),
              }
            : previous,
        );
        setError("");
        if (!again) setNotice("");
        if (data.status === "approved") setCart([]);
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Não foi possível consultar agora. Tentaremos novamente automaticamente.",
          );
      } finally {
        // Schedule after completion so slow requests never overlap.
        if (again && !controller.signal.aborted) timer = setTimeout(poll, 5000);
      }
    }
    timer = setTimeout(poll, 0);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, paymentPending]);
  async function refresh() {
    try {
      const data = await fetch("/api/numbers").then((r) => r.json());
      setNumbers(data.numbers);
      setLive(data.live);
    } catch {
      setLive(false);
    }
  }
  useEffect(() => {
    const hydration = setTimeout(() => {
      try {
        const saved = localStorage.getItem("ejc-cart");
        if (saved) setCart(validateItems(JSON.parse(saved)));
        const order = localStorage.getItem("ejc-order");
        if (order) {
          setResult(JSON.parse(order));
          setPanel(true);
          setCheckout(true);
        }
      } catch {}
      setLoaded(true);
      void refresh();
    }, 0);
    return () => clearTimeout(hydration);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("ejc-cart", JSON.stringify(cart));
  }, [cart, loaded]);
  useEffect(() => {
    if (result) localStorage.setItem("ejc-order", JSON.stringify(result));
  }, [result]);
  useEffect(() => {
    if (!panel) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting.current) setPanel(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", close);
    };
  }, [panel]);
  const totals = quote(cart, method, config);
  const price = config.short;
  const unavailable = number !== "" && numbers.includes(Number(number));
  function add() {
    try {
      if (unavailable)
        throw new Error("Esse número já tem dono. Escolha outro.");
      setCart(
        validateItems([
          ...cart,
          { name, number: number === "" ? -1 : Number(number), size, sleeve },
        ]),
      );
      setNotice("Camisa adicionada ao carrinho!");
      setError("");
      setPanel(true);
      setCheckout(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function pay(formData?: unknown) {
    if (submitting.current || result) return;
    if (!customer.trim() || !email || !phone) {
      setError("Preencha seu nome, e-mail e WhatsApp.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    localStorage.setItem(
      "ejc-order",
      JSON.stringify({ id, status: "processing" }),
    );
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          items: cart,
          method,
          customer,
          email,
          phone,
          formData,
          expectedTotal: totals.total,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        localStorage.removeItem("ejc-order");
        throw new Error(data.error);
      }
      setResult(data);
      if (data.status === "approved") setCart([]);
    } catch (e) {
      if (localStorage.getItem("ejc-order"))
        setResult({ id, status: "processing" });
      setError((e as Error).message);
      await refresh();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="announcement">
        UM SÓ TIME. UM SÓ PROPÓSITO. <span>Conheça a nossa camisa ↗</span>
      </div>
      <header className="header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Image src="/logo-branca.png" alt="" width={68} height={68} />
          </span>
          <span className="brand-name">MINISTÉRIO<br />DO ESPORTE</span>
        </Link>
        <nav>
          <a href="#camisa">A camisa</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <button className="bag" onClick={() => setPanel(true)}>
          Carrinho <span>{cart.length}</span> ↗
        </button>
      </header>
      <main>
        <section className="product" id="camisa">
          <div className="gallery">
            <div className="gallery-top">
              <span className="pill">COLEÇÃO DO MINISTÉRIO</span>
              <span className="edition">EJC / 01</span>
            </div>
            <div className="shirt-stage">
              <div className="stage-type">
                JUNTOS
                <br />
                EM CAMPO.
              </div>
              <div className="shirt-viewer">
                <model-viewer
                  src="/3d.glb"
                  alt="Modelo 3D da camisa do Ministério do Esporte EJC"
                  camera-controls
                  auto-rotate
                  auto-rotate-delay={1200}
                  rotation-per-second="18deg"
                  interaction-prompt="none"
                  shadow-intensity="1"
                  exposure="1.05"
                  loading="eager"
                  reveal="auto"
                />
              </div>
            </div>
            <div className="gallery-bottom">
              <span>Arraste para girar o modelo 3D ↗</span>
              <span>Azul e preto. A nossa identidade.</span>
            </div>
            <p className="illustration">
              Modelo 3D em pré-visualização. A arte final segue o padrão do
              ministério.
            </p>
          </div>
          <div className="product-info">
            <div className="eyebrow blue">● FÉ QUE MOVE. ESPORTE QUE UNE.</div>
            <h1>
              Vista o<br />
              <em>propósito.</em>
            </h1>
            <p className="description">
              Mais que uma camisa, um jeito de fazer parte.
              <br />
              Entre em campo com o Ministério do Esporte EJC.
            </p>
            <div className="price-row">
              <strong>{price ? money(price) : "Em breve"}</strong>
              <span>
                {price
                  ? "+ taxa do meio de pagamento"
                  : "Valores em definição pelo ministério"}
              </span>
            </div>
            <div className="divider" />
            <fieldset>
              <legend>
                <b>01</b> Qual é o seu tamanho?
              </legend>
              <div className="options sizes">
                {SIZES.map((v) => (
                  <button
                    key={v}
                    className={size === v ? "active" : ""}
                    onClick={() => setSize(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>
                <b>02</b> Deixe com a sua cara
              </legend>
              <div className="personalize">
                <label>
                  Nome nas costas
                  <input
                    placeholder="Ex.: GABRIEL"
                    maxLength={18}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <small>{name.length}/18 caracteres</small>
                </label>
                <label>
                  Número
                  <input
                    placeholder="00"
                    inputMode="numeric"
                    maxLength={2}
                    value={number}
                    onChange={(e) =>
                      setNumber(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <small className={unavailable ? "invalid" : ""}>
                    {unavailable ? "Já reservado" : "De 00 a 99"}
                  </small>
                </label>
              </div>
              <details className="reserved">
                <summary>Números indisponíveis ↗</summary>
                <div>
                  {[...numbers]
                    .sort((a, b) => a - b)
                    .map((n) => (
                      <span key={n}>{String(n).padStart(2, "0")}</span>
                    ))}
                </div>
                <p>
                  O mesmo nome pode usar o mesmo número em uma curta e uma longa
                  no mesmo pedido.
                </p>
              </details>
            </fieldset>
            {error && !panel && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary add" onClick={add}>
              Adicionar ao carrinho <span>↗</span>
            </button>
            <div className="product-perks">
              <span>✧ Feita para o nosso time</span>
              <span>⌖ Retirada com o ministério</span>
            </div>
          </div>
        </section>
        <section className="manifesto">
          <span className="cross">✝</span>
          <p>
            O esporte nos reúne.
            <br />
            <strong>O propósito nos faz um time.</strong>
          </p>
          <span className="manifesto-note">
            DENTRO E FORA DE CAMPO.
            <br />
            SEMPRE JUNTOS.
          </span>
        </section>
        <section className="steps" id="como-funciona">
          <div>
            <p className="eyebrow">DO SEU JEITO, SEM COMPLICAÇÃO</p>
            <h2>
              Pronto para vestir
              <br />
              essa missão?
            </h2>
          </div>
          {[
            [
              "Monte sua camisa",
              "Escolha manga e tamanho. Coloque seu nome e um número disponível.",
            ],
            [
              "Confirme seu pedido",
              "Revise o carrinho e pague por Pix ou cartão, aqui mesmo no site.",
            ],
            [
              "Vista o propósito",
              "A retirada será combinada com o ministério pelo seu WhatsApp.",
            ],
          ].map(([title, text], i) => (
            <article key={title}>
              <span>0{i + 1} /</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section className="faq" id="duvidas">
          <h2>Antes de entrar em campo.</h2>
          <div>
            {[
              [
                "Posso escolher qualquer número?",
                "Escolha de 00 a 99, desde que disponível. Os números já utilizados estão bloqueados. A reserva acontece ao iniciar o pagamento.",
              ],
              [
                "Posso pedir manga curta e longa?",
                "Sim! Adicione cada modelo ao carrinho. Para a mesma pessoa, as duas mangas podem levar o mesmo nome e número no mesmo pedido.",
              ],
              [
                "Como funciona a taxa de pagamento?",
                "A taxa é acrescentada ao total conforme o método escolhido. Você vê o valor completo antes de pagar. Cartão disponível à vista.",
              ],
              [
                "Onde retiro a minha camisa?",
                "A retirada é feita com o Ministério do Esporte EJC. A equipe combina os detalhes e o prazo pelo WhatsApp informado no pedido.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <Link className="brand" href="/">
          EJC <small>MINISTÉRIO DO ESPORTE</small>
        </Link>
        <span>Feitos para jogar juntos. Unidos pela fé.</span>
        <Link href="/dash">Área do ministério ↗</Link>
      </footer>
      {panel && (
        <div className="overlay" onClick={() => !busy && setPanel(false)}>
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Seu carrinho"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">SEU TIME COMEÇA AQUI</p>
                <h2>
                  {checkout ? "Finalize seu pedido" : "Seu carrinho"}{" "}
                  <span>({cart.length})</span>
                </h2>
              </div>
              <button
                aria-label="Fechar carrinho"
                disabled={busy}
                onClick={() => setPanel(false)}
              >
                ✕
              </button>
            </div>
            {notice && !checkout && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            {result ? (
              <div className="payment-result" aria-live="polite">
                <span className="result-icon">
                  {result.status === "approved" ? "✓" : "◷"}
                </span>
                <h2>
                  {result.status === "approved"
                    ? "Você faz parte do time!"
                    : ["rejected", "cancelled"].includes(result.status)
                      ? "Pagamento não concluído"
                      : "Aguardando pagamento"}
                </h2>
                <p>
                  {result.status === "approved"
                    ? "Pagamento aprovado. A retirada será combinada pelo ministério."
                    : ["rejected", "cancelled"].includes(result.status)
                      ? "Você pode voltar à loja e tentar novamente."
                      : "Seu número está reservado durante a confirmação. Não refaça a compra enquanto o pagamento é verificado."}
                </p>
                <small>Pedido: {result.id}</small>
                {paymentPending && result.qrImage && (
                  <Image
                    width={220}
                    height={220}
                    unoptimized
                    alt="QR Code Pix"
                    src={`data:image/png;base64,${result.qrImage}`}
                  />
                )}{" "}
                {paymentPending && result.qr && (
                  <>
                    <textarea
                      readOnly
                      aria-label="Código Pix copia e cola"
                      value={result.qr}
                    />
                    <button
                      className="primary"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(result.qr!)
                          .then(() => setNotice("Código copiado."))
                          .catch(() =>
                            setError("Selecione e copie o código acima."),
                          )
                      }
                    >
                      Copiar código Pix
                    </button>
                  </>
                )}
                {notice && <p role="status">{notice}</p>}
                {paymentPending && (
                  <p role="status">Verificando o pagamento automaticamente…</p>
                )}
                {["approved", "rejected", "cancelled"].includes(
                  result.status,
                ) && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setResult(null);
                      localStorage.removeItem("ejc-order");
                      setCheckout(false);
                      setNotice("");
                    }}
                  >
                    Voltar à loja
                  </button>
                )}
              </div>
            ) : (
              <>
                {!cart.length ? (
                  <div className="empty-cart">
                    <span>↗</span>
                    <h3>Falta a sua camisa por aqui.</h3>
                    <p>Personalize a sua e venha fazer parte.</p>
                    <button className="primary" onClick={() => setPanel(false)}>
                      Escolher minha camisa
                    </button>
                  </div>
                ) : (
                  <>
                    {cart.map((item, i) => (
                      <article
                        className="cart-item"
                        key={`${item.number}-${item.sleeve}`}
                      >
                        <div className="cart-shirt">
                          <Shirt
                            back
                            name={item.name}
                            number={String(item.number)}
                            long={item.sleeve === "longa"}
                          />
                        </div>
                        <div>
                          <strong>
                            {item.name} <span>#{item.number}</span>
                          </strong>
                          <p>Tamanho {item.size}</p>
                          <b>
                            {(
                              item.sleeve === "curta"
                                ? config.short
                                : config.long
                            )
                              ? money(
                                  item.sleeve === "curta"
                                    ? config.short
                                    : config.long,
                                )
                              : "Valor a definir"}
                          </b>
                        </div>
                        <button
                          aria-label={`Remover camisa de ${item.name}`}
                          disabled={busy}
                          onClick={() =>
                            setCart(cart.filter((_, index) => index !== i))
                          }
                        >
                          ✕
                        </button>
                      </article>
                    ))}
                    <div className="payment-method">
                      <h3>Como você prefere pagar?</h3>
                      <div className="options">
                        <button
                          disabled={busy}
                          className={method === "pix" ? "active" : ""}
                          onClick={() => setMethod("pix")}
                        >
                          ◇ Pix
                        </button>
                        <button
                          disabled={busy}
                          className={method === "card" ? "active" : ""}
                          onClick={() => setMethod("card")}
                        >
                          ▤ Cartão à vista
                        </button>
                      </div>
                    </div>
                    <div className="totals">
                      <p>
                        <span>Camisas</span>
                        <span>{money(totals.subtotal)}</span>
                      </p>
                      <p>
                        <span>
                          Taxa de pagamento (
                          {method === "pix" ? config.pixRate : config.cardRate}
                          %)
                        </span>
                        <span>{money(totals.fee)}</span>
                      </p>
                      <p>
                        <span>Retirada com o ministério</span>
                        <span>Grátis</span>
                      </p>
                      <p className="grand-total">
                        <strong>Total</strong>
                        <strong>{money(totals.total)}</strong>
                      </p>
                    </div>
                    {checkout ? (
                      <div className="customer">
                        <h3>Seus dados para a retirada</h3>
                        <label>
                          Nome completo
                          <input
                            autoComplete="name"
                            value={customer}
                            onChange={(e) => setCustomer(e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <label>
                          E-mail
                          <input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <label>
                          WhatsApp com DDD
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <p className="muted">
                          Usaremos seus dados para processar o pedido e combinar
                          a retirada.
                        </p>
                        {method === "pix" ? (
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() => void pay()}
                          >
                            {busy ? "Gerando pagamento…" : "Gerar Pix"} ↗
                          </button>
                        ) : (
                          <Card
                            publicKey={config.publicKey}
                            amount={totals.total}
                            submit={pay}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          className="primary"
                          disabled={!config.configured || !live}
                          onClick={() => {
                            setCheckout(true);
                            setError("");
                          }}
                        >
                          Continuar para pagamento ↗
                        </button>
                        {(!config.configured || !live) && (
                          <p className="notice">
                            As vendas ainda não estão abertas. Você já pode
                            montar sua camisa e salvar o carrinho.
                          </p>
                        )}
                      </>
                    )}
                    <p className="secure">
                      ⌑ Pagamento processado pelo Mercado Pago
                    </p>
                  </>
                )}
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
