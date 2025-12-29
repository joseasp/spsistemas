<template>
  <q-page class="app-page produtos-page">
    <div class="app-page__bg produtos-page__bg" />

    <div class="app-page__wrapper produtos-page__wrapper">
      <div class="produtos-page__top">
        <div class="produtos-page__title">Produtos</div>
        <q-btn
          label="Adicionar Novo Produto"
          color="warning"
          text-color="dark"
          unelevated
          icon="add"
          @click="abrirModalDeNovoProduto"
          class="produtos-page__add-btn"
        />
      </div>

      <section class="painel produtos-filters-panel">
        <div class="row q-col-gutter-md produtos-filters-panel__row">
          <div class="col-12 col-md-4">
            <q-input outlined dense v-model="termoBusca" placeholder="Buscar produtos...">
              <template v-slot:prepend> <q-icon name="search" /> </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-select
              outlined
              dense
              v-model="filtroCategoria"
              :options="categoriasUnicas"
              label="Filtrar por Categoria"
              clearable
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              outlined
              dense
              v-model="modoExibicao"
              :options="[
                'Agrupado por Categoria',
                'Ordem Alfabética (A-Z)',
                'Preço (Maior para Menor)',
              ]"
              label="Visualizar como"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-toggle v-model="mostrarInativos" label="Mostrar Inativos" color="warning" keep-color />
          </div>
        </div>
      </section>

      <section class="painel produtos-list-panel">
        <div class="relative-position">
          <div v-if="isLoading">
            <q-card flat bordered class="q-mb-md">
              <q-list separator>
                <q-item v-for="n in 5" :key="n" class="q-pa-md">
                  <q-item-section>
                    <q-skeleton type="text" width="60%" />
                    <q-skeleton type="text" width="30%" />
                  </q-item-section>
                  <q-item-section side>
                    <div class="row items-center q-gutter-sm">
                      <q-skeleton type="QToggle" />
                      <q-skeleton type="QBtn" />
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </div>

          <div v-if="!isLoading">
            <div v-if="Object.keys(produtosProcessados).length > 0">
              <div
                v-for="(produtosDoGrupo, categoria) in produtosProcessados"
                :key="categoria"
                class="produtos-list-panel__group"
              >
                <div class="produtos-list-panel__group-header">
                  <div class="produtos-list-panel__group-title">{{ categoria }}</div>
                  <q-chip dense color="blue-grey-1" text-color="blue-grey-8">
                    {{ produtosDoGrupo.length }} {{ produtosDoGrupo.length > 1 ? 'itens' : 'item' }}
                  </q-chip>
                </div>
                <q-card flat bordered>
                  <q-list separator>
                    <transition-group appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                      <ProdutosCard
                        v-for="produto in produtosDoGrupo"
                        :key="produto.id"
                        :produto="produto"
                        @edit="handleEdit"
                        @delete="handleDelete"
                        @toggle-status="(payload) => atualizarStatus(payload.id, payload.status)"
                        :isProductLoading="isProductLoading"
                      />
                    </transition-group>
                  </q-list>
                </q-card>
              </div>
            </div>

            <div v-else class="produtos-empty text-center q-my-xl">
              <q-icon name="sentiment_dissatisfied" size="4em" color="grey-5" />
              <div class="text-h6 text-grey-7">Nenhum produto encontrado</div>
              <p class="text-grey-6">Tente ajustar os filtros ou adicione um novo produto.</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modais -->
    <q-dialog v-model="showModal">
      <q-card style="width: 700px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">{{ modoEdicao ? 'Editar Produto' : 'Adicionar Novo Produto' }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form @submit.prevent="handleSubmit" ref="formRef">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  outlined
                  v-model="produtoEmEdicao.nome"
                  label="Nome do Produto *"
                  :rules="[(val) => !!val || 'Campo obrigatório']"
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-input
                  outlined
                  type="number"
                  step="0.01"
                  v-model.number="produtoEmEdicao.preco"
                  label="Preço *"
                  :rules="[(val) => val > 0 || 'O preço deve ser maior que zero']"
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-select
                  outlined
                  v-model="produtoEmEdicao.categoria"
                  :options="opcoesDeCategoria"
                  label="Categoria"
                  use-input
                  @new-value="criarNovaCategoria"
                  clearable
                />
              </div>
            </div>
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn label="Cancelar" color="grey-8" flat v-close-popup />
          <q-btn
            :label="modoEdicao ? 'Salvar Alterações' : 'Salvar Produto'"
            color="warning"
            unelevated
            @click="handleSubmit"
            :loading="isSaving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- BARRA DE FERRAMENTAS (FILTROS) -->
    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input outlined dense v-model="termoBusca" placeholder="Buscar produtos..." style="border-radius: 0.5rem;">
            <template v-slot:prepend> <q-icon name="search" /> </template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select
            outlined
            dense
            v-model="filtroCategoria"
            :options="categoriasUnicas"
            label="Filtrar por Categoria"
            clearable
            style="border-radius: 0.5rem;"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            outlined
            dense
            v-model="modoExibicao"
            :options="[
              'Agrupado por Categoria',
              'Ordem Alfabética (A-Z)',
              'Preço (Maior para Menor)',
            ]"
            label="Visualizar como"
            style="border-radius: 0.5rem;"
          />
        </div>
        <div class="col-12 col-md-2">
          <q-toggle v-model="mostrarInativos" label="Mostrar Inativos" />
        </div>
      </div>
    </q-card>

    <!-- LISTA DE PRODUTOS -->
    <div class="relative-position">
      <!-- No lugar do seu q-inner-loading inicial -->
      <div v-if="isLoading">
        <q-card flat bordered class="q-mb-md">
          <q-list separator>
            <q-item v-for="n in 5" :key="n" class="q-pa-md">
              <q-item-section>
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="30%" />
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <q-skeleton type="QToggle" />
                  <q-skeleton type="QBtn" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div v-if="!isLoading">
        <div v-if="Object.keys(produtosProcessados).length > 0">
          <div
            v-for="(produtosDoGrupo, categoria) in produtosProcessados"
            :key="categoria"
            class="q-mb-lg"
          >
            <div class="row items-center q-mb-sm">
              <div
              class="text-subtitle2 text-weight-bold text-uppercase"
              style="letter-spacing: 0.05em; color: rgba(59, 55, 42, 0.6);"
            >
              {{ categoria }}
            </div>
              <q-chip dense class="q-ml-md" color="blue-grey-1" text-color="blue-grey-8">
                {{ produtosDoGrupo.length }} {{ produtosDoGrupo.length > 1 ? 'itens' : 'item' }}
              </q-chip>
            </div>
            <q-card flat bordered>
              <q-list separator>
                <transition-group appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                  <ProdutosCard
                    v-for="produto in produtosDoGrupo"
                    :key="produto.id"
                    :produto="produto"
                    @edit="handleEdit"
                    @delete="handleDelete"
                    @toggle-status="(payload) => atualizarStatus(payload.id, payload.status)"
                    :isProductLoading="isProductLoading"
                  />
                </transition-group>
              </q-list>
            </q-card>
          </div>
        </div>

        <!-- ESTADO VAZIO -->
        <div v-else class="text-center q-mt-xl">
          <q-icon name="sentiment_dissatisfied" size="4em" color="grey-5" />
          <div class="text-h6 text-grey-7">Nenhum produto encontrado</div>
          <p class="text-grey-6">Tente ajustar os filtros ou adicione um novo produto.</p>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useProdutos } from 'src/composables/useProdutos'
import ProdutosCard from 'src/components/ProdutoCard.vue'
import { useMainStore } from 'src/stores/main-store'

const $q = useQuasar()
const store = useMainStore()

// --- LÓGICA DO COMPONENTE ---
const {
  produtos,
  isLoading,
  adicionarNovoProduto,
  atualizarStatusProduto,
  atualizarProduto,
  categoriasUnicas,
  removerProduto
} = useProdutos()

const formRef = ref(null)

// --- Estado do Modal ---
const showModal = ref(false)
const modoEdicao = ref(false)
const produtoEmEdicao = ref({ nome: '', preco: null, categoria: null, ativo: true })
const isSaving = ref(false)
const loadingItems = ref(new Set())

// --- Estado dos Filtros ---
const termoBusca = ref('')
const filtroCategoria = ref(null)
const modoExibicao = ref('Agrupado por Categoria')
const mostrarInativos = ref(false)

// --- Lógica de Categorias Dinâmicas ---
const opcoesDeCategoria = ref([])
watch(categoriasUnicas, (novasCategorias) => {
  opcoesDeCategoria.value = [...new Set(novasCategorias)]
}, { immediate: true })

function criarNovaCategoria (inputValue, doneFn) {
  const valorNormalizado = inputValue.trim()
  if (valorNormalizado && !opcoesDeCategoria.value.includes(valorNormalizado)) {
    opcoesDeCategoria.value.push(valorNormalizado)
  }
  doneFn(valorNormalizado, 'add-unique')
}

// --- Funções do Modal ---
function abrirModalDeNovoProduto() {
  modoEdicao.value = false
  produtoEmEdicao.value = { nome: '', preco: null, categoria: null, ativo: true }
  showModal.value = true
}

function handleEdit(produto) {
  modoEdicao.value = true
  produtoEmEdicao.value = { ...produto }
  showModal.value = true
}

async function handleDelete(produto) {
  $q.dialog({
    title: 'Confirmar Exclusão',
    message: `Você tem certeza que deseja excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`,
    cancel: {
      label: 'Cancelar',
      flat: true
    },
    ok: {
      label: 'Excluir',
      color: 'negative',
      unelevated: true
    },
    persistent: true
  }).onOk(async () => {
    loadingItems.value.add(produto.id) // Add to loading
    try {
      await removerProduto(produto.id)
      $q.notify({ color: 'positive', message: 'Produto removido com sucesso!', icon: 'check' })
    } catch (error) {
      console.error('Falha ao remover o produto:', error)
      $q.notify({ color: 'negative', message: 'Falha ao remover o produto.' })
    } finally {
      loadingItems.value.delete(produto.id) // Remove from loading
    }
  })
}

// --- Ações Principais ---
async function handleSubmit() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  // 1. Log do início da operação e dos dados
  console.log(`[handleSubmit] Iniciando. Modo: ${modoEdicao.value ? 'Edição' : 'Criação'}`)
  console.log('[handleSubmit] Dados do produto:', JSON.parse(JSON.stringify(produtoEmEdicao.value))) // JSON.parse(JSON.stringify(...)) é um truque para ver o valor puro do objeto ref, sem o proxy do Vue

  try {
    isSaving.value = true
    if (modoEdicao.value) {
      await atualizarProduto(produtoEmEdicao.value)
      // 2. Log de sucesso
      console.log('[handleSubmit] Sucesso ao atualizar o produto ID:', produtoEmEdicao.value.id)
      $q.notify({ color: 'positive', message: 'Produto atualizado!', icon: 'check' })
    } else {
      await adicionarNovoProduto(produtoEmEdicao.value) // Corrected typo here
      // 2. Log de sucesso
      console.log('[handleSubmit] Sucesso ao criar novo produto.')
      $q.notify({ color: 'positive', message: 'Produto salvo!', icon: 'check' })
    }
    showModal.value = false
  } catch (error) {
    console.error('[handleSubmit] Falha ao salvar produto.', error)

    // ✅ AQUI ESTÁ A NOVA LÓGICA
    if (error.code === '23505') {
      // Se o erro for de violação de unicidade
      $q.notify({
        color: 'negative',
        message: 'Erro: Já existe um produto com este nome.',
        icon: 'error_outline'
      })
    } else {
      // Para todos os outros tipos de erro (internet, etc.)
      $q.notify({
        color: 'negative',
        message: 'Falha ao salvar o produto. Tente novamente.',
        icon: 'report_problem'
      })
    }

  } finally {
    isSaving.value = false
  }
}

async function atualizarStatus(produtoId, novoStatus) {
  try {
    loadingItems.value.add(produtoId) // Add to loading
    await atualizarStatusProduto(produtoId, novoStatus)
    $q.notify({ color: 'positive', message: 'Status atualizado.', icon: 'check' })
  } catch (error) {
    console.error('Falha ao atualizar status:', error)
    $q.notify({ color: 'negative', message: 'Falha ao atualizar o status.' })
  } finally {
    loadingItems.value.delete(produtoId) // Remove from loading
  }
}

// --- Lógica de Exibição ---
const produtosProcessados = computed(() => {
  let produtosFiltrados = [...produtos.value];
  if (!mostrarInativos.value) {
    produtosFiltrados = produtosFiltrados.filter(p => p.ativo === true);
  }
  if (termoBusca.value) {
    produtosFiltrados = produtosFiltrados.filter(p => p.nome.toLowerCase().includes(termoBusca.value.toLowerCase()));
  }
  if (filtroCategoria.value) {
    produtosFiltrados = produtosFiltrados.filter(p => p.categoria === filtroCategoria.value);
  }
  if (modoExibicao.value === 'Agrupado por Categoria') {
    produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
    return produtosFiltrados.reduce((acc, produto) => {
      const categoria = produto.categoria || 'Sem Categoria';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(produto);
      return acc;
    }, {});
  } else {
    switch (modoExibicao.value) {
      case 'Preço (Maior para Menor)':
        produtosFiltrados.sort((a, b) => b.preco - a.preco);
        break;
      case 'Preço (Menor para Maior)':
        produtosFiltrados.sort((a, b) => a.preco - b.preco);
        break;
      default: // Ordem Alfabética (A-Z)
        produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
    }
    return { 'Todos os Produtos': produtosFiltrados };
  }
});

const isProductLoading = computed(() => (id) => loadingItems.value.has(id))

onMounted(() => {
  if (store.produtos.length === 0) {
    store.buscarProdutosIniciais()
  }
})
</script>

<style scoped>
.produtos-page__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.produtos-page__title {
  font-size: 28px;
  font-weight: 700;
  color: #3b372a;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.produtos-page__add-btn {
  border-radius: 14px;
  font-weight: 600;
  padding: 10px 18px;
}

.produtos-filters-panel {
  margin-bottom: 20px;
}

.produtos-filters-panel .q-field__control {
  border-radius: 14px;
}

.produtos-list-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.produtos-list-panel__group {
  margin-bottom: 28px;
}

.produtos-list-panel__group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.produtos-list-panel__group-title {
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(59, 55, 42, 0.6);
}

.produtos-empty {
  padding: 48px 0;
}

@media (max-width: 599px) {
  .produtos-page__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .produtos-page__add-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
