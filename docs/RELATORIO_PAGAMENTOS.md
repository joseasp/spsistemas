# Relatorio do fluxo de pagamentos (versao simples)

## Em 1 minuto (para leigo)
- Antes: pagamentos eram registrados, mas nao ligados aos pedidos. Isso confundia, porque o pedido continuava aparecendo como nao pago.
- Agora: cada pagamento pode ser aplicado automaticamente aos pedidos mais antigos do cliente. Assim o status da venda muda para Pago/Parcial.
- A conciliacao (botao "Reconciliar") serve para corrigir pagamentos antigos ou casos raros onde um pagamento ficou sem alocacao.

## O que foi feito (resumo)
- Criada a tabela `pagamento_alocacoes` no banco (migration aplicada por voce).
- Implementado no backend o motor de alocacao: pagamentos aplicam em vendas do cliente do mais antigo ao mais novo.
- Implementado status financeiro: PAGO, PARCIAL, PENDENTE e NAO_INFORMADO.
- Ajustada a tela de Contas para mostrar o status financeiro real e o saldo aberto.
- Adicionada data/hora manual para pagamento e venda (usuario pode corrigir quando o registro nao foi feito na hora).
- Adicionado botao "Reconciliar" na tela de Contas para corrigir pagamentos antigos sem alocacao.
- Detalhes exibem origem do pagamento (vendas e pagamentos vinculados).
- Excluir definitivo de pagamentos estornados (com senha).
- Toggle de pagamento no Caderno virou 3 estados e gera pagamento direto vinculado a venda.
- Se a venda for corrigida em ate 24 horas, o pagamento direto e excluido (sem auditoria).
- Apos 24 horas, o pagamento direto e estornado para manter historico.
- Pagamentos diretos da venda ficam ocultos no extrato para evitar poluicao visual.
- UI simplificada com busca no extrato e modo foco.

## O que o botao "Reconciliar" faz
- Ele procura pagamentos antigos do cliente que ainda nao estao alocados.
- Aplica automaticamente esses pagamentos nas vendas mais antigas.
- Serve principalmente para o legado (pagamentos feitos antes desta mudanca).
- Tambem serve para casos raros: por exemplo, se um pagamento foi importado ou inserido por fora e nao passou pela alocacao automatica.

## O que significa "backfill"
- Backfill = preencher o passado.
- No contexto daqui: pegar pagamentos antigos (que ficaram orfaos) e aplicar nas vendas antigas.
- A regra continua sendo "mais antigo para mais recente".
- Agora a regra existe de verdade porque as alocacoes ficam gravadas na nova tabela.

## Fluxo atual (simplificado)
1) Venda criada no Caderno com status inicial (Nao informado / Pago / Nao pago).
2) Pagamento registrado (Contas ou toggle de pago).
2a) Se a venda foi marcada como paga no Caderno, nasce um pagamento direto ligado a ela.
    - Ate 24h: desfazer o toggle remove o pagamento direto.
    - Depois de 24h: desfazer o toggle estorna o pagamento direto.
3) Sistema aloca o pagamento automaticamente: mais antigo -> mais recente.
4) Vendas mudam para Parcial ou Quitada conforme o saldo pago.
5) Contas a Receber mostra saldo real e pagamentos aplicados.

## O que falta / pontos de atencao
- Confirmar na pratica o uso do botao de reconciliacao em clientes com historico antigo.
- Validar relatorios/fechamento de caixa com as novas regras.
- Implementar a configuracao de layout do PDV (Restaurante/Loja) se for prioridade.

## Como testar rapido
1) Criar 2 vendas para um cliente (valores diferentes, status "Nao informado").
2) Registrar 1 pagamento menor que a soma das vendas.
3) Verificar se a venda mais antiga fica "Parcial" ou "Quitada" primeiro.
4) Registrar outro pagamento e confirmar que a mais antiga completa e a proxima recebe o restante.

