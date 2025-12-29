import { supabase } from 'src/supabaseClient'

const FORMAS = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTRO']
const zeroPorForma = () => Object.fromEntries(FORMAS.map((f) => [f, 0]))

function intervaloUTC(data_local) {
  const start = new Date(`${data_local}T00:00:00-03:00`)
  const end = new Date(`${data_local}T23:59:59.999-03:00`)
  return { start: start.toISOString(), end: end.toISOString() }
}
function isMissingTable(err) {
  return (
    err?.status === 404 ||
    /Could not find the table/i.test(err?.message || '') ||
    /schema cache/i.test(err?.message || '')
  )
}
function isMissingColumn(err) {
  return err?.code === '42703' || /column .* does not exist/i.test(err?.message || '')
}
function toNumber(v) {
  if (typeof v === 'string') v = v.replace(',', '.')
  const n = Number(v)
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
}

// ---------------- Leitura do estado ----------------
export async function obterCaixaDoDia(data_local) {
  // teu schema atual
  let r = await supabase
    .from('caixa_operacoes')
    .select('*')
    .eq('data_movimento', data_local)
    .order('timestamp_abertura', { ascending: false })
    .limit(1)
  if (r.error) throw r.error
  if (r.data?.length) return r.data[0]

  // fallback opcional (se existir data_local)
  try {
    r = await supabase
      .from('caixa_operacoes')
      .select('*')
      .eq('data_local', data_local)
      .order('timestamp_abertura', { ascending: false })
      .limit(1)
    if (r.error) throw r.error
    return r.data?.[0] || null
  } catch (e) {
    if (isMissingColumn(e)) return null
    throw e
  }
}

// Pagamentos sem forma â€” tolera ausÃªncia de tabela/coluna
export async function listarPagamentosSemForma(data_local) {
  if (!data_local) return []

  const { start, end } = intervaloUTC(data_local)
  let tentativa = await supabase
    .from('pagamentos')
    .select('id, cliente_id, valor, forma_pagamento, origem_transacao_id, data_pagamento, estornado')
    .is('forma_pagamento', null)
    .gte('data_pagamento', start)
    .lt('data_pagamento', end)
    .order('data_pagamento', { ascending: true })

  if (tentativa.error) {
    if (isMissingTable(tentativa.error)) return []
    if (isMissingColumn(tentativa.error)) return []
    throw tentativa.error
  }

  const registros = (tentativa.data || []).filter((p) => !p.estornado)

  return registros.map((p) => ({
    id: p.id,
    cliente_id: p.cliente_id,
    valor: p.valor,
    data_local,
    origem_transacao_id: p.origem_transacao_id || null,
  }))
}

export async function listarVendasPagasSemForma({ data_local, caixa_id = null }) {
  if (!data_local) return []

  const { start, end } = intervaloUTC(data_local)
  let query = supabase
    .from('transacoes')
    .select('id, valor, data_local, data_transacao, forma_pagamento, status_pagamento, caixa_operacao_id')
    .eq('status_pagamento', 'PAGO')
    .is('forma_pagamento', null)
    .gte('data_transacao', start)
    .lt('data_transacao', end)

  if (caixa_id) {
    query = query.eq('caixa_operacao_id', caixa_id)
  }

  let tentativa = await query
  if (tentativa.error) {
    if (isMissingTable(tentativa.error)) return []
    if (isMissingColumn(tentativa.error)) {
      tentativa = await supabase
        .from('transacoes')
        .select('id, valor, data_local, forma_pagamento, status_pagamento, caixa_operacao_id')
        .eq('status_pagamento', 'PAGO')
        .is('forma_pagamento', null)
        .eq('data_local', data_local)
      if (isMissingTable(tentativa.error)) return []
      if (tentativa.error) throw tentativa.error
    } else {
      throw tentativa.error
    }
  }

  return (tentativa.data || []).map((row) => ({
    id: row.id,
    valor: row.valor,
    data_local: row.data_local ?? data_local,
    caixa_operacao_id: row.caixa_operacao_id || null,
  }))
}

// Totais esperados por forma â€” idem
async function calcularEsperadoPorFormaViaPagamentos(data_local) {
  const { start, end } = intervaloUTC(data_local)
  let tentativa = await supabase
    .from('pagamentos')
    .select('forma_pagamento, valor, data_pagamento, estornado')
    .not('forma_pagamento', 'is', null)
    .gte('data_pagamento', start)
    .lt('data_pagamento', end)
    .order('data_pagamento', { ascending: true })

  if (tentativa.error) {
    if (isMissingTable(tentativa.error)) return zeroPorForma()
    if (isMissingColumn(tentativa.error)) return zeroPorForma()
    throw tentativa.error
  }

  const registros = tentativa.data || []
  const porForma = zeroPorForma()
  for (const r of registros) {
    const f = r.forma_pagamento
    if (!f) continue
    if (r.estornado) continue
    const v = toNumber(r.valor)
    porForma[f] = (porForma[f] || 0) + v
  }
  return porForma
}



export async function calcularEsperadoPorForma(data_local) {
  const totais = zeroPorForma()
  if (!data_local) return totais

  try {
    const { start, end } = intervaloUTC(data_local)
    const { data, error } = await supabase
      .from('transacoes')
      .select('forma_pagamento, valor, status_pagamento')
      .gte('data_transacao', start)
      .lt('data_transacao', end)
    if (error) throw error

    for (const row of data || []) {
      if (row.status_pagamento !== 'PAGO') continue
      const formaBase = row.forma_pagamento
      if (!formaBase) continue
      const forma = FORMAS.includes(formaBase) ? formaBase : 'OUTRO'
      const valor = toNumber(row.valor)
      totais[forma] = Number((totais[forma] + valor).toFixed(2))
    }

    return totais
  } catch (error) {
    if (!isMissingTable(error) && !isMissingColumn(error)) throw error
  }

  return calcularEsperadoPorFormaViaPagamentos(data_local)
}

export async function calcularOperacoesDinheiro(data_local) {
  if (!data_local) return 0

  const { start, end } = intervaloUTC(data_local)

  let tentativa = await supabase
    .from('pagamentos')
    .select('valor, forma_pagamento, origem_transacao_id, estornado, data_pagamento')
    .eq('forma_pagamento', 'DINHEIRO')
    .is('origem_transacao_id', null)
    .gte('data_pagamento', start)
    .lt('data_pagamento', end)
    .order('data_pagamento', { ascending: true })

  if (tentativa.error) {
    if (isMissingTable(tentativa.error)) return 0
    if (isMissingColumn(tentativa.error)) return 0
    throw tentativa.error
  }

  const registros = tentativa.data || []
  let total = 0
  for (const item of registros) {
    if (item?.estornado) continue
    total += toNumber(item?.valor || 0)
  }
  return Number(total.toFixed(2))
}





// ---------------- Abrir, Fechar, Reabrir ----------------
export async function abrirCaixa({ data_local, responsavel, valor_abertura }) {
  const payloadBase = {
    data_movimento: data_local, // NOT NULL no seu schema
    status: 'ABERTO',
    valor_abertura: toNumber(valor_abertura),
    nome_responsavel_abertura: responsavel || null,
    timestamp_abertura: new Date().toISOString()
  }

  // 1ª tentativa: com data_local (se a coluna existir)
  let { data, error } = await supabase
    .from('caixa_operacoes')
    .insert([{ ...payloadBase, data_local }])
    .select()
    .single()

  if (error) {
    if (isMissingColumn(error)) {
      // 2ª tentativa: sem data_local (schema antigo)
      const r2 = await supabase
        .from('caixa_operacoes')
        .insert([payloadBase])
        .select()
        .single()
      if (r2.error) throw r2.error
      return r2.data
    }
    throw error
  }
  return data
}
export async function fecharCaixa({
  caixa_id,
  data_local,
  responsavel,
  contado_por_forma = {},
  observacoes = null,
  total_operacoes_dinheiro = 0,
}) {
  // 1) pendências
  const pendencias = await listarPagamentosSemForma(data_local)
  if (pendencias.length) {
    const err = new Error('Ha pagamentos do periodo sem forma cadastrada.')
    err.code = 'FORMA_PENDENTE'
    err.payload = pendencias
    throw err
  }

  const vendasSemForma = await listarVendasPagasSemForma({ data_local, caixa_id })
  if (vendasSemForma.length) {
    const err = new Error('Ha vendas pagas sem forma definida.')
    err.code = 'VENDA_PAGA_SEM_FORMA'
    err.payload = vendasSemForma
    throw err
  }
  // 2) esperado (só vendas por forma)
  const esperado = await calcularEsperadoPorForma(data_local)
  const operacoesDinheiro = toNumber(total_operacoes_dinheiro || 0)

  // 3) normalizar contado
  const contado = {}
  for (const f of FORMAS) contado[f] = toNumber(contado_por_forma[f])

  // 4) diferenças por forma + total em dinheiro
  const diferenca = {}
  for (const f of FORMAS) {
    const esp = toNumber(esperado[f] || 0)
    const cnt = contado[f]
    diferenca[f] = Number((cnt - esp).toFixed(2))
  }

  const totalEsperadoDinheiro = toNumber(esperado.DINHEIRO || 0)
  const totalContadoDinheiro = toNumber(contado.DINHEIRO || 0)

  // OBS: Abertura e operações em dinheiro compõem o esperado total de caixa físico
  const caixa = await obterCaixaDoDia(data_local)
  const abertura = toNumber(caixa?.valor_abertura || 0)
  const esperadoTotal = Number((abertura + totalEsperadoDinheiro + operacoesDinheiro).toFixed(2))
  const valorContadoRegistrado = Number(totalContadoDinheiro.toFixed(2))
  const diferencaTotal = Number((totalContadoDinheiro - esperadoTotal).toFixed(2))

// 5) update

  const base = {
    status: 'FECHADO',
    timestamp_fechamento: new Date().toISOString(),
    nome_responsavel_fechamento: responsavel || null,
    observacoes: observacoes || null,
  }

  try {
    const { data, error } = await supabase
      .from('caixa_operacoes')
      .update({
        ...base,
        esperado_por_forma: esperado,
        contado_por_forma: contado,
        diferenca_por_forma: diferenca,
        valor_contado: valorContadoRegistrado,
        diferenca_total: diferencaTotal,
        valor_calculado: esperadoTotal,
      })
      .eq('id', caixa_id)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (e) {
    if (!isMissingColumn(e)) throw e
    // fallback: schemas antigos (sem jsonb)
    const { data, error } = await supabase
      .from('caixa_operacoes')
      .update({ ...base, valor_fechamento: valorContadoRegistrado, valor_calculado: esperadoTotal })
      .eq('id', caixa_id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function reabrirCaixa({ caixa_id, responsavel, valor_abertura = null }) {
  const payload = {
    status: 'ABERTO',
    reaberto_at: new Date().toISOString(),
    reaberto_por: responsavel || null,
  }
  if (valor_abertura != null) {
    payload.valor_abertura = toNumber(valor_abertura)
  }

  try {
    const { data, error } = await supabase
      .from('caixa_operacoes')
      .update(payload)
      .eq('id', caixa_id)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    if (!isMissingColumn(error)) throw error
  }

  const fallbackPayload = { status: 'ABERTO' }
  if (valor_abertura != null) {
    fallbackPayload.valor_abertura = toNumber(valor_abertura)
  }

  const { data, error: fallbackError } = await supabase
    .from('caixa_operacoes')
    .update(fallbackPayload)
    .eq('id', caixa_id)
    .select()
    .single()
  if (fallbackError) throw fallbackError
  return data
}

