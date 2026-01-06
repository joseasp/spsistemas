import { supabase } from 'src/supabaseClient'

function normalizeError(error, fallbackMessage) {
  return {
    message: error?.message || fallbackMessage,
    code: error?.code ?? null,
  }
}

export async function fetchEmpresaConfig() {
  const { data, error } = await supabase.from('empresa_config').select('*').maybeSingle()
  if (error) {
    throw normalizeError(error, 'Erro ao buscar configuracoes da empresa.')
  }
  return data ?? null
}

export async function updateEmpresaConfig(empresaId, payload) {
  if (!empresaId) {
    throw normalizeError(null, 'Empresa nao encontrada.')
  }
  const { data, error } = await supabase
    .from('empresa_config')
    .upsert([{ empresa_id: empresaId, ...payload }], { onConflict: 'empresa_id' })
    .select()
    .single()
  if (error) {
    throw normalizeError(error, 'Erro ao atualizar configuracoes da empresa.')
  }
  return data
}
