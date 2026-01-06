<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.md"
  >
    <q-card class="dialog-card dialog-card--caixa">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Abrir caixa</div>
          <div class="dialog-card__subtitle">Data: {{ dataLocal }}</div>
        </div>
        <q-btn flat round dense icon="close" @click="fechar" />
      </div>

      <div class="dialog-card__body">
        <q-input
          v-model="responsavel"
          label="Responsável"
          dense
          outlined
          autofocus
          class="dialog-card__field"
        />
        <q-input
          v-model.number="valor_abertura"
          type="number"
          min="0"
          step="0.01"
          label="Valor de abertura"
          dense
          outlined
          prefix="R$"
          class="dialog-card__field"
        />
      </div>

      <div class="dialog-card__actions">
        <q-btn flat class="dialog-card__btn-cancelar" label="Cancelar" @click="fechar" />
        <q-btn
          unelevated
          class="dialog-card__btn-salvar"
          color="primary"
          label="Abrir caixa"
          :disable="!responsavel"
          @click="confirmar"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
const $q = useQuasar()

const props = defineProps({
  modelValue: Boolean,
  dataLocal: String,
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const responsavel = ref('')
const valor_abertura = ref(null)

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      responsavel.value = ''
      valor_abertura.value = null
    }
  },
)

function fechar() {
  emit('update:modelValue', false)
}

function confirmar() {
  const valor = typeof valor_abertura.value === 'string'
    ? valor_abertura.value.replace(',', '.')
    : valor_abertura.value
  emit('confirm', { responsavel: responsavel.value, valor_abertura: valor })
  fechar()
}
</script>

<style scoped>
.dialog-card {
  width: 420px;
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
  color: var(--brand-text-strong);
  text-transform: capitalize;
}

.dialog-card__subtitle {
  color: #8a7c60;
  font-size: 13px;
  margin-top: 4px;
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
  background: linear-gradient(115deg, var(--brand-primary), var(--brand-primary));
  color: #3b2500;
}

@media (max-width: 599px) {
  .dialog-card {
    width: 100%;
    padding: 22px 22px 24px;
  }
}
</style>
