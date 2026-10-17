import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Все тесты работают с одной тестовой БД — запускаем файлы по очереди.
    fileParallelism: false,
    testTimeout: 15_000,
  },
})
