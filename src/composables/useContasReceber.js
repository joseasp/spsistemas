// src/composables/useContasReceber.js
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import * as contas from 'src/services/contasService'

const FORMAS = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTRO']

export function useContasReceber() {
  // clientes e filtros
  const todosClientes = ref([])
  const busca = ref('')
  const filtroStatus = ref('todos') // 'todos' | 'devendo' | 'quitado' | 'credito'

  // estado de carregamento
  const loadingClientes = ref(false)
  const loadingExtrato = ref(false)

  const clientesFiltrados = computed(() => {
    const needle = (busca.value || '').toLowerCase()
    let base = todosClientes.value
    if (needle) {
      base = base.filter((c) => (c.nome || '').toLowerCase().includes(needle))
    }
    switch (filtroStatus.value) {
      case 'devendo':
        return base.filter((c) => c.saldo > 0)
      case 'quitado':
        return base.filter((c) => c.saldo === 0)
      case 'credito':
        return base.filter((c) => c.saldo < 0)
      default:
        return base
    }
  })

  // selecionado e extrato
  const clienteSel = ref(null)
  const extrato = ref([])
  const itensPorVenda = ref({})
  const saldo = ref(0)
  const totalVendasNaoPagas = ref(0)
  const totalPagamentos = ref(0)
  const reconciliando = ref(false)

  async function carregarClientes() {
    loadingClientes.value = true
    try {
      todosClientes.value = await contas.listarClientesComSaldos()
    } finally {
      loadingClientes.value = false
    }
  }

  async function carregarExtrato() {
    if (!clienteSel.value?.id) {
      extrato.value = []
      itensPorVenda.value = {}
      saldo.value = 0
      totalVendasNaoPagas.value = 0
      totalPagamentos.value = 0
      return
    }
    loadingExtrato.value = true
    try {
      const linhas = await contas.listarExtratoCliente(clienteSel.value.id)
      extrato.value = linhas
      itensPorVenda.value = {}

      const vendasAbertas = linhas.filter(
        (l) => l.tipo === 'VENDA' && l.status_financeiro !== 'CANCELADA',
      )
      const naoPagas = vendasAbertas.reduce((acc, linha) => {
        const saldoAberto = Number(linha.saldo_aberto ?? 0)
        if (Number.isFinite(saldoAberto) && saldoAberto > 0) return acc + saldoAberto
        if (linha.status_pagamento === 'PAGO') return acc
        return acc + (Number(linha.valor) || 0)
      }, 0)

      const pagamentosAplicados = linhas
        .filter((l) => l.tipo === 'PAGAMENTO' && !l.estornado && l.contabiliza_saldo !== false)
        .reduce((acc, linha) => {
          const aplicado = Number(linha.valor_alocado ?? NaN)
          if (Number.isFinite(aplicado)) return acc + aplicado
          return acc + (Number(linha.valor) || 0)
        }, 0)

      const credito = linhas
        .filter((l) => l.tipo === 'PAGAMENTO' && !l.estornado && l.contabiliza_saldo !== false)
        .reduce((acc, linha) => acc + (Number(linha.saldo_disponivel) || 0), 0)

      totalVendasNaoPagas.value = naoPagas
      totalPagamentos.value = pagamentosAplicados
      saldo.value = naoPagas - credito
    } finally {
      loadingExtrato.value = false
    }
  }

  async function listarPagamentosAplicados(vendaId) {
    if (!vendaId) return { suportaAlocacoes: true, pagamentos: [] }
    return contas.listarPagamentosAplicados(vendaId)
  }

  async function listarVendasAplicadasPorPagamento(pagamentoId) {
    if (!pagamentoId) return { suportaAlocacoes: true, vendas: [] }
    return contas.listarVendasAplicadasPorPagamento(pagamentoId)
  }

  async function carregarItens(vendaId) {
    if (!vendaId || itensPorVenda.value[vendaId]) return itensPorVenda.value[vendaId] || []
    const itens = await contas.listarItensTransacao(vendaId)
    itensPorVenda.value = { ...itensPorVenda.value, [vendaId]: itens }
    return itens
  }

  async function registrarPagamento({ valor, forma, obs, data_pagamento }) {
    if (!clienteSel.value?.id) return
    await contas.registrarPagamento({
      cliente_id: clienteSel.value.id,
      valor,
      forma_pagamento: forma,
      observacao: obs,
      data_pagamento,
    })
    await Promise.all([carregarClientes(), carregarExtrato()])
  }

  async function marcarVendaPaga(linha, forma) {
    await contas.marcarVendaPaga(linha.id, forma || null)
    await Promise.all([carregarClientes(), carregarExtrato()])
  }

  async function marcarVendaNaoPaga(linha) {
    await contas.marcarVendaNaoPaga(linha.id)
    await Promise.all([carregarClientes(), carregarExtrato()])
  }


  async function excluirPagamentoDefinitivo({ id }) {
    if (!id) return
    await contas.excluirPagamentoDefinitivo(id)
    await Promise.all([carregarClientes(), carregarExtrato()])
  }
  async function estornarPagamento({ id, observacao }) {
    const resultado = await contas.estornarPagamento(id, observacao)
    await Promise.all([carregarClientes(), carregarExtrato()])
    return resultado
  }

  async function reconciliarPagamentosCliente({ apenasSemAlocacao = true } = {}) {
    if (!clienteSel.value?.id) return null
    reconciliando.value = true
    try {
      const resultado = await contas.reconciliarPagamentosCliente(clienteSel.value.id, {
        apenasSemAlocacao,
      })
      await Promise.all([carregarClientes(), carregarExtrato()])
      return resultado
    } finally {
      reconciliando.value = false
    }
  }

  let stopRealtime = null
  async function startRealtime() {
    if (stopRealtime) return
    stopRealtime = contas.subscribeReceber({
      onVenda: () => {
        void carregarClientes()
        void carregarExtrato()
      },
      onPagamento: () => {
        void carregarClientes()
        void carregarExtrato()
      },
    })
  }

  onBeforeUnmount(() => {
    if (stopRealtime) {
      stopRealtime()
      stopRealtime = null
    }
  })

  watch(
    () => clienteSel.value?.id,
    () => {
      void carregarExtrato()
    },
  )

  return {
    FORMAS,
    busca,
    filtroStatus,
    todosClientes,
    clientesFiltrados,
    clienteSel,
    extrato,
    itensPorVenda,
    saldo,
    totalVendasNaoPagas,
    totalPagamentos,
    reconciliando,
    loadingClientes,
    loadingExtrato,
    carregarClientes,
    carregarExtrato,
    carregarItens,
    listarPagamentosAplicados,
    listarVendasAplicadasPorPagamento,
    startRealtime,
    registrarPagamento,
    marcarVendaPaga,
    marcarVendaNaoPaga,
    estornarPagamento,
    excluirPagamentoDefinitivo,
    reconciliarPagamentosCliente,
  }
}

