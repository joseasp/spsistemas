<template>
  <div class="sticky-footer q-pa-md row items-center totais-bar">
    <!-- Esquerda: Total de Pedidos -->
    <div class="row items-center no-wrap q-gutter-sm">
      <q-icon :name="visivel ? 'visibility' : 'visibility_off'" />
      <span class="label">Total de Pedidos:</span>

      <!-- mostra valor quando visível; fica em branco quando oculto -->
      <span class="value pedidos" :class="{ hiddenValue: !visivel }">
        {{ totalPedidos }}
      </span>
    </div>

    <q-space />

    <!-- Direita: Valor Total -->
    <div class="row items-center no-wrap q-gutter-sm">
      <span class="label">Valor Total:</span>
      <span class="value valor" :class="{ hiddenValue: !visivel }">
        R$ {{ valorTotal.toFixed(2) }}
      </span>

      <q-btn flat :label="visivel ? 'OCULTAR' : 'REVELAR'" @click="$emit('toggle')" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalPedidos: { type: Number, default: 0 },
  valorTotal: { type: Number, default: 0 },
  visivel: { type: Boolean, default: false },
})
defineEmits(['toggle'])
</script>

<style scoped>
.totais-bar {
  border-top: 1px solid color-mix(in srgb, var(--brand-primary) 28%, transparent);
  background: rgba(255, 255, 255, 0.95);
  z-index: 2;
  box-shadow: 0 -8px 18px rgba(32, 25, 10, 0.08);
}

.label {
  font-size: 12px;
  color: #6d5a1a;
}
.value {
  font-weight: 700;
  color: var(--brand-text-strong);
}
.value.pedidos {
  font-size: 18px;
  min-width: 3ch;
} /* evita “pulo” ao esconder */
.value.valor {
  font-size: 16px;
  min-width: 12ch;
} /* largura de “R$ 00000,00” aprox. */

/* fica “em branco” sem ocupar menos espaço */
.hiddenValue {
  visibility: hidden;
}

@media (max-width: 768px) {
  .totais-bar {
    flex-wrap: wrap;
  }
  .totais-bar > .row:last-child {
    width: 100%;
    justify-content: flex-end;
    margin-top: 6px;
  }
}
</style>
