import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { supabase } from 'src/supabaseClient'
import { produtosService, clientesService } from 'src/services'

const FUNCIONARIOS_TABLE = 'funcionarios_empresa'
const FUNCIONARIO_CLIENTE_COL = 'cliente_id'

function upsertById(list, rows, sortBy = 'nome') {
  const arr = Array.isArray(rows) ? rows : [rows]
  const map = new Map(list.map((item) => [item.id, item]))
  for (const entry of arr) {
    if (entry?.id == null) continue
    map.set(entry.id, entry)
  }
  const out = Array.from(map.values())
  if (!sortBy) {
    return out
  }
  return out.sort((a, b) => (a?.[sortBy] || '').localeCompare(b?.[sortBy] || ''))
}

export const useMainStore = defineStore('main', () => {
  const produtos = ref([])
  const clientes = ref([])
  // cache de funcionarios por cliente { [cliente_id]: [{ id, nome }] }
  const funcionariosPorCliente = ref({})
  const carregouClientes = ref(false)
  const carregouProdutos = ref(false)
  const loadingClientes = ref(false)
  const loadingProdutos = ref(false)

  const pendingRequests = ref(0)
  const isLoading = computed(() => pendingRequests.value > 0)

  let produtoSubscription = null
  let clienteSubscription = null
  let funcionarioSubscription = null

  function startLoading() {
    pendingRequests.value += 1
  }

  function stopLoading() {
    if (pendingRequests.value > 0) {
      pendingRequests.value -= 1
    }
  }

  function handleStoreError(contextMessage, error, { notify = true, rethrow = false } = {}) {
    console.error(contextMessage, error)
    if (notify) {
      const message = error?.message || 'Ocorreu um erro inesperado.'
      try {
        Notify.create({ type: 'negative', message })
      } catch (notifyError) {
        console.error('Falha ao exibir notificacao:', notifyError)
      }
    }
    if (rethrow) {
      throw error
    }
  }

  function sortByNome(array) {
    return [...array].sort((a, b) => a.nome.localeCompare(b.nome))
  }

  function setFuncionarios(clienteId, lista) {
    funcionariosPorCliente.value = {
      ...funcionariosPorCliente.value,
      [clienteId]: sortByNome(lista)
    }
  }

  async function buscarProdutosIniciais(force = false) {
    if (carregouProdutos.value && !force) return produtos.value

    loadingProdutos.value = true
    startLoading()
    try {
      const data = await produtosService.fetchAll()
      produtos.value = data ?? []
      carregouProdutos.value = true
      ouvirMudancasDeProdutos()
      return produtos.value
    } catch (error) {
      carregouProdutos.value = false
      handleStoreError('Erro ao buscar produtos iniciais:', error)
    } finally {
      loadingProdutos.value = false
      stopLoading()
    }
  }

  function ouvirMudancasDeProdutos() {
    if (produtoSubscription) return
    produtoSubscription = supabase
      .channel('produtos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos' },
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old) {
            produtos.value = produtos.value.filter((p) => p.id !== payload.old.id)
            return
          }
          if (payload.new) {
            produtos.value = upsertById(produtos.value, payload.new, 'nome')
          }
        }
      )
      .subscribe()
  }

  async function buscarClientes(force = false) {
    if (carregouClientes.value && !force) return clientes.value

    loadingClientes.value = true
    startLoading()
    try {
      const data = await clientesService.fetchClientes()
      clientes.value = data ?? []
      carregouClientes.value = true
      ouvirMudancasDeClientes()
      return clientes.value
    } catch (error) {
      carregouClientes.value = false
      handleStoreError('Falha ao buscar clientes:', error)
    } finally {
      loadingClientes.value = false
      stopLoading()
    }
  }

  function ouvirMudancasDeClientes() {
    if (clienteSubscription) return
    clienteSubscription = supabase
      .channel('clientes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old) {
            clientes.value = clientes.value.filter((c) => c.id !== payload.old.id)
            const clienteId = payload.old.id
            const funcionariosCache = { ...funcionariosPorCliente.value }
            if (funcionariosCache[clienteId]) {
              delete funcionariosCache[clienteId]
              funcionariosPorCliente.value = funcionariosCache
            }
            return
          }
          if (payload.new) {
            onRealtimeCliente(payload.new)
          }
        }
      )
      .subscribe()
  }
  function onRealtimeCliente(newRow) {
    clientes.value = upsertById(clientes.value, newRow, 'nome')
  }

  function ouvirMudancasDeFuncionarios() {
    if (funcionarioSubscription) return
    funcionarioSubscription = supabase
      .channel('funcionarios-empresa-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: FUNCIONARIOS_TABLE },
        (payload) => {
          const clienteId = payload.new?.[FUNCIONARIO_CLIENTE_COL] ?? payload.old?.[FUNCIONARIO_CLIENTE_COL]
          if (!clienteId) return
          const atuais = funcionariosPorCliente.value[clienteId] ?? []

          if (payload.eventType === 'INSERT' && payload.new) {
            setFuncionarios(clienteId, [...atuais.filter((f) => f.id !== payload.new.id), payload.new])
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            setFuncionarios(
              clienteId,
              atuais.map((f) => (f.id === payload.new.id ? payload.new : f))
            )
          }
          if (payload.eventType === 'DELETE' && payload.old) {
            setFuncionarios(
              clienteId,
              atuais.filter((f) => f.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()
  }

  async function adicionarNovoProduto(produtoData) {
    try {
      await produtosService.create(produtoData)
    } catch (error) {
      handleStoreError('Falha ao adicionar produto:', error, { notify: false, rethrow: true })
    }
  }

  async function atualizarProduto(produto) {
    try {
      await produtosService.update(produto)
    } catch (error) {
      handleStoreError('Falha ao atualizar produto:', error, { notify: false, rethrow: true })
    }
  }

  async function atualizarStatusProduto(produtoId, novoStatus) {
    try {
      await produtosService.updateStatus(produtoId, novoStatus)
    } catch (error) {
      handleStoreError('Falha ao atualizar status do produto:', error, { notify: false, rethrow: true })
    }
  }

  async function removerProduto(produtoId) {
    try {
      await produtosService.remove(produtoId)
    } catch (error) {
      handleStoreError('Falha ao remover produto:', error, { notify: false, rethrow: true })
    }
  }

  async function buscarFuncionariosPorCliente(clienteId, { force = false } = {}) {
    if (!clienteId) return []

    const cached = funcionariosPorCliente.value[clienteId]
    if (!force && cached) {
      return cached
    }

    try {
      const { data, error } = await supabase
        .from(FUNCIONARIOS_TABLE)
        .select('id, nome')
        .eq(FUNCIONARIO_CLIENTE_COL, clienteId)
        .order('nome', { ascending: true })

      if (error) throw error

      const lista = data ?? []
      setFuncionarios(clienteId, lista)
      ouvirMudancasDeFuncionarios()
      return lista
    } catch (error) {
      handleStoreError('Falha ao buscar funcionarios da empresa:', error, { notify: false, rethrow: true })
    }
  }

  async function adicionarFuncionarioParaCliente(clienteId, nome) {
    try {
      const novoFuncionario = await clientesService.createFuncionarioEmpresa({ clienteId, nome })
      const atuais = funcionariosPorCliente.value[clienteId] ?? []
      setFuncionarios(clienteId, [...atuais, novoFuncionario])
    } catch (error) {
      handleStoreError('Falha ao adicionar funcionario:', error, { notify: false, rethrow: true })
    }
  }

  async function removerFuncionarioDeCliente(clienteId, funcionarioId) {
    try {
      await clientesService.deleteFuncionarioEmpresa(funcionarioId)
      const atuais = funcionariosPorCliente.value[clienteId] ?? []
      setFuncionarios(clienteId, atuais.filter((f) => f.id !== funcionarioId))
    } catch (error) {
      handleStoreError('Falha ao remover funcionario:', error, { notify: false, rethrow: true })
    }
  }

  async function adicionarNovoCliente(cliente) {
    try {
      await clientesService.createCliente(cliente)
    } catch (error) {
      handleStoreError('Falha ao adicionar cliente:', error, { notify: false, rethrow: true })
    }
  }

  async function atualizarCliente(cliente) {
    try {
      await clientesService.updateCliente(cliente)
    } catch (error) {
      handleStoreError('Falha ao atualizar cliente:', error, { notify: false, rethrow: true })
    }
  }

  async function deletarCliente(id) {
    try {
      await clientesService.deleteCliente(id)
    } catch (error) {
      handleStoreError('Falha ao deletar cliente:', error, { notify: false, rethrow: true })
    }
  }

  async function atualizarStatusCliente(id, ativo) {
    try {
      await clientesService.updateClienteStatus(id, ativo)
    } catch (error) {
      handleStoreError('Falha ao atualizar status do cliente:', error, { notify: false, rethrow: true })
    }
  }

  function resetCache() {
    carregouClientes.value = false
    carregouProdutos.value = false
    clientes.value = []
    produtos.value = []
    funcionariosPorCliente.value = {}
  }

  const categoriasUnicas = computed(() => {
    const categorias = produtos.value.map((p) => p.categoria).filter(Boolean)
    return [...new Set(categorias)].sort()
  })

  return {
    produtos,
    clientes,
    funcionariosPorCliente,
    carregouClientes,
    carregouProdutos,
    loadingClientes,
    loadingProdutos,
    isLoading,
    categoriasUnicas,
    buscarProdutosIniciais,
    buscarClientes,
    onRealtimeCliente,
    resetCache,
    adicionarNovoProduto,
    atualizarProduto,
    atualizarStatusProduto,
    removerProduto,
    adicionarNovoCliente,
    atualizarCliente,
    deletarCliente,
    atualizarStatusCliente,
    buscarFuncionariosPorCliente,
    adicionarFuncionarioParaCliente,
    removerFuncionarioDeCliente
  }
})

