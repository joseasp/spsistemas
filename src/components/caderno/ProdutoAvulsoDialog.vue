<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.md"
    @show="onShow"
  >
    <q-card class="dialog-card dialog-card--produto-avulso">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Produto avulso</div>
          <div class="dialog-card__subtitle">Adicione um item não cadastrado.</div>
        </div>
        <q-btn flat round dense icon="close" @click="fechar" />
      </div>

      <div class="dialog-card__body">
        <q-input
          ref="nomeInput"
          filled
          v-model="form.nome"
          label="Nome do produto"
          class="dialog-card__input"
          @keyup.enter="precoInput.focus()"
        />
        <q-input
          ref="precoInput"
          filled
          v-model.number="form.preco"
          type="number"
          min="0"
          step="0.01"
          label="Preço (R$)"
          class="dialog-card__input"
          @keyup.enter="salvar"
        />
      </div>

      <div class="dialog-card__actions">
        <q-btn flat class="dialog-card__btn-cancelar" label="Cancelar" @click="fechar" />
        <q-btn
          unelevated
          class="dialog-card__btn-salvar"
          color="warning"
          label="Adicionar"
          :disable="!form.nome || !form.preco"
          @click="salvar"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'salvar'])

const $q = useQuasar()
const nomeInput = ref(null)
const precoInput = ref(null)

const form = ref({
  nome: '',
  preco: null,
})

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      form.value = { nome: '', preco: null }
    }
  },
)

function onShow() {
  nomeInput.value?.focus()
}

function fechar() {
  emit('update:modelValue', false)
}

function salvar() {
  if (!form.value.nome || !form.value.preco) return
  emit('salvar', { ...form.value })
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
  color: #3a3425;
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
  gap: 16px;
}

.dialog-card__input :deep(.q-field__control) {
  border-radius: 16px;
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
}

@media (max-width: 599px) {
  .dialog-card {
    width: 100%;
    padding: 22px 22px 24px;
  }
}
</style>
