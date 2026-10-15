import { createRouter, createWebHashHistory } from 'vue-router';
import { useActivityStore } from '@/stores/activity.store';
import { ROUTE_NAMES } from './routes';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: ROUTE_NAMES.shareType,
      component: () => import('@/views/share-type-view/ShareTypeView.vue'),
    },
    {
      path: '/photo',
      name: ROUTE_NAMES.photoTemplate,
      component: () => import('@/views/photo-template-view/PhotoTemplateView.vue'),
    },
    {
      path: '/photo/editor',
      name: ROUTE_NAMES.photoEditor,
      component: () => import('@/views/photo-editor-view/PhotoEditorView.vue'),
      beforeEnter: () => {
        // Без загруженной тренировки редактировать нечего — возвращаем к выбору шаблона.
        if (!useActivityStore().activity) {
          return { name: ROUTE_NAMES.photoTemplate };
        }
      },
    },
    {
      path: '/video',
      name: ROUTE_NAMES.video,
      component: () => import('@/views/video-view/VideoView.vue'),
    },
    // Страница с 3D-картой (`@/views/activity-view/ActivityView.vue`) временно скрыта.
    // Чтобы вернуть её, добавьте маршрут:
    // { path: '/activity', component: () => import('@/views/activity-view/ActivityView.vue') },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: ROUTE_NAMES.shareType },
    },
  ],
});

export default router;
