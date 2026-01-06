# Fluxo atual e direcao de reforma (pagamentos, caderno, contas a receber)

Objetivo: registrar como o fluxo funciona hoje, onde estao os ruidos e
qual direcao de melhoria atende os pontos levantados (pagamentos orfaos,
duas datas, novo status de pagamento, integracao entre Caderno e Contas).

## Escopo analisado

- Caderno: `src/pages/CadernoPage.vue`, `src/components/caderno/NovoPedidoForm.vue`,
  `src/composables/useCaderno.js`, `src/services/cadernoService.js`.
- Contas a receber: `src/pages/ContasPage.vue`, `src/composables/useContasReceber.js`,
  `src/services/contasService.js`, `src/components/contas/RegistrarPagamentoDialog.vue`.
- Caixa: `src/services/caixaService.js` (impacto indireto em formas de pagamento).
- Schema: `supabase/schema.sql`.

## Como funciona hoje (fluxo atual)

### Caderno (vendas / pedidos)

- Cada pedido vira uma linha em `transacoes`, com itens em `itens_transacao`.
- O status de pagamento e forma ficam em `transacoes.status_pagamento` e
  `transacoes.forma_pagamento`.
- No cadastro, o formulario permite marcar "Pago" e escolher forma; se
  "nao pago", a forma fica vazia.
- Cliente avulso e sempre tratado como pago e nao pode alternar o status.
- Alterar status para pago/nao pago nao cria pagamento; apenas muda
  a linha da venda.
- Existe um processo (`syncPagamentoCliente`) que remove pagamentos
  vinculados a uma venda quando a venda e marcada como paga/cancelada.
- `data_transacao` e preenchida com o horario atual quando nao ha valor
  fornecido.

### Contas a receber (saldo e extrato)

- O saldo por cliente e calculado como:
  soma de vendas nao pagas (transacoes PENDENTE) menos soma de pagamentos
  registrados (tabela `pagamentos`).
- Registrar pagamento cria uma linha em `pagamentos` com
  `cliente_id`, `valor`, `forma_pagamento` e `observacao`.
- O pagamento nao e ligado a uma venda (origem_transacao_id fica nulo).
- O extrato do cliente exibe "VENDA" e "PAGAMENTO", mas a venda nao e
  quitada automaticamente quando entra pagamento.
- Existe logica para ignorar pagamentos ligados a vendas ja pagas/canceladas,
  evitando dupla contagem.

### Caixa (fechamento e formas)

- A forma de pagamento e opcional no cadastro e pagamento.
- No fechamento do caixa, se houver pagamentos/ventas sem forma, e exibida
  pendencia.
- O caixa nao e obrigatorio; pode operar sem abertura/fechamento.

## Problemas mapeados

- Pagamentos orfaos: pagamentos nao se ligam a vendas, entao o saldo zera
  mas pedidos antigos continuam "nao pagos".
- Auditoria fraca em pagamentos: `pagamentos` nao tem `created_at`/`created_by`
  no schema atual; se a coluna `estornado` nao existe, o estorno apaga o
  registro (perde historico).
- Datas inconsistentes: pagamentos podem ficar sem `data_pagamento`.
  Em vendas, `data_transacao` e sempre "agora", nao permite ajuste.
- Status de pagamento binario (PAGO/PENDENTE) gera confusao operacional:
  falta um estado "nao informado" para obrigar revisao.
- Caderno e Contas nao se completam: um ajuste no Caderno nao reflete em
  Contas (pagamento) e vice-versa.

## Requisitos de reforma (alinhados com o uso real)

1) Duas datas por evento:
   - "momento real" (auditoria): quando o usuario registrou a acao.
   - "momento do fato": quando a venda/pagamento ocorreu de verdade.
   O segundo deve ser editavel; o primeiro deve ser automatico.

2) Novo estado de pagamento:
   - `NAO_INFORMADO` (ou equivalente) para novas vendas.
   - Evita confundir pendente vs pago; exige decisao explicita.
   - Cliente avulso pode seguir como "PAGO" por regra, ou entrar como
     "NAO_INFORMADO" se voce quiser forcar conferencia.

3) Pagamentos devem baixar vendas:
   - Pagamento registrado deve ser aplicado a vendas abertas do cliente.
   - A aplicacao deve ser rastreavel (auditoria e historico).
   - Deve suportar baixa parcial quando o pagamento nao cobre 100% da venda.

4) Manter opcionalidade de forma:
   - Forma pode continuar opcional, mas gerar alertas/pendencias no caixa.

5) Reformar Caderno e Contas juntos:
   - Fluxos devem se completar; uma tela nao pode quebrar a outra.

## Proposta de reforma (direcao tecnica)

### Modelo de dados (sugestao)

- Vendas (`transacoes`):
  - Manter `data_transacao` como "momento do fato" (editavel).
  - Garantir `created_at` e `created_by` para auditoria (trigger).
  - Adicionar status `NAO_INFORMADO`.
  - Considerar status `PARCIAL` (ou calcular isso dinamicamente).

- Pagamentos (`pagamentos`):
  - Garantir `data_pagamento` (momento do fato, editavel).
  - Adicionar `created_at`, `created_by`, `updated_at`.
  - Manter `estornado`, `data_estorno`, `observacao_estorno`.

- Aplicacao de pagamentos (novo):
  - Criar `pagamento_alocacoes` com:
    `pagamento_id`, `transacao_id`, `valor_aplicado`, `created_at`.
  - Permite baixa parcial, varios pagamentos por venda e vice-versa.

### Regras de negocio (direcao)

- Ao registrar pagamento:
  - Se o usuario nao escolher uma venda, aplicar automaticamente
    por ordem (FIFO) nas vendas abertas do cliente.
  - Se exceder o saldo, registrar credito do cliente (saldo negativo).
- Ao aplicar pagamento parcial:
  - A venda deve mostrar "saldo pendente" e/ou status "PARCIAL".
  - O toggle de pago/nao pago deve ser bloqueado quando ha alocacoes.
- Ao marcar venda como paga:
  - Criar (ou atualizar) um pagamento e sua alocacao correspondente,
    preservando historico.
- Ao estornar:
  - Manter registro e marcar estornado, sem apagar dados.

### UI e fluxos (impacto)

- Caderno:
  - Novo estado "Nao informado" no card e nos filtros.
  - Campo de data/hora do pedido (editavel) com default "agora".
  - Visual para pendencia de status e forma.
  - Simplificar animacoes para maquinas lentas.

- Contas a receber:
  - Ao registrar pagamento, mostrar opcao:
    "Aplicar automaticamente" ou "Escolher vendas".
  - Mostrar pagamentos aplicados e saldo residual por venda.
  - Permitir editar data/hora do pagamento.

- Caixa:
  - Manter opcionalidade de forma, mas destacar pendencias.
  - Relatorio deve considerar pagamentos aplicados e vendas pagas.

### Variantes de PDV (multi-layout)

- Modo Restaurante (atual):
  - Dois paineis (lista de pedidos + formulario).
  - Status de preparo e lista de pendentes/prontos.
- Modo Loja/PDV simples:
  - Foco em cadastro rapido e recibo imediato.
  - Lista de pedidos do dia em aba/coluna menor ou opcional.
- Sugestao: parametrizar layout via configuracao do sistema.
  - Exemplo: `config.pdv_layout = RESTAURANTE | LOJA`.

## Pontos para confirmar antes de implementar

- Regra de alocacao automatica (FIFO, LIFO, ou manual).
- Como tratar credito do cliente (saldo negativo).
- Nome final dos status (PAGO, PENDENTE, NAO_INFORMADO, CANCELADA).
- Quais campos sao obrigatorios para auditoria (created_by, updated_by).
- Experiencia de edicao de data/hora (permissao e nivel de acesso).
 - Como lidar com parcial: novo status ou calculo dinamico por saldo.

## Observacoes finais

Hoje o fluxo funciona com base em saldo, mas nao baixa vendas.
O foco da reforma e unificar Caderno e Contas para que pagamento
tenha efeito real nas transacoes, com auditoria e datas editaveis.

## Comentarios adicionais (alinhados com o uso real)

1) Alocacao automatica recomendada:
   - FIFO (mais antigo -> mais recente) cobre o caso comum de "abater a conta".
   - Manter a opcao atual de marcar uma venda especifica como paga
     continua atendendo quem quer quitar um pedido pontual.

2) Pagamento parcial e controle:
   - Se um pagamento cobre 80% de uma venda, a venda fica com saldo pendente.
   - O status pode ser exibido como "PARCIAL" (ou calculado em tempo real).
   - Quando existe alocacao parcial, nao permitir toggle "pago/nao pago"
     direto no Caderno; exigir estorno/ajuste para manter historico correto.

3) Duas datas por evento:
   - `created_at`: horario real da acao (auditoria, nao editavel).
   - `data_transacao` / `data_pagamento`: horario do fato (editavel).

4) Layouts do PDV:
   - A escolha pode ser uma configuracao do sistema (por empresa).
   - Isso evita duplicar paginas; o mesmo Caderno muda layout por config.
