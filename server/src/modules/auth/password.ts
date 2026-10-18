import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Хэширование паролей встроенным в Node алгоритмом scrypt (медленный «на зло» перебору).
// В БД строка вида: scrypt$N$r$p$соль$хэш (соль и хэш — base64). Параметры храним в строке,
// чтобы потом можно было усилить их, не ломая старые пароли.

const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await scryptAsync(password, salt, N, R, P)
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split('$')
  if (algo !== 'scrypt' || !saltB64 || !keyB64) return false
  const expected = Buffer.from(keyB64, 'base64')
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p))
  // Сравнение за постоянное время: по скорости ответа нельзя угадать, сколько байт совпало.
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

let dummyHash: Promise<string> | null = null

/**
 * Хэш-«пустышка» для входа с несуществующим email: проверяем пароль против него, чтобы
 * ответ шёл столько же времени, сколько для существующего, — иначе по времени ответа
 * можно было бы узнать, какие email зарегистрированы.
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  return dummyHash
}
