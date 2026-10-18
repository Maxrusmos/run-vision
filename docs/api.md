# API RunVision — контракт фронта и бэка

Единственный источник правды для обеих сторон: меняя API, сначала правим этот файл.

## Общее

- Бэкенд — `server/` (Node.js + TypeScript, Fastify, PostgreSQL). Все пути начинаются с `/api`.
- Адрес бэкенда на фронте — `import.meta.env.VITE_API_URL` (по умолчанию `http://localhost:3000`).
- Тела запросов и ответов — JSON. Даты — строки ISO 8601 (UTC).
- Авторизация — заголовок `Authorization: Bearer <token>`.
  Куки не используем: фронт на GitHub Pages, бэк на другом домене, а iOS Safari режет
  сторонние куки — вход бы «слетал» на iPhone.
- Токен — непрозрачная случайная строка (сессия). В БД хранится только её SHA-256.
  Живёт 30 дней. Фронт хранит его в `localStorage` (`rv.auth.token`).

## Пользователь

```ts
type Plan = 'free' | 'pro';

interface User {
  id: string; // uuid
  email: string; // в нижнем регистре
  plan: Plan; // действующий тариф: 'pro', только если подписка не истекла
  planExpiresAt: string | null; // когда закончится подписка (null — бессрочно или нет подписки)
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: User;
}
```

Гость (без токена) — отдельного объекта нет, фронт считает его уровнем `guest`.
Уровни доступа: `guest` < `free` < `pro`.

## Ошибки

Любая ошибка — статус 4xx/5xx и тело:

```ts
interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string; // по-русски, можно показать пользователю
    fields?: Record<string, string>; // для VALIDATION_ERROR: поле → сообщение
  };
}

type ApiErrorCode =
  | 'VALIDATION_ERROR' // 400 — неверные данные формы
  | 'INVALID_CREDENTIALS' // 401 — неверный email или пароль (не уточняем, что именно)
  | 'UNAUTHORIZED' // 401 — нет токена, токен неверный или истёк
  | 'PLAN_REQUIRED' // 403 — нужен тариф выше (пока ни один эндпоинт не отдаёт, задел под подписку)
  | 'EMAIL_TAKEN' // 409 — email уже зарегистрирован
  | 'RESET_TOKEN_INVALID' // 400 — ссылка сброса пароля неверная, использована или истекла
  | 'LIMIT_REACHED' // 409 — достигнут лимит (например, сохранённых шаблонов)
  | 'RATE_LIMITED' // 429 — слишком много попыток
  | 'NOT_FOUND' // 404
  | 'INTERNAL'; // 500
```

## Правила полей

- `email`: обрезаем пробелы, приводим к нижнему регистру, формат `x@y.z`, не длиннее 254.
- `password`: от 8 до 128 символов (пробелы по краям не обрезаем).
- `consent`: при регистрации — ровно `true` (пользователь отметил согласие на обработку
  персональных данных). Сервер хранит момент согласия и версию текста.

## Персональные данные

Email — единственные персональные данные, которые хранит сервис: он нужен для входа и
восстановления пароля, рассылок нет. Согласие — отдельный документ (страница фронта
`#/consent`), политика — `#/privacy`; версия текста согласия — `CONSENT_VERSION`
на сервере. Пользователь может удалить аккаунт (`DELETE /api/auth/account`) — вместе с
email, сессиями и шаблонами.

## Эндпоинты

### `GET /api/health`
→ `200 { "ok": true }`

### `POST /api/auth/register`
Тело: `{ "email": string, "password": string, "consent": true }`
→ `201 AuthResponse` (сразу входит) · `400 VALIDATION_ERROR` (в т.ч. `fields.consent`) ·
`409 EMAIL_TAKEN` · `429`

### `POST /api/auth/login`
Тело: `{ "email": string, "password": string }`
→ `200 AuthResponse` · `400 VALIDATION_ERROR` · `401 INVALID_CREDENTIALS` · `429`

### `GET /api/auth/me` (Bearer)
→ `200 { "user": User }` · `401 UNAUTHORIZED`

### `POST /api/auth/logout` (Bearer)
Удаляет текущую сессию. → `204` (и при уже недействительном токене — тоже `204`).

### `POST /api/auth/password/forgot`
Тело: `{ "email": string }` → всегда `204` (есть такой аккаунт или нет — не сообщаем) ·
`400 VALIDATION_ERROR` · `429`.
Если аккаунт есть — письмо со ссылкой `<APP_URL>#/reset-password?token=<token>`. Ссылка
одноразовая, живёт 60 минут; новая просьба отменяет прежние ссылки. В БД — только SHA-256
токена.

### `POST /api/auth/password/reset`
Тело: `{ "token": string, "password": string }` → `200 AuthResponse` (пароль сменён, все
прежние сессии закрыты, выдана новая) · `400 RESET_TOKEN_INVALID` · `400 VALIDATION_ERROR` ·
`429`.

### `DELETE /api/auth/account` (Bearer)
Тело: `{ "password": string }` — подтверждение. Удаляет пользователя со всеми сессиями,
шаблонами и ссылками сброса. → `204` · `401 INVALID_CREDENTIALS` (неверный пароль) ·
`401 UNAUTHORIZED`.

## Сохранённые шаблоны (Bearer)

Шаблон оформления карточки пользователя: только настройки, без тренировки и без фото фона.
Применяется к любой тренировке. Чужие шаблоны не видны — для них, как и для несуществующих,
`404 NOT_FOUND`.

```ts
type PhotoTemplateId = 'minimal' | 'topographic' | 'telemetry';
type ShareType = 'photo' | 'video';

interface SavedTemplate {
  id: string; // uuid
  name: string; // 1–60 символов, пробелы по краям обрезаются
  baseTemplate: PhotoTemplateId; // шаблон приложения, от которого он сделан
  shareType: ShareType; // для чего шаблон: фото-карточка или видео (не меняется)
  settings: object; // ShareCardSettings фронта как есть (JSON-объект, до 32 КБ);
  //                   сервер его не разбирает, `backgroundImage` всегда null
  createdAt: string;
  updatedAt: string;
}
```

- `name`: обязательно, 1–60 символов после обрезки пробелов.
- `shareType`: `photo` или `video`; при создании необязателен (по умолчанию `photo` — так
  создавали шаблоны до видео), изменить нельзя. Шаблоны, созданные до появления поля, — `photo`.
- `settings`: JSON-объект (не массив), сериализованный — не больше 32 КБ.
- Не больше 100 шаблонов на пользователя → `409 LIMIT_REACHED`.

### `GET /api/templates`
Свои шаблоны, новые изменения сверху (по `updatedAt`).
→ `200 { "templates": SavedTemplate[] }` · `401`

### `POST /api/templates`
Тело: `{ "name": string, "baseTemplate": PhotoTemplateId, "shareType"?: ShareType, "settings": object }`
→ `201 { "template": SavedTemplate }` · `400 VALIDATION_ERROR` · `401` · `409 LIMIT_REACHED`

### `GET /api/templates/:id`
→ `200 { "template": SavedTemplate }` · `401` · `404`

### `PATCH /api/templates/:id`
Тело: любые из `{ "name": string, "settings": object }` (хотя бы одно поле). `baseTemplate` и
`shareType` не меняются.
→ `200 { "template": SavedTemplate }` · `400` · `401` · `404`

### `DELETE /api/templates/:id`
→ `204` · `401` · `404`

## Лимиты

`register`, `login`, `password/forgot` и `password/reset` — не больше 10 запросов в минуту
с одного IP (`429 RATE_LIMITED`).

## CORS

Разрешённые источники — переменная `CORS_ORIGINS` (через запятую), по умолчанию
`http://localhost:5173,https://maxrusmos.github.io`. Разрешён заголовок `Authorization`,
методы `GET`, `POST`, `PATCH`, `DELETE`.
