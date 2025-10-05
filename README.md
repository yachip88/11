# HeatGridViz

## Requirements

- Node.js 20 LTS
- npm 10+
- Optional: Docker 24+ (для локальной базы данных)

## Quick Start

1. (Опционально) скопируйте пример окружения:
   ```bash
   cp .env.example .env
   ```
2. Установите зависимости и подготовьте Prisma:
   ```bash
   npm install
   npx prisma generate
   ```
3. Запустите dev-сервер:
   ```bash
   npm run dev
   ```

## Database

Запустить локальный SQL Server можно через Docker:
```bash
docker run --name mssql   -e "ACCEPT_EULA=Y"   -e "SA_PASSWORD=YourStrong(!)Password"   -p 1433:1433   -d mcr.microsoft.com/mssql/server:2022-latest
```

Пропишите `DATABASE_URL` в `.env`:
```bash
sqlserver://localhost:1433;database=appdb;user=sa;password=YourStrong(!)Password;trustServerCertificate=true;encrypt=true
```

Миграции выполняются локально:
```bash
npx prisma migrate dev
```

## Useful Scripts

- `npm run dev` – запуск сервера разработки
- `npm run typecheck` – проверка типов TypeScript
- `npm run lint` – ESLint проверки
- `npm run format` – форматирование Prettier
- `npm run build` – сборка клиента и сервера
- `npm run test` – Vitest

## Health Check

Проверьте доступность:
```bash
curl http://localhost:3000/health
```
Ответ: `{ "ok": true }`.

## Continuous Integration

GitHub Actions workflow `.github/workflows/ci.yml` запускает `npm ci`, `npx prisma generate`, а также `npm run typecheck`, `npm run build`, `npm run lint` и `npm run test` для каждого push и pull request.
