<template>
  <q-page class="contas-page">
    <div class="contas-page__bg" />

        <div class="contas-page__wrapper">
      <div v-if="isMobile" class="mobile-toggle">
        <q-btn-toggle
          v-model="mobileSection"
          spread
          rounded
          unelevated
          toggle-color="warning"
          color="white"
          text-color="grey-7"
          class="mobile-toggle__buttons"
          :options="mobileToggleOptions"
        />
      </div>

      <div class="row q-col-gutter-xl contas-page__grid">
        <!-- Coluna de clientes -->
        <div
          class="col-12 col-lg-4"
          :class="{ 'mobile-panel': isMobile }"
          v-show="!isMobile || mobileSection === 'clientes'"
        >
          <section class="painel painel--clientes">
            <div class="painel__header">
              <q-input
                v-model="busca"
                dense
                outlined
                rounded
                placeholder="Buscar cliente"
                clearable
                class="painel__buscar"
                :debounce="150"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>

              <div class="painel__filtros">
                <button
                  v-for="opt in filtroOptions"
                  :key="opt.value"
                  class="filtro-btn"
                  :class="{ 'filtro-btn--active': filtroStatus === opt.value }"
                  type="button"
                  @click="filtroStatus = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="painel__lista">
              <q-scroll-area class="painel__scroll">
                <q-list separator>
                  <q-item
                    v-for="c in clientesFiltrados"
                    :key="c.id"
                    clickable
                    :active="clienteSel && clienteSel.id === c.id"
                    @click="selecionar(c)"
                    class="cliente-item"
                    :class="[
                      clienteSel && clienteSel.id === c.id ? 'cliente-item--ativo' : '',
                      'cliente-item--' + statusCliente(c),
                    ]"
                  >
                    <q-item-section>
                      <div class="cliente-item__nome">{{ c.nome }}</div>
                      <div class="cliente-item__saldo" :class="saldoClasse(c.saldo)">
                        Saldo: {{ formatCurrency(c.saldo) }}
                      </div>
                    </q-item-section>
                    <q-item-section side>
                      <span class="cliente-item__badge" :class="'cliente-item__badge--' + statusCliente(c)">
                        {{ etiquetaCliente(c) }}
                      </span>
                    </q-item-section>
                  </q-item>
                </q-list>

                <div v-if="!loadingClientes && !clientesFiltrados.length" class="painel__vazio">
                  Nenhum cliente encontrado.
                </div>
              </q-scroll-area>

              <q-inner-loading :showing="loadingClientes">
                <q-spinner-dots size="32px" color="warning" />
              </q-inner-loading>
            </div>
          </section>
        </div>

        <!-- Coluna de extrato -->
        <div
          class="col-12 col-lg-8"
          :class="{ 'mobile-panel': isMobile }"
          v-show="!isMobile || mobileSection === 'extrato'"
        >
          <section class="painel painel--extrato">
            <div class="painel__topo" :class="{ 'painel__topo--vazio': !clienteSel }">
              <div>
                <div class="painel__cliente">{{ clienteSel?.nome || 'Selecione um cliente' }}</div>
                <div class="painel__saldo" :class="saldoClasse(saldo)">
                  Saldo atual: {{ formatCurrency(clienteSel ? saldo : 0) }}
                </div>
              </div>
              <q-btn
                color="warning"
                unelevated
                class="painel__registrar"
                icon="add_circle"
                label="Registrar Pagamento"
                :disable="!clienteSel"
                @click="abrirPagamento = true"
              />
            </div>

            <div class="painel__tabs">
              <button
                v-for="opt in abaOptions"
                :key="opt.value"
                class="aba-btn"
                :class="{ 'aba-btn--ativa': abasAtivas.includes(opt.value) }"
                type="button"
                @click="toggleAba(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>

            <div class="painel__conteudo">
              <q-inner-loading :showing="loadingExtrato">
                <q-spinner-dots size="40px" color="warning" />
              </q-inner-loading>

              <div v-if="!loadingExtrato && !clienteSel" class="painel__placeholder">
                <q-icon name="person_search" size="48px" class="q-mb-md" />
                <div class="text-subtitle1">Nenhum cliente selecionado</div>
                <div class="text-body2 text-grey-6 q-mt-xs">Escolha um cliente na coluna da esquerda.</div>
              </div>

              <div v-else-if="!loadingExtrato && clienteSel && !extratoAgrupado.length" class="painel__placeholder">
                <q-icon name="receipt_long" size="48px" class="q-mb-md" />
                <div class="text-subtitle1">Nenhum lançamento nesta visualização</div>
                <div class="text-body2 text-grey-6 q-mt-xs">Registre novos pedidos ou pagamentos.</div>
              </div>

              <q-scroll-area v-else class="painel__scroll">
                <div v-for="grupo in extratoAgrupado" :key="grupo.key" class="extrato-grupo">
                  <div class="extrato-grupo__titulo">{{ grupo.label }}</div>

                  <div v-for="linha in grupo.itens" :key="linha.tipo + '-' + linha.id" class="extrato-card">
                    <div class="extrato-card__main">
                      <div class="extrato-card__icone" :class="'extrato-card__icone--' + linhaIcone(linha).tono">
                        <q-icon :name="linhaIcone(linha).icone" size="22px" />
                      </div>

                      <div class="extrato-card__info">
                        <div class="extrato-card__titulo">{{ linhaTitulo(linha) }}</div>
                        <div v-if="linhaDescricao(linha)" class="extrato-card__descricao">
                          {{ linhaDescricao(linha) }}
                        </div>
                        <div class="extrato-card__meta">
                          <q-badge :color="linhaEtiqueta(linha).cor" :text-color="linhaEtiqueta(linha).texto" class="q-mr-sm">
                            {{ linhaEtiqueta(linha).label }}
                          </q-badge>
                          <span v-if="linhaInfoExtra(linha)" class="extrato-card__extra">{{ linhaInfoExtra(linha) }}</span>
                          <span v-if="linhaFuncionario(linha)" class="extrato-card__extra extrato-card__extra--func">Func.: {{ linhaFuncionario(linha) }}</span>
                        </div>
                      </div>

                      <div class="extrato-card__valor" :class="linhaValorClasse(linha)">
                        {{ linhaValorFormatado(linha) }}
                      </div>
                    </div>

                    <div class="extrato-card__acoes">
                      <template v-if="linha.tipo === 'VENDA'">
                        <q-btn
                          size="sm"
                          color="warning"
                          outline
                          icon="payments"
                          class="q-mr-sm"
                          :label="linha.status_pagamento === 'PAGO' ? 'Marcar não pago' : 'Marcar pago'"
                          @click="linha.status_pagamento === 'PAGO' ? marcarVendaNaoPagaConfirm(linha) : escolherForma(linha)"
                        />
                        <q-btn
                          size="sm"
                          color="primary"
                          flat
                          icon="list_alt"
                          label="Detalhes"
                          @click="abrirPedido(linha)"
                        />
                      </template>
                      <template v-else>
                        <q-btn
                          v-if="!linha.estornado"
                          size="sm"
                          color="negative"
                          flat
                          icon="undo"
                          label="Estornar"
                          class="q-mr-sm"
                          @click="onEstornar(linha)"
                        />
                        <q-btn
                          size="sm"
                          color="primary"
                          flat
                          icon="info"
                          label="Detalhes"
                          @click="abrirDetalhePagamento(linha)"
                        />
                      </template>
                    </div>
                  </div>
                </div>
              </q-scroll-area>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Modais -->
    <RegistrarPagamentoDialog
      v-model="abrirPagamento"
      :formas="FORMAS"
      :cliente="clienteSel?.nome || ''"
      @salvar="onSalvarPagamento"
    />
    <DetalhePagamentoDialog ref="detalhePagamentoRef" />
    <DetalhePedidoDialog ref="detalhePedidoRef" />
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { solicitarSenha } from 'src/security/passgate'
import { useContasReceber } from 'src/composables/useContasReceber'
import RegistrarPagamentoDialog from 'src/components/contas/RegistrarPagamentoDialog.vue'
import DetalhePagamentoDialog from 'src/components/contas/DetalhePagamentoDialog.vue'
import DetalhePedidoDialog from 'src/components/contas/DetalhePedidoDialog.vue'

const filtroOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'devendo', label: 'Devendo' },
  { value: 'quitado', label: 'Quitado' },
  { value: 'credito', label: 'Crédito' },
]

const abaOptions = [
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'pagas', label: 'Pagas' },
  { value: 'pagamentos', label: 'Pagamentos' },
]

const {
  FORMAS,
  busca,
  filtroStatus,
  clientesFiltrados,
  clienteSel,
  extrato,
  itensPorVenda,
  saldo,
  carregarClientes,
  carregarExtrato,
  carregarItens,
  startRealtime,
  registrarPagamento,
  marcarVendaPaga,
  marcarVendaNaoPaga,
  estornarPagamento,
  loadingClientes,
  loadingExtrato,
} = useContasReceber()

const $q = useQuasar()
const isMobile = computed(() => $q.screen.lt.md)
const mobileSection = ref('clientes')
const mobileToggleOptions = [
  { label: 'Clientes', value: 'clientes' },
  { label: 'Extrato', value: 'extrato' },
]

onMounted(async () => {
  await carregarClientes()
  await carregarExtrato()
  await startRealtime()
})

const abasAtivas = ref(abaOptions.map((opt) => opt.value))
const abrirPagamento = ref(false)
const detalhePagamentoRef = ref(null)
const detalhePedidoRef = ref(null)
const carregandoItens = ref({})

watch(isMobile, (novo) => {
  if (!novo) {
    mobileSection.value = 'clientes'
  }
})

watch(
  () => clienteSel.value,
  (novo) => {
    if (isMobile.value) {
      mobileSection.value = novo ? 'extrato' : 'clientes'
    }
  },
)

const linhasFiltradas = computed(() => {
  const filtros = new Set(abasAtivas.value)
  return extrato.value.filter((linha) => {
    if (linha.tipo === 'PAGAMENTO') {
      return filtros.has('pagamentos')
    }
    if (linha.status_pagamento === 'PAGO') {
      return filtros.has('pagas')
    }
    if (linha.status_pagamento === 'CANCELADA') {
      return filtros.has('pendentes')
    }
    return filtros.has('pendentes')
  })
})

const extratoAgrupado = computed(() => {
  const linhasOrdenadas = [...linhasFiltradas.value].sort((a, b) => new Date(b.data) - new Date(a.data))
  const grupos = []
  const mapa = new Map()

  for (const linha of linhasOrdenadas) {
    const chave = new Date(linha.data).toISOString().slice(0, 10)
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        key: chave,
        label: labelGrupo(linha.data),
        itens: [],
      })
      grupos.push(mapa.get(chave))
    }
    mapa.get(chave).itens.push(linha)
  }

  return grupos
})

watch(
  () => linhasFiltradas.value,
  (linhas) => {
    linhas
      .filter((linha) => linha.tipo === 'VENDA')
      .forEach((linha) => {
        void ensureItens(linha.id)
      })
  },
  { immediate: true },
)

function toggleAba(valor) {
  const atual = abasAtivas.value
  const indice = atual.indexOf(valor)
  if (indice >= 0) {
    if (atual.length === 1) return
    abasAtivas.value = atual.filter((v) => v !== valor)
  } else {
    abasAtivas.value = [...atual, valor]
  }
}

function selecionar(cliente) {
  clienteSel.value = cliente
  carregarExtrato()
  if (isMobile.value) {
    mobileSection.value = 'extrato'
  }
}

function saldoClasse(valor) {
  if (!valor) return 'text-grey-7'
  return valor > 0 ? 'text-negative' : valor < 0 ? 'text-positive' : 'text-grey-7'
}

function statusCliente(cliente) {
  if (cliente.saldo > 0) return 'devendo'
  if (cliente.saldo < 0) return 'credito'
  return 'quitado'
}

function etiquetaCliente(cliente) {
  const status = statusCliente(cliente)
  if (status === 'devendo') return 'Devendo'
  if (status === 'credito') return 'Crédito'
  return 'Quitado'
}

function formatCurrency(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function labelGrupo(dataStr) {
  const data = new Date(dataStr)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(data)
  alvo.setHours(0, 0, 0, 0)
  const diffDias = Math.round((hoje - alvo) / 86400000)
  if (diffDias === 0) return 'Hoje'
  if (diffDias === 1) return 'Ontem'
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function linhaTitulo(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    return linha.estornado ? 'Pagamento estornado' : 'Pagamento recebido'
  }
  if (linha.status_pagamento === 'PAGO') return 'Venda quitada'
  if (linha.status_pagamento === 'CANCELADA') return 'Venda cancelada'
  return 'Venda não paga'
}

function linhaDescricao(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return linha.observacao_estorno || linha.observacao || 'Estorno registrado'
    return linha.observacao || nomeForma(linha.forma_pagamento) || 'Pagamento'
  }
  const itens = itensPorVenda.value[linha.id]
  if (itens?.length) {
    const resumo = itens
      .map((item) => `${item.quantidade}x ${item.nome_produto_congelado || 'Item'}`)
      .join(', ')
    return resumo.length > 90 ? `${resumo.slice(0, 87)}...` : resumo
  }
  if (carregandoItens.value[linha.id]) return 'Carregando itens...'
  if (linha.observacao) return linha.observacao
  return 'Sem observações'
}

function linhaInfoExtra(linha) {
  const hora = new Date(linha.data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) {
      const estornoHora = linha.data_estorno
        ? new Date(linha.data_estorno).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : hora
      return `Estornado • ${estornoHora}`
    }
    return hora
  }
  if (linha.forma_pagamento && linha.status_pagamento === 'PAGO') {
    return nomeForma(linha.forma_pagamento)
  }
  return null
}

function linhaFuncionario(linha) {
  return linha.nome_funcionario_empresa || null
}

function linhaEtiqueta(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return { label: 'Estornado', cor: 'grey-5', texto: 'black' }
    return { label: 'Pagamento', cor: 'primary', texto: 'white' }
  }
  if (linha.status_pagamento === 'PAGO') {
    return { label: 'Quitada', cor: 'positive', texto: 'white' }
  }
  if (linha.status_pagamento === 'CANCELADA') {
    return { label: 'Cancelada', cor: 'grey-6', texto: 'black' }
  }
  return { label: 'Pendente', cor: 'warning', texto: 'black' }
}

function linhaValorFormatado(linha) {
  const valor = Number(linha.valor || 0)
  const moeda = formatCurrency(Math.abs(valor))
  if (linha.tipo === 'PAGAMENTO') {
    return linha.estornado ? moeda : `- ${moeda}`
  }
  if (linha.status_pagamento === 'PAGO') return `+ ${moeda}`
  if (linha.status_pagamento === 'CANCELADA') return moeda
  return `+ ${moeda}`
}

function linhaValorClasse(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return 'extrato-card__valor--estornado'
    return 'extrato-card__valor--negativo'
  }
  if (linha.status_pagamento === 'PAGO') return 'extrato-card__valor--positivo'
  if (linha.status_pagamento === 'CANCELADA') return 'extrato-card__valor--neutro'
  return 'extrato-card__valor--pendente'
}

function linhaIcone(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return { icone: 'history', tono: 'estornado' }
    return { icone: 'payments', tono: 'pagamento' }
  }
  if (linha.status_pagamento === 'PAGO') return { icone: 'check_circle', tono: 'pago' }
  if (linha.status_pagamento === 'CANCELADA') return { icone: 'block', tono: 'cancelado' }
  return { icone: 'hourglass_top', tono: 'pendente' }
}

function nomeForma(forma) {
  const mapa = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
    OUTRO: 'Outro',
  }
  return mapa[forma] || null
}

async function ensureItens(vendaId) {
  if (itensPorVenda.value[vendaId]?.length || carregandoItens.value[vendaId]) return
  carregandoItens.value = { ...carregandoItens.value, [vendaId]: true }
  try {
    await carregarItens(vendaId)
  } finally {
    carregandoItens.value = { ...carregandoItens.value, [vendaId]: false }
  }
}

async function solicitarConfirmacao({ titulo, mensagem, okLabel, okColor = 'primary', cancelLabel = 'Cancelar' }) {
  return new Promise((resolve) => {
    $q.dialog({
      title: titulo,
      message: mensagem,
      ok: { label: okLabel, color: okColor },
      cancel: { label: cancelLabel },
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
}

async function onSalvarPagamento({ valor, forma, obs }) {
  try {
    await registrarPagamento({ valor, forma, obs })
    $q.notify({ type: 'positive', message: 'Pagamento registrado.' })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Não foi possível registrar o pagamento.' })
  }
}

async function marcarVendaNaoPagaConfirm(linha) {
  const confirmado = await solicitarConfirmacao({
    titulo: 'Marcar como não paga',
    mensagem: 'Tem certeza de que deseja marcar esta venda como não paga?',
    okLabel: 'Sim, marcar',
    okColor: 'warning',
  })
  if (!confirmado) return
  try {
    await marcarVendaNaoPaga(linha)
    $q.notify({ type: 'positive', message: 'Venda marcada como não paga.' })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Falha ao marcar a venda como não paga.' })
  }
}

async function onEstornar(linha) {
  const confirmado = await solicitarConfirmacao({
    titulo: 'Estornar pagamento',
    mensagem: `Deseja estornar o pagamento de ${formatCurrency(linha.valor)}?`,
    okLabel: 'Estornar',
    okColor: 'negative',
  })
  if (!confirmado) return

  const autorizado = await solicitarSenha({
    titulo: 'Autorização necessária',
    mensagem: 'Informe a senha para estornar o pagamento.',
  })
  if (!autorizado) {
    $q.notify({ type: 'negative', message: 'Senha incorreta. Estorno cancelado.' })
    return
  }

  try {
    const resultado = await estornarPagamento({ id: linha.id, observacao: linha.observacao })
    if (resultado?.estornoPersistido === false) {
      $q.notify({
        type: 'warning',
        message: 'Pagamento estornado, mas o histórico não pôde ser preservado. Atualize o banco para manter o registro.',
      })
    } else {
      $q.notify({ type: 'positive', message: 'Pagamento estornado.' })
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Falha ao estornar o pagamento.' })
  }
}

async function abrirPedido(linha) {
  try {
    await ensureItens(linha.id)
    const itens = itensPorVenda.value[linha.id] || []
    detalhePedidoRef.value?.abrir({
      itens,
      total: Number(linha.valor || 0),
      funcionario: linha.nome_funcionario_empresa || null,
      cliente: clienteSel.value?.nome || linha.nome_cliente_avulso || '',
      formaPagamento: linha.forma_pagamento || null,
      status: linha.status_pagamento || '',
      data: linha.data || null,
      observacao: linha.observacao || null,
    })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Não foi possível carregar os itens do pedido.' })
  }
}

function abrirDetalhePagamento(linha) {
  detalhePagamentoRef.value?.abrir(linha)
}

function escolherForma(linhaVenda) {
  const opcoes = FORMAS.map((forma) => ({ label: nomeForma(forma) || forma, value: forma }))
  $q.dialog({
    title: 'Forma de pagamento',
    message: 'Selecione como o pagamento foi recebido.',
    options: {
      type: 'radio',
      model: null,
      items: opcoes,
    },
    cancel: true,
    persistent: true,
  }).onOk(async (forma) => {
    if (!forma) {
      $q.notify({ type: 'warning', message: 'Selecione uma forma de pagamento.' })
      return
    }
    const confirmado = await solicitarConfirmacao({
      titulo: 'Confirmar recebimento',
      mensagem: `Marcar a venda de ${formatCurrency(linhaVenda.valor)} como paga?`,
      okLabel: 'Confirmar',
      okColor: 'positive',
    })
    if (!confirmado) return

    try {
      await marcarVendaPaga(linhaVenda, forma)
      $q.notify({ type: 'positive', message: 'Venda marcada como paga.' })
    } catch (err) {
      console.error(err)
      $q.notify({ type: 'negative', message: 'Falha ao marcar a venda como paga.' })
    }
  })
}
</script>

<style scoped>
.contas-page {
  position: relative;
  min-height: 100vh;
  padding: 24px 24px 32px;
  background: linear-gradient(160deg, #f7f6f3 0%, #ede9df 100%);
  display: flex;
  flex-direction: column;
}

.contas-page__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: 0.7;
}

.contas-page__wrapper {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
}

.contas-page__grid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.mobile-toggle {
  display: flex;
  justify-content: center;
}

.mobile-toggle__buttons {
  width: 100%;
  max-width: 360px;
  border-radius: 999px;
}

.mobile-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.painel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 32px rgba(30, 30, 45, 0.08);
  backdrop-filter: blur(6px);
  padding: 20px 22px;
  position: relative;
}

.painel--clientes {
  min-height: 620px;
}

.painel--extrato {
  min-height: 620px;
}

.painel__header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.painel__buscar :deep(.q-field__control) {
  background: rgba(247, 247, 247, 0.9);
  border-radius: 14px;
}

.painel__filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filtro-btn {
  border: none;
  border-radius: 999px;
  padding: 6px 16px;
  font-weight: 600;
  font-size: 13px;
  background: #f1f1f1;
  color: #6a6a6a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filtro-btn--active {
  background: #ffd54f;
  color: #3b2f00;
  box-shadow: 0 6px 16px rgba(191, 139, 0, 0.3);
}

.painel__lista {
  flex: 1;
  margin-top: 12px;
  min-height: 0;
  position: relative;
}

.painel__scroll {
  height: 100%;
}

.painel__vazio {
  padding: 32px 0;
  text-align: center;
  color: #9e9e9e;
}

.cliente-item {
  border-radius: 16px;
  margin: 4px 0;
  padding: 12px 16px;
  transition: all 0.2s ease;
}

.cliente-item--ativo {
  background: #fff7dc;
  box-shadow: inset 0 0 0 2px #ffca28;
}

.cliente-item__nome {
  font-weight: 600;
  font-size: 15px;
  color: #3b3b45;
}

.cliente-item__saldo {
  font-size: 13px;
  margin-top: 2px;
}

.cliente-item__badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.cliente-item__badge--devendo {
  background: #ffe0e0;
  color: #b11b1b;
}

.cliente-item__badge--quitado {
  background: #f0f0f5;
  color: #616173;
}

.cliente-item__badge--credito {
  background: #e4f5e8;
  color: #1b8a3b;
}

.painel__topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.painel__topo--vazio {
  opacity: 0.6;
}

.painel__cliente {
  font-size: 22px;
  font-weight: 700;
  color: #373743;
}

.painel__saldo {
  font-weight: 600;
  font-size: 14px;
  margin-top: 6px;
}

.painel__registrar {
  font-weight: 700;
  border-radius: 14px;
  padding: 10px 18px;
  background: linear-gradient(115deg, #ffca28, #ffb300);
  color: #3b2500;
}

.painel__tabs {
  display: flex;
  gap: 12px;
  margin: 22px 0 12px;
}

.aba-btn {
  border: none;
  background: #f3f3f4;
  color: #6a6a7b;
  font-weight: 600;
  padding: 6px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.aba-btn--ativa {
  background: #ffd54f;
  color: #3b2f00;
  box-shadow: 0 6px 16px rgba(191, 139, 0, 0.32);
}

.painel__conteudo {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.painel__placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #707078;
  padding: 48px 16px;
}

.extrato-grupo__titulo {
  font-weight: 700;
  color: #4b4b57;
  margin: 18px 0 10px;
  text-transform: capitalize;
}

.extrato-card {
  background: rgba(252, 252, 252, 0.92);
  border-radius: 18px;
  padding: 16px 18px;
  margin-bottom: 12px;
  box-shadow: 0 12px 24px rgba(32, 32, 40, 0.08);
}

.extrato-card__main {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.extrato-card__icone {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.extrato-card__icone--pagamento {
  background: linear-gradient(135deg, #2196f3, #1976d2);
}

.extrato-card__icone--pago {
  background: linear-gradient(135deg, #43a047, #2e7d32);
}

.extrato-card__icone--pendente {
  background: linear-gradient(135deg, #ffb74d, #fb8c00);
}

.extrato-card__icone--cancelado {
  background: linear-gradient(135deg, #9e9e9e, #757575);
}

.extrato-card__icone--estornado {
  background: linear-gradient(135deg, #b0bec5, #78909c);
}

.extrato-card__info {
  flex: 1;
}

.extrato-card__titulo {
  font-weight: 700;
  color: #3b3b45;
  font-size: 15px;
}

.extrato-card__descricao {
  color: #737384;
  font-size: 13px;
  margin-top: 4px;
}

.extrato-card__meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.extrato-card__extra {
  font-size: 12px;
  color: #8a8aa2;
}

.extrato-card__extra--func {
  color: #6b6b80;
}

.extrato-card__valor {
  font-weight: 700;
  font-size: 15px;
  min-width: 120px;
  text-align: right;
}

.extrato-card__valor--negativo {
  color: #c62828;
}

.extrato-card__valor--positivo {
  color: #2e7d32;
}

.extrato-card__valor--pendente {
  color: #ef6c00;
}

.extrato-card__valor--neutro {
  color: #757575;
}

.extrato-card__valor--estornado {
  color: #607d8b;
  text-decoration: line-through;
}

.extrato-card__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

@media (max-width: 1023px) {
  .contas-page {
    padding: 16px;
  }

  .contas-page__wrapper {
    gap: 12px;
  }

  .mobile-toggle {
    padding: 0 8px;
  }

  .mobile-panel {
    display: flex;
    width: 100%;
  }

  .painel {
    padding: 18px 18px 20px;
    height: auto;
  }

  .painel--clientes,
  .painel--extrato {
    min-height: 60vh;
  }

  .painel__lista {
    max-height: 48vh;
  }

  .painel__scroll {
    height: 100%;
  }

  .painel__registrar {
    width: 100%;
    justify-content: center;
  }

  .extrato-card__valor {
    min-width: auto;
  }
}

@media (max-width: 599px) {
  .mobile-panel {
    width: 100%;
  }

  .painel__topo {
    flex-direction: column;
    align-items: flex-start;
  }

  .painel__tabs {
    flex-wrap: wrap;
  }

  .extrato-card__main {
    flex-direction: column;
  }

  .extrato-card__valor {
    text-align: left;
  }
}
</style>
