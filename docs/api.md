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
  | 'EMAIL_TAKEN' // 409 — email уже зарегистрирован
  | 'RATE_LIMITED' // 429 — слишком много попыток
  | 'NOT_FOUND' // 404
  | 'INTERNAL'; // 500
```

## Правила полей

- `email`: обрезаем пробелы, приводим к нижнему регистру, формат `x@y.z`, не длиннее 254.
- `password`: от 8 до 128 символов (пробелы по краям не обрезаем).

## Эндпоинты

### `GET /api/health`
→ `200 { "ok": true }`

### `POST /api/auth/register`
Тело: `{ "email": string, "password": string }`
→ `201 AuthResponse` (сразу входит) · `400 VALIDATION_ERROR` · `409 EMAIL_TAKEN` · `429`

### `POST /api/auth/login`
Тело: `{ "email": string, "password": string }`
→ `200 AuthResponse` · `400 VALIDATION_ERROR` · `401 INVALID_CREDENTIALS` · `429`

### `GET /api/auth/me` (Bearer)
→ `200 { "user": User }` · `401 UNAUTHORIZED`

### `POST /api/auth/logout` (Bearer)
Удаляет текущую сессию. → `204` (и при уже недействительном токене — тоже `204`).

## Лимиты

`register` и `login` — не больше 10 запросов в минуту с одного IP (`429 RATE_LIMITED`).

## CORS

Разрешённые источники — переменная `CORS_ORIGINS` (через запятую), по умолчанию
`http://localhost:5173,https://maxrusmos.github.io`. Разрешён заголовок `Authorization`.
