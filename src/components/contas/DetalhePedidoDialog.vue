<template>
  <q-dialog v-model="aberto" :maximized="$q.screen.lt.md">
    <q-card class="dialog-card dialog-card--pedido">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Detalhes do Pedido</div>
          <div class="dialog-card__subtitle">Itens registrados nesta venda.</div>
        </div>
        <q-btn flat round dense icon="close" v-close-popup @click="fechar" />
      </div>
      <div class="dialog-card__body">
        <div v-if="temMeta" class="pedido-meta">
          <div class="pedido-meta__grid">
            <div v-if="meta.cliente" class="pedido-meta__item">
              <span class="pedido-meta__label">Cliente</span>
              <span class="pedido-meta__value">{{ meta.cliente }}</span>
            </div>
            <div v-if="meta.funcionario" class="pedido-meta__item">
              <span class="pedido-meta__label">Funcion&aacute;rio</span>
              <span class="pedido-meta__value">{{ meta.funcionario }}</span>
            </div>
            <div v-if="statusFormatado" class="pedido-meta__item">
              <span class="pedido-meta__label">Status</span>
              <span class="pedido-meta__value">{{ statusFormatado }}</span>
            </div>
            <div v-if="valorPagoFormatado" class="pedido-meta__item">
              <span class="pedido-meta__label">Valor pago</span>
              <span class="pedido-meta__value">{{ valorPagoFormatado }}</span>
            </div>
            <div v-if="saldoAbertoFormatado" class="pedido-meta__item">
              <span class="pedido-meta__label">Saldo em aberto</span>
              <span class="pedido-meta__value">{{ saldoAbertoFormatado }}</span>
            </div>
            <div v-if="meta.formaPagamento" class="pedido-meta__item">
              <span class="pedido-meta__label">Forma de pagamento</span>
              <span class="pedido-meta__value">{{ meta.formaPagamento }}</span>
            </div>
            <div v-if="dataFormatada" class="pedido-meta__item">
              <span class="pedido-meta__label">Data da venda</span>
              <span class="pedido-meta__value">{{ dataFormatada }}</span>
            </div>
          </div>
          <div v-if="meta.observacao" class="pedido-meta__obs">
            <span class="pedido-meta__label">Observa&ccedil;&otilde;es</span>
            <span class="pedido-meta__obs-text">{{ meta.observacao }}</span>
          </div>
        </div>
        <div v-if="!itens.length" class="dialog-card__empty">Nenhum item registrado.</div>
        <div v-else class="pedido-itens">
          <div v-for="it in itens" :key="it.id" class="pedido-item">
            <div class="pedido-item__info">
              <div class="pedido-item__nome">{{ it.nome_produto_congelado || 'Produto' }}</div>
              <div class="pedido-item__detalhe">
                {{ it.quantidade }} x {{ formatCurrency(it.preco_unitario_congelado) }}
              </div>
            </div>
            <div class="pedido-item__total">{{ formatCurrency(it.quantidade * Number(it.preco_unitario_congelado || 0)) }}</div>
          </div>
        </div>
        <div v-if="pagamentosExibicao.length" class="pedido-pagamentos">
          <div class="pedido-pagamentos__title">Pagamentos aplicados</div>
          <div v-for="pagamento in pagamentosExibicao" :key="pagamento.id" class="pedido-pagamento" :class="{ 'pedido-pagamento--estornado': pagamento.estornado }">
            <div class="pedido-pagamento__info">
              <div class="pedido-pagamento__linha">{{ formatDateTime(pagamento.data_pagamento || pagamento.created_at) }}</div>
              <div class="pedido-pagamento__linha">{{ nomeForma(pagamento.forma_pagamento) || 'Pagamento' }}</div>
              <div v-if="pagamento.observacao" class="pedido-pagamento__linha">{{ pagamento.observacao }}</div>
              <div v-if="pagamento.estornado" class="pedido-pagamento__tag">Estornado</div>
            </div>
            <div class="pedido-pagamento__valor">{{ formatCurrency(pagamento.valor_aplicado || pagamento.valor) }}</div>
          </div>
        </div>
      </div>
      <div class="dialog-card__footer">
        <div v-if="temAcoes" class="dialog-card__actions">
          <q-btn
            v-if="acoesDisponiveis.imprimir"
            outline
            color="primary"
            class="dialog-card__action-btn"
            icon="print"
            label="Imprimir"
            v-close-popup
            @click="executarAcao('onImprimir')"
          />
          <q-btn
            v-if="acoesDisponiveis.editar"
            flat
            color="primary"
            class="dialog-card__action-btn"
            icon="edit"
            label="Editar"
            v-close-popup
            @click="executarAcao('onEditar')"
          />
          <q-btn
            v-if="acoesDisponiveis.cancelar"
            flat
            color="negative"
            class="dialog-card__action-btn dialog-card__action-btn--danger"
            icon="block"
            label="Cancelar"
            v-close-popup
            @click="executarAcao('onCancelar')"
          >
            <q-tooltip anchor="top middle" self="bottom middle" class="bg-negative text-white">
              Mant&eacute;m o pedido no hist&oacute;rico como cancelado.
            </q-tooltip>
          </q-btn>
          <q-btn
            v-if="acoesDisponiveis.excluir"
            flat
            color="negative"
            class="dialog-card__action-btn dialog-card__action-btn--danger"
            icon="delete_forever"
            label="Excluir"
            v-close-popup
            @click="executarAcao('onExcluir')"
          >
            <q-tooltip anchor="top middle" self="bottom middle" class="bg-negative text-white">
              Apaga definitivamente do sistema. A&ccedil;&atilde;o irrevers&iacute;vel.
            </q-tooltip>
          </q-btn>
        </div>
        <div class="pedido-total">
          <span>Total do pedido</span>
          <span>{{ formatCurrency(total) }}</span>
        </div>
        <q-btn unelevated color="primary" class="dialog-card__btn-salvar" label="Fechar" @click="fechar" />
      </div>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, computed } from 'vue'
const aberto = ref(false)
const itens = ref([])
const pagamentos = ref([])
const meta = ref({
  cliente: '',
  funcionario: null,
  formaPagamento: null,
  status: '',
  data: null,
  observacao: null,
  total: null,
  valorPago: null,
  saldoAberto: null,
})
const acoes = ref({
  onImprimir: null,
  onEditar: null,
  onCancelar: null,
  onExcluir: null,
})
const total = computed(() => {
  if (meta.value.total != null) {
    return Number(meta.value.total) || 0
  }
  return itens.value.reduce((soma, item) => soma + item.quantidade * Number(item.preco_unitario_congelado || 0), 0)
})
const temMeta = computed(() => {
  const info = meta.value
  return Boolean(
    info.cliente ||
      info.funcionario ||
      info.formaPagamento ||
      info.status ||
      info.data ||
      info.observacao ||
      info.valorPago != null ||
      info.saldoAberto != null,
  )
})
const acoesDisponiveis = computed(() => ({
  imprimir: typeof acoes.value.onImprimir === 'function',
  editar: typeof acoes.value.onEditar === 'function',
  cancelar: typeof acoes.value.onCancelar === 'function',
  excluir: typeof acoes.value.onExcluir === 'function',
}))
const temAcoes = computed(() => Object.values(acoesDisponiveis.value).some(Boolean))
const statusFormatado = computed(() => {
  const mapa = {
    PAGO: 'Quitada',
    PARCIAL: 'Parcial',
    NAO_INFORMADO: 'N\u00e3o informado',
    PENDENTE: 'N\u00e3o paga',
    CANCELADA: 'Cancelada',
  }
  const status = meta.value.status
  return status ? mapa[status] || status : ''
})

const pagamentosExibicao = computed(() => (Array.isArray(pagamentos.value) ? pagamentos.value : []))
const valorPagoNumero = computed(() => {
  if (meta.value.valorPago != null) return Number(meta.value.valorPago) || 0
  if (!pagamentosExibicao.value.length) return null
  return pagamentosExibicao.value.reduce((acc, p) => acc + Number(p.valor_aplicado || 0), 0)
})
const saldoAbertoNumero = computed(() => {
  if (meta.value.saldoAberto == null) return null
  return Number(meta.value.saldoAberto) || 0
})
const valorPagoFormatado = computed(() => (valorPagoNumero.value == null ? '' : formatCurrency(valorPagoNumero.value)))
const saldoAbertoFormatado = computed(() => (saldoAbertoNumero.value == null ? '' : formatCurrency(saldoAbertoNumero.value)))

const dataFormatada = computed(() => {
  if (!meta.value.data) return ''
  return formatDateTime(meta.value.data)
})
function abrir({
  itens: lista = [],
  cliente = '',
  funcionario = null,
  formaPagamento = null,
  status = '',
  data = null,
  observacao = null,
  total = null,
  valorPago = null,
  saldoAberto = null,
  pagamentos: listaPagamentos = [],
  onImprimir = null,
  onEditar = null,
  onCancelar = null,
  onExcluir = null,
} = {}) {
  itens.value = Array.isArray(lista) ? lista : []
  pagamentos.value = Array.isArray(listaPagamentos) ? listaPagamentos : []
  meta.value = {
    cliente,
    funcionario,
    formaPagamento,
    status,
    data,
    observacao,
    total,
    valorPago,
    saldoAberto,
  }
  acoes.value = { onImprimir, onEditar, onCancelar, onExcluir }
  aberto.value = true
}
function executarAcao(chave) {
  const fn = acoes.value?.[chave]
  if (typeof fn !== 'function') return
  fechar()
  try {
    const resultado = fn()
    if (resultado && typeof resultado.then === 'function') {
      resultado.catch((error) => {
        console.error('Falha ao executar acao do pedido', error)
      })
    }
  } catch (error) {
    console.error('Falha ao executar acao do pedido', error)
  }
}
function fechar() {
  aberto.value = false
  acoes.value = { onImprimir: null, onEditar: null, onCancelar: null, onExcluir: null }
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

function formatCurrency(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatDateTime(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
defineExpose({ abrir, fechar })
</script>
<style scoped>
.dialog-card {
  width: 480px;
  max-width: 92vw;
  border-radius: 18px;
  padding: 22px 24px 24px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
  box-shadow: none;
}
.dialog-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.dialog-card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-text-strong);
}
.dialog-card__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--brand-text-muted);
}
.dialog-card__body {
  margin-top: 20px;
  max-height: 360px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dialog-card__empty {
  text-align: center;
  color: var(--brand-text-muted);
  padding: 48px 0;
}
.pedido-meta {
  background: var(--brand-surface-soft);
  border-radius: 16px;
  padding: 16px 18px;
  border: 1px solid var(--brand-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pedido-meta__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.pedido-meta__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pedido-meta__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--brand-text-muted);
  font-weight: 600;
}
.pedido-meta__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-strong);
}
.pedido-meta__obs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
}
.pedido-meta__obs-text {
  font-size: 14px;
  color: var(--brand-text-strong);
  line-height: 1.6;
  white-space: pre-wrap;
}
.pedido-itens {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pedido-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
}
.pedido-item__nome {
  font-weight: 600;
  color: var(--brand-text-strong);
}
.pedido-item__detalhe {
  font-size: 12px;
  color: var(--brand-text-muted);
  margin-top: 2px;
}
.pedido-item__total {
  font-weight: 700;
  color: var(--brand-text-strong);
}
.pedido-pagamentos {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pedido-pagamentos__title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--brand-text-muted);
}
.pedido-pagamento {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
}
.pedido-pagamento__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pedido-pagamento__linha {
  font-size: 12px;
  color: var(--brand-text-strong);
}
.pedido-pagamento__valor {
  font-weight: 700;
  color: var(--brand-text-strong);
}
.pedido-pagamento__tag {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #9a6b00;
}
.pedido-pagamento--estornado {
  opacity: 0.6;
  text-decoration: line-through;
}
.dialog-card__footer {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dialog-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.dialog-card__action-btn {
  font-weight: 600;
  border-radius: 12px;
}
.dialog-card__action-btn--danger {
  color: #b3261e;
}
.pedido-total {
  background: var(--brand-surface-soft);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  color: var(--brand-text-strong);
  border: 1px solid var(--brand-border);
}
.dialog-card__btn-salvar {
  align-self: flex-end;
  font-weight: 700;
  padding: 10px 22px;
  border-radius: 12px;
  background: var(--brand-primary);
  color: var(--brand-text-strong);
  box-shadow: none;
}
@media (max-width: 599px) {
  .dialog-card {
    width: 100%;
    padding: 20px 20px 24px;
  }
  .pedido-meta__grid {
    grid-template-columns: 1fr;
  }
  .dialog-card__btn-salvar {
    width: 100%;
    justify-content: center;
  }
}
</style>
