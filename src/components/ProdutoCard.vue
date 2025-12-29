<!-- src/components/ProdutosCard.vue -->
<template>
  <q-item
    class="q-pa-md"
    :class="{ 'item-inativo': !produto.ativo }"
  >
    <!-- Seção 1: Nome do Produto (ocupa todo o espaço que precisar) -->
    <q-item-section>
      <q-item-label class="text-subtitle1">{{ produto.nome }}</q-item-label>
    </q-item-section>

    <!-- Seção 2: Lado Direito (Preço e Ações) -->
    <q-item-section side>
      <!-- Container principal que alinha tudo horizontalmente -->
      <div class="row items-center no-wrap">

        <!-- O Preço, com margem generosa à sua direita (q-mr-lg) -->
        <div class="text-h6 text-weight-medium text-grey-8 q-mr-lg" style="text-align: right;">
          {{ `R$ ${produto.preco.toFixed(2).replace('.', ',')}` }}
        </div>

        <!-- Container de largura fixa para as ações, evitando que o layout "pule" -->
        <div style="width: 140px;">
          <!-- Mostra o spinner se estiver carregando -->
          <div v-if="isLoading" class="row items-center justify-end">
            <q-spinner color="primary" size="2em" />
          </div>

          <!-- Mostra as ações se NÃO estiver carregando -->
          <div v-else class="row items-center justify-end no-wrap">
            <q-toggle
              :model-value="produto.ativo"
              @update:model-value="(novoStatus) => emit('toggle-status', { id: produto.id, status: novoStatus })"
              color="primary"
              keep-color
              class="q-mr-sm"
            />
            <q-btn dense round flat color="dark" icon="edit" @click="onEditClick" />
            <q-btn dense round flat color="negative" icon="delete" @click="onDeleteClick" class="q-ml-sm"/>
          </div>
        </div>
        
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup>
const emit = defineEmits(['edit', 'delete', 'toggle-status'])

const props = defineProps({
  produto: {
    type: Object,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

function onEditClick() {
  emit('edit', props.produto)
}

function onDeleteClick() {
  emit('delete', props.produto)
}
</script>
