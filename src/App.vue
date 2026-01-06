<template>
  <router-view />
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { Notify } from 'quasar'
import { useMainStore } from 'src/stores/main-store'
import { useAuthStore } from 'src/stores/auth-store'

const mainStore = useMainStore()
const authStore = useAuthStore()

const IDLE_TIMEOUT_MS = 1000 * 60 * 120
const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
let idleTimer = null

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function resetIdleTimer() {
  if (!authStore.isAuthenticated) return
  clearIdleTimer()
  idleTimer = setTimeout(async () => {
    if (!authStore.isAuthenticated) return
    await authStore.signOut()
    Notify.create({
      type: 'warning',
      message: 'Sessao encerrada por inatividade.',
    })
  }, IDLE_TIMEOUT_MS)
}

onMounted(() => {
  authStore.init()
  activityEvents.forEach((event) =>
    window.addEventListener(event, resetIdleTimer, { passive: true })
  )
  document.addEventListener('visibilitychange', handleVisibilityChange)
  resetIdleTimer()
})

onBeforeUnmount(() => {
  activityEvents.forEach((event) => window.removeEventListener(event, resetIdleTimer))
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearIdleTimer()
})

watch(
  () => [authStore.isReady, authStore.isAuthenticated, authStore.empresaId],
  async ([isReady, isAuthenticated, empresaId], prev) => {
    const prevEmpresaId = Array.isArray(prev) ? prev[2] : null
    if (!isReady || !isAuthenticated || !empresaId) {
      mainStore.resetCache()
      clearIdleTimer()
      return
    }

    if (prevEmpresaId && prevEmpresaId !== empresaId) {
      mainStore.resetCache()
    }

    resetIdleTimer()
    await mainStore.buscarProdutosIniciais()
    await mainStore.buscarClientes()
  },
  { immediate: true }
)

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    authStore.fetchProfile()
  }
}
</script>
