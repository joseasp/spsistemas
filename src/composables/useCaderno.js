import { ref, computed, watch } from 'vue'
import { date as qDate } from 'quasar'
import * as caderno from 'src/services/cadernoService'

const carregouDia = ref(false)
const carregandoDia = ref(false)
let unsubscribe = null

export function useCaderno(externalDateRef) {
  const dataISO = externalDateRef ?? ref(qDate.formatDate(new Date(), 'YYYY-MM-DD'))
  if (externalDateRef && !externalDateRef.value) {
    externalDateRef.value = qDate.formatDate(new Date(), 'YYYY-MM-DD')
  }

  const transacoes = ref([])
  const itensPorTransacao = ref({})
  const selecionadaId = ref(null)

  // --- carregar & realtime
  async function carregarDoDia(force = false) {
    if (carregandoDia.value) return
    if (force) {
      carregouDia.value = false
    } else if (carregouDia.value) {
      return
    }
    carregandoDia.value = true
    try {
      const data = await caderno.listarTransacoesPorDia(dataISO.value)
      transacoes.value = sortByDate(normalizeTransacoes(data ?? []))
      carregouDia.value = true
      if (!unsubscribe) {
        unsubscribe = caderno.subscribeRealtime({
          onTransacao: handleTransacaoChange,
          onItem: handleItemChange,
        })
      }
    } catch (error) {
      carregouDia.value = false
      throw error
    } finally {
      carregandoDia.value = false
    }
  }

  async function carregarItens(transacaoId) {
    itensPorTransacao.value[transacaoId] = await caderno.listarItens(transacaoId)
  }

  // --- criar pedido
  async function criarPedido({
    cliente_id,
    nome_cliente_avulso,
    nome_funcionario_empresa,
    pago,
    forma_pagamento,
    itens,
    observacoes,
  }) {
    const status_pagamento = pago ? 'PAGO' : 'PENDENTE'
    const data_transacao = buildDataTransacaoISO(dataISO.value)
    const t = await caderno.criarTransacaoComItens({
      cliente_id,
      nome_cliente_avulso,
      nome_funcionario_empresa: nome_funcionario_empresa || null,
      forma_pagamento: pago ? (forma_pagamento ?? null) : null,
      status_pagamento,
      data_transacao,
      itens,
      observacoes,
    })
    const normalizado = normalizeTransacao(t)
    if (cliente_id) {
      normalizado.cliente_id = normalizado.cliente_id ?? cliente_id
      if (!normalizado.clientes) {
        normalizado.clientes = { id: cliente_id }
      }
      normalizado.nome_cliente_avulso = null
    } else {
      normalizado.nome_cliente_avulso = nome_cliente_avulso ?? normalizado.nome_cliente_avulso ?? null
    }
    const semDuplicados = transacoes.value.filter((item) => item.id !== normalizado.id)
    transacoes.value = sortByDate([...semDuplicados, normalizado])
    selecionadaId.value = t.id
  }
  async function atualizarTransacaoExistente(transacaoAlvo, payload) {
    if (!transacaoAlvo?.id) throw new Error('Transacao invalida')
    const itensOriginais = itensPorTransacao.value[transacaoAlvo.id] || []
    const status_pagamento = payload.pago ? 'PAGO' : 'PENDENTE'
    const atualizada = await caderno.atualizarTransacaoComItens(
      transacaoAlvo.id,
      {
        cliente_id: payload.cliente_id,
        nome_cliente_avulso: payload.nome_cliente_avulso,
        nome_funcionario_empresa: payload.nome_funcionario_empresa,
        forma_pagamento: payload.forma_pagamento,
        status_pagamento,
        itens: payload.itens,
        observacoes: payload.observacoes,
      },
      itensOriginais,
    )
    const normalizado = normalizeTransacao(atualizada)
    if (payload.cliente_id) {
      normalizado.cliente_id = normalizado.cliente_id ?? payload.cliente_id
      if (!normalizado.clientes) {
        normalizado.clientes = { id: payload.cliente_id }
      }
      normalizado.nome_cliente_avulso = null
    } else {
      normalizado.nome_cliente_avulso =
        payload.nome_cliente_avulso ?? normalizado.nome_cliente_avulso ?? null
    }
    transacoes.value = sortByDate(
      transacoes.value.map((t) => (t.id === normalizado.id ? normalizado : t)),
    )
    await carregarItens(normalizado.id)
    return normalizado
  }

  async function removerTransacaoExistente(transacaoAlvo) {
    if (!transacaoAlvo?.id) return
    // Em vez de remover definitivamente, marcamos como CANCELADA para auditoria
    const atualizada = await caderno.excluirTransacao(transacaoAlvo.id)
    const normalizada = normalizeTransacao(atualizada)
    transacoes.value = transacoes.value.map((t) => (t.id === normalizada.id ? normalizada : t))
  }

  async function excluirTransacaoDefinitiva(transacaoAlvo) {
    if (!transacaoAlvo?.id) return
    await caderno.excluirTransacaoDefinitiva(transacaoAlvo.id)
    transacoes.value = transacoes.value.filter((t) => t.id !== transacaoAlvo.id)
    delete itensPorTransacao.value[transacaoAlvo.id]
    if (selecionadaId.value === transacaoAlvo.id) {
      selecionadaId.value = null
    }
  }

  // --- toggles
  async function togglePago(transacao) {
    if (!transacao) return
    if (!transacao.cliente_id) return
    const indoParaPago = transacao.status_pagamento !== 'PAGO'
    const statusAnterior = transacao.status_pagamento
    const formaAnterior = transacao.forma_pagamento
    const uiAnterior = transacao._uiPago

    transacao.status_pagamento = indoParaPago ? 'PAGO' : 'PENDENTE'
    transacao.forma_pagamento = indoParaPago ? (formaAnterior ?? null) : null
    transacao._uiPago = transacao.status_pagamento === 'PAGO'

    try {
      const atualizado = indoParaPago
        ? await caderno.marcarPago(transacao.id, transacao.forma_pagamento ?? null)
        : await caderno.marcarNaoPago(transacao.id)
      const normalizado = normalizeTransacao(atualizado)
      transacao.status_pagamento = normalizado.status_pagamento
      transacao.forma_pagamento = normalizado.forma_pagamento
      transacao._uiPago = normalizado._uiPago
    } catch (error) {
      transacao.status_pagamento = statusAnterior
      transacao.forma_pagamento = formaAnterior
      transacao._uiPago = uiAnterior ?? (statusAnterior === 'PAGO')
      throw error
    }
  }

  async function togglePronto(transacao, novoValor) {
    if (!transacao) return
    const antigo = transacao.pronto
    transacao.pronto = novoValor // otimista
    try {
      await caderno.setPronto(transacao.id, novoValor)
    } catch (e) {
      transacao.pronto = antigo // rollback
      throw e
    }
  }

  async function setFormaPagamento(transacao, forma) {
    if (!transacao) return
    const antiga = transacao.forma_pagamento
    transacao.forma_pagamento = forma // otimista
    try {
      await caderno.definirFormaPagamento(transacao.id, forma)
    } catch (e) {
      transacao.forma_pagamento = antiga
      throw e
    }
  }
  async function estornar(transacao, motivo) {
    await caderno.estornarTransacao(transacao.id, motivo)
  }

  // --- derivadas
  const pendentes = computed(() =>
    transacoes.value.filter((t) => !t.pronto && t.status_pagamento !== 'CANCELADA'),
  )
  const prontos = computed(() =>
    transacoes.value.filter((t) => t.pronto && t.status_pagamento !== 'CANCELADA'),
  )
  const cancelados = computed(() =>
    transacoes.value.filter((t) => t.status_pagamento === 'CANCELADA'),
  )

  const totalPedidos = computed(() => transacoes.value.filter((t) => t.status_pagamento !== 'CANCELADA').length)
  const valorTotalDia = computed(() =>
    transacoes.value
      .filter((t) => t.status_pagamento !== 'CANCELADA')
      .reduce((acc, t) => acc + Number(t.valor || 0), 0),
  )

  // realtime handlers
  function handleTransacaoChange({ eventType, new: novo, old: antigo }) {
    if (eventType === 'INSERT' && novo) {
      const normalizado = normalizeTransacao(novo)
      transacoes.value = sortByDate([
        ...transacoes.value.filter((t) => t.id !== normalizado.id),
        normalizado,
      ])
    }
    if (eventType === 'UPDATE' && novo) {
      const normalizado = normalizeTransacao(novo)
      transacoes.value = sortByDate(
        transacoes.value.map((t) => (t.id === normalizado.id ? normalizado : t)),
      )
    }
    if (eventType === 'DELETE' && antigo) {
      transacoes.value = transacoes.value.filter((t) => t.id !== antigo.id)
      delete itensPorTransacao.value[antigo.id]
    }
  }
  function handleItemChange({ eventType, new: novo, old: antigo }) {
    const transacaoId = novo?.transacao_id ?? antigo?.transacao_id
    if (!transacaoId) return
    const atuais = itensPorTransacao.value[transacaoId] ?? []
    if (eventType === 'INSERT' && novo) itensPorTransacao.value[transacaoId] = [...atuais, novo]
    if (eventType === 'UPDATE' && novo)
      itensPorTransacao.value[transacaoId] = atuais.map((item) =>
        item.id === novo.id ? novo : item,
      )
    if (eventType === 'DELETE' && antigo)
      itensPorTransacao.value[transacaoId] = atuais.filter((item) => item.id !== antigo.id)
  }

  function buildDataTransacaoISO(targetDateISO) {
    const parsed = targetDateISO ? qDate.extractDate(targetDateISO, 'YYYY-MM-DD') : null
    const now = new Date()
    const base = parsed ? new Date(parsed.getTime()) : new Date(now.getTime())
    base.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    return base.toISOString()
  }

  function sortByDate(arr) {
    return [...arr].sort((a, b) => new Date(a.data_transacao) - new Date(b.data_transacao))
  }

  function normalizeTransacoes(lista) {
    return lista.map((item) => normalizeTransacao(item))
  }

  function normalizeTransacao(transacao) {
    if (!transacao) return transacao
    const anotacoes = transacao.anotacoes ?? transacao.observacoes ?? null
    const pronto =
      transacao.status_preparo != null
        ? transacao.status_preparo === 'PRONTO'
        : Boolean(transacao.pronto)
    return {
      ...transacao,
      anotacoes,
      observacoes: anotacoes,
      pronto,
      _uiPago: transacao.status_pagamento === 'PAGO',
    }
  }

  watch(dataISO, () => {
    carregouDia.value = false
    carregarDoDia(true)
  })

  return {
    dataISO,
    transacoes,
    pendentes,
    prontos,
    cancelados,
    itensPorTransacao,
    selecionadaId,
    totalPedidos,
    valorTotalDia,
    carregandoDia,
    carregarDoDia,
    carregarItens,
    criarPedido,
    atualizarTransacao: atualizarTransacaoExistente,
    removerTransacao: removerTransacaoExistente,
    excluirTransacaoDefinitiva,
    togglePago,
    togglePronto,
    setFormaPagamento,
    estornar,
  }
}


