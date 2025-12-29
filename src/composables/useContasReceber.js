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

      const naoPagas = linhas
        .filter(
          (l) =>
            l.tipo === 'VENDA' && l.status_pagamento !== 'PAGO' && l.status_pagamento !== 'CANCELADA',
        )
        .reduce((acc, linha) => acc + (Number(linha.valor) || 0), 0)
      const pagamentos = linhas
        .filter((l) => l.tipo === 'PAGAMENTO' && !l.estornado && l.contabiliza_saldo !== false)
        .reduce((acc, linha) => acc + (Number(linha.valor) || 0), 0)

      totalVendasNaoPagas.value = naoPagas
      totalPagamentos.value = pagamentos
      saldo.value = naoPagas - pagamentos
    } finally {
      loadingExtrato.value = false
    }
  }

  async function carregarItens(vendaId) {
    if (!vendaId || itensPorVenda.value[vendaId]) return itensPorVenda.value[vendaId] || []
    const itens = await contas.listarItensTransacao(vendaId)
    itensPorVenda.value = { ...itensPorVenda.value, [vendaId]: itens }
    return itens
  }

  async function registrarPagamento({ valor, forma, obs }) {
    if (!clienteSel.value?.id) return
    await contas.registrarPagamento({
      cliente_id: clienteSel.value.id,
      valor,
      forma_pagamento: forma,
      observacao: obs,
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

  async function estornarPagamento({ id, observacao }) {
    const resultado = await contas.estornarPagamento(id, observacao)
    await Promise.all([carregarClientes(), carregarExtrato()])
    return resultado
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
    loadingClientes,
    loadingExtrato,
    carregarClientes,
    carregarExtrato,
    carregarItens,
    startRealtime,
    registrarPagamento,
    marcarVendaPaga,
    marcarVendaNaoPaga,
    estornarPagamento,
  }
}

