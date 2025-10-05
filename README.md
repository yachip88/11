# HeatGridViz

## Requirements

- Node.js 20 LTS
- npm 10+
- Optional: Docker 24+ (для локальной базы данных)

## Getting Started

1. Скопируйте пример окружения:
   ```bash
   cp .env.example .env
   ```
2. Заполните переменные в `.env` (как минимум `DATABASE_URL`, `PORT`, `SESSION_SECRET`).
3. Установите зависимости:
   ```bash
   npm install
   ```
4. Запустите клиент и сервер одновременно:
   ```bash
   npm run dev
   ```

## Database

Для локального PostgreSQL можно использовать Docker:
```bash
docker run --name pg \
  -e POSTGRES_PASSWORD=pg \
  -e POSTGRES_USER=pg \
  -e POSTGRES_DB=appdb \
  -p 5432:5432 \
  -d postgres:16
```

После запуска замените `DATABASE_URL` в `.env` на `postgres://pg:pg@localhost:5432/appdb`.

## Useful Scripts

- `npm run lint` – статический анализ (ESLint)
- `npm run format` – форматирование (Prettier)
- `npm run typecheck` – проверка типов TypeScript
- `npm run build` – сборка клиента и сервера
- `npm run test` – запуск Vitest

## Health Check

После запуска сервера можно проверить доступность:
```bash
curl http://localhost:3000/health
```

## Continuous Integration

GitHub Actions workflow `.github/workflows/ci.yml` выполняет `npm ci`, `npx prisma generate`, сборку, линт и тесты для каждого push и pull request.
