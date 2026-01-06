<template>
  <q-page class="config-page q-pa-md">
    <div class="row items-center q-col-gutter-md">
      <div class="col-12 col-md-8">
        <div class="text-h5 text-weight-medium">Configuracoes da empresa</div>
        <div class="text-caption text-grey-7">Personalize cores e logo do sistema.</div>
      </div>
    </div>

    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-subtitle1">Identidade visual</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form class="q-gutter-lg" @submit.prevent="salvar">
          <q-input
            v-model="form.nome_exibicao"
            label="Nome da empresa (exibicao)"
            hint="Esse nome aparece em relatorios e mensagens do sistema."
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-lg-5">
              <div class="text-subtitle2 q-mb-sm">Logo</div>
              <q-card flat bordered class="q-pa-md logo-card">
                <div class="row items-center q-col-gutter-md">
                  <div class="col-12">
                    <q-file
                      v-model="logoFile"
                      label="Enviar logo"
                      accept="image/*"
                      @update:model-value="uploadLogo"
                      clearable
                    />
                    <div class="text-caption text-grey-7 q-mt-xs">
                      PNG transparente, ate 512 KB. Recomendado 180x40 px (4.5:1). Para melhor
                      qualidade use 360x80.
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="logo-preview">
                      <q-img
                        v-if="form.logo_url"
                        :src="form.logo_url"
                        style="height: 40px; width: 180px;"
                        fit="contain"
                      />
                      <div v-else class="text-caption text-grey-7">Nenhuma logo enviada.</div>
                    </div>
                  </div>
                  <div class="col-12">
                    <q-btn
                      flat
                      color="negative"
                      label="Remover logo"
                      :disable="!form.logo_url"
                      @click="removerLogo"
                    />
                  </div>
                </div>
              </q-card>
            </div>

            <div class="col-12 col-lg-7">
              <div class="text-subtitle2 q-mb-sm">Cores</div>
              <q-card flat bordered class="q-pa-md">
                <div class="text-caption text-grey-7 q-mb-sm">Paletas rapidas</div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div v-for="tema in temas" :key="tema.nome" class="col-auto">
                    <button class="palette-btn" type="button" @click="aplicarTema(tema)">
                      <span class="palette-title">{{ tema.nome }}</span>
                      <span class="palette-swatches">
                        <span class="swatch" :style="{ background: tema.cor_primaria }"></span>
                        <span class="swatch" :style="{ background: tema.cor_secundaria }"></span>
                        <span class="swatch" :style="{ background: tema.cor_accent }"></span>
                        <span class="swatch" :style="{ background: tema.cor_fundo }"></span>
                      </span>
                    </button>
                  </div>
                </div>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <div class="color-field">
                      <q-input v-model="form.cor_primaria" label="Cor primaria" dense outlined />
                      <div
                        class="color-preview"
                        :style="{ background: form.cor_primaria || '#ffffff' }"
                      ></div>
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="color-field">
                      <q-input v-model="form.cor_secundaria" label="Cor secundaria" dense outlined />
                      <div
                        class="color-preview"
                        :style="{ background: form.cor_secundaria || '#ffffff' }"
                      ></div>
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="color-field">
                      <q-input v-model="form.cor_accent" label="Cor de destaque" dense outlined />
                      <div
                        class="color-preview"
                        :style="{ background: form.cor_accent || '#ffffff' }"
                      ></div>
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="color-field">
                      <q-input v-model="form.cor_fundo" label="Cor de fundo" dense outlined />
                      <div
                        class="color-preview"
                        :style="{ background: form.cor_fundo || '#ffffff' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </q-card>
            </div>
          </div>

          <div class="row items-center q-col-gutter-sm">
            <div class="col-auto">
              <q-btn type="submit" color="primary" :loading="saving" label="Salvar" />
            </div>
            <div class="col-auto">
              <q-btn flat color="grey-7" label="Resetar" @click="resetar" />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <q-banner v-if="erro" class="q-mt-md bg-red-1 text-red-9">
      {{ erro }}
    </q-banner>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth-store'
import { empresaConfigService } from 'src/services'
import { supabase } from 'src/supabaseClient'

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const erro = ref('')
const logoFile = ref(null)
const snapshot = ref(null)

const form = ref({
  nome_exibicao: '',
  logo_url: '',
  cor_primaria: '',
  cor_secundaria: '',
  cor_accent: '',
  cor_fundo: '',
})

const temas = [
  {
    nome: 'Amarelo',
    cor_primaria: '#f9bf10',
    cor_secundaria: '#e9e6da',
    cor_accent: '#dcd8c9',
    cor_fundo: '#f8f8f5',
  },
  {
    nome: 'Azul',
    cor_primaria: '#1e88e5',
    cor_secundaria: '#e3f2fd',
    cor_accent: '#bbdefb',
    cor_fundo: '#f5f9ff',
  },
  {
    nome: 'Verde',
    cor_primaria: '#2e7d32',
    cor_secundaria: '#e8f5e9',
    cor_accent: '#c8e6c9',
    cor_fundo: '#f6fbf6',
  },
  {
    nome: 'Vermelho',
    cor_primaria: '#d32f2f',
    cor_secundaria: '#ffebee',
    cor_accent: '#ffcdd2',
    cor_fundo: '#fff5f5',
  },
  {
    nome: 'Roxo',
    cor_primaria: '#6a1b9a',
    cor_secundaria: '#f3e5f5',
    cor_accent: '#e1bee7',
    cor_fundo: '#faf5ff',
  },
]

function hydrateForm(config) {
  form.value = {
    nome_exibicao: config?.nome_exibicao || '',
    logo_url: config?.logo_url || '',
    cor_primaria: config?.cor_primaria || '',
    cor_secundaria: config?.cor_secundaria || '',
    cor_accent: config?.cor_accent || '',
    cor_fundo: config?.cor_fundo || '',
  }
}

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const data = await empresaConfigService.fetchEmpresaConfig()
    snapshot.value = data
    hydrateForm(data)
    authStore.previewEmpresaConfig(data || {})
  } catch (error) {
    erro.value = error?.message || 'Falha ao carregar configuracoes.'
  } finally {
    loading.value = false
  }
}

function normalizePayload() {
  const payload = {
    nome_exibicao: form.value.nome_exibicao.trim() || null,
    logo_url: form.value.logo_url.trim() || null,
    cor_primaria: form.value.cor_primaria || null,
    cor_secundaria: form.value.cor_secundaria || null,
    cor_accent: form.value.cor_accent || null,
    cor_fundo: form.value.cor_fundo || null,
  }
  return payload
}

function aplicarTema(tema) {
  form.value.cor_primaria = tema.cor_primaria
  form.value.cor_secundaria = tema.cor_secundaria
  form.value.cor_accent = tema.cor_accent
  form.value.cor_fundo = tema.cor_fundo
  authStore.previewEmpresaConfig({ ...form.value })
}

async function uploadLogo() {
  if (!logoFile.value || !authStore.empresaId) return
  const file = logoFile.value
  const maxSize = 512 * 1024
  if (file.size > maxSize) {
    Notify.create({ type: 'negative', message: 'Logo muito grande. Maximo 512 KB.' })
    logoFile.value = null
    return
  }

  const nameParts = file.name.split('.')
  const ext = nameParts.length > 1 ? nameParts.pop() : 'png'
  const path = `${authStore.empresaId}/logo.${ext}`
  try {
    const { error: uploadError } = await supabase.storage
      .from('empresa-logos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('empresa-logos').getPublicUrl(path)
    const baseUrl = data?.publicUrl || ''
    form.value.logo_url = baseUrl ? `${baseUrl}?v=${Date.now()}` : ''
    authStore.previewEmpresaConfig({ ...form.value })
    Notify.create({ type: 'positive', message: 'Logo enviada.' })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error?.message || 'Falha ao enviar logo.',
    })
  }
}

function removerLogo() {
  form.value.logo_url = ''
  authStore.previewEmpresaConfig({ ...form.value })
}

function resetar() {
  hydrateForm(snapshot.value)
  authStore.previewEmpresaConfig(snapshot.value || {})
  logoFile.value = null
}

async function salvar() {
  saving.value = true
  erro.value = ''
  try {
    const payload = normalizePayload()
    const atualizado = await empresaConfigService.updateEmpresaConfig(authStore.empresaId, payload)
    snapshot.value = atualizado
    hydrateForm(atualizado)
    await authStore.fetchEmpresaConfig()
    Notify.create({ type: 'positive', message: 'Configuracoes salvas.' })
  } catch (error) {
    erro.value = error?.message || 'Falha ao salvar configuracoes.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (authStore.empresaConfig) {
    hydrateForm(authStore.empresaConfig)
    snapshot.value = authStore.empresaConfig
    authStore.previewEmpresaConfig(authStore.empresaConfig)
  } else {
    carregar()
  }
})
</script>

<style lang="scss">
.config-page {
  min-height: 100%;
}

.logo-card {
  border-radius: 16px;
  background: #fafafa;
}

.logo-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdcdc;
  border-radius: 12px;
  min-height: 64px;
  padding: 8px;
  background: #fff;
}

.palette-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 8px 12px;
  background: #fff;
  cursor: pointer;
  min-width: 120px;
}

.palette-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.palette-swatches {
  display: flex;
  gap: 6px;
}

.swatch {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.color-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-preview {
  width: 44px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}
</style>
