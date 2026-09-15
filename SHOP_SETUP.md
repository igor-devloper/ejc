# Loja EJC

## Iniciar

1. Copie `.env.example` para `.env` e configure `DATABASE_URL` (PostgreSQL 15+).
2. Configure `DASH_SECRET` com uma senha aleatória de pelo menos 24 caracteres. Ela só é usada no servidor; não coloque a senha na URL nem em uma variável `NEXT_PUBLIC`.
3. Execute `npm run migrate` para aplicar as migrações existentes e as tabelas da loja.
4. Execute `npm run dev` e acesse `http://localhost:3000`.
5. Acesse `/dash`, entre com a senha e configure preços e taxas. Preços são informados em reais, taxas em porcentagem. A sessão dura 8 horas.

## Mercado Pago

- Configure `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` da mesma aplicação.
- Configure `APP_URL` com a URL pública HTTPS da loja (sem barra final).
- Na aplicação Mercado Pago, habilite notificações de pagamento para `https://seu-dominio/api/webhooks/mercadopago`.
- Configure as taxas reais da conta no painel; elas variam conforme o contrato, método e prazo de recebimento. Não há uma taxa fixa presumida no código.
- Faça a homologação com contas e credenciais de teste antes de abrir vendas: cartão aprovado/rejeitado, Pix, webhook, atualização de status e disputa simultânea pelo mesmo número.
- Cartão à vista pelo Card Payment Brick e Pix por QR Code/copia e cola, sem sair da loja. Os dados do cartão são tokenizados pelo SDK, não armazenados no banco.

Referências oficiais: [Card Payment Brick](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/card-payment-brick/payment-submission), [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks), [Taxas](https://www.mercadopago.com.br/blog/quanto-custa-vender-on-line-com-mercado-pago).

## Regras

- Números 0 a 99. Bloqueados: 5, 8, 9, 10, 11, 17, 90 e 93.
- Curta e longa podem compartilhar nome e número no mesmo pedido. Outra pessoa ou a mesma manga não podem repetir o número. Pedidos separados não reutilizam números, pois não há autenticação do comprador para comprovar titularidade.
- Os números são reservados em transação com chave primária única antes de chamar o Mercado Pago. Adicionar ao carrinho não reserva.
- Pedidos contêm nome do comprador, e-mail, WhatsApp, personalizações e valores em centavos. O endpoint público de consulta retorna apenas status e instruções de pagamento, mediante UUID do pedido.
- Taxa repassada: `ceil(subtotal / (1 - taxa))`, em centavos. O servidor calcula novamente e recusa total desatualizado.
- O carrinho e a referência do último pedido ficam no navegador. O comprador pode consultar a confirmação na própria tela.
- Pagamento rejeitado/cancelado libera o número. Pagamentos pendentes, aprovados ou de resultado incerto mantêm a reserva. Em caso de timeout, a consulta busca o pagamento por referência externa. Nunca libere manualmente um número sem reconciliar a cobrança no Mercado Pago.
- Não há rotina automática de recuperação de pedidos abandonados antes da criação do pagamento. Se a chamada não chegar ao provedor, a reserva precisa de revisão operacional. Isso evita reutilizar um número cujo pagamento possa ser aprovado depois.
- Retirada com o ministério, sem frete.
- A imagem da camisa é uma ilustração SVG interativa baseada na referência, não a foto original nem uma prova de produção. Os tamanhos disponíveis são P, M, G, GG e XGG; confirme a grade com o fornecedor.

## Verificação

`npm test`, `npm run lint`, `npm run build`.

Sem banco e credenciais, a página abre e o carrinho funciona, mas o checkout permanece fechado. As migrações são preparadas no repositório; não são aplicadas automaticamente pela aplicação.

Antes de publicar, defina prazo e local de retirada, confirme a grade e a arte com o fornecedor e teste o pagamento ponta a ponta. Para exposição pública, configure limites de requisição no proxy/hosting para login, checkout e consultas ao provedor.
