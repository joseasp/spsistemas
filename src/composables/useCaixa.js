import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from 'src/supabaseClient'
import * as caixa from 'src/services/caixaService'

export function useCaixa(diaRef) {
  const dia = diaRef || ref(new Date().toISOString().slice(0, 10))

  const caixaDoDia = ref(null)
  const pendenciasForma = ref([])
  const vendasSemForma = ref([])
  const esperadoPorForma = ref({})
  const ZERO_FORMAS = { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0, OUTRO: 0 }
  const carregando = ref(false)

  const status = computed(() => caixaDoDia.value?.status || 'FECHADO')
  const aberto = computed(() => status.value === 'ABERTO')
  const fechado = computed(() => status.value === 'FECHADO')

  async function recarregar() {
    carregando.value = true
    try {
      const atual = await caixa.obterCaixaDoDia(dia.value)
      caixaDoDia.value = atual
      const [pendencias, vendas, esperado] = await Promise.all([
        caixa.listarPagamentosSemForma(dia.value),
        caixa.listarVendasPagasSemForma({ data_local: dia.value, caixa_id: atual?.id || null }),
        caixa.calcularEsperadoPorForma(dia.value)
      ])
      pendenciasForma.value = pendencias
      vendasSemForma.value = vendas
      esperadoPorForma.value = esperado
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      pendenciasForma.value = []
      vendasSemForma.value = []
      esperadoPorForma.value = { ...ZERO_FORMAS }
    } finally {
      carregando.value = false
    }
  }

  async function abrir({ responsavel, valor_abertura }) {
    const resultado = await caixa.abrirCaixa({
      data_local: dia.value,
      responsavel,
      valor_abertura
    })
    caixaDoDia.value = resultado
  }

  async function fechar({ responsavel, contado_por_forma, observacoes }) {
    const resultado = await caixa.fecharCaixa({
      caixa_id: caixaDoDia.value.id,
      data_local: dia.value,
      responsavel,
      contado_por_forma,
      total_operacoes_dinheiro: 0,
      observacoes
    })
    caixaDoDia.value = resultado
  }

  async function reabrir({ responsavel, valor_abertura = null }) {
    const resultado = await caixa.reabrirCaixa({
      caixa_id: caixaDoDia.value.id,
      responsavel,
      valor_abertura,
    })
    caixaDoDia.value = resultado
  }

  let unsub = null
  function bindRealtime() {
    if (unsub) return
    const channel = supabase
      .channel('caixa-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, () => {
        recarregar()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => {
        // Mudanças em transações podem alterar esperado por forma (quando status_pagamento muda)
        recarregar()
      })
      .subscribe()
    unsub = () => {
      supabase.removeChannel(channel)
      unsub = null
    }
  }

  function unbindRealtime() {
    if (unsub) {
      const fn = unsub
      unsub = null
      fn()
    }
  }

  watch(dia, () => {
    recarregar()
  }, { immediate: true })

  onMounted(() => {
    bindRealtime()
  })

  onBeforeUnmount(() => {
    unbindRealtime()
  })

  return {
    dia,
    caixaDoDia,
    status,
    aberto,
    fechado,
    pendenciasForma,
    vendasSemForma,
    esperadoPorForma,
    carregando,
    recarregar,
    abrir,
    fechar,
    reabrir
  }
}
