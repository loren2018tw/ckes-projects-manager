const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/HomePage.vue') },
      { path: 'contacts', component: () => import('@/pages/ContactList.vue') },
      { path: 'projects', component: () => import('@/pages/ProjectList.vue') },
      {
        path: 'projects/:projectId',
        component: () => import('@/pages/project/DashboardPage.vue')
      },
      {
        path: 'projects/:projectId/resources',
        component: () => import('@/pages/ProjectResources.vue')
      },
      {
        path: 'projects/:projectId/tasks',
        component: () => import('@/pages/project/TaskManagement.vue')
      }
    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue')
  }
]

export default routes
