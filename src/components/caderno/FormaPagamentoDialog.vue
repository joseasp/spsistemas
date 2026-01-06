<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.md"
  >
    <q-card class="dialog-card dialog-card--forma">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Forma de pagamento</div>
          <div class="dialog-card__subtitle">Selecione como o pedido será registrado.</div>
        </div>
        <q-btn flat round dense icon="close" @click="fechar" />
      </div>

      <div class="dialog-card__body">
        <q-option-group
          v-model="local"
          :options="opts"
          type="radio"
          color="primary"
          class="dialog-card__options"
        />
      </div>

      <div class="dialog-card__actions">
        <q-btn flat class="dialog-card__btn-cancelar" label="Cancelar" @click="fechar" />
        <q-btn
          unelevated
          class="dialog-card__btn-salvar"
          color="primary"
          label="Salvar"
          :disable="!local"
          @click="salvar"
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
  formaAtual: String,
})
const emit = defineEmits(['update:modelValue', 'salvar'])

const local = ref(null)
const opts = [
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'Pix', value: 'PIX' },
  { label: 'Débito', value: 'DEBITO' },
  { label: 'Crédito', value: 'CREDITO' },
  { label: 'Outro', value: 'OUTRO' },
]

watch(
  () => props.modelValue,
  (v) => {
    if (v) local.value = props.formaAtual || null
  },
)

function fechar() {
  emit('update:modelValue', false)
}

function salvar() {
  emit('salvar', local.value || null)
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
}

.dialog-card__subtitle {
  color: #8a7c60;
  font-size: 13px;
  margin-top: 4px;
}

.dialog-card__body {
  margin-top: 20px;
}

.dialog-card__options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-card__options :deep(.q-radio) {
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(255, 202, 40, 0.3);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.dialog-card__options :deep(.q-radio__label) {
  font-weight: 600;
  color: #3f3224;
}

.dialog-card__options :deep(.q-radio__inner--truthy) {
  color: var(--brand-primary);
}

.dialog-card__options :deep(.q-radio:hover) {
  transform: translateY(-1px);
  box-shadow: inset 0 0 0 1px rgba(255, 202, 40, 0.55), 0 10px 22px rgba(191, 139, 0, 0.18);
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


