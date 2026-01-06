<template>
  <q-dialog v-model="aberto" :maximized="$q.screen.lt.md">
    <q-card class="dialog-card dialog-card--detalhe">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Detalhes do Pagamento</div>
          <div class="dialog-card__subtitle">Informa&ccedil;&otilde;es registradas para este pagamento.</div>
        </div>
        <q-btn flat round dense icon="close" @click="fechar" />
      </div>

      <div class="dialog-card__body">
        <q-banner v-if="linha?.estornado" dense class="dialog-card__banner" rounded>
          <q-icon name="report" size="20px" class="q-mr-sm" />
          Pagamento estornado em {{ formatDateTime(linha?.data_estorno) }}
        </q-banner>

        <div class="detalhe-item">
          <span class="detalhe-item__label">Valor</span>
          <span class="detalhe-item__value">{{ formatCurrency(linha?.valor) }}</span>
        </div>
        <div class="detalhe-item">
          <span class="detalhe-item__label">Data</span>
          <span class="detalhe-item__value">{{ formatDateTime(linha?.data) }}</span>
        </div>
        <div class="detalhe-item">
          <span class="detalhe-item__label">M&eacute;todo</span>
          <span class="detalhe-item__value">{{ nomeForma(linha?.forma_pagamento) || '-' }}</span>
        </div>
        <div class="detalhe-item" v-if="linha?.observacao">
          <span class="detalhe-item__label">Observa&ccedil;&otilde;es</span>
          <span class="detalhe-item__value detalhe-item__value--wrap">{{ linha.observacao }}</span>
        </div>
        <div class="detalhe-item" v-if="linha?.observacao_estorno">
          <span class="detalhe-item__label">Motivo do estorno</span>
          <span class="detalhe-item__value detalhe-item__value--wrap">{{ linha.observacao_estorno }}</span>
        </div>
      <div class="detalhe-vendas">
        <div class="detalhe-vendas__title">Vendas aplicadas</div>
        <div v-if="!suportaAlocacoes" class="detalhe-vendas__empty">Aloca&ccedil;&otilde;es indispon&iacute;veis.</div>
        <div v-else-if="!vendasExibicao.length" class="detalhe-vendas__empty">Nenhuma venda vinculada.</div>
        <div v-else class="detalhe-vendas__lista">
          <div v-for="venda in vendasExibicao" :key="venda.id" class="detalhe-venda">
            <div class="detalhe-venda__info">
              <div class="detalhe-venda__linha">{{ formatDateTime(venda.data_transacao || venda.created_at) }}</div>
              <div class="detalhe-venda__linha">{{ statusVenda(venda.status_pagamento) }}</div>
            </div>
            <div class="detalhe-venda__valor">{{ formatCurrency(venda.valor_aplicado || venda.valor) }}</div>
          </div>
        </div>
      </div>
      </div>

      <div class="dialog-card__actions">
  <q-btn
    v-if="podeExcluir"
    flat
    color="negative"
    class="dialog-card__btn-excluir"
    icon="delete_forever"
    label="Excluir definitivo"
    @click="executarExcluir"
  />
  <q-btn unelevated color="primary" class="dialog-card__btn-salvar" label="Fechar" @click="fechar" />
</div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const aberto = ref(false)
const linha = ref(null)
const vendas = ref([])
const suportaAlocacoes = ref(true)
const onExcluir = ref(null)

const vendasExibicao = computed(() => (Array.isArray(vendas.value) ? vendas.value : []))
const podeExcluir = computed(() => Boolean(linha.value?.estornado) && typeof onExcluir.value === 'function')

function fechar() {
  aberto.value = false
  onExcluir.value = null
}

function abrir(item, { vendas: listaVendas = [], suportaAlocacoes: suporta = true, onExcluir: excluir = null } = {}) {
  linha.value = item
  vendas.value = Array.isArray(listaVendas) ? listaVendas : []
  suportaAlocacoes.value = suporta !== false
  onExcluir.value = typeof excluir === 'function' ? excluir : null
  aberto.value = true
}

function formatCurrency(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusVenda(status) {
  const mapa = {
    PAGO: 'Quitada',
    PARCIAL: 'Parcial',
    NAO_INFORMADO: 'N\u00e3o informado',
    PENDENTE: 'N\u00e3o paga',
    CANCELADA: 'Cancelada',
  }
  return mapa[status] || status || '-'
}

function executarExcluir() {
  if (typeof onExcluir.value !== 'function') return
  fechar()
  try {
    const resultado = onExcluir.value()
    if (resultado && typeof resultado.then === 'function') {
      resultado.catch((error) => {
        console.error('Falha ao excluir pagamento', error)
      })
    }
  } catch (error) {
    console.error('Falha ao excluir pagamento', error)
  }
}

function nomeForma(f) {
  const m = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'D\u00e9bito',
    CREDITO: 'Cr\u00e9dito',
    OUTRO: 'Outro',
  }
  return m[f] || null
}

defineExpose({ abrir })
</script>

<style scoped>
.dialog-card {
  width: 420px;
  max-width: 90vw;
  border-radius: 18px;
  padding: 22px 24px;
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
  font-size: 13px;
  color: var(--brand-text-muted);
  margin-top: 4px;
}

.dialog-card__body {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dialog-card__banner {
  background: #fff3e0;
  color: #6d4c41;
  border: 1px solid #ffe0b2;
  align-items: center;
}

.detalhe-item {
  display: flex;
  flex-direction: column;
}

.detalhe-item__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  color: var(--brand-text-muted);
  font-weight: 600;
}

.detalhe-item__value {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text-strong);
}

.detalhe-item__value--wrap {
  white-space: pre-wrap;
}
.detalhe-vendas {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detalhe-vendas__title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--brand-text-muted);
  font-weight: 600;
}
.detalhe-vendas__empty {
  font-size: 13px;
  color: var(--brand-text-muted);
}
.detalhe-vendas__lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detalhe-venda {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
  box-shadow: none;
}
.detalhe-venda__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detalhe-venda__linha {
  font-size: 12px;
  color: var(--brand-text-strong);
}
.detalhe-venda__valor {
  font-weight: 700;
  color: var(--brand-text-strong);
}

.dialog-card__actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-card__btn-excluir {
  font-weight: 600;
}

.dialog-card__btn-salvar {
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 12px;
  background: var(--brand-primary);
  color: var(--brand-text-strong);
  box-shadow: none;
}
</style>
