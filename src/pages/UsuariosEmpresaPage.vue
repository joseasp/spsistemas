<template>
  <q-page class="usuarios-page q-pa-md">
    <div class="row items-center q-col-gutter-md">
      <div class="col-12 col-md-8">
        <div class="text-h5 text-weight-medium">Usuarios da empresa</div>
        <div class="text-caption text-grey-7">
          Gerencie quem pode acessar o sistema e as permissoes.
        </div>
      </div>
      <div class="col-12 col-md-4 flex justify-end">
        <q-btn flat icon="refresh" label="Atualizar" :loading="loading || loadingConvites" @click="refreshAll" />
      </div>
    </div>

    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-subtitle1">Convidar usuario</div>
        <div class="text-caption text-grey-7">
          Informe o email e a permissao. Se a conta nao existir, o convite fica pendente.
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form class="row q-col-gutter-md items-end" @submit.prevent="adicionarUsuario">
          <div class="col-12 col-md-6">
            <q-input v-model="novoEmail" label="Email do usuario" type="email" required />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="novoRole"
              :options="roles"
              label="Permissao"
              emit-value
              map-options
              required
            />
          </div>
          <div class="col-12 col-md-3">
            <q-btn type="submit" color="primary" label="Convidar" :loading="adicionando" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md">
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle1">Equipe</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-banner v-if="erro" class="bg-red-1 text-red-9 q-mb-md">
          {{ erro }}
        </q-banner>
        <q-table
          :rows="usuarios"
          :columns="colunas"
          row-key="user_id"
          flat
          :loading="loading"
          no-data-label="Nenhum usuario encontrado."
        >
          <template #body-cell-role="props">
            <q-td :props="props">
              <q-badge v-if="props.row.role === 'owner'" color="primary" outline>
                Dono
              </q-badge>
              <q-select
                v-else
                v-model="props.row.role"
                :options="roles"
                dense
                emit-value
                map-options
                @update:model-value="(val) => atualizarRole(props.row, val)"
              />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                color="negative"
                icon="delete"
                :disable="props.row.role === 'owner' || props.row.user_id === authStore.session?.user?.id"
                @click="remover(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md">
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle1">Convites pendentes</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-table
          :rows="convites"
          :columns="colunasConvites"
          row-key="id"
          flat
          :loading="loadingConvites"
          no-data-label="Nenhum convite pendente."
        >
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                color="negative"
                icon="close"
                @click="cancelarConvite(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Notify, Dialog, date } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store'
import { empresaUsuariosService } from 'src/services'

const authStore = useAuthStore()
const loading = ref(false)
const adicionando = ref(false)
const erro = ref('')
const usuarios = ref([])
const novoEmail = ref('')
const novoRole = ref('user')
const convites = ref([])
const loadingConvites = ref(false)

const roles = [
  { label: 'Usuario', value: 'user' },
  { label: 'Administrador', value: 'admin' },
]

const formatData = (value) => (value ? date.formatDate(value, 'DD/MM/YYYY HH:mm') : '-')

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', format: (val) => val || '-' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'role', label: 'Permissao', field: 'role', align: 'left' },
  { name: 'created_at', label: 'Adicionado em', field: 'created_at', align: 'left', format: formatData },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const colunasConvites = [
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'role', label: 'Permissao', field: 'role', align: 'left' },
  { name: 'created_at', label: 'Convidado em', field: 'created_at', align: 'left', format: formatData },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const data = await empresaUsuariosService.listUsuariosEmpresa()
    usuarios.value = data
  } catch (error) {
    erro.value = error?.message || 'Falha ao carregar usuarios.'
  } finally {
    loading.value = false
  }
}

async function adicionarUsuario() {
  if (!novoEmail.value) return
  adicionando.value = true
  try {
    const result = await empresaUsuariosService.inviteUsuarioPorEmail(novoEmail.value, novoRole.value)
    const mensagem = result === 'added'
      ? 'Usuario adicionado.'
      : 'Convite criado. O usuario precisa finalizar o cadastro.'
    Notify.create({ type: 'positive', message: mensagem })
    novoEmail.value = ''
    novoRole.value = 'user'
    await refreshAll()
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao convidar usuario.' })
  } finally {
    adicionando.value = false
  }
}

async function atualizarRole(row, role) {
  try {
    await empresaUsuariosService.updateUsuarioRole(row.user_id, role)
    Notify.create({ type: 'positive', message: 'Permissao atualizada.' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao atualizar permissao.' })
  }
}

async function remover(row) {
  const confirmou = await confirmarAcao(
    'Remover usuario',
    'Tem certeza? Essa pessoa perdera o acesso ao sistema.'
  )
  if (!confirmou) return
  try {
    await empresaUsuariosService.removerUsuario(row.user_id)
    Notify.create({ type: 'positive', message: 'Usuario removido.' })
    await refreshAll()
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao remover usuario.' })
  }
}

async function carregarConvites() {
  loadingConvites.value = true
  try {
    const data = await empresaUsuariosService.listConvites()
    convites.value = data
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao carregar convites.' })
  } finally {
    loadingConvites.value = false
  }
}

async function cancelarConvite(row) {
  const confirmou = await confirmarAcao(
    'Cancelar convite',
    'Tem certeza? O convite sera removido.'
  )
  if (!confirmou) return
  try {
    await empresaUsuariosService.removerConvite(row.id)
    Notify.create({ type: 'positive', message: 'Convite removido.' })
    await refreshAll()
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao remover convite.' })
  }
}

async function refreshAll() {
  await Promise.all([carregar(), carregarConvites()])
}

async function confirmarAcao(titulo, mensagem) {
  return new Promise((resolve) => {
    Dialog.create({
      title: titulo,
      message: mensagem,
      cancel: true,
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
      .onDismiss(() => resolve(false))
  })
}

onMounted(() => {
  refreshAll()
})
</script>

<style lang="scss">
.usuarios-page {
  min-height: 100%;
}
</style>
