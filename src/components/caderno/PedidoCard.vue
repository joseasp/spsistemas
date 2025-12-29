<template>
  <q-card v-ripple :class="['pedido-card', statusClass]" @click="$emit('abrir')">
    <div class="status-strip" aria-hidden="true"></div>

    <q-card-section class="row items-center justify-between">
      <div class="col">
        <div class="row items-center justify-between">
          <div class="text-subtitle1 ellipsis">{{ titulo }}</div>
          <div class="price q-ml-md">R$ {{ (transacao.valor || transacao.valor_total || 0).toFixed(2) }}</div>
        </div>
        <div class="text-caption q-mt-xs ellipsis-2-lines">{{ resumo }}</div>
        <div v-if="transacao.nome_funcionario_empresa" class="pedido-card__func">
          Funcionário: {{ transacao.nome_funcionario_empresa }}
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-actions class="row items-center justify-between q-px-md q-pb-md q-pt-sm" @click.stop>
      <div class="row q-gutter-sm">
        <!-- preparo -->
        <q-chip
          :clickable="!isCancelada"
          :disable="isCancelada"
          :class="['status-chip', preparoChipClass]"
          :label="preparoChipLabel"
          @click="onTogglePronto"
        />

        <!-- pagamento -->
        <q-chip
          :clickable="!pagamentoChipDisabled"
          :disable="pagamentoChipDisabled"
          :class="['status-chip', pagamentoChipClass]"
          :label="pagamentoChipLabel"
          @click="onTogglePago"
        />

        <!-- forma (apenas quando pago) -->
        <q-btn
          v-if="transacao.status_pagamento === 'PAGO'"
          round
          dense
          outline
          icon="credit_card"
          @click="$emit('forma')"
        />
      </div>

    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  transacao: { type: Object, required: true },
  titulo: { type: String, required: true },
  resumo: { type: String, required: true },
})
const emit = defineEmits(['abrir', 'toggle-pronto', 'toggle-pago', 'forma'])

const isCancelada = computed(() => props.transacao.status_pagamento === 'CANCELADA')

const preparoChipLabel = computed(() => {
  if (isCancelada.value) return 'Cancelado'
  return props.transacao.pronto ? 'Pronto' : 'Pendente'
})

const preparoChipClass = computed(() => {
  if (isCancelada.value) return 'status-chip--cancelado'
  return props.transacao.pronto ? 'status-chip--pronto' : 'status-chip--pendente'
})

const pagamentoChipLabel = computed(() => {
  if (isCancelada.value) return 'Cancelado'
  if (props.transacao.status_pagamento !== 'PAGO') return 'Nao Pago'
  const map = {
    DINHEIRO: 'Dinheiro',
    PIX: 'Pix',
    DEBITO: 'Debito',
    CREDITO: 'Credito',
    OUTRO: 'Outro',
  }
  const forma = map[props.transacao.forma_pagamento] || null
  return forma ? 'Pago (' + forma + ')' : 'Pago'
})

const pagamentoChipClass = computed(() => {
  if (isCancelada.value) return 'status-chip--cancelado'
  return props.transacao.status_pagamento === 'PAGO'
    ? 'status-chip--pago'
    : 'status-chip--nao-pago'
})

const pagamentoChipDisabled = computed(
  () => isCancelada.value || !props.transacao.cliente_id,
)

function onTogglePronto() {
  if (isCancelada.value) return
  emit('toggle-pronto')
}

function onTogglePago() {
  if (pagamentoChipDisabled.value) return
  emit('toggle-pago')
}

const statusClass = computed(() => {
  if (isCancelada.value) return 'st-cancelado'
  return props.transacao.pronto ? 'st-pronto' : 'st-pendente'
})
</script>


<style scoped>
.pedido-card {
  --pedido-yellow: #ffd54f;
  --pedido-yellow-strong: #f4b336;
  --pedido-text-strong: #3b2f00;
  --pedido-text-muted: rgba(59, 47, 0, 0.6);
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(255, 213, 79, 0.22);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 16px 32px rgba(32, 25, 10, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  cursor: pointer;
}

.status-strip {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  border-radius: 18px 0 0 18px;
}

.st-pendente .status-strip {
  background: linear-gradient(180deg, var(--pedido-yellow), var(--pedido-yellow-strong));
}
.st-pronto .status-strip {
  background: linear-gradient(180deg, #4caf50, #2e7d32);
}
.st-cancelado .status-strip {
  background: linear-gradient(180deg, #b0bec5, #78909c);
}

.st-cancelado {
  filter: grayscale(0.3);
  opacity: 0.8;
}

.price {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--pedido-text-strong);
}

.pedido-card__func {
  font-size: 12px;
  color: var(--pedido-text-muted);
  margin-top: 4px;
}

.q-card__section {
  padding-bottom: 12px;
}

.q-separator {
  opacity: 0.5;
}

.q-card__actions {
  gap: 8px;
}

.q-chip.status-chip {
  border-radius: 14px;
  font-weight: 600;
  padding: 8px 12px;
}

.status-chip--pendente,
.status-chip--nao-pago {
  background: rgba(255, 213, 79, 0.22);
  color: var(--pedido-text-strong);
}

.status-chip--pronto,
.status-chip--pago {
  background: rgba(33, 186, 69, 0.2);
  color: #105a22;
}

.status-chip--cancelado {
  background: rgba(176, 190, 197, 0.28);
  color: #455a64;
}

.q-btn {
  color: var(--pedido-text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .pedido-card:not(.st-cancelado):hover {
    transform: translateY(-3px);
    box-shadow: 0 22px 40px rgba(32, 25, 10, 0.18);
  }
  .pedido-card:not(.st-cancelado):active {
    transform: translateY(-1px);
  }
}
</style>
