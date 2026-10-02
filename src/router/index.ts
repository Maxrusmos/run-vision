import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      redirect: '/activity',
    },
    {
      path: '/activity',
      component: () => import('@/views/activity-view/ActivityView.vue'),
    },
  ],
});

export default router;
