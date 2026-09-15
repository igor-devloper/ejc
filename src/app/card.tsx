"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
type MP = {
  bricks(): {
    create(
      type: string,
      container: string,
      settings: unknown,
    ): Promise<{ unmount(): void }>;
  };
};
declare global {
  interface Window {
    MercadoPago: new (key: string, options: unknown) => MP;
  }
}
export default function Card({
  publicKey,
  amount,
  submit,
}: {
  publicKey: string;
  amount: number;
  submit: (form: unknown) => Promise<void>;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const callback = useRef(submit);
  useEffect(() => {
    callback.current = submit;
  }, [submit]);
  useEffect(() => {
    if (!ready) return;
    let controller: { unmount(): void } | undefined;
    let disposed = false;
    new window.MercadoPago(publicKey, { locale: "pt-BR" })
      .bricks()
      .create("cardPayment", "card-payment", {
        initialization: { amount: amount / 100 },
        customization: {
          paymentMethods: { minInstallments: 1, maxInstallments: 1 },
        },
        callbacks: {
          onReady: () => {},
          onError: () => setError("Não foi possível carregar o cartão."),
          onSubmit: (form: unknown) => callback.current(form),
        },
      })
      .then((c) => {
        if (disposed) c.unmount();
        else controller = c;
      })
      .catch(() => setError("Não foi possível carregar o pagamento."));
    return () => {
      disposed = true;
      controller?.unmount();
    };
  }, [ready, amount, publicKey]);
  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onReady={() => setReady(true)}
        onError={() => setError("Não foi possível conectar ao Mercado Pago.")}
      />
      <div id="card-payment" />
      {error && <p role="alert">{error}</p>}
    </>
  );
}
