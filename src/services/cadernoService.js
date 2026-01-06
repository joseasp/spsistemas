import { date as qDate } from 'quasar'
import { supabase } from 'src/supabaseClient'

const ANOTACOES_COL = 'anotacoes'
const PAGAMENTOS_TABELA = 'pagamentos'
const ALOCACOES_TABELA = 'pagamento_alocacoes'

function isMissingTable(error) {
  if (!error) return false
  if (error.code === 'PGRST116' || error.status === 404 || error.code === '42P01') return true
  const msg = (error.message || '').toLowerCase()
  return msg.includes('could not find the table') || msg.includes('does not exist')
}


function isMissingColumn(error) {
  if (!error) return false
  if (error.code === '42703') return true
  const msg = (error.message || '').toLowerCase()
  return msg.includes('column') && msg.includes('does not exist')
}

function normalizeTextoUpper(value) {
  if (value === null || value === undefined) return null
  const texto = String(value)
  return texto ? texto.toUpperCase() : null
}

function normalizeDataTransacao(value) {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return new Date().toISOString()
    return value.toISOString()
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

function buildUtcRangeForLocalDate(dateISO) {
  const base = qDate.extractDate(dateISO, 'YYYY-MM-DD') || new Date()
  const start = new Date(base.getTime())
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getTime())
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

async function queryPagamentosPorTransacao(transacaoId) {
  const { data, error } = await supabase
    .from(PAGAMENTOS_TABELA)
    .select('id, estornado')
    .eq('origem_transacao_id', transacaoId)
  if (error) {
    if (isMissingTable(error)) return { registros: [], coluna: null }
    throw error
  }
  return { registros: data || [], coluna: 'origem_transacao_id' }
}

async function deletePagamentosPorIds(ids) {
  if (!ids?.length) return
  const { error } = await supabase.from(PAGAMENTOS_TABELA).delete().in('id', ids)
  if (error && !isMissingTable(error)) throw error
}

async function syncPagamentoCliente({ transacaoId }) {
  if (!transacaoId) return
  try {
    const { error } = await supabase.from(ALOCACOES_TABELA).select('id').limit(1)
    if (!error) return
    if (!isMissingTable(error)) throw error
  } catch (error) {
    if (!isMissingTable(error)) throw error
  }
  try {
    // Vendas pagas nao devem gerar lancamentos adicionais em pagamentos
    const { registros } = await queryPagamentosPorTransacao(transacaoId)
    const idsParaExcluir = (registros || []).map((p) => p.id).filter(Boolean)
    if (!idsParaExcluir.length) return
    await deletePagamentosPorIds(idsParaExcluir)
  } catch (error) {
    if (isMissingTable(error)) return
    throw error
  }
}

function mapItensPayload(transacaoId, itens) {
  return (itens || []).map((it) => ({
    transacao_id: transacaoId,
    produto_id: it.produto_id ?? null,
    quantidade: Number(it.quantidade || 1),
    preco_unitario_congelado: Number(it.preco_unitario_congelado || 0),
    nome_produto_congelado: normalizeTextoUpper(it.nome_produto_congelado) || null,
  }))
}

async function vincularTransacaoAoCaixa(transacaoId, dataTransacao) {
  if (!transacaoId) return
  const referencia = dataTransacao ? new Date(dataTransacao) : new Date()
  if (Number.isNaN(referencia.getTime())) return
  const dataLocal = qDate.formatDate(referencia, 'YYYY-MM-DD')
  let caixaAberto = null
  try {
    let tentativa = await supabase
      .from('caixa_operacoes')
      .select('id, status, data_movimento, data_local, timestamp_abertura')
      .eq('status', 'ABERTO')
      .eq('data_movimento', dataLocal)
      .order('timestamp_abertura', { ascending: false })
      .limit(1)
    if (tentativa.error) {
      if (!isMissingTable(tentativa.error) && !isMissingColumn(tentativa.error)) throw tentativa.error
    } else {
      caixaAberto = tentativa.data?.[0] || null
    }

    if (!caixaAberto) {
      tentativa = await supabase
        .from('caixa_operacoes')
        .select('id, status, data_movimento, data_local, timestamp_abertura')
        .eq('status', 'ABERTO')
        .eq('data_local', dataLocal)
        .order('timestamp_abertura', { ascending: false })
        .limit(1)
      if (tentativa.error) {
        if (isMissingTable(tentativa.error) || isMissingColumn(tentativa.error)) return
        throw tentativa.error
      }
      caixaAberto = tentativa.data?.[0] || null
    }

    if (!caixaAberto) return

    const { error: updateError } = await supabase
      .from('transacoes')
      .update({ caixa_operacao_id: caixaAberto.id })
      .eq('id', transacaoId)
    if (updateError && !isMissingColumn(updateError)) throw updateError
  } catch (error) {
    if (isMissingTable(error) || isMissingColumn(error)) return
    throw error
  }
}

// ---------- READ ----------
export async function listarTransacoesPorDia(dataISO) {
  const { start, end } = buildUtcRangeForLocalDate(dataISO)
  const { data, error } = await supabase
    .from('transacoes')
    .select('*, clientes ( id, nome )')
    .gte('data_transacao', start)
    .lt('data_transacao', end)
    .order('data_transacao', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listarItens(transacaoId) {
  const { data, error } = await supabase
    .from('itens_transacao')
    .select('*')
    .eq('transacao_id', transacaoId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ---------- WRITE ----------
export async function criarTransacaoComItens({
  cliente_id,
  nome_cliente_avulso,
  nome_funcionario_empresa,
  forma_pagamento,
  status_pagamento,
  itens,
  data_transacao,
  observacoes,
}) {
  const valor = (itens ?? []).reduce(
    (acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario_congelado),
    0,
  )
  const anotacoesPayload = observacoes ? { [ANOTACOES_COL]: normalizeTextoUpper(observacoes) } : {}
  const payload = {
    cliente_id: cliente_id ?? null,
    nome_cliente_avulso: normalizeTextoUpper(nome_cliente_avulso),
    nome_funcionario_empresa: normalizeTextoUpper(nome_funcionario_empresa),
    data_transacao: normalizeDataTransacao(data_transacao),
    forma_pagamento: status_pagamento === 'PAGO' ? forma_pagamento ?? null : null,
    status_pagamento: status_pagamento ?? 'PENDENTE',
    valor,
    ...anotacoesPayload,
  }

  const { data: transacao, error: insertError } = await supabase
    .from('transacoes')
    .insert([payload])
    .select()
    .single()
  if (insertError) throw insertError

  try {
    if (itens?.length) {
      const itensPayload = mapItensPayload(transacao.id, itens)
      const { error: itensError } = await supabase.from('itens_transacao').insert(itensPayload)
      if (itensError) throw itensError
    }

    await syncPagamentoCliente({ transacaoId: transacao.id })

    await vincularTransacaoAoCaixa(transacao.id, transacao.data_transacao)

    return transacao
  } catch (error) {
    await supabase.from('itens_transacao').delete().eq('transacao_id', transacao.id)
    await supabase.from('transacoes').delete().eq('id', transacao.id)
    throw error
  }
}

export async function atualizarTransacaoComItens(transacaoId, {
  cliente_id,
  nome_cliente_avulso,
  nome_funcionario_empresa,
  data_transacao,
  forma_pagamento,
  status_pagamento,
  itens,
  observacoes,
}, itensOriginais = []) {
  const valor = (itens ?? []).reduce(
    (acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario_congelado),
    0,
  )
  const statusFinal = status_pagamento ?? 'PENDENTE'
  const formaFinal = statusFinal === 'PAGO' ? forma_pagamento ?? null : null
  const anotacoesPayload = observacoes !== undefined ? { [ANOTACOES_COL]: normalizeTextoUpper(observacoes) } : {}

  const updatePayload = {
    cliente_id: cliente_id ?? null,
    nome_cliente_avulso: normalizeTextoUpper(nome_cliente_avulso),
    nome_funcionario_empresa: normalizeTextoUpper(nome_funcionario_empresa),
    forma_pagamento: formaFinal,
    status_pagamento: statusFinal,
    valor,
    ...anotacoesPayload,
  }
  if (data_transacao) {
    updatePayload.data_transacao = normalizeDataTransacao(data_transacao)
  }

  const { data: transacao, error } = await supabase
    .from('transacoes')
    .update(updatePayload)
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error

  const backupPayload = mapItensPayload(transacaoId, itensOriginais)
  const novosItensPayload = mapItensPayload(transacaoId, itens)

  try {
    const { error: deleteError } = await supabase
      .from('itens_transacao')
      .delete()
      .eq('transacao_id', transacaoId)
    if (deleteError) throw deleteError

    if (novosItensPayload.length) {
      const { error: insertError } = await supabase
        .from('itens_transacao')
        .insert(novosItensPayload)
      if (insertError) throw insertError
    }
  } catch (err) {
    if (backupPayload.length) {
      await supabase.from('itens_transacao').insert(backupPayload)
    }
    throw err
  }

  await syncPagamentoCliente({ transacaoId })

  await vincularTransacaoAoCaixa(transacao.id, transacao.data_transacao)

  return transacao
}

export async function excluirTransacao(transacaoId) {
  const { data, error } = await supabase
    .from('transacoes')
    .update({
      status_pagamento: 'CANCELADA',
      forma_pagamento: null,
      status_preparo: 'CANCELADA',
    })
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error

  await syncPagamentoCliente({ transacaoId })

  return data
}

export async function excluirTransacaoDefinitiva(transacaoId) {
  if (!transacaoId) return null

  const { data: transacao, error } = await supabase
    .from('transacoes')
    .select('*')
    .eq('id', transacaoId)
    .single()
  if (error) {
    if (isMissingTable(error) || error.code === 'PGRST116') return null
    throw error
  }

  const { registros: pagamentos } = await queryPagamentosPorTransacao(transacaoId)
  await deletePagamentosPorIds((pagamentos || []).map((p) => p.id))

  const { error: itensError } = await supabase
    .from('itens_transacao')
    .delete()
    .eq('transacao_id', transacaoId)
  if (itensError && !isMissingTable(itensError)) throw itensError

  const { error: transacaoError } = await supabase
    .from('transacoes')
    .delete()
    .eq('id', transacaoId)
  if (transacaoError) throw transacaoError

  return transacao
}

export async function marcarPago(transacaoId, forma_pagamento) {
  const { data, error } = await supabase
    .from('transacoes')
    .update({ status_pagamento: 'PAGO', forma_pagamento })
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error
  await syncPagamentoCliente({ transacaoId })
  return data
}

export async function marcarNaoPago(transacaoId) {
  const { data, error } = await supabase
    .from('transacoes')
    .update({ status_pagamento: 'PENDENTE', forma_pagamento: null })
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error
  await syncPagamentoCliente({ transacaoId })
  return data
}

export async function marcarNaoInformado(transacaoId) {
  const { data, error } = await supabase
    .from('transacoes')
    .update({ status_pagamento: 'NAO_INFORMADO', forma_pagamento: null })
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error
  await syncPagamentoCliente({ transacaoId })
  return data
}


export async function definirFormaPagamento(transacaoId, forma_pagamento) {
  const { data, error } = await supabase
    .from('transacoes')
    .update({ forma_pagamento })
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error
  await syncPagamentoCliente({ transacaoId })
  return data
}

export async function setPronto(transacaoId, pronto) {
  const patch = { status_preparo: pronto ? 'PRONTO' : 'PENDENTE' }
  const { data, error } = await supabase
    .from('transacoes')
    .update(patch)
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function estornarTransacao(transacaoId, motivo = null) {
  const anotacoes = motivo ? { [ANOTACOES_COL]: normalizeTextoUpper(motivo) } : {}
  const { data, error } = await supabase
    .from('transacoes')
    .update({ status_pagamento: 'CANCELADA', forma_pagamento: null, ...anotacoes })
    .eq('id', transacaoId)
    .select()
    .single()
  if (error) throw error
  await syncPagamentoCliente({ transacaoId })
  return data
}

// ---------- REALTIME ----------
export function subscribeRealtime({ onTransacao, onItem }) {
  const channel = supabase
    .channel('caderno-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, (payload) =>
      onTransacao?.(payload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_transacao' }, (payload) =>
      onItem?.(payload),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

