import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import { useAuthStore } from './stores/auth.store';
import { wakeApi } from './shared/api';
import '@/styles/theme.css';
import '@/styles/utilities.css';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(vuetify);

app.mount('#app');

// Будим сервер (на бесплатном хостинге он засыпает) и потом проверяем сохранённую сессию —
// всё в фоне, первый рендер не ждёт (до ответа — гость). Иначе проверка сессии не дождалась бы
// холодного старта и пользователь увидел бы «нет связи».
void wakeApi().then(() => useAuthStore(pinia).init());
