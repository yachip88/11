## Быстрый старт для AI-агентов — HeatGridViz

Короткие, практичные инструкции, чтобы быстро внести полезные изменения в этот репозиторий.

1) Что это за проект
- Монолит: сервер Express (TypeScript) + клиент React (Vite + TypeScript) в одной кодовой базе.
- Серверная часть находится в `server/` (вход `server/index.ts`, маршруты в `server/routes.ts`).
- Клиент — `client/` (Vite root указан в `vite.config.ts`).
- База — Microsoft SQL Server через Prisma (схема в `prisma/schema.prisma`).

2) Быстрый запуск (локально Windows)
- Установить зависимости: `npm install`.
- Dev сервер (в Windows PowerShell): запустить `start-windows.bat` или `start-windows-alt.bat` (оба устанавливают NODE_ENV=development и запускают `npx tsx server/index.ts`).
- Prod build: `npm run build` (сборка клиента через Vite + esbuild бандлит сервер в `dist/`).
- Prod start: `npm start` (ожидает `dist/index.js`).

3) Что важно знать о сборке и среде
- Vite root настроен на `client/` в `vite.config.ts`. Публичные сборки попадают в `dist/public`.
- Сервер слушает порт из `PORT` (по умолчанию 5000). На Windows флаг `reusePort` не используется (см. `server/index.ts`).
- Для разработки в Replit есть дополнительные плагины — код их проверки находится в `vite.config.ts` (условные импорты при наличии REPL_ID).

4) Важные проектные паттерны и контрактные точки
- Prisma singleton: `server/db.ts` экспортирует `db` как глобальный синглтон (чтобы избежать создания множества PrismaClient при HMR).
- Хранилище через интерфейс `IStorage` и реализацию `DbStorage` в `server/db-storage.ts`. Используется в `server/routes.ts`. Если нужно заменить хранилище — реализуйте `IStorage` и поменяйте инъекцию.
- Загрузка файлов: multer с memoryStorage и фильтром (только `.xlsx`, `.xlsm`, `.xlsb`) в `server/routes.ts`. Размер лимита 50MB.
- Контрольные графики и статистика: сервер вычисляет UCL/CL/LCL в `DbStorage.calculateControlBoundaries` и хранит статистику в `statistical_params`.

5) Конвенции кода и импорты
- Алиасы: `@/` → `client/src`, `@shared/` → `shared`, `@assets/` → `attached_assets` (настроено в `vite.config.ts` и `tsconfig.json`).
- Типы и контракты: общие типы/схемы находятся в `shared/` и используются в сервере и клиенте (`@shared/schema`).
- TypeScript: `tsconfig.json` включает `client/src`, `shared` и `server`; проект использует строгие опции.

6) Особенности API и поведения
- Все API под `/api/*`. Логирование запросов происходит в `server/index.ts` — middleware сокращает длинные JSON-ответы до 80 символов в логах.
- Валидация входных DTO выполняется через Zod в `shared/schema` (см. импорты в `server/routes.ts`).
- Ошибки обрабатываются централизованно: middleware в `server/index.ts` возвращает JSON `{ message }` и пробрасывает ошибку дальше.

7) Известные места для правок / частые задачи
- Добавить новую API-эндоинту: зарегистрировать маршрут в `server/routes.ts`, использовать методы `DbStorage` или `IStorage`.
- Работа с БД: менять схему — редактировать `prisma/schema.prisma`, затем `npx prisma generate` и `npx prisma db push`.
- Добавить тесты/скрипты: проект не содержит тестовой инфраструктуры — при добавлении предпочитайте простые unit-тесты с Jest или Vitest и добавьте npm-скрипты.

8) Примеры кода (коротко)
- Prisma singleton: `server/db.ts` — проверяйте, что глобальный объект используется в dev, чтобы избежать лишних подключений.
- File upload filter: см. `multer` конфигурацию в `server/routes.ts` — используйте те же MIME и расширения.
- Контрольные границы: `DbStorage.calculateControlBoundaries(ctpId)` — вычисляет mean/std и возвращает { ucl, cl, lcl }.

9) Проверки качества перед PR
- Typecheck: `npm run check` (tsc). Необязательно собирать проект для PR, но избегайте неявных any.
- Локально убедитесь, что dev сервер запускается через `start-windows.bat` и что клиент зарендерился (посетите `http://localhost:PORT`).

10) Что не документировано в коде
- Точные процессы миграции/бэкапа MSSQL — предполагается, что разработчик обладает доступом к DATABASE_URL; скрипты миграции не включены в репозиторий.

Если нужно, сделаю короткую версию на английском или расширю раздел «Как добавить эндпоинт» с примером PR (PATCH). Оставьте фидбек, что добавить/уточнить.
