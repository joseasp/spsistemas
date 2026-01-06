<template>
  <q-dialog :model-value="open" persistent no-backdrop-dismiss no-esc-dismiss>
    <q-card class="mfa-card">
      <q-card-section>
        <div class="text-h6">Autenticacao em duas etapas</div>
        <div class="text-caption text-grey-7">
          Para sua seguranca, confirme seu acesso.
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section v-if="mode === 'enroll'" class="q-gutter-md">
        <div class="text-subtitle2">Ativar autenticador</div>
        <div class="text-caption text-grey-7">
          Escaneie o QR Code no seu app (Google Authenticator, Authy, etc) e
          informe o codigo de 6 digitos.
        </div>

        <div v-if="qrCodeSrc" class="mfa-qr">
          <q-img :src="qrCodeSrc" width="180px" height="180px" />
        </div>

        <q-input
          v-if="secret"
          v-model="secret"
          label="Chave de configuracao"
          readonly
          class="mfa-secret"
        />

        <q-input v-model="code" label="Codigo do autenticador" maxlength="6" />
        <q-checkbox
          v-model="rememberDevice"
          label="Lembrar este dispositivo (sempre)"
          dense
        />

        <q-banner v-if="errorMsg" class="bg-red-1 text-red-9">
          {{ errorMsg }}
        </q-banner>
      </q-card-section>

      <q-card-section v-else-if="mode === 'verify'" class="q-gutter-md">
        <div class="text-subtitle2">Confirmar codigo</div>
        <div class="text-caption text-grey-7">
          Informe o codigo do seu autenticador para concluir o login.
        </div>
        <q-input v-model="code" label="Codigo do autenticador" maxlength="6" />
        <q-checkbox
          v-model="rememberDevice"
          label="Lembrar este dispositivo (sempre)"
          dense
        />
        <q-banner v-if="errorMsg" class="bg-red-1 text-red-9">
          {{ errorMsg }}
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          color="primary"
          :loading="loading"
          :label="mode === 'enroll' ? 'Ativar e continuar' : 'Confirmar'"
          @click="handleSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
})

const authStore = useAuthStore()
const loading = ref(false)
const enrollData = ref(null)
const code = ref('')
const errorMsg = ref('')
const rememberDevice = ref(true)

const mode = computed(() => {
  if (authStore.mfaNeedsEnrollment) return 'enroll'
  if (authStore.mfaNeedsVerification) return 'verify'
  return null
})

const qrCodeSrc = computed(() => {
  const qr = enrollData.value?.totp?.qr_code
  if (!qr) return ''
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`
})

const secret = computed(() => enrollData.value?.totp?.secret || '')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    code.value = ''
    errorMsg.value = ''
    rememberDevice.value = true
    if (mode.value === 'enroll' && !enrollData.value) {
      startEnroll()
    }
  }
)

watch(
  () => mode.value,
  (newMode) => {
    code.value = ''
    errorMsg.value = ''
    rememberDevice.value = true
    if (newMode !== 'enroll') {
      enrollData.value = null
    }
  }
)

async function startEnroll() {
  loading.value = true
  errorMsg.value = ''
  try {
    enrollData.value = await authStore.enrollMfaTotp()
  } catch (error) {
    errorMsg.value = error?.message || 'Nao foi possivel iniciar o MFA.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!code.value || code.value.length < 6) {
    errorMsg.value = 'Informe o codigo de 6 digitos.'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const factorId = mode.value === 'enroll'
      ? enrollData.value?.id
      : authStore.mfaFactors[0]?.id
    if (!factorId) {
      errorMsg.value = 'Nenhum fator MFA disponivel.'
      return
    }
    await authStore.verifyMfa(factorId, code.value)
    authStore.setTrustedDevice(rememberDevice.value)
    Notify.create({ type: 'positive', message: 'MFA verificado.' })
  } catch (error) {
    errorMsg.value = error?.message || 'Codigo invalido.'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss">
.mfa-card {
  width: min(420px, 92vw);
}

.mfa-qr {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.mfa-secret input {
  font-family: monospace;
}
</style>
