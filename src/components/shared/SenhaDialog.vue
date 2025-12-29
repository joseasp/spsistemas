<template>
  <q-dialog v-model="internalModel" :maximized="$q.screen.lt.md">
    <q-card class="senha-dialog-card">
      <div class="senha-dialog-card__header">
        <div class="senha-dialog-card__title">{{ title }}</div>
        <div v-if="message" class="senha-dialog-card__subtitle">{{ message }}</div>
      </div>

      <div class="senha-dialog-card__body">
        <q-input
          v-model="senha"
          type="password"
          :label="inputLabel"
          dense
          outlined
          autofocus
          autocomplete="off"
          :disable="loading"
          :error="Boolean(error)"
          :error-message="error || ''"
          @keyup.enter="confirmar"
        />
      </div>

      <div class="senha-dialog-card__actions">
        <q-btn
          flat
          class="senha-dialog-card__btn-cancelar"
          :label="cancelLabel"
          :disable="loading"
          @click="cancelar"
        />
        <q-btn
          unelevated
          class="senha-dialog-card__btn-confirmar"
          :color="confirmColor"
          :label="confirmLabel"
          :loading="loading"
          :disable="loading"
          @click="confirmar"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Senha requerida' },
  message: { type: String, default: '' },
  inputLabel: { type: String, default: 'Senha' },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  confirmColor: { type: String, default: 'warning' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const senha = ref('')

const internalModel = computed({
  get: () => props.modelValue,
  set: (valor) => emit('update:modelValue', valor),
})

watch(
  () => props.modelValue,
  (aberto) => {
    if (aberto) {
      senha.value = ''
    }
  },
)

function confirmar() {
  if (props.loading) return
  emit('confirm', senha.value)
  senha.value = ''
}



function cancelar() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.senha-dialog-card {
  width: 420px;
  max-width: 90vw;
  border-radius: 24px;
  padding: 24px 28px;
  background: linear-gradient(180deg, #ffffff 0%, #fff8d6 100%);
  box-shadow: 0 24px 48px rgba(32, 25, 10, 0.16);
}

.senha-dialog-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.senha-dialog-card__title {
  font-size: 20px;
  font-weight: 700;
  color: #3b2f00;
}

.senha-dialog-card__subtitle {
  color: rgba(59, 47, 0, 0.58);
  font-size: 13px;
}

.senha-dialog-card__body {
  margin-top: 20px;
}

.senha-dialog-card__actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.senha-dialog-card__btn-cancelar {
  color: rgba(59, 47, 0, 0.58);
  font-weight: 600;
}

.senha-dialog-card__btn-confirmar {
  font-weight: 700;
  padding: 10px 18px;
  border-radius: 14px;
  background: linear-gradient(115deg, var(--caderno-yellow), var(--caderno-yellow-strong));
  color: #3b2f00;
}
</style>
