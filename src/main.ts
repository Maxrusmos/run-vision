import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import { useAuthStore } from './stores/auth.store';
import '@/styles/theme.css';
import '@/styles/utilities.css';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(vuetify);

app.mount('#app');

// Проверяем сохранённую сессию в фоне — первый рендер её не ждёт (до ответа — гость).
void useAuthStore(pinia).init();
