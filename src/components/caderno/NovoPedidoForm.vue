<template>
  <q-card :class="['novo-pedido-card', $q.screen.lt.md ? 'novo-pedido-card--mobile' : '']">
    <q-card-section class="novo-pedido__header">
      <div>
        <div class="novo-pedido__title">Novo pedido</div>
        <div class="novo-pedido__subtitle">Cadastre um novo lancamento no caderno.</div>
      </div>
      <div class="novo-pedido__stats">
        <div class="novo-pedido__stat">
          <span>Itens</span>
          <strong>{{ form.itens.length }}</strong>
        </div>
        <div class="novo-pedido__stat">
          <span>Total</span>
          <strong>R$ {{ total.toFixed(2) }}</strong>
        </div>
      </div>
    </q-card-section>

    <q-separator class="novo-pedido__divider" />
    <q-card-section class="novo-pedido__body">

      <div class="novo-pedido__block">

        <div class="novo-pedido__block-title">Cliente</div>

        <!-- Cliente / Avulso -->

        <div class="row items-center q-col-gutter-md">

          <div class="col">

            <q-select

              ref="selCliente"

              v-if="!clienteAvulso"

              filled

              use-input

              fill-input

              hide-selected

              clearable

              :loading="loadingClientes && !clientesFiltrados.length"

              virtual-scroll

              label="Buscar cliente"

              :options="clientesFiltrados"

              option-label="nome"

              option-value="id"

              v-model="form.cliente_id"

              emit-value

              map-options

              input-debounce="0"

              no-option-label=""

              @filter="filterClientes"

              @clear="handleClienteClear"

            />

            <q-input

              v-else

              filled

              v-model="form.nome_cliente_avulso"

              label="Cliente avulso (nome opcional)"

            />

          </div>

          <div class="col-auto">

            <q-toggle v-model="clienteAvulso" label="Cliente avulso" />

          </div>

        </div>

        <!-- Funcionário (quando empresa) -->

        <div class="q-mt-md" v-if="!clienteAvulso && clienteEhEmpresa">

          <q-select

            filled

            use-input

            fill-input

            hide-selected

            input-debounce="0"

            emit-value

            map-options

            new-value-mode="add-unique"

            :options="funcionariosOptions"

            v-model="form.nome_funcionario_empresa"

            label="Funcionário (obrigatório)"

            @filter="filterFuncionarios"

          />

        </div>

      </div>

      <div class="novo-pedido__block novo-pedido__block--produtos">

        <div class="novo-pedido__block-title">Itens do pedido</div>

        <div class="novo-pedido__product-row">

          <div class="row items-center q-col-gutter-md">

            <div class="col">

              <q-select

                ref="selProd"

                filled

                use-input

                fill-input

                hide-selected

                clearable

                :loading="loadingProdutos && !produtosFiltrados.length"

                virtual-scroll

                label="Buscar produto"

                :options="produtosFiltrados"

                option-label="nome"

                option-value="id"

                v-model="produtoSelecionado"

                input-debounce="0"

                no-option-label=""

                @filter="filterProdutos"

                @clear="handleProdutoClear"

                @update:model-value="adicionarProdutoSelecionado"

              />

            </div>

            <div class="col-auto">

              <q-btn flat icon="add" label="Produto avulso" @click="abrirProdutoAvulso = true" />

            </div>

          </div>

        </div>

        <div class="novo-pedido__items">

          <div

            v-for="(it, idx) in form.itens"

            :key="it._uid"

            class="novo-pedido__item"

          >

            <div class="novo-pedido__item-info">

              <div class="novo-pedido__item-name">{{ it.nome_produto_congelado }}</div>

              <div class="novo-pedido__item-price">R$ {{ it.preco_unitario_congelado.toFixed(2) }}</div>

            </div>

            <div class="novo-pedido__item-actions">

              <q-btn dense round icon="remove" class="novo-pedido__item-btn" @click="decrementarItem(idx)" />

              <div class="novo-pedido__item-qty">{{ it.quantidade }}</div>

              <q-btn dense round icon="add" class="novo-pedido__item-btn" @click="it.quantidade++" />

              <q-btn dense flat icon="close" class="novo-pedido__item-remove" @click="removerItem(idx)" />

            </div>

          </div>

          <div v-if="!form.itens.length" class="novo-pedido__items-empty">Nenhum item adicionado ainda.</div>

        </div>

      </div>

      <div class="novo-pedido__block novo-pedido__block--pagamento">

        <div class="novo-pedido__block-title">Pagamento</div>

        <div class="row items-center q-col-gutter-md">

          <div class="col-auto">

            <q-toggle v-model="form.pago" label="Pago" :disable="clienteAvulso" />

          </div>

          <div class="col" v-if="form.pago">
            <q-select
              filled
              :options="formasPagamento"
              emit-value
              map-options
              v-model="form.forma_pagamento"
              label="Forma de pagamento (opcional agora)"
            />
          </div>

        </div>

        <q-banner v-if="clienteAvulso" dense class="bg-grey-2 q-mt-sm novo-pedido__avulso-tip">

          Cliente avulso sempre pago.

        </q-banner>

      </div>

      <div class="novo-pedido__block novo-pedido__block--observacoes">

        <div class="novo-pedido__block-title">Observações</div>

        <q-input

          type="textarea"

          autogrow

          filled

          v-model="form.observacoes"

          label="Anotaes (instrues para preparo)"

        />

      </div>

    </q-card-section>

    <q-separator class="novo-pedido__divider" />
    <q-card-actions class="novo-pedido__footer">
      <div class="novo-pedido__footer-info">
        <span>{{ form.itens.length === 1 ? '1 item' : form.itens.length + ' itens' }}</span>
        <span class="novo-pedido__footer-total">R$ {{ total.toFixed(2) }}</span>
      </div>
      <q-btn
        class="novo-pedido__footer-btn"
        color="primary"
        unelevated
        :disable="!podeSalvar"
        label="Adicionar pedido"
        @click="confirmar"
      />
    </q-card-actions>

    <!-- Produto avulso -->
    <ProdutoAvulsoDialog
      v-model="abrirProdutoAvulso"
      @salvar="adicionarProdutoAvulso"
    />
  </q-card>
</template>

<script setup>

import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { uid } from 'quasar'
import ProdutoAvulsoDialog from './ProdutoAvulsoDialog.vue'

const props = defineProps({
  clientes: { type: Array, default: () => [] },
  produtos: { type: Array, default: () => [] },
  loadingClientes: { type: Boolean, default: false },
  loadingProdutos: { type: Boolean, default: false },
  funcionariosPorCliente: { type: Object, default: () => ({}) },
  buscarFuncionarios: { type: Function, default: null },
  draft: { type: Object, default: null },
})
const emit = defineEmits(['confirm'])

const clientes = computed(() => props.clientes || [])
const produtos = computed(() => props.produtos || [])
const loadingClientes = computed(() => props.loadingClientes)
const loadingProdutos = computed(() => props.loadingProdutos)
const funcionariosPorCliente = computed(() => props.funcionariosPorCliente || {})

const clienteAvulso = ref(false)
const selCliente = ref(null)
const produtoSelecionado = ref(null)
const selProd = ref(null)
const abrirProdutoAvulso = ref(false)
const formasPagamento = [
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'Pix', value: 'PIX' },
  { label: 'Debito', value: 'DEBITO' },
  { label: 'Credito', value: 'CREDITO' },
  { label: 'Outro', value: 'OUTRO' },
]
const clienteBuscaTermo = ref('')
const produtoBuscaTermo = ref('')
const clientesFiltrados = ref([])
const produtosFiltrados = ref([])
const funcionariosOptions = ref([])

const form = ref({
  cliente_id: null,
  nome_cliente_avulso: null,
  nome_funcionario_empresa: '',
  itens: [],
  pago: false,
  forma_pagamento: null,
  observacoes: '',
})

const clienteSelecionado = computed(() =>
  clientes.value.find((c) => c.id === form.value.cliente_id) || null,
)
const clienteEhEmpresa = computed(() => {
  const tipo = clienteSelecionado.value?.tipo
  return !!(tipo && tipo.toString().toLowerCase().includes('empresa'))
})
const funcionariosDaEmpresa = computed(() => {
  const cid = form.value.cliente_id
  if (!cid) return []
  const lista = funcionariosPorCliente.value[cid]
  return Array.isArray(lista) ? lista : []
})

watch(() => props.clientes, () => {
  atualizarClientesFiltrados()
}, { immediate: true })

watch(() => props.produtos, () => {
  atualizarProdutosFiltrados()
}, { immediate: true })

watch(funcionariosDaEmpresa, (lista) => {
  const base = (lista || []).map((f) => f?.nome).filter(Boolean)
  funcionariosOptions.value = base.map((nome) => ({ label: nome, value: nome }))
})

watch(() => form.value.cliente_id, async (cid, oldCid) => {
  if (!cid) {
    form.value.nome_funcionario_empresa = ''
    return
  }
  if (oldCid && cid !== oldCid) {
    form.value.nome_funcionario_empresa = ''
  }
  if (clienteEhEmpresa.value && typeof props.buscarFuncionarios === 'function') {
    try {
      await props.buscarFuncionarios(cid)
    } catch (error) {
      console.error('Falha ao buscar funcionarios do cliente', error)
    }
  }
})

watch(clienteAvulso, (v) => {
  if (v) {
    form.value.cliente_id = null
    form.value.pago = true
    form.value.nome_funcionario_empresa = ''
  } else {
    form.value.nome_cliente_avulso = null
  }
})

watch(() => form.value.pago, (v) => {
  if (clienteAvulso.value && !v) {
    form.value.pago = true
  }
})

watch(() => props.draft, async (d) => {
  if (!d) return
  const itens = Array.isArray(d.itens) ? d.itens.map((it) => ({ ...it })) : []
  form.value = {
    cliente_id: d.cliente_id || null,
    nome_cliente_avulso: d.nome_cliente_avulso || null,
    nome_funcionario_empresa: d.nome_funcionario_empresa || '',
    itens,
    pago: d.cliente_id ? !!d.pago : true,
    forma_pagamento: d.forma_pagamento || null,
    observacoes: d.observacoes || '',
  }
  clienteAvulso.value = !d.cliente_id
  produtoSelecionado.value = null
  abrirProdutoAvulso.value = false
  if (form.value.cliente_id && clienteEhEmpresa.value && typeof props.buscarFuncionarios === 'function') {
    try {
      await props.buscarFuncionarios(form.value.cliente_id)
    } catch (error) {
      console.error('Falha ao buscar funcionarios do cliente', error)
    }
  }
  nextTick(() => {
    selProd.value?.updateInputValue('')
    if (!clienteAvulso.value) {
      selProd.value?.focus()
    }
  })
}, { immediate: false })

function normalizarTexto(valor) {
  const texto = (valor || '')
  const normalizado = typeof texto.normalize === 'function'
    ? texto.normalize('NFD')
    : texto

  return normalizado
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function filtrarClientesPorTermo(termo) {
  const limpo = normalizarTexto(termo).trim()
  if (!limpo.length) return []

  return (clientes.value || []).filter((cliente) =>
    normalizarTexto(cliente?.nome).includes(limpo),
  )
}

function filtrarProdutosPorTermo(termo) {
  const limpo = normalizarTexto(termo).trim()
  if (!limpo.length) return []

  return (produtos.value || []).filter((produto) =>
    normalizarTexto(produto?.nome).includes(limpo),
  )
}

function atualizarClientesFiltrados() {
  const termoAtual = clienteBuscaTermo.value.trim()
  const resultados = filtrarClientesPorTermo(clienteBuscaTermo.value)
  clientesFiltrados.value = resultados

  nextTick(() => {
    if (!termoAtual.length || !resultados.length) {
      selCliente.value?.hidePopup()
    }
  })
}

function atualizarProdutosFiltrados() {
  const termoAtual = produtoBuscaTermo.value.trim()
  const resultados = filtrarProdutosPorTermo(produtoBuscaTermo.value)
  produtosFiltrados.value = resultados

  nextTick(() => {
    if (!termoAtual.length || !resultados.length) {
      selProd.value?.hidePopup()
    }
  })
}

function filterClientes(val, update) {
  clienteBuscaTermo.value = val || ''
  update(() => {
    atualizarClientesFiltrados()
  })
}

function filterProdutos(val, update) {
  produtoBuscaTermo.value = val || ''
  update(() => {
    atualizarProdutosFiltrados()
  })
}

function handleClienteClear() {
  clienteBuscaTermo.value = ''
  clientesFiltrados.value = []
  nextTick(() => {
    selCliente.value?.hidePopup()
  })
}

function handleProdutoClear() {
  produtoBuscaTermo.value = ''
  produtosFiltrados.value = []
  nextTick(() => {
    selProd.value?.hidePopup()
  })
}

function filterFuncionarios(val, update) {
  const base = (funcionariosDaEmpresa.value || []).map((f) => f?.nome).filter(Boolean)
  const n = (val || '').toLowerCase()
  update(() => {
    funcionariosOptions.value = base
      .filter((nome) => nome.toLowerCase().includes(n))
      .map((nome) => ({ label: nome, value: nome }))
  })
}

onMounted(() => {
  clientesFiltrados.value = []
  produtosFiltrados.value = []
})

function adicionarProdutoSelecionado(prod) {
  if (!prod) return
  const itens = form.value.itens

  const existente = itens.find((i) => i.produto_id === prod.id)
  if (existente) {
    existente.quantidade += 1
  } else {
    itens.push({
      _uid: uid(),
      produto_id: prod.id,
      nome_produto_congelado: prod.nome,
      preco_unitario_congelado: Number(prod.preco || 0),
      quantidade: 1,
    })
  }

  produtoSelecionado.value = null
  produtoBuscaTermo.value = ''
  produtosFiltrados.value = []
  nextTick(() => {
    selProd.value?.updateInputValue('')
    selProd.value?.hidePopup()
    selProd.value?.focus()
  })
}
function removerItem(idx) {
  form.value.itens.splice(idx, 1)
}

function decrementarItem(idx) {
  const itens = form.value.itens
  const item = itens[idx]
  if (!item) return

  if (Number(item.quantidade) <= 1) {
    itens.splice(idx, 1)
  } else {
    item.quantidade = Number(item.quantidade) - 1
  }
}

const total = computed(() =>
  form.value.itens.reduce((a, i) => a + i.quantidade * i.preco_unitario_congelado, 0),
)
const funcionarioOk = computed(() => {
  if (clienteAvulso.value) return true
  if (!clienteEhEmpresa.value) return true
  return !!form.value.nome_funcionario_empresa?.trim()
})
const podeSalvar = computed(() => {
  const temCliente = clienteAvulso.value ? true : !!form.value.cliente_id
  const temItens = form.value.itens.length > 0
  return temCliente && temItens && funcionarioOk.value
})

function confirmar() {
  const pagoFinal = clienteAvulso.value ? true : !!form.value.pago
  emit('confirm', {
    cliente_id: clienteAvulso.value ? null : form.value.cliente_id,
    nome_cliente_avulso: clienteAvulso.value ? form.value.nome_cliente_avulso || null : null,
    nome_funcionario_empresa:
      !clienteAvulso.value && clienteEhEmpresa.value
        ? form.value.nome_funcionario_empresa || null
        : null,
    pago: pagoFinal,
    forma_pagamento: pagoFinal ? form.value.forma_pagamento || null : null,
    itens: form.value.itens,
    observacoes: form.value.observacoes || null,
  })
  clienteAvulso.value = false
  produtoSelecionado.value = null
  form.value = {
    cliente_id: null,
    nome_cliente_avulso: null,
    nome_funcionario_empresa: '',
    itens: [],
    pago: false,
    forma_pagamento: null,
    observacoes: '',
  }
  funcionariosOptions.value = []
}

function adicionarProdutoAvulso(novoProduto) {
  if (!novoProduto.nome || !novoProduto.preco) return
  const itens = form.value.itens
  const p = Number(novoProduto.preco)

  const existente = itens.find((i) =>
    !i.produto_id &&
    (i.nome_produto_congelado || '').toLowerCase() === novoProduto.nome.toLowerCase() &&
    Number(i.preco_unitario_congelado) === p,
  )
  if (existente) {
    existente.quantidade += 1
  } else {
    itens.push({
      _uid: uid(),
      produto_id: null,
      nome_produto_congelado: novoProduto.nome,
      preco_unitario_congelado: p,
      quantidade: 1,
    })
  }

  nextTick(() => {
    selProd.value?.updateInputValue('')
    selProd.value?.focus()
  })
}
</script>

<style scoped>

.novo-pedido-card {

  --novo-yellow: #ffd54f;

  --novo-yellow-strong: #f4b336;

  --novo-surface: rgba(255, 255, 255, 0.96);

  --novo-outline: rgba(255, 213, 79, 0.28);

  --novo-shadow: 0 18px 36px rgba(32, 25, 10, 0.12);

  --novo-text-strong: #3b2f00;

  --novo-text-medium: #6d5a1a;

  --novo-text-muted: rgba(59, 47, 0, 0.6);

  display: flex;

  flex-direction: column;

  height: 100%;

  border-radius: 24px;

  background: var(--novo-surface);

  box-shadow: var(--novo-shadow);

  position: relative;

  overflow: visible;

}



.novo-pedido-card--mobile {

  height: auto;

}



.novo-pedido__header {

  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  gap: 16px;

  padding-bottom: 4px;

}



.novo-pedido__title {

  font-size: 20px;

  font-weight: 700;

  color: var(--novo-text-strong);

  letter-spacing: 0.04em;

  text-transform: uppercase;

}



.novo-pedido__subtitle {

  margin-top: 4px;

  font-size: 13px;

  color: var(--novo-text-muted);

}



.novo-pedido__stats {

  display: flex;

  gap: 14px;

}



.novo-pedido__stat {

  display: flex;

  flex-direction: column;

  padding: 8px 12px;

  border-radius: 14px;

  background: rgba(255, 213, 79, 0.16);

  color: var(--novo-text-medium);

  text-align: right;

}



.novo-pedido__stat span {

  font-size: 11px;

  text-transform: uppercase;

  letter-spacing: 0.08em;

}



.novo-pedido__stat strong {

  font-size: 16px;

  font-weight: 700;

}



.novo-pedido__divider {

  opacity: 0.6;

}



.novo-pedido__body {
  display: flex;
  flex-direction: column;
  gap: 22px;
  flex: 1;
  min-height: 0;
  overflow-y: visible;
  padding-right: 0;
  padding-bottom: 110px;
}

.novo-pedido__body::-webkit-scrollbar {
  width: 6px;
}

.novo-pedido__body::-webkit-scrollbar-thumb {
  background: rgba(244, 179, 54, 0.4);
  border-radius: 999px;
}


.novo-pedido__block {

  display: flex;

  flex-direction: column;

  gap: 14px;

  padding: 16px 18px;

  border-radius: 20px;

  background: rgba(255, 255, 255, 0.98);

  box-shadow: inset 0 0 0 1px var(--novo-outline);

}

.novo-pedido__block :deep(.q-field--filled .q-field__control) {
  border-radius: 16px;
  background: rgba(255, 248, 209, 0.9);
  border: 1px solid rgba(255, 213, 79, 0.3);
  box-shadow: inset 0 1px 2px rgba(244, 179, 54, 0.16);
}

.novo-pedido__block :deep(.q-field--filled .q-field__control:before),
.novo-pedido__block :deep(.q-field--filled .q-field__control:after) {
  display: none;
}

.novo-pedido__block :deep(.q-field__label) {
  font-weight: 600;
  color: var(--novo-text-muted);
}


.novo-pedido__block--produtos {

  gap: 18px;

}



.novo-pedido__block-title {

  font-size: 12px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.18em;

  color: var(--novo-text-muted);

}



.novo-pedido__product-row {

  display: flex;

  flex-direction: column;

  gap: 12px;

}



.novo-pedido__items {

  display: flex;

  flex-direction: column;

  gap: 12px;

}



.novo-pedido__items-empty {

  padding: 16px;

  text-align: center;

  border-radius: 14px;

  background: rgba(255, 245, 196, 0.78);

  color: var(--novo-text-medium);

  font-size: 13px;

}



.novo-pedido__item {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 12px;

  padding: 12px 14px;

  border-radius: 14px;

  background: rgba(255, 255, 255, 0.96);

  box-shadow: inset 0 0 0 1px var(--novo-outline);

}



.novo-pedido__item-info {

  display: flex;

  flex-direction: column;

  gap: 4px;

}



.novo-pedido__item-name {

  font-weight: 600;

  color: var(--novo-text-strong);

}



.novo-pedido__item-price {

  font-size: 13px;

  color: var(--novo-text-medium);

}



.novo-pedido__item-actions {

  display: flex;

  align-items: center;

  gap: 8px;

}



.novo-pedido__item-btn {

  background: rgba(255, 213, 79, 0.26);

  color: var(--novo-text-strong);

}



.novo-pedido__item-qty {

  min-width: 28px;

  text-align: center;

  font-weight: 600;

  color: var(--novo-text-medium);

}



.novo-pedido__item-remove {

  color: #b84332;

}



.novo-pedido__avulso-tip {

  border-radius: 12px;

  color: var(--novo-text-medium);

}



.novo-pedido__footer {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 16px;

  padding: 18px 22px;

  margin-top: auto;

  position: sticky;

  bottom: 0;

  background: var(--novo-surface);

  border-top: 1px solid var(--novo-outline);

  box-shadow: 0 -12px 24px rgba(32, 25, 10, 0.1);

  z-index: 2;

}



.novo-pedido__footer-info {

  display: flex;

  flex-direction: column;

  gap: 4px;

  font-size: 12px;

  color: var(--novo-text-medium);

}



.novo-pedido__footer-total {

  font-size: 18px;

  font-weight: 700;

  color: var(--novo-text-strong);

}



.novo-pedido__footer-btn {

  font-weight: 700;

  padding: 10px 24px;

  border-radius: 14px;

  background: linear-gradient(115deg, var(--novo-yellow), var(--novo-yellow-strong));

  color: var(--novo-text-strong);

}



@media (max-width: 767px) {

  .novo-pedido__header {

    flex-direction: column;

    align-items: stretch;

    gap: 12px;

  }

  .novo-pedido__stats {

    width: 100%;

    justify-content: space-between;

  }

  .novo-pedido__footer {

    flex-direction: column;

    align-items: stretch;

  }

  .novo-pedido__footer-btn {

    width: 100%;

    justify-content: center;

  }

}

</style>







