<template>
  <q-page class="auth-page flex flex-center">
    <q-card class="auth-card q-pa-md">
      <q-card-section>
        <div class="text-h6">Acesso</div>
        <div class="text-caption text-grey-7">Entre com seu email e senha</div>
      </q-card-section>

      <q-card-section>
        <q-tabs v-model="mode" dense align="justify" class="text-primary">
          <q-tab name="login" label="Entrar" />
          <q-tab name="signup" label="Criar conta" />
        </q-tabs>
        <q-separator class="q-mt-sm" />

        <q-form class="q-gutter-md q-mt-md" @submit.prevent="handleSubmit">
          <q-input
            v-if="mode === 'signup'"
            v-model="nome"
            label="Nome completo"
            :disable="!authStore.isReady"
            required
          />
          <q-input v-model="email" type="email" label="Email" :disable="!authStore.isReady" required />
          <q-input v-model="password" type="password" label="Senha" :disable="!authStore.isReady" required />
          <div v-if="mode === 'signup'" class="senha-forca">
            <div class="text-caption text-grey-7">Forca da senha: {{ senhaForca.label }}</div>
            <q-linear-progress
              :value="senhaForca.percent"
              :color="senhaForca.color"
              rounded
            />
          </div>
          <q-input
            v-if="mode === 'signup'"
            v-model="confirmPassword"
            type="password"
            label="Confirmar senha"
            :disable="!authStore.isReady"
            required
          />
          <q-btn
            type="submit"
            color="primary"
            :loading="submitting"
            :label="mode === 'login' ? 'Entrar' : 'Criar conta'"
          />
          <q-btn
            v-if="mode === 'login'"
            flat
            class="q-ml-sm"
            label="Esqueci a senha"
            :disable="!email"
            @click="handleResetPassword"
          />
        </q-form>
      </q-card-section>

      <q-separator v-if="authStore.isAuthenticated && !authStore.empresaId" />

      <q-card-section v-if="authStore.isAuthenticated && !authStore.empresaId && !authStore.canCreateEmpresa">
        <div class="text-subtitle2">Acesso pendente</div>
        <div class="text-caption text-grey-7">
          Sua conta ainda nao esta liberada. Se voce recebeu convite, o sistema libera automaticamente.
        </div>
      </q-card-section>

      <q-card-section v-if="authStore.isAuthenticated && !authStore.empresaId && authStore.canCreateEmpresa">
        <div class="text-subtitle2">Criar empresa</div>
        <div class="text-caption text-grey-7">Use apenas se voce for o dono.</div>

        <q-form class="q-gutter-md q-mt-md" @submit.prevent="handleBootstrap">
          <q-input v-model="nomeEmpresa" label="Nome da empresa" required />
          <q-btn type="submit" color="primary" :loading="bootstrapping" label="Criar empresa" />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store'

const authStore = useAuthStore()
const router = useRouter()

const mode = ref('login')
const nome = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const nomeEmpresa = ref('')
const submitting = ref(false)
const bootstrapping = ref(false)

const senhaForca = computed(() => getPasswordStrength(password.value))

onMounted(() => {
  authStore.init()
})

watch(
  () => [authStore.isAuthenticated, authStore.empresaId, authStore.isReady],
  ([isAuthenticated, empresaId, isReady]) => {
    if (isReady && isAuthenticated && empresaId) {
      router.replace('/')
    }
  },
  { immediate: true }
)

watch(
  () => mode.value,
  (newMode) => {
    if (newMode !== 'signup') {
      confirmPassword.value = ''
      nome.value = ''
    }
  }
)

async function handleSubmit() {
  if (!email.value || !password.value) return
  if (mode.value === 'signup') {
    if (!nome.value) {
      Notify.create({ type: 'negative', message: 'Informe seu nome.' })
      return
    }
    if (!isStrongPassword(password.value)) {
      Notify.create({
        type: 'negative',
        message: 'A senha precisa ter ao menos 8 caracteres, com letra e numero.',
      })
      return
    }
    if (password.value !== confirmPassword.value) {
      Notify.create({ type: 'negative', message: 'As senhas nao conferem.' })
      return
    }
  }
  submitting.value = true
  try {
    if (mode.value === 'login') {
      await authStore.signIn({ email: email.value, password: password.value })
      Notify.create({ type: 'positive', message: 'Login realizado.' })
    } else {
      await authStore.signUp({ email: email.value, password: password.value, nome: nome.value })
      Notify.create({
        type: 'positive',
        message: 'Conta criada. Verifique seu email se a confirmacao for exigida.',
      })
    }
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error?.message || 'Nao foi possivel autenticar.',
    })
  } finally {
    submitting.value = false
  }
}

function isStrongPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value || '')
}

function getPasswordStrength(value) {
  const passwordValue = value || ''
  let score = 0
  if (passwordValue.length >= 8) score += 1
  if (/[A-Za-z]/.test(passwordValue) && /\d/.test(passwordValue)) score += 1
  if (/[A-Z]/.test(passwordValue)) score += 1
  if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1

  const percent = score / 4
  if (score <= 1) {
    return { label: 'Fraca', color: 'negative', percent }
  }
  if (score === 2) {
    return { label: 'Media', color: 'warning', percent }
  }
  if (score === 3) {
    return { label: 'Boa', color: 'primary', percent }
  }
  return { label: 'Forte', color: 'positive', percent }
}

async function handleResetPassword() {
  if (!email.value) return
  submitting.value = true
  try {
    await authStore.requestPasswordReset(email.value)
    Notify.create({
      type: 'positive',
      message: 'Enviamos um email para redefinir a senha.',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error?.message || 'Nao foi possivel enviar o email.',
    })
  } finally {
    submitting.value = false
  }
}

async function handleBootstrap() {
  if (!nomeEmpresa.value) return
  bootstrapping.value = true
  try {
    await authStore.bootstrapEmpresa(nomeEmpresa.value)
    Notify.create({ type: 'positive', message: 'Empresa criada.' })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error?.message || 'Nao foi possivel criar a empresa.',
    })
  } finally {
    bootstrapping.value = false
  }
}
</script>

<style lang="scss">
.auth-page {
  min-height: 100vh;
  background: #f5f4ef;
}

.auth-card {
  width: min(420px, 92vw);
}

.senha-forca {
  margin-top: -4px;
  display: grid;
  gap: 6px;
}
</style>
