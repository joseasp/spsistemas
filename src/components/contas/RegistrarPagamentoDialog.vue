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
          class="dialog-card__field"
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
          label="Observações (opcional)"
          class="dialog-card__field"
        />
      </div>

      <div class="dialog-card__actions">
        <q-btn flat class="dialog-card__btn-cancelar" label="Cancelar" @click="emitClose(false)" />
        <q-btn
          unelevated
          class="dialog-card__btn-salvar"
          color="warning"
          label="Registrar Pagamento"
          :disable="!valor || !forma"
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
const clienteNome = ref('')

const formaOptions = computed(() => props.formas.map((f) => ({ label: nomeForma(f), value: f })))

watch(
  () => props.modelValue,
  (abriu) => {
    if (abriu) {
      valor.value = null
      obs.value = ''
      forma.value = null
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

function nomeForma(formaAtual) {
  const mapa = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
    OUTRO: 'Outro',
  }
  return mapa[formaAtual] || formaAtual
}

function salvar() {
  emit('salvar', {
    valor: Number(valor.value || 0),
    forma: forma.value || null,
    obs: obs.value || null,
  })
  emitClose(false)
}
</script>

<style scoped>
.dialog-card {
  width: 460px;
  max-width: 90vw;
  border-radius: 24px;
  padding: 24px 28px;
  background: linear-gradient(180deg, #ffffff 0%, #fff7e6 100%);
  box-shadow: 0 24px 48px rgba(45, 35, 20, 0.18);
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
  color: #3a3425;
}

.dialog-card__subtitle {
  color: #8a7c60;
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
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
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
  border-radius: 14px;
  background: linear-gradient(115deg, #ffca28, #ffb300);
  color: #3b2500;
}
</style>


