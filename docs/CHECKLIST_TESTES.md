# Checklist manual de testes (pagamentos)

## Vendas e pagamentos
- Criar 2 vendas para o mesmo cliente (valores diferentes).
- Registrar pagamento menor que a soma.
- Verificar: venda mais antiga vira Parcial e mostra valor pago + saldo em aberto.
- Registrar outro pagamento e verificar Quitada + saldo zerado.

## Estorno e exclusao
- Registrar pagamento e estornar.
- Verificar: aparece como estornado na lista.
- Abrir detalhe do pagamento e confirmar vendas aplicadas.
- Excluir definitivamente (senha) e validar que as vendas retornam para pendente/parcial corretamente.

## Toggle de pago (Caderno)
- Criar venda com status NAO_INFORMADO.
- Usar toggle para marcar como pago e validar status no contas.
- Tentar marcar como nao pago quando tiver alocacao: deve bloquear.

## Datas manuais
- Registrar venda e editar data/hora manual.
- Registrar pagamento com data manual.
- Verificar ordem correta no extrato.

## Reconciliacao
- Criar pagamento antigo sem alocacao (simular via base ou desligar alocacao).
- Executar "Reconciliar" no cliente.
- Verificar status das vendas e valores aplicados.

## UI / UX
- Ativar/desativar busca no extrato e filtrar por termo (produto, observacao).
- Ativar modo foco e confirmar que a lista de clientes some no desktop.
- Confirmar que cards ficam compactos e sem sombras fortes.

## Caixa alta
- Cadastrar cliente/produto e conferir dados salvos em maiusculo.
- Registrar venda/pagamento com observacao e conferir maiusculo no detalhe.

