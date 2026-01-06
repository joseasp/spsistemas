import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from 'src/supabaseClient'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const empresaId = ref(null)
  const role = ref(null)
  const empresaConfig = ref(null)
  const profile = ref(null)
  const empresaNome = ref(null)
  const canCreateEmpresa = ref(false)
  const mfaFactors = ref([])
  const mfaLevel = ref(null)
  const mfaNextLevel = ref(null)
  const mfaAvailable = ref(true)
  const trustedDevice = ref(false)
  const loading = ref(true)
  const needsPasswordReset = ref(false)

  const isAuthenticated = computed(() => Boolean(session.value?.user))
  const isReady = computed(() => !loading.value)
  const mfaNeedsEnrollment = computed(() => false)
  const mfaNeedsVerification = computed(() => false)

  let initPromise = null

  let baseTheme = null

  function captureBaseTheme() {
    if (baseTheme || typeof window === 'undefined') return
    const rootStyles = getComputedStyle(document.documentElement)
    const bodyStyles = getComputedStyle(document.body)
    baseTheme = {
      primary: rootStyles.getPropertyValue('--q-primary').trim(),
      secondary: rootStyles.getPropertyValue('--q-secondary').trim(),
      accent: rootStyles.getPropertyValue('--q-accent').trim(),
      primaryRgb: rootStyles.getPropertyValue('--q-primary-rgb').trim(),
      secondaryRgb: rootStyles.getPropertyValue('--q-secondary-rgb').trim(),
      accentRgb: rootStyles.getPropertyValue('--q-accent-rgb').trim(),
      brandPrimary: rootStyles.getPropertyValue('--brand-primary').trim(),
      brandSecondary: rootStyles.getPropertyValue('--brand-secondary').trim(),
      brandAccent: rootStyles.getPropertyValue('--brand-accent').trim(),
      brandBackground: rootStyles.getPropertyValue('--brand-background').trim(),
      brandBorder: rootStyles.getPropertyValue('--brand-border').trim(),
      brandSurface: rootStyles.getPropertyValue('--brand-surface').trim(),
      brandSurfaceSoft: rootStyles.getPropertyValue('--brand-surface-soft').trim(),
      brandTextStrong: rootStyles.getPropertyValue('--brand-text-strong').trim(),
      brandTextMuted: rootStyles.getPropertyValue('--brand-text-muted').trim(),
      background: bodyStyles.backgroundColor || '',
    }
  }

  function setCssVar(name, value) {
    if (!value || typeof window === 'undefined') return
    document.documentElement.style.setProperty(name, value)
  }

  function setRgbVar(name, value) {
    if (!value || typeof window === 'undefined') return
    const hex = value.replace('#', '').trim()
    if (hex.length !== 6) return
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if ([r, g, b].some((v) => Number.isNaN(v))) return
    document.documentElement.style.setProperty(name, `${r}, ${g}, ${b}`)
  }

  function applyBranding(config) {
    if (!config || typeof window === 'undefined') return
    captureBaseTheme()
    setCssVar('--q-primary', config.cor_primaria)
    setCssVar('--q-secondary', config.cor_secundaria)
    setCssVar('--q-accent', config.cor_accent)
    setRgbVar('--q-primary-rgb', config.cor_primaria)
    setRgbVar('--q-secondary-rgb', config.cor_secundaria)
    setRgbVar('--q-accent-rgb', config.cor_accent)
    setCssVar('--brand-primary', config.cor_primaria)
    setCssVar('--brand-secondary', config.cor_secundaria)
    setCssVar('--brand-accent', config.cor_accent)
    setCssVar('--brand-border', config.cor_accent || config.cor_secundaria)
    setCssVar('--brand-surface-soft', config.cor_secundaria)
    if (config.cor_fundo) {
      document.body.style.backgroundColor = config.cor_fundo
      setCssVar('--brand-background', config.cor_fundo)
    }
  }

  function resetBranding() {
    if (!baseTheme || typeof window === 'undefined') return
    setCssVar('--q-primary', baseTheme.primary)
    setCssVar('--q-secondary', baseTheme.secondary)
    setCssVar('--q-accent', baseTheme.accent)
    setCssVar('--q-primary-rgb', baseTheme.primaryRgb)
    setCssVar('--q-secondary-rgb', baseTheme.secondaryRgb)
    setCssVar('--q-accent-rgb', baseTheme.accentRgb)
    setCssVar('--brand-primary', baseTheme.brandPrimary)
    setCssVar('--brand-secondary', baseTheme.brandSecondary)
    setCssVar('--brand-accent', baseTheme.brandAccent)
    setCssVar('--brand-background', baseTheme.brandBackground)
    setCssVar('--brand-border', baseTheme.brandBorder)
    setCssVar('--brand-surface', baseTheme.brandSurface)
    setCssVar('--brand-surface-soft', baseTheme.brandSurfaceSoft)
    setCssVar('--brand-text-strong', baseTheme.brandTextStrong)
    setCssVar('--brand-text-muted', baseTheme.brandTextMuted)
    if (baseTheme.background) {
      document.body.style.backgroundColor = baseTheme.background
    }
  }

  function previewEmpresaConfig(partialConfig) {
    if (!partialConfig) return
    const current = empresaConfig.value || {}
    empresaConfig.value = { ...current, ...partialConfig }
    applyBranding(empresaConfig.value)
  }

  async function fetchEmpresaId() {
    empresaId.value = null
    role.value = null
    empresaConfig.value = null
    empresaNome.value = null
    canCreateEmpresa.value = false
    const userId = session.value?.user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('empresa_usuarios')
      .select('empresa_id, role')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar empresa do usuario:', error)
      return
    }

    empresaId.value = data?.empresa_id ?? null
    role.value = data?.role ?? null
    if (!empresaId.value) {
      await acceptEmpresaConvite()
      if (empresaId.value) {
        await fetchEmpresaNome()
        await fetchEmpresaConfig()
        return
      }
      await fetchEmpresaCreationAccess()
    }
    await fetchEmpresaNome()
    await fetchEmpresaConfig()
  }

  async function fetchMfaStatus() {
    mfaFactors.value = []
    mfaLevel.value = null
    mfaNextLevel.value = null
    mfaAvailable.value = true
    trustedDevice.value = false
    if (!session.value?.user?.id) {
      mfaAvailable.value = false
      return
    }
    loadTrustedDevice()
    const [{ data: factorsData, error: factorsError }, { data: levelData, error: levelError }] =
      await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])

    if (factorsError) {
      console.error('Erro ao carregar MFA:', factorsError)
      mfaAvailable.value = false
      return
    }

    if (levelError) {
      console.error('Erro ao carregar nivel MFA:', levelError)
      mfaAvailable.value = false
      return
    }

    mfaFactors.value = factorsData?.totp ?? []
    mfaLevel.value = levelData?.currentLevel ?? null
    mfaNextLevel.value = levelData?.nextLevel ?? null
  }

  function getTrustStorageKey() {
    const userId = session.value?.user?.id
    return userId ? `mfa_trust_${userId}` : null
  }

  function loadTrustedDevice() {
    trustedDevice.value = false
    if (typeof window === 'undefined') return
    const key = getTrustStorageKey()
    if (!key) return
    const raw = window.localStorage.getItem(key)
    if (!raw) return
    if (raw === 'forever') {
      trustedDevice.value = true
      return
    }
    const expiresAt = Number(raw)
    if (!expiresAt || Number.isNaN(expiresAt)) {
      window.localStorage.removeItem(key)
      return
    }
    if (Date.now() > expiresAt) {
      window.localStorage.removeItem(key)
      return
    }
    trustedDevice.value = true
  }

  function setTrustedDevice(remember) {
    trustedDevice.value = false
    if (typeof window === 'undefined') return
    const key = getTrustStorageKey()
    if (!key) return
    if (!remember) {
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, 'forever')
    trustedDevice.value = true
  }

  async function enrollMfaTotp() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Restaurante Silva',
      friendlyName: 'Dispositivo principal',
    })
    if (error) throw error
    return data
  }

  async function verifyMfa(factorId, code) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })
    if (error) throw error
    if (data?.access_token && data?.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (sessionError) throw sessionError
    }
    await fetchMfaStatus()
  }

  async function fetchProfile() {
    const userId = session.value?.user?.id
    if (!userId) {
      profile.value = null
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('Erro ao buscar perfil:', error)
      return
    }
    profile.value = data ?? null
  }

  async function updateProfileNome(nome) {
    const userId = session.value?.user?.id
    const userEmail = session.value?.user?.email || profile.value?.email
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, nome, email: userEmail })
      .select('id, nome, email')
      .maybeSingle()
    if (error) throw error
    profile.value = data ?? profile.value
    return data
  }

  async function fetchEmpresaNome() {
    empresaNome.value = null
    if (!empresaId.value) return
    const { data, error } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', empresaId.value)
      .maybeSingle()
    if (error) {
      console.error('Erro ao buscar empresa:', error)
      return
    }
    empresaNome.value = data?.nome ?? null
  }

  async function fetchEmpresaCreationAccess() {
    canCreateEmpresa.value = false
    if (!session.value?.user?.id) return false
    const { data, error } = await supabase.rpc('can_create_empresa')
    if (error) {
      console.error('Erro ao verificar permissao de criacao:', error)
      return false
    }
    canCreateEmpresa.value = Boolean(data)
    return canCreateEmpresa.value
  }

  async function acceptEmpresaConvite() {
    if (!session.value?.user?.id) return false
    const { data, error } = await supabase.rpc('accept_empresa_convite')
    if (error) {
      if (error.message !== 'convite nao encontrado') {
        console.error('Erro ao aceitar convite:', error)
      }
      return false
    }
    if (!data) return false
    empresaId.value = data
    role.value = null
    return true
  }

  async function fetchEmpresaConfig() {
    if (!empresaId.value) {
      empresaConfig.value = null
      resetBranding()
      return
    }

    const { data, error } = await supabase
      .from('empresa_config')
      .select('nome_exibicao, logo_url, cor_primaria, cor_secundaria, cor_accent, cor_fundo, usa_erp, usa_estoque, pdv_layout')
      .eq('empresa_id', empresaId.value)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar configuracoes da empresa:', error)
      return
    }

    empresaConfig.value = data ?? null
    if (empresaConfig.value) {
      applyBranding(empresaConfig.value)
    } else {
      resetBranding()
    }
  }

  async function init() {
    if (initPromise) return initPromise
    initPromise = (async () => {
      loading.value = true
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erro ao carregar sessao:', error)
      }
      session.value = data?.session ?? null
      await fetchProfile()
      await fetchEmpresaId()
      await fetchMfaStatus()

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        session.value = newSession
        if (event === 'PASSWORD_RECOVERY') {
          needsPasswordReset.value = true
        }
        if (event === 'SIGNED_OUT') {
          empresaId.value = null
          role.value = null
          empresaConfig.value = null
          profile.value = null
          empresaNome.value = null
          canCreateEmpresa.value = false
          mfaFactors.value = []
          mfaLevel.value = null
          mfaNextLevel.value = null
          mfaAvailable.value = true
          trustedDevice.value = false
          needsPasswordReset.value = false
          resetBranding()
        }
        await fetchProfile()
        await fetchEmpresaId()
        await fetchMfaStatus()
      })

      loading.value = false
    })()

    return initPromise
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function verifyCurrentPassword(password) {
    const email = session.value?.user?.email
    if (!email) throw new Error('Email nao encontrado.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp({ email, password, nome }) {
    const options = nome ? { data: { nome } } : undefined
    const { error } = await supabase.auth.signUp({ email, password, options })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function requestPasswordReset(email) {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/#/login`
      : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    needsPasswordReset.value = false
  }

  async function bootstrapEmpresa(nomeEmpresa) {
    const { data, error } = await supabase.rpc('bootstrap_empresa', {
      nome_empresa: nomeEmpresa,
    })
    if (error) throw error
    await fetchEmpresaId()
    canCreateEmpresa.value = false
    return data
  }

  return {
    session,
    empresaId,
    role,
    empresaConfig,
    profile,
    empresaNome,
    canCreateEmpresa,
    mfaFactors,
    mfaLevel,
    mfaNextLevel,
    mfaAvailable,
    trustedDevice,
    loading,
    needsPasswordReset,
    isAuthenticated,
    isReady,
    mfaNeedsEnrollment,
    mfaNeedsVerification,
    init,
    fetchEmpresaId,
    fetchEmpresaConfig,
    fetchProfile,
    fetchEmpresaNome,
    fetchEmpresaCreationAccess,
    updateProfileNome,
    fetchMfaStatus,
    enrollMfaTotp,
    verifyMfa,
    setTrustedDevice,
    loadTrustedDevice,
    previewEmpresaConfig,
    signIn,
    signUp,
    verifyCurrentPassword,
    signOut,
    requestPasswordReset,
    updatePassword,
    bootstrapEmpresa,
    acceptEmpresaConvite,
  }
})
