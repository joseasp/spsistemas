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
              <span class="pedido-meta__label">Funcionario</span>
              <span class="pedido-meta__value">{{ meta.funcionario }}</span>
            </div>
            <div v-if="statusFormatado" class="pedido-meta__item">
              <span class="pedido-meta__label">Status</span>
              <span class="pedido-meta__value">{{ statusFormatado }}</span>
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
            <span class="pedido-meta__label">Observacoes</span>
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
      </div>
      <div class="dialog-card__footer">
        <div v-if="temAcoes" class="dialog-card__actions">
          <q-btn
            v-if="acoesDisponiveis.imprimir"
            outline
            color="warning"
            class="dialog-card__action-btn"
            icon="print"
            label="Imprimir"
            v-close-popup
            @click="executarAcao('onImprimir')"
          />
          <q-btn
            v-if="acoesDisponiveis.editar"
            flat
            color="warning"
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
              Mantem o pedido no historico como cancelado.
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
              Apaga definitivamente do sistema. Acao irreversivel.
            </q-tooltip>
          </q-btn>
        </div>
        <div class="pedido-total">
          <span>Total do pedido</span>
          <span>{{ formatCurrency(total) }}</span>
        </div>
        <q-btn unelevated color="warning" class="dialog-card__btn-salvar" label="Fechar" @click="fechar" />
      </div>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, computed } from 'vue'
const aberto = ref(false)
const itens = ref([])
const meta = ref({
  cliente: '',
  funcionario: null,
  formaPagamento: null,
  status: '',
  data: null,
  observacao: null,
  total: null,
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
      info.observacao,
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
    PENDENTE: 'Nao paga',
    CANCELADA: 'Cancelada',
  }
  const status = meta.value.status
  return status ? mapa[status] || status : ''
})
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
  onImprimir = null,
  onEditar = null,
  onCancelar = null,
  onExcluir = null,
} = {}) {
  itens.value = Array.isArray(lista) ? lista : []
  meta.value = {
    cliente,
    funcionario,
    formaPagamento,
    status,
    data,
    observacao,
    total,
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
  --dialog-yellow: #ffd54f;
  --dialog-yellow-strong: #f4b336;
  --dialog-text-strong: #3b2f00;
  --dialog-text-muted: rgba(59, 47, 0, 0.62);
  width: 480px;
  max-width: 92vw;
  border-radius: 24px;
  padding: 24px 26px 28px;
  background: linear-gradient(180deg, #ffffff 0%, #fff9ec 100%);
  box-shadow: 0 24px 48px rgba(32, 25, 10, 0.16);
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
  color: var(--dialog-text-strong);
}
.dialog-card__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--dialog-text-muted);
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
  color: var(--dialog-text-muted);
  padding: 48px 0;
}
.pedido-meta {
  background: rgba(255, 245, 196, 0.72);
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: inset 0 0 0 1px rgba(255, 213, 79, 0.32);
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
  color: rgba(59, 47, 0, 0.55);
  font-weight: 600;
}
.pedido-meta__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--dialog-text-strong);
}
.pedido-meta__obs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: inset 0 0 0 1px rgba(255, 213, 79, 0.22);
}
.pedido-meta__obs-text {
  font-size: 14px;
  color: var(--dialog-text-strong);
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
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 0 0 1px rgba(255, 213, 79, 0.26);
}
.pedido-item__nome {
  font-weight: 600;
  color: var(--dialog-text-strong);
}
.pedido-item__detalhe {
  font-size: 12px;
  color: var(--dialog-text-muted);
  margin-top: 2px;
}
.pedido-item__total {
  font-weight: 700;
  color: var(--dialog-text-strong);
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
  background: rgba(255, 213, 79, 0.24);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  color: var(--dialog-text-strong);
}
.dialog-card__btn-salvar {
  align-self: flex-end;
  font-weight: 700;
  padding: 10px 22px;
  border-radius: 14px;
  background: linear-gradient(115deg, var(--dialog-yellow), var(--dialog-yellow-strong));
  color: var(--dialog-text-strong);
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
