import { supabase } from 'src/supabaseClient'
import {
  marcarPago as marcarTransacaoPaga,
  marcarNaoPago as marcarTransacaoNaoPaga,
  marcarNaoInformado as marcarTransacaoNaoInformada,
} from './cadernoService'

const PAGAMENTOS_TABELA = 'pagamentos'
const ALOCACOES_TABELA = 'pagamento_alocacoes'
const PAGE_SIZE = 1000

// Supabase aplica limite padrao de 1000 linhas por select; paginamos para ler tudo.
async function fetchAllRows(queryBuilder) {
  const rows = []
  let start = 0
  let hasMore = true

  while (hasMore) {
    const end = start + PAGE_SIZE - 1
    const { data, error } = await queryBuilder(start, end)
    if (error) throw error
    const rowsFound = data?.length || 0
    if (!rowsFound) break

    rows.push(...data)
    hasMore = rowsFound === PAGE_SIZE

    if (hasMore) {
      start += PAGE_SIZE
    }
  }

  return rows
}

function isColumnMissingError(error) {
  if (!error) return false
  if (error.code === '42703' || error.code === 'PGRST204') return true
  const msg = (error.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('schema cache')
}

function normalizeTextoUpper(value) {
  if (value === null || value === undefined) return null
  const texto = String(value)
  return texto ? texto.toUpperCase() : null
}

function isTableMissingError(error) {
  if (!error) return false
  if (error.code === 'PGRST116' || error.status === 404) return true
  const msg = (error.message || '').toLowerCase()
  return msg.includes('could not find the table') || msg.includes('does not exist')
}

function resolveDataPagamento(pagamento) {
  return pagamento?.data_pagamento || pagamento?.data_local || null
}

async function fetchAllAlocacoes() {
  return fetchAllRows((from, to) =>
    supabase
      .from(ALOCACOES_TABELA)
      .select('pagamento_id, transacao_id, valor_aplicado')
      .range(from, to),
  )
}

async function fetchAlocacoesPorTransacaoIds(transacaoIds) {
  if (!transacaoIds?.length) return []
  const chunkSize = 900
  const result = []
  for (let i = 0; i < transacaoIds.length; i += chunkSize) {
    const slice = transacaoIds.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from(ALOCACOES_TABELA)
      .select('pagamento_id, transacao_id, valor_aplicado')
      .in('transacao_id', slice)
    if (error) throw error
    result.push(...(data || []))
  }
  return result
}

async function fetchAlocacoesPorPagamentoIds(pagamentoIds) {
  if (!pagamentoIds?.length) return []
  const chunkSize = 900
  const result = []
  for (let i = 0; i < pagamentoIds.length; i += chunkSize) {
    const slice = pagamentoIds.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from(ALOCACOES_TABELA)
      .select('pagamento_id, transacao_id, valor_aplicado')
      .in('pagamento_id', slice)
    if (error) throw error
    result.push(...(data || []))
  }
  return result
}

async function fetchPagamentosPorIds(pagamentoIds) {
  if (!pagamentoIds?.length) return { pagamentos: [], suportaEstorno: true }
  const chunkSize = 900
  let suportaEstorno = true
  const result = []
  for (let i = 0; i < pagamentoIds.length; i += chunkSize) {
    const slice = pagamentoIds.slice(i, i + chunkSize)
    let tentativa = await supabase
      .from(PAGAMENTOS_TABELA)
      .select('id, cliente_id, valor, estornado, forma_pagamento')
      .in('id', slice)
    if (tentativa.error) {
      if (isColumnMissingError(tentativa.error)) {
        suportaEstorno = false
        tentativa = await supabase
          .from(PAGAMENTOS_TABELA)
          .select('id, cliente_id, valor, forma_pagamento')
          .in('id', slice)
      }
    }
    if (tentativa.error) throw tentativa.error
    result.push(...(tentativa.data || []))
  }
  return { pagamentos: result, suportaEstorno }
}

async function fetchPagamentosPorCliente(clienteId) {
  if (!clienteId) return { pagamentos: [], suportaEstorno: true, suportaPagamentos: true }
  let suportaEstorno = true
  let suportaPagamentos = true
  let tentativa = await supabase
    .from(PAGAMENTOS_TABELA)
    .select('id, cliente_id, valor, origem_transacao_id, data_pagamento, estornado')
    .eq('cliente_id', clienteId)
    .order('data_pagamento', { ascending: true, nullsFirst: true })
  if (tentativa.error) {
    if (isTableMissingError(tentativa.error)) {
      suportaPagamentos = false
      return { pagamentos: [], suportaEstorno: false, suportaPagamentos }
    }
    if (isColumnMissingError(tentativa.error)) {
      suportaEstorno = false
      tentativa = await supabase
        .from(PAGAMENTOS_TABELA)
        .select('id, cliente_id, valor, origem_transacao_id, data_pagamento')
        .eq('cliente_id', clienteId)
        .order('data_pagamento', { ascending: true, nullsFirst: true })
    }
  }
  if (tentativa.error) throw tentativa.error
  return { pagamentos: tentativa.data || [], suportaEstorno, suportaPagamentos }
}

async function calcularAlocacoesAtivasPorTransacaoIds(transacaoIds) {
  let alocacoes = []
  let suportaAlocacoes = true
  try {
    alocacoes = await fetchAlocacoesPorTransacaoIds(transacaoIds)
  } catch (error) {
    if (isTableMissingError(error)) {
      suportaAlocacoes = false
      alocacoes = []
    } else {
      throw error
    }
  }

  if (!suportaAlocacoes || !alocacoes.length) {
    return { suportaAlocacoes, alocadoPorTransacao: new Map() }
  }

  const pagamentoIds = Array.from(new Set(alocacoes.map((a) => a?.pagamento_id).filter(Boolean)))
  const { pagamentos, suportaEstorno } = await fetchPagamentosPorIds(pagamentoIds)
  const estornados = new Set(
    (pagamentos || [])
      .filter((p) => suportaEstorno && p.estornado)
      .map((p) => p.id)
      .filter(Boolean),
  )

  const alocadoPorTransacao = new Map()
  for (const a of alocacoes || []) {
    if (!a?.transacao_id) continue
    if (estornados.has(a.pagamento_id)) continue
    const valor = Number(a.valor_aplicado || 0)
    if (!valor) continue
    alocadoPorTransacao.set(
      a.transacao_id,
      (alocadoPorTransacao.get(a.transacao_id) || 0) + valor,
    )
  }

  return { suportaAlocacoes, alocadoPorTransacao }
}

// --------- RESUMO/CLIENTES ----------
export async function listarClientesComSaldos() {
  const { data: cli, error: eCli } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome', { ascending: true })
  if (eCli) throw eCli

  const transacoes = await fetchAllRows((from, to) =>
    supabase
      .from('transacoes')
      .select('id, cliente_id, valor, status_pagamento')
      .range(from, to),
  )

  let suportaEstorno = true
  let pagamentos = []
  try {
    pagamentos = await fetchAllRows((from, to) =>
      supabase
        .from(PAGAMENTOS_TABELA)
        .select('id, cliente_id, valor, estornado, origem_transacao_id')
        .range(from, to),
    )
  } catch (erroPagamentos) {
    if (isTableMissingError(erroPagamentos)) {
      suportaEstorno = false
      pagamentos = []
    } else if (isColumnMissingError(erroPagamentos)) {
      suportaEstorno = false
      pagamentos = await fetchAllRows((from, to) =>
        supabase
          .from(PAGAMENTOS_TABELA)
          .select('id, cliente_id, valor, origem_transacao_id')
          .range(from, to),
      )
    } else {
      throw erroPagamentos
    }
  }

  let alocacoes = []
  let suportaAlocacoes = true
  try {
    alocacoes = await fetchAllAlocacoes()
  } catch (erroAlocacoes) {
    if (isTableMissingError(erroAlocacoes)) {
      suportaAlocacoes = false
      alocacoes = []
    } else {
      throw erroAlocacoes
    }
  }

  if (!suportaAlocacoes) {
    const mapV = new Map()
    for (const v of transacoes || []) {
      const k = v.cliente_id
      if (!k) continue
      if (v.status_pagamento === 'PAGO' || v.status_pagamento === 'CANCELADA') continue
      mapV.set(k, (mapV.get(k) || 0) + Number(v.valor || 0))
    }

    const statusPorOrigem = new Map(
      (transacoes || []).map((row) => [row.id, row.status_pagamento || null]),
    )

    const mapP = new Map()
    for (const p of pagamentos || []) {
      const k = p.cliente_id
      if (!k) continue
      if (suportaEstorno && p.estornado) continue

      const origemId = p.origem_transacao_id
      const statusOrigem = origemId ? statusPorOrigem.get(origemId) : null
      if (origemId && (statusOrigem === 'PAGO' || statusOrigem === 'CANCELADA')) continue

      mapP.set(k, (mapP.get(k) || 0) + Number(p.valor || 0))
    }

    return (cli || []).map((c) => {
      const naoPagas = mapV.get(c.id) || 0
      const pagos = mapP.get(c.id) || 0
      const saldo = naoPagas - pagos
      return {
        id: c.id,
        nome: c.nome,
        vendas_nao_pagas: naoPagas,
        pagamentos: pagos,
        saldo,
      }
    })
  }

  const pagamentosPorId = new Map()
  const totalPagamentosPorCliente = new Map()
  for (const p of pagamentos || []) {
    if (!p?.id) continue
    if (suportaEstorno && p.estornado) continue
    pagamentosPorId.set(p.id, p)
    const k = p.cliente_id
    if (!k) continue
    totalPagamentosPorCliente.set(k, (totalPagamentosPorCliente.get(k) || 0) + Number(p.valor || 0))
  }

  const alocadoPorTransacao = new Map()
  const alocadoPorPagamento = new Map()
  for (const a of alocacoes || []) {
    if (!a?.pagamento_id || !a?.transacao_id) continue
    const pagamento = pagamentosPorId.get(a.pagamento_id)
    if (!pagamento) continue
    const valor = Number(a.valor_aplicado || 0)
    if (!valor) continue
    alocadoPorTransacao.set(
      a.transacao_id,
      (alocadoPorTransacao.get(a.transacao_id) || 0) + valor,
    )
    alocadoPorPagamento.set(
      a.pagamento_id,
      (alocadoPorPagamento.get(a.pagamento_id) || 0) + valor,
    )
  }

  const saldoPorCliente = new Map()
  const naoInformadoPorCliente = new Map()
  for (const v of transacoes || []) {
    const k = v.cliente_id
    if (!k) continue
    if (v.status_pagamento === 'CANCELADA') continue
    const total = Number(v.valor || 0)
    const alocado = alocadoPorTransacao.get(v.id) || 0
    const pendente = Math.max(0, total - alocado)
    saldoPorCliente.set(k, (saldoPorCliente.get(k) || 0) + pendente)
    if (v.status_pagamento === 'NAO_INFORMADO' && pendente > 0) {
      naoInformadoPorCliente.set(
        k,
        (naoInformadoPorCliente.get(k) || 0) + pendente,
      )
    }
  }

  const alocadoPorCliente = new Map()
  for (const [pagamentoId, valorAlocado] of alocadoPorPagamento.entries()) {
    const pagamento = pagamentosPorId.get(pagamentoId)
    const k = pagamento?.cliente_id
    if (!k) continue
    alocadoPorCliente.set(k, (alocadoPorCliente.get(k) || 0) + valorAlocado)
  }

  return (cli || []).map((c) => {
    const naoPagas = saldoPorCliente.get(c.id) || 0
    const totalPagamentos = totalPagamentosPorCliente.get(c.id) || 0
    const totalAlocado = alocadoPorCliente.get(c.id) || 0
    const credito = totalPagamentos - totalAlocado
    const saldo = naoPagas - credito
    return {
      id: c.id,
      nome: c.nome,
      vendas_nao_pagas: naoPagas,
      pagamentos: totalPagamentos,
      saldo,
      credito,
      nao_informado: naoInformadoPorCliente.get(c.id) || 0,
    }
  })
}

// --------- EXTRATO POR CLIENTE ----------
export async function listarExtratoCliente(clienteId) {
  const { data: vendas, error: e1 } = await supabase
    .from('transacoes')
    .select(
      'id, data_transacao, valor, status_pagamento, forma_pagamento, anotacoes, nome_funcionario_empresa',
    )
    .eq('cliente_id', clienteId)
    .order('data_transacao', { ascending: true })
  if (e1) throw e1

  let pags
  let e2
  let suporteEstorno = false
  const selectPadrao =
    'id, valor, forma_pagamento, observacao, origem_transacao_id, data_pagamento, estornado, observacao_estorno, data_estorno'
  ;({ data: pags, error: e2 } = await supabase
    .from(PAGAMENTOS_TABELA)
    .select(selectPadrao)
    .eq('cliente_id', clienteId)
    .order('data_pagamento', { ascending: true, nullsFirst: true }))
  if (isTableMissingError(e2)) {
    pags = []
    e2 = null
  }
  if (isColumnMissingError(e2)) {
    const selectFallback = 'id, valor, forma_pagamento, observacao, origem_transacao_id'
    ;({ data: pags, error: e2 } = await supabase
      .from(PAGAMENTOS_TABELA)
      .select(selectFallback)
      .eq('cliente_id', clienteId)
      .order('id', { ascending: true }))
  }
  if (e2) throw e2

  pags = pags || []
  suporteEstorno = pags.some((p) => Object.prototype.hasOwnProperty.call(p ?? {}, 'estornado'))

  let alocacoes = []
  let suportaAlocacoes = true
  try {
    const vendaIds = (vendas || []).map((v) => v.id).filter(Boolean)
    alocacoes = await fetchAlocacoesPorTransacaoIds(vendaIds)
  } catch (erroAlocacoes) {
    if (isTableMissingError(erroAlocacoes)) {
      suportaAlocacoes = false
      alocacoes = []
    } else {
      throw erroAlocacoes
    }
  }

  const linhas = []

  if (!suportaAlocacoes) {
    const origemIds = Array.from(
      new Set(
        pags.map((p) => p?.origem_transacao_id).filter((id) => id !== null && id !== undefined),
      ),
    )

    let statusPorOrigem = new Map()
    if (origemIds.length) {
      const { data: origemRows, error: origemErro } = await supabase
        .from('transacoes')
        .select('id, status_pagamento')
        .in('id', origemIds)
      if (origemErro) throw origemErro
      statusPorOrigem = new Map(
        (origemRows || []).map((row) => [row.id, row.status_pagamento || null]),
      )
    }

    for (const v of vendas || []) {
      linhas.push({
        tipo: 'VENDA',
        id: v.id,
        data: v.data_transacao,
        valor: Number(v.valor || 0),
        status_pagamento: v.status_pagamento,
        forma_pagamento: v.forma_pagamento || null,
        observacao: v.anotacoes || null,
        nome_funcionario_empresa: v.nome_funcionario_empresa || null,
      })
    }

    for (const p of pags) {
      const dataPagamento = resolveDataPagamento(p)
      const origemId = p.origem_transacao_id || null
      const statusOrigem = origemId ? statusPorOrigem.get(origemId) || null : null
      const contabilizaSaldo = !(statusOrigem === 'PAGO' || statusOrigem === 'CANCELADA')

      linhas.push({
        tipo: 'PAGAMENTO',
        id: p.id,
        data: dataPagamento,
        valor: Number(p.valor || 0),
        forma_pagamento: p.forma_pagamento || null,
        observacao: p.observacao || null,
        origem_transacao_id: origemId,
        origem_status_pagamento: statusOrigem,
        estornado: suporteEstorno ? Boolean(p.estornado) : false,
        observacao_estorno: suporteEstorno ? p.observacao_estorno || null : null,
        data_estorno: suporteEstorno ? p.data_estorno || null : null,
        contabiliza_saldo: contabilizaSaldo,
      })
    }
  } else {
    const pagamentosPorId = new Map()
    for (const p of pags || []) {
      if (!p?.id) continue
      pagamentosPorId.set(p.id, p)
    }

    const alocadoPorTransacao = new Map()
    const alocadoPorPagamento = new Map()
    for (const a of alocacoes || []) {
      if (!a?.pagamento_id || !a?.transacao_id) continue
      const pagamento = pagamentosPorId.get(a.pagamento_id)
      if (!pagamento) continue
      if (suporteEstorno && pagamento.estornado) continue
      const valor = Number(a.valor_aplicado || 0)
      if (!valor) continue
      alocadoPorTransacao.set(
        a.transacao_id,
        (alocadoPorTransacao.get(a.transacao_id) || 0) + valor,
      )
      alocadoPorPagamento.set(
        a.pagamento_id,
        (alocadoPorPagamento.get(a.pagamento_id) || 0) + valor,
      )
    }

    for (const v of vendas || []) {
      const total = Number(v.valor || 0)
      const valorPago = alocadoPorTransacao.get(v.id) || 0
      const saldoAberto = Math.max(0, total - valorPago)
      let statusFinanceiro = v.status_pagamento
      if (v.status_pagamento === 'CANCELADA') {
        statusFinanceiro = 'CANCELADA'
      } else if (saldoAberto <= 0 && total > 0) {
        statusFinanceiro = 'PAGO'
      } else if (valorPago > 0) {
        statusFinanceiro = 'PARCIAL'
      }

      linhas.push({
        tipo: 'VENDA',
        id: v.id,
        data: v.data_transacao,
        valor: total,
        status_pagamento: v.status_pagamento,
        status_financeiro: statusFinanceiro,
        valor_pago: valorPago,
        saldo_aberto: saldoAberto,
        forma_pagamento: v.forma_pagamento || null,
        observacao: v.anotacoes || null,
        nome_funcionario_empresa: v.nome_funcionario_empresa || null,
      })
    }

    for (const p of pags) {
      const dataPagamento = resolveDataPagamento(p)
      const estornado = suporteEstorno ? Boolean(p.estornado) : false
      const valor = Number(p.valor || 0)
      const valorAlocado = estornado ? 0 : alocadoPorPagamento.get(p.id) || 0
      const saldoDisponivel = Math.max(0, valor - valorAlocado)

      linhas.push({
        tipo: 'PAGAMENTO',
        id: p.id,
        data: dataPagamento,
        valor,
        forma_pagamento: p.forma_pagamento || null,
        observacao: p.observacao || null,
        origem_transacao_id: p.origem_transacao_id || null,
        estornado,
        observacao_estorno: estornado ? p.observacao_estorno || null : null,
        data_estorno: estornado ? p.data_estorno || null : null,
        valor_alocado: valorAlocado,
        saldo_disponivel: saldoDisponivel,
        contabiliza_saldo: !estornado,
      })
    }
  }

  linhas.sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0))
  return linhas
}

export async function listarItensTransacao(transacaoId) {
  const { data, error } = await supabase
    .from('itens_transacao')
    .select('id, nome_produto_congelado, preco_unitario_congelado, quantidade')
    .eq('transacao_id', transacaoId)
    .order('id', { ascending: true })
  if (error) throw error
  return data || []
}


export async function listarPagamentosAplicados(transacaoId) {
  if (!transacaoId) {
    return { suportaAlocacoes: true, pagamentos: [] }
  }
  let tentativa = await supabase
    .from(ALOCACOES_TABELA)
    .select(
      'valor_aplicado, created_at, pagamento:pagamento_id (id, valor, forma_pagamento, data_pagamento, observacao, estornado, observacao_estorno, data_estorno)',
    )
    .eq('transacao_id', transacaoId)
    .order('created_at', { ascending: true })

  if (tentativa.error && isColumnMissingError(tentativa.error)) {
    tentativa = await supabase
      .from(ALOCACOES_TABELA)
      .select(
        'valor_aplicado, created_at, pagamento:pagamento_id (id, valor, forma_pagamento, data_pagamento, observacao)',
      )
      .eq('transacao_id', transacaoId)
      .order('created_at', { ascending: true })
  }

  if (tentativa.error) {
    if (isTableMissingError(tentativa.error)) {
      return { suportaAlocacoes: false, pagamentos: [] }
    }
    throw tentativa.error
  }

  const pagamentos = (tentativa.data || [])
    .map((row) => {
      const pagamento = row.pagamento || {}
      return {
        ...pagamento,
        valor_aplicado: Number(row.valor_aplicado || 0),
        created_at: row.created_at || null,
      }
    })
    .filter((p) => p.id)

  return { suportaAlocacoes: true, pagamentos }
}


export async function listarVendasAplicadasPorPagamento(pagamentoId) {
  if (!pagamentoId) {
    return { suportaAlocacoes: true, vendas: [] }
  }
  let tentativa = await supabase
    .from(ALOCACOES_TABELA)
    .select(
      'valor_aplicado, created_at, transacao:transacao_id (id, valor, data_transacao, status_pagamento, anotacoes, nome_funcionario_empresa, nome_cliente_avulso, cliente_id)',
    )
    .eq('pagamento_id', pagamentoId)
    .order('created_at', { ascending: true })

  if (tentativa.error) {
    if (isTableMissingError(tentativa.error)) {
      return { suportaAlocacoes: false, vendas: [] }
    }
    throw tentativa.error
  }

  const vendas = (tentativa.data || [])
    .map((row) => {
      const transacao = row.transacao || {}
      return {
        ...transacao,
        valor_aplicado: Number(row.valor_aplicado || 0),
        created_at: row.created_at || null,
      }
    })
    .filter((v) => v.id)

  return { suportaAlocacoes: true, vendas }
}

function resolveStatusFinanceiro(statusAtual, total, alocado) {
  if (statusAtual === 'CANCELADA') return 'CANCELADA'
  if (total > 0 && alocado >= total) return 'PAGO'
  if (alocado > 0) return 'PARCIAL'
  if (statusAtual === 'NAO_INFORMADO') return 'NAO_INFORMADO'
  return 'PENDENTE'
}

async function atualizarStatusTransacoes(transacaoIds) {
  if (!transacaoIds?.length) return
  const { data: transacoes, error } = await supabase
    .from('transacoes')
    .select('id, valor, status_pagamento')
    .in('id', transacaoIds)
  if (error) throw error

  const { suportaAlocacoes, alocadoPorTransacao } = await calcularAlocacoesAtivasPorTransacaoIds(
    transacaoIds,
  )
  if (!suportaAlocacoes) return

  for (const t of transacoes || []) {
    const total = Number(t.valor || 0)
    const alocado = alocadoPorTransacao.get(t.id) || 0
    const novoStatus = resolveStatusFinanceiro(t.status_pagamento, total, alocado)
    if (novoStatus === t.status_pagamento || novoStatus === 'CANCELADA') continue
    const { error: updateError } = await supabase
      .from('transacoes')
      .update({ status_pagamento: novoStatus })
      .eq('id', t.id)
    if (updateError) throw updateError
  }
}

async function alocarPagamento({
  pagamentoId,
  clienteId,
  valor,
  origemTransacaoId = null,
}) {
  if (!pagamentoId || !clienteId) return { aplicado: 0, transacoesAfetadas: [] }
  const valorTotal = Number(valor || 0)
  if (!valorTotal) return { aplicado: 0, transacoesAfetadas: [] }

  let transacoes = []
  if (origemTransacaoId) {
    const { data, error } = await supabase
      .from('transacoes')
      .select('id, valor, status_pagamento, data_transacao')
      .eq('id', origemTransacaoId)
      .single()
    if (error) throw error
    if (data) transacoes = [data]
  } else {
    const { data, error } = await supabase
      .from('transacoes')
      .select('id, valor, status_pagamento, data_transacao')
      .eq('cliente_id', clienteId)
      .neq('status_pagamento', 'CANCELADA')
      .order('data_transacao', { ascending: true })
    if (error) throw error
    transacoes = data || []
  }

  if (!transacoes.length) return { aplicado: 0, transacoesAfetadas: [] }

  const transacaoIds = transacoes.map((t) => t.id)
  const { suportaAlocacoes, alocadoPorTransacao } = await calcularAlocacoesAtivasPorTransacaoIds(
    transacaoIds,
  )
  if (!suportaAlocacoes) return { aplicado: 0, transacoesAfetadas: [] }

  let restante = valorTotal
  const novasAlocacoes = []
  const transacoesAfetadas = new Set()
  const statusUpdates = []

  for (const t of transacoes) {
    if (restante <= 0) break
    const total = Number(t.valor || 0)
    const jaAlocado = alocadoPorTransacao.get(t.id) || 0
    const pendente = Math.max(0, total - jaAlocado)
    if (pendente <= 0) continue
    const aplicar = Math.min(restante, pendente)
    if (aplicar <= 0) continue
    novasAlocacoes.push({
      pagamento_id: pagamentoId,
      transacao_id: t.id,
      valor_aplicado: aplicar,
    })
    restante -= aplicar
    transacoesAfetadas.add(t.id)
    const novoAlocado = jaAlocado + aplicar
    const novoStatus = resolveStatusFinanceiro(t.status_pagamento, total, novoAlocado)
    if (novoStatus !== t.status_pagamento && novoStatus !== 'CANCELADA') {
      statusUpdates.push({ id: t.id, status_pagamento: novoStatus })
    }
  }

  if (novasAlocacoes.length) {
    const { error: insertError } = await supabase
      .from(ALOCACOES_TABELA)
      .insert(novasAlocacoes)
    if (insertError) throw insertError
  }

  for (const update of statusUpdates) {
    const { error: updateError } = await supabase
      .from('transacoes')
      .update({ status_pagamento: update.status_pagamento })
      .eq('id', update.id)
    if (updateError) throw updateError
  }

  return { aplicado: valorTotal - restante, transacoesAfetadas: Array.from(transacoesAfetadas) }
}

export async function transacaoTemAlocacoes(transacaoId) {
  if (!transacaoId) return false
  const { suportaAlocacoes, alocadoPorTransacao } = await calcularAlocacoesAtivasPorTransacaoIds(
    [transacaoId],
  )
  if (!suportaAlocacoes) return false
  return (alocadoPorTransacao.get(transacaoId) || 0) > 0
}

function criarErroPagamentoAlocado() {
  const err = new Error('Transacao possui pagamentos aplicados.')
  err.code = 'PAGAMENTO_ALOCADO'
  return err
}

async function removerPagamentosDiretosDaVenda(transacaoId) {
  if (!transacaoId) return { bloqueado: false, removeu: false }
  let alocacoes = []
  try {
    alocacoes = await fetchAlocacoesPorTransacaoIds([transacaoId])
  } catch (error) {
    if (isTableMissingError(error)) {
      return { bloqueado: false, removeu: false }
    }
    throw error
  }
  if (!alocacoes.length) {
    return { bloqueado: false, removeu: false }
  }

  const pagamentoIds = Array.from(
    new Set(alocacoes.map((a) => a?.pagamento_id).filter(Boolean)),
  )
  if (!pagamentoIds.length) {
    return { bloqueado: false, removeu: false }
  }

  let tentativa = await supabase
    .from(PAGAMENTOS_TABELA)
    .select('id, origem_transacao_id, estornado, observacao')
    .in('id', pagamentoIds)
  if (tentativa.error) {
    if (isColumnMissingError(tentativa.error)) {
      return { bloqueado: true, removeu: false }
    }
    throw tentativa.error
  }

  const pagamentos = tentativa.data || []
  const pagamentosDiretos = pagamentos.filter(
    (p) => !p?.estornado && p.origem_transacao_id === transacaoId,
  )
  const pagamentosExternos = pagamentos.filter(
    (p) => !p?.estornado && p.origem_transacao_id !== transacaoId,
  )

  if (pagamentosExternos.length) {
    return { bloqueado: true, removeu: false }
  }

  if (!pagamentosDiretos.length) {
    return { bloqueado: false, removeu: false }
  }

  let podeExcluir = false
  const { data: transacaoData, error: transacaoError } = await supabase
    .from('transacoes')
    .select('id, data_transacao')
    .eq('id', transacaoId)
    .single()
  if (transacaoError) throw transacaoError
  const dataTransacao = transacaoData?.data_transacao
  if (dataTransacao) {
    const diff = Date.now() - new Date(dataTransacao).getTime()
    const janela = 24 * 60 * 60 * 1000
    if (Number.isFinite(diff) && diff >= 0 && diff <= janela) {
      podeExcluir = true
    }
  }

  if (podeExcluir) {
    const idsDiretos = pagamentosDiretos.map((p) => p.id).filter(Boolean)
    try {
      const { error: deleteError } = await supabase
        .from(ALOCACOES_TABELA)
        .delete()
        .in('pagamento_id', idsDiretos)
      if (deleteError && !isTableMissingError(deleteError)) {
        throw deleteError
      }
    } catch (error) {
      if (!isTableMissingError(error)) throw error
    }
    const { error: deletePagamentosError } = await supabase
      .from(PAGAMENTOS_TABELA)
      .delete()
      .in('id', idsDiretos)
    if (deletePagamentosError) throw deletePagamentosError
    await atualizarStatusTransacoes([transacaoId])
    return { bloqueado: false, removeu: true, excluido: true }
  }
  let removeu = false
  for (const pagamento of pagamentosDiretos) {
    await estornarPagamento(pagamento.id, 'Estorno automatico do pagamento direto da venda.')
    removeu = true
  }

  return { bloqueado: false, removeu }
}
export async function reconciliarPagamentosCliente(
  clienteId,
  { apenasSemAlocacao = true } = {},
) {
  if (!clienteId) {
    throw new Error('Cliente invalido.')
  }

  const { pagamentos, suportaEstorno, suportaPagamentos } = await fetchPagamentosPorCliente(clienteId)
  if (!suportaPagamentos) {
    return {
      suportaPagamentos: false,
      suportaAlocacoes: false,
      pagamentosProcessados: 0,
      pagamentosIgnorados: 0,
      totalAplicado: 0,
      transacoesAfetadas: [],
    }
  }

  const ativos = (pagamentos || []).filter((p) => !(suportaEstorno && p.estornado))
  if (!ativos.length) {
    return {
      suportaPagamentos: true,
      suportaAlocacoes: true,
      pagamentosProcessados: 0,
      pagamentosIgnorados: 0,
      totalAplicado: 0,
      transacoesAfetadas: [],
    }
  }

  let alocacoes = []
  let suportaAlocacoes = true
  try {
    const ids = ativos.map((p) => p.id).filter(Boolean)
    alocacoes = await fetchAlocacoesPorPagamentoIds(ids)
  } catch (erroAlocacoes) {
    if (isTableMissingError(erroAlocacoes)) {
      suportaAlocacoes = false
      alocacoes = []
    } else {
      throw erroAlocacoes
    }
  }

  if (!suportaAlocacoes) {
    return {
      suportaPagamentos: true,
      suportaAlocacoes: false,
      pagamentosProcessados: 0,
      pagamentosIgnorados: ativos.length,
      totalAplicado: 0,
      transacoesAfetadas: [],
    }
  }

  const alocadoPorPagamento = new Map()
  for (const a of alocacoes || []) {
    if (!a?.pagamento_id) continue
    const valor = Number(a.valor_aplicado || 0)
    if (!valor) continue
    alocadoPorPagamento.set(
      a.pagamento_id,
      (alocadoPorPagamento.get(a.pagamento_id) || 0) + valor,
    )
  }

  let pagamentosProcessados = 0
  let pagamentosIgnorados = 0
  let totalAplicado = 0
  const transacoesAfetadas = new Set()

  for (const p of ativos) {
    const valor = Number(p.valor || 0)
    if (!valor) {
      pagamentosIgnorados += 1
      continue
    }
    const jaAlocado = alocadoPorPagamento.get(p.id) || 0
    if (apenasSemAlocacao && jaAlocado > 0) {
      pagamentosIgnorados += 1
      continue
    }
    const restante = Math.max(0, valor - jaAlocado)
    if (!restante) {
      pagamentosIgnorados += 1
      continue
    }

    const resultado = await alocarPagamento({
      pagamentoId: p.id,
      clienteId,
      valor: restante,
      origemTransacaoId: p.origem_transacao_id || null,
    })
    pagamentosProcessados += 1
    totalAplicado += Number(resultado?.aplicado || 0)
    for (const transacaoId of resultado?.transacoesAfetadas || []) {
      transacoesAfetadas.add(transacaoId)
    }
  }

  return {
    suportaPagamentos: true,
    suportaAlocacoes: true,
    pagamentosProcessados,
    pagamentosIgnorados,
    totalAplicado,
    transacoesAfetadas: Array.from(transacoesAfetadas),
  }
}

// --------- ACOES ----------
export async function registrarPagamento({
  cliente_id,
  valor,
  forma_pagamento,
  observacao,
  origem_transacao_id = null,
  data_pagamento = null,
  data_local = null,
  aplicar_automatico = true,
}) {
  const dataPagamentoFinal = data_pagamento || new Date().toISOString()
  const payloadBase = {
    cliente_id,
    valor,
    forma_pagamento: forma_pagamento || null,
    observacao: normalizeTextoUpper(observacao),
    origem_transacao_id,
    data_pagamento: dataPagamentoFinal,
  }

  if (data_local !== null && data_local !== undefined) {
    payloadBase.data_local = data_local
  }

  let tentativa = await supabase.from(PAGAMENTOS_TABELA).insert([payloadBase]).select().single()
  if (tentativa.error) {
    if (isColumnMissingError(tentativa.error)) {
      const fallback = { ...payloadBase }
      delete fallback.data_local
      tentativa = await supabase.from(PAGAMENTOS_TABELA).insert([fallback]).select().single()
    }
    if (isTableMissingError(tentativa.error)) {
      throw tentativa.error
    }
    if (tentativa.error) throw tentativa.error
  }
  const pagamento = tentativa.data

  if (aplicar_automatico) {
    await alocarPagamento({
      pagamentoId: pagamento.id,
      clienteId: cliente_id,
      valor: pagamento.valor,
      origemTransacaoId: origem_transacao_id || null,
    })
  }

  return pagamento
}

export async function estornarPagamento(pagamentoId, observacao) {
  const payload = {
    estornado: true,
    observacao_estorno: normalizeTextoUpper(observacao),
    data_estorno: new Date().toISOString(),
  }
  const { error } = await supabase.from(PAGAMENTOS_TABELA).update(payload).eq('id', pagamentoId)
  if (isColumnMissingError(error)) {
    const { error: fallbackError } = await supabase
      .from(PAGAMENTOS_TABELA)
      .delete()
      .eq('id', pagamentoId)
    if (fallbackError) throw fallbackError
    return { estornoPersistido: false }
  }
  if (error) throw error

  try {
    const alocacoes = await fetchAlocacoesPorPagamentoIds([pagamentoId])
    if (alocacoes.length) {
      const transacaoIds = Array.from(
        new Set(alocacoes.map((a) => a?.transacao_id).filter(Boolean)),
      )
      await supabase.from(ALOCACOES_TABELA).delete().eq('pagamento_id', pagamentoId)
      await atualizarStatusTransacoes(transacaoIds)
    }
  } catch (erroAlocacoes) {
    if (!isTableMissingError(erroAlocacoes)) throw erroAlocacoes
  }

  return { estornoPersistido: true }
}


export async function excluirPagamentoDefinitivo(pagamentoId) {
  if (!pagamentoId) {
    throw new Error('Pagamento invalido.')
  }
  let tentativa = await supabase
    .from(PAGAMENTOS_TABELA)
    .select('id, estornado')
    .eq('id', pagamentoId)
    .single()
  if (tentativa.error) {
    if (isColumnMissingError(tentativa.error)) {
      const err = new Error('Coluna de estorno nao disponivel.')
      err.code = 'ESTORNO_NAO_SUPORTADO'
      throw err
    }
    throw tentativa.error
  }

  if (!tentativa.data?.estornado) {
    const err = new Error('Pagamento nao estornado.')
    err.code = 'PAGAMENTO_NAO_ESTORNADO'
    throw err
  }

  let transacaoIds = []
  try {
    const alocacoes = await fetchAlocacoesPorPagamentoIds([pagamentoId])
    transacaoIds = Array.from(
      new Set(alocacoes.map((a) => a?.transacao_id).filter(Boolean)),
    )
    if (alocacoes.length) {
      const { error: deleteError } = await supabase
        .from(ALOCACOES_TABELA)
        .delete()
        .eq('pagamento_id', pagamentoId)
      if (deleteError && !isTableMissingError(deleteError)) {
        throw deleteError
      }
    }
  } catch (erroAlocacoes) {
    if (!isTableMissingError(erroAlocacoes)) throw erroAlocacoes
  }

  const { error } = await supabase.from(PAGAMENTOS_TABELA).delete().eq('id', pagamentoId)
  if (error) throw error

  if (transacaoIds.length) {
    await atualizarStatusTransacoes(transacaoIds)
  }

  return { excluido: true }
}

export async function marcarVendaPaga(transacaoId, forma_pagamento) {
  const { data: transacao, error } = await supabase
    .from('transacoes')
    .select('id, cliente_id, valor, status_pagamento')
    .eq('id', transacaoId)
    .single()
  if (error) throw error
  if (!transacao?.cliente_id) {
    return marcarTransacaoPaga(transacaoId, forma_pagamento)
  }

  const { suportaAlocacoes, alocadoPorTransacao } = await calcularAlocacoesAtivasPorTransacaoIds(
    [transacaoId],
  )
  if (!suportaAlocacoes) {
    return marcarTransacaoPaga(transacaoId, forma_pagamento)
  }

  const total = Number(transacao.valor || 0)
  const alocado = alocadoPorTransacao.get(transacaoId) || 0
  const restante = Math.max(0, total - alocado)
  if (!restante) {
    return marcarTransacaoPaga(transacaoId, forma_pagamento)
  }

  return registrarPagamento({
    cliente_id: transacao.cliente_id,
    valor: restante,
    forma_pagamento,
    observacao: 'Pagamento direto da venda.',
    origem_transacao_id: transacaoId,
  })
}

export async function marcarVendaNaoPaga(transacaoId) {
  const limpeza = await removerPagamentosDiretosDaVenda(transacaoId)
  if (limpeza.bloqueado) {
    throw criarErroPagamentoAlocado()
  }
  const temAlocacoes = await transacaoTemAlocacoes(transacaoId)
  if (temAlocacoes) {
    throw criarErroPagamentoAlocado()
  }
  return marcarTransacaoNaoPaga(transacaoId)
}

export async function marcarVendaNaoInformada(transacaoId) {
  const limpeza = await removerPagamentosDiretosDaVenda(transacaoId)
  if (limpeza.bloqueado) {
    throw criarErroPagamentoAlocado()
  }
  const temAlocacoes = await transacaoTemAlocacoes(transacaoId)
  if (temAlocacoes) {
    throw criarErroPagamentoAlocado()
  }
  return marcarTransacaoNaoInformada(transacaoId)
}

// --------- REALTIME ----------
export function subscribeReceber({ onVenda, onPagamento }) {
  const ch = supabase
    .channel('contas-receber')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, (payload) =>
      onVenda?.(payload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: PAGAMENTOS_TABELA }, (payload) =>
      onPagamento?.(payload),
    )
    .subscribe()
  return () => supabase.removeChannel(ch)
}

