<template>
  <q-card
    class="cliente-card"
    :class="{
      'cliente-card--inativo': !cliente.ativo,
      'cliente-card--loading': isLoading
    }"
    flat
    bordered
    @click="emit('view', cliente)"
  >
    <q-card-section class="cliente-card__top">
      <q-icon :name="typeIcon" class="cliente-card__type-icon" size="20px" />
      <div class="cliente-card__nome" :title="cliente.nome">{{ cliente.nome }}</div>
    </q-card-section>

    <q-space />

    <q-card-section class="cliente-card__bottom">
      <div class="cliente-card__status" :class="statusClass">
        <q-icon :name="statusIcon" size="16px" />
        <span>{{ statusLabel }}</span>
      </div>
      <q-icon name="chevron_right" size="18px" class="cliente-card__arrow" />
    </q-card-section>

    <div v-if="isLoading" class="cliente-card__overlay">
      <q-spinner color="primary" size="36px" />
    </div>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['view'])

const props = defineProps({
  cliente: {
    type: Object,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const typeIcon = computed(() => (normalizarTipo(props.cliente.tipo) === 'EMPRESA' ? 'business' : 'person'))

const statusIcon = computed(() => (props.cliente.ativo ? 'check_circle' : 'highlight_off'))
const statusLabel = computed(() => (props.cliente.ativo ? 'Ativo' : 'Inativo'))
const statusClass = computed(() => (props.cliente.ativo ? 'cliente-card__status--ativo' : 'cliente-card__status--inativo'))

function normalizarTipo(tipo) {
  const upper = (tipo || '').toUpperCase()
  const sanitized = upper.replace('\u00C9', 'E')
  if (sanitized.includes('EMPRESA')) {
    return 'EMPRESA'
  }
  if (sanitized.includes('CREDITO')) {
    return 'CREDITO'
  }
  return 'CREDITO'
}
</script>

<style scoped>
.cliente-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 130px;
  padding: 12px 16px;
  border-radius: 16px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
  background: #ffffff;
}

.cliente-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}

.cliente-card--inativo {
  opacity: 0.82;
}

.cliente-card--loading {
  pointer-events: none;
}

.cliente-card__top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
}

.cliente-card__type-icon {
  color: #d6a62a;
}

.cliente-card__nome {
  flex: 1;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #3b372a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cliente-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  margin-top: 12px;
}

.cliente-card__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

.cliente-card__status--ativo {
  color: #2e7d32;
}

.cliente-card__status--inativo {
  color: #b71c1c;
}

.cliente-card__arrow {
  color: rgba(59, 55, 42, 0.45);
}

.cliente-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: inherit;
}
</style>
