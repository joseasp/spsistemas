import { supabase } from 'src/supabaseClient'

const FUNCIONARIOS_TABLE = 'funcionarios_empresa'
const FUNCIONARIO_CLIENTE_COL = 'cliente_id'

function normalizeTextoUpper(value) {
  if (value === null || value === undefined) return null
  const texto = String(value)
  return texto ? texto.toUpperCase() : null
}

function normalizeClientePayload(cliente) {
  if (!cliente) return cliente
  return {
    ...cliente,
    nome: normalizeTextoUpper(cliente.nome),
    contato: normalizeTextoUpper(cliente.contato),
    observacoes: normalizeTextoUpper(cliente.observacoes),
  }
}

function normalizeError(error, fallbackMessage) {
  return {
    message: error?.message || fallbackMessage,
    code: error?.code ?? null
  }
}

export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true })
  if (error) {
    throw normalizeError(error, 'Erro ao buscar clientes.')
  }
  return data ?? []
}

export async function createCliente(cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert([normalizeClientePayload(cliente)])
    .select()
    .single()
  if (error) {
    throw normalizeError(error, 'Erro ao criar cliente.')
  }
  return data
}

export async function updateCliente(cliente) {
  const { id, ...clienteData } = cliente
  const { data, error } = await supabase
    .from('clientes')
    .update(normalizeClientePayload(clienteData))
    .eq('id', id)
    .select()
    .single()
  if (error) {
    throw normalizeError(error, 'Erro ao atualizar cliente.')
  }
  return data
}

export async function deleteCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) {
    throw normalizeError(error, 'Erro ao excluir cliente.')
  }
}

export async function updateClienteStatus(id, ativo) {
  const { data, error } = await supabase
    .from('clientes')
    .update({ ativo })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    throw normalizeError(error, 'Erro ao atualizar status do cliente.')
  }
  return data
}

export async function fetchFuncionariosEmpresa(clienteId) {
  const { data, error } = await supabase
    .from(FUNCIONARIOS_TABLE)
    .select('*')
    .eq(FUNCIONARIO_CLIENTE_COL, clienteId)
    .order('nome', { ascending: true })
  if (error) {
    throw normalizeError(error, 'Erro ao buscar funcionarios da empresa.')
  }
  return data ?? []
}

export async function createFuncionarioEmpresa({ clienteId, nome }) {
  const { data, error } = await supabase
    .from(FUNCIONARIOS_TABLE)
    .insert([{ [FUNCIONARIO_CLIENTE_COL]: clienteId, nome: normalizeTextoUpper(nome) }])
    .select()
    .single()
  if (error) {
    throw normalizeError(error, 'Erro ao criar funcionario da empresa.')
  }
  return data
}

export async function deleteFuncionarioEmpresa(funcionarioId) {
  const { error } = await supabase
    .from(FUNCIONARIOS_TABLE)
    .delete()
    .eq('id', funcionarioId)
  if (error) {
    throw normalizeError(error, 'Erro ao remover funcionario da empresa.')
  }
}
