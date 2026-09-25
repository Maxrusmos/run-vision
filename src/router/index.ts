import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      redirect: '/activities',
    },
    {
      path: '/activities',
      component: () => import('@/views/activities-view/ActivitiesView.vue'),
    },
    {
      path: '/activity/:id',
      component: () => import('@/views/activity-view/ActivityView.vue'),
    },
    {
      path: '/settings',
      component: () => import('@/views/settings-view/SettingsView.vue'),
    },
  ],
});

export default router;
