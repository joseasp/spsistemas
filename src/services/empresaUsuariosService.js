import { supabase } from 'src/supabaseClient'

function normalizeError(error, fallbackMessage) {
  return {
    message: error?.message || fallbackMessage,
    code: error?.code ?? null,
  }
}

export async function listUsuariosEmpresa() {
  const { data, error } = await supabase.rpc('list_empresa_usuarios')
  if (error) {
    throw normalizeError(error, 'Erro ao carregar usuarios.')
  }
  return data ?? []
}

export async function inviteUsuarioPorEmail(email, role = 'user') {
  const { data, error } = await supabase.rpc('invite_user_to_empresa', {
    user_email: email,
    user_role: role,
  })
  if (error) {
    throw normalizeError(error, 'Erro ao convidar usuario.')
  }
  return data
}

export async function updateUsuarioRole(userId, role) {
  const { data, error } = await supabase
    .from('empresa_usuarios')
    .update({ role })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) {
    throw normalizeError(error, 'Erro ao atualizar permissao.')
  }
  return data
}

export async function removerUsuario(userId) {
  const { error } = await supabase.rpc('remove_user_from_empresa', { target_user_id: userId })
  if (error) {
    throw normalizeError(error, 'Erro ao remover usuario.')
  }
}

export async function listConvites() {
  const { data, error } = await supabase.rpc('list_empresa_convites')
  if (error) {
    throw normalizeError(error, 'Erro ao carregar convites.')
  }
  return data ?? []
}

export async function removerConvite(conviteId) {
  const { error } = await supabase
    .from('empresa_convites')
    .delete()
    .eq('id', conviteId)
  if (error) {
    throw normalizeError(error, 'Erro ao remover convite.')
  }
}
