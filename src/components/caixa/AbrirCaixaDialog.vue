<template>
  <q-dialog v-model="ativo" :maximized="$q.screen.lt.md">
    <q-card class="caixa-dialog caixa-dialog--compact">
      <q-card-section class="text-subtitle1">Abrir Caixa</q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input v-model="responsavel" label="Responsavel" filled autofocus />
        <q-input
          v-model.number="valorAbertura"
          type="number"
          min="0"
          step="0.01"
          label="Valor de abertura"
          filled
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn color="primary" label="Abrir" @click="confirmar" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'confirmar'])

const ativo = ref(false)
const responsavel = ref('')
const valorAbertura = ref(0)

watch(
  () => props.modelValue,
  (v) => {
    ativo.value = v
    if (v) {
      responsavel.value = ''
      valorAbertura.value = 0
    }
  },
)
watch(ativo, (v) => emit('update:modelValue', v))

function confirmar() {
  emit('confirmar', { responsavel: responsavel.value, valorAbertura: valorAbertura.value })
  ativo.value = false
}
</script>


<style scoped>
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
