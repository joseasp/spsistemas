<template>
  <q-dialog :model-value="modelValue" @update:model-value="emitClose" :maximized="$q.screen.lt.md">
    <q-card class="dialog-card dialog-card--registrar">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Registrar Pagamento</div>
          <div class="dialog-card__subtitle">Preencha os dados para registrar a entrada.</div>
        </div>
        <q-btn flat round dense icon="close" @click="emitClose(false)" />
      </div>

      <div class="dialog-card__body">
        <q-input
          v-if="cliente"
          v-model="clienteNome"
          label="Nome do cliente"
          readonly
          dense
          outlined
          class="dialog-card__field input-uppercase"
        />

        <q-input
          v-model.number="valor"
          type="number"
          min="0"
          step="0.01"
          dense
          outlined
          label="Valor do pagamento"
          class="dialog-card__field"
          prefix="R$"
        />

        <q-input
          v-model="dataPagamento"
          type="datetime-local"
          dense
          outlined
          label="Data/hora do pagamento"
          class="dialog-card__field"
        />

        <q-select
          v-model="forma"
          :options="formaOptions"
          dense
          outlined
          emit-value
          map-options
          label="Forma de pagamento"
          placeholder="Selecione"
          class="dialog-card__field dialog-card__field--select"
          popup-content-class="dialog-card__select-popup"
          clearable
        />

        <q-input
          v-model="obs"
          type="textarea"
          autogrow
          dense
          outlined
          label="Observa&ccedil;&otilde;es (opcional)"
          class="dialog-card__field input-uppercase"
        />
      </div>

      <div class="dialog-card__actions">
        <q-btn flat class="dialog-card__btn-cancelar" label="Cancelar" @click="emitClose(false)" />
        <q-btn
          unelevated
          class="dialog-card__btn-salvar"
          color="primary"
          label="Registrar Pagamento"
          :disable="!valor"
          @click="salvar"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  formas: { type: Array, default: () => [] },
  cliente: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'salvar'])

const valor = ref(null)
const forma = ref(null)
const obs = ref('')
const dataPagamento = ref('')
const clienteNome = ref('')

const formaOptions = computed(() => props.formas.map((f) => ({ label: nomeForma(f), value: f })))

watch(
  () => props.modelValue,
  (abriu) => {
    if (abriu) {
      valor.value = null
      obs.value = ''
      forma.value = null
      dataPagamento.value = formatLocalDateTime(new Date())
      clienteNome.value = props.cliente
    }
  },
)

watch(
  () => props.cliente,
  (novo) => {
    if (!props.modelValue) clienteNome.value = novo
  },
)

function emitClose(v) {
  emit('update:modelValue', v)
}
function formatLocalDateTime(date) {
  const offset = date.getTimezoneOffset() * 60000
  const local = new Date(date.getTime() - offset)
  return local.toISOString().slice(0, 16)
}

function toIsoFromLocal(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}


function nomeForma(formaAtual) {
  const mapa = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'D\u00e9bito',
    CREDITO: 'Cr\u00e9dito',
    OUTRO: 'Outro',
  }
  return mapa[formaAtual] || formaAtual
}

function salvar() {
  emit('salvar', {
    valor: Number(valor.value || 0),
    forma: forma.value || null,
    obs: obs.value || null,
    data_pagamento: toIsoFromLocal(dataPagamento.value),
  })
  emitClose(false)
}
</script>

<style scoped>
.dialog-card {
  width: 460px;
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
  color: var(--brand-text-muted);
  font-size: 13px;
  margin-top: 2px;
}

.dialog-card__body {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-card__field :deep(.q-field__control) {
  border-radius: 12px;
  background: var(--brand-surface);
  border: 1px solid var(--brand-border);
}

.dialog-card__field--select {
  max-width: 320px;
  width: 100%;
  align-self: center;
}

:deep(.dialog-card__select-popup) {
  max-width: 320px;
  width: auto;
}

.dialog-card__actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.dialog-card__btn-cancelar {
  color: #6d6d7a;
  font-weight: 600;
}

.dialog-card__btn-salvar {
  font-weight: 700;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--brand-primary);
  color: var(--brand-text-strong);
  box-shadow: none;
}
</style>


