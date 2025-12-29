import { supabase } from 'src/supabaseClient'
import {
  marcarPago as marcarTransacaoPaga,
  marcarNaoPago as marcarTransacaoNaoPaga,
} from './cadernoService'

const PAGAMENTOS_TABELA = 'pagamentos'
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

function isTableMissingError(error) {
  if (!error) return false
  if (error.code === 'PGRST116' || error.status === 404) return true
  const msg = (error.message || '').toLowerCase()
  return msg.includes('could not find the table') || msg.includes('does not exist')
}

function resolveDataPagamento(pagamento) {
  return pagamento?.data_pagamento || pagamento?.data_local || null
}

// --------- RESUMO/CLIENTES ----------
export async function listarClientesComSaldos() {
  const { data: cli, error: eCli } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome', { ascending: true })
  if (eCli) throw eCli

  const aggV = await fetchAllRows((from, to) =>
    supabase
      .from('transacoes')
      .select('cliente_id, valor')
      .neq('status_pagamento', 'PAGO')
      .neq('status_pagamento', 'CANCELADA')
      .range(from, to),
  )
  const mapV = new Map()
  for (const v of aggV || []) {
    const k = v.cliente_id
    if (!k) continue
    mapV.set(k, (mapV.get(k) || 0) + Number(v.valor || 0))
  }

  let suportaEstorno = true
  let aggP = []
  try {
    aggP = await fetchAllRows((from, to) =>
      supabase
        .from(PAGAMENTOS_TABELA)
        .select('id, cliente_id, valor, estornado, origem_transacao_id')
        .range(from, to),
    )
  } catch (erroPagamentos) {
    if (isTableMissingError(erroPagamentos)) {
      suportaEstorno = false
      aggP = []
    } else if (isColumnMissingError(erroPagamentos)) {
      suportaEstorno = false
      aggP = await fetchAllRows((from, to) =>
        supabase
          .from(PAGAMENTOS_TABELA)
          .select('id, cliente_id, valor, origem_transacao_id')
          .range(from, to),
      )
    } else {
      throw erroPagamentos
    }
  }

  const origemIds = Array.from(
    new Set(
      aggP.map((p) => p?.origem_transacao_id).filter((id) => id !== null && id !== undefined),
    ),
  )

  let statusPorOrigem = new Map()
  if (origemIds.length) {
    const chunkSize = 900
    const statusMap = new Map()
    for (let i = 0; i < origemIds.length; i += chunkSize) {
      const slice = origemIds.slice(i, i + chunkSize)
      const { data: origemStatus, error: origemErro } = await supabase
        .from('transacoes')
        .select('id, status_pagamento')
        .in('id', slice)
      if (origemErro) throw origemErro
      ;(origemStatus || []).forEach((row) => statusMap.set(row.id, row.status_pagamento || null))
    }
    statusPorOrigem = statusMap
  }

  const mapP = new Map()
  for (const p of aggP) {
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

  const linhas = []
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

// --------- ACOES ----------
export async function registrarPagamento({
  cliente_id,
  valor,
  forma_pagamento,
  observacao,
  origem_transacao_id = null,
  data_local = null,
}) {
  const payloadBase = {
    cliente_id,
    valor,
    forma_pagamento: forma_pagamento || null,
    observacao: observacao || null,
    origem_transacao_id,
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
  return tentativa.data
}

export async function estornarPagamento(pagamentoId, observacao) {
  const payload = {
    estornado: true,
    observacao_estorno: observacao || null,
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
  return { estornoPersistido: true }
}

export function marcarVendaPaga(transacaoId, forma_pagamento) {
  return marcarTransacaoPaga(transacaoId, forma_pagamento)
}

export function marcarVendaNaoPaga(transacaoId) {
  return marcarTransacaoNaoPaga(transacaoId)
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
