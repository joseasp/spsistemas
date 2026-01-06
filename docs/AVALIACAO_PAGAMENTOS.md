# Avaliacao do fluxo de pagamentos (SP)

## Resumo simples
- O fluxo principal funciona: pagamento aplicado em vendas antigas, status muda para Parcial ou Quitada.
- Detalhes agora mostram origem do pagamento e saldo aberto nas vendas.
- Contas a Receber ficou mais enxuto (cards compactos, busca e modo foco).
- Ainda nao existem testes automatizados.

## O que ja esta resolvido
- Pagamentos vinculados a vendas via alocacao (mais antigo -> mais recente).
- Status financeiro consistente (PAGO, PARCIAL, PENDENTE, NAO_INFORMADO).
- Data/hora manual para venda e pagamento.
- Detalhes da venda exibem valor pago, saldo em aberto e pagamentos aplicados.
- Detalhe do pagamento exibe vendas vinculadas.
- Exclusao definitiva de pagamento estornado (com senha).
- Busca no extrato e modo foco para leitura rapida.\n- Scroll interno no desktop e mobile sem rolagem global.\n- Cooldown no toggle de pago para evitar cliques repetidos.

## O que ainda falta (prioridade)
- Validar reconciliacao em clientes com historico antigo.
- Revisar relatorios/fechamento de caixa com status parcial.
- Simplificar dialogs/telas restantes do Caderno (modo leve).
- Definir layout configuravel do PDV (restaurante/loja).

## Testes e riscos
- Nao ha testes automatizados (unitario/e2e). Risco: regressao em fluxo de vendas/pagamentos.
- Sugestao minima: checklist manual de testes a cada release.

## Performance / simplificacao
- Sombras/gradientes foram reduzidos nas telas principais.
- Ainda vale revisar dialogs e telas do Caderno para ficar mais leve.

## Sugestao de teste rapido (manual)
1) Criar 2 vendas para o mesmo cliente.
2) Registrar 1 pagamento menor que a soma.
3) Conferir: venda mais antiga vira Parcial e mostra valor pago + saldo aberto.
4) Registrar outro pagamento e conferir Quitada + origem dos pagamentos.
5) Testar busca do extrato e modo foco (lista de clientes oculta).

