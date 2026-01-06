import { supabase } from 'src/supabaseClient'

function normalizeTextoUpper(value) {
  if (value === null || value === undefined) return null
  const texto = String(value)
  return texto ? texto.toUpperCase() : null
}

function normalizeProdutoPayload(payload) {
  if (!payload) return payload
  return {
    ...payload,
    nome: normalizeTextoUpper(payload.nome),
    categoria: normalizeTextoUpper(payload.categoria),
  }
}

function normalizeError(error, fallbackMessage) {
  return {
    message: error?.message || fallbackMessage,
    code: error?.code ?? null
  }
}

export async function fetchAll() {
  const { data, error } = await supabase.from('produtos').select('*').order('nome')
  if (error) {
    throw normalizeError(error, 'Erro ao buscar produtos.')
  }
  return data ?? []
}

export async function create(payload) {
  const { error } = await supabase.from('produtos').insert([normalizeProdutoPayload(payload)])
  if (error) {
    throw normalizeError(error, 'Erro ao criar produto.')
  }
}

export async function update({ id, ...patch }) {
  const { error } = await supabase.from('produtos').update(normalizeProdutoPayload(patch)).eq('id', id)
  if (error) {
    throw normalizeError(error, 'Erro ao atualizar produto.')
  }
}

export async function updateStatus(id, ativo) {
  const { error } = await supabase.from('produtos').update({ ativo }).eq('id', id)
  if (error) {
    throw normalizeError(error, 'Erro ao atualizar status do produto.')
  }
}

export async function remove(id) {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) {
    throw normalizeError(error, 'Erro ao remover produto.')
  }
}
