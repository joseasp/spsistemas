import { Dialog } from 'quasar'

const PIN = import.meta.env.VITE_ADMIN_PIN || '1234'

export function solicitarSenha({ titulo = 'Autorizacao necessaria', mensagem = 'Digite a senha' } = {}) {
  return new Promise((resolve) => {
    Dialog.create({
      title: titulo,
      message: mensagem,
      prompt: { model: '', type: 'password', label: 'Senha', filled: true },
      ok: { label: 'OK', color: 'primary' },
      cancel: true,
      persistent: true,
    })
      .onOk((val) => {
        const senha = String(val || '')
        resolve(senha === PIN)
      })
      .onCancel(() => resolve(false))
  })
}
