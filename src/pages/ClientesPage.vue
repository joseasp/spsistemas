<template>
  <q-page class="app-page clientes-page">
    <div class="app-page__bg clientes-page__bg" />

    <div class="app-page__wrapper clientes-page__wrapper">
      <div class="clientes-page__top">
        <div class="clientes-page__title">Clientes</div>
        <q-btn
          label="Adicionar novo cliente"
          color="primary"
          text-color="white"
          unelevated
          icon="add"
          @click="abrirModalDeNovoCliente"
          class="clientes-page__add-btn"
        />
      </div>

      <section class="painel clientes-filters-panel">
        <div class="row q-col-gutter-md clientes-filters-panel__row">
          <div class="col-12 col-md-8">
            <q-input outlined dense class="input-uppercase" v-model="termoBusca" placeholder="Buscar por nome, contato ou observação" clearable>
              <template v-slot:prepend> <q-icon name="search" /> </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4 text-md-right">
            <q-toggle v-model="mostrarInativos" label="Mostrar inativos" color="primary" keep-color />
          </div>
        </div>
      </section>

      <section class="painel clientes-list-panel">
        <div class="clientes-grid-wrapper">
          <div v-if="isLoading" class="clientes-grid clientes-grid--skeleton">
            <div v-for="n in 8" :key="n" class="clientes-grid__item">
              <q-card flat bordered class="clientes-skeleton-card">
                <q-card-section>
                  <q-skeleton type="rect" width="60%" height="20px" class="q-mb-sm" />
                  <q-skeleton type="text" width="40%" />
                  <q-skeleton type="text" width="70%" />
                </q-card-section>
              </q-card>
            </div>
          </div>

          <transition-group v-else name="clientes-grid" tag="div" class="clientes-grid">
            <div
              v-for="cliente in clientesFiltrados"
              :key="cliente.id"
              class="clientes-grid__item"
            >
              <ClienteCard
                :cliente="cliente"
                :is-loading="clienteEstaEmProcesso(cliente.id)"
                @view="abrirDetalhes"
              />
            </div>
          </transition-group>

          <div v-if="!isLoading && !clientesFiltrados.length" class="clientes-empty text-center">
            <q-icon name="sentiment_dissatisfied" size="56px" color="grey-5" class="q-mb-sm" />
            <div class="text-subtitle1 text-grey-7">Nenhum cliente encontrado</div>
            <div class="text-grey-6">
              Ajuste os filtros ou cadastre um novo cliente.
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modais -->
    <q-dialog v-model="showModal" persistent>
      <q-card style="width: 720px; max-width: 92vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">{{ modoEdicao ? 'Editar cliente' : 'Adicionar novo cliente' }}</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form ref="formRef" @submit.prevent="handleSubmit">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  outlined
                  class="input-uppercase"
                  v-model="clienteEmEdicao.nome"
                  label="Nome do cliente *"
                  :rules="[(val) => !!val && val.trim().length > 0 || 'Informe um nome']"
                  maxlength="40"
                  counter
                  autocapitalize="characters"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  outlined
                  class="input-uppercase"
                  v-model="clienteEmEdicao.contato"
                  label="Contato (telefone, WhatsApp, etc.)"
                  maxlength="60"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  outlined
                  v-model="clienteEmEdicao.tipo"
                  :options="tipoClienteOptions"
                  label="Tipo de cliente *"
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Selecione um tipo']"
                />
              </div>
              <div class="col-12">
                <q-input
                  outlined
                  type="textarea"
                  class="input-uppercase"
                  v-model="clienteEmEdicao.observacoes"
                  label="Observacoes"
                  autogrow
                  maxlength="300"
                />
              </div>
              <div class="col-12">
                <q-toggle
                  v-model="clienteEmEdicao.ativo"
                  label="Cliente ativo"
                  color="primary"
                  keep-color
                />
              </div>
            </div>
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn label="Cancelar" color="grey-8" flat v-close-popup />
          <q-btn
            :label="modoEdicao ? 'Salvar alteracoes' : 'Salvar cliente'"
            color="primary"
            unelevated
            @click="handleSubmit"
            :loading="isSaving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDetalhes">
      <q-card class="cliente-detalhes" style="width: 780px; max-width: 95vw">
        <q-card-section class="row items-start justify-between q-gutter-sm">
          <div>
            <div class="text-h6 text-uppercase text-weight-bold cliente-detalhes__nome">{{ clienteSelecionado ? clienteSelecionado.nome : '' }}</div>
            <div class="text-caption text-grey-7">{{ detalheTipoLabel }}</div>
          </div>
          <div class="row items-center q-gutter-sm">
            <q-toggle
              v-if="clienteSelecionado"
              color="primary"
              keep-color
              dense
              :loading="clienteSelecionado && clienteEstaEmProcesso(clienteSelecionado.id)"
              :model-value="clienteSelecionado ? clienteSelecionado.ativo : false"
              @update:model-value="(status) => clienteSelecionado && atualizarStatus(clienteSelecionado.id, status)"
            />
            <q-btn icon="close" flat round dense v-close-popup />
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-sm-6">
              <div class="cliente-detalhes__label">Contato</div>
              <div class="cliente-detalhes__value">
                {{ clienteSelecionado && clienteSelecionado.contato ? clienteSelecionado.contato : 'Nao informado' }}
              </div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="cliente-detalhes__label">Tipo</div>
              <div class="cliente-detalhes__value">{{ detalheTipoLabel }}</div>
            </div>
            <div class="col-12">
              <div class="cliente-detalhes__label">Observacoes</div>
              <div class="cliente-detalhes__value cliente-detalhes__value--multiline">
                {{ clienteSelecionado && clienteSelecionado.observacoes ? clienteSelecionado.observacoes : 'Nenhuma observacao registrada.' }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator v-if="isEmpresaSelecionada" />

        <q-card-section v-if="isEmpresaSelecionada" class="cliente-detalhes__funcionarios">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle2 text-weight-bold">Funcionarios cadastrados</div>
            <q-btn
              dense
              flat
              icon="refresh"
              label="Atualizar lista"
              :loading="funcionariosLoading"
              @click="clienteSelecionado && carregarFuncionarios(clienteSelecionado.id)"
            />
          </div>

          <q-banner v-if="funcionariosErro" dense class="bg-red-1 text-negative q-mb-md">
            {{ funcionariosErro }}
          </q-banner>

          <div v-if="funcionariosLoading" class="row justify-center q-my-lg">
            <q-spinner color="primary" size="36px" />
          </div>

          <div v-else>
            <q-list v-if="funcionariosDoCliente.length" bordered separator class="cliente-detalhes__lista">
              <q-item v-for="funcionario in funcionariosDoCliente" :key="funcionario.id">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ funcionario.nome }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    dense
                    round
                    color="negative"
                    icon="delete"
                    :loading="funcionarioEmRemocao(funcionario.id)"
                    @click="removerFuncionario(funcionario)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="text-grey-6 text-caption q-mb-md">
              Nenhum funcionario cadastrado para esta empresa ainda.
            </div>

            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-12 col-sm-8">
                <q-input
                  outlined
                  dense
                  v-model="novoFuncionario"
                  placeholder="Novo funcionario"
                  maxlength="60"
                  :disable="adicionandoFuncionario"
                  @keyup.enter="adicionarFuncionario"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-btn
                  label="Adicionar"
                  color="primary"
                  unelevated
                  class="full-width"
                  :loading="adicionandoFuncionario"
                  @click="adicionarFuncionario"
                />
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="q-pa-md">
          <div class="row q-gutter-sm">
            <q-btn
              flat
              color="dark"
              icon="edit"
              label="Editar"
              :disable="!clienteSelecionado"
              @click="abrirEdicaoDoDetalhe"
            />
            <q-btn
              flat
              color="negative"
              icon="delete"
              label="Excluir"
              :disable="!clienteSelecionado"
              @click="clienteSelecionado && handleDelete(clienteSelecionado)"
            />
          </div>
          <q-btn flat color="primary" label="Fechar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import ClienteCard from 'src/components/ClienteCard.vue'
import { useClientes } from 'src/composables/useClientes'
import { useMainStore } from 'src/stores/main-store'

const $q = useQuasar()
const store = useMainStore()

const {
  clientes,
  isLoading,
  funcionariosPorCliente,
  adicionarNovoCliente,
  atualizarCliente,
  deletarCliente,
  atualizarStatusCliente,
  buscarFuncionariosPorCliente,
  adicionarFuncionarioParaCliente,
  removerFuncionarioDeCliente
} = useClientes()

const formRef = ref(null)
const showModal = ref(false)
const modoEdicao = ref(false)
const clienteEmEdicao = ref(criarClienteBase())
const isSaving = ref(false)

const loadingClientes = ref(new Set())

const termoBusca = ref('')
const mostrarInativos = ref(false)

const showDetalhes = ref(false)
const clienteSelecionado = ref(null)
const funcionariosLoading = ref(false)
const funcionariosErro = ref('')
const novoFuncionario = ref('')
const adicionandoFuncionario = ref(false)
const funcionariosRemovendo = ref(new Set())

const tipoClienteOptions = [
  { label: 'Credito', value: 'CREDITO' },
  { label: 'Empresa', value: 'EMPRESA' }
]

function criarClienteBase() {
  return {
    nome: '',
    contato: '',
    tipo: 'CREDITO',
    observacoes: '',
    ativo: true
  }
}

function normalizarTipo(tipo) {
  const upper = (tipo || '').toUpperCase()
  const sanitized = upper.replace('\u00C9', 'E')
  if (sanitized.includes('EMPRESA')) {
    return 'EMPRESA'
  }
  if (sanitized.includes('CREDITO')) {
    return 'CREDITO'
  }
  return 'CREDITO'
}

function marcarClienteProcessando(id) {
  if (!id) return
  const proximo = new Set(loadingClientes.value)
  proximo.add(id)
  loadingClientes.value = proximo
}

function removerClienteProcessando(id) {
  if (!id) return
  const proximo = new Set(loadingClientes.value)
  proximo.delete(id)
  loadingClientes.value = proximo
}

function clienteEstaEmProcesso(id) {
  return loadingClientes.value.has(id)
}

function marcarFuncionarioRemocao(id) {
  const proximo = new Set(funcionariosRemovendo.value)
  proximo.add(id)
  funcionariosRemovendo.value = proximo
}

function removerFuncionarioRemocao(id) {
  const proximo = new Set(funcionariosRemovendo.value)
  proximo.delete(id)
  funcionariosRemovendo.value = proximo
}

function funcionarioEmRemocao(id) {
  return funcionariosRemovendo.value.has(id)
}

function abrirModalDeNovoCliente() {
  modoEdicao.value = false
  clienteEmEdicao.value = criarClienteBase()
  showModal.value = true
}

function handleEdit(cliente) {
  modoEdicao.value = true
  clienteEmEdicao.value = {
    ...cliente,
    tipo: normalizarTipo(cliente.tipo)
  }
  showModal.value = true
}

function abrirDetalhes(cliente) {
  clienteSelecionado.value = { ...cliente }
  showDetalhes.value = true
  if (normalizarTipo(cliente.tipo) === 'EMPRESA') {
    carregarFuncionarios(cliente.id)
  }
}

async function carregarFuncionarios(clienteId) {
  if (!clienteId) return
  funcionariosErro.value = ''
  funcionariosLoading.value = true
  try {
    await buscarFuncionariosPorCliente(clienteId)
  } catch (error) {
    console.error('Falha ao buscar funcionarios:', error)
    funcionariosErro.value = 'Nao foi possivel carregar os funcionarios agora.'
  } finally {
    funcionariosLoading.value = false
  }
}

async function adicionarFuncionario() {
  if (!clienteSelecionado.value) return
  const nomeLimpo = novoFuncionario.value.trim()
  if (!nomeLimpo) {
    $q.notify({ type: 'warning', message: 'Informe o nome do funcionario.' })
    return
  }
  adicionandoFuncionario.value = true
  try {
    await adicionarFuncionarioParaCliente(clienteSelecionado.value.id, nomeLimpo)
    novoFuncionario.value = ''
    $q.notify({ type: 'positive', message: 'Funcionario adicionado.' })
  } catch (error) {
    console.error('Falha ao adicionar funcionario:', error)
    $q.notify({ type: 'negative', message: 'Nao foi possivel adicionar o funcionario.' })
  } finally {
    adicionandoFuncionario.value = false
  }
}

async function removerFuncionario(funcionario) {
  if (!clienteSelecionado.value) return
  marcarFuncionarioRemocao(funcionario.id)
  try {
    await removerFuncionarioDeCliente(clienteSelecionado.value.id, funcionario.id)
    $q.notify({ type: 'positive', message: 'Funcionario removido.' })
  } catch (error) {
    console.error('Falha ao remover funcionario:', error)
    $q.notify({ type: 'negative', message: 'Nao foi possivel remover o funcionario.' })
  } finally {
    removerFuncionarioRemocao(funcionario.id)
  }
}

function abrirEdicaoDoDetalhe() {
  if (!clienteSelecionado.value) return
  const cliente = { ...clienteSelecionado.value }
  showDetalhes.value = false
  handleEdit(cliente)
}

async function handleDelete(cliente) {
  $q.dialog({
    title: 'Confirmar exclusao',
    message: `Deseja realmente excluir o cliente "${cliente.nome}"?`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Excluir', color: 'negative', unelevated: true }
  }).onOk(async () => {
    try {
      marcarClienteProcessando(cliente.id)
      await deletarCliente(cliente.id)
      $q.notify({ type: 'positive', message: 'Cliente excluido com sucesso!' })
    } catch (error) {
      console.error('Falha ao excluir cliente:', error)
      if (error.code === '23503') {
        $q.notify({
          type: 'negative',
          message: 'Este cliente possui lancamentos vinculados e nao pode ser removido.',
          timeout: 5000
        })
      } else {
        $q.notify({ type: 'negative', message: 'Nao foi possivel excluir o cliente.' })
      }
    } finally {
      removerClienteProcessando(cliente.id)
    }
  })
}

async function handleSubmit() {
  const formularioValido = await formRef.value.validate()
  if (!formularioValido) return

  const payload = {
    ...clienteEmEdicao.value,
    nome: clienteEmEdicao.value.nome.trim(),
    contato: clienteEmEdicao.value.contato ? clienteEmEdicao.value.contato.trim() : null,
    observacoes: clienteEmEdicao.value.observacoes ? clienteEmEdicao.value.observacoes.trim() : '',
    tipo: normalizarTipo(clienteEmEdicao.value.tipo)
  }

  if (!payload.nome) {
    $q.notify({ type: 'warning', message: 'O nome do cliente e obrigatorio.' })
    return
  }

  try {
    isSaving.value = true
    if (modoEdicao.value) {
      await atualizarCliente(payload)
      $q.notify({ type: 'positive', message: 'Cliente atualizado com sucesso.' })
    } else {
      await adicionarNovoCliente(payload)
      $q.notify({ type: 'positive', message: 'Cliente cadastrado com sucesso.' })
    }
    showModal.value = false
  } catch (error) {
    console.error('Falha ao salvar cliente:', error)
    if (error.code === '23505') {
      $q.notify({ type: 'negative', message: 'Ja existe um cliente com este nome.' })
    } else {
      $q.notify({ type: 'negative', message: 'Nao foi possivel salvar o cliente.' })
    }
  } finally {
    isSaving.value = false
  }
}

async function atualizarStatus(clienteId, novoStatus) {
  try {
    marcarClienteProcessando(clienteId)
    await atualizarStatusCliente(clienteId, novoStatus)
    $q.notify({ type: 'positive', message: 'Status atualizado.' })
  } catch (error) {
    console.error('Falha ao atualizar status:', error)
    $q.notify({ type: 'negative', message: 'Nao foi possivel atualizar o status.' })
  } finally {
    removerClienteProcessando(clienteId)
  }
}

const clientesFiltrados = computed(() => {
  let lista = [...clientes.value]
  if (!mostrarInativos.value) {
    lista = lista.filter((cliente) => cliente.ativo)
  }
  if (termoBusca.value) {
    const termo = termoBusca.value.trim().toLowerCase()
    lista = lista.filter((cliente) => {
      return [cliente.nome, cliente.contato, cliente.observacoes]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo))
    })
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const funcionariosDoCliente = computed(() => {
  const clienteId = clienteSelecionado.value ? clienteSelecionado.value.id : null
  if (!clienteId) return []
  return funcionariosPorCliente.value[clienteId] || []
})

const detalheTipoLabel = computed(() => {
  if (!clienteSelecionado.value) return ''
  return normalizarTipo(clienteSelecionado.value.tipo) === 'EMPRESA' ? 'Cliente Empresa' : 'Cliente Credito'
})

const isEmpresaSelecionada = computed(() => {
  if (!clienteSelecionado.value) return false
  return normalizarTipo(clienteSelecionado.value.tipo) === 'EMPRESA'
})

watch(clientes, (lista) => {
  if (!clienteSelecionado.value) return
  const atualizado = lista.find((item) => item.id === clienteSelecionado.value.id)
  if (atualizado) {
    clienteSelecionado.value = { ...atualizado }
  }
})

watch(showModal, (aberto) => {
  if (!aberto) {
    clienteEmEdicao.value = criarClienteBase()
    formRef.value?.resetValidation()
  }
})

watch(showDetalhes, (aberto) => {
  if (!aberto) {
    clienteSelecionado.value = null
    novoFuncionario.value = ''
    funcionariosErro.value = ''
    funcionariosLoading.value = false
    adicionandoFuncionario.value = false
    funcionariosRemovendo.value = new Set()
  }
})

onMounted(() => {
  if (store.clientes.length === 0) {
    store.buscarClientes()
  }
})
</script>

<style scoped>
.clientes-page__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.clientes-page__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--brand-text-strong);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.clientes-page__add-btn {
  border-radius: 14px;
  font-weight: 600;
  padding: 10px 18px;
}

.clientes-filters-panel {
  margin-bottom: 20px;
}

.clientes-filters-panel__row {
  align-items: center;
}

.clientes-filters-panel .q-field__control {
  border-radius: 14px;
}

.clientes-list-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.clientes-grid-wrapper {
  min-height: 220px;
}

.clientes-grid,
.clientes-grid--skeleton {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.clientes-grid--skeleton {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.clientes-grid__item {
  display: flex;
}

.clientes-grid__item > * {
  width: 100%;
}

.clientes-skeleton-card {
  border-radius: 16px;
  min-height: 130px;
}

.clientes-empty {
  padding: 48px 0;
}

@media (max-width: 599px) {
  .clientes-page__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .clientes-page__add-btn {
    width: 100%;
    justify-content: center;
  }
}

.cliente-detalhes__nome {
  letter-spacing: 0.08em;
}
.cliente-detalhes__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-text-muted);
  margin-bottom: 4px;
}
.cliente-detalhes__value {
  font-size: 1rem;
  font-weight: 500;
  color: var(--brand-text-strong);
}
.cliente-detalhes__value--multiline {
  white-space: pre-line;
}
.cliente-detalhes__funcionarios {
  background: color-mix(in srgb, var(--brand-secondary) 50%, transparent);
}
.cliente-detalhes__lista {
  border-radius: 12px;
  margin-bottom: 12px;
}
</style>
