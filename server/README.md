# RunVision — сервер

Бэкенд для регистрации и входа пользователей (дальше — тарифы и подписка).
Node.js 22 + TypeScript, [Fastify](https://fastify.dev), PostgreSQL.

**Контракт API — [`docs/api.md`](../docs/api.md)**: все эндпоинты, форматы ответов и ошибок.
Сервер делает ровно его; меняя API, сначала правим этот файл.

## Быстрый старт

```sh
cd server
npm install
cp .env.example .env      # настройки; для локальной БД менять ничего не нужно
docker compose up -d      # PostgreSQL 16 в Docker (или своя, см. ниже)
npm run migrate           # создать таблицы
npm run dev               # сервер на http://localhost:3000 с перезапуском при правках
```

Проверка: `curl http://localhost:3000/api/health` → `{"ok":true}`.

Фронт ходит на `VITE_API_URL` (по умолчанию `http://localhost:3000`). Запустить фронт и
сервер вместе одной командой — `npm run dev` в корне репозитория (Ctrl+C останавливает оба;
зависимости сервера и `server/.env` создаются сами, новые миграции применяются при каждом запуске). Только фронт — `npm run dev:front`.

### PostgreSQL без Docker

Установите PostgreSQL и создайте пользователя и две базы — для разработки и для тестов.

Ubuntu / WSL:

```sh
sudo apt update && sudo apt install -y postgresql   # сервер + клиент psql
sudo service postgresql start                       # запустить (в WSL — после каждой перезагрузки)
sudo -u postgres psql -c "CREATE ROLE runvision LOGIN PASSWORD 'runvision'"
sudo -u postgres createdb -O runvision runvision
sudo -u postgres createdb -O runvision runvision_test
```

macOS (Homebrew):

```sh
brew install postgresql@16 && brew services start postgresql@16
psql postgres -c "CREATE ROLE runvision LOGIN PASSWORD 'runvision'"
createdb -O runvision runvision
createdb -O runvision runvision_test
```

Ошибка `You must install at least one postgresql-client-<version> package` значит, что
PostgreSQL не установлен — поставьте его командой выше (или используйте Docker).

`docker-compose.yml` делает то же самое (тестовая база — `docker/init-test-db.sql`).

## Команды

| Команда             | Что делает                                                      |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | запуск из исходников с перезапуском при правках (tsx watch)     |
| `npm run build`     | сборка TypeScript → `dist/`                                     |
| `npm start`         | запуск собранного `dist/server.js` (так — на хостинге)          |
| `npm run migrate`   | применить новые миграции из `migrations/`                       |
| `npm run typecheck` | проверка типов                                                  |
| `npm test`          | тесты (Vitest) на тестовой базе `runvision_test` — её чистят!   |

На хостинге, где нет dev-зависимостей, миграции — `node dist/migrate.js` (после `build`).

## Переменные окружения

Читаются из `.env` (локально) или из настроек хостинга. Проверяются на старте —
если чего-то не хватает, сервер сразу падает с понятным сообщением.

| Переменная          | По умолчанию                                         | Зачем                                                         |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`      | — (обязательна)                                      | строка подключения к PostgreSQL                               |
| `PORT`              | `3000`                                               | порт HTTP                                                     |
| `CORS_ORIGINS`      | `http://localhost:5173,https://maxrusmos.github.io`  | с каких сайтов можно звать API (через запятую)                |
| `SESSION_TTL_DAYS`  | `30`                                                 | сколько живёт вход                                            |
| `TRUST_PROXY`       | `false`                                              | `true` за прокси хостинга — иначе все запросы «с одного IP»   |
| `LOG_LEVEL`         | `info`                                               | подробность логов                                             |
| `TEST_DATABASE_URL` | `postgres://runvision:runvision@localhost:5432/runvision_test` | база для `npm test`                         |

## Как устроено

```
migrations/001_users_sessions.sql  схема БД (users, sessions)
migrations/002_templates.sql       сохранённые шаблоны оформления (templates)
migrations/005_consent_password_reset.sql  согласие на обработку ПДн, ссылки сброса пароля
                                   (004 — отменённый вход по логину — удалена)
src/
  server.ts          запуск: конфиг → БД → слушаем порт
  app.ts             buildApp(): плагины, обработчик ошибок, маршруты (в тестах — без порта)
  config.ts          переменные окружения (zod)
  db.ts              пул PostgreSQL, withTransaction
  migrate.ts         применение миграций
  lib/errors.ts      ApiError и готовые ошибки в формате контракта
  lib/mailer.ts      отправка писем: SMTP (SMTP_URL) или в лог; в тестах — в память
  modules/auth/
    routes.ts        /api/auth/* — только HTTP
    service.ts       логика: регистрация, вход, сессии, действующий тариф
    schemas.ts       проверка email/пароля (zod)
    password.ts      хэш паролей (scrypt)
    tokens.ts        токены сессий и ссылок сброса
    mails.ts         тексты писем (смена пароля)
    authenticate.ts  хук app.authenticate и requirePlan('pro') для закрытых эндпоинтов
  modules/templates/
    routes.ts        /api/templates/* — «Мои шаблоны», только для вошедших
    service.ts       список/чтение/создание/изменение/удаление; всё — в пределах user_id
    schemas.ts       проверка полей (название, шаблон-основа, настройки ≤ 32 КБ)
test/                тесты на настоящей БД
```

### Сохранённые шаблоны

Таблица `templates`: название, шаблон-основа (`minimal` / `topographic` / `telemetry`) и
`settings` — настройки карточки фронта как есть (`jsonb`, сервер их не разбирает). Фото фона
не храним (`backgroundImage` сервер всегда обнуляет). Чужие и несуществующие шаблоны — одинаково
`404`. Не больше 100 шаблонов на пользователя (`409 LIMIT_REACHED`).

### Авторизация

- Регистрация/вход возвращают `token` — случайные 32 байта. В БД (`sessions`) лежит только
  его SHA-256: даже утёкшая база не даёт войти от чужого имени. Сессия живёт 30 дней;
  выход удаляет её. Просроченные сессии не принимаются и удаляются при следующем входе.
- Пароли — `scrypt` из Node с солью на пользователя; в БД только хэш.
- **Почему токен в заголовке `Authorization`, а не кука.** Фронт на GitHub Pages, бэк —
  на другом домене. Для браузера такая кука «сторонняя», а iOS Safari сторонние куки режет —
  вход бы слетал на iPhone. Заголовок работает везде; фронт хранит токен в `localStorage`.
- Защита от подбора: не больше 10 попыток регистрации/входа в минуту с IP (429), вход
  с неизвестным email тратит то же время, что и с известным (по времени ответа не узнать,
  есть ли такой пользователь), ошибка одна — «неверный email или пароль».

- **Сброс пароля.** `password/forgot` всегда отвечает 204 и шлёт письмо без ожидания
  (не выдаёт, есть ли аккаунт). Ссылка `APP_URL#/reset-password?token=…` одноразовая,
  живёт `PASSWORD_RESET_TTL_MINUTES` (60), новая просьба отменяет прежние; в БД — SHA-256.
  Смена пароля закрывает все сессии. Без `SMTP_URL` письмо пишется в лог сервера — в
  разработке ссылку берите оттуда.
- **Согласие и удаление.** Регистрация требует `consent: true`; в `users` пишутся
  `consent_at` и `consent_version` (`CONSENT_VERSION` в `service.ts`). `DELETE
  /api/auth/account` с паролем удаляет пользователя каскадом (сессии, шаблоны, ссылки).
  Что ещё нужно перед продом — `docs/launch-checklist.md`.

Новый закрытый эндпоинт:

```ts
app.get('/api/что-то', { preHandler: app.authenticate }, async (request) => {
  const user = currentUser(request) // { id, email, plan, ... }
})
// только для Pro (иначе 403 PLAN_REQUIRED):
app.get('/api/pro-фича', { preHandler: [app.authenticate, requirePlan('pro')] }, ...)
```

### Тариф и будущая подписка

Сейчас в `users` два поля: `plan` (`free`/`pro`) и `plan_expires_at` (до какого момента
действует, `null` — бессрочно). Действующий тариф считает сервер: `pro`, только если
`plan = 'pro'` и срок не прошёл. Выдать Pro вручную:

```sql
UPDATE users SET plan = 'pro', plan_expires_at = now() + interval '1 month' WHERE email = '...';
```

Как продавать Pro — **[`docs/pro-payments.md`](../docs/pro-payments.md)**. Когда появится оплата, схема вырастет так:

- таблица `subscriptions` (user_id, провайдер — например ЮKassa/Stripe, id подписки у провайдера,
  статус, текущий период, отмена в конце периода);
- таблица `payments` (платёж, сумма, валюта, статус, сырой ответ провайдера) — история;
- вебхук провайдера `POST /api/billing/webhook` обновляет подписку и копирует итог в
  `users.plan` / `plan_expires_at`. Поля в `users` остаются «кэшем» действующего тарифа,
  поэтому `me`, `authenticate` и `requirePlan` менять не придётся.

## Деплой

Схема: база — **Neon** (бесплатная PostgreSQL), сервер — **Render** (бесплатный веб-сервис),
фронт — GitHub Pages (как и раньше). Банковская карта для бесплатных тарифов не нужна.

1. **Neon** (neon.tech): создать проект (регион — Frankfurt), скопировать строку подключения
   (`postgresql://…?sslmode=require`).
2. **Render** (render.com): New → Web Service → репозиторий `run-vision`, ветка `main`.
   - Root Directory: `server`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start:prod` (сначала миграции, потом сервер)
   - Instance Type: Free
   - Environment: `DATABASE_URL` (из Neon), `CORS_ORIGINS=https://maxrusmos.github.io`,
     `TRUST_PROXY=true`, `NODE_VERSION=22`. `PORT` Render задаёт сам.
   - Advanced → Health Check Path: `/api/health`.
3. **GitHub** → Settings → Secrets and variables → Actions → Variables → `VITE_API_URL` =
   адрес сервиса Render (`https://….onrender.com`, без `/` в конце). Workflow деплоя
   подставляет его при сборке фронта.

Бесплатный Render засыпает через 15 минут без запросов, первый запрос после сна — до минуты.
Фронт будит сервер при открытии приложения (`wakeApi`), поэтому к форме входа он обычно уже готов.
Каждый пуш в `main` пересобирает и сервер (Render), и фронт (GitHub Pages).
