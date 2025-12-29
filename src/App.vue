<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useMainStore } from 'src/stores/main-store'

const mainStore = useMainStore()

onMounted(() => {
  mainStore.buscarProdutosIniciais()
})
</script>
