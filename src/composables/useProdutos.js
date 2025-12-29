// src/composables/useProdutos.js
import { useMainStore } from 'src/stores/main-store'
import { storeToRefs } from 'pinia'

export function useProdutos() {
  const store = useMainStore()

  // storeToRefs garante que as propriedades (produtos, isLoading) mantenham a reatividade.
  const { produtos, isLoading, categoriasUnicas } = storeToRefs(store)

  // As funções não precisam de storeToRefs.
  const { adicionarNovoProduto, atualizarProduto, atualizarStatusProduto, removerProduto } = store

  // O ajudante apenas repassa o que o gerente oferece.
  return {
    produtos,
    isLoading,
    categoriasUnicas,
    adicionarNovoProduto,
    atualizarProduto,
    atualizarStatusProduto,
    removerProduto,
  }
}
