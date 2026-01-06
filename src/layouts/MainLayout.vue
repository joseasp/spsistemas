<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered class="bg-white text-dark">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-img
          :src="logoSrc"
          class="topbar-logo"
          fit="contain"
        />
        <div v-if="empresaNome && !isMobile" class="empresa-nome q-ml-sm">
          {{ empresaNome }}
        </div>

        <q-space />

        <q-btn
          icon="o_menu_book"
           :label="isMobile ? '' : 'Caderno'"
          :round="isMobile"
          :dense="isMobile"
          :title="isMobile ? 'Caderno' : undefined"
          to="/caderno"
          class="q-ml-sm topbar-btn"
          outline
        />

        <q-btn-dropdown
          flat
          icon="account_circle"
          class="q-ml-sm"
          :label="isMobile ? '' : userLabel"
          :round="isMobile"
          :dense="isMobile"
          :title="isMobile ? 'Conta' : undefined"
        >
          <q-list>
            <q-item clickable v-close-popup to="/perfil">
              <q-item-section avatar> <q-icon name="person" /> </q-item-section>
              <q-item-section> Meu perfil </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="openPasswordDialog">
              <q-item-section avatar> <q-icon name="lock" /> </q-item-section>
              <q-item-section> Alterar senha </q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="handleSignOut">
              <q-item-section avatar> <q-icon name="logout" /> </q-item-section>
              <q-item-section> Sair </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      @click.stop
      side="left"
      bordered
      :overlay="true"
      :width="240"
    >
      <q-list>
        <q-item-label header>Opera&ccedil;&atilde;o</q-item-label>

        <q-item clickable v-ripple to="/" exact active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_space_dashboard" /> </q-item-section>
          <q-item-section> Dashboard </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/caderno" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_menu_book" /> </q-item-section>
          <q-item-section> Caderno </q-item-section>
        </q-item>

        <q-item-label header>Cadastros</q-item-label>

        <q-item clickable v-ripple to="/produtos" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_takeout_dining" /> </q-item-section>
          <q-item-section> Produtos </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/clientes" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_people" /> </q-item-section>
          <q-item-section> Clientes </q-item-section>
        </q-item>

        <q-item-label v-if="podeVerFinanceiro" header>Financeiro</q-item-label>

        <q-item v-if="podeVerFinanceiro" clickable v-ripple to="/contas" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_request_quote" /> </q-item-section>
          <q-item-section> Contas a Receber </q-item-section>
        </q-item>

        <q-item v-if="podeVerFinanceiro" clickable v-ripple to="/relatorios" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_analytics" /> </q-item-section>
          <q-item-section> Relat&oacute;rios </q-item-section>
        </q-item>

        <q-item-label v-if="podeVerConfiguracoes" header>Configura&ccedil;&otilde;es</q-item-label>
        <q-item v-if="podeVerConfiguracoes" clickable v-ripple to="/configuracoes" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="settings" /> </q-item-section>
          <q-item-section> Empresa</q-item-section>
        </q-item>
        <q-item v-if="podeVerConfiguracoes" clickable v-ripple to="/configuracoes/usuarios" active-class="active-drawer-item" @click="closeDrawer">
          <q-item-section avatar> <q-icon name="o_admin_panel_settings" /> </q-item-section>
          <q-item-section> Usu&aacute;rios</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container class="bg-transparent" @click="handleMainClick">
      <router-view />
    </q-page-container>

    <q-dialog v-model="passwordDialogOpen">
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-subtitle1">Alterar senha</div>
          <div class="text-caption text-grey-7">Defina uma nova senha para sua conta.</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="currentPassword" type="password" label="Senha atual" />
          <q-input v-model="newPassword" type="password" label="Nova senha" />
          <div class="senha-forca">
            <div class="text-caption text-grey-7">For&ccedil;a da senha: {{ senhaForca.label }}</div>
            <q-linear-progress
              :value="senhaForca.percent"
              :color="senhaForca.color"
              rounded
            />
          </div>
          <q-input v-model="confirmNewPassword" type="password" label="Confirmar senha" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Salvar" :loading="savingPassword" @click="handleUpdatePassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Notify, Dialog, useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store'
import logoDefault from 'src/assets/logo-restaurante-completo.png'

const leftDrawerOpen = ref(false)
const $q = useQuasar()
const authStore = useAuthStore()
const isMobile = computed(() => $q.screen.lt.md)
const router = useRouter()
const route = useRoute()
const logoSrc = computed(() => authStore.empresaConfig?.logo_url || logoDefault)
const empresaNome = computed(() => authStore.empresaConfig?.nome_exibicao || authStore.empresaNome)
const podeVerFinanceiro = computed(() => ['owner', 'admin'].includes(authStore.role))
const podeVerConfiguracoes = computed(() => ['owner', 'admin'].includes(authStore.role))
const passwordDialogOpen = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const savingPassword = ref(false)
const userLabel = computed(
  () => authStore.profile?.nome || authStore.session?.user?.email || 'Conta'
)
const senhaForca = computed(() => getPasswordStrength(newPassword.value))

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function handleMainClick() {
  if (leftDrawerOpen.value) {
    leftDrawerOpen.value = false
  }
}

function closeDrawer() {
  leftDrawerOpen.value = false
}

function openPasswordDialog() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordDialogOpen.value = true
}

async function handleSignOut() {
  try {
    await authStore.signOut()
    router.replace('/login')
  } catch (error) {
    console.error('Falha ao sair:', error)
  }
}

async function handleUpdatePassword() {
  if (!currentPassword.value) {
    Notify.create({ type: 'negative', message: 'Informe sua senha atual.' })
    return
  }
  if (!isStrongPassword(newPassword.value)) {
    Notify.create({
      type: 'negative',
      message: 'A senha precisa ter ao menos 8 caracteres, com letra e n\u00famero.',
    })
    return
  }
  if (newPassword.value !== confirmNewPassword.value) {
    Notify.create({ type: 'negative', message: 'As senhas n\u00e3o conferem.' })
    return
  }
  const confirmou = await confirmarAcao(
    'Alterar senha',
    'Tem certeza que deseja alterar sua senha agora?'
  )
  if (!confirmou) return
  savingPassword.value = true
  try {
    await authStore.verifyCurrentPassword(currentPassword.value)
    await authStore.updatePassword(newPassword.value)
    Notify.create({ type: 'positive', message: 'Senha atualizada.' })
    passwordDialogOpen.value = false
  } catch (error) {
    Notify.create({ type: 'negative', message: error?.message || 'Erro ao atualizar senha.' })
  } finally {
    savingPassword.value = false
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
    return { label: 'M\u00e9dia', color: 'warning', percent }
  }
  if (score === 3) {
    return { label: 'Boa', color: 'primary', percent }
  }
  return { label: 'Forte', color: 'positive', percent }
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

watch(
  () => route.fullPath,
  () => {
    closeDrawer()
  }
)

watch(
  () => authStore.needsPasswordReset,
  (needsReset) => {
    if (needsReset) {
      openPasswordDialog()
    }
  }
)
</script>

<style lang="scss">
.q-header--bordered {
  border-bottom: 1px solid var(--brand-border);
}

.active-drawer-item {
  color: var(--brand-primary);
}

.empresa-nome {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--brand-text-strong);
}

.topbar-logo {
  height: 40px;
  width: 180px;
}

.topbar-btn {
  color: var(--brand-primary);
  border-color: var(--brand-primary);
  border-radius: 12px;
  font-weight: 600;
}

.senha-forca {
  margin-top: -4px;
  display: grid;
  gap: 6px;
}

@media (max-width: 599px) {
  .topbar-logo {
    width: 120px;
    height: 32px;
  }
}
</style>
