// Ставит зависимости, если какой-то пакет из package.json не установлен. После `git pull`
// с новым пакетом (было: mp4-muxer) Vite падал с «Failed to resolve import» и 500.
// Проверка — по наличию папок в node_modules, без запуска npm: когда всё на месте,
// старт не замедляется.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function ensureDeps(dir, label) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const missing = names.filter(
    (name) => !existsSync(join(dir, 'node_modules', name, 'package.json')),
  );
  if (!missing.length) return;

  console.log(`[${label}] не установлены: ${missing.join(', ')} — запускаю npm install…`);
  execSync('npm install', { cwd: dir, stdio: 'inherit' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureDeps(join(import.meta.dirname, '..'), 'front');
}
