import Dexie from 'dexie'

const db = new Dexie('PDVRestauranteDB')

db.version(1).stores({
  produtos: '++id, nome',
  clientes: '++id, nome, telefone',
  sync_queue: '++id',
})

export { db }
