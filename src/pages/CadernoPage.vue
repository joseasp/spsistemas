<template>
  <q-page class="app-page caderno-page">
    <div class="app-page__bg caderno-page__bg" />
    <div class="app-page__wrapper caderno-page__wrapper">
      <div v-if="usarToggle" class="mobile-toggle">
        <q-btn-toggle
          v-model="mobileSection"
          :options="mobileToggleOptions"
          spread
          rounded
          unelevated
          toggle-color="primary"
          color="white"
          text-color="grey-7"
          class="mobile-toggle__buttons"
        />
      </div>
      <div class="row q-col-gutter-xl app-page__grid caderno-page__grid">
        <div
          class="col-12 col-lg-7 caderno-page__board-col"
          :class="{ 'mobile-panel': usarToggle }"
          v-show="!usarToggle || mobileSection === 'board'"
        >
          <section class="painel caderno-board">
            <header class="painel__topo caderno-board__topo">
              <div class="caderno-board__headlines">
                <span class="painel__label">Pedidos do dia</span>
                <span class="painel__title">{{ dataLonga }}</span>
              </div>
              <div class="painel__acoes">
                <div class="painel__acoes-nav">
                  <q-btn flat round dense icon="chevron_left" @click="mudarDia(-1)" />
                  <q-btn flat round dense icon="event" @click="mostrarCalendario = true" />
                  <q-btn flat round dense icon="chevron_right" @click="mudarDia(1)" />
                </div>
                <q-btn
                  class="caderno-page__cash-btn"
                  flat
                  dense
                  :round="$q.screen.lt.md"
                  :class="{ 'caderno-page__cash-btn--icon': $q.screen.lt.md }"
                  icon="o_point_of_sale"
                  :label="$q.screen.lt.md ? '' : 'Caixa'"
                  aria-label="Abrir ou fechar caixa"
                  @click="abrirFecharCaixa"
                />
              </div>
            </header>
            <div class="painel__header caderno-board__header">
              <div class="caderno-board__search">
                <q-input
                  ref="buscaInput"
                  v-model="buscaTermo"
                  dense
                  outlined
                  clearable
                  clear-icon="close"
                  placeholder="Buscar por nome (cliente/avulso/funcion&aacute;rio)"
                  aria-label="Buscar pedidos por nome"
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>

            </div>

            <div class="painel__conteudo caderno-board__conteudo">
              <q-inner-loading :showing="loadingCaderno" class="caderno-board__loading">
                <q-spinner-dots color="primary" size="40px" />
              </q-inner-loading>

              <q-scroll-area class="painel__scroll caderno-board__scroll">
                <div class="caderno-board__sections">
                  <section class="caderno-board__section">
                    <header class="caderno-board__section-header">
                      <span class="caderno-board__section-chip caderno-board__section-chip--pendente">Pendentes</span>
                      <span class="caderno-board__section-count">{{ quantidadeTexto(pendentes) }}</span>
                    </header>
                    <transition-group name="caderno" tag="div" class="caderno-board__group">
                      <PedidoCard
                        v-for="t in pendentes"
                        :key="t.id"
                        :transacao="t"
                        :titulo="nomeDoCliente(t)"
                        :resumo="resumoDosItens(t.id)"
                        @abrir="abrirDetalhes(t)"
                        @toggle-pronto="onTogglePronto(t)"
                        @toggle-pago="onTogglePago(t)"
                        @forma="abrirFormaPagamento(t)"
                      />
                    </transition-group>
                    <div v-if="!pendentes.length" class="caderno-board__empty">{{ estaFiltrando ? "Nenhum pedido pendente encontrado." : "Nenhum pedido pendente." }}</div>
                  </section>
                  <section class="caderno-board__section">
                    <header class="caderno-board__section-header">
                      <span class="caderno-board__section-chip caderno-board__section-chip--pronto">Prontos</span>
                      <span class="caderno-board__section-count">{{ quantidadeTexto(prontos) }}</span>
                    </header>
                    <transition-group name="caderno" tag="div" class="caderno-board__group">
                      <PedidoCard
                        v-for="t in prontos"
                        :key="t.id"
                        :transacao="t"
                        :titulo="nomeDoCliente(t)"
                        :resumo="resumoDosItens(t.id)"
                        @abrir="abrirDetalhes(t)"
                        @toggle-pronto="onTogglePronto(t)"
                        @toggle-pago="onTogglePago(t)"
                        @forma="abrirFormaPagamento(t)"
                      />
                    </transition-group>
                    <div v-if="!prontos.length" class="caderno-board__empty">{{ estaFiltrando ? "Nenhum pedido pronto encontrado." : "Nenhum pedido pronto." }}</div>
                  </section>
                  <section class="caderno-board__section">
                    <header class="caderno-board__section-header">
                      <span class="caderno-board__section-chip caderno-board__section-chip--cancelado">Cancelados</span>
                      <span class="caderno-board__section-count">{{ quantidadeTexto(cancelados) }}</span>
                    </header>
                    <transition-group name="caderno" tag="div" class="caderno-board__group">
                      <PedidoCard
                        v-for="t in cancelados"
                        :key="t.id"
                        :transacao="t"
                        :titulo="nomeDoCliente(t)"
                        :resumo="resumoDosItens(t.id)"
                        @abrir="abrirDetalhes(t)"
                        @toggle-pronto="onTogglePronto(t)"
                        @toggle-pago="onTogglePago(t)"
                        @forma="abrirFormaPagamento(t)"
                      />
                    </transition-group>
                    <div v-if="!cancelados.length" class="caderno-board__empty">{{ estaFiltrando ? "Nenhum pedido cancelado encontrado." : "Nenhum pedido cancelado." }}</div>
                  </section>
                </div>

              </q-scroll-area>
            </div>

            <TotaisBar
              :total-pedidos="totalPedidosAtivos"
              :valor-total="valorTotalAtivo"
              :visivel="totaisVisiveis"
              @toggle="toggleTotais"
              class="caderno-board__totais"
            />
          </section>
        </div>
        <div
          class="col-12 col-lg-5 caderno-page__form-col"
          :class="{ 'mobile-panel': usarToggle }"
          v-show="!usarToggle || mobileSection === 'form'"
        >
          <section class="painel caderno-form">
            <div class="painel__conteudo">
              <q-scroll-area class="painel__scroll caderno-form__scroll">
                <NovoPedidoForm
                  class="caderno-form__card"
                  :clientes="clientes"
                  :produtos="produtos"
                  :loading-clientes="loadingClientes"
                  :loading-produtos="loadingProdutos"
                  :draft="draftPedido"
                  :funcionarios-por-cliente="funcionariosPorCliente"
                  :buscar-funcionarios="store.buscarFuncionariosPorCliente"
                  @confirm="confirmarPedido"
                />
              </q-scroll-area>
            </div>
          </section>
        </div>
      </div>
    </div>
        <AbrirCaixaDialog
      v-model="dialogAbrir.aberto"
      @confirmar="aoConfirmarAbertura"
    />
    <FecharCaixaDialog
      v-model="dialogFechar.aberto"
      :esperado="esperadoPorForma"
      :contado-inicial="contadoInicialFechamento"
      :pendencias="pendenciasPagamentosSemForma"
      :vendas-sem-forma="vendasSemForma"
      :valor-abertura="valorAberturaAtual"
      :responsavel-inicial="responsavelFechamentoAtual"
      :observacoes-iniciais="observacoesFechamentoAtual"
      :carregando="carregandoFechamento"
      :somente-visual="fechamentoSomenteVisual"
      @confirmar="aoConfirmarFechamento"
      @reabrir="aoSolicitarReaberturaResumo"
    />
    <q-dialog v-model="dialogReabrirAviso.aberto">
      <q-card style="min-width: 320px">
        <q-card-section class="text-subtitle1">Caixa fechado</q-card-section>
        <q-card-section>
          O pedido foi salvo, mas o caixa deste dia est&aacute; fechado. Deseja reabri-lo para incluir este valor?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Depois" @click="dialogReabrirAviso.aberto = false" />
          <q-btn color="primary" label="Reabrir agora" @click="iniciarReaberturaCaixa" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="dialogReabrirDados.aberto">
      <q-card class="caixa-dialog caixa-dialog--compact">
        <q-card-section class="text-subtitle1">Reabrir Caixa</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="dialogReabrirDados.responsavel"
            label="Responsavel pela reabertura"
            filled
            autofocus
          />
          <q-input
            v-model.number="dialogReabrirDados.valor"
            type="number"
            min="0"
            step="0.01"
            label="Novo valor de abertura"
            filled
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="dialogReabrirDados.aberto = false" />
          <q-btn color="primary" label="Confirmar" @click="confirmarReaberturaCaixa" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Calendario -->
    <q-dialog v-model="mostrarCalendario" persistent :maximized="$q.screen.lt.sm">
      <q-card class="caderno-date-card">
        <QDate
          v-model="dia"
          mask="YYYY-MM-DD"
          :first-day-of-week="1"
          today-btn
          bordered
          class="full-width"
        />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="OK" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Forma de Pagamento -->
    <FormaPagamentoDialog
      v-model="dialogForma.aberto"
      :forma-atual="dialogForma.forma"
      @salvar="confirmarForma"
    />
    <!-- Detalhes -->
    <DetalhePedidoDialog ref="detalhePedidoDialog" />

    <SenhaDialog
      v-model="senhaDialog.aberto"
      :title="senhaDialog.titulo"
      :message="senhaDialog.mensagem"
      :input-label="senhaDialog.rotulo"
      :confirm-label="senhaDialog.confirmarRotulo"
      :cancel-label="senhaDialog.cancelarRotulo"
      :confirm-color="senhaDialog.corConfirmar"
      :error="senhaDialog.erro"
      @confirm="aoConfirmarSenha"
      @cancel="aoCancelarSenha"
    />

  </q-page>
</template>
<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, onActivated, watch } from 'vue'
import { useQuasar, date as qDate, QDate, uid } from 'quasar'
import { storeToRefs } from 'pinia'
import { useMainStore } from 'src/stores/main-store'
import { useAuthStore } from 'src/stores/auth-store'
import { useCaderno } from 'src/composables/useCaderno'
import { useCaixa } from 'src/composables/useCaixa'
import NovoPedidoForm from 'src/components/caderno/NovoPedidoForm.vue'
import PedidoCard from 'src/components/caderno/PedidoCard.vue'
import TotaisBar from 'src/components/caderno/TotaisBar.vue'
import AbrirCaixaDialog from 'src/components/caixa/AbrirCaixaDialog.vue'
import FecharCaixaDialog from 'src/components/caixa/FecharCaixaDialog.vue'
import FormaPagamentoDialog from 'src/components/caderno/FormaPagamentoDialog.vue'
import DetalhePedidoDialog from 'src/components/contas/DetalhePedidoDialog.vue'
import SenhaDialog from 'src/components/shared/SenhaDialog.vue'
import { printTransacao } from 'src/utils/print'
const $q = useQuasar()
const detalhePedidoDialog = ref(null)
const authStore = useAuthStore()
const { empresaConfig } = storeToRefs(authStore)
const isMobile = computed(() => $q.screen.lt.md)
const isLojaLayout = computed(() => (empresaConfig.value?.pdv_layout || 'RESTAURANTE') === 'LOJA')
const usarToggle = computed(() => isMobile.value || isLojaLayout.value)
const mobileSection = ref('board')
const mobileToggleOptions = [
  { label: 'Pedidos do dia', value: 'board' },
  { label: 'Novo pedido', value: 'form' },
]

const togglePagoCooldown = ref(false)
const TOGGLE_PAGO_COOLDOWN_MS = 700
let togglePagoCooldownTimer = null

function iniciarCooldownTogglePago() {
  togglePagoCooldown.value = true
  if (togglePagoCooldownTimer) {
    clearTimeout(togglePagoCooldownTimer)
  }
  togglePagoCooldownTimer = setTimeout(() => {
    togglePagoCooldown.value = false
    togglePagoCooldownTimer = null
  }, TOGGLE_PAGO_COOLDOWN_MS)
}
const store = useMainStore()
const {
  clientes,
  produtos,
  loadingClientes,
  loadingProdutos,
  funcionariosPorCliente,
} = storeToRefs(store)

const dia = ref(qDate.formatDate(new Date(), 'YYYY-MM-DD'))
const dataLonga = computed(() => {
  const parsed = qDate.extractDate(dia.value, 'YYYY-MM-DD')
  if (!parsed) return ''
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

const clientesById = computed(() => {
  const map = {}
  for (const cliente of clientes.value || []) {
    if (cliente?.id == null) continue
    map[cliente.id] = cliente.nome || 'Cliente'
  }
  return map
})

const {
  pendentes: pendentesOriginais,
  prontos: prontosOriginais,
  cancelados: canceladosOriginais,
  carregandoDia,
  itensPorTransacao,
  carregarDoDia,
  carregarItens,
  criarPedido,
  atualizarTransacao,
  removerTransacao,
  excluirTransacaoDefinitiva,
  togglePago,
  togglePronto,
  setFormaPagamento,
} = useCaderno(dia)
const {
  caixaDoDia,
  status: statusCaixa,
  aberto: caixaAberto,
  fechado: caixaFechado,
  pendenciasForma,
  vendasSemForma,
  esperadoPorForma,
  carregando: carregandoCaixa,
  recarregar: recarregarCaixa,
  abrir: abrirCaixaServico,
  fechar: fecharCaixaServico,
  reabrir: reabrirCaixaServico,
} = useCaixa(dia)
const pendenciasPagamentosSemForma = computed(() => pendenciasForma.value || [])
const buscaTermo = ref('')
const buscaInput = ref(null)
const buscaTokens = computed(() => {
  const texto = normalizarTexto(buscaTermo.value)
  return texto ? texto.split(/\s+/).filter(Boolean) : []
})
const estaFiltrando = computed(() => buscaTokens.value.length > 0)

const pendentes = computed(() => filtrarPorBusca(pendentesOriginais.value || []))
const prontos = computed(() => filtrarPorBusca(prontosOriginais.value || []))
const cancelados = computed(() => filtrarPorBusca(canceladosOriginais.value || []))
const draftPedido = ref(null)
const transacaoEmEdicao = ref(null)
watch(usarToggle, (novo) => {
  if (!novo) {
    mobileSection.value = 'board'
    return
  }
  if (isLojaLayout.value) {
    mobileSection.value = 'form'
  }
}, { immediate: true })
const recarregar = () => carregarDoDia(true)
const SENHA_ADMIN = import.meta.env.VITE_ADMIN_PIN || '1234'
const senhaDialog = reactive({
  aberto: false,
  contexto: null,
  titulo: '',
  mensagem: '',
  rotulo: 'Senha',
  confirmarRotulo: 'Confirmar',
  cancelarRotulo: 'Cancelar',
  corConfirmar: 'warning',
  erro: '',
})
const dialogAbrir = reactive({ aberto: false })
const dialogFechar = reactive({ aberto: false })
const dialogForma = reactive({ aberto: false, transacao: null, forma: null })
const dialogReabrirAviso = reactive({ aberto: false })
const dialogReabrirDados = reactive({ aberto: false, responsavel: '', valor: 0 })
const carregandoFechamento = ref(false)
const fechamentoSomenteVisual = ref(false)
const valorAberturaOverride = ref(null)
const loadingCaderno = computed(() => carregandoDia.value)
const valorAberturaAtual = computed(() => {
  const base = Number(caixaDoDia.value?.valor_abertura || 0)
  return valorAberturaOverride.value != null ? valorAberturaOverride.value : base
})
const contadoInicialFechamento = computed(() => caixaDoDia.value?.contado_por_forma || {})
const responsavelFechamentoAtual = computed(() => caixaDoDia.value?.nome_responsavel_fechamento || '')
const observacoesFechamentoAtual = computed(() => caixaDoDia.value?.observacoes || '')
watch(() => dialogFechar.aberto, (aberto) => {
  if (!aberto) {
    fechamentoSomenteVisual.value = false
  }
})
watch(() => caixaDoDia.value?.valor_abertura, (novo) => {
  if (valorAberturaOverride.value != null) {
    const numerico = Number(novo || 0)
    if (Math.abs(numerico - valorAberturaOverride.value) < 0.01) {
      valorAberturaOverride.value = null
    }
  }
})
function abrirDialogSenha({ contexto, titulo, mensagem, confirmarRotulo = 'Confirmar', cancelarRotulo = 'Cancelar', corConfirmar = 'warning', rotulo = 'Senha' }) {
  senhaDialog.contexto = contexto
  senhaDialog.titulo = titulo
  senhaDialog.mensagem = mensagem
  senhaDialog.confirmarRotulo = confirmarRotulo
  senhaDialog.cancelarRotulo = cancelarRotulo
  senhaDialog.corConfirmar = corConfirmar
  senhaDialog.rotulo = rotulo
  senhaDialog.erro = ''
  senhaDialog.aberto = true
}

function solicitarSenhaCaixa(acao) {
  abrirDialogSenha({
    contexto: acao,
    titulo: acao === 'resumo-fechado' ? 'Resumo do Caixa' : 'Autorizacao do Caixa',
    mensagem: acao === 'resumo-fechado' ? 'Informe a senha para visualizar o resumo do caixa.' : 'Informe a senha de autorizacao para continuar.',
    confirmarRotulo: acao === 'resumo-fechado' ? 'Ver resumo' : 'Confirmar',
    cancelarRotulo: 'Cancelar',
    corConfirmar: 'primary',
    rotulo: 'Senha',
  })
}

function aoConfirmarSenha(valorDigitado) {
  if ((valorDigitado || '') !== SENHA_ADMIN) {
    senhaDialog.erro = 'Senha invalida'
    return
  }
  const contexto = senhaDialog.contexto
  senhaDialog.aberto = false
  senhaDialog.contexto = null
  senhaDialog.erro = ''
  if (contexto === 'totais') {
    totaisVisiveis.value = true
  } else if (contexto) {
    executarAcaoCaixa(contexto)
  }
}

function aoCancelarSenha() {
  senhaDialog.aberto = false
  senhaDialog.erro = ''
  senhaDialog.contexto = null
}

function executarAcaoCaixa(acao) {
  if (acao === 'abrir') {
    dialogAbrir.aberto = true
  } else if (acao === 'fechar') {
    void prepararFechamentoCaixa()
  } else if (acao === 'reabrir') {
    dialogReabrirDados.responsavel = ''
    dialogReabrirDados.valor = Number(valorAberturaAtual.value || 0)
    dialogReabrirDados.aberto = true
  } else if (acao === 'resumo-fechado') {
    void prepararFechamentoCaixa({ visualizar: true })
  }
}

async function prepararFechamentoCaixa({ visualizar = false } = {}) {
  try {
    fechamentoSomenteVisual.value = visualizar
    await recarregarCaixa()
    dialogFechar.aberto = true
  } catch (error) {
    console.error('Falha ao preparar fechamento', error)
    $q.notify({ type: 'negative', message: 'N\u00e3o foi poss\u00edvel carregar dados do caixa.' })
  }
}

async function aoConfirmarAbertura({ responsavel, valorAbertura }) {
  if (!responsavel) {
    $q.notify({ type: 'warning', message: 'Informe o respons\u00e1vel pela abertura.' })
    return
  }
  try {
    await abrirCaixaServico({ responsavel, valor_abertura: valorAbertura })
    $q.notify({ type: 'positive', message: 'Caixa aberto.' })
    await recarregarCaixa()
  } catch (error) {
    console.error('Falha ao abrir caixa', error)
    $q.notify({ type: 'negative', message: 'N\u00e3o foi poss\u00edvel abrir o caixa.' })
  }
}

async function aoConfirmarFechamento({ responsavel, contadoPorForma, observacoes }) {
  if (!responsavel) {
    $q.notify({ type: 'warning', message: 'Informe o respons\u00e1vel pelo fechamento.' })
    dialogFechar.aberto = true
    return
  }
  try {
    carregandoFechamento.value = true
    await fecharCaixaServico({
      responsavel,
      contado_por_forma: contadoPorForma,
      observacoes,
    })
    $q.notify({ type: 'positive', message: 'Caixa fechado.' })
    dialogFechar.aberto = false
    await recarregarCaixa()
  } catch (error) {
    if (error?.code === 'FORMA_PENDENTE' || error?.code === 'VENDA_PAGA_SEM_FORMA') {
      await recarregarCaixa()
      $q.notify({ type: 'warning', message: error.message || 'Resolva as pend\u00eancias para fechar o caixa.' })
      dialogFechar.aberto = true
    } else {
      console.error('Falha ao fechar caixa', error)
      $q.notify({ type: 'negative', message: 'N\u00e3o foi poss\u00edvel fechar o caixa.' })
    }
  } finally {
    carregandoFechamento.value = false
    fechamentoSomenteVisual.value = false
  }
}

function abrirFecharCaixa() {
  if (carregandoCaixa.value || carregandoFechamento.value) return
  let acao
  if (caixaAberto.value) {
    acao = 'fechar'
  } else if (caixaFechado.value && caixaDoDia.value) {
    acao = 'resumo-fechado'
  } else {
    acao = 'abrir'
  }
  solicitarSenhaCaixa(acao)
}

function iniciarReaberturaCaixa() {
  dialogReabrirAviso.aberto = false
  dialogReabrirDados.valor = Number(valorAberturaAtual.value || 0)
  solicitarSenhaCaixa('reabrir')
}

function aoSolicitarReaberturaResumo() {
  dialogFechar.aberto = false
  fechamentoSomenteVisual.value = false
  dialogReabrirDados.responsavel = ''
  dialogReabrirDados.valor = Number(valorAberturaAtual.value || 0)
  dialogReabrirDados.aberto = true
}

async function confirmarReaberturaCaixa() {
  if (!dialogReabrirDados.responsavel) {
    $q.notify({ type: 'warning', message: 'Informe quem est\u00e1 reabrindo o caixa.' })
    return
  }
  try {
    await reabrirCaixaServico({ responsavel: dialogReabrirDados.responsavel, valor_abertura: dialogReabrirDados.valor })
    caixaDoDia.value = { ...caixaDoDia.value, status: 'ABERTO', valor_abertura: Number(dialogReabrirDados.valor || 0) }
    valorAberturaOverride.value = Number(dialogReabrirDados.valor || 0)
    $q.notify({ type: 'positive', message: 'Caixa reaberto.' })
    dialogReabrirDados.aberto = false
    await recarregarCaixa()
  } catch (error) {
    console.error('Falha ao reabrir caixa', error)
    $q.notify({ type: 'negative', message: 'N\u00e3o foi poss\u00edvel reabrir o caixa.' })
  }
}
onMounted(() => {
  if (!produtos.value?.length) store.buscarProdutosIniciais()
  if (!clientes.value?.length) store.buscarClientes()
  window.addEventListener('keydown', handleAtalhoBusca)
  recarregar()
  void recarregarCaixa()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleAtalhoBusca)
})
onActivated(() => {
  recarregar()
  void recarregarCaixa()
})
watch(dia, () => {
  dialogReabrirAviso.aberto = false
  dialogReabrirDados.aberto = false
})
watch([pendentesOriginais, prontosOriginais], () => {
  if (carregandoDia.value) return
  const ids = [...(pendentesOriginais.value || []), ...(prontosOriginais.value || [])].map((t) => t.id)
  ids.forEach((id) => {
    if (!itensPorTransacao.value[id]) {
      carregarItens(id)
    }
  })
}, { immediate: true })
function mudarDia(delta) {
  const d = qDate.addToDate(qDate.extractDate(dia.value, 'YYYY-MM-DD'), { days: delta })
  dia.value = qDate.formatDate(d, 'YYYY-MM-DD')
  carregarDoDia(true)
}
// Novo pedido
async function confirmarPedido(payload) {
  if (transacaoEmEdicao.value) {
    try {
      await atualizarTransacao(transacaoEmEdicao.value, payload)
      transacaoEmEdicao.value = null
      draftPedido.value = null
      detalhePedidoDialog.value?.fechar?.()
      if (usarToggle.value) {
        mobileSection.value = 'board'
      }
      $q.notify({ type: 'positive', message: 'Pedido atualizado.' })
      await recarregarCaixa()
    } catch (error) {
      console.error('Falha ao atualizar pedido', error)
      $q.notify({ type: 'negative', message: 'Nao foi possivel atualizar o pedido.' })
    }
    return
  }
  try {
    await criarPedido(payload)
    $q.notify({ type: 'positive', message: 'Pedido registrado.' })
    await recarregarCaixa()
    if (statusCaixa.value === 'FECHADO' && caixaDoDia.value) {
      dialogReabrirAviso.aberto = true
    }
  } catch (error) {
    console.error('Falha ao criar pedido', error)
    $q.notify({ type: 'negative', message: 'Nao foi possivel salvar o pedido.' })
  }
}

function onTogglePronto(t) {
  togglePronto(t, !t.pronto)
}
async function ensureItensCarregados(transacao) {
  if (!transacao) return []
  if (!itensPorTransacao.value[transacao.id]) {
    await carregarItens(transacao.id)
  }
  return itensPorTransacao.value[transacao.id] || []
}
async function imprimir(transacao) {
  if (!transacao) return
  try {
    const itens = await ensureItensCarregados(transacao)
    await printTransacao(transacao, itens, {
      title: "Pedido",
      clienteStr: nomeDoCliente(transacao),
      nomeFormaPagamento,
    })
    $q.notify({ type: "positive", message: "Pedido enviado para impressao." })
  } catch (error) {
    console.error("Falha ao imprimir pedido", error)
    $q.notify({ type: "negative", message: "Nao foi possivel imprimir o pedido." })
  }
}
async function editar(transacao) {
  if (!transacao) return
  try {
    const itens = await ensureItensCarregados(transacao)
    transacaoEmEdicao.value = transacao
    draftPedido.value = {
      cliente_id: transacao.cliente_id || null,
      nome_cliente_avulso: transacao.nome_cliente_avulso || null,
      nome_funcionario_empresa: transacao.nome_funcionario_empresa || "",
      itens: itens.map((it) => ({
        _uid: uid(),
        produto_id: it.produto_id || null,
        nome_produto_congelado: it.nome_produto_congelado || "Produto",
        preco_unitario_congelado: Number(it.preco_unitario_congelado || 0),
        quantidade: Number(it.quantidade || 1),
      })),
      status_pagamento: transacao.status_pagamento || "NAO_INFORMADO",
      forma_pagamento: transacao.forma_pagamento || null,
      data_transacao: transacao.data_transacao || transacao.created_at || null,
      observacoes: transacao.observacoes || "",
    }
    detalhePedidoDialog.value?.fechar?.()
    if (usarToggle.value) {
      mobileSection.value = "form"
    }
    $q.notify({ type: "info", message: "Pedido carregado para edicao. Ajuste e salve." })
  } catch (error) {
    console.error("Falha ao preparar itens para edicao", error)
    $q.notify({ type: "negative", message: "Nao foi possivel preparar o pedido para edicao." })
  }
}

function cancelarPedido(transacao) {
  if (!transacao) return
  $q.dialog({
    title: "Cancelar pedido",
    message:
      "Deseja realmente cancelar este pedido? Ele sera mantido para auditoria, porem nao entrara nas contagens.",
    cancel: { label: "Voltar" },
    ok: { label: "Cancelar pedido", color: "negative" },
    persistent: true,
  }).onOk(async () => {
    try {
      await removerTransacao(transacao)
      if (transacaoEmEdicao.value?.id === transacao.id) {
        transacaoEmEdicao.value = null
        draftPedido.value = null
      }
      detalhePedidoDialog.value?.fechar?.()
      $q.notify({ type: "positive", message: "Pedido cancelado com sucesso." })
    } catch (error) {
      console.error("Falha ao cancelar pedido", error)
      $q.notify({ type: "negative", message: "Nao foi possivel cancelar o pedido." })
    }
  })
}

async function excluirPedidoDefinitivo(transacao) {
  if (!transacao) return
  const resultado = await solicitarSenhaExclusaoDefinitiva()
  if (!resultado.autorizado) {
    if (!resultado.cancelado) {
      $q.notify({ type: "negative", message: "Senha incorreta. Exclusao cancelada." })
    }
    return
  }
  try {
    await excluirTransacaoDefinitiva(transacao)
    if (transacaoEmEdicao.value?.id === transacao.id) {
      transacaoEmEdicao.value = null
      draftPedido.value = null
    }
    detalhePedidoDialog.value?.fechar?.()
    $q.notify({ type: "positive", message: "Pedido excluido definitivamente." })
  } catch (error) {
    console.error("Falha ao excluir pedido definitivamente", error)
    $q.notify({ type: "negative", message: "Nao foi possivel excluir o pedido." })
  }
}

function solicitarSenhaExclusaoDefinitiva() {
  return new Promise((resolve) => {
    $q.dialog({
      title: "Excluir pedido definitivamente?",
      message:
        "Esta acao nao pode ser desfeita. Digite sua senha de administrador para confirmar.",
      prompt: {
        model: "",
        type: "password",
        label: "Senha do administrador",
        filled: true,
      },
      ok: { label: "Confirmar", color: "negative", unelevated: true },
      cancel: { label: "Cancelar" },
      persistent: true,
    })
      .onOk((valor) => {
        const senha = String(valor || "").trim()
        resolve({ autorizado: senha === SENHA_ADMIN, cancelado: false })
      })
      .onCancel(() => resolve({ autorizado: false, cancelado: true }))
  })
}
function abrirFormaPagamento(transacao) {
  if (!transacao) return
  dialogForma.transacao = transacao
  dialogForma.forma = transacao.forma_pagamento || null
  dialogForma.aberto = true
}

async function confirmarForma(forma) {
  const transacao = dialogForma.transacao
  dialogForma.aberto = false
  dialogForma.forma = forma
  if (!transacao) return
  try {
    await setFormaPagamento(transacao, forma)
    $q.notify({ type: 'positive', message: 'Forma de pagamento atualizada.' })
    await recarregarCaixa()
  } catch (error) {
    console.error('Falha ao atualizar forma de pagamento', error)
    $q.notify({ type: 'negative', message: 'Nao foi possivel atualizar a forma de pagamento.' })
  } finally {
    dialogForma.transacao = null
  }
}
async function abrirDetalhes(t) {
  if (!detalhePedidoDialog.value) return
  await carregarItens(t.id)
  const itens = itensPorTransacao.value[t.id] || []
  const total = Number(t.valor ?? t.valor_total ?? 0)
  detalhePedidoDialog.value.abrir({
    itens,
    cliente: nomeDoCliente(t),
    funcionario: t.nome_funcionario_empresa,
    formaPagamento: nomeFormaPagamento(t.forma_pagamento),
    status: t.status_pagamento,
    data: t.data_transacao || t.created_at,
    observacao: t.observacoes,
    total,
    onImprimir: () => imprimir(t),
    onEditar: t.status_pagamento !== "CANCELADA" ? () => editar(t) : null,
    onCancelar: t.status_pagamento !== "CANCELADA" ? () => cancelarPedido(t) : null,
    onExcluir: () => excluirPedidoDefinitivo(t),
  })
}

// Totais protegidos
const totaisVisiveis = ref(false)
function toggleTotais() {
  if (totaisVisiveis.value) {
    totaisVisiveis.value = false
    return
  }
  abrirDialogSenha({
    contexto: "totais",
    titulo: "Totais protegidos",
    mensagem: "Digite a senha para visualizar os valores.",
    confirmarRotulo: "OK",
    cancelarRotulo: "Cancelar",
    corConfirmar: "warning",
    rotulo: "Senha",
  })
}
// Caixa
const mostrarCalendario = ref(false)
// Totais/contagem sem cancelados
const totalPedidosAtivos = computed(() => pendentes.value.length + prontos.value.length)
const valorTotalAtivo = computed(() =>
  [...pendentes.value, ...prontos.value].reduce(
    (acc, t) => acc + Number(t.valor ?? t.valor_total ?? 0),
    0,
  ),
)
function normalizarTexto(valor) {
  if (valor == null) return ''
  let texto = String(valor)
  try {
    texto = texto.normalize('NFD')
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('Falha ao normalizar texto para busca', error)
    }
  }
  return texto.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
function camposBuscaDaTransacao(transacao) {
  if (!transacao) return []
  const campos = []
  if (transacao.nome_cliente_avulso) campos.push(transacao.nome_cliente_avulso)
  if (transacao.nome_funcionario_empresa) campos.push(transacao.nome_funcionario_empresa)
  if (transacao.clientes?.nome) campos.push(transacao.clientes.nome)
  if (transacao.cliente_id && clientesById.value[transacao.cliente_id]) {
    campos.push(clientesById.value[transacao.cliente_id])
  }
  const titulo = nomeDoCliente(transacao)
  if (titulo) campos.push(titulo)
  return campos
}
function transacaoCombinaBusca(transacao) {
  if (!buscaTokens.value.length) return true
  const campos = camposBuscaDaTransacao(transacao)
  if (!campos.length) return false
  const alvo = campos
    .map(normalizarTexto)
    .filter(Boolean)
    .join(' ')
  if (!alvo) return false
  return buscaTokens.value.every((token) => alvo.includes(token))
}
function filtrarPorBusca(lista = []) {
  if (!Array.isArray(lista)) return []
  if (!buscaTokens.value.length) return lista
  return lista.filter((transacao) => transacaoCombinaBusca(transacao))
}
function focarBusca() {
  if (buscaInput.value?.focus) {
    buscaInput.value.focus()
  }
}
function handleAtalhoBusca(event) {
  if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const target = event.target
  if (target) {
    const tag = target.tagName ? target.tagName.toLowerCase() : ''
    if (['input', 'textarea', 'select'].includes(tag)) return
    if (target.isContentEditable) return
  }
  event.preventDefault()
  focarBusca()
}

// Helpers
function nomeDoCliente(t) {
  if (!t) return ''
  if (!t.cliente_id) {
    return t.nome_cliente_avulso
      ? `Cliente Avulso (${t.nome_cliente_avulso})`
      : 'Cliente Avulso'
  }
  const base = t?.clientes?.nome || clientesById.value[t.cliente_id] || 'Cliente'
  return base
}
function resumoDosItens(id) {
  const itens = itensPorTransacao.value[id] || []
  const nomes = itens.map((i) => i.nome_produto_congelado || 'Produto')
  const txt = nomes.join(', ')
  return txt.length > 80 ? txt.slice(0, 77) + '...' : txt
}
function quantidadeTexto(lista) {
  const total = Array.isArray(lista) ? lista.length : 0
  return total === 1 ? '1 pedido' : `${total} pedidos`
}
function nomeFormaPagamento(fp) {
  const map = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'D\u00e9bito',
    CREDITO: 'Cr\u00e9dito',
    OUTRO: 'Outro',
  }
  return map[fp] || null
}
// Chips (sem 'val' extra -> some o aviso do ESLint)
async function onTogglePago(t) {
  if (togglePagoCooldown.value) return
  if (!t?.cliente_id) {
    $q.notify({ type: 'warning', message: 'Cliente avulso e sempre pago.' })
    return
  }
  if (t.status_pagamento === 'PARCIAL') {
    $q.notify({ type: 'warning', message: 'Pagamento parcial. Ajuste pelo contas a receber.' })
    return
  }
  if (t.status_pagamento === 'CANCELADA') return
  iniciarCooldownTogglePago()
  await aplicarTogglePago(t)
}

async function aplicarTogglePago(transacao) {
  try {
    await togglePago(transacao)
  } catch (error) {
    if (error?.code === 'PAGAMENTO_ALOCADO') {
      $q.notify({ type: 'warning', message: 'Venda possui pagamentos aplicados. Ajuste pelo contas a receber.' })
      return
    }
    $q.notify({ type: 'negative', message: 'Falha ao atualizar o pagamento.' })
    console.error(error)
  }
}
</script>

<style scoped>
.caderno-page__cash-btn--icon {
  padding: 10px;
  border-radius: 999px;
}
.caderno-page__cash-btn:hover {
  transform: translateY(-2px);
  background: rgba(0, 0, 0, 0.1);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
}
.caderno-page__board-col,
.caderno-page__form-col {
  display: flex;
  flex-direction: column;
}
.caderno-page__form-col {
  order: 1;
}
.caderno-page__board-col {
  order: 2;
}
.caderno-form__card {
  display: flex;
  flex-direction: column;
}
.caderno-board {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.caderno-board__topo {
  align-items: flex-start;
  gap: 18px;
}
.caderno-board__headlines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.painel__label {
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--caderno-text-muted);
  font-weight: 600;
}
.painel__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--caderno-text-strong);
  text-transform: capitalize;
}
.painel__acoes {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.painel__acoes-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.painel__acoes-nav :deep(.q-btn) {
  background: rgba(0, 0, 0, 0.06);
  color: var(--caderno-text-strong);
  border-radius: 14px;
  transition: transform 0.2s ease, background 0.2s ease;
}
.painel__acoes-nav :deep(.q-btn:hover) {
  background: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
.caderno-board__header {
  width: 100%;
}

.caderno-board__search {
  width: 100%;
}
.caderno-board__search :deep(.q-field) {
  width: 100%;
}
.caderno-board__sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.caderno-board__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px 22px;
  border-radius: 22px;
  background: var(--caderno-surface);
  border: 1px solid var(--caderno-outline);
  box-shadow: var(--caderno-shadow);
}
.caderno-board__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.caderno-board__section-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  background: rgba(0, 0, 0, 0.06);
  color: var(--caderno-text-strong);
}
.caderno-board__section-chip--pronto {
  background: rgba(129, 199, 132, 0.22);
  color: #1b5e20;
}
.caderno-board__section-chip--cancelado {
  background: rgba(176, 190, 197, 0.28);
  color: #37474f;
}
.caderno-board__section-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--caderno-text-muted);
}
.caderno-board__group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.caderno-board__empty {
  padding: 22px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--caderno-text-medium);
  background: var(--caderno-surface-alt);
  border: 1px dashed var(--caderno-outline);
  border-radius: 16px;
}
.caderno-board__totais {
  margin-top: 12px;
}
.caderno-board__loading {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
@media (max-width: 1023px) {
  .caderno-page__form-col {
    order: 2;
  }
  .caderno-page__board-col {
    order: 1;
  }
  .caderno-board {
    gap: 20px;
  }
  .caderno-board__section {
    padding: 18px 18px 20px;
  }
}
@media (max-width: 599px) {
  .caderno-page__cash-btn {
    width: 100%;
    justify-content: center;
    padding: 10px 12px;
  }
  .painel__acoes {
    justify-content: flex-start;
    gap: 8px;
  }
  .painel__acoes-nav {
    width: 100%;
    justify-content: space-between;
    display: flex;
  }
  .caderno-board__sections {
    gap: 16px;
  }
  .painel__acoes-nav :deep(.q-btn) {
    background: rgba(255, 255, 255, 0.85);
  }
}

.caixa-dialog {
  width: 420px;
  max-width: 92vw;
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 58px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.caixa-dialog--compact :deep(.q-card__section:first-of-type) {
  padding: 24px 28px 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-text-strong);
}

.caixa-dialog--compact :deep(.q-card__section:nth-of-type(2)) {
  padding: 6px 28px 26px;
}

.caixa-dialog--compact :deep(.q-card__actions) {
  padding: 18px 28px 22px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  gap: 12px;
}

.caixa-dialog--compact :deep(.q-card__actions .q-btn.q-btn--flat) {
  color: #64748b;
  font-weight: 600;
}

.caixa-dialog--compact :deep(.q-card__actions .q-btn.bg-primary) {
  border-radius: 12px;
  font-weight: 700;
  padding: 10px 24px;
  background: linear-gradient(130deg, var(--brand-primary), var(--brand-primary));
  color: var(--brand-text-strong);
  box-shadow: 0 14px 28px rgba(245, 158, 11, 0.28);
}

.caixa-dialog--compact :deep(.q-field--filled .q-field__control) {
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: none;
}

.caixa-dialog--compact :deep(.q-field--filled .q-field__control:before),
.caixa-dialog--compact :deep(.q-field--filled .q-field__control:after) {
  display: none;
}

.caixa-dialog--compact :deep(.q-field__label) {
  color: rgba(100, 116, 139, 0.95);
  font-weight: 600;
  letter-spacing: 0.01em;
}

@media (max-width: 600px) {
  .caixa-dialog {
    width: 100%;
    border-radius: 18px;
  }
}

</style>

