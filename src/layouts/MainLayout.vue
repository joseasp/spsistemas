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
          class="lt-md"
        />

        <q-img
          src="~assets/logo-restaurante-completo.png"
          style="height: 40px; width: 180px;"
          fit="contain"
        />

        <q-space />

        <q-tabs
          inline-label
          active-color="primary"
          indicator-color="primary"
          class="gt-sm"
        >
          <q-route-tab to="/" label="Caderno" icon="o_menu_book" />
          <q-route-tab to="/produtos" label="Produtos" icon="o_takeout_dining" />
          <q-route-tab to="/clientes" label="Clientes" icon="o_people" />
          <q-route-tab to="/contas" label="Contas a Receber" icon="o_request_quote" />
          <q-route-tab to="/relatorios" label="Relatórios" icon="o_analytics" />
        </q-tabs>

      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      side="left"
      bordered
    >
      <q-list>
        <q-item-label header>Menu</q-item-label>

        <q-item clickable v-ripple to="/" exact active-class="active-drawer-item">
          <q-item-section avatar> <q-icon name="o_menu_book" /> </q-item-section>
          <q-item-section> Caderno </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/produtos" active-class="active-drawer-item">
          <q-item-section avatar> <q-icon name="o_takeout_dining" /> </q-item-section>
          <q-item-section> Produtos </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/clientes" active-class="active-drawer-item">
          <q-item-section avatar> <q-icon name="o_people" /> </q-item-section>
          <q-item-section> Clientes </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/contas" active-class="active-drawer-item">
          <q-item-section avatar> <q-icon name="o_request_quote" /> </q-item-section>
          <q-item-section> Contas a Receber </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/relatorios" active-class="active-drawer-item">
          <q-item-section avatar> <q-icon name="o_analytics" /> </q-item-section>
          <q-item-section> Relatórios </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container class="bg-transparent">
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref } from 'vue' // Importe o 'ref' do vue

// Variável reativa para controlar o estado do menu lateral
const leftDrawerOpen = ref(false)

// Função para alternar o estado do menu (abrir/fechar)
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<style lang="scss">
// Pequeno ajuste para garantir que a borda do header tenha a cor certa
.q-header--bordered {
  border-bottom: 1px solid #EEEEEE; // Cor 'Cinza Claro' do Style Guide
}

// ✅ ADICIONE ESTA NOVA REGRA
// Define a cor do texto para as abas inativas
.q-tab {
  color: #212121; // Cor Grafite do Style Guide
}

// ✅ Estilo para o item ativo no menu lateral
.active-drawer-item {
  color: var(--q-primary); // Usa a cor primária (amarelo) que definimos
  // O Quasar também adiciona um background sutil por padrão
}
</style>