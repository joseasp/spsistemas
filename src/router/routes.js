const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/CadernoPage.vue') },
      { path: 'produtos', component: () => import('pages/ProdutosPage.vue') },
      { path: 'clientes', component: () => import('pages/ClientesPage.vue') },
      { path: 'contas', component: () => import('pages/ContasPage.vue') },
      { path: 'relatorios', component: () => import('pages/RelatoriosPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
