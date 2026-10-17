import { createRouter, createWebHashHistory } from 'vue-router';
import { useActivityStore } from '@/stores/activity.store';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTE_NAMES } from './routes';

declare module 'vue-router' {
  interface RouteMeta {
    /** Страница доступна только после загрузки GPX. */
    requiresActivity?: boolean;
    /** Страница со своей верхней панелью — шапка приложения скрыта. */
    hideAppHeader?: boolean;
    /** Страница только для гостя (вход, регистрация) — вошедшего отправляем на главную. */
    guestOnly?: boolean;
  }
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: ROUTE_NAMES.import,
      component: () => import('@/views/import-view/ImportView.vue'),
    },
    {
      path: '/share',
      name: ROUTE_NAMES.share,
      component: () => import('@/views/share-view/ShareView.vue'),
      meta: { requiresActivity: true },
    },
    {
      path: '/share/photo/editor',
      name: ROUTE_NAMES.photoEditor,
      component: () => import('@/views/photo-editor-view/PhotoEditorView.vue'),
      meta: { requiresActivity: true, hideAppHeader: true },
    },
    {
      path: '/login',
      name: ROUTE_NAMES.login,
      component: () => import('@/views/auth-view/AuthView.vue'),
      props: { mode: 'login' },
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: ROUTE_NAMES.register,
      component: () => import('@/views/auth-view/AuthView.vue'),
      props: { mode: 'register' },
      meta: { guestOnly: true },
    },
    // Страница с 3D-картой (`@/views/activity-view/ActivityView.vue`) временно скрыта.
    // Чтобы вернуть её, добавьте маршрут:
    // { path: '/activity', component: () => import('@/views/activity-view/ActivityView.vue') },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: ROUTE_NAMES.import },
    },
  ],
});

router.beforeEach((to) => {
  // Без загруженной тренировки делать нечего — возвращаем к загрузке GPX.
  if (to.meta.requiresActivity && !useActivityStore().activity) {
    return { name: ROUTE_NAMES.import };
  }

  if (to.meta.guestOnly && useAuthStore().isAuthenticated) {
    return { name: ROUTE_NAMES.import };
  }
});

export default router;
