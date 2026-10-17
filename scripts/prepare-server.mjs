// Перед локальным запуском сервера: ставит его зависимости, создаёт server/.env,
// если их нет, и накатывает новые миграции. Без этого `npm run dev` поднимал только
// фронт (вход падал с ERR_CONNECTION_REFUSED), а после `git pull` с новой миграцией
// запросы падали с «relation … does not exist».
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const serverDir = join(import.meta.dirname, '..', 'server');

if (!existsSync(join(serverDir, 'node_modules'))) {
  console.log('[server] ставлю зависимости сервера (npm install в server/)…');
  execSync('npm install', { cwd: serverDir, stdio: 'inherit' });
}

if (!existsSync(join(serverDir, '.env'))) {
  copyFileSync(join(serverDir, '.env.example'), join(serverDir, '.env'));
  console.log('[server] создал server/.env из .env.example');
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
