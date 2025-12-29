<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.md"
  >
    <q-card class="dialog-card dialog-card--caixa">
      <div class="dialog-card__header">
        <div>
          <div class="dialog-card__title">Fechar caixa</div>
          <div class="dialog-card__subtitle">Data: {{ dataLocal }}</div>
        </div>
        <q-btn flat round dense icon="close" @click="fechar" />
      </div>

      <div class="dialog-card__body">
        <div class="dialog-summary">
          <div class="dialog-summary__row">
            <span class="dialog-summary__label">Valor de abertura</span>
            <span class="dialog-summary__value">R$ {{ Number(abertura || 0).toFixed(2) }}</span>
          </div>
          <div class="dialog-summary__row">
            <span class="dialog-summary__label">Total esperado</span>
            <span class="dialog-summary__value">R$ {{ esperadoTotal.toFixed(2) }}</span>
          </div>
          <div class="dialog-summary__row">
            <span class="dialog-summary__label">Total contado</span>
            <span class="dialog-summary__value">R$ {{ contadoTotal.toFixed(2) }}</span>
          </div>
          <div
            class="dialog-summary__row dialog-summary__row--highlight"
            :class="
              difTotal === 0
                ? 'dialog-summary__row--zero'
                : difTotal > 0
                  ? 'dialog-summary__row--positivo'
                  : 'dialog-summary__row--negativo'
            "
          >
            <span class="dialog-summary__label">Diferença</span>
            <span class="dialog-summary__value">R$ {{ difTotal.toFixed(2) }}</span>
          </div>
        </div>

        <div v-if="pendencias?.length" class="dialog-alert">
          <div class="dialog-alert__title">Pagamentos sem forma registrada</div>
          <div class="dialog-alert__text">
            Existem pagamentos do período sem forma definida. Corrija antes de fechar o caixa.
          </div>
          <div class="dialog-alert__list">
            <div v-for="p in pendencias" :key="p.id" class="dialog-alert__item">
              Pagamento #{{ p.id }} — R$ {{ Number(p.valor || 0).toFixed(2) }}
            </div>
          </div>
        </div>

        <div class="dialog-table">
          <div class="dialog-table__title">Conferência por forma de pagamento</div>
          <q-markup-table flat bordered class="dialog-table__table">
            <thead>
              <tr>
                <th>Forma</th>
                <th class="text-right">Esperado</th>
                <th class="text-right">Contado</th>
                <th class="text-right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in formas" :key="f">
                <td>{{ nomeForma(f) }}</td>
                <td class="text-right">R$ {{ (esperado[f] || 0).toFixed(2) }}</td>
                <td class="text-right dialog-table__input-cell">
                  <q-input
                    v-model.number="contado[f]"
                    type="number"
                    min="0"
                    step="0.01"
                    dense
                    outlined
                    prefix="R$"
                    class="dialog-table__input"
                  />
                </td>
                <td class="text-right" :class="classeDiff(f)">
                  R$ {{ diff(f).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>
      </div>

      <div class="dialog-card__actions">
        <q-btn flat class="dialog-card__btn-cancelar" label="Cancelar" @click="fechar" />
        <q-btn
          unelevated
          class="dialog-card__btn-salvar"
          color="warning"
          label="Fechar caixa"
          :disable="!!pendencias?.length"
          @click="confirmar"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
const $q = useQuasar()

const props = defineProps({
  modelValue: Boolean,
  dataLocal: String,
  esperado: { type: Object, default: () => ({}) },
  pendencias: { type: Array, default: () => [] },
  abertura: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const formas = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTRO']
const contado = reactive({ DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0, OUTRO: 0 })

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      for (const f of formas) {
        contado[f] = Number(props.esperado?.[f] || 0)
      }
    }
  },
)

function diff(f) {
  return Number(((contado[f] || 0) - (props.esperado?.[f] || 0)).toFixed(2))
}

function classeDiff(f) {
  const valor = diff(f)
  if (valor === 0) return 'dialog-table__diff--zero'
  return valor > 0 ? 'dialog-table__diff--positivo' : 'dialog-table__diff--negativo'
}

function nomeForma(f) {
  return {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
    OUTRO: 'Outro',
  }[f]
}

const contadoTotal = computed(() => formas.reduce((s, f) => s + Number(contado[f] || 0), 0))
const esperadoTotal = computed(() =>
  Number((Number(props.abertura || 0) + formas.reduce((s, f) => s + Number(props.esperado?.[f] || 0), 0)).toFixed(2)),
)
const difTotal = computed(() => Number((contadoTotal.value - esperadoTotal.value).toFixed(2)))

function fechar() {
  emit('update:modelValue', false)
}

function confirmar() {
  emit('confirm', { contado_por_forma: { ...contado } })
  fechar()
}
</script>

<style scoped>
.dialog-card {
  width: 560px;
  max-width: 95vw;
  border-radius: 24px;
  padding: 24px 28px 28px;
  background: linear-gradient(180deg, #ffffff 0%, #fff7e6 100%);
  box-shadow: 0 24px 52px rgba(45, 35, 20, 0.2);
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
  text-transform: capitalize;
}

.dialog-card__subtitle {
  color: #8a7c60;
  font-size: 13px;
  margin-top: 4px;
}

.dialog-card__body {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 249, 235, 0.85);
  box-shadow: inset 0 0 0 1px rgba(255, 202, 40, 0.35);
}

.dialog-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #4f4231;
}

.dialog-summary__label {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.dialog-summary__value {
  font-weight: 700;
}

.dialog-summary__row--highlight {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 202, 40, 0.45);
}

.dialog-summary__row--zero .dialog-summary__value {
  color: #4f4231;
}

.dialog-summary__row--positivo .dialog-summary__value {
  color: #2e7d32;
}

.dialog-summary__row--negativo .dialog-summary__value {
  color: #c62828;
}

.dialog-alert {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 224, 178, 0.85);
  box-shadow: inset 0 0 0 1px rgba(255, 183, 77, 0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #6a3d00;
}

.dialog-alert__title {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 13px;
  letter-spacing: 0.08em;
}

.dialog-alert__text {
  font-size: 13px;
}

.dialog-alert__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.dialog-alert__item {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.dialog-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-table__title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(59, 55, 42, 0.6);
}

.dialog-table__table {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-table__table :deep(th) {
  background: rgba(255, 229, 167, 0.45);
  color: #4f3a11;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.06em;
}

.dialog-table__table :deep(td) {
  background: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  color: #43392a;
}

.dialog-table__input-cell {
  min-width: 180px;
}

.dialog-table__input :deep(.q-field__control) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.dialog-table__diff--zero {
  color: #4f4231;
}

.dialog-table__diff--positivo {
  color: #2e7d32;
}

.dialog-table__diff--negativo {
  color: #c62828;
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
  padding: 10px 20px;
  border-radius: 14px;
  background: linear-gradient(115deg, #ffca28, #ffb300);
  color: #3b2500;
}

@media (max-width: 799px) {
  .dialog-card {
    width: 100%;
    padding: 22px 22px 26px;
  }

  .dialog-table__input-cell {
    min-width: 150px;
  }
}
</style>
