# Status do projeto de pagamentos

## Objetivo
- Vincular pagamentos a vendas (alocacoes automaticas e parciais).
- Manter dois tempos: data do evento (auditoria) e data informada pelo usuario (data_pagamento/data_transacao).
- Evitar pagamentos orfaos e refletir status correto em Contas a Receber.
- Criar status NAO_INFORMADO no caderno e permitir fluxo PDV configuravel.

## O que foi implementado
- Banco: migration com tabela `pagamento_alocacoes` e coluna `empresa_config.pdv_layout` (aplicada).
- Backend (contas): alocacao automatica, status financeiro (PAGO/PARCIAL/NAO_INFORMADO), estorno com limpeza de alocacoes.
- Backend (contas): exclusao definitiva de pagamentos estornados (com senha).
- Backend (caderno): suporte a `data_transacao` informada e integracao com contas na marcacao de pagamento.
- UI Contas: exibe status financeiro, saldo aberto, pagamentos aplicados e data do pagamento informada.
- UI Contas: botao de reconciliacao para aplicar pagamentos antigos sem alocacao no cliente selecionado.
- UI Contas: modo foco do extrato + busca por texto no extrato.
- UI Caderno: status NAO_INFORMADO no form, selecao de data/hora do pedido, bloqueio de toggle quando parcial.
- Padrao de caixa alta salvo no banco (Caderno, Contas, Clientes, Produtos).
- UI/UX: cards mais compactos e menos sombras (Contas + base do app).
- Documentacao inicial do fluxo e wireflow em `docs/`.

## O que falta / pendencias
- Validar reconciliacao em base real com historico antigo.
- Revisar impacto em relatorios/fechamento de caixa apos a migracao.
- Definir UI/UX para configuracao de layout do PDV (seletor de layout por empresa).
- Simplificar dialogs/telas restantes do Caderno para o modo leve.
- Confirmar caixa alta em telas restantes (configuracoes/usuarios) se necessario.

## Observacao sobre o status NAO_INFORMADO
- Enquanto a tabela `pagamento_alocacoes` nao existir, pagamentos continuam orfaos e o status financeiro nao e calculado.
- Mesmo com a tabela criada, pagamentos antigos precisam de alocacao automatica (backfill) para refletir PAGO/PARCIAL.

