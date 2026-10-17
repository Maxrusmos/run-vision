// Перед локальным запуском сервера: ставит его зависимости и создаёт server/.env,
// если их нет. Без этого `npm run dev` поднимал только фронт, а вход падал с
// ERR_CONNECTION_REFUSED на localhost:3000.
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
  console.log('[server] если база новая — один раз выполните: cd server && npm run migrate');
}
