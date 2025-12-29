import { useMainStore } from 'src/stores/main-store'
import { storeToRefs } from 'pinia'

export function useClientes() {
  const store = useMainStore()

  const { clientes, isLoading, funcionariosPorCliente } = storeToRefs(store)

  const {
    adicionarNovoCliente,
    atualizarCliente,
    deletarCliente,
    atualizarStatusCliente,
    buscarFuncionariosPorCliente,
    adicionarFuncionarioParaCliente,
    removerFuncionarioDeCliente
  } = store

  return {
    clientes,
    isLoading,
    funcionariosPorCliente,
    adicionarNovoCliente,
    atualizarCliente,
    deletarCliente,
    atualizarStatusCliente,
    buscarFuncionariosPorCliente,
    adicionarFuncionarioParaCliente,
    removerFuncionarioDeCliente
  }
}
