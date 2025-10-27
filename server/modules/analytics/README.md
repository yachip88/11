# Analytics Module (Server)

—ервисный слой дл€ агрегировани€ данных из MSSQL (¬злЄт —ѕ4) по ключевым категори€м неисправностей.

- `dto/analytics.dto.ts` Ч схемы валидации запросов/ответов (zod).
- `services/analytics.service.ts` Ч бизнес-логика и обращение к `DbStorage`.
- `controllers/analytics.controller.ts` Ч HTTP-обработчик `/api/analytics/summary`.
- `queries/analytics.queries.ts` Ч шаблоны SQL, которые будут св€заны с MSSQL.
- `mappers/analytics.mapper.ts` Ч преобразование сырых записей в доменные модели.

 онтроллер можно зарегистрировать в `server/routes.ts`, чтобы предоставить API дл€ фронтенда.
