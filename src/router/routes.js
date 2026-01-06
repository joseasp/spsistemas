const routes = [
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    children: [{ path: '', component: () => import('pages/LoginPage.vue') }],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/DashboardPage.vue') },
      { path: 'caderno', component: () => import('pages/CadernoPage.vue') },
      { path: 'produtos', component: () => import('pages/ProdutosPage.vue') },
      { path: 'clientes', component: () => import('pages/ClientesPage.vue') },
      { path: 'contas', component: () => import('pages/ContasPage.vue') },
      { path: 'relatorios', component: () => import('pages/RelatoriosPage.vue') },
      { path: 'perfil', component: () => import('pages/PerfilPage.vue') },
      { path: 'configuracoes', component: () => import('pages/ConfiguracoesEmpresaPage.vue') },
      { path: 'configuracoes/usuarios', component: () => import('pages/UsuariosEmpresaPage.vue') },
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
