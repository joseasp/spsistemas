<template>
  <q-dialog v-model="aberto" :maximized="$q.screen.lt.md">
    <q-card class="dialog-card dialog-card--detalhe">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Detalhes do Pagamento</div>
          <div class="dialog-card__subtitle">Informações registradas para este pagamento.</div>
        </div>
        <q-btn flat round dense icon="close" v-close-popup />
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
          <span class="detalhe-item__label">Método</span>
          <span class="detalhe-item__value">{{ nomeForma(linha?.forma_pagamento) || '-' }}</span>
        </div>
        <div class="detalhe-item" v-if="linha?.observacao">
          <span class="detalhe-item__label">Observações</span>
          <span class="detalhe-item__value detalhe-item__value--wrap">{{ linha.observacao }}</span>
        </div>
        <div class="detalhe-item" v-if="linha?.observacao_estorno">
          <span class="detalhe-item__label">Motivo do estorno</span>
          <span class="detalhe-item__value detalhe-item__value--wrap">{{ linha.observacao_estorno }}</span>
        </div>
      </div>

      <div class="dialog-card__actions">
        <q-btn unelevated color="warning" class="dialog-card__btn-salvar" label="Fechar" v-close-popup />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'

const aberto = ref(false)
const linha = ref(null)

function abrir(item) {
  linha.value = item
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

function nomeForma(f) {
  const m = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
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
  border-radius: 24px;
  padding: 24px 26px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f0ff 100%);
  box-shadow: 0 24px 48px rgba(40, 37, 60, 0.18);
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
  color: #332f52;
}

.dialog-card__subtitle {
  font-size: 13px;
  color: #7d78a4;
  margin-top: 4px;
}

.dialog-card__body {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dialog-card__banner {
  background: rgba(255, 235, 59, 0.2);
  color: #8d6e63;
  border: 1px dashed rgba(255, 152, 0, 0.4);
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
  color: #8d88ac;
  font-weight: 600;
}

.detalhe-item__value {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #2f2b4b;
}

.detalhe-item__value--wrap {
  white-space: pre-wrap;
}

.dialog-card__actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.dialog-card__btn-salvar {
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 14px;
  background: linear-gradient(115deg, #ffca28, #ffb300);
  color: #3b2500;
}
</style>
