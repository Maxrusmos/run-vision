import { createRouter, createWebHashHistory } from 'vue-router';
import { useActivityStore } from '@/stores/activity.store';
import { restoreWorkSession } from '@/stores/work-session';
import { useSavedTemplatesStore } from '@/stores/saved-templates.store';
import { loadDemoActivity } from '@/entities/activity/lib/demo-activity';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTE_NAMES, getTemplateEditorRoute } from './routes';

declare module 'vue-router' {
  interface RouteMeta {
    /** Страница доступна только после загрузки GPX. */
    requiresActivity?: boolean;
    /** Страница со своей верхней панелью — шапка приложения скрыта. */
    hideAppHeader?: boolean;
    /** Страница только для гостя (вход, регистрация) — вошедшего отправляем на главную. */
    guestOnly?: boolean;
    /** Страница только для вошедших (кабинет) — гостя отправляем на вход и обратно. */
    requiresAuth?: boolean;
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
      // Видео — тот же редактор, что и фото, плюс точка на треке и воспроизведение.
      path: '/share/video/editor',
      name: ROUTE_NAMES.videoEditor,
      component: () => import('@/views/photo-editor-view/PhotoEditorView.vue'),
      props: { mode: 'video' },
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
    {
      path: '/forgot-password',
      name: ROUTE_NAMES.forgotPassword,
      component: () => import('@/views/auth-view/ForgotPasswordView.vue'),
    },
    {
      // Ссылка из письма: #/reset-password?token=…
      path: '/reset-password',
      name: ROUTE_NAMES.resetPassword,
      component: () => import('@/views/auth-view/ResetPasswordView.vue'),
    },
    {
      path: '/privacy',
      name: ROUTE_NAMES.privacy,
      component: () => import('@/views/legal-view/LegalView.vue'),
      props: { document: 'privacy' },
    },
    {
      path: '/consent',
      name: ROUTE_NAMES.consent,
      component: () => import('@/views/legal-view/LegalView.vue'),
      props: { document: 'consent' },
    },
    {
      path: '/account',
      name: ROUTE_NAMES.account,
      component: () => import('@/views/account-view/AccountView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/account/templates/:id',
      name: ROUTE_NAMES.savedTemplate,
      component: () => import('@/views/account-view/SavedTemplateView.vue'),
      props: true,
      meta: { requiresAuth: true },
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

/** Вошёл ли пользователь (токен есть, но не проверен — дождаться проверки). */
async function ensureAuthenticated(): Promise<boolean> {
  const authStore = useAuthStore();
  if (!authStore.isAuthenticated && authStore.token) await authStore.init();
  return authStore.isAuthenticated;
}

router.beforeEach(async (to) => {
  // Редактор в режиме шаблона (`?template=<id>`): нужен сам шаблон, а тренировка —
  // своя (в т.ч. после перезагрузки) или демо-пробежка. Фото и видео — одинаково.
  const isEditor = to.name === ROUTE_NAMES.photoEditor || to.name === ROUTE_NAMES.videoEditor;
  const templateId = isEditor ? to.query.template : undefined;
  if (typeof templateId === 'string') {
    if (!(await ensureAuthenticated())) {
      return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } };
    }
    let shareType;
    try {
      ({ shareType } = await useSavedTemplatesStore().fetchOne(templateId));
    } catch {
      return { name: ROUTE_NAMES.account };
    }
    // Шаблон своего типа правится в своём редакторе (ссылка могла вести не туда).
    const editor = getTemplateEditorRoute(shareType);
    if (to.name !== editor) return { name: editor, query: to.query };
    if (!useActivityStore().activity && !(await restoreWorkSession())) {
      try {
        await loadDemoActivity();
      } catch {
        return { name: ROUTE_NAMES.savedTemplate, params: { id: templateId } };
      }
    }
    return;
  }

  // Без загруженной тренировки делать нечего — возвращаем к загрузке GPX.
  // После перезагрузки страницы сначала пробуем вернуть работу этой сессии.
  if (to.meta.requiresActivity && !useActivityStore().activity) {
    if (!(await restoreWorkSession())) return { name: ROUTE_NAMES.import };
  }

  if (to.meta.requiresAuth) {
    // Без связи с сервером токен не стираем — страница сама покажет, что нет связи.
    if (!(await ensureAuthenticated()) && useAuthStore().status !== 'offline') {
      return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } };
    }
  }

  if (to.meta.guestOnly && useAuthStore().isAuthenticated) {
    return { name: ROUTE_NAMES.import };
  }
});

export default router;
