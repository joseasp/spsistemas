<template>
  <q-dialog v-model="ativo" :maximized="$q.screen.lt.md">
    <q-card class="caixa-dialog">
      <q-card-section class="text-subtitle1">Fechar Caixa</q-card-section>

      <q-card-section class="q-gutter-md">
        <q-banner v-if="pendencias?.length" class="bg-orange-2 text-orange-10">
          Existem {{ pendencias.length }} pagamento(s) registrados sem forma. Corrija antes de fechar.
          <div v-for="item in pendencias" :key="item.id" class="fechar-caixa__alert-item">
            Pagamento #{{ item.id }} - R$ {{ Number(item.valor || 0).toFixed(2) }}
          </div>
        </q-banner>

        <q-banner v-if="vendasSemForma?.length" class="bg-red-2 text-red-9">
          Ha {{ vendasSemForma.length }} venda(s) pagas sem forma definida. Defina a forma de pagamento para prosseguir.
          <div v-for="venda in vendasSemForma" :key="venda.id" class="fechar-caixa__alert-item">
            Venda #{{ venda.id }} - R$ {{ Number(venda.valor || 0).toFixed(2) }}
          </div>
        </q-banner>

        <div class="fechar-caixa__resumo">
          <div class="fechar-caixa__linha">
            <span class="fechar-caixa__label">Abertura</span>
            <strong>R$ {{ valorAbertura.toFixed(2) }}</strong>
          </div>
          <div class="fechar-caixa__linha">
            <span class="fechar-caixa__label">Vendas em Dinheiro</span>
            <strong>R$ {{ totalDinheiro.toFixed(2) }}</strong>
          </div>
          <div class="fechar-caixa__linha fechar-caixa__linha--total">
            <span class="fechar-caixa__label">Valor esperado em caixa</span>
            <strong>R$ {{ valorEsperadoTotal.toFixed(2) }}</strong>
          </div>
        </div>

        <q-input
          v-model="responsavel"
          label="Responsavel pelo fechamento"
          :readonly="props.somenteVisual"
          :disable="props.somenteVisual"
          filled
          autofocus
        />

        <div class="row items-center q-py-xs">
          <div class="col fechar-caixa__label">Dinheiro<span class="fechar-caixa__esperado" v-if="Number(totalDinheiro)"> Esperado: R$ {{ totalDinheiro.toFixed(2) }}</span></div>
          <div class="col text-right">
            <q-input
              dense
              outlined
              v-model.number="contadoDinheiro"
              type="number"
              min="0"
              step="0.01"
              :readonly="props.somenteVisual"
              :disable="props.somenteVisual"
              style="max-width: 170px; margin-left: auto"
            />
          </div>
        </div>

        <q-input
          class="q-mt-sm"
          type="textarea"
          autogrow
          v-model="observacoes"
          label="Observacoes (opcional)"
          :readonly="props.somenteVisual"
          :disable="props.somenteVisual"
          filled
        />

        <div class="fechar-caixa__totais q-mt-md">
          <div class="fechar-caixa__linha">
            <span class="fechar-caixa__label">Total contado</span>
            <strong>R$ {{ totalContado.toFixed(2) }}</strong>
          </div>
          <div class="fechar-caixa__linha" :class="{ 'fechar-caixa__linha--alerta': diferencaTotal !== 0 }">
            <span class="fechar-caixa__label">Diferenca</span>
            <strong>R$ {{ diferencaTotal.toFixed(2) }}</strong>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn
          v-if="!props.somenteVisual"
          :disable="botaoDesabilitado"
          color="primary"
          label="Fechar"
          @click="confirmar"
        />
        <q-btn
          v-else
          color="primary"
          label="Reabrir"
          @click="confirmar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  esperado: { type: Object, default: () => ({}) },
  contadoInicial: { type: Object, default: () => ({ DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0, OUTRO: 0 }) },
  pendencias: { type: Array, default: () => [] },
  vendasSemForma: { type: Array, default: () => [] },
  valorAbertura: { type: Number, default: 0 },
  responsavelInicial: { type: String, default: '' },
  observacoesIniciais: { type: String, default: '' },
  carregando: { type: Boolean, default: false },
  somenteVisual: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirmar', 'reabrir'])

const ativo = ref(false)
const observacoes = ref('')
const DINHEIRO_CHAVE = 'DINHEIRO'
const contado = ref({ [DINHEIRO_CHAVE]: 0 })
const responsavel = ref('')

watch(
  () => props.modelValue,
  (v) => {
    ativo.value = v
    const inicial = Number(props.contadoInicial?.[DINHEIRO_CHAVE] || 0)
    contado.value = { [DINHEIRO_CHAVE]: inicial }
    responsavel.value = props.somenteVisual ? props.responsavelInicial || '' : ''
    observacoes.value = props.somenteVisual ? props.observacoesIniciais || '' : ''
  },
)
watch(ativo, (v) => emit('update:modelValue', v))

const totalDinheiro = computed(() => Number(props.esperado?.DINHEIRO || 0))
const contadoDinheiro = computed({
  get: () => Number(contado.value?.[DINHEIRO_CHAVE] || 0),
  set: (valor) => {
    const normalizado = Number(valor || 0)
    contado.value = { ...contado.value, [DINHEIRO_CHAVE]: normalizado }
  },
})
const valorEsperadoTotal = computed(() => Number(props.valorAbertura || 0) + totalDinheiro.value)

const totalContado = computed(() => contadoDinheiro.value)
const diferencaTotal = computed(() => Number((totalContado.value - valorEsperadoTotal.value).toFixed(2)))

const botaoDesabilitado = computed(
  () => !props.somenteVisual && (props.pendencias?.length > 0 || props.vendasSemForma?.length > 0 || !responsavel.value || props.carregando),
)

function confirmar() {
  if (props.somenteVisual) {
    emit('reabrir')
    ativo.value = false
    return
  }
  if (botaoDesabilitado.value) return
  emit('confirmar', {
    responsavel: responsavel.value,
    contadoPorForma: contado.value,
    observacoes: observacoes.value,
  })
  ativo.value = false
}
</script>

<style scoped>
.caixa-dialog {
  width: 640px;
  max-width: 96vw;
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 32px 60px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

@media (max-width: 600px) {
  .caixa-dialog {
    width: 100%;
    border-radius: 18px;
  }
}

.caixa-dialog :deep(.q-card__section:first-of-type) {
  padding: 24px 28px 12px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.caixa-dialog :deep(.q-card__section:nth-of-type(2)) {
  padding: 6px 28px 26px;
}

.caixa-dialog :deep(.q-card__actions) {
  padding: 18px 28px 22px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  gap: 12px;
}

.caixa-dialog :deep(.q-card__actions .q-btn.q-btn--flat) {
  color: #64748b;
  font-weight: 600;
}

.caixa-dialog :deep(.q-card__actions .q-btn.bg-primary) {
  border-radius: 12px;
  font-weight: 700;
  padding: 10px 26px;
  background: linear-gradient(130deg, #fde047, #f59e0b);
  color: #3b2f00;
  box-shadow: 0 14px 28px rgba(245, 158, 11, 0.28);
}

.caixa-dialog :deep(.q-card__actions .q-btn.bg-primary:hover) {
  box-shadow: 0 18px 34px rgba(245, 158, 11, 0.35);
}

.caixa-dialog :deep(.q-field--filled .q-field__control) {
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: none;
}

.caixa-dialog :deep(.q-field--filled .q-field__control:before),
.caixa-dialog :deep(.q-field--filled .q-field__control:after) {
  display: none;
}

.caixa-dialog :deep(.q-field__label) {
  color: rgba(100, 116, 139, 0.95);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.caixa-dialog :deep(.q-banner) {
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
}

.fechar-caixa__resumo {
  border: 1px solid rgba(250, 204, 21, 0.35);
  border-radius: 14px;
  padding: 16px 20px;
  background: linear-gradient(180deg, rgba(254, 243, 199, 0.65), rgba(255, 251, 235, 0.92));
  margin-bottom: 20px;
}
.fechar-caixa__label {
  user-select: none;
}

.fechar-caixa__label {
  user-select: none;
}

.fechar-caixa__linha {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 8px;
}
.fechar-caixa__linha--total {
  font-weight: 700;
  color: #1f2937;
}
.fechar-caixa__linha--alerta {
  color: #dc2626;
  font-weight: 700;
}
.fechar-caixa__esperado {
  font-size: 12px;
  color: #64748b;
  margin-left: 6px;
}
.fechar-caixa__alert-item {
  font-size: 13px;
  margin-top: 6px;
}
.fechar-caixa__totais {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  padding-top: 10px;
  margin-top: 18px;
}
</style>
