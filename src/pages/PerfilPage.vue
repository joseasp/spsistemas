<template>
  <q-page class="perfil-page q-pa-md">
    <div class="text-h5 text-weight-medium">Meu perfil</div>
    <div class="text-caption text-grey-7 q-mb-md">
      Veja suas informacoes e atualize seu nome.
    </div>

    <q-card>
      <q-card-section>
        <q-form class="row q-col-gutter-md" @submit.prevent="salvar">
          <div class="col-12 col-md-6">
            <q-input v-model="nome" label="Nome" :disable="loading" required />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="email" label="Email" disable />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="empresa" label="Empresa" disable />
          </div>
          <div class="col-12 col-md-6">
            <q-input v-model="permissao" label="Permissao" disable />
          </div>
          <div class="col-12">
            <q-btn type="submit" color="primary" label="Salvar" :loading="saving" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store'

const authStore = useAuthStore()
const nome = ref('')
const saving = ref(false)
const loading = ref(false)

const email = computed(() => authStore.profile?.email || authStore.session?.user?.email || '')
const empresa = computed(() => authStore.empresaConfig?.nome_exibicao || authStore.empresaNome || '')
const permissao = computed(() => {
  if (authStore.role === 'owner') return 'Dono'
  if (authStore.role === 'admin') return 'Administrador'
  return 'Usuario'
})

async function carregar() {
  loading.value = true
  try {
    await authStore.fetchProfile()
    await authStore.fetchEmpresaNome()
    nome.value = authStore.profile?.nome || ''
  } finally {
    loading.value = false
  }
}

async function salvar() {
  if (!nome.value) {
    Notify.create({ type: 'negative', message: 'Informe seu nome.' })
    return
  }
  saving.value = true
  try {
    await authStore.updateProfileNome(nome.value)
    Notify.create({ type: 'positive', message: 'Perfil atualizado.' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao atualizar perfil.' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  carregar()
})
</script>

<style lang="scss">
.perfil-page {
  min-height: 100%;
}
</style>
