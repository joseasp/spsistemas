import { boot } from 'quasar/wrappers'
import { useMainStore } from 'src/stores/main-store'

export default boot(async () => {
  const store = useMainStore()
  const jobs = []
  if (!store.produtos?.length) jobs.push(store.buscarProdutosIniciais(false))
  if (!store.clientes?.length) jobs.push(store.buscarClientes(false))
  await Promise.allSettled(jobs)
})
