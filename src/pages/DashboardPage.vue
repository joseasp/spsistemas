<template>
  <q-page class="dashboard-page q-pa-md">
    <div class="row items-center q-col-gutter-md">
      <div class="col-12 col-md-8">
        <div class="text-h5 text-weight-medium">Dashboard</div>
        <div class="text-caption text-grey-7">
          Visao geral do dia {{ dataFormatada }}
        </div>
      </div>
    </div>

    <q-linear-progress v-if="loading" indeterminate color="primary" class="q-mt-sm" />

    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12 col-lg-8">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-card class="kpi-card">
              <q-card-section>
                <div class="text-caption text-grey-7">Vendas do dia</div>
                <div class="text-h6">
                  <span v-if="podeVerFinanceiro">{{ formatarMoeda(indicadores.vendasDia) }}</span>
                  <span v-else>--</span>
                </div>
                <div class="text-caption">
                  <span v-if="podeVerFinanceiro">{{ indicadores.totalPedidos }} pedidos</span>
                  <span v-else>Acesso restrito</span>
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6">
            <q-card class="kpi-card">
              <q-card-section>
                <div class="text-caption text-grey-7">Pedidos pendentes</div>
                <div class="text-h6">{{ indicadores.pendentes }}</div>
                <div class="text-caption">Prontos: {{ indicadores.prontos }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6">
            <q-card class="kpi-card">
              <q-card-section>
                <div class="text-caption text-grey-7">Clientes ativos</div>
                <div class="text-h6">{{ indicadores.clientesAtivos }}</div>
                <div class="text-caption">Total cadastrado</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6">
            <q-card class="kpi-card">
              <q-card-section>
                <div class="text-caption text-grey-7">Caixa</div>
                <div class="text-h6">{{ indicadores.caixaAberto ? 'Aberto' : 'Fechado' }}</div>
                <div class="text-caption">{{ indicadores.caixaAberto ? 'Operando hoje' : 'Sem caixa aberto' }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <q-card class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey-7">Avisos</div>
            <div class="text-subtitle1">Notificacoes recentes</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div v-if="!avisos.length" class="text-caption text-grey-7">
              Nenhum aviso no momento.
            </div>
            <q-list v-else dense>
              <q-item v-for="aviso in avisos" :key="aviso.id">
                <q-item-section>
                  <div class="text-body2">{{ aviso.titulo }}</div>
                  <div class="text-caption text-grey-7">{{ aviso.descricao }}</div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-banner v-if="erro" class="q-mt-md bg-red-1 text-red-9">
      {{ erro }}
    </q-banner>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { date as qDate } from 'quasar'
import { supabase } from 'src/supabaseClient'
import { useAuthStore } from 'src/stores/auth-store'

const loading = ref(false)
const erro = ref('')
const hoje = new Date()
const dataFormatada = qDate.formatDate(hoje, 'DD/MM/YYYY')
const authStore = useAuthStore()

const avisos = ref([])
const podeVerFinanceiro = computed(() => ['owner', 'admin'].includes(authStore.role))

const indicadores = ref({
  vendasDia: 0,
  totalPedidos: 0,
  pendentes: 0,
  prontos: 0,
  clientesAtivos: 0,
  caixaAberto: false,
})

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

let refreshTimer = null
let realtimeChannel = null

function scheduleRefresh() {
  if (refreshTimer) return
  refreshTimer = setTimeout(async () => {
    refreshTimer = null
    await carregarIndicadores()
  }, 400)
}

async function carregarIndicadores() {
  loading.value = true
  erro.value = ''
  try {
    const dataLocal = qDate.formatDate(hoje, 'YYYY-MM-DD')

    const [{ data: transacoes, error: transacoesError }, clientesRes, caixaRes] = await Promise.all([
      supabase
        .from('transacoes')
        .select('id, valor, status_preparo, business_date')
        .eq('business_date', dataLocal),
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase
        .from('caixa_operacoes')
        .select('id, status, data_local, data_movimento')
        .eq('status', 'ABERTO')
        .or(`data_local.eq.${dataLocal},data_movimento.eq.${dataLocal}`)
        .limit(1),
    ])

    if (transacoesError) throw transacoesError
    if (clientesRes.error) throw clientesRes.error
    if (caixaRes.error) throw caixaRes.error

    const vendasDia = (transacoes || []).reduce((acc, t) => acc + Number(t.valor || 0), 0)
    const pendentes = (transacoes || []).filter((t) => t.status_preparo === 'PENDENTE').length
    const prontos = (transacoes || []).filter((t) => t.status_preparo === 'PRONTO').length

    indicadores.value = {
      vendasDia,
      totalPedidos: transacoes?.length ?? 0,
      pendentes,
      prontos,
      clientesAtivos: clientesRes.count ?? 0,
      caixaAberto: (caixaRes.data || []).length > 0,
    }
  } catch (err) {
    console.error('Falha ao carregar indicadores:', err)
    erro.value = 'Nao foi possivel carregar os indicadores do dia.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  carregarIndicadores()
  realtimeChannel = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, scheduleRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, scheduleRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_operacoes' }, scheduleRefresh)
    .subscribe()
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
})
</script>

<style lang="scss">
.dashboard-page {
  min-height: 100%;
}

.kpi-card {
  border-radius: 16px;
}
</style>
