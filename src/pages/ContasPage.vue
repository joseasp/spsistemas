
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
          color="white"
          text-color="grey-7"
          class="mobile-toggle__buttons"
          :options="mobileToggleOptions"
        />
      </div>

      <div class="row q-col-gutter-x-xl contas-page__grid">
        <!-- Coluna de clientes -->
        <div
          class="col-12 col-lg-4"
          :class="{ 'mobile-panel': isMobile }"
          v-show="!focoExtrato && (!isMobile || mobileSection === 'clientes')"
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
              <q-scroll-area v-if="!isMobile" class="painel__scroll">
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
              <div v-else class="painel__scroll painel__scroll--native">
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
              </div>

              <q-inner-loading :showing="loadingClientes">
                <q-spinner-dots size="32px" class="text-brand" />
              </q-inner-loading>
            </div>
          </section>
        </div>

        <!-- Coluna de extrato -->
        <div
          class="col-12"
          :class="[focoExtrato ? 'col-lg-12' : 'col-lg-8', { 'mobile-panel': isMobile }]"
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
              <div class="painel__acoes">
                <q-btn
                  outline
                  class="painel__reconciliar"
                  :class="{ 'is-mobile': isMobile }"
                  icon="sync"
                  :label="isMobile ? '' : 'Reconciliar'"
                  :round="isMobile"
                  :dense="isMobile"
                  :title="isMobile ? 'Reconciliar' : undefined"
                  :disable="!clienteSel || reconciliando"
                  :loading="reconciliando"
                  @click="reconciliarPagamentosConfirm"
                />
                <q-btn
                  unelevated
                  class="painel__registrar"
                  :class="{ 'is-mobile': isMobile }"
                  icon="add_circle"
                  :label="isMobile ? '' : 'Registrar Pagamento'"
                  :round="isMobile"
                  :dense="isMobile"
                  :title="isMobile ? 'Registrar pagamento' : undefined"
                  :disable="!clienteSel || reconciliando"
                  @click="abrirPagamento = true"
                />
                <q-btn
                  flat
                  round
                  dense
                  class="painel__icon-btn"
                  :class="{ 'is-active': mostrarBuscaExtrato }"
                  icon="search"
                  :disable="!clienteSel"
                  @click="toggleBuscaExtrato"
                  aria-label="Buscar no extrato"
                  :title="mostrarBuscaExtrato ? 'Ocultar busca' : 'Buscar no extrato'"
                />
                <q-btn
                  flat
                  round
                  dense
                  class="painel__icon-btn"
                  :class="{ 'is-active': focoExtrato }"
                  icon="view_sidebar"
                  :disable="isMobile"
                  @click="focoExtrato = !focoExtrato"
                  aria-label="Foco no extrato"
                  :title="focoExtrato ? 'Mostrar clientes' : 'Foco no extrato'"
                />
              </div>
            </div>

            <div v-if="mostrarBuscaExtrato" class="painel__busca-extrato">
              <q-input
                v-model="buscaExtrato"
                dense
                outlined
                rounded
                clearable
                placeholder="Buscar no extrato"
                class="painel__busca-input input-uppercase"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>

            <div class="painel__tabs">
              <button
                v-for="opt in abaOptions"
                :key="opt.value"
                :class="['aba-btn', 'aba-btn--' + opt.value, { 'aba-btn--ativa': abasAtivas.includes(opt.value) }]"
                :style="{ '--aba-color': abaColor(opt.value) }"
                type="button"
                @click="toggleAba(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>

            <div class="painel__conteudo">
              <q-inner-loading :showing="loadingExtrato">
                <q-spinner-dots size="40px" class="text-brand" />
              </q-inner-loading>

              <div v-if="!loadingExtrato && !clienteSel" class="painel__placeholder">
                <q-icon name="person_search" size="48px" class="q-mb-md" />
                <div class="text-subtitle1">Nenhum cliente selecionado</div>
                <div class="text-body2 text-grey-6 q-mt-xs">Escolha um cliente na coluna da esquerda.</div>
              </div>

              <div v-else-if="!loadingExtrato && clienteSel && !extratoAgrupado.length" class="painel__placeholder">
                <q-icon name="receipt_long" size="48px" class="q-mb-md" />
                <div class="text-subtitle1">Nenhum lan&ccedil;amento nesta visualiza&ccedil;&atilde;o</div>
                <div class="text-body2 text-grey-6 q-mt-xs">Registre novos pedidos ou pagamentos.</div>
              </div>

              <q-scroll-area v-else-if="!isMobile" class="painel__scroll">
                <div v-for="grupo in extratoAgrupado" :key="grupo.key" class="extrato-grupo">
                  <div class="extrato-grupo__titulo">{{ grupo.label }}</div>

                  <div
                    v-for="linha in grupo.itens"
                    :key="linha.tipo + '-' + linha.id"
                    class="extrato-card"
                    :style="{ '--accent': linhaAccent(linha) }"
                    role="button"
                    @click="abrirLinha(linha)"
                  >
                    <span class="extrato-card__accent" aria-hidden="true" />
                    <div class="extrato-card__main">
                      <div class="extrato-card__icone" :class="'extrato-card__icone--' + linhaIcone(linha).tono">
                        <q-icon :name="linhaIcone(linha).icone" size="20px" />
                      </div>

                      <div class="extrato-card__info">
                        <div class="extrato-card__titulo">{{ linhaTitulo(linha) }}</div>
                        <div v-if="linhaDescricao(linha)" class="extrato-card__descricao">
                          {{ linhaDescricao(linha) }}
                        </div>
                        <div class="extrato-card__meta">
                          <q-badge class="extrato-card__badge" :style="linhaEtiqueta(linha).style">
                            {{ linhaEtiqueta(linha).label }}
                          </q-badge>
                          <span v-if="linhaInfoExtra(linha)" class="extrato-card__extra">{{ linhaInfoExtra(linha) }}</span>
                          <span v-if="linhaFuncionario(linha)" class="extrato-card__extra extrato-card__extra--func">Func.: {{ linhaFuncionario(linha) }}</span>
                        </div>
                      </div>

                      <div class="extrato-card__side">
                        <div class="extrato-card__valor" :class="linhaValorClasse(linha)">
                          {{ linhaValorFormatado(linha) }}
                        </div>
                        <div class="extrato-card__acoes" @click.stop>
                          <template v-if="linha.tipo === 'VENDA'">
                            <q-btn
                              size="sm"
                              dense
                              no-caps
                              outline
                              icon="payments"
                              class="extrato-card__btn extrato-card__btn--brand"
                              :label="acaoVendaLabel(linha)"
                              :disable="vendaBloqueada(linha)"
                              @click.stop="statusFinanceiro(linha) === 'PAGO' ? marcarVendaNaoPagaConfirm(linha) : escolherForma(linha)"
                            />
                          </template>
                          <template v-else>
                            <q-btn
                              v-if="!linha.estornado"
                              flat
                              round
                              dense
                              size="sm"
                              color="negative"
                              icon="undo"
                              class="extrato-card__icon-btn"
                              @click.stop="onEstornar(linha)"
                            >
                              <q-tooltip>Estornar</q-tooltip>
                            </q-btn>
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </q-scroll-area>
              <div v-else class="painel__scroll painel__scroll--native">
                <div v-for="grupo in extratoAgrupado" :key="grupo.key" class="extrato-grupo">
                  <div class="extrato-grupo__titulo">{{ grupo.label }}</div>

                  <div
                    v-for="linha in grupo.itens"
                    :key="linha.tipo + '-' + linha.id"
                    class="extrato-card"
                    :style="{ '--accent': linhaAccent(linha) }"
                    role="button"
                    @click="abrirLinha(linha)"
                  >
                    <span class="extrato-card__accent" aria-hidden="true" />
                    <div class="extrato-card__main">
                      <div class="extrato-card__icone" :class="'extrato-card__icone--' + linhaIcone(linha).tono">
                        <q-icon :name="linhaIcone(linha).icone" size="20px" />
                      </div>

                      <div class="extrato-card__info">
                        <div class="extrato-card__titulo">{{ linhaTitulo(linha) }}</div>
                        <div v-if="linhaDescricao(linha)" class="extrato-card__descricao">
                          {{ linhaDescricao(linha) }}
                        </div>
                        <div class="extrato-card__meta">
                          <q-badge class="extrato-card__badge" :style="linhaEtiqueta(linha).style">
                            {{ linhaEtiqueta(linha).label }}
                          </q-badge>
                          <span v-if="linhaInfoExtra(linha)" class="extrato-card__extra">{{ linhaInfoExtra(linha) }}</span>
                          <span v-if="linhaFuncionario(linha)" class="extrato-card__extra extrato-card__extra--func">Func.: {{ linhaFuncionario(linha) }}</span>
                        </div>
                      </div>

                      <div class="extrato-card__side">
                        <div class="extrato-card__valor" :class="linhaValorClasse(linha)">
                          {{ linhaValorFormatado(linha) }}
                        </div>
                        <div class="extrato-card__acoes" @click.stop>
                          <template v-if="linha.tipo === 'VENDA'">
                            <q-btn
                              size="sm"
                              dense
                              no-caps
                              outline
                              icon="payments"
                              class="extrato-card__btn extrato-card__btn--brand"
                              :label="acaoVendaLabel(linha)"
                              :disable="vendaBloqueada(linha)"
                              @click.stop="statusFinanceiro(linha) === 'PAGO' ? marcarVendaNaoPagaConfirm(linha) : escolherForma(linha)"
                            />
                          </template>
                          <template v-else>
                            <q-btn
                              v-if="!linha.estornado"
                              flat
                              round
                              dense
                              size="sm"
                              color="negative"
                              icon="undo"
                              class="extrato-card__icon-btn"
                              @click.stop="onEstornar(linha)"
                            >
                              <q-tooltip>Estornar</q-tooltip>
                            </q-btn>
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
  { value: 'credito', label: 'Cr\u00e9dito' },
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
  listarPagamentosAplicados,
  startRealtime,
  registrarPagamento,
  marcarVendaPaga,
  marcarVendaNaoPaga,
  estornarPagamento,
  excluirPagamentoDefinitivo,
  reconciliarPagamentosCliente,
  listarVendasAplicadasPorPagamento,
  reconciliando,
  loadingClientes,
  loadingExtrato,
} = useContasReceber()

const $q = useQuasar()
const isMobile = computed(() => $q.screen.lt.md)
const mobileSection = ref('clientes')
const buscaExtrato = ref('')
const mostrarBuscaExtrato = ref(false)
const focoExtrato = ref(false)
const mobileToggleOptions = [
  { label: 'Clientes', value: 'clientes' },
  { label: 'Extrato', value: 'extrato' },
]

const PAGAMENTO_DIRETO_TAG = 'PAGAMENTO DIRETO DA VENDA'


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
const VENDA_ACAO_COOLDOWN_MS = 800
const vendaAcoesPendentes = new Set()

function iniciarAcaoVenda(id) {
  if (!id) return false
  if (vendaAcoesPendentes.has(id)) return false
  vendaAcoesPendentes.add(id)
  return true
}

function finalizarAcaoVenda(id) {
  if (!id) return
  setTimeout(() => vendaAcoesPendentes.delete(id), VENDA_ACAO_COOLDOWN_MS)
}


watch(isMobile, (novo) => {
  if (!novo) {
    mobileSection.value = 'clientes'
    return
  }
  focoExtrato.value = false
})

watch(
  () => clienteSel.value,
  (novo) => {
    if (isMobile.value) {
      mobileSection.value = novo ? 'extrato' : 'clientes'
    }
  },
)

function isPagamentoDireto(linha) {
  if (linha?.tipo !== 'PAGAMENTO') return false
  if (!linha?.origem_transacao_id) return false
  const obs = String(linha.observacao || '').toUpperCase()
  return obs.includes(PAGAMENTO_DIRETO_TAG)
}
const linhasFiltradas = computed(() => {
  const filtros = new Set(abasAtivas.value)
  const termo = normalizarTexto(buscaExtrato.value)
  return extrato.value.filter((linha) => {
    if (isPagamentoDireto(linha)) return false
    let statusOk = false
    if (linha.tipo === 'PAGAMENTO') {
      statusOk = filtros.has('pagamentos')
    } else {
      const status = statusFinanceiro(linha)
      if (status === 'PAGO') {
        statusOk = filtros.has('pagas')
      } else if (status === 'CANCELADA') {
        statusOk = filtros.has('pendentes')
      } else {
        statusOk = filtros.has('pendentes')
      }
    }
    if (!statusOk) return false
    if (!termo) return true
    if (linha.tipo === 'VENDA' && !itensPorVenda.value[linha.id]) return true
    return textoBusca(linha).includes(termo)
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

function toggleBuscaExtrato() {
  mostrarBuscaExtrato.value = !mostrarBuscaExtrato.value
  if (!mostrarBuscaExtrato.value) {
    buscaExtrato.value = ""
  }
}

const STATUS_CORES = {
  pagamento: '#1e88e5',
  pago: '#2e7d32',
  pendente: '#f9a825',
  cancelado: '#9e9e9e',
  estornado: '#90a4ae',
  naoInformado: '#b0bec5',
}

const ABA_CORES = {
  pendentes: STATUS_CORES.pendente,
  pagas: STATUS_CORES.pago,
  pagamentos: STATUS_CORES.pagamento,
}

function abaColor(valor) {
  return ABA_CORES[valor] || 'var(--brand-primary)'
}

function abrirLinha(linha) {
  if (linha?.tipo === 'PAGAMENTO') {
    abrirDetalhePagamento(linha)
    return
  }
  abrirPedido(linha)
}

function linhaAccent(linha) {
  if (linha?.tipo === 'PAGAMENTO') return STATUS_CORES.pagamento
  const status = statusFinanceiro(linha)
  if (status === 'PAGO') return STATUS_CORES.pago
  if (status === 'PARCIAL') return STATUS_CORES.pendente
  if (status === 'CANCELADA') return STATUS_CORES.cancelado
  if (status === 'NAO_INFORMADO') return STATUS_CORES.naoInformado
  return STATUS_CORES.pendente
}

function acaoVendaLabel(linha) {
  return statusFinanceiro(linha) === 'PAGO' ? 'N\u00e3o pago' : 'Pagar'
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
  if (status === 'credito') return 'Cr\u00e9dito'
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

function normalizarTexto(valor) {
  const texto = String(valor || "")
  const normalizado = typeof texto.normalize === "function" ? texto.normalize("NFD") : texto
  return normalizado.replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function textoBusca(linha) {
  const partes = [
    linhaTitulo(linha),
    linhaDescricao(linha),
    linhaInfoExtra(linha),
    linhaFuncionario(linha),
    linha.observacao,
    linha.observacao_estorno,
    linha.nome_cliente_avulso,
    nomeForma(linha.forma_pagamento),
  ].filter(Boolean)
  return normalizarTexto(partes.join(" "))
}

function linhaTitulo(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    return linha.estornado ? 'Pagamento estornado' : 'Pagamento'
  }
  const status = statusFinanceiro(linha)
  if (status === 'CANCELADA') return 'Venda cancelada'
  return 'Venda'
}

function linhaDescricao(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return linha.observacao_estorno || linha.observacao || 'Estorno registrado'
    return linha.observacao || null
  }
  const itens = itensPorVenda.value[linha.id]
  if (itens?.length) {
    const resumo = itens
      .map((item) => `${item.quantidade}x ${item.nome_produto_congelado || 'Item'}`)
      .join(', ')
    const limiteResumo = 70
    return resumo.length > limiteResumo ? `${resumo.slice(0, limiteResumo - 3)}...` : resumo
  }
  if (carregandoItens.value[linha.id]) return 'Carregando itens...'
  if (linha.observacao) return linha.observacao
  return 'Sem observa\u00e7\u00f5es'
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
      return 'Estornado ' + estornoHora
    }
    return hora
  }
  const status = statusFinanceiro(linha)
  if (linha.forma_pagamento && status === 'PAGO') {
    return nomeForma(linha.forma_pagamento)
  }
  if (status === 'PARCIAL') {
    const saldoAberto = Number(linha.saldo_aberto) || 0
    const valorTotal = Number(linha.valor) || 0
    const pago = Number(linha.valor_pago ?? (valorTotal ? valorTotal - saldoAberto : 0))
    if (saldoAberto > 0 && pago > 0) {
      return 'Pago ' + formatCurrency(pago) + ' | Falta ' + formatCurrency(saldoAberto)
    }
    if (saldoAberto > 0) {
      return 'Falta ' + formatCurrency(saldoAberto)
    }
  }
  return null
}

function linhaFuncionario(linha) {
  return linha.nome_funcionario_empresa || null
}

function linhaEtiqueta(linha) {
  const badge = (label, cor, texto = '#ffffff') => ({
    label,
    style: {
      background: cor,
      color: texto,
    },
  })
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return badge('Estornado', STATUS_CORES.estornado, '#263238')
    const formaLabel = nomeForma(linha.forma_pagamento)
    return badge(formaLabel || 'Pagamento', STATUS_CORES.pagamento)
  }
  const status = statusFinanceiro(linha)
  if (status === 'PAGO') {
    return badge('Quitada', STATUS_CORES.pago)
  }
  if (status === 'PARCIAL') {
    return badge('Parcial', STATUS_CORES.pendente, '#3a2a00')
  }
  if (status === 'NAO_INFORMADO') {
    return badge('N\u00e3o informado', STATUS_CORES.naoInformado, '#263238')
  }
  if (status === 'CANCELADA') {
    return badge('Cancelada', STATUS_CORES.cancelado, '#263238')
  }
  return badge('Pendente', STATUS_CORES.pendente, '#3a2a00')
}

function linhaValorFormatado(linha) {
  const valor = Number(linha.valor || 0)
  const moeda = formatCurrency(Math.abs(valor))
  if (linha.tipo === 'PAGAMENTO') {
    return linha.estornado ? moeda : '- ' + moeda
  }
  const status = statusFinanceiro(linha)
  if (status === 'PAGO') return '+ ' + moeda
  if (status === 'CANCELADA') return moeda
  return '+ ' + moeda
}


function linhaValorClasse(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return 'extrato-card__valor--estornado'
    return 'extrato-card__valor--negativo'
  }
  const status = statusFinanceiro(linha)
  if (status === 'PAGO') return 'extrato-card__valor--positivo'
  if (status === 'CANCELADA') return 'extrato-card__valor--neutro'
  if (status === 'PARCIAL') return 'extrato-card__valor--pendente'
  if (status === 'NAO_INFORMADO') return 'extrato-card__valor--pendente'
  return 'extrato-card__valor--pendente'
}


function linhaIcone(linha) {
  if (linha.tipo === 'PAGAMENTO') {
    if (linha.estornado) return { icone: 'history', tono: 'estornado' }
    return { icone: 'payments', tono: 'pagamento' }
  }
  const status = statusFinanceiro(linha)
  if (status === 'PAGO') return { icone: 'check_circle', tono: 'pago' }
  if (status === 'PARCIAL') return { icone: 'pie_chart', tono: 'pendente' }
  if (status === 'NAO_INFORMADO') return { icone: 'help', tono: 'pendente' }
  if (status === 'CANCELADA') return { icone: 'block', tono: 'cancelado' }
  return { icone: 'hourglass_top', tono: 'pendente' }
}


function nomeForma(forma) {
  const mapa = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'D\u00e9bito',
    CREDITO: 'Cr\u00e9dito',
    OUTRO: 'Outro',
  }
  return mapa[forma] || null
}

function statusFinanceiro(linha) {
  return linha.status_financeiro || linha.status_pagamento
}

function vendaBloqueada(linha) {
  if (linha.tipo !== 'VENDA') return false
  if (Number(linha.valor_pago) > 0) return true
  return statusFinanceiro(linha) === 'PARCIAL'
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

async function onSalvarPagamento({ valor, forma, obs, data_pagamento }) {
  try {
    await registrarPagamento({ valor, forma, obs, data_pagamento })
    $q.notify({ type: 'positive', message: 'Pagamento registrado.' })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'N\u00e3o foi poss\u00edvel registrar o pagamento.' })
  }
}

async function reconciliarPagamentosConfirm() {
  if (!clienteSel.value?.id) return
  const confirmado = await solicitarConfirmacao({
    titulo: 'Reconciliar pagamentos',
    mensagem: 'Isso vai aplicar pagamentos antigos sem v\u00ednculo para este cliente. Deseja continuar?',
    okLabel: 'Reconciliar',
    okColor: 'primary',
  })
  if (!confirmado) return
  try {
    const resultado = await reconciliarPagamentosCliente({ apenasSemAlocacao: true })
    if (resultado?.suportaAlocacoes === false) {
      $q.notify({ type: 'warning', message: 'Tabela de aloca\u00e7\u00f5es n\u00e3o dispon\u00edvel. Atualize o banco.' })
      return
    }
    const aplicados = resultado?.pagamentosProcessados ?? 0
    const ignorados = resultado?.pagamentosIgnorados ?? 0
    const total = formatCurrency(resultado?.totalAplicado ?? 0)
    $q.notify({ type: 'positive', message: `Reconcilia\u00e7\u00e3o conclu\u00edda. ${aplicados} pagamento(s) aplicados, ${ignorados} ignorado(s). Total ${total}.` })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Falha ao reconciliar pagamentos.' })
  }
}


async function marcarVendaNaoPagaConfirm(linha) {
  if (!iniciarAcaoVenda(linha?.id)) return
  const confirmado = await solicitarConfirmacao({
    titulo: 'Marcar como n\u00e3o paga',
    mensagem: 'Tem certeza de que deseja marcar esta venda como n\u00e3o paga?',
    okLabel: 'Sim, marcar',
    okColor: 'warning',
  })
  if (!confirmado) {
    finalizarAcaoVenda(linha?.id)
    return
  }
  try {
    await marcarVendaNaoPaga(linha)
    $q.notify({ type: 'positive', message: 'Venda marcada como n\u00e3o paga.' })
  } catch (err) {
    console.error(err)
    if (err?.code === 'PAGAMENTO_ALOCADO') {
      $q.notify({ type: 'warning', message: 'Venda possui pagamentos aplicados. Ajuste pelo contas a receber.' })
      return
    }
    $q.notify({ type: 'negative', message: 'Falha ao marcar a venda como n\u00e3o paga.' })
  } finally {
    finalizarAcaoVenda(linha?.id)
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
    titulo: 'Autoriza\u00e7\u00e3o necess\u00e1ria',
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
        message: 'Pagamento estornado, mas o hist\u00f3rico n\u00e3o p\u00f4de ser preservado. Atualize o banco para manter o registro.',
      })
    } else {
      $q.notify({ type: 'positive', message: 'Pagamento estornado.' })
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Falha ao estornar o pagamento.' })
  }
}

async function excluirPagamentoDefinitivoConfirm(linha) {
  const confirmado = await solicitarConfirmacao({
    titulo: 'Excluir pagamento definitivo',
    mensagem: 'Isso remove o pagamento do hist\u00f3rico. Deseja continuar?',
    okLabel: 'Excluir',
    okColor: 'negative',
  })
  if (!confirmado) return

  const autorizado = await solicitarSenha({
    titulo: 'Autoriza\u00e7\u00e3o necess\u00e1ria',
    mensagem: 'Informe a senha para excluir o pagamento.',
  })
  if (!autorizado) {
    $q.notify({ type: 'negative', message: 'Senha incorreta. Exclus\u00e3o cancelada.' })
    return
  }

  try {
    await excluirPagamentoDefinitivo({ id: linha.id })
    $q.notify({ type: 'positive', message: 'Pagamento exclu\u00eddo.' })
  } catch (err) {
    console.error(err)
    if (err?.code === 'ESTORNO_NAO_SUPORTADO') {
      $q.notify({ type: 'warning', message: 'Estorno n\u00e3o suportado no banco atual.' })
      return
    }
    if (err?.code === 'PAGAMENTO_NAO_ESTORNADO') {
      $q.notify({ type: 'warning', message: 'Pagamento precisa estar estornado para excluir.' })
      return
    }
    $q.notify({ type: 'negative', message: 'Falha ao excluir pagamento.' })
  }
}

async function abrirPedido(linha) {
  try {
    await ensureItens(linha.id)
    const itens = itensPorVenda.value[linha.id] || []
    let pagamentos = []
    try {
      const resultado = await listarPagamentosAplicados(linha.id)
      pagamentos = resultado?.pagamentos || []
    } catch (error) {
      console.error('Falha ao buscar pagamentos aplicados', error)
    }
    detalhePedidoRef.value?.abrir({
      itens,
      total: Number(linha.valor || 0),
      funcionario: linha.nome_funcionario_empresa || null,
      cliente: clienteSel.value?.nome || linha.nome_cliente_avulso || '',
      formaPagamento: linha.forma_pagamento || null,
      status: statusFinanceiro(linha) || linha.status_pagamento || '',
      data: linha.data || null,
      observacao: linha.observacao || null,
      valorPago: linha.valor_pago ?? null,
      saldoAberto: linha.saldo_aberto ?? null,
      pagamentos,
    })
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'N\u00e3o foi poss\u00edvel carregar os itens do pedido.' })
  }
}

async function abrirDetalhePagamento(linha) {
  try {
    let vendas = []
    let suportaAlocacoes = true
    if (linha?.id) {
      const resultado = await listarVendasAplicadasPorPagamento(linha.id)
      vendas = resultado?.vendas || []
      suportaAlocacoes = resultado?.suportaAlocacoes !== false
    }
    const onExcluir = linha?.estornado ? () => excluirPagamentoDefinitivoConfirm(linha) : null
    detalhePagamentoRef.value?.abrir(linha, { vendas, suportaAlocacoes, onExcluir })
  } catch (err) {
    console.error(err)
    detalhePagamentoRef.value?.abrir(linha, { vendas: [], suportaAlocacoes: false })
  }
}

function escolherForma(linhaVenda) {
  const vendaId = linhaVenda?.id
  if (!iniciarAcaoVenda(vendaId)) return
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
      finalizarAcaoVenda(vendaId)
      return
    }
    const confirmado = await solicitarConfirmacao({
      titulo: 'Confirmar recebimento',
      mensagem: `Marcar a venda de ${formatCurrency(linhaVenda.valor)} como paga?`,
      okLabel: 'Confirmar',
      okColor: 'positive',
    })
    if (!confirmado) {
      finalizarAcaoVenda(vendaId)
      return
    }

    try {
      await marcarVendaPaga(linhaVenda, forma)
      $q.notify({ type: 'positive', message: 'Venda marcada como paga.' })
    } catch (err) {
      console.error(err)
      $q.notify({ type: 'negative', message: 'Falha ao marcar a venda como paga.' })
    } finally {
      finalizarAcaoVenda(vendaId)
    }
  })
    .onCancel(() => finalizarAcaoVenda(vendaId))
}
</script>
<style scoped>
.contas-page {
  position: relative;
  min-height: 100%;
  padding: 0;
  background: var(--brand-background);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.contas-page__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.4;
}

.contas-page__wrapper {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  min-height: 0;
  padding: 24px 24px 32px;
  box-sizing: border-box;
}

.contas-page__grid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  min-height: 0;
  row-gap: 0;
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
  border-radius: 18px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
  box-shadow: none;
  padding: 16px 18px;
  position: relative;
}

.painel--clientes,
.painel--extrato {
  min-height: 0;
}

.painel__header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.painel__buscar :deep(.q-field__control) {
  background: var(--brand-surface);
  border-radius: 12px;
  border: 1px solid var(--brand-border);
}

.painel__filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filtro-btn {
  border: 1px solid var(--brand-border);
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 13px;
  background: var(--brand-surface-soft);
  color: var(--brand-text-muted);
  cursor: pointer;
}

.filtro-btn--active {
  background: var(--brand-primary);
  color: var(--brand-text-strong);
  border-color: var(--brand-primary);
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

.painel__scroll--native {
  overflow-y: auto;
}

.painel__vazio {
  padding: 32px 0;
  text-align: center;
  color: var(--brand-text-muted);
}

.cliente-item {
  border-radius: 12px;
  margin: 4px 0;
  padding: 10px 12px;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.cliente-item--ativo {
  background: color-mix(in srgb, var(--brand-primary) 12%, white);
  border-color: var(--brand-primary);
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
  color: var(--brand-text-strong);
}

.painel__saldo {
  font-weight: 600;
  font-size: 14px;
  margin-top: 6px;
}

.painel__acoes {
  display: flex;
  align-items: center;
  gap: 10px;
  row-gap: 8px;
  flex-wrap: wrap;
}

.painel__reconciliar {
  font-weight: 600;
  border-radius: 12px;
  padding: 8px 14px;
}
.painel__registrar {
  font-weight: 700;
  border-radius: 12px;
  padding: 8px 16px;
  background: var(--brand-primary);
  color: var(--brand-text-strong);
  box-shadow: none;
}
.painel__reconciliar.is-mobile,
.painel__registrar.is-mobile {
  padding: 6px;
  min-width: 40px;
}
.painel__icon-btn {
  border-radius: 12px;
  border: 1px solid var(--brand-border);
  background: var(--brand-surface-soft);
}

.painel__busca-extrato {
  margin-top: 12px;
}

.painel__busca-input :deep(.q-field__control) {
  border-radius: 12px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
}

.painel__tabs {
  display: flex;
  gap: 10px;
  margin: 16px 0 10px;
  flex-wrap: wrap;
}

.aba-btn {
  border: 1px solid var(--aba-color, var(--brand-border));
  background: var(--brand-surface-soft);
  color: var(--brand-text-muted);
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.aba-btn--ativa {
  background: var(--aba-color, var(--brand-primary));
  color: #ffffff;
  border-color: var(--aba-color, var(--brand-primary));
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
  color: var(--brand-text-muted);
  padding: 48px 16px;
}

.extrato-grupo__titulo {
  font-weight: 700;
  color: #4b4b57;
  margin: 18px 0 10px;
  text-transform: capitalize;
}

.extrato-card {
  position: relative;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
  border-radius: 14px;
  padding: 12px 14px 12px 20px;
  margin-bottom: 8px;
  box-shadow: none;
  cursor: pointer;
}

.extrato-card__main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.extrato-card__icone {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.extrato-card__icone--pagamento {
  background: #1e88e5;
}

.extrato-card__icone--pago {
  background: #2e7d32;
}

.extrato-card__icone--pendente {
  background: #f9a825;
}

.extrato-card__icone--cancelado {
  background: #757575;
}


.extrato-card__accent {
  position: absolute;
  left: 8px;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 4px;
  background: var(--accent, var(--brand-primary));
}

.extrato-card__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 150px;
}

.extrato-card__btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
}

.extrato-card__icon-btn {
  border: 1px solid var(--brand-border);
}
.extrato-card__icone--estornado {
  background: #90a4ae;
}

.extrato-card__info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 4px 14px;
  align-items: center;
  min-width: 0;
}

.extrato-card__titulo {
  font-weight: 700;
  color: #3b3b45;
  font-size: 15px;
}

.extrato-card__descricao {
  grid-column: 1 / -1;
  color: #737384;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.extrato-card__meta {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  text-align: right;
}

.extrato-card__extra {
  font-size: 12px;
  color: #8a8aa2;
}

.extrato-card__extra--func {
  color: #6b6b80;
}

.extrato-card__badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
}

.extrato-card__valor {
  font-weight: 700;
  font-size: 18px;
  text-align: right;
  line-height: 1.2;
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
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}

@media (min-width: 1024px) {
  .contas-page {
    overflow: hidden;
  }
}
@media (max-width: 1023px) {
  .contas-page__wrapper {
    gap: 12px;
    padding: 14px;
  }

  .contas-page__grid {
    row-gap: 12px;
  }

  .mobile-toggle {
    padding: 0 8px;
  }

  .mobile-panel {
    display: flex;
    width: 100%;
  }

  .painel {
    padding: 16px;
    height: 100%;
  }

  .painel__lista {
    max-height: none;
  }

  .painel__scroll--native {
    height: auto;
  }

  .painel__acoes {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
  }

  .painel__reconciliar,
  .painel__registrar {
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
    grid-template-columns: auto 1fr;
  }

  .extrato-card__info {
    grid-template-columns: 1fr;
  }

  .extrato-card__meta {
    grid-column: 1 / -1;
    grid-row: auto;
    justify-content: flex-start;
    text-align: left;
  }

  .extrato-card__side {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }

  .extrato-card__valor {
    text-align: left;
  }
}

.text-brand {
  color: var(--brand-primary);
}

.mobile-toggle__buttons :deep(.q-btn) {
  color: var(--brand-text-muted);
}

.mobile-toggle__buttons :deep(.q-btn--active) {
  background: var(--brand-primary) !important;
  color: var(--brand-text-strong) !important;
  border-color: var(--brand-primary) !important;
}

.painel__reconciliar {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: transparent;
}

.painel__registrar {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: var(--brand-text-strong);
}

.painel__icon-btn {
  color: var(--brand-text-muted);
}

.painel__icon-btn.is-active {
  color: var(--brand-primary);
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, white);
}

.painel__busca-input :deep(.q-field--focused .q-field__control),
.painel__buscar :deep(.q-field--focused .q-field__control) {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 1px var(--brand-primary);
}

.painel__busca-input :deep(.q-field--focused .q-field__control:before),
.painel__busca-input :deep(.q-field--focused .q-field__control:after),
.painel__buscar :deep(.q-field--focused .q-field__control:before),
.painel__buscar :deep(.q-field--focused .q-field__control:after) {
  border-color: var(--brand-primary);
}

.extrato-card__btn--brand {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}
</style>



