// Перед локальным запуском сервера: ставит недостающие зависимости, создаёт server/.env,
// если их нет, и накатывает новые миграции. Без этого `npm run dev` поднимал только
// фронт (вход падал с ERR_CONNECTION_REFUSED), а после `git pull` с новой миграцией
// запросы падали с «relation … does not exist».
import { execSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDeps } from './ensure-deps.mjs';

const serverDir = join(import.meta.dirname, '..', 'server');

ensureDeps(serverDir, 'server');

const envPath = join(serverDir, '.env');
if (!existsSync(envPath)) {
  copyFileSync(join(serverDir, '.env.example'), envPath);
  console.log('[server] создал server/.env из .env.example');
}

// Локально — тестовая оплата Pro (без денег). В уже созданный раньше .env строки нет —
// дописываем; своё значение (в т.ч. none) не трогаем. На проде этот скрипт не запускается.
if (!/^PAYMENT_PROVIDER=/m.test(readFileSync(envPath, 'utf8'))) {
  appendFileSync(envPath, '\n# Оплата Pro: mock — тестовая, без денег; none — выключена\nPAYMENT_PROVIDER=mock\n');
  console.log('[server] дописал PAYMENT_PROVIDER=mock в server/.env (тестовая оплата Pro)');
}

// Уже применённые миграции пропускаются. База недоступна — сервер всё равно
// запускаем (фронт работает как гость), только предупреждаем.
try {
  execSync('npm run --silent migrate', { cwd: serverDir, stdio: 'inherit' });
} catch {
  console.warn(
    '[server] миграции не применились — запущен ли PostgreSQL? (sudo systemctl status postgresql)',
  );
}
