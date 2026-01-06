# Wireflow - Caderno + Contas a Receber

Este documento descreve o fluxo de telas e a logica de operacao para:
1) Caderno (registro e status de pedidos/vendas)
2) Contas a Receber (pagamentos e reconciliacao)

Objetivo: cobrir os novos estados de pagamento, pagamento parcial,
edicao de data/hora do fato, e integracao entre telas.

## Caderno (Pedidos)

### 1. Novo pedido (formulario)
Estado inicial:
- Status de pagamento = NAO_INFORMADO (default).
- Data/hora do fato = agora (editavel).

Campos relevantes:
- Cliente / Avulso
- Itens (produtos)
- Status pagamento: [Nao informado | Pago | Nao pago]
- Forma pagamento (opcional)
- Data/hora do pedido (editavel)

Acoes:
- Salvar pedido -> cria transacao com data_transacao = data/hora do fato.
- Se status = Pago, cria pagamento e aloca 100% ao pedido.
- Se status = Nao pago ou Nao informado, nao cria pagamento.

### 2. Lista de pedidos (cards)
Cada pedido exibe:
- Status financeiro: Nao informado | Nao pago | Parcial | Pago | Cancelado
- Status de preparo: Pendente | Pronto
- Valor total e data/hora do fato

Acoes no card:
- Alterar status pagamento -> abre seletor com 3 estados.
- Alterar forma de pagamento (se aplicavel).
- Abrir detalhes do pedido.

Regras:
- Se o pedido tem pagamento parcial (alocacao existente),
  bloquear o toggle direto (exigir ajuste via Contas).
- Se o pedido esta Pago e o usuario mudar para Nao pago,
  criar estorno do pagamento associado (ou bloquear e orientar).

## Contas a Receber

### 1. Lista de clientes
Mostrar:
- Saldo confirmado (pendente - pagamentos alocados)
- Indicador "Nao informado" (vendas sem status definido)
- Indicador "Credito" (pagamento nao alocado > saldo)

Filtros:
- Todos
- Devendo (saldo confirmado > 0)
- Quitado (saldo confirmado = 0)
- Credito (saldo confirmado < 0)
- Nao informado (tem vendas NAO_INFORMADO)

### 2. Extrato do cliente
Cada linha:
- VENDA: valor total, status financeiro, saldo pendente
- PAGAMENTO: valor, data/hora do fato, alocacoes

Status de venda exibido:
- Pago: saldo pendente = 0
- Parcial: saldo pendente > 0 e ha alocacao
- Nao pago: saldo pendente = total e status = PENDENTE
- Nao informado: saldo pendente = total e status = NAO_INFORMADO

### 3. Registrar pagamento
Campos:
- Valor
- Forma (opcional)
- Data/hora do pagamento (editavel)
- Observacao

Modo de aplicacao:
- Automatico (default): aloca do mais antigo ao mais recente (FIFO).
- Manual (opcional): selecionar vendas e valores (apenas se ativado).

Resultado:
- Gera `pagamentos`.
- Gera `pagamento_alocacoes`.
- Atualiza status financeiro das vendas (Parcial/Pago).

### 4. Estorno
Quando estornar:
- Manter registro do pagamento (estornado = true).
- Desfazer alocacoes vinculadas ao pagamento.
- Atualizar status das vendas afetadas.

## Datas (duas referencias)

- created_at: horario real de cadastro (auditoria, nao editavel).
- data_transacao / data_pagamento: horario do fato (editavel).

Regras:
- Por default, data do fato = agora.
- Usuario pode alterar para refletir o horario real do ocorrido.

## Regras de alocacao (FIFO)

Pseudo-logica:
1) Ordenar vendas abertas por data_transacao asc.
2) Para cada venda:
   - aplicar valor ate zerar ou acabar o pagamento.
3) Se sobrar valor, vira credito (pagamento sem alocacao).

## Regras de bloqueio

- Toggle no Caderno bloqueado se a venda tem alocacao.
- Mudanca de Pago <-> Nao pago deve manter historico:
  - preferir criar/estornar pagamento, nao alterar status direto.

## Notas de layout (PDV)

- O layout do Caderno pode variar por configuracao da empresa:
  - RESTAURANTE: dois paineis (lista + formulario).
  - LOJA: foco no formulario e lista em aba ou painel reduzido.
