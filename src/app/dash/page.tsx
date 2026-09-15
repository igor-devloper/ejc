"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { money } from "../../lib/shop";
import type { Item } from "../../lib/shop";

type Order = {
  id: string;
  email: string;
  customer: string;
  phone: string;
  items: Item[];
  total: number;
  method: "pix" | "card";
  status: string;
  paymentId: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  creating: "Criando",
  processing: "Processando",
  pending: "Pendente",
  in_process: "Em análise",
  in_mediation: "Em mediação",
  approved: "Aprovado",
  authorized: "Autorizado",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
  refunded: "Estornado",
  charged_back: "Chargeback",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  approved: "default",
  authorized: "default",
  pending: "secondary",
  processing: "secondary",
  creating: "secondary",
  in_process: "secondary",
  in_mediation: "secondary",
  rejected: "destructive",
  cancelled: "destructive",
  charged_back: "destructive",
  refunded: "outline",
};

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function Dash() {
  const [secret, setSecret] = useState("");
  const [logged, setLogged] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({
    short: "",
    long: "",
    pixRate: "",
    cardRate: "",
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const r = await fetch("/api/orders");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao carregar pedidos.");
      setOrders(data);
    } catch (e) {
      setOrdersError((e as Error).message);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    if (logged) loadOrders();
  }, [logged]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/dash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSecret("");
      const config = await fetch("/api/dash").then((r) => r.json());
      setValues({
        short: String(config.short / 100),
        long: String(config.long / 100),
        pixRate: String(config.pixRate),
        cardRate: String(config.cardRate),
      });
      setLogged(true);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
          k,
          Math.round(Number(v.replace(",", ".")) * 100),
        ]),
      );
      const r = await fetch("/api/dash", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMessage("Preços e taxas salvos. A loja já usa os novos valores.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="dash">
      <Link href="/">← Voltar à loja</Link>
      <p className="eyebrow">ÁREA DO MINISTÉRIO</p>
      <h1>Painel da loja.</h1>
      <p>
        Defina o preço das camisas e as taxas da sua conta Mercado Pago. A taxa
        será acrescentada ao total do comprador.
      </p>
      {!logged ? (
        <form onSubmit={login}>
          <label>
            Senha de acesso
            <input
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar no painel"}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={save}>
            <div className="dash-grid">
              {Object.entries({
                short: "Manga curta (R$)",
                long: "Manga longa (R$)",
                pixRate: "Taxa Pix (%)",
                cardRate: "Taxa cartão à vista (%)",
              }).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    inputMode="decimal"
                    value={values[key as keyof typeof values]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <p>
              Use as taxas efetivas do seu contrato. Total = valor das
              camisas ÷ (1 − taxa), arredondado para cima em centavos.
            </p>
            <button className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                await fetch("/api/dash", { method: "DELETE" });
                setLogged(false);
              }}
            >
              Sair
            </button>
          </form>

          <section className="dash-orders">
            <h2>Pedidos</h2>
            {ordersError && (
              <p role="alert" className="notice">
                {ordersError}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading && (
                  <TableRow>
                    <TableCell colSpan={7}>Carregando pedidos…</TableCell>
                  </TableRow>
                )}
                {!ordersLoading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>Nenhum pedido ainda.</TableCell>
                  </TableRow>
                )}
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="dash-orders-row"
                  >
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.email}</TableCell>
                    <TableCell>{order.items.length}</TableCell>
                    <TableCell>{money(order.total)}</TableCell>
                    <TableCell>
                      {order.method === "pix" ? "Pix" : "Cartão"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="dash-order-dialog">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Pedido de {selectedOrder.customer}</DialogTitle>
                <DialogDescription>
                  {selectedOrder.id} · {formatDate(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="dash-order-details">
                <div>
                  <strong>E-mail:</strong> {selectedOrder.email}
                </div>
                <div>
                  <strong>Telefone:</strong> {selectedOrder.phone}
                </div>
                <div>
                  <strong>Método:</strong>{" "}
                  {selectedOrder.method === "pix" ? "Pix" : "Cartão"}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <Badge
                    variant={STATUS_VARIANT[selectedOrder.status] ?? "secondary"}
                  >
                    {statusLabel(selectedOrder.status)}
                  </Badge>
                </div>
                <div>
                  <strong>Total:</strong> {money(selectedOrder.total)}
                </div>
                {selectedOrder.paymentId && (
                  <div>
                    <strong>ID do pagamento:</strong> {selectedOrder.paymentId}
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Manga</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.number}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.sleeve}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
